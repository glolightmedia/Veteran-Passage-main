from fastapi import APIRouter, HTTPException, Request, Query
from datetime import datetime, timezone
from bson import ObjectId
import os
import logging

from utils.rbac import require_role
from models.roles import ResourceCreate, ResourceUpdate, PromotionCreate

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/provider", tags=["provider"])
db = None

PROMOTION_PLANS = {
    "basic": {"price": 29.00, "duration_days": 30, "label": "Basic Promotion", "badge": "Promoted"},
    "premium": {"price": 79.00, "duration_days": 30, "label": "Premium Promotion", "badge": "Premium"},
    "featured": {"price": 149.00, "duration_days": 30, "label": "Featured Listing", "badge": "Featured"}
}


def set_db(database):
    global db
    db = database


@router.get("/resources")
async def list_own_resources(request: Request):
    user = await require_role(request, db, ["partner", "admin"])
    query = {"provider_id": user["id"]} if user.get("role") != "admin" else {}
    cursor = db.resources.find(query).sort("created_at", -1)
    resources = []
    async for r in cursor:
        r["id"] = str(r.pop("_id"))
        resources.append(r)
    return {"resources": resources}


@router.post("/resources")
async def create_resource(request: Request, data: ResourceCreate):
    user = await require_role(request, db, ["partner", "admin"])
    doc = {
        "name": data.name,
        "description": data.description,
        "categories": data.categories,
        "eligibility": data.eligibility,
        "url": data.url,
        "phone": data.phone,
        "provider_id": user["id"],
        "provider_name": user.get("full_name", "Unknown"),
        "organization": user.get("organization", user.get("full_name", "Unknown")),
        "status": "approved" if user.get("role") == "admin" else "pending",
        "verified": False,
        "is_promoted": False,
        "promotion": None,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    result = await db.resources.insert_one(doc)
    doc["id"] = str(result.inserted_id)
    doc.pop("_id", None)
    return doc


@router.put("/resources/{resource_id}")
async def update_resource(request: Request, resource_id: str, data: ResourceUpdate):
    user = await require_role(request, db, ["partner", "admin"])
    resource = await db.resources.find_one({"_id": ObjectId(resource_id)})
    if not resource:
        raise HTTPException(status_code=404, detail="Resource not found")
    if resource["provider_id"] != user["id"] and user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Not your resource")

    update_data = {k: v for k, v in data.model_dump().items() if v is not None}
    if not update_data:
        raise HTTPException(status_code=400, detail="No fields to update")
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()

    await db.resources.update_one({"_id": ObjectId(resource_id)}, {"$set": update_data})
    updated = await db.resources.find_one({"_id": ObjectId(resource_id)})
    updated["id"] = str(updated.pop("_id"))
    return updated


@router.delete("/resources/{resource_id}")
async def delete_resource(request: Request, resource_id: str):
    user = await require_role(request, db, ["partner", "admin"])
    resource = await db.resources.find_one({"_id": ObjectId(resource_id)})
    if not resource:
        raise HTTPException(status_code=404, detail="Resource not found")
    if resource["provider_id"] != user["id"] and user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Not your resource")
    await db.resources.delete_one({"_id": ObjectId(resource_id)})
    return {"message": "Resource deleted"}


@router.get("/promotions/plans")
async def get_promotion_plans(request: Request):
    await require_role(request, db, ["partner", "admin"])
    return {"plans": PROMOTION_PLANS}


@router.post("/promotions/checkout")
async def create_promotion_checkout(request: Request, data: PromotionCreate):
    from emergentintegrations.payments.stripe.checkout import StripeCheckout, CheckoutSessionRequest
    user = await require_role(request, db, ["partner", "admin"])

    resource = await db.resources.find_one({"_id": ObjectId(data.resource_id)})
    if not resource:
        raise HTTPException(status_code=404, detail="Resource not found")
    if resource["provider_id"] != user["id"] and user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Not your resource")
    if resource.get("status") != "approved":
        raise HTTPException(status_code=400, detail="Resource must be approved before promotion")

    plan = PROMOTION_PLANS.get(data.plan)
    if not plan:
        raise HTTPException(status_code=400, detail="Invalid plan")

    api_key = os.environ.get("STRIPE_API_KEY")
    host_url = str(request.base_url).rstrip("/")
    origin_url = request.headers.get("X-Origin-URL", os.environ.get("FRONTEND_URL", host_url))

    webhook_url = f"{host_url}api/webhook/stripe"
    stripe_checkout = StripeCheckout(api_key=api_key, webhook_url=webhook_url)

    success_url = f"{origin_url}/provider/promotions?session_id={{CHECKOUT_SESSION_ID}}"
    cancel_url = f"{origin_url}/provider/promotions"

    metadata = {
        "user_id": user["id"],
        "resource_id": data.resource_id,
        "plan": data.plan,
        "type": "promotion"
    }

    checkout_req = CheckoutSessionRequest(
        amount=plan["price"],
        currency="usd",
        success_url=success_url,
        cancel_url=cancel_url,
        metadata=metadata
    )

    session = await stripe_checkout.create_checkout_session(checkout_req)

    await db.payment_transactions.insert_one({
        "session_id": session.session_id,
        "user_id": user["id"],
        "resource_id": data.resource_id,
        "plan": data.plan,
        "amount": plan["price"],
        "currency": "usd",
        "payment_status": "pending",
        "metadata": metadata,
        "created_at": datetime.now(timezone.utc).isoformat()
    })

    return {"url": session.url, "session_id": session.session_id}


@router.get("/promotions/status/{session_id}")
async def check_promotion_status(request: Request, session_id: str):
    from emergentintegrations.payments.stripe.checkout import StripeCheckout, CheckoutSessionRequest
    user = await require_role(request, db, ["partner", "admin"])

    tx = await db.payment_transactions.find_one({"session_id": session_id})
    if not tx:
        raise HTTPException(status_code=404, detail="Transaction not found")
    if tx["user_id"] != user["id"] and user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Not your transaction")

    if tx.get("payment_status") == "paid":
        return {"status": "paid", "payment_status": "paid"}

    api_key = os.environ.get("STRIPE_API_KEY")
    host_url = str(request.base_url).rstrip("/")
    webhook_url = f"{host_url}api/webhook/stripe"
    stripe_checkout = StripeCheckout(api_key=api_key, webhook_url=webhook_url)

    status = await stripe_checkout.get_checkout_status(session_id)

    if status.payment_status == "paid" and tx.get("payment_status") != "paid":
        await db.payment_transactions.update_one(
            {"session_id": session_id, "payment_status": {"$ne": "paid"}},
            {"$set": {
                "payment_status": "paid",
                "status": status.status,
                "paid_at": datetime.now(timezone.utc).isoformat()
            }}
        )
        from datetime import timedelta
        end_date = datetime.now(timezone.utc) + timedelta(days=PROMOTION_PLANS[tx["plan"]]["duration_days"])
        await db.promotions.insert_one({
            "resource_id": tx["resource_id"],
            "provider_id": tx["user_id"],
            "plan": tx["plan"],
            "session_id": session_id,
            "status": "active",
            "start_date": datetime.now(timezone.utc).isoformat(),
            "end_date": end_date.isoformat(),
            "created_at": datetime.now(timezone.utc).isoformat()
        })
        plan_info = PROMOTION_PLANS[tx["plan"]]
        await db.resources.update_one(
            {"_id": ObjectId(tx["resource_id"])},
            {"$set": {"is_promoted": True, "promotion": {"plan": tx["plan"], "badge": plan_info["badge"], "end_date": end_date.isoformat()}}}
        )

    return {
        "status": status.status,
        "payment_status": status.payment_status,
        "amount_total": status.amount_total,
        "currency": status.currency
    }


@router.get("/promotions")
async def list_own_promotions(request: Request):
    user = await require_role(request, db, ["partner", "admin"])
    query = {"provider_id": user["id"]} if user.get("role") != "admin" else {}
    cursor = db.promotions.find(query).sort("created_at", -1)
    promotions = []
    async for p in cursor:
        p["id"] = str(p.pop("_id"))
        promotions.append(p)
    return {"promotions": promotions}


@router.get("/analytics")
async def provider_analytics(request: Request):
    user = await require_role(request, db, ["partner", "admin"])
    resource_count = await db.resources.count_documents({"provider_id": user["id"]})
    approved_count = await db.resources.count_documents({"provider_id": user["id"], "status": "approved"})
    active_promos = await db.promotions.count_documents({"provider_id": user["id"], "status": "active"})

    views = await db.activity_logs.count_documents({
        "action": "resource_view",
        "metadata.provider_id": user["id"]
    })

    return {
        "resources": {"total": resource_count, "approved": approved_count},
        "promotions": {"active": active_promos},
        "engagement": {"views": views}
    }


# ─── PARTNER LEAD INBOX ───

@router.get("/leads")
async def get_partner_leads(request: Request):
    user = await require_role(request, db, ["partner", "admin"])
    # Find leads matching partner's categories or assigned to them
    partner_subtype = user.get("partner_subtype", "")
    category_map = {
        "employer": "employment", "legal_aid": "legal", "school": "education",
        "healthcare": "mental-health", "housing": "housing"
    }
    category = category_map.get(partner_subtype, "")

    query = {}
    if user.get("role") == "partner" and category:
        query["category"] = category

    cursor = db.leads.find(query).sort("created_at", -1).limit(50)
    leads = []
    async for l in cursor:
        l["id"] = str(l.pop("_id"))
        leads.append(l)

    # Stats
    total = len(leads)
    new_count = sum(1 for l in leads if l.get("status") == "new")
    contacted = sum(1 for l in leads if l.get("status") == "contacted")
    converted = sum(1 for l in leads if l.get("status") == "converted")

    return {
        "leads": leads,
        "stats": {"total": total, "new": new_count, "contacted": contacted, "converted": converted,
                  "conversion_rate": round((converted / max(total, 1)) * 100, 1)}
    }


@router.put("/leads/{lead_id}")
async def update_partner_lead(request: Request, lead_id: str):
    user = await require_role(request, db, ["partner", "admin"])
    body = await request.json()
    update = {k: v for k, v in body.items() if k in ["status", "notes"]}
    update["updated_at"] = datetime.now(timezone.utc).isoformat()
    update["updated_by"] = user["id"]
    await db.leads.update_one({"_id": ObjectId(lead_id)}, {"$set": update})
    return {"message": "Lead updated"}


# ─── EMPLOYER JOB POSTING WITH PLAN ENFORCEMENT ───

@router.post("/jobs")
async def create_employer_job(request: Request):
    user = await require_role(request, db, ["partner", "admin"])

    # Check subscription + job limits for partners
    if user.get("role") == "partner" and user.get("partner_subtype") == "employer":
        sub = await db.subscriptions.find_one({"user_id": user["id"], "status": "active"})
        if not sub:
            raise HTTPException(status_code=403, detail="Active billing plan required to post jobs. Contact admin for a plan.")
        if sub.get("jobs_used", 0) >= sub.get("job_limit", 0):
            raise HTTPException(status_code=403, detail=f"Job limit reached ({sub['job_limit']} jobs). Upgrade your plan for more.")

    body = await request.json()
    required = ["title", "company", "summary", "category"]
    for f in required:
        if not body.get(f):
            raise HTTPException(status_code=400, detail=f"{f} is required")

    from datetime import timedelta
    doc = {
        "title": body["title"], "company": body.get("company", user.get("organization", "")),
        "summary": body["summary"], "location_city": body.get("location_city", ""),
        "location_state": body.get("location_state", ""), "category": body["category"],
        "experience_level": body.get("experience_level", "Entry"),
        "salary_min": body.get("salary_min"), "salary_max": body.get("salary_max"),
        "second_chance_friendly": body.get("second_chance_friendly", False),
        "vet_preferred": body.get("vet_preferred", True),
        "requires_honorable": body.get("requires_honorable", False),
        "easy_apply": body.get("easy_apply", False),
        "fast_hiring": body.get("fast_hiring", False),
        "remote": body.get("remote", False),
        "no_degree_required": body.get("no_degree_required", False),
        "benefits_available": body.get("benefits_available", False),
        "friction_score": body.get("friction_score", 0.3),
        "apply_url": body.get("apply_url", ""),
        "contact_email": body.get("contact_email", user.get("email", "")),
        "microcopy": body.get("microcopy", ""),
        "provider_id": user["id"],
        "provider_org": user.get("organization", ""),
        "status": "pending",
        "posting_status": "active",
        "expires_at": (datetime.now(timezone.utc) + timedelta(days=30)).isoformat(),
        "posted_at": datetime.now(timezone.utc).isoformat(),
        "created_at": datetime.now(timezone.utc).isoformat(),
        "views": 0, "apply_clicks": 0, "help_clicks": 0
    }
    result = await db.jobs_v2.insert_one(doc)
    job_id = str(result.inserted_id)

    # Increment jobs_used in subscription
    if user.get("role") == "partner":
        await db.subscriptions.update_one(
            {"user_id": user["id"], "status": "active"},
            {"$inc": {"jobs_used": 1}}
        )

    doc["id"] = job_id
    doc.pop("_id", None)
    return doc


@router.get("/my-jobs")
async def list_employer_jobs(request: Request):
    user = await require_role(request, db, ["partner", "admin"])
    query = {"provider_id": user["id"]} if user.get("role") != "admin" else {}
    cursor = db.jobs_v2.find(query).sort("created_at", -1)
    jobs = []
    async for j in cursor:
        j["id"] = str(j.pop("_id"))
        jobs.append(j)

    sub = await db.subscriptions.find_one({"user_id": user["id"], "status": "active"})
    plan_info = None
    if sub:
        plan_info = {"plan": sub.get("plan_name"), "jobs_used": sub.get("jobs_used", 0), "job_limit": sub.get("job_limit", 0)}

    return {"jobs": jobs, "total": len(jobs), "plan": plan_info}
