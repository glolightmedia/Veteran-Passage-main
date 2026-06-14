from fastapi import APIRouter, HTTPException, Request, Query
from datetime import datetime, timezone
from bson import ObjectId
from typing import Optional
import logging

from utils.auth import get_current_user
from utils.rbac import require_role

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/jobs", tags=["jobs"])
db = None

DISCHARGE_TIERS = {
    "honorable": "green", "general": "green",
    "oth": "yellow", "entry-level": "yellow",
    "bad-conduct-special": "blue", "bad-conduct-general": "blue",
    "dishonorable": "blue", "dismissal": "blue"
}

CATEGORIES = [
    "Technology", "Healthcare", "Trades & Construction", "Government",
    "Security & Law Enforcement", "Transportation & Logistics",
    "Education", "Finance", "Manufacturing", "Retail & Sales",
    "Warehouse & Operations", "Food Service", "Other"
]

SEED_JOBS = [
    {"title": "Warehouse Operations Supervisor", "company": "North Harbor Logistics", "location_city": "San Diego", "location_state": "CA", "category": "Warehouse & Operations", "experience_level": "Mid", "salary_min": 52000, "salary_max": 64000, "summary": "A strong fit if you have leadership, operations, or hands-on problem-solving experience. This employer hires quickly and does not require an honorable discharge.", "second_chance_friendly": True, "vet_preferred": True, "requires_honorable": False, "easy_apply": True, "fast_hiring": True, "remote": False, "no_degree_required": True, "benefits_available": True, "friction_score": 0.2, "apply_url": "https://example.com/apply", "microcopy": "Good fit for hands-on experience. Military leadership translates well here."},
    {"title": "Commercial Driver Trainee", "company": "Western Freight Careers", "location_city": "Phoenix", "location_state": "AZ", "category": "Transportation & Logistics", "experience_level": "Entry", "salary_min": 48000, "salary_max": 58000, "summary": "Good option for veterans looking for a fast path into logistics. Paid training available and prior military experience is valued.", "second_chance_friendly": True, "vet_preferred": True, "requires_honorable": False, "easy_apply": True, "fast_hiring": True, "remote": False, "no_degree_required": True, "benefits_available": True, "friction_score": 0.15, "apply_url": "https://example.com/apply", "microcopy": "Better fit for quick re-entry into work. Paid training included."},
    {"title": "Maintenance Technician", "company": "Pioneer Facilities Group", "location_city": "Dallas", "location_state": "TX", "category": "Trades & Construction", "experience_level": "Mid", "salary_min": 50000, "salary_max": 65000, "summary": "A solid fit for veterans with mechanical, electrical, or hands-on field experience. No degree required and advancement path is clear.", "second_chance_friendly": True, "vet_preferred": True, "requires_honorable": False, "easy_apply": True, "fast_hiring": False, "remote": False, "no_degree_required": True, "benefits_available": True, "friction_score": 0.25, "apply_url": "https://example.com/apply", "microcopy": "Strong option if you want structure and advancement."},
    {"title": "Entry-Level IT Support Specialist", "company": "SignalBridge Tech", "location_city": "Tampa", "location_state": "FL", "category": "Technology", "experience_level": "Entry", "salary_min": 45000, "salary_max": 55000, "summary": "Good starter role for veterans transitioning into tech. Employer values troubleshooting ability and structured thinking.", "second_chance_friendly": False, "vet_preferred": True, "requires_honorable": False, "easy_apply": True, "fast_hiring": True, "remote": False, "no_degree_required": False, "benefits_available": True, "friction_score": 0.3, "apply_url": "https://example.com/apply", "microcopy": "Good starting point if you want stable income quickly."},
    {"title": "Cybersecurity Analyst", "company": "DefenseLogic Inc", "location_city": "Remote", "location_state": "", "category": "Technology", "experience_level": "Mid", "salary_min": 65000, "salary_max": 85000, "summary": "Strong fit for veterans with security clearance background or technical aptitude. Remote work available.", "second_chance_friendly": False, "vet_preferred": True, "requires_honorable": False, "easy_apply": False, "fast_hiring": False, "remote": True, "no_degree_required": False, "benefits_available": True, "friction_score": 0.5, "apply_url": "https://example.com/apply", "microcopy": "Military discipline and security experience valued here."},
    {"title": "HVAC Installation Technician", "company": "VetTrades LLC", "location_city": "San Antonio", "location_state": "TX", "category": "Trades & Construction", "experience_level": "Entry", "salary_min": 42000, "salary_max": 58000, "summary": "Apprenticeship-style role with paid on-the-job training. Great path for veterans wanting a skilled trade.", "second_chance_friendly": True, "vet_preferred": True, "requires_honorable": False, "easy_apply": True, "fast_hiring": True, "remote": False, "no_degree_required": True, "benefits_available": True, "friction_score": 0.15, "apply_url": "https://example.com/apply", "microcopy": "Paid training included. No prior HVAC experience needed."},
    {"title": "Security Officer", "company": "Guardian Shield Services", "location_city": "Houston", "location_state": "TX", "category": "Security & Law Enforcement", "experience_level": "Entry", "salary_min": 38000, "salary_max": 48000, "summary": "Ideal for veterans with military police, security, or leadership background. Second chance employer.", "second_chance_friendly": True, "vet_preferred": True, "requires_honorable": False, "easy_apply": True, "fast_hiring": True, "remote": False, "no_degree_required": True, "benefits_available": False, "friction_score": 0.1, "apply_url": "https://example.com/apply", "microcopy": "Fast hire. Military security experience is a direct match."},
    {"title": "Medical Equipment Technician", "company": "VetMed Solutions", "location_city": "Atlanta", "location_state": "GA", "category": "Healthcare", "experience_level": "Mid", "salary_min": 50000, "salary_max": 62000, "summary": "Good role for combat medics and medical support MOS veterans. Training provided on specific equipment.", "second_chance_friendly": False, "vet_preferred": True, "requires_honorable": False, "easy_apply": False, "fast_hiring": False, "remote": False, "no_degree_required": True, "benefits_available": True, "friction_score": 0.4, "apply_url": "https://example.com/apply", "microcopy": "Combat medic or medical MOS background is a strong asset."},
    {"title": "Federal Program Coordinator", "company": "Public Sector Employer", "location_city": "Washington", "location_state": "DC", "category": "Government", "experience_level": "Mid", "salary_min": 62000, "salary_max": 78000, "summary": "This type of role often requires a discharge upgrade or higher eligibility status.", "second_chance_friendly": False, "vet_preferred": True, "requires_honorable": True, "easy_apply": False, "fast_hiring": False, "remote": False, "no_degree_required": False, "benefits_available": True, "friction_score": 0.8, "apply_url": "", "microcopy": "May require discharge upgrade for eligibility.", "locked": True},
    {"title": "VA Hospital Administrative Clerk", "company": "Department of Veterans Affairs", "location_city": "Nationwide", "location_state": "", "category": "Government", "experience_level": "Entry", "salary_min": 42000, "salary_max": 55000, "summary": "Federal employment typically requires honorable or general discharge status.", "second_chance_friendly": False, "vet_preferred": True, "requires_honorable": True, "easy_apply": False, "fast_hiring": False, "remote": False, "no_degree_required": True, "benefits_available": True, "friction_score": 0.7, "apply_url": "", "microcopy": "Federal jobs have specific discharge requirements.", "locked": True},
]


def score_job(job, user_profile):
    score = 0
    tier = DISCHARGE_TIERS.get(user_profile.get("discharge"), "green")
    goal = user_profile.get("goal", "")
    state = user_profile.get("state", "")

    if job.get("second_chance_friendly"):
        score += 50
    if not job.get("requires_honorable"):
        score += 40
    if job.get("location_state") and state and job["location_state"].lower() in state.lower():
        score += 30
    if job.get("fast_hiring"):
        score += 20
    if job.get("easy_apply"):
        score += 15
    if job.get("no_degree_required"):
        score += 10
    if job.get("vet_preferred"):
        score += 10

    score -= int(job.get("friction_score", 0.5) * 30)

    if tier in ["yellow", "blue"]:
        if job.get("second_chance_friendly"):
            score += 40
        if job.get("requires_honorable"):
            score -= 100

    return score


def set_db(database):
    global db
    db = database


@router.get("")
async def list_jobs(
    request: Request,
    category: Optional[str] = Query(None),
    location: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    second_chance: Optional[bool] = Query(None),
    fast_hiring: Optional[bool] = Query(None),
    experience: Optional[str] = Query(None),
    sort: str = Query("best_fit"),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=50)
):
    user = await get_current_user(request, db)
    tier = DISCHARGE_TIERS.get(user.get("discharge"), "green")
    profile = {"discharge": user.get("discharge"), "goal": user.get("goal"), "state": user.get("state", "")}

    # Get DB jobs
    db_query = {"status": "active"}
    if category and category != "all":
        db_query["category"] = category
    if second_chance:
        db_query["second_chance_friendly"] = True
    if fast_hiring:
        db_query["fast_hiring"] = True
    if experience and experience != "all":
        db_query["experience_level"] = experience
    if search:
        db_query["$or"] = [
            {"title": {"$regex": search, "$options": "i"}},
            {"company": {"$regex": search, "$options": "i"}},
            {"summary": {"$regex": search, "$options": "i"}}
        ]
    if location:
        db_query["$or"] = db_query.get("$or", []) or []
        db_query.setdefault("$or", []).extend([
            {"location_city": {"$regex": location, "$options": "i"}},
            {"location_state": {"$regex": location, "$options": "i"}}
        ])

    db_jobs = []
    cursor = db.jobs_v2.find(db_query)
    async for j in cursor:
        j["id"] = str(j.pop("_id"))
        db_jobs.append(j)

    # Also include seed jobs (filtered)
    all_jobs = list(db_jobs)
    for sj in SEED_JOBS:
        sj_copy = {**sj, "id": f"seed_{sj['title'][:20].replace(' ','_').lower()}", "source": "seed"}
        if category and category != "all" and sj_copy.get("category") != category:
            continue
        if second_chance and not sj_copy.get("second_chance_friendly"):
            continue
        if fast_hiring and not sj_copy.get("fast_hiring"):
            continue
        if experience and experience != "all" and sj_copy.get("experience_level") != experience:
            continue
        if search and search.lower() not in (sj_copy.get("title","") + sj_copy.get("company","") + sj_copy.get("summary","")).lower():
            continue
        all_jobs.append(sj_copy)

    # Score and sort
    for j in all_jobs:
        j["score"] = score_job(j, profile)
        j["is_locked"] = j.get("locked", False) or (j.get("requires_honorable") and tier in ["yellow", "blue"])

    if sort == "best_fit":
        all_jobs.sort(key=lambda x: x["score"], reverse=True)
    elif sort == "fastest":
        all_jobs.sort(key=lambda x: (not x.get("fast_hiring"), -x["score"]))
    elif sort == "newest":
        all_jobs.sort(key=lambda x: x.get("posted_at", ""), reverse=True)

    # Split into sections
    best_matches = [j for j in all_jobs if j["score"] >= 100 and not j["is_locked"]][:3]
    available = [j for j in all_jobs if not j["is_locked"] and j not in best_matches]
    locked = [j for j in all_jobs if j["is_locked"]][:4]

    skip = (page - 1) * limit
    paged_available = available[skip:skip + limit]

    return {
        "best_matches": best_matches,
        "available": paged_available,
        "locked": locked,
        "total_available": len(available),
        "total": len(all_jobs),
        "page": page,
        "user_tier": tier,
        "user_state": user.get("state", "")
    }


@router.post("")
async def create_job(request: Request):
    user = await require_role(request, db, ["provider", "admin"])
    body = await request.json()

    required = ["title", "company", "summary", "category"]
    for f in required:
        if not body.get(f):
            raise HTTPException(status_code=400, detail=f"{f} is required")

    doc = {
        "title": body["title"], "company": body["company"], "summary": body["summary"],
        "location_city": body.get("location_city", ""), "location_state": body.get("location_state", ""),
        "category": body["category"], "experience_level": body.get("experience_level", "Entry"),
        "salary_min": body.get("salary_min"), "salary_max": body.get("salary_max"),
        "second_chance_friendly": body.get("second_chance_friendly", False),
        "vet_preferred": body.get("vet_preferred", False),
        "requires_honorable": body.get("requires_honorable", False),
        "easy_apply": body.get("easy_apply", False), "fast_hiring": body.get("fast_hiring", False),
        "remote": body.get("remote", False), "no_degree_required": body.get("no_degree_required", False),
        "benefits_available": body.get("benefits_available", False),
        "friction_score": body.get("friction_score", 0.5),
        "apply_url": body.get("apply_url", ""), "microcopy": body.get("microcopy", ""),
        "provider_id": user["id"], "status": "active",
        "posted_at": datetime.now(timezone.utc).isoformat(),
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    result = await db.jobs_v2.insert_one(doc)
    doc["id"] = str(result.inserted_id)
    doc.pop("_id", None)
    return doc


@router.delete("/{job_id}")
async def delete_job(request: Request, job_id: str):
    user = await require_role(request, db, ["provider", "admin"])
    result = await db.jobs_v2.delete_one({"_id": ObjectId(job_id), "provider_id": user["id"]})
    if result.deleted_count == 0:
        if user.get("role") == "admin":
            await db.jobs_v2.delete_one({"_id": ObjectId(job_id)})
        else:
            raise HTTPException(status_code=404, detail="Job not found")
    return {"message": "Job deleted"}


@router.get("/categories")
async def job_categories(request: Request):
    await get_current_user(request, db)
    return {"categories": CATEGORIES}


@router.post("/track-apply")
async def track_apply(request: Request):
    user = await get_current_user(request, db)
    body = await request.json()
    await db.activity_logs.insert_one({
        "user_id": user["id"],
        "action": "job_apply_click",
        "metadata": {"job_id": body.get("job_id"), "job_title": body.get("job_title"), "company": body.get("company")},
        "created_at": datetime.now(timezone.utc).isoformat()
    })
    return {"message": "Tracked"}
