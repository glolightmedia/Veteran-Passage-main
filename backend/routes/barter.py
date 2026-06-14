from fastapi import APIRouter, HTTPException, Request, Query
from datetime import datetime, timezone
from bson import ObjectId
from typing import Optional
import logging

from utils.auth import get_current_user

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/barter", tags=["barter"])
db = None


def set_db(database):
    global db
    db = database


@router.put("/profile")
async def update_barter_profile(request: Request):
    user = await get_current_user(request, db)
    body = await request.json()

    update = {
        "skills_have": body.get("skills_have", []),
        "skills_need": body.get("skills_need", []),
        "barter_active": body.get("active", True),
        "barter_bio": body.get("bio", ""),
    }
    await db.users.update_one({"_id": ObjectId(user["id"])}, {"$set": update})
    return {"message": "Barter profile updated"}


@router.get("/matches")
async def find_matches(request: Request):
    user = await get_current_user(request, db)
    my_have = user.get("skills_have", [])
    my_need = user.get("skills_need", [])

    if not my_have and not my_need:
        return {"matches": [], "message": "Set your skills first in barter profile"}

    # Find users who have what I need OR need what I have
    query = {
        "_id": {"$ne": ObjectId(user["id"])},
        "barter_active": True,
        "$or": []
    }
    if my_need:
        query["$or"].append({"skills_have": {"$in": my_need}})
    if my_have:
        query["$or"].append({"skills_need": {"$in": my_have}})

    if not query["$or"]:
        return {"matches": [], "message": "No matches found"}

    cursor = db.users.find(query, {"password_hash": 0}).limit(20)
    matches = []
    async for u in cursor:
        their_have = set(u.get("skills_have", []))
        their_need = set(u.get("skills_need", []))
        my_have_set = set(my_have)
        my_need_set = set(my_need)

        i_can_help = list(my_have_set & their_need)
        they_can_help = list(their_have & my_need_set)

        if i_can_help or they_can_help:
            matches.append({
                "id": str(u["_id"]),
                "full_name": u.get("full_name", "Anonymous"),
                "branch": u.get("branch"),
                "skills_have": list(their_have),
                "skills_need": list(their_need),
                "i_can_help_with": i_can_help,
                "they_can_help_with": they_can_help,
                "bio": u.get("barter_bio", ""),
                "match_score": len(i_can_help) + len(they_can_help)
            })

    matches.sort(key=lambda x: x["match_score"], reverse=True)
    return {"matches": matches, "total": len(matches)}


@router.post("/request")
async def send_barter_request(request: Request):
    user = await get_current_user(request, db)
    body = await request.json()
    target_id = body.get("target_id")
    message = body.get("message", "")
    offer = body.get("offer", "")
    need = body.get("need", "")

    if not target_id:
        raise HTTPException(status_code=400, detail="target_id required")
    if target_id == user["id"]:
        raise HTTPException(status_code=400, detail="Cannot request yourself")

    existing = await db.barter_requests.find_one({
        "from_id": user["id"], "to_id": target_id, "status": "pending"
    })
    if existing:
        raise HTTPException(status_code=400, detail="Request already pending")

    doc = {
        "from_id": user["id"],
        "from_name": user.get("full_name", ""),
        "to_id": target_id,
        "message": message,
        "offer": offer,
        "need": need,
        "status": "pending",
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    result = await db.barter_requests.insert_one(doc)
    doc["id"] = str(result.inserted_id)
    doc.pop("_id", None)
    return doc


@router.get("/requests")
async def get_barter_requests(request: Request):
    user = await get_current_user(request, db)
    cursor = db.barter_requests.find({
        "$or": [{"from_id": user["id"]}, {"to_id": user["id"]}]
    }).sort("created_at", -1)
    reqs = []
    async for r in cursor:
        r["id"] = str(r.pop("_id"))
        reqs.append(r)
    return {"requests": reqs}


@router.put("/requests/{request_id}")
async def respond_barter_request(request: Request, request_id: str):
    user = await get_current_user(request, db)
    body = await request.json()
    action = body.get("action")
    if action not in ["accept", "decline"]:
        raise HTTPException(status_code=400, detail="action must be accept or decline")

    req = await db.barter_requests.find_one({"_id": ObjectId(request_id)})
    if not req:
        raise HTTPException(status_code=404, detail="Request not found")
    if req["to_id"] != user["id"]:
        raise HTTPException(status_code=403, detail="Only the recipient can respond")

    await db.barter_requests.update_one(
        {"_id": ObjectId(request_id)},
        {"$set": {"status": "accepted" if action == "accept" else "declined", "responded_at": datetime.now(timezone.utc).isoformat()}}
    )
    return {"message": f"Request {action}ed"}
