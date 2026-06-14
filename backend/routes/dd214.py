from fastapi import APIRouter, Request, Query
from typing import Optional
import logging

from utils.auth import get_current_user

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/dd214", tags=["dd214"])
db = None


def set_db(database):
    global db
    db = database


RE_CODES = {
    "RE-1": {"meaning": "Fully eligible to reenlist", "tier": "green", "upgrade_needed": False, "description": "You separated with no restrictions. Full VA benefits eligibility.", "upgrade_likelihood": None},
    "RE-1A": {"meaning": "Fully qualified for reenlistment", "tier": "green", "upgrade_needed": False, "description": "Highest reenlistment eligibility. Full benefits access.", "upgrade_likelihood": None},
    "RE-2": {"meaning": "Eligible to reenlist with waiver", "tier": "green", "upgrade_needed": False, "description": "Minor administrative issue. Most benefits still available.", "upgrade_likelihood": None},
    "RE-2B": {"meaning": "Separated with honorable — reenlistment not authorized at this time", "tier": "green", "upgrade_needed": False, "description": "Temporary restriction. Benefits generally available.", "upgrade_likelihood": None},
    "RE-3": {"meaning": "Ineligible to reenlist, waiver may be possible", "tier": "yellow", "upgrade_needed": True, "description": "You may be ineligible for some benefits. A discharge upgrade could help.", "upgrade_likelihood": "Moderate — depends on circumstances and time elapsed"},
    "RE-3B": {"meaning": "Barred from reenlistment — waiver authorized", "tier": "yellow", "upgrade_needed": True, "description": "Restricted but waivers exist. Legal aid recommended.", "upgrade_likelihood": "Moderate — many successful upgrades with this code"},
    "RE-3P": {"meaning": "Ineligible — personality disorder separation", "tier": "yellow", "upgrade_needed": True, "description": "Often used for mental health conditions. Upgrade may be possible, especially with new DoD policies.", "upgrade_likelihood": "Good — DoD has relaxed policies on mental health separations"},
    "RE-4": {"meaning": "Ineligible to reenlist — not recommended", "tier": "blue", "upgrade_needed": True, "description": "Most restrictive code. Most VA benefits barred. Discharge upgrade strongly recommended.", "upgrade_likelihood": "Challenging but possible — legal representation recommended"},
    "RE-4R": {"meaning": "Permanently ineligible", "tier": "blue", "upgrade_needed": True, "description": "Permanent restriction. Legal counsel for upgrade application is critical.", "upgrade_likelihood": "Difficult — strong legal case needed, but precedents exist"},
}

NARRATIVE_REASONS = {
    "misconduct": {"plain_english": "Separated due to a pattern of behavior violations or a single serious incident", "common_codes": ["RE-3", "RE-4"], "upgrade_path": "If related to PTSD/TBI or if punishment was disproportionate, upgrade is possible", "upgrade_likelihood": "Moderate"},
    "pattern of misconduct": {"plain_english": "Multiple disciplinary issues during service, typically minor offenses that accumulated", "common_codes": ["RE-3", "RE-4"], "upgrade_path": "Document any untreated mental health conditions during service. Show rehabilitation.", "upgrade_likelihood": "Moderate"},
    "drug abuse": {"plain_english": "Separated due to substance use. Many cases involve self-medicating for PTSD or pain", "common_codes": ["RE-4"], "upgrade_path": "If substance use was connected to service-related trauma, upgrade is possible under liberal consideration", "upgrade_likelihood": "Moderate-Good with proper documentation"},
    "alcohol abuse": {"plain_english": "Separated due to alcohol-related incidents", "common_codes": ["RE-3", "RE-4"], "upgrade_path": "Similar to drug cases — if connected to service trauma, liberal consideration applies", "upgrade_likelihood": "Moderate-Good with documentation"},
    "personality disorder": {"plain_english": "Military determined you had a pre-existing personality disorder. Often a misdiagnosis of PTSD or TBI", "common_codes": ["RE-3P"], "upgrade_path": "Strong upgrade path — DoD now acknowledges many personality disorder diagnoses were actually PTSD", "upgrade_likelihood": "Good — this is one of the most successful upgrade categories"},
    "adjustment disorder": {"plain_english": "Difficulty adjusting to military life, often in early service", "common_codes": ["RE-3"], "upgrade_path": "If you served honorably otherwise, upgrade applications have good success rates", "upgrade_likelihood": "Good"},
    "in lieu of court martial": {"plain_english": "You accepted a discharge rather than face trial. This doesn't mean you were guilty", "common_codes": ["RE-4"], "upgrade_path": "Review Board considers if punishment was too harsh for the offense", "upgrade_likelihood": "Moderate — depends on underlying offense"},
    "commission of a serious offense": {"plain_english": "Separated for a specific serious incident during service", "common_codes": ["RE-4"], "upgrade_path": "Focus on circumstances, any mitigating factors, and post-service rehabilitation", "upgrade_likelihood": "Challenging but not impossible"},
    "unfitness": {"plain_english": "General failure to meet military standards", "common_codes": ["RE-3", "RE-4"], "upgrade_path": "Document any underlying conditions. Show strong post-service record.", "upgrade_likelihood": "Moderate"},
    "homosexual conduct": {"plain_english": "Separated under outdated Don't Ask Don't Tell (DADT) or pre-DADT policies", "common_codes": ["RE-3", "RE-4"], "upgrade_path": "Automatic upgrade eligible under 2023 DoD directive. Contact your branch's review board.", "upgrade_likelihood": "Excellent — near-automatic upgrade available"},
    "parenthood": {"plain_english": "Separated due to pregnancy or dependent care obligations", "common_codes": ["RE-3"], "upgrade_path": "Many successful upgrades — military policy has since changed", "upgrade_likelihood": "Good"},
    "entry level performance and conduct": {"plain_english": "Separated early in service (usually first 180 days) for performance or behavior", "common_codes": ["RE-3"], "upgrade_path": "Typically results in uncharacterized discharge — limited impact on benefits", "upgrade_likelihood": "Moderate"},
}

UPGRADE_BOARDS = {
    "Army": {"name": "Army Discharge Review Board (ADRB)", "url": "https://adrb.army.mil/", "timeline": "6-12 months"},
    "Navy": {"name": "Naval Discharge Review Board (NDRB)", "url": "https://www.secnav.navy.mil/mra/CORB/pages/ndrb/default.aspx", "timeline": "6-18 months"},
    "Marine Corps": {"name": "Naval Discharge Review Board (NDRB)", "url": "https://www.secnav.navy.mil/mra/CORB/pages/ndrb/default.aspx", "timeline": "6-18 months"},
    "Air Force": {"name": "Air Force Discharge Review Board (AFDRB)", "url": "https://afrba-portal.cce.af.mil/", "timeline": "6-12 months"},
    "Coast Guard": {"name": "Coast Guard Board for Correction of Military Records", "url": "https://www.uscg.mil/Resources/legal/BCMR/", "timeline": "12-18 months"},
    "Space Force": {"name": "Air Force Discharge Review Board (AFDRB)", "url": "https://afrba-portal.cce.af.mil/", "timeline": "6-12 months"},
}


@router.get("/re-codes")
async def get_re_codes():
    return {"codes": RE_CODES}


@router.get("/re-codes/{code}")
async def decode_re_code(code: str):
    info = RE_CODES.get(code.upper())
    if not info:
        return {"code": code, "found": False, "message": "RE code not found. Try RE-1 through RE-4."}
    return {"code": code.upper(), "found": True, **info}


@router.get("/narrative-reasons")
async def get_narrative_reasons():
    return {"reasons": {k: {**v, "id": k} for k, v in NARRATIVE_REASONS.items()}}


@router.get("/narrative-reasons/{reason}")
async def decode_narrative(reason: str):
    key = reason.lower().replace("-", " ").replace("_", " ")
    info = NARRATIVE_REASONS.get(key)
    if not info:
        for k, v in NARRATIVE_REASONS.items():
            if key in k or k in key:
                return {"reason": k, "found": True, **v}
        return {"reason": reason, "found": False, "message": "Narrative reason not found."}
    return {"reason": key, "found": True, **info}


@router.get("/upgrade-board")
async def get_upgrade_board(branch: str = Query(...)):
    board = UPGRADE_BOARDS.get(branch)
    if not board:
        return {"branch": branch, "found": False, "message": "Branch not recognized"}
    return {"branch": branch, "found": True, **board}


@router.post("/analyze")
async def analyze_dd214(request: Request):
    user = await get_current_user(request, db)
    body = await request.json()

    re_code = body.get("re_code", "").upper()
    narrative = body.get("narrative_reason", "").lower()
    branch = body.get("branch", user.get("branch", ""))
    discharge = body.get("discharge", user.get("discharge", ""))

    re_info = RE_CODES.get(re_code, {})
    narrative_info = None
    for k, v in NARRATIVE_REASONS.items():
        if k in narrative or narrative in k:
            narrative_info = {"reason": k, **v}
            break

    board = UPGRADE_BOARDS.get(branch, {})

    upgrade_recommended = re_info.get("upgrade_needed", False) or discharge in ["oth", "bad-conduct-special", "bad-conduct-general", "dishonorable", "dismissal"]

    analysis = {
        "re_code": {"code": re_code, **re_info} if re_info else None,
        "narrative": narrative_info,
        "discharge_board": {"branch": branch, **board} if board else None,
        "upgrade_recommended": upgrade_recommended,
        "next_steps": []
    }

    if upgrade_recommended:
        analysis["next_steps"].append("Contact a free veteran legal service for discharge upgrade assistance")
        analysis["next_steps"].append("Gather your DD-214, medical records, and service records")
        if board:
            analysis["next_steps"].append(f"File application with {board.get('name', 'your branch review board')}")
        if narrative_info and "PTSD" in narrative_info.get("upgrade_path", ""):
            analysis["next_steps"].append("Get a current mental health evaluation documenting service-connected conditions")
    else:
        analysis["next_steps"].append("You appear eligible for most VA benefits — explore your options on the dashboard")

    await db.activity_logs.insert_one({
        "user_id": user["id"],
        "action": "dd214_analysis",
        "metadata": {"re_code": re_code, "narrative": narrative, "upgrade_recommended": upgrade_recommended},
        "created_at": __import__("datetime").datetime.now(__import__("datetime").timezone.utc).isoformat()
    })

    return analysis
