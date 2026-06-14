from fastapi import APIRouter, HTTPException, Request, Query
from datetime import datetime, timezone
from bson import ObjectId
from typing import Optional
import logging

from utils.auth import get_current_user
from utils.rbac import require_role

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/mentorship", tags=["mentorship"])
db = None


def set_db(database):
    global db
    db = database


@router.put("/profile")
async def update_mentor_profile(request: Request):
    user = await get_current_user(request, db)
    body = await request.json()

    update = {
        "is_mentor": body.get("is_mentor", False),
        "mentor_expertise": body.get("expertise", []),
        "mentor_bio": body.get("bio", ""),
        "mentor_availability": body.get("availability", "available"),
    }
    await db.users.update_one({"_id": ObjectId(user["id"])}, {"$set": update})
    return {"message": "Mentor profile updated"}


@router.get("/mentors")
async def list_mentors(
    request: Request,
    branch: Optional[str] = Query(None),
    expertise: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=50)
):
    await get_current_user(request, db)
    query = {"is_mentor": True, "mentor_availability": {"$ne": "unavailable"}}
    if branch:
        query["branch"] = branch
    if expertise:
        query["mentor_expertise"] = expertise

    skip = (page - 1) * limit
    total = await db.users.count_documents(query)
    cursor = db.users.find(query, {
        "password_hash": 0
    }).skip(skip).limit(limit)

    mentors = []
    async for m in cursor:
        mentors.append({
            "id": str(m["_id"]),
            "full_name": m.get("full_name", ""),
            "branch": m.get("branch"),
            "discharge": m.get("discharge"),
            "expertise": m.get("mentor_expertise", []),
            "bio": m.get("mentor_bio", ""),
            "availability": m.get("mentor_availability", "available")
        })

    return {"mentors": mentors, "total": total, "page": page}


@router.post("/requests")
async def send_request(request: Request):
    user = await get_current_user(request, db)
    body = await request.json()
    mentor_id = body.get("mentor_id")
    message = body.get("message", "")

    if not mentor_id:
        raise HTTPException(status_code=400, detail="mentor_id required")
    if mentor_id == user["id"]:
        raise HTTPException(status_code=400, detail="Cannot request yourself")

    mentor = await db.users.find_one({"_id": ObjectId(mentor_id), "is_mentor": True})
    if not mentor:
        raise HTTPException(status_code=404, detail="Mentor not found")

    existing = await db.mentorship_requests.find_one({
        "mentee_id": user["id"], "mentor_id": mentor_id, "status": "pending"
    })
    if existing:
        raise HTTPException(status_code=400, detail="Request already pending")

    doc = {
        "mentee_id": user["id"],
        "mentee_name": user.get("full_name", ""),
        "mentor_id": mentor_id,
        "mentor_name": mentor.get("full_name", ""),
        "message": message,
        "status": "pending",
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    result = await db.mentorship_requests.insert_one(doc)
    doc["id"] = str(result.inserted_id)
    doc.pop("_id", None)
    return doc


@router.get("/requests")
async def get_requests(request: Request):
    user = await get_current_user(request, db)
    # Get requests where user is mentor or mentee
    cursor = db.mentorship_requests.find({
        "$or": [{"mentee_id": user["id"]}, {"mentor_id": user["id"]}]
    }).sort("created_at", -1)
    requests = []
    async for r in cursor:
        r["id"] = str(r.pop("_id"))
        requests.append(r)
    return {"requests": requests}


@router.put("/requests/{request_id}")
async def respond_to_request(request: Request, request_id: str):
    user = await get_current_user(request, db)
    body = await request.json()
    action = body.get("action")  # accept or decline

    if action not in ["accept", "decline"]:
        raise HTTPException(status_code=400, detail="action must be accept or decline")

    req = await db.mentorship_requests.find_one({"_id": ObjectId(request_id)})
    if not req:
        raise HTTPException(status_code=404, detail="Request not found")
    if req["mentor_id"] != user["id"]:
        raise HTTPException(status_code=403, detail="Only the mentor can respond")

    new_status = "accepted" if action == "accept" else "declined"
    await db.mentorship_requests.update_one(
        {"_id": ObjectId(request_id)},
        {"$set": {"status": new_status, "responded_at": datetime.now(timezone.utc).isoformat()}}
    )
    return {"message": f"Request {new_status}"}
