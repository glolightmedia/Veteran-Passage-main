from fastapi import APIRouter, HTTPException, Request, Query
from datetime import datetime, timezone, timedelta
from bson import ObjectId
from typing import Optional
import logging

from utils.auth import get_current_user, hash_password
from utils.rbac import require_role

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/superadmin", tags=["superadmin"])
db = None


def set_db(database):
    global db
    db = database


async def require_admin(request):
    user = await get_current_user(request, db)
    if user.get("role") not in ["admin", "superadmin"]:
        raise HTTPException(status_code=403, detail="Admin access required")
    return user


# ─── BLOG / CONTENT MANAGEMENT ───

@router.get("/blog")
async def list_blog_posts(request: Request, status: str = Query("all"), page: int = Query(1, ge=1), limit: int = Query(20, ge=1, le=50)):
    await require_admin(request)
    query = {} if status == "all" else {"status": status}
    skip = (page - 1) * limit
    total = await db.blog_posts.count_documents(query)
    cursor = db.blog_posts.find(query).sort("created_at", -1).skip(skip).limit(limit)
    posts = []
    async for p in cursor:
        p["id"] = str(p.pop("_id"))
        posts.append(p)
    return {"posts": posts, "total": total, "page": page}


@router.post("/blog")
async def create_blog_post(request: Request):
    admin = await require_admin(request)
    body = await request.json()
    doc = {
        "title": body.get("title", ""),
        "slug": body.get("slug", "").lower().replace(" ", "-"),
        "content": body.get("content", ""),
        "excerpt": body.get("excerpt", ""),
        "category": body.get("category", "general"),
        "tags": body.get("tags", []),
        "featured_image": body.get("featured_image", ""),
        "status": body.get("status", "draft"),
        "author_id": admin["id"],
        "author_name": admin.get("full_name", "Admin"),
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat(),
        "published_at": datetime.now(timezone.utc).isoformat() if body.get("status") == "published" else None,
        "views": 0
    }
    result = await db.blog_posts.insert_one(doc)
    doc["id"] = str(result.inserted_id)
    doc.pop("_id", None)
    return doc


@router.put("/blog/{post_id}")
async def update_blog_post(request: Request, post_id: str):
    await require_admin(request)
    body = await request.json()
    update = {k: v for k, v in body.items() if k not in ["id", "_id"]}
    update["updated_at"] = datetime.now(timezone.utc).isoformat()
    if update.get("status") == "published":
        existing = await db.blog_posts.find_one({"_id": ObjectId(post_id)})
        if existing and not existing.get("published_at"):
            update["published_at"] = datetime.now(timezone.utc).isoformat()

    result = await db.blog_posts.update_one({"_id": ObjectId(post_id)}, {"$set": update})
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Post not found")
    updated = await db.blog_posts.find_one({"_id": ObjectId(post_id)})
    updated["id"] = str(updated.pop("_id"))
    return updated


@router.delete("/blog/{post_id}")
async def delete_blog_post(request: Request, post_id: str):
    await require_admin(request)
    result = await db.blog_posts.delete_one({"_id": ObjectId(post_id)})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Post not found")
    return {"message": "Blog post deleted"}


# ─── FULL USER MANAGEMENT ───

@router.delete("/users/{user_id}")
async def delete_user(request: Request, user_id: str):
    admin = await require_admin(request)
    if user_id == admin["id"]:
        raise HTTPException(status_code=400, detail="Cannot delete yourself")
    user = await db.users.find_one({"_id": ObjectId(user_id)})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    await db.users.delete_one({"_id": ObjectId(user_id)})
    # Clean up related data
    await db.forum_posts.delete_many({"author_id": user_id})
    await db.forum_replies.delete_many({"author_id": user_id})
    await db.mentorship_requests.delete_many({"$or": [{"mentee_id": user_id}, {"mentor_id": user_id}]})
    await db.chat_sessions.delete_many({"user_id": user_id})
    await db.activity_logs.insert_one({
        "user_id": admin["id"], "action": "user_deleted",
        "metadata": {"deleted_user": user.get("email"), "deleted_id": user_id},
        "created_at": datetime.now(timezone.utc).isoformat()
    })
    return {"message": f"User {user.get('email')} deleted"}


@router.put("/users/{user_id}/edit")
async def edit_user(request: Request, user_id: str):
    admin = await require_admin(request)
    body = await request.json()
    allowed = ["full_name", "email", "branch", "discharge", "location", "role", "is_mentor", "mentor_expertise", "mentor_bio"]
    update = {k: v for k, v in body.items() if k in allowed and v is not None}
    if not update:
        raise HTTPException(status_code=400, detail="No valid fields to update")
    update["updated_by"] = admin["id"]
    update["updated_at"] = datetime.now(timezone.utc).isoformat()
    await db.users.update_one({"_id": ObjectId(user_id)}, {"$set": update})
    user = await db.users.find_one({"_id": ObjectId(user_id)})
    user["id"] = str(user.pop("_id"))
    user.pop("password_hash", None)
    return user


@router.post("/users/{user_id}/reset-password")
async def force_password_reset(request: Request, user_id: str):
    admin = await require_admin(request)
    body = await request.json()
    new_password = body.get("new_password")
    if not new_password or len(new_password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters")
    await db.users.update_one(
        {"_id": ObjectId(user_id)},
        {"$set": {"password_hash": hash_password(new_password)}}
    )
    await db.activity_logs.insert_one({
        "user_id": admin["id"], "action": "force_password_reset",
        "metadata": {"target_user_id": user_id},
        "created_at": datetime.now(timezone.utc).isoformat()
    })
    return {"message": "Password reset successfully"}


# ─── DEEP ANALYTICS ───

@router.get("/analytics/deep")
async def deep_analytics(request: Request):
    await require_admin(request)

    total_users = await db.users.count_documents({})
    role_counts = {}
    for role in ["admin", "moderator", "provider", "developer", "customer"]:
        role_counts[role] = await db.users.count_documents({"role": role})

    # Signups over last 30 days
    thirty_days_ago = (datetime.now(timezone.utc) - timedelta(days=30)).isoformat()
    recent_signups = await db.users.count_documents({"created_at": {"$gte": thirty_days_ago}})

    total_resources = await db.resources.count_documents({})
    approved_resources = await db.resources.count_documents({"status": "approved"})
    pending_resources = await db.resources.count_documents({"status": "pending"})

    total_jobs = await db.jobs.count_documents({"status": "active"})
    total_forum_posts = await db.forum_posts.count_documents({})
    total_forum_replies = await db.forum_replies.count_documents({})
    total_chat_sessions = await db.chat_sessions.count_documents({})
    total_mentorship_requests = await db.mentorship_requests.count_documents({})
    active_mentors = await db.users.count_documents({"is_mentor": True})

    active_promotions = await db.promotions.count_documents({"status": "active"})
    total_revenue = 0
    async for tx in db.payment_transactions.find({"payment_status": "paid"}):
        total_revenue += tx.get("amount", 0)

    total_blog = await db.blog_posts.count_documents({})
    published_blog = await db.blog_posts.count_documents({"status": "published"})

    total_reports = await db.moderation_reports.count_documents({})
    pending_reports = await db.moderation_reports.count_documents({"status": "pending"})

    total_api_keys = await db.api_keys.count_documents({"revoked": False})

    return {
        "users": {"total": total_users, "by_role": role_counts, "recent_signups_30d": recent_signups},
        "resources": {"total": total_resources, "approved": approved_resources, "pending": pending_resources},
        "jobs": {"active": total_jobs},
        "forum": {"posts": total_forum_posts, "replies": total_forum_replies},
        "chat": {"sessions": total_chat_sessions},
        "mentorship": {"requests": total_mentorship_requests, "active_mentors": active_mentors},
        "promotions": {"active": active_promotions},
        "revenue": {"total": total_revenue},
        "blog": {"total": total_blog, "published": published_blog},
        "moderation": {"total_reports": total_reports, "pending": pending_reports},
        "developer": {"active_api_keys": total_api_keys},
        "engagement": {
            "intake_completed": await db.users.count_documents({"intake_completed": True}),
            "intake_rate": round((await db.users.count_documents({"intake_completed": True}) / max(total_users, 1)) * 100, 1),
            "active_progress_trackers": await db.progress.count_documents({}),
            "total_actions_logged": await db.activity_logs.count_documents({"action": {"$regex": "^progress_action"}}),
            "total_check_ins": await db.activity_logs.count_documents({"action": "check_in"}),
            "recommendations_viewed": await db.activity_logs.count_documents({"action": "recommendations_viewed"}),
            "total_donations": await db.donations.count_documents({"status": "paid"}),
            "total_leads": await db.leads.count_documents({}),
            "new_leads": await db.leads.count_documents({"status": "new"}),
        },
        "money_metrics": {
            "total_leads": await db.leads.count_documents({}),
            "leads_converted": await db.leads.count_documents({"status": "converted"}),
            "conversion_rate": round(
                (await db.leads.count_documents({"status": "converted"}) / max(await db.leads.count_documents({}), 1)) * 100, 1
            ),
            "users_with_first_action": await db.progress.count_documents({"actions_taken.0": {"$exists": True}}),
            "first_action_rate": round(
                (await db.progress.count_documents({"actions_taken.0": {"$exists": True}}) / max(total_users, 1)) * 100, 1
            ),
        }
    }


# ─── AUDIT LOG ───

@router.get("/audit-log")
async def get_audit_log(request: Request, action: str = Query(None), page: int = Query(1, ge=1), limit: int = Query(30, ge=1, le=100)):
    await require_admin(request)
    query = {}
    if action:
        query["action"] = {"$regex": action, "$options": "i"}
    skip = (page - 1) * limit
    total = await db.activity_logs.count_documents(query)
    cursor = db.activity_logs.find(query).sort("created_at", -1).skip(skip).limit(limit)
    logs = []
    async for l in cursor:
        l["id"] = str(l.pop("_id"))
        logs.append(l)
    return {"logs": logs, "total": total, "page": page, "pages": (total + limit - 1) // limit}


# ─── ANNOUNCEMENTS ───

@router.get("/announcements")
async def list_announcements(request: Request):
    await require_admin(request)
    cursor = db.announcements.find().sort("created_at", -1)
    items = []
    async for a in cursor:
        a["id"] = str(a.pop("_id"))
        items.append(a)
    return {"announcements": items}


@router.post("/announcements")
async def create_announcement(request: Request):
    admin = await require_admin(request)
    body = await request.json()
    doc = {
        "title": body.get("title", ""),
        "content": body.get("content", ""),
        "type": body.get("type", "info"),
        "active": body.get("active", True),
        "author_id": admin["id"],
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    result = await db.announcements.insert_one(doc)
    doc["id"] = str(result.inserted_id)
    doc.pop("_id", None)
    return doc


@router.put("/announcements/{ann_id}")
async def update_announcement(request: Request, ann_id: str):
    await require_admin(request)
    body = await request.json()
    update = {k: v for k, v in body.items() if k in ["title", "content", "type", "active"]}
    await db.announcements.update_one({"_id": ObjectId(ann_id)}, {"$set": update})
    return {"message": "Updated"}


@router.delete("/announcements/{ann_id}")
async def delete_announcement(request: Request, ann_id: str):
    await require_admin(request)
    await db.announcements.delete_one({"_id": ObjectId(ann_id)})
    return {"message": "Deleted"}


# ─── GLOBAL CONTENT MANAGEMENT ───

@router.get("/all-jobs")
async def list_all_jobs(request: Request):
    await require_admin(request)
    cursor = db.jobs.find().sort("created_at", -1)
    jobs = []
    async for j in cursor:
        if "_id" in j:
            j.setdefault("id", str(j.pop("_id")))
        jobs.append(j)
    return {"jobs": jobs, "total": len(jobs)}


@router.delete("/jobs/{job_id}")
async def delete_any_job(request: Request, job_id: str):
    await require_admin(request)
    r1 = await db.jobs.delete_one({"id": job_id})
    if r1.deleted_count == 0:
        r2 = await db.jobs.delete_one({"_id": ObjectId(job_id)})
        if r2.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Job not found")
    return {"message": "Job deleted"}


@router.get("/all-forum-posts")
async def list_all_forum_posts(request: Request, page: int = Query(1, ge=1), limit: int = Query(30)):
    await require_admin(request)
    skip = (page - 1) * limit
    total = await db.forum_posts.count_documents({})
    cursor = db.forum_posts.find().sort("created_at", -1).skip(skip).limit(limit)
    posts = []
    async for p in cursor:
        p["id"] = str(p.pop("_id"))
        p["reply_count"] = await db.forum_replies.count_documents({"post_id": p["id"]})
        posts.append(p)
    return {"posts": posts, "total": total, "page": page}


@router.get("/all-mentorship")
async def list_all_mentorship(request: Request):
    await require_admin(request)
    cursor = db.mentorship_requests.find().sort("created_at", -1)
    requests = []
    async for r in cursor:
        r["id"] = str(r.pop("_id"))
        requests.append(r)
    return {"requests": requests, "total": len(requests)}


@router.get("/all-transactions")
async def list_all_transactions(request: Request):
    await require_admin(request)
    cursor = db.payment_transactions.find().sort("created_at", -1)
    txns = []
    async for t in cursor:
        t["id"] = str(t.pop("_id"))
        txns.append(t)
    return {"transactions": txns, "total": len(txns)}


@router.get("/all-api-keys")
async def list_all_api_keys(request: Request):
    await require_admin(request)
    cursor = db.api_keys.find().sort("created_at", -1)
    keys = []
    async for k in cursor:
        keys.append({
            "id": str(k["_id"]),
            "user_id": k["user_id"],
            "name": k["name"],
            "key_prefix": k["key_prefix"],
            "revoked": k["revoked"],
            "request_count": k.get("request_count", 0),
            "last_used": k.get("last_used"),
            "created_at": k["created_at"]
        })
    return {"api_keys": keys, "total": len(keys)}


# ─── PUBLIC BLOG (no auth) ───

@router.get("/blog/public")
async def public_blog(request: Request, page: int = Query(1, ge=1), limit: int = Query(10)):
    skip = (page - 1) * limit
    total = await db.blog_posts.count_documents({"status": "published"})
    cursor = db.blog_posts.find({"status": "published"}, {"content": 0}).sort("published_at", -1).skip(skip).limit(limit)
    posts = []
    async for p in cursor:
        p["id"] = str(p.pop("_id"))
        posts.append(p)
    return {"posts": posts, "total": total, "page": page}


@router.get("/blog/public/{slug}")
async def public_blog_post(request: Request, slug: str):
    post = await db.blog_posts.find_one({"slug": slug, "status": "published"})
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    await db.blog_posts.update_one({"_id": post["_id"]}, {"$inc": {"views": 1}})
    post["id"] = str(post.pop("_id"))
    return post


# ─── ACTIVE ANNOUNCEMENT (public) ───

@router.get("/announcements/active")
async def get_active_announcement(request: Request):
    ann = await db.announcements.find_one({"active": True}, sort=[("created_at", -1)])
    if not ann:
        return {"announcement": None}
    ann["id"] = str(ann.pop("_id"))
    return {"announcement": ann}


# ─── LEADS MANAGEMENT ───

@router.get("/leads")
async def list_leads(request: Request, status: str = Query("new"), category: str = Query(None)):
    await require_admin(request)
    query = {} if status == "all" else {"status": status}
    if category:
        query["category"] = category
    cursor = db.leads.find(query).sort("created_at", -1)
    leads = []
    async for l in cursor:
        l["id"] = str(l.pop("_id"))
        leads.append(l)
    return {"leads": leads, "total": len(leads)}


@router.put("/leads/{lead_id}")
async def update_lead(request: Request, lead_id: str):
    await require_admin(request)
    body = await request.json()
    update = {k: v for k, v in body.items() if k in ["status", "notes", "assigned_to"]}
    update["updated_at"] = datetime.now(timezone.utc).isoformat()
    await db.leads.update_one({"_id": ObjectId(lead_id)}, {"$set": update})
    return {"message": "Lead updated"}


@router.get("/leads/stats")
async def lead_stats(request: Request):
    await require_admin(request)
    total = await db.leads.count_documents({})
    new_leads = await db.leads.count_documents({"status": "new"})
    contacted = await db.leads.count_documents({"status": "contacted"})
    converted = await db.leads.count_documents({"status": "converted"})
    pipeline = [{"$group": {"_id": "$category", "count": {"$sum": 1}}}, {"$sort": {"count": -1}}]
    by_category = {r["_id"]: r["count"] for r in await db.leads.aggregate(pipeline).to_list(20)}
    return {"total": total, "new": new_leads, "contacted": contacted, "converted": converted, "by_category": by_category}


# ─── CREATE USER (FULL CONTROL) ───

@router.post("/users/create")
async def create_user(request: Request):
    admin = await require_admin(request)
    body = await request.json()

    email = body.get("email", "").lower().strip()
    if not email:
        raise HTTPException(status_code=400, detail="Email is required")

    existing = await db.users.find_one({"email": email})
    if existing:
        raise HTTPException(status_code=400, detail="User with this email already exists")

    role = body.get("role", "customer")
    from utils.rbac import ROLES, PARTNER_SUBTYPES
    if role not in ROLES:
        raise HTTPException(status_code=400, detail=f"Invalid role. Must be: {', '.join(ROLES)}")

    password = body.get("password", "")
    if not password or len(password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters")

    partner_subtype = body.get("partner_subtype")
    if role == "partner" and partner_subtype and partner_subtype not in PARTNER_SUBTYPES:
        raise HTTPException(status_code=400, detail=f"Invalid partner subtype. Must be: {', '.join(PARTNER_SUBTYPES)}")

    user_doc = {
        "email": email,
        "password_hash": hash_password(password),
        "full_name": body.get("full_name", ""),
        "role": role,
        "partner_subtype": partner_subtype if role == "partner" else None,
        "organization": body.get("organization", ""),
        "phone": body.get("phone", ""),
        "website": body.get("website", ""),
        "state": body.get("state", ""),
        "branch": body.get("branch"),
        "discharge": body.get("discharge"),
        "location": body.get("location", ""),
        "billing_plan": body.get("billing_plan"),
        "suspended": False,
        "saved_resources": [],
        "intake_completed": role != "customer",
        "created_by": admin["id"],
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    result = await db.users.insert_one(user_doc)
    user_id = str(result.inserted_id)

    # Init billing for employer partners
    if role == "partner" and body.get("billing_plan"):
        from utils.rbac import BILLING_PLANS
        plan = BILLING_PLANS.get(body["billing_plan"])
        if plan:
            await db.subscriptions.insert_one({
                "user_id": user_id,
                "plan_id": plan["id"],
                "plan_name": plan["name"],
                "price": plan["price"],
                "job_limit": plan["job_limit"],
                "jobs_used": 0,
                "status": "active",
                "started_at": datetime.now(timezone.utc).isoformat(),
                "expires_at": (datetime.now(timezone.utc) + timedelta(days=plan["duration_days"])).isoformat()
            })

    await db.activity_logs.insert_one({
        "user_id": admin["id"],
        "action": "user_created",
        "metadata": {"created_user_id": user_id, "email": email, "role": role, "partner_subtype": partner_subtype},
        "created_at": datetime.now(timezone.utc).isoformat()
    })

    return {"message": f"User created: {email} ({role})", "id": user_id, "email": email, "role": role}


# ─── EMPLOYER BILLING ───

@router.get("/billing/plans")
async def get_billing_plans(request: Request):
    await require_admin(request)
    from utils.rbac import BILLING_PLANS
    return {"plans": BILLING_PLANS}


@router.get("/billing/subscriptions")
async def list_subscriptions(request: Request):
    await require_admin(request)
    cursor = db.subscriptions.find().sort("started_at", -1)
    subs = []
    async for s in cursor:
        s["id"] = str(s.pop("_id"))
        user = await db.users.find_one({"_id": ObjectId(s["user_id"])}, {"email": 1, "full_name": 1, "organization": 1})
        if user:
            s["user_email"] = user.get("email")
            s["user_name"] = user.get("full_name")
            s["organization"] = user.get("organization")
        subs.append(s)
    return {"subscriptions": subs, "total": len(subs)}


# ─── AUTH EVENTS & SECURITY ───

@router.get("/security/auth-events")
async def get_auth_events(request: Request, hours: int = Query(24)):
    await require_admin(request)
    since = (datetime.now(timezone.utc) - timedelta(hours=hours)).isoformat()

    failed_logins = await db.auth_events.count_documents({"type": "login_failed", "created_at": {"$gte": since}})
    locked_accounts = await db.auth_events.count_documents({"type": "account_locked", "created_at": {"$gte": since}})
    password_resets = await db.auth_events.count_documents({"type": "password_reset", "created_at": {"$gte": since}})

    # Recent failed login details
    cursor = db.auth_events.find({"type": "login_failed", "created_at": {"$gte": since}}).sort("created_at", -1).limit(20)
    recent_failures = []
    async for e in cursor:
        e["id"] = str(e.pop("_id"))
        recent_failures.append(e)

    # Failure reasons breakdown
    pipeline = [
        {"$match": {"type": "login_failed", "created_at": {"$gte": since}}},
        {"$group": {"_id": "$reason", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}}
    ]
    reasons = {r["_id"]: r["count"] for r in await db.auth_events.aggregate(pipeline).to_list(10)}

    return {
        "period_hours": hours,
        "failed_logins": failed_logins,
        "locked_accounts": locked_accounts,
        "password_resets": password_resets,
        "failure_reasons": reasons,
        "recent_failures": recent_failures
    }


# ─── DASHBOARD WIDGETS ───

@router.get("/widgets")
async def get_dashboard_widgets(request: Request):
    await require_admin(request)
    now = datetime.now(timezone.utc)
    today_start = now.replace(hour=0, minute=0, second=0).isoformat()
    last_24h = (now - timedelta(hours=24)).isoformat()

    # Failed logins
    failed_logins_24h = await db.auth_events.count_documents({"type": "login_failed", "created_at": {"$gte": last_24h}})

    # Broken links
    broken_links = await db.broken_links.count_documents({"status": "broken"})

    # Pending approvals
    pending_jobs = await db.jobs_v2.count_documents({"status": "pending"})
    pending_partners = await db.partner_applications.count_documents({"status": "pending"})
    pending_resources = await db.resources.count_documents({"status": "pending"})

    # Active paid employers
    active_subs = await db.subscriptions.count_documents({"status": "active"})

    # Leads today
    leads_today = await db.leads.count_documents({"created_at": {"$gte": today_start}})

    # Job analytics
    top_jobs_pipeline = [
        {"$match": {"action": "job_apply_click"}},
        {"$group": {"_id": "$metadata.job_title", "clicks": {"$sum": 1}}},
        {"$sort": {"clicks": -1}},
        {"$limit": 5}
    ]
    top_apply_jobs = await db.activity_logs.aggregate(top_jobs_pipeline).to_list(5)

    top_help_pipeline = [
        {"$match": {"action": "lead_request_help", "metadata.category": "employment"}},
        {"$group": {"_id": "$metadata.resource_name", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}},
        {"$limit": 5}
    ]
    top_help_jobs = await db.activity_logs.aggregate(top_help_pipeline).to_list(5)

    # Recent errors
    recent_errors = await db.error_events.count_documents({"created_at": {"$gte": last_24h}})

    # Checkout conversion
    total_checkouts_started = await db.activity_logs.count_documents({"action": {"$regex": "checkout_started"}})
    total_checkouts_completed = await db.payment_transactions.count_documents({"payment_status": "paid"})

    return {
        "failed_logins_24h": failed_logins_24h,
        "broken_links": broken_links,
        "pending_jobs": pending_jobs,
        "pending_partners": pending_partners,
        "pending_resources": pending_resources,
        "active_paid_employers": active_subs,
        "leads_today": leads_today,
        "recent_errors_24h": recent_errors,
        "checkout_started": total_checkouts_started,
        "checkout_completed": total_checkouts_completed,
        "checkout_conversion": round((total_checkouts_completed / max(total_checkouts_started, 1)) * 100, 1),
        "top_apply_jobs": [{"title": j["_id"], "clicks": j["clicks"]} for j in top_apply_jobs],
        "top_help_jobs": [{"title": j["_id"], "count": j["count"]} for j in top_help_jobs],
    }
