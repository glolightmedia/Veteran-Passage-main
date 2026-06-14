from fastapi import APIRouter, HTTPException, Request, Query
from datetime import datetime, timezone
from bson import ObjectId
import logging

from utils.auth import get_current_user
from utils.rbac import require_role

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/partners", tags=["partners"])
db = None


def set_db(database):
    global db
    db = database


PARTNER_TYPES = ["legal_aid", "employer", "school", "grant_provider", "healthcare", "housing", "nonprofit"]


@router.post("/apply")
async def apply_as_partner(request: Request):
    body = await request.json()

    required = ["organization_name", "contact_name", "contact_email", "partner_type", "description"]
    for f in required:
        if not body.get(f):
            raise HTTPException(status_code=400, detail=f"{f} is required")

    if body["partner_type"] not in PARTNER_TYPES:
        raise HTTPException(status_code=400, detail=f"Invalid partner type. Must be one of: {', '.join(PARTNER_TYPES)}")

    existing = await db.partner_applications.find_one({"contact_email": body["contact_email"], "status": {"$ne": "rejected"}})
    if existing:
        raise HTTPException(status_code=400, detail="Application already submitted for this email")

    doc = {
        "organization_name": body["organization_name"],
        "contact_name": body["contact_name"],
        "contact_email": body["contact_email"],
        "phone": body.get("phone", ""),
        "website": body.get("website", ""),
        "partner_type": body["partner_type"],
        "description": body["description"],
        "services_offered": body.get("services_offered", []),
        "states_served": body.get("states_served", []),
        "accepts_oth": body.get("accepts_oth", False),
        "accepts_bcd": body.get("accepts_bcd", False),
        "pro_bono": body.get("pro_bono", False),
        "status": "pending",
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    result = await db.partner_applications.insert_one(doc)
    doc["id"] = str(result.inserted_id)
    doc.pop("_id", None)
    return {"message": "Application submitted! We'll review it within 48 hours.", "application": doc}


@router.get("/applications")
async def list_applications(request: Request, status: str = Query("pending")):
    await require_role(request, db, ["admin"])
    query = {} if status == "all" else {"status": status}
    cursor = db.partner_applications.find(query).sort("created_at", -1)
    apps = []
    async for a in cursor:
        a["id"] = str(a.pop("_id"))
        apps.append(a)
    return {"applications": apps, "total": len(apps)}


@router.put("/applications/{app_id}/approve")
async def approve_application(request: Request, app_id: str):
    admin = await require_role(request, db, ["admin"])
    app = await db.partner_applications.find_one({"_id": ObjectId(app_id)})
    if not app:
        raise HTTPException(status_code=404, detail="Application not found")

    await db.partner_applications.update_one(
        {"_id": ObjectId(app_id)},
        {"$set": {"status": "approved", "approved_by": admin["id"], "approved_at": datetime.now(timezone.utc).isoformat()}}
    )

    # Create partner in directory
    await db.partner_directory.insert_one({
        "application_id": app_id,
        "organization_name": app["organization_name"],
        "contact_name": app["contact_name"],
        "contact_email": app["contact_email"],
        "phone": app.get("phone", ""),
        "website": app.get("website", ""),
        "partner_type": app["partner_type"],
        "description": app["description"],
        "services_offered": app.get("services_offered", []),
        "states_served": app.get("states_served", []),
        "accepts_oth": app.get("accepts_oth", False),
        "accepts_bcd": app.get("accepts_bcd", False),
        "pro_bono": app.get("pro_bono", False),
        "active": True,
        "created_at": datetime.now(timezone.utc).isoformat()
    })

    return {"message": "Application approved and added to partner directory"}


@router.put("/applications/{app_id}/reject")
async def reject_application(request: Request, app_id: str):
    await require_role(request, db, ["admin"])
    await db.partner_applications.update_one(
        {"_id": ObjectId(app_id)},
        {"$set": {"status": "rejected", "rejected_at": datetime.now(timezone.utc).isoformat()}}
    )
    return {"message": "Application rejected"}


@router.get("/directory")
async def partner_directory(request: Request, partner_type: str = Query(None), state: str = Query(None)):
    query = {"active": True}
    if partner_type:
        query["partner_type"] = partner_type
    if state:
        query["states_served"] = state

    cursor = db.partner_directory.find(query, {"_id": 0}).sort("organization_name", 1)
    partners = await cursor.to_list(100)
    return {"partners": partners, "total": len(partners)}


@router.get("/types")
async def get_partner_types():
    return {"types": [
        {"id": "legal_aid", "label": "Legal Aid", "description": "Discharge upgrade assistance, VA claims help"},
        {"id": "employer", "label": "Employer", "description": "Veteran-friendly and second-chance employers"},
        {"id": "school", "label": "Education", "description": "Schools, training programs, certifications"},
        {"id": "grant_provider", "label": "Grant Provider", "description": "Grants, scholarships, financial assistance"},
        {"id": "healthcare", "label": "Healthcare", "description": "Mental health, medical, counseling services"},
        {"id": "housing", "label": "Housing", "description": "Emergency, transitional, and permanent housing"},
        {"id": "nonprofit", "label": "Nonprofit", "description": "General veteran support organizations"},
    ]}
