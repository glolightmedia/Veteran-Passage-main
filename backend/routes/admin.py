from fastapi import APIRouter, HTTPException, Request, Query
from datetime import datetime, timezone
from bson import ObjectId
import logging

from utils.rbac import ROLES, require_role
from utils.audit import log_audit_event
from models.roles import UpdateUserRole, SuspendUser

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/admin", tags=["admin"])
db = None


def set_db(database):
    global db
    db = database


def sanitize_user(user: dict) -> dict:
    user["id"] = str(user.pop("_id"))
    user.pop("password_hash", None)
    return user


@router.get("/users")
async def list_users(
    request: Request,
    role: str = Query(None),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100)
):
    admin = await require_role(request, db, ["admin"])
    query = {}
    if role:
        query["role"] = role

    skip = (page - 1) * limit
    total = await db.users.count_documents(query)
    cursor = db.users.find(query, {"password_hash": 0}).skip(skip).limit(limit).sort("created_at", -1)
    users = []
    async for user in cursor:
        user["id"] = str(user.pop("_id"))
        users.append(user)

    return {"users": users, "total": total, "page": page, "pages": (total + limit - 1) // limit}


@router.get("/users/{user_id}")
async def get_user(request: Request, user_id: str):
    admin = await require_role(request, db, ["admin"])
    user = await db.users.find_one({"_id": ObjectId(user_id)})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return sanitize_user(user)


@router.put("/users/{user_id}/role")
async def update_user_role(request: Request, user_id: str, data: UpdateUserRole):
    admin = await require_role(request, db, ["admin"])

    user = await db.users.find_one({"_id": ObjectId(user_id)})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if str(user["_id"]) == admin["id"]:
        raise HTTPException(status_code=400, detail="Cannot change your own role")

    if data.role == "superadmin" and admin.get("role") != "superadmin":
        raise HTTPException(status_code=403, detail="Only SuperAdmin can assign SuperAdmin")

    if user.get("role") == "superadmin" and admin.get("role") != "superadmin":
        raise HTTPException(status_code=403, detail="Only SuperAdmin can modify SuperAdmin users")

    await db.users.update_one(
        {"_id": ObjectId(user_id)},
        {"$set": {"role": data.role, "role_updated_at": datetime.now(timezone.utc).isoformat()}}
    )

    await log_audit_event(
        db,
        request=request,
        action="role_change",
        actor_id=admin["id"],
        target_id=user_id,
        metadata={"old_role": user.get("role", "customer"), "new_role": data.role},
    )

    return {"message": f"User role updated to {data.role}"}


@router.put("/users/{user_id}/suspend")
async def suspend_user(request: Request, user_id: str, data: SuspendUser):
    admin = await require_role(request, db, ["admin"])

    if user_id == admin["id"]:
        raise HTTPException(status_code=400, detail="Cannot suspend yourself")

    await db.users.update_one(
        {"_id": ObjectId(user_id)},
        {"$set": {"suspended": data.suspended, "suspend_reason": data.reason, "suspended_at": datetime.now(timezone.utc).isoformat()}}
    )
    await log_audit_event(
        db,
        request=request,
        action="user_suspension_changed",
        actor_id=admin["id"],
        target_id=user_id,
        metadata={"suspended": data.suspended, "reason": data.reason},
    )
    action = "suspended" if data.suspended else "unsuspended"
    return {"message": f"User {action}"}


@router.get("/analytics")
async def get_analytics(request: Request):
    admin = await require_role(request, db, ["admin"])

    total_users = await db.users.count_documents({})
    role_counts = {}
    for role in ROLES:
        role_counts[role] = await db.users.count_documents({"role": role})

    total_resources = await db.resources.count_documents({})
    pending_resources = await db.resources.count_documents({"status": "pending"})
    approved_resources = await db.resources.count_documents({"status": "approved"})
    active_promotions = await db.promotions.count_documents({"status": "active"})
    total_revenue_cursor = db.payment_transactions.find({"payment_status": "paid"})
    total_revenue = 0
    async for tx in total_revenue_cursor:
        total_revenue += tx.get("amount", 0)

    recent_activity = await db.activity_logs.find({}).sort("created_at", -1).limit(20).to_list(20)
    for a in recent_activity:
        a["id"] = str(a.pop("_id"))

    return {
        "users": {"total": total_users, "by_role": role_counts},
        "resources": {"total": total_resources, "pending": pending_resources, "approved": approved_resources},
        "promotions": {"active": active_promotions},
        "revenue": {"total": total_revenue},
        "recent_activity": recent_activity
    }


@router.get("/resources/pending")
async def get_pending_resources(request: Request):
    admin = await require_role(request, db, ["admin"])
    cursor = db.resources.find({"status": "pending"}).sort("created_at", -1)
    resources = []
    async for r in cursor:
        r["id"] = str(r.pop("_id"))
        resources.append(r)
    return {"resources": resources}


@router.put("/resources/{resource_id}/approve")
async def approve_resource(request: Request, resource_id: str):
    admin = await require_role(request, db, ["admin"])
    result = await db.resources.update_one(
        {"_id": ObjectId(resource_id)},
        {"$set": {"status": "approved", "approved_by": admin["id"], "approved_at": datetime.now(timezone.utc).isoformat()}}
    )
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Resource not found")
    return {"message": "Resource approved"}


@router.put("/resources/{resource_id}/reject")
async def reject_resource(request: Request, resource_id: str):
    admin = await require_role(request, db, ["admin"])
    result = await db.resources.update_one(
        {"_id": ObjectId(resource_id)},
        {"$set": {"status": "rejected", "rejected_by": admin["id"], "rejected_at": datetime.now(timezone.utc).isoformat()}}
    )
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Resource not found")
    return {"message": "Resource rejected"}


# ─── JOB APPROVAL ───

@router.get("/jobs/pending")
async def get_pending_jobs(request: Request):
    admin = await require_role(request, db, ["admin"])
    cursor = db.jobs_v2.find({"status": "pending"}).sort("created_at", -1)
    jobs = []
    async for j in cursor:
        j["id"] = str(j.pop("_id"))
        jobs.append(j)
    return {"jobs": jobs}


@router.put("/jobs/{job_id}/approve")
async def approve_job(request: Request, job_id: str):
    admin = await require_role(request, db, ["admin"])
    result = await db.jobs_v2.update_one(
        {"_id": ObjectId(job_id)},
        {"$set": {"status": "active", "approved_by": admin["id"], "approved_at": datetime.now(timezone.utc).isoformat()}}
    )
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Job not found")
    return {"message": "Job approved and live"}


@router.put("/jobs/{job_id}/reject")
async def reject_job(request: Request, job_id: str):
    admin = await require_role(request, db, ["admin"])
    result = await db.jobs_v2.update_one(
        {"_id": ObjectId(job_id)},
        {"$set": {"status": "rejected", "rejected_by": admin["id"], "rejected_at": datetime.now(timezone.utc).isoformat()}}
    )
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Job not found")
    return {"message": "Job rejected"}
