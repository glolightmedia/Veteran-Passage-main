from fastapi import APIRouter, Request
from datetime import datetime, timezone
import logging

from utils.auth import get_current_user

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/events", tags=["events"])
db = None


def set_db(database):
    global db
    db = database


# Core events to track
TRACKED_EVENTS = {
    "page_view", "signup_started", "signup_completed", "login_success", "login_failed",
    "intake_started", "intake_completed", "dashboard_next_action_clicked",
    "job_apply_clicked", "job_help_clicked", "legal_help_clicked", "lead_submitted",
    "partner_application_submitted", "partner_job_post_started", "partner_job_post_completed",
    "partner_checkout_started", "partner_checkout_completed", "broken_link_detected",
    "404_seen", "api_500_seen", "resource_viewed", "resource_saved", "chat_message_sent",
    "forum_post_created", "forum_reply_created", "dd214_decoded", "barter_match_viewed",
    "donate_started", "donate_completed"
}


@router.post("/track")
async def track_event(request: Request):
    body = await request.json()
    event_name = body.get("event", "")
    properties = body.get("properties", {})

    # Try to get user context, but allow anonymous events
    user_ctx = {}
    try:
        user = await get_current_user(request, db)
        user_ctx = {
            "user_id": user.get("id"),
            "user_role": user.get("role"),
            "user_discharge": user.get("discharge"),
            "user_state": user.get("state"),
            "user_goal": user.get("goal"),
        }
    except Exception:
        pass

    doc = {
        "event": event_name,
        "properties": properties,
        **user_ctx,
        "route": properties.get("route", ""),
        "session_id": properties.get("session_id", ""),
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.analytics_events.insert_one(doc)
    return {"ok": True}


@router.post("/track-batch")
async def track_batch(request: Request):
    body = await request.json()
    events = body.get("events", [])
    if not events:
        return {"ok": True, "count": 0}

    user_ctx = {}
    try:
        user = await get_current_user(request, db)
        user_ctx = {
            "user_id": user.get("id"),
            "user_role": user.get("role"),
            "user_discharge": user.get("discharge"),
            "user_state": user.get("state"),
            "user_goal": user.get("goal"),
        }
    except Exception:
        pass

    docs = []
    for e in events[:50]:
        docs.append({
            "event": e.get("event", ""),
            "properties": e.get("properties", {}),
            **user_ctx,
            "route": e.get("properties", {}).get("route", ""),
            "created_at": e.get("timestamp", datetime.now(timezone.utc).isoformat())
        })
    if docs:
        await db.analytics_events.insert_many(docs)
    return {"ok": True, "count": len(docs)}


@router.get("/funnel")
async def get_funnel(request: Request):
    from utils.rbac import require_role
    await require_role(request, db, ["admin", "superadmin"])

    steps = [
        ("signup_completed", "Signed Up"),
        ("intake_completed", "Intake Done"),
        ("dashboard_next_action_clicked", "First Action"),
        ("job_apply_clicked", "Applied to Job"),
        ("lead_submitted", "Requested Help"),
    ]
    funnel = []
    for event_name, label in steps:
        count = await db.analytics_events.count_documents({"event": event_name})
        funnel.append({"event": event_name, "label": label, "count": count})

    return {"funnel": funnel}


@router.get("/summary")
async def get_event_summary(request: Request):
    from utils.rbac import require_role
    await require_role(request, db, ["admin", "superadmin"])

    pipeline = [
        {"$group": {"_id": "$event", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}},
        {"$limit": 30}
    ]
    events = await db.analytics_events.aggregate(pipeline).to_list(30)
    total = await db.analytics_events.count_documents({})

    return {
        "total_events": total,
        "by_event": {e["_id"]: e["count"] for e in events}
    }
