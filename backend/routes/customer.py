from fastapi import APIRouter, HTTPException, Request, Query
from datetime import datetime, timezone
from bson import ObjectId
import logging

from utils.auth import get_current_user

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/customer", tags=["customer"])
db = None


def set_db(database):
    global db
    db = database


@router.post("/resources/{resource_id}/save")
async def save_resource(request: Request, resource_id: str):
    user = await get_current_user(request, db)
    saved = user.get("saved_resources", [])

    if resource_id in saved:
        await db.users.update_one(
            {"_id": ObjectId(user["id"])},
            {"$pull": {"saved_resources": resource_id}}
        )
        return {"message": "Resource unsaved", "saved": False}
    else:
        await db.users.update_one(
            {"_id": ObjectId(user["id"])},
            {"$addToSet": {"saved_resources": resource_id}}
        )
        await db.activity_logs.insert_one({
            "user_id": user["id"],
            "action": "resource_save",
            "resource_id": resource_id,
            "created_at": datetime.now(timezone.utc).isoformat()
        })
        return {"message": "Resource saved", "saved": True}


@router.get("/saved-resources")
async def get_saved_resources(request: Request):
    user = await get_current_user(request, db)
    saved_ids = user.get("saved_resources", [])
    if not saved_ids:
        return {"resources": []}

    object_ids = []
    for sid in saved_ids:
        try:
            object_ids.append(ObjectId(sid))
        except Exception:
            pass

    resources = []
    if object_ids:
        cursor = db.resources.find({"_id": {"$in": object_ids}})
        async for r in cursor:
            r["id"] = str(r.pop("_id"))
            resources.append(r)

    return {"resources": resources}


@router.get("/activity")
async def get_activity(request: Request, page: int = Query(1, ge=1), limit: int = Query(20, ge=1, le=50)):
    user = await get_current_user(request, db)
    skip = (page - 1) * limit
    total = await db.activity_logs.count_documents({"user_id": user["id"]})
    cursor = db.activity_logs.find({"user_id": user["id"]}).sort("created_at", -1).skip(skip).limit(limit)
    activities = []
    async for a in cursor:
        a["id"] = str(a.pop("_id"))
        activities.append(a)
    return {"activities": activities, "total": total, "page": page}


@router.post("/activity/log")
async def log_activity(request: Request):
    user = await get_current_user(request, db)
    body = await request.json()
    action = body.get("action")
    if not action:
        raise HTTPException(status_code=400, detail="Action is required")

    await db.activity_logs.insert_one({
        "user_id": user["id"],
        "action": action,
        "resource_id": body.get("resource_id"),
        "metadata": body.get("metadata", {}),
        "created_at": datetime.now(timezone.utc).isoformat()
    })
    return {"message": "Activity logged"}


@router.get("/navigator/history")
async def get_navigator_history(request: Request):
    user = await get_current_user(request, db)
    cursor = db.activity_logs.find({
        "user_id": user["id"],
        "action": "navigator_session"
    }).sort("created_at", -1).limit(10)
    sessions = []
    async for s in cursor:
        s["id"] = str(s.pop("_id"))
        sessions.append(s)
    return {"sessions": sessions}
