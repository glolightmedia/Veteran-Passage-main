from datetime import datetime, timezone
from fastapi import APIRouter, HTTPException, Request

from models.opportunity import OpportunitySaveRequest, OpportunityStatusRequest
from utils.rbac import require_role

router = APIRouter(prefix="/api/opportunities", tags=["opportunities"])
db = None


def set_db(database):
    global db
    db = database


STARTER_OPPORTUNITIES = [
    {
        "id": "benefits-pact-act",
        "title": "PACT Act Benefits Review",
        "description": "Educational VA resource explaining PACT Act health care and benefits expansion for toxic exposure-related topics.",
        "category": "benefits",
        "state": "national",
        "eligibility_tags": ["toxic exposure", "VA benefits", "health care"],
        "source_url": "https://www.va.gov/resources/the-pact-act-and-your-va-benefits/",
        "organization": "U.S. Department of Veterans Affairs",
        "opportunity_type": "resource",
        "is_featured": True,
        "is_active": True,
    },
    {
        "id": "benefits-va-healthcare",
        "title": "VA Health Care Enrollment",
        "description": "VA health care information covering services, eligibility topics, and application paths.",
        "category": "benefits",
        "state": "national",
        "eligibility_tags": ["health care", "VA enrollment"],
        "source_url": "https://www.va.gov/health-care/",
        "organization": "U.S. Department of Veterans Affairs",
        "opportunity_type": "program",
        "is_featured": True,
        "is_active": True,
    },
    {
        "id": "benefits-state-veteran-offices",
        "title": "State Veteran Benefits Offices",
        "description": "Directory of state veterans affairs offices for state-specific benefits and local support.",
        "category": "benefits",
        "state": "national",
        "eligibility_tags": ["state benefits", "local support"],
        "source_url": "https://discover.va.gov/external-resources/?_resource_type=state-veterans-affairs-office",
        "organization": "U.S. Department of Veterans Affairs",
        "opportunity_type": "resource",
        "is_featured": False,
        "is_active": True,
    },
    {
        "id": "careers-usajobs-veterans",
        "title": "USAJobs Veterans Hiring Paths",
        "description": "Federal hiring information for veterans exploring federal employment paths.",
        "category": "careers",
        "state": "national",
        "eligibility_tags": ["federal jobs", "veterans preference"],
        "source_url": "https://www.usajobs.gov/help/working-in-government/unique-hiring-paths/veterans/",
        "organization": "USAJobs",
        "opportunity_type": "employer",
        "is_featured": True,
        "is_active": True,
    },
    {
        "id": "careers-hiring-our-heroes",
        "title": "Hiring Our Heroes",
        "description": "Career services, hiring events, fellowships, and employment resources for the military community.",
        "category": "careers",
        "state": "national",
        "eligibility_tags": ["career services", "hiring events", "fellowships"],
        "source_url": "https://www.hiringourheroes.org/",
        "organization": "Hiring Our Heroes",
        "opportunity_type": "program",
        "is_featured": True,
        "is_active": True,
    },
    {
        "id": "careers-veteran-jobs-mission",
        "title": "Veteran Jobs Mission",
        "description": "Coalition and veteran employment resource hub focused on private-sector veteran hiring and retention.",
        "category": "careers",
        "state": "national",
        "eligibility_tags": ["private sector", "employers"],
        "source_url": "https://www.veteranjobsmission.com/",
        "organization": "Veteran Jobs Mission",
        "opportunity_type": "employer",
        "is_featured": False,
        "is_active": True,
    },
    {
        "id": "business-boots-to-business",
        "title": "Boots to Business",
        "description": "SBA entrepreneurship education program for transitioning service members, veterans, and military spouses.",
        "category": "business",
        "state": "national",
        "eligibility_tags": ["entrepreneurship", "startup education"],
        "source_url": "https://sba.my.site.com/s/boots-to-business",
        "organization": "U.S. Small Business Administration",
        "opportunity_type": "training",
        "is_featured": True,
        "is_active": True,
    },
    {
        "id": "business-bunker-labs-ivmf",
        "title": "Bunker Labs / IVMF Entrepreneurship",
        "description": "No-cost entrepreneurship resources and programs for transitioning service members, veterans, and military spouses.",
        "category": "business",
        "state": "national",
        "eligibility_tags": ["entrepreneurship", "business education"],
        "source_url": "https://ivmf.syracuse.edu/programs/entrepreneurship/",
        "organization": "D'Aniello Institute for Veterans and Military Families",
        "opportunity_type": "program",
        "is_featured": True,
        "is_active": True,
    },
    {
        "id": "business-warrior-rising",
        "title": "Warrior Rising",
        "description": "Educational programs and support resources for veteran entrepreneurs and military family entrepreneurs.",
        "category": "business",
        "state": "national",
        "eligibility_tags": ["entrepreneurship", "business support"],
        "source_url": "https://warriorrising.org/",
        "organization": "Warrior Rising",
        "opportunity_type": "program",
        "is_featured": False,
        "is_active": True,
    },
    {
        "id": "business-vboc",
        "title": "Veterans Business Outreach Centers",
        "description": "SBA VBOC program offering resources for veterans, service members, and military spouses starting or growing a business.",
        "category": "business",
        "state": "national",
        "eligibility_tags": ["VBOC", "small business", "counseling"],
        "source_url": "https://www.sba.gov/local-assistance/resource-partners/veterans-business-outreach-center-vboc-program",
        "organization": "U.S. Small Business Administration",
        "opportunity_type": "program",
        "is_featured": True,
        "is_active": True,
    },
    {
        "id": "education-gi-bill",
        "title": "GI Bill Benefits",
        "description": "VA education resource explaining GI Bill benefit options and how to compare programs.",
        "category": "education",
        "state": "national",
        "eligibility_tags": ["GI Bill", "education benefits"],
        "source_url": "https://www.va.gov/education/about-gi-bill-benefits/",
        "organization": "U.S. Department of Veterans Affairs",
        "opportunity_type": "program",
        "is_featured": True,
        "is_active": True,
    },
    {
        "id": "education-vre",
        "title": "Veteran Readiness and Employment",
        "description": "VA VR&E education and employment resource for eligible veterans and service members.",
        "category": "education",
        "state": "national",
        "eligibility_tags": ["VR&E", "employment", "training"],
        "source_url": "https://www.va.gov/careers-employment/vocational-rehabilitation/",
        "organization": "U.S. Department of Veterans Affairs",
        "opportunity_type": "program",
        "is_featured": True,
        "is_active": True,
    },
    {
        "id": "education-coursera-veterans",
        "title": "Coursera Veteran Programs",
        "description": "Educational course and certificate pathways for veterans researching career training options.",
        "category": "education",
        "state": "national",
        "eligibility_tags": ["online learning", "certificates"],
        "source_url": "https://www.coursera.org/courseraforveterans",
        "organization": "Coursera",
        "opportunity_type": "certification",
        "is_featured": False,
        "is_active": True,
    },
    {
        "id": "housing-va-home-loans",
        "title": "VA Home Loan Resources",
        "description": "VA-backed home loan education covering loan types, eligibility topics, and certificate of eligibility steps.",
        "category": "housing",
        "state": "national",
        "eligibility_tags": ["VA loan", "homeownership"],
        "source_url": "https://www.va.gov/housing-assistance/home-loans/",
        "organization": "U.S. Department of Veterans Affairs",
        "opportunity_type": "resource",
        "is_featured": True,
        "is_active": True,
    },
    {
        "id": "housing-hud-vash",
        "title": "HUD-VASH",
        "description": "VA homeless program resource for veterans researching housing support and supportive services.",
        "category": "housing",
        "state": "national",
        "eligibility_tags": ["housing assistance", "homelessness prevention"],
        "source_url": "https://department.va.gov/homeless/hud-vash/",
        "organization": "U.S. Department of Veterans Affairs",
        "opportunity_type": "program",
        "is_featured": True,
        "is_active": True,
    },
    {
        "id": "wealth-cfpb-military-lifecycle",
        "title": "Military Financial Lifecycle",
        "description": "CFPB educational guide for servicemembers, veterans, and families navigating financial decisions.",
        "category": "wealth",
        "state": "national",
        "eligibility_tags": ["financial literacy", "planning"],
        "source_url": "https://www.consumerfinance.gov/consumer-tools/military-financial-lifecycle/",
        "organization": "Consumer Financial Protection Bureau",
        "opportunity_type": "resource",
        "is_featured": True,
        "is_active": True,
    },
    {
        "id": "wealth-investor-education",
        "title": "Investor.gov Investing Education",
        "description": "SEC investor education resource for learning investing basics and risks.",
        "category": "wealth",
        "state": "national",
        "eligibility_tags": ["investing education", "risk education"],
        "source_url": "https://www.investor.gov/introduction-investing",
        "organization": "Investor.gov",
        "opportunity_type": "resource",
        "is_featured": False,
        "is_active": True,
    },
    {
        "id": "second-chance-discharge-upgrade",
        "title": "Discharge Upgrade Instructions",
        "description": "VA educational resource explaining discharge upgrade application paths and review board routing.",
        "category": "second_chance",
        "state": "national",
        "eligibility_tags": ["discharge upgrade", "records"],
        "source_url": "https://www.va.gov/discharge-upgrade-instructions/introduction/",
        "organization": "U.S. Department of Veterans Affairs",
        "opportunity_type": "resource",
        "is_featured": True,
        "is_active": True,
    },
    {
        "id": "second-chance-legal-help",
        "title": "Legal Help for Veterans",
        "description": "VA Office of General Counsel resource directory for veterans seeking legal aid information.",
        "category": "second_chance",
        "state": "national",
        "eligibility_tags": ["legal aid", "benefits restoration"],
        "source_url": "https://www.va.gov/ogc/legalservices.asp",
        "organization": "U.S. Department of Veterans Affairs",
        "opportunity_type": "resource",
        "is_featured": True,
        "is_active": True,
    },
]


def now_iso():
    return datetime.now(timezone.utc).isoformat()


async def require_opportunity_user(request: Request):
    return await require_role(request, db, ["veteran", "admin"])


async def seed_starter_opportunities(database):
    timestamp = now_iso()
    for item in STARTER_OPPORTUNITIES:
        doc = {**item, "created_at": timestamp, "updated_at": timestamp}
        await database.opportunities.update_one(
            {"id": item["id"]},
            {"$setOnInsert": doc},
            upsert=True,
        )


def serialize_doc(doc):
    if not doc:
        return None
    data = dict(doc)
    data.pop("_id", None)
    return data


async def get_saved_map(user_id):
    saved = await db.saved_opportunities.find({"user_id": user_id}).to_list(500)
    return {item["opportunity_id"]: item["status"] for item in saved}


def preferred_category_from_roadmap(roadmap):
    if not roadmap:
        return None
    primary = (roadmap.get("primary_interest") or "").strip().lower().replace(" ", "_").replace("-", "_")
    mapping = {
        "benefits": "benefits",
        "career": "careers",
        "careers": "careers",
        "business": "business",
        "education": "education",
        "housing": "housing",
        "wealth": "wealth",
        "second_chance": "second_chance",
    }
    return mapping.get(primary)


def state_score(opportunity_state, user_state):
    if not user_state:
        return 0
    normalized_opportunity_state = (opportunity_state or "").strip().lower()
    normalized_user_state = user_state.strip().lower()
    if normalized_opportunity_state == normalized_user_state:
        return 2
    if normalized_opportunity_state in ("national", ""):
        return 1
    return 0


def with_saved_status(opportunities, saved_map):
    return [
        {**serialize_doc(opportunity), "saved_status": saved_map.get(opportunity["id"])}
        for opportunity in opportunities
    ]


def filter_dismissed(opportunities, saved_map):
    return [opportunity for opportunity in opportunities if saved_map.get(opportunity["id"]) != "dismissed"]


async def log_opportunity_event(event, user_id):
    await db.analytics_events.insert_one({
        "event": event,
        "user_id": user_id,
        "properties": {},
        "created_at": now_iso(),
    })


@router.get("")
async def list_opportunities(request: Request):
    user = await require_opportunity_user(request)
    saved_map = await get_saved_map(user["id"])
    opportunities = await db.opportunities.find({"is_active": True}).sort("title", 1).to_list(200)
    return {"opportunities": with_saved_status(opportunities, saved_map)}


@router.get("/recommended")
async def recommended_opportunities(request: Request):
    user = await require_opportunity_user(request)
    roadmap = await db.roadmaps.find_one({"user_id": user["id"]})
    preferred_category = preferred_category_from_roadmap(roadmap)
    user_state = roadmap.get("state") if roadmap else user.get("location")
    saved_map = await get_saved_map(user["id"])
    opportunities = await db.opportunities.find({"is_active": True}).to_list(200)

    def rank(opportunity):
        category_match = 1 if preferred_category and opportunity.get("category") == preferred_category else 0
        return (
            -category_match,
            -state_score(opportunity.get("state"), user_state),
            -int(bool(opportunity.get("is_featured"))),
            opportunity.get("title", ""),
        )

    opportunities = filter_dismissed(opportunities, saved_map)
    opportunities.sort(key=rank)
    return {
        "preferred_category": preferred_category,
        "opportunities": with_saved_status(opportunities[:12], saved_map),
    }


@router.post("/save")
async def save_opportunity(payload: OpportunitySaveRequest, request: Request):
    user = await require_opportunity_user(request)
    opportunity = await db.opportunities.find_one({"id": payload.opportunity_id, "is_active": True})
    if not opportunity:
        raise HTTPException(status_code=404, detail="Opportunity not found")

    timestamp = now_iso()
    await db.saved_opportunities.update_one(
        {"user_id": user["id"], "opportunity_id": payload.opportunity_id},
        {"$set": {"status": "saved", "updated_at": timestamp}, "$setOnInsert": {"created_at": timestamp}},
        upsert=True,
    )
    await log_opportunity_event("opportunity_saved", user["id"])
    return {"opportunity_id": payload.opportunity_id, "status": "saved"}


@router.post("/status")
async def update_opportunity_status(payload: OpportunityStatusRequest, request: Request):
    user = await require_opportunity_user(request)
    opportunity = await db.opportunities.find_one({"id": payload.opportunity_id, "is_active": True})
    if not opportunity:
        raise HTTPException(status_code=404, detail="Opportunity not found")

    timestamp = now_iso()
    await db.saved_opportunities.update_one(
        {"user_id": user["id"], "opportunity_id": payload.opportunity_id},
        {"$set": {"status": payload.status, "updated_at": timestamp}, "$setOnInsert": {"created_at": timestamp}},
        upsert=True,
    )
    event = {
        "saved": "opportunity_saved",
        "applied": "opportunity_applied",
        "completed": "opportunity_completed",
    }.get(payload.status)
    if event:
        await log_opportunity_event(event, user["id"])
    return {"opportunity_id": payload.opportunity_id, "status": payload.status}


@router.get("/saved")
async def saved_opportunities(request: Request):
    user = await require_opportunity_user(request)
    saved = await db.saved_opportunities.find({"user_id": user["id"], "status": {"$ne": "dismissed"}}).sort("updated_at", -1).to_list(200)
    opportunity_ids = [item["opportunity_id"] for item in saved]
    opportunities = await db.opportunities.find({"id": {"$in": opportunity_ids}}).to_list(200)
    opportunity_map = {item["id"]: serialize_doc(item) for item in opportunities}
    items = []
    for saved_item in saved:
        opportunity = opportunity_map.get(saved_item["opportunity_id"])
        if not opportunity:
            continue
        items.append({
            "opportunity": opportunity,
            "status": saved_item["status"],
            "updated_at": saved_item.get("updated_at"),
        })
    return {"saved": items}
