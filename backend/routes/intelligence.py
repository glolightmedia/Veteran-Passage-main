from fastapi import APIRouter, HTTPException, Request
from datetime import datetime, timezone
from bson import ObjectId
import logging

from utils.auth import get_current_user

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/intelligence", tags=["intelligence"])
db = None

DISCHARGE_TIERS = {
    "honorable": "green", "general": "green",
    "oth": "yellow", "entry-level": "yellow",
    "bad-conduct-special": "blue", "bad-conduct-general": "blue",
    "dishonorable": "blue", "dismissal": "blue"
}

# Every resource now has friction metadata
RESOURCE_DB = [
    {"id": "r1", "name": "VA Healthcare", "category": "benefits", "type": "benefit", "action_url": "https://www.va.gov/health-care/apply/application/", "action_label": "Apply Now", "description": "Full VA medical coverage", "tier_access": ["green"],
     "time_to_complete": "medium", "time_estimate": "20 min online", "documents_required": True, "approval_days": 30, "friction": 15},
    {"id": "r2", "name": "Vet Center Counseling", "category": "mental-health", "type": "service", "action_url": "https://www.va.gov/find-locations/?facilityType=vet_center", "action_label": "Find Center", "description": "Free confidential counseling — no paperwork needed", "tier_access": ["green", "yellow"],
     "time_to_complete": "low", "time_estimate": "2 min to find", "documents_required": False, "approval_days": 0, "friction": 3},
    {"id": "r3", "name": "Veterans Crisis Line", "category": "mental-health", "type": "crisis", "action_url": "tel:988", "action_label": "Call 988 Press 1", "description": "24/7 crisis support — immediate help", "tier_access": ["green", "yellow", "blue"],
     "time_to_complete": "low", "time_estimate": "Immediate", "documents_required": False, "approval_days": 0, "friction": 0},
    {"id": "r4", "name": "Hire Heroes USA", "category": "employment", "type": "service", "action_url": "https://www.hireheroesusa.org/", "action_label": "Get Free Help", "description": "Free career coaching, resume writing, and job placement", "tier_access": ["green", "yellow", "blue"],
     "time_to_complete": "low", "time_estimate": "5 min signup", "documents_required": False, "approval_days": 1, "friction": 3},
    {"id": "r5", "name": "Swords to Plowshares Legal Aid", "category": "legal", "type": "service", "action_url": "https://www.swords-to-plowshares.org/", "action_label": "Get Free Legal Help", "description": "Free legal aid for discharge upgrades — call today", "tier_access": ["green", "yellow", "blue"],
     "time_to_complete": "low", "time_estimate": "5 min call", "documents_required": False, "approval_days": 0, "friction": 3},
    {"id": "r6", "name": "SBA Boots to Business", "category": "business", "type": "program", "action_url": "https://www.sba.gov/sba-learning-platform/boots-business", "action_label": "Enroll Free", "description": "Free 2-day entrepreneurship training course", "tier_access": ["green", "yellow"],
     "time_to_complete": "low", "time_estimate": "3 min signup", "documents_required": False, "approval_days": 0, "friction": 2},
    {"id": "r7", "name": "GI Bill Education Benefits", "category": "education", "type": "benefit", "action_url": "https://www.va.gov/education/how-to-apply/", "action_label": "Check Eligibility", "description": "Education funding — up to 36 months", "tier_access": ["green"],
     "time_to_complete": "medium", "time_estimate": "15 min application", "documents_required": True, "approval_days": 30, "friction": 18},
    {"id": "r8", "name": "Veterans Upward Bound", "category": "education", "type": "program", "action_url": "https://www2.ed.gov/programs/trioupbound/index.html", "action_label": "Find Program", "description": "Free college prep — no discharge requirement", "tier_access": ["green", "yellow"],
     "time_to_complete": "low", "time_estimate": "5 min to find", "documents_required": False, "approval_days": 7, "friction": 5},
    {"id": "r9", "name": "HUD-VASH Housing Vouchers", "category": "housing", "type": "benefit", "action_url": "https://www.va.gov/homeless/hud-vash.asp", "action_label": "Apply", "description": "Housing vouchers for veterans", "tier_access": ["green"],
     "time_to_complete": "high", "time_estimate": "30+ min", "documents_required": True, "approval_days": 60, "friction": 25},
    {"id": "r10", "name": "Salvation Army Veteran Housing", "category": "housing", "type": "service", "action_url": "https://www.salvationarmyusa.org/", "action_label": "Find Shelter Now", "description": "Emergency housing — walk in today", "tier_access": ["green", "yellow", "blue"],
     "time_to_complete": "low", "time_estimate": "Immediate", "documents_required": False, "approval_days": 0, "friction": 1},
    {"id": "r11", "name": "NVLSP Discharge Upgrade Help", "category": "legal", "type": "service", "action_url": "https://www.nvlsp.org/", "action_label": "Get Free Representation", "description": "Free legal representation for your discharge upgrade", "tier_access": ["green", "yellow", "blue"],
     "time_to_complete": "low", "time_estimate": "10 min intake call", "documents_required": False, "approval_days": 0, "friction": 5},
    {"id": "r12", "name": "Give an Hour — Free Therapy", "category": "mental-health", "type": "service", "action_url": "https://giveanhour.org/", "action_label": "Find a Therapist", "description": "Free therapy from 7,000+ licensed providers nationwide", "tier_access": ["green", "yellow", "blue"],
     "time_to_complete": "low", "time_estimate": "3 min search", "documents_required": False, "approval_days": 0, "friction": 2},
    {"id": "r13", "name": "Helmets to Hardhats", "category": "employment", "type": "program", "action_url": "https://www.helmetstohardhats.org/", "action_label": "Apply Free", "description": "Free union trade apprenticeships — paid training", "tier_access": ["green", "yellow"],
     "time_to_complete": "low", "time_estimate": "5 min application", "documents_required": False, "approval_days": 7, "friction": 5},
    {"id": "r14", "name": "Bunker Labs Accelerator", "category": "business", "type": "program", "action_url": "https://bunkerlabs.org/", "action_label": "Join Free Cohort", "description": "Veteran entrepreneur accelerator — free", "tier_access": ["green", "yellow"],
     "time_to_complete": "low", "time_estimate": "5 min application", "documents_required": False, "approval_days": 7, "friction": 5},
    {"id": "r15", "name": "VA Home Loan — Zero Down", "category": "benefits", "type": "benefit", "action_url": "https://www.va.gov/housing-assistance/home-loans/", "action_label": "Check Eligibility", "description": "Zero-down-payment home loans for veterans", "tier_access": ["green"],
     "time_to_complete": "high", "time_estimate": "30+ min", "documents_required": True, "approval_days": 45, "friction": 28},
    {"id": "r16", "name": "Operation Homefront — Emergency Aid", "category": "housing", "type": "service", "action_url": "https://www.operationhomefront.org/", "action_label": "Apply for Help", "description": "Emergency financial and housing assistance", "tier_access": ["green", "yellow", "blue"],
     "time_to_complete": "medium", "time_estimate": "10 min application", "documents_required": False, "approval_days": 14, "friction": 8},
    {"id": "r17", "name": "VetJobs — Veteran Job Board", "category": "employment", "type": "service", "action_url": "https://www.vetjobs.com/", "action_label": "Browse Jobs Now", "description": "1000+ veteran-friendly job listings", "tier_access": ["green", "yellow", "blue"],
     "time_to_complete": "low", "time_estimate": "Instant browsing", "documents_required": False, "approval_days": 0, "friction": 1},
    {"id": "r18", "name": "SCORE — Free Business Mentoring", "category": "business", "type": "service", "action_url": "https://www.score.org/", "action_label": "Get a Free Mentor", "description": "Free one-on-one business mentoring", "tier_access": ["green", "yellow", "blue"],
     "time_to_complete": "low", "time_estimate": "3 min signup", "documents_required": False, "approval_days": 3, "friction": 3},
]


def score_resource(resource, profile):
    score = 0
    user_tier = DISCHARGE_TIERS.get(profile.get("discharge"), "green")
    goal = profile.get("goal")
    urgency = profile.get("urgency")

    # Tier access (50pts)
    if user_tier in resource.get("tier_access", []):
        score += 50
        resource["tier_status"] = "green"
    else:
        score += 2
        resource["tier_status"] = "yellow" if user_tier == "yellow" else "blue"

    # Goal match (30pts)
    if resource.get("category") == goal:
        score += 30

    # Urgency boost
    if urgency == "crisis" and resource.get("type") == "crisis":
        score += 100
    elif urgency == "crisis":
        score += 10
    elif urgency == "weeks":
        score += 5

    # Legal boost for yellow/blue
    if user_tier in ["yellow", "blue"] and resource.get("category") == "legal":
        score += 20

    # FRICTION PENALTY — lower friction = higher score
    friction = resource.get("friction", 10)
    score -= friction

    return score


def set_db(database):
    global db
    db = database


@router.get("/recommendations")
async def get_recommendations(request: Request):
    user = await get_current_user(request, db)
    user_tier = DISCHARGE_TIERS.get(user.get("discharge"), "green")
    goal = user.get("goal", "employment")
    urgency = user.get("urgency", "exploring")
    state = user.get("state", "")

    profile = {"state": state, "discharge": user.get("discharge"), "goal": goal, "urgency": urgency}

    scored = []
    for r in RESOURCE_DB:
        r_copy = {**r}
        r_copy["score"] = score_resource(r_copy, profile)
        scored.append(r_copy)
    scored.sort(key=lambda x: x["score"], reverse=True)

    # THE ONE next action — highest scored, eligible, lowest friction
    eligible = [r for r in scored if r["tier_status"] == "green"]
    next_action = eligible[0] if eligible else scored[0] if scored else None

    # Available now (green tier, excluding next action)
    available = [r for r in eligible if r["id"] != (next_action["id"] if next_action else "")][:8]

    # Unlockable (yellow — needs upgrade)
    unlockable = [r for r in scored if r["tier_status"] != "green"][:6]

    # Success moment — the instant "good news" message
    success_msg = None
    if next_action and next_action["tier_status"] == "green":
        success_msg = f"Good news — you qualify for {next_action['name']} right now."

    # Personalization context
    discharge_label = user.get("discharge", "").replace("-", " ").title()
    personalization = f"Based on your {discharge_label} discharge in {state}" if state else f"Based on your {discharge_label} discharge"

    await db.activity_logs.insert_one({
        "user_id": user.get("id", str(user.get("_id", ""))),
        "action": "recommendations_viewed",
        "metadata": {"tier": user_tier, "goal": goal, "next_action": next_action["id"] if next_action else None},
        "created_at": datetime.now(timezone.utc).isoformat()
    })

    return {
        "user_tier": user_tier,
        "goal": goal,
        "urgency": urgency,
        "personalization": personalization,
        "success_message": success_msg,
        "next_action": next_action,
        "available": available,
        "unlockable": unlockable,
        "total": len(scored)
    }


# Lead capture endpoint
@router.post("/request-help")
async def request_help(request: Request):
    user = await get_current_user(request, db)
    body = await request.json()

    lead = {
        "user_id": user["id"],
        "user_name": user.get("full_name", ""),
        "user_email": user.get("email", ""),
        "user_state": user.get("state", ""),
        "user_discharge": user.get("discharge", ""),
        "category": body.get("category", ""),
        "resource_id": body.get("resource_id", ""),
        "resource_name": body.get("resource_name", ""),
        "message": body.get("message", ""),
        "status": "new",
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    result = await db.leads.insert_one(lead)
    lead["id"] = str(result.inserted_id)
    lead.pop("_id", None)

    await db.activity_logs.insert_one({
        "user_id": user["id"],
        "action": "lead_request_help",
        "metadata": {"category": body.get("category"), "resource_name": body.get("resource_name")},
        "created_at": datetime.now(timezone.utc).isoformat()
    })

    return {"message": "Your request has been submitted. A partner will reach out to you soon.", "lead": lead}
