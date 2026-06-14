from fastapi import APIRouter, HTTPException, Request, Query
from datetime import datetime, timezone
from bson import ObjectId
import logging

from utils.rbac import require_role
from utils.auth import get_current_user
from models.roles import ModerationReport, ModerationAction

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/interactions", tags=["interactions"])
db = None


def set_db(database):
    global db
    db = database


@router.get("/activity")
async def get_all_activity(
    request: Request,
    action: str = Query(None),
    user_id: str = Query(None),
    page: int = Query(1, ge=1),
    limit: int = Query(30, ge=1, le=100)
):
    admin = await require_role(request, db, ["admin", "moderator"])
    query = {}
    if action:
        query["action"] = action
    if user_id:
        query["user_id"] = user_id

    skip = (page - 1) * limit
    total = await db.activity_logs.count_documents(query)
    cursor = db.activity_logs.find(query).sort("created_at", -1).skip(skip).limit(limit)
    activities = []
    async for a in cursor:
        a["id"] = str(a.pop("_id"))
        activities.append(a)
    return {"activities": activities, "total": total, "page": page, "pages": (total + limit - 1) // limit}


@router.get("/activity/stats")
async def get_activity_stats(request: Request):
    admin = await require_role(request, db, ["admin", "moderator"])
    pipeline = [
        {"$group": {"_id": "$action", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}}
    ]
    stats = await db.activity_logs.aggregate(pipeline).to_list(50)
    total = await db.activity_logs.count_documents({})
    return {"total": total, "by_action": {s["_id"]: s["count"] for s in stats}}


@router.post("/reports")
async def create_report(request: Request, data: ModerationReport):
    user = await get_current_user(request, db)
    doc = {
        "reporter_id": user["id"],
        "reporter_name": user.get("full_name", "Unknown"),
        "target_type": data.target_type,
        "target_id": data.target_id,
        "reason": data.reason,
        "status": "pending",
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    result = await db.moderation_reports.insert_one(doc)
    doc["id"] = str(result.inserted_id)
    doc.pop("_id", None)
    return doc


@router.get("/reports")
async def list_reports(
    request: Request,
    status: str = Query("pending"),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=50)
):
    mod = await require_role(request, db, ["admin", "moderator"])
    query = {}
    if status != "all":
        query["status"] = status

    skip = (page - 1) * limit
    total = await db.moderation_reports.count_documents(query)
    cursor = db.moderation_reports.find(query).sort("created_at", -1).skip(skip).limit(limit)
    reports = []
    async for r in cursor:
        r["id"] = str(r.pop("_id"))
        reports.append(r)
    return {"reports": reports, "total": total, "page": page}


@router.put("/reports/{report_id}")
async def resolve_report(request: Request, report_id: str, data: ModerationAction):
    mod = await require_role(request, db, ["admin", "moderator"])

    report = await db.moderation_reports.find_one({"_id": ObjectId(report_id)})
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")

    await db.moderation_reports.update_one(
        {"_id": ObjectId(report_id)},
        {"$set": {
            "status": "resolved",
            "resolution": data.action,
            "resolution_notes": data.notes,
            "resolved_by": mod["id"],
            "resolved_at": datetime.now(timezone.utc).isoformat()
        }}
    )

    if data.action == "suspend" and report["target_type"] == "user":
        await db.users.update_one(
            {"_id": ObjectId(report["target_id"])},
            {"$set": {"suspended": True, "suspend_reason": f"Moderation: {data.notes or report['reason']}"}}
        )

    if data.action == "remove" and report["target_type"] == "resource":
        await db.resources.update_one(
            {"_id": ObjectId(report["target_id"])},
            {"$set": {"status": "removed"}}
        )

    await db.activity_logs.insert_one({
        "user_id": mod["id"],
        "action": "moderation_action",
        "metadata": {"report_id": report_id, "action": data.action, "target_type": report["target_type"]},
        "created_at": datetime.now(timezone.utc).isoformat()
    })

    return {"message": f"Report resolved with action: {data.action}"}
