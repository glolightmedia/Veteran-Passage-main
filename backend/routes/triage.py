from fastapi import APIRouter, Request, Query
from datetime import datetime, timezone
from typing import Optional
import logging

from utils.auth import get_current_user

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/triage", tags=["triage"])
db = None

# Discharge to tier mapping
DISCHARGE_TIERS = {
    "honorable": "green",
    "general": "green",
    "oth": "yellow",
    "entry-level": "yellow",
    "bad-conduct-special": "blue",
    "bad-conduct-general": "blue",
    "dishonorable": "blue",
    "dismissal": "blue"
}

TIER_INFO = {
    "green": {
        "label": "Full Access",
        "description": "You have broad access to VA benefits and federal programs.",
        "recommendation": "You qualify for most veteran programs. Explore the full directory."
    },
    "yellow": {
        "label": "Case-by-Case",
        "description": "Benefits access varies by program. We highlight what you're eligible for.",
        "recommendation": "Many programs accept your discharge type. Legal upgrade resources are also available."
    },
    "blue": {
        "label": "Restricted — Upgrade Path Available",
        "description": "Most federal benefits are restricted, but non-VA resources and discharge upgrade paths are available.",
        "recommendation": "Focus on legal upgrade resources first. Many non-VA programs still serve you."
    }
}


def set_db(database):
    global db
    db = database


@router.get("/my-tier")
async def get_my_tier(request: Request):
    user = await get_current_user(request, db)
    discharge = user.get("discharge")
    tier = DISCHARGE_TIERS.get(discharge, "green")
    info = TIER_INFO[tier]

    return {
        "discharge": discharge,
        "tier": tier,
        **info
    }


@router.get("/resources")
async def get_triage_resources(
    request: Request,
    category: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    show_all: bool = Query(False)
):
    user = await get_current_user(request, db)
    discharge = user.get("discharge")
    user_tier = DISCHARGE_TIERS.get(discharge, "green")

    # Log this activity
    await db.activity_logs.insert_one({
        "user_id": user.get("id", user.get("_id")),
        "action": "triage_resource_view",
        "metadata": {"tier": user_tier, "category": category, "search": search},
        "created_at": datetime.now(timezone.utc).isoformat()
    })

    # Get provider-submitted approved resources
    query = {"status": "approved"}
    if category and category != "all":
        query["categories"] = category

    provider_resources = []
    cursor = db.resources.find(query, {"_id": 0, "provider_id": 0})
    async for r in cursor:
        # Provider resources are available to all tiers by default
        r["tiers"] = r.get("tiers", ["green", "yellow", "blue"])
        r["source"] = "provider"
        provider_resources.append(r)

    return {
        "user_tier": user_tier,
        "tier_info": TIER_INFO[user_tier],
        "resources": provider_resources,
        "total": len(provider_resources)
    }


@router.get("/navigator")
async def triage_navigator(
    request: Request,
    needs: str = Query(""),
    situation: Optional[str] = Query(None)
):
    user = await get_current_user(request, db)
    discharge = user.get("discharge")
    user_tier = DISCHARGE_TIERS.get(discharge, "green")
    needs_list = [n.strip() for n in needs.split(",") if n.strip()]

    await db.activity_logs.insert_one({
        "user_id": user.get("id", user.get("_id")),
        "action": "navigator_session",
        "metadata": {"tier": user_tier, "needs": needs_list, "situation": situation},
        "created_at": datetime.now(timezone.utc).isoformat()
    })

    return {
        "user_tier": user_tier,
        "tier_info": TIER_INFO[user_tier],
        "needs": needs_list,
        "situation": situation
    }
