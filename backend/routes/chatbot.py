from fastapi import APIRouter, HTTPException, Request
from datetime import datetime, timezone
from bson import ObjectId
import os
import logging
import uuid

from utils.auth import get_current_user

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/chat", tags=["chatbot"])
db = None

SYSTEM_PROMPT = """You are the Veteran Passage AI Assistant. You ONLY help with topics related to the Veteran Passage platform and veteran services.

STRICT RULES:
- ONLY answer questions about: VA benefits, discharge upgrades, employment for veterans, veteran housing, mental health resources, education/GI Bill, veteran entrepreneurship, and the Veteran Passage platform features.
- If asked about anything unrelated to veterans or this platform, politely redirect: "I'm here to help with veteran benefits and services. What can I help you with today?"
- NEVER invent or hallucinate resources. Only reference real programs and organizations.
- NEVER provide legal advice. Always say "consult with a veteran legal aid organization" and recommend Swords to Plowshares or NVLSP.
- NEVER provide medical advice. Always recommend professional care.
- If someone seems in crisis, IMMEDIATELY say: "If you're in crisis, please call 988 and press 1 for the Veterans Crisis Line."

DISCHARGE TIER FACTS (use these exactly):
- GREEN (Honorable, General): Full VA benefits, GI Bill, VA healthcare, VA home loans
- YELLOW (OTH, Entry Level): Limited — case-by-case VA healthcare, many non-VA programs available, discharge upgrade possible
- BLUE (BCD, Dishonorable, Dismissal): Most VA benefits barred, but discharge upgrade IS possible, many civilian programs still available

ALWAYS:
- Be concise (3-5 bullet points max per response)
- End with ONE clear next step the user should take
- Mention discharge upgrades are possible when relevant
- Use the user's context (discharge, state, branch) to personalize

The user's context will be provided including their discharge type, branch, and tier."""


def set_db(database):
    global db
    db = database


@router.post("/sessions")
async def create_session(request: Request):
    user = await get_current_user(request, db)
    session_id = str(uuid.uuid4())

    doc = {
        "session_id": session_id,
        "user_id": user["id"],
        "messages": [],
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    await db.chat_sessions.insert_one(doc)
    return {"session_id": session_id}


@router.get("/sessions")
async def list_sessions(request: Request):
    user = await get_current_user(request, db)
    cursor = db.chat_sessions.find(
        {"user_id": user["id"]},
        {"_id": 0, "session_id": 1, "created_at": 1, "updated_at": 1}
    ).sort("updated_at", -1).limit(20)
    sessions = await cursor.to_list(20)

    # Get first message preview for each
    for s in sessions:
        msgs = await db.chat_sessions.find_one(
            {"session_id": s["session_id"]},
            {"messages": {"$slice": 1}}
        )
        if msgs and msgs.get("messages"):
            s["preview"] = msgs["messages"][0].get("content", "")[:80]
        else:
            s["preview"] = "New conversation"

    return {"sessions": sessions}


@router.get("/sessions/{session_id}")
async def get_session(request: Request, session_id: str):
    user = await get_current_user(request, db)
    session = await db.chat_sessions.find_one(
        {"session_id": session_id, "user_id": user["id"]},
        {"_id": 0}
    )
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    return session


@router.post("/sessions/{session_id}/message")
async def send_message(request: Request, session_id: str):
    from emergentintegrations.llm.chat import LlmChat, UserMessage
    user = await get_current_user(request, db)
    body = await request.json()
    user_text = body.get("message", "").strip()
    if not user_text:
        raise HTTPException(status_code=400, detail="Message is required")

    session = await db.chat_sessions.find_one({"session_id": session_id, "user_id": user["id"]})
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    # Build user context
    discharge = user.get("discharge", "not specified")
    branch = user.get("branch", "not specified")
    tier_map = {"honorable": "GREEN", "general": "GREEN", "oth": "YELLOW", "entry-level": "YELLOW",
                "bad-conduct-special": "BLUE", "bad-conduct-general": "BLUE", "dishonorable": "BLUE", "dismissal": "BLUE"}
    tier = tier_map.get(discharge, "GREEN")

    context_system = f"{SYSTEM_PROMPT}\n\nUser context: Name={user.get('full_name','Veteran')}, Branch={branch}, Discharge={discharge}, Tier={tier}, Location={user.get('location','not specified')}"

    api_key = os.environ.get("EMERGENT_LLM_KEY")
    chat = LlmChat(
        api_key=api_key,
        session_id=session_id,
        system_message=context_system
    ).with_model("openai", "gpt-5.2")

    # Replay history for context
    history = session.get("messages", [])
    for msg in history:
        if msg["role"] == "user":
            await chat.send_message(UserMessage(text=msg["content"]))

    # Send new message
    user_msg = UserMessage(text=user_text)

    try:
        response = await chat.send_message(user_msg)
    except Exception as e:
        logger.error(f"LLM error: {e}")
        response = "I'm sorry, I'm having trouble connecting right now. Please try again in a moment. If you're in crisis, please call 988 and press 1 for the Veterans Crisis Line."

    # Store messages
    now = datetime.now(timezone.utc).isoformat()
    await db.chat_sessions.update_one(
        {"session_id": session_id},
        {"$push": {"messages": {
            "$each": [
                {"role": "user", "content": user_text, "timestamp": now},
                {"role": "assistant", "content": response, "timestamp": now}
            ]
        }}, "$set": {"updated_at": now}}
    )

    return {"response": response, "session_id": session_id}
