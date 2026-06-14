from fastapi import APIRouter, HTTPException, Request
from datetime import datetime, timezone, timedelta
from bson import ObjectId
import logging

from utils.auth import get_current_user

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/progress", tags=["progress"])
db = None


def set_db(database):
    global db
    db = database


@router.get("")
async def get_progress(request: Request):
    user = await get_current_user(request, db)
    progress = await db.progress.find_one({"user_id": user["id"]}, {"_id": 0})
    if not progress:
        progress = {"user_id": user["id"], "goal": user.get("goal"), "milestones": [], "actions_taken": [], "check_ins": [], "streak": 0}
    return progress


@router.post("/action")
async def log_action(request: Request):
    user = await get_current_user(request, db)
    body = await request.json()
    action_type = body.get("type", "")
    resource_id = body.get("resource_id")
    resource_name = body.get("resource_name", "")
    notes = body.get("notes", "")

    action = {
        "type": action_type,
        "resource_id": resource_id,
        "resource_name": resource_name,
        "notes": notes,
        "completed_at": datetime.now(timezone.utc).isoformat()
    }

    await db.progress.update_one(
        {"user_id": user["id"]},
        {
            "$push": {"actions_taken": action},
            "$set": {"last_active": datetime.now(timezone.utc).isoformat()},
            "$inc": {"streak": 1}
        },
        upsert=True
    )

    await db.activity_logs.insert_one({
        "user_id": user["id"],
        "action": f"progress_action_{action_type}",
        "metadata": {"resource_id": resource_id, "resource_name": resource_name},
        "created_at": datetime.now(timezone.utc).isoformat()
    })

    return {"message": "Action logged", "action": action}


@router.post("/milestone")
async def complete_milestone(request: Request):
    user = await get_current_user(request, db)
    body = await request.json()

    milestone = {
        "id": body.get("id", ""),
        "title": body.get("title", ""),
        "completed_at": datetime.now(timezone.utc).isoformat()
    }

    await db.progress.update_one(
        {"user_id": user["id"]},
        {"$push": {"milestones": milestone}, "$set": {"last_active": datetime.now(timezone.utc).isoformat()}},
        upsert=True
    )

    return {"message": "Milestone completed", "milestone": milestone}


@router.get("/check-in")
async def get_check_in(request: Request):
    user = await get_current_user(request, db)
    progress = await db.progress.find_one({"user_id": user["id"]})

    if not progress:
        return {"check_in": None, "message": "Complete intake first"}

    actions = progress.get("actions_taken", [])
    goal = user.get("goal", "employment")
    last_active = progress.get("last_active")

    # Determine nudge
    nudge = None
    if not actions:
        nudge = {"type": "first_action", "message": "You haven't taken any actions yet. Start with your top recommendation!", "priority": "high"}
    elif last_active:
        last_dt = datetime.fromisoformat(last_active)
        days_inactive = (datetime.now(timezone.utc) - last_dt).days
        if days_inactive >= 7:
            nudge = {"type": "inactive", "message": f"It's been {days_inactive} days since your last activity. Let's get back on track!", "priority": "medium"}
        elif days_inactive >= 3:
            nudge = {"type": "gentle", "message": "Haven't seen you in a few days. New opportunities may be available!", "priority": "low"}

    # Generate suggestions based on actions taken
    recent_actions = actions[-3:] if actions else []
    suggestions = []
    action_types = [a.get("type") for a in recent_actions]

    if "applied" not in action_types and goal == "employment":
        suggestions.append({"text": "Apply to a job program", "action": "browse_jobs"})
    if "contacted" not in action_types and goal == "legal":
        suggestions.append({"text": "Contact a legal aid provider", "action": "browse_resources"})
    if "visited" not in action_types:
        suggestions.append({"text": "Visit a recommended resource", "action": "view_recommendations"})

    return {
        "nudge": nudge,
        "suggestions": suggestions,
        "actions_count": len(actions),
        "milestones_count": len(progress.get("milestones", [])),
        "streak": progress.get("streak", 0),
        "goal": goal
    }


@router.post("/check-in")
async def record_check_in(request: Request):
    user = await get_current_user(request, db)
    body = await request.json()

    check_in = {
        "status": body.get("status", "active"),
        "notes": body.get("notes", ""),
        "created_at": datetime.now(timezone.utc).isoformat()
    }

    await db.progress.update_one(
        {"user_id": user["id"]},
        {"$push": {"check_ins": check_in}, "$set": {"last_active": datetime.now(timezone.utc).isoformat()}},
        upsert=True
    )

    return {"message": "Check-in recorded"}
