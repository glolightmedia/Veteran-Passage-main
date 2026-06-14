from fastapi import APIRouter, HTTPException, Request
from datetime import datetime, timezone
from bson import ObjectId
import logging

from utils.auth import get_current_user

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/intake", tags=["intake"])
db = None


def set_db(database):
    global db
    db = database


INTAKE_QUESTIONS = [
    {"id": "state", "question": "What state do you live in?", "type": "select", "options": [
        "Alabama","Alaska","Arizona","Arkansas","California","Colorado","Connecticut","Delaware","Florida","Georgia",
        "Hawaii","Idaho","Illinois","Indiana","Iowa","Kansas","Kentucky","Louisiana","Maine","Maryland",
        "Massachusetts","Michigan","Minnesota","Mississippi","Missouri","Montana","Nebraska","Nevada","New Hampshire","New Jersey",
        "New Mexico","New York","North Carolina","North Dakota","Ohio","Oklahoma","Oregon","Pennsylvania","Rhode Island","South Carolina",
        "South Dakota","Tennessee","Texas","Utah","Vermont","Virginia","Washington","West Virginia","Wisconsin","Wyoming"
    ]},
    {"id": "branch", "question": "Which branch did you serve in?", "type": "select", "options": ["Army","Navy","Air Force","Marine Corps","Coast Guard","Space Force"]},
    {"id": "years_served", "question": "How many years did you serve?", "type": "select", "options": ["Less than 1","1-2","3-5","6-10","11-20","20+"]},
    {"id": "discharge", "question": "What is your discharge type?", "type": "select", "options": [
        {"value": "honorable", "label": "Honorable Discharge"},
        {"value": "general", "label": "General (Under Honorable Conditions)"},
        {"value": "oth", "label": "Other Than Honorable (OTH)"},
        {"value": "entry-level", "label": "Entry Level Separation"},
        {"value": "bad-conduct-special", "label": "Bad Conduct (Special Court-Martial)"},
        {"value": "bad-conduct-general", "label": "Bad Conduct (General Court-Martial)"},
        {"value": "dishonorable", "label": "Dishonorable Discharge"},
        {"value": "dismissal", "label": "Dismissal (Officers)"}
    ]},
    {"id": "re_code", "question": "What is your RE code? (Check DD-214 Block 27)", "type": "select", "optional": True, "options": [
        {"value": "RE-1", "label": "RE-1 (Fully eligible to reenlist)"},
        {"value": "RE-2", "label": "RE-2 (Eligible with waiver)"},
        {"value": "RE-3", "label": "RE-3 (Ineligible, waiver possible)"},
        {"value": "RE-4", "label": "RE-4 (Ineligible)"},
        {"value": "unknown", "label": "I don't know / Not sure"}
    ]},
    {"id": "goal", "question": "What's your #1 goal right now?", "type": "select", "options": [
        {"value": "employment", "label": "Find a job"},
        {"value": "benefits", "label": "Access VA benefits"},
        {"value": "business", "label": "Start a business"},
        {"value": "legal", "label": "Legal help / discharge upgrade"},
        {"value": "education", "label": "Education & training"},
        {"value": "housing", "label": "Housing assistance"},
        {"value": "mental-health", "label": "Mental health support"}
    ]},
    {"id": "urgency", "question": "How soon do you need help?", "type": "select", "options": [
        {"value": "crisis", "label": "Immediately (crisis)"},
        {"value": "weeks", "label": "Within a few weeks"},
        {"value": "months", "label": "Within a few months"},
        {"value": "exploring", "label": "Just exploring options"}
    ]}
]


@router.get("/questions")
async def get_questions():
    return {"questions": INTAKE_QUESTIONS, "total": len(INTAKE_QUESTIONS)}


@router.post("/complete")
async def complete_intake(request: Request):
    user = await get_current_user(request, db)
    body = await request.json()
    answers = body.get("answers", {})

    # Build profile object
    profile = {
        "state": answers.get("state"),
        "branch": answers.get("branch"),
        "years_served": answers.get("years_served"),
        "discharge": answers.get("discharge"),
        "re_code": answers.get("re_code"),
        "goal": answers.get("goal"),
        "urgency": answers.get("urgency"),
        "intake_completed": True,
        "intake_completed_at": datetime.now(timezone.utc).isoformat()
    }

    # Update user profile
    await db.users.update_one(
        {"_id": ObjectId(user["id"])},
        {"$set": profile}
    )

    # Initialize progress tracker
    existing_progress = await db.progress.find_one({"user_id": user["id"]})
    if not existing_progress:
        await db.progress.insert_one({
            "user_id": user["id"],
            "goal": answers.get("goal"),
            "milestones": [],
            "actions_taken": [],
            "check_ins": [],
            "streak": 0,
            "last_active": datetime.now(timezone.utc).isoformat(),
            "created_at": datetime.now(timezone.utc).isoformat()
        })

    # Log activity
    await db.activity_logs.insert_one({
        "user_id": user["id"],
        "action": "intake_completed",
        "metadata": {"goal": answers.get("goal"), "discharge": answers.get("discharge"), "urgency": answers.get("urgency")},
        "created_at": datetime.now(timezone.utc).isoformat()
    })

    return {"message": "Intake complete", "profile": profile}
