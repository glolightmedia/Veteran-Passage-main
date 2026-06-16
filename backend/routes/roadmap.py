from datetime import datetime, timezone
from fastapi import APIRouter, HTTPException, Request

from models.roadmap import RoadmapCreate, RoadmapStepUpdate
from utils.rbac import require_role

router = APIRouter(prefix="/api/roadmap", tags=["roadmap"])
db = None


def set_db(database):
    global db
    db = database


PRIMARY_INTEREST_ALIASES = {
    "benefits": "benefits",
    "career": "career",
    "careers": "career",
    "business": "business",
    "education": "education",
    "housing": "housing",
    "wealth": "wealth",
    "second chance": "second_chance",
    "second_chance": "second_chance",
    "second-chance": "second_chance",
}

ROADMAP_TEMPLATES = {
    "benefits": [
        ("benefits-disability-review", "benefits", "Disability Review", "Review disability benefit education and gather records before contacting official or accredited help.", "/benefits"),
        ("benefits-pact-act-review", "benefits", "PACT Act Review", "Review PACT Act topics and exposure-related education through official or trusted resources.", "/benefits"),
        ("benefits-healthcare-enrollment", "benefits", "Healthcare Enrollment", "Review VA healthcare enrollment basics and state-specific support options.", "/benefits"),
    ],
    "career": [
        ("career-resume-builder", "careers", "Resume Builder", "Translate military experience into civilian role language and prepare a focused resume.", "/careers"),
        ("career-federal-jobs", "careers", "Federal Jobs", "Review federal hiring paths, veteran preference education, and application basics.", "/careers"),
        ("career-friendly-employers", "careers", "Veteran-Friendly Employers", "Compare veteran-friendly employers, remote roles, and trade career paths.", "/careers"),
    ],
    "business": [
        ("business-boots-to-business", "business", "Boots to Business", "Start with veteran entrepreneur education before choosing a funding path.", "/business"),
        ("business-launch-center", "business", "Business Launch Center", "Clarify your offer, customer, and first operating steps.", "/business"),
        ("business-funding-resources", "business", "Funding Resources", "Review grants, funding education, and disabled veteran business resources without assuming eligibility.", "/business"),
    ],
    "education": [
        ("education-gi-bill-review", "education", "GI Bill Review", "Compare GI Bill program options against your target career outcome.", "/education"),
        ("education-vre-review", "education", "VR&E Review", "Review VR&E education topics and official eligibility resources.", "/education"),
        ("education-training-programs", "education", "Training Programs", "Compare certificates, degrees, and career training by cost, time, and job value.", "/education"),
    ],
    "housing": [
        ("housing-va-loan-preparation", "housing", "VA Loan Preparation", "Review VA loan basics, required documents, and lender-readiness education.", "/housing"),
        ("housing-credit-readiness", "housing", "Credit Readiness", "Review credit, budgeting, and affordability education before contacting lenders.", "/housing"),
        ("housing-homeownership-path", "housing", "Homeownership Path", "Compare housing assistance, first-time buyer topics, and homeownership steps.", "/housing"),
    ],
    "wealth": [
        ("wealth-disability-optimization", "wealth", "Disability Optimization", "Review benefit and budget education as a foundation for long-term planning.", "/wealth"),
        ("wealth-veteran-fire", "wealth", "Veteran FIRE", "Study veteran financial independence concepts without relying on guarantees.", "/wealth"),
        ("wealth-investment-education", "wealth", "Investment Education", "Start with risk, diversification, debt, and savings education before investing.", "/wealth"),
    ],
    "second_chance": [
        ("second-chance-discharge-upgrade", "second_chance", "Discharge Upgrade Review", "Review discharge upgrade education and qualified legal aid directories.", "/second-chance"),
        ("second-chance-benefits-restoration", "second_chance", "Benefits Restoration", "Review benefits restoration topics without treating this as legal advice.", "/second-chance"),
        ("second-chance-reentry-resources", "second_chance", "Reentry Resources", "Review reentry, employment, housing, and legal support resources.", "/second-chance"),
    ],
}

SECONDARY_STEPS = {
    "benefits": ("benefits-overview", "benefits", "Benefits Resources", "Review VA benefits, PACT Act, GI Bill, VR&E, healthcare, and state benefits education.", "/benefits"),
    "career": ("career-overview", "careers", "Career Resources", "Explore veteran-friendly employers, federal jobs, remote jobs, resume support, and trade careers.", "/careers"),
    "business": ("business-overview", "business", "Business Resources", "Explore veteran entrepreneur education, business grants, LLC setup resources, and funding topics.", "/business"),
    "education": ("education-overview", "education", "Education Resources", "Explore GI Bill programs, training paths, and veteran education benefit topics.", "/education"),
    "housing": ("housing-overview", "housing", "Housing Resources", "Explore VA loan education, housing assistance, and first-time buyer resources.", "/housing"),
    "wealth": ("wealth-overview", "wealth", "Wealth Resources", "Explore financial literacy, VA loan wealth-building education, and responsible planning topics.", "/wealth"),
    "second_chance": ("second-chance-overview", "second_chance", "Second Chance Resources", "Explore discharge upgrade education, legal resource directories, and reentry support.", "/second-chance"),
}


def now_iso():
    return datetime.now(timezone.utc).isoformat()


async def require_roadmap_user(request: Request):
    return await require_role(request, db, ["veteran", "admin"])


def normalize_primary_interest(value):
    return PRIMARY_INTEREST_ALIASES.get((value or "").strip().lower(), "benefits")


def build_step(raw_step, priority):
    step_id, category, title, description, action_url = raw_step
    return {
        "id": step_id,
        "category": category,
        "title": title,
        "description": description,
        "action_label": "Explore Free Resources",
        "action_url": action_url,
        "priority": priority,
    }


def generate_roadmap_steps(primary_interest):
    primary = normalize_primary_interest(primary_interest)
    steps = [build_step(step, 1) for step in ROADMAP_TEMPLATES[primary]]
    for key, step in SECONDARY_STEPS.items():
        if key != primary:
            steps.append(build_step(step, 2))
    return steps


def completion_percentage(steps, completed_steps):
    total = len(steps)
    if total == 0:
        return 0
    return round((len(set(completed_steps)) / total) * 100)


def serialize_roadmap(doc):
    if not doc:
        return None
    serialized = dict(doc)
    serialized["id"] = str(serialized.pop("_id"))
    return serialized


async def log_roadmap_event(event, user_id, extra=None):
    doc = {
        "event": event,
        "user_id": user_id,
        "properties": extra or {},
        "created_at": now_iso(),
    }
    await db.analytics_events.insert_one(doc)


@router.get("")
async def get_roadmap(request: Request):
    user = await require_roadmap_user(request)
    roadmap = await db.roadmaps.find_one({"user_id": user["id"]})
    return {"roadmap": serialize_roadmap(roadmap)}


@router.post("/create")
async def create_roadmap(payload: RoadmapCreate, request: Request):
    user = await require_roadmap_user(request)
    existing = await db.roadmaps.find_one({"user_id": user["id"]})
    timestamp = now_iso()
    steps = generate_roadmap_steps(payload.primary_interest)
    doc = {
        "user_id": user["id"],
        "branch": payload.branch.strip(),
        "state": payload.state.strip(),
        "employment_status": payload.employment_status.strip(),
        "disability_status": payload.disability_status.strip(),
        "primary_interest": payload.primary_interest.strip(),
        "roadmap_steps": steps,
        "completed_steps": [],
        "completion_percentage": 0,
        "created_at": existing.get("created_at") if existing else timestamp,
        "updated_at": timestamp,
    }
    await db.roadmaps.update_one({"user_id": user["id"]}, {"$set": doc}, upsert=True)
    saved = await db.roadmaps.find_one({"user_id": user["id"]})
    await log_roadmap_event("roadmap_created", user["id"])
    return {"roadmap": serialize_roadmap(saved)}


@router.post("/complete-step")
async def complete_step(payload: RoadmapStepUpdate, request: Request):
    user = await require_roadmap_user(request)
    roadmap = await db.roadmaps.find_one({"user_id": user["id"]})
    if not roadmap:
        raise HTTPException(status_code=404, detail="Roadmap not found")

    valid_step_ids = {step["id"] for step in roadmap.get("roadmap_steps", [])}
    if payload.step_id not in valid_step_ids:
        raise HTTPException(status_code=400, detail="Invalid roadmap step")

    completed = set(roadmap.get("completed_steps", []))
    previous_percentage = roadmap.get("completion_percentage", 0)
    if payload.completed:
        completed.add(payload.step_id)
    else:
        completed.discard(payload.step_id)

    completed_steps = list(completed)
    percentage = completion_percentage(roadmap.get("roadmap_steps", []), completed_steps)
    await db.roadmaps.update_one(
        {"user_id": user["id"]},
        {"$set": {
            "completed_steps": completed_steps,
            "completion_percentage": percentage,
            "updated_at": now_iso(),
        }},
    )
    saved = await db.roadmaps.find_one({"user_id": user["id"]})

    if payload.completed:
        await log_roadmap_event("roadmap_step_completed", user["id"])
    if previous_percentage < 100 and percentage == 100:
        await log_roadmap_event("roadmap_completed", user["id"])

    return {"roadmap": serialize_roadmap(saved)}


@router.post("/reset")
async def reset_roadmap(request: Request):
    user = await require_roadmap_user(request)
    await db.roadmaps.delete_one({"user_id": user["id"]})
    return {"roadmap": None, "message": "Roadmap reset"}
