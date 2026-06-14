from dotenv import load_dotenv
from pathlib import Path

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

from fastapi import FastAPI, Request
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from datetime import datetime, timezone

from routes.auth import router as auth_router, set_db as set_auth_db
from routes.admin import router as admin_router, set_db as set_admin_db
from routes.provider import router as provider_router, set_db as set_provider_db
from routes.customer import router as customer_router, set_db as set_customer_db
from routes.interactions import router as interactions_router, set_db as set_interactions_db
from routes.developer import router as developer_router, set_db as set_developer_db
from routes.triage import router as triage_router, set_db as set_triage_db
from routes.mentorship import router as mentorship_router, set_db as set_mentorship_db
from routes.jobs import router as jobs_router, set_db as set_jobs_db
from routes.chatbot import router as chatbot_router, set_db as set_chatbot_db
from routes.forum import router as forum_router, set_db as set_forum_db
from routes.superadmin import router as superadmin_router, set_db as set_superadmin_db
from routes.donate import router as donate_router, set_db as set_donate_db
from routes.intake import router as intake_router, set_db as set_intake_db
from routes.intelligence import router as intelligence_router, set_db as set_intelligence_db
from routes.progress import router as progress_router, set_db as set_progress_db
from routes.dd214 import router as dd214_router, set_db as set_dd214_db
from routes.barter import router as barter_router, set_db as set_barter_db
from routes.partners import router as partners_router, set_db as set_partners_db
from routes.events import router as events_router, set_db as set_events_db
from routes.link_health import router as link_health_router, set_db as set_link_health_db
from routes.blog import router as blog_router, set_db as set_blog_db
from utils.auth import hash_password, verify_password

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

app = FastAPI(title="Veteran Passage API", version="2.0.0")

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# CORS — explicit origins for credential support (browsers reject * with credentials)
frontend_url = os.environ.get("FRONTEND_URL", "http://localhost:3000")
allowed_origins = [
    frontend_url,
    "http://localhost:3000",
    "https://veteran-pathways.emergent.host",
    "https://www.veteran-pathways.emergent.host",
    "https://veteranpassage.org",
    "https://www.veteranpassage.org",
]

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import Response as StarletteResponse

class CustomCORSMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request, call_next):
        origin = request.headers.get("origin", "")
        is_allowed = any(origin == o for o in allowed_origins) or origin.endswith(".emergent.host") or origin.endswith(".emergentagent.com")

        if request.method == "OPTIONS":
            response = StarletteResponse(status_code=200)
        else:
            response = await call_next(request)

        if is_allowed and origin:
            response.headers["Access-Control-Allow-Origin"] = origin
            response.headers["Access-Control-Allow-Credentials"] = "true"
            response.headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, DELETE, OPTIONS, PATCH"
            response.headers["Access-Control-Allow-Headers"] = "Content-Type, Authorization, X-API-Key, X-Origin-URL"
            response.headers["Access-Control-Max-Age"] = "600"

        return response

app.add_middleware(CustomCORSMiddleware)

# Set DB on all route modules
for setter in [set_auth_db, set_admin_db, set_provider_db, set_customer_db, set_interactions_db, set_developer_db, set_triage_db, set_mentorship_db, set_jobs_db, set_chatbot_db, set_forum_db, set_superadmin_db, set_donate_db, set_intake_db, set_intelligence_db, set_progress_db, set_dd214_db, set_barter_db, set_partners_db, set_events_db, set_link_health_db, set_blog_db]:
    setter(db)

# Include all routers
app.include_router(auth_router)
app.include_router(admin_router)
app.include_router(provider_router)
app.include_router(customer_router)
app.include_router(interactions_router)
app.include_router(developer_router)
app.include_router(triage_router)
app.include_router(mentorship_router)
app.include_router(jobs_router)
app.include_router(chatbot_router)
app.include_router(forum_router)
app.include_router(superadmin_router)
app.include_router(donate_router)
app.include_router(intake_router)
app.include_router(intelligence_router)
app.include_router(progress_router)
app.include_router(dd214_router)
app.include_router(barter_router)
app.include_router(partners_router)
app.include_router(events_router)
app.include_router(link_health_router)
app.include_router(blog_router)


@app.get("/api/health")
async def health_check():
    return {"status": "ok", "timestamp": datetime.now(timezone.utc).isoformat()}


@app.post("/api/dev/create-admin")
async def dev_create_admin(request: Request):
    body = await request.json()
    email = body.get("email", "").lower().strip()
    password = body.get("password", "")
    if not email or not password or len(password) < 6:
        from fastapi import HTTPException
        raise HTTPException(status_code=400, detail="Email and password (min 6) required")
    existing = await db.users.find_one({"email": email})
    if existing:
        await db.users.update_one({"email": email}, {"$set": {"role": "superadmin", "password_hash": hash_password(password)}})
        return {"message": f"User {email} upgraded to superadmin"}
    await db.users.insert_one({
        "email": email, "password_hash": hash_password(password),
        "full_name": "Admin", "role": "superadmin",
        "branch": None, "discharge": None, "location": None,
        "saved_resources": [], "intake_completed": True,
        "created_at": datetime.now(timezone.utc).isoformat()
    })
    return {"message": f"Superadmin created: {email}"}


@app.post("/api/webhook/stripe")
async def stripe_webhook(request: Request):
    from emergentintegrations.payments.stripe.checkout import StripeCheckout
    body = await request.body()
    sig = request.headers.get("Stripe-Signature")
    api_key = os.environ.get("STRIPE_API_KEY")
    host_url = str(request.base_url).rstrip("/")
    webhook_url = f"{host_url}/api/webhook/stripe"

    try:
        stripe_checkout = StripeCheckout(api_key=api_key, webhook_url=webhook_url)
        event = await stripe_checkout.handle_webhook(body, sig)

        if event.payment_status == "paid":
            tx = await db.payment_transactions.find_one({"session_id": event.session_id, "payment_status": {"$ne": "paid"}})
            if tx:
                await db.payment_transactions.update_one(
                    {"session_id": event.session_id},
                    {"$set": {"payment_status": "paid", "status": "complete", "paid_at": datetime.now(timezone.utc).isoformat()}}
                )
                logger.info(f"Payment confirmed via webhook: {event.session_id}")

        return {"status": "ok"}
    except Exception as e:
        logger.error(f"Webhook error: {e}")
        return {"status": "error", "detail": str(e)}


@app.get("/api/roles")
async def get_roles():
    from utils.rbac import ROLES, ROLE_PERMISSIONS
    return {
        "roles": ROLES,
        "permissions": {r: list(p) for r, p in ROLE_PERMISSIONS.items()}
    }


@app.on_event("startup")
async def startup():
    # Create indexes
    await db.users.create_index("email", unique=True)
    await db.password_reset_tokens.create_index("expires_at", expireAfterSeconds=0)
    await db.login_attempts.create_index("identifier")
    await db.resources.create_index("provider_id")
    await db.resources.create_index("status")
    await db.resources.create_index("categories")
    await db.activity_logs.create_index("user_id")
    await db.activity_logs.create_index("action")
    await db.activity_logs.create_index("created_at")
    await db.api_keys.create_index("key_hash")
    await db.api_keys.create_index("user_id")
    await db.payment_transactions.create_index("session_id")
    await db.promotions.create_index("resource_id")
    await db.moderation_reports.create_index("status")
    await db.mentorship_requests.create_index("mentee_id")
    await db.mentorship_requests.create_index("mentor_id")
    await db.jobs.create_index("status")
    await db.jobs.create_index("category")
    await db.jobs.create_index("second_chance_friendly")
    await db.chat_sessions.create_index("user_id")
    await db.chat_sessions.create_index("session_id", unique=True)
    await db.forum_posts.create_index("category")
    await db.forum_posts.create_index("author_id")
    await db.forum_posts.create_index([("created_at", -1)])
    await db.forum_replies.create_index("post_id")
    await db.barter_requests.create_index("from_id")
    await db.barter_requests.create_index("to_id")
    await db.partner_applications.create_index("status")
    await db.partner_directory.create_index("partner_type")
    await db.partner_directory.create_index("active")
    await db.auth_events.create_index("type")
    await db.auth_events.create_index("created_at")
    await db.broken_links.create_index("status")
    await db.subscriptions.create_index("user_id")
    await db.subscriptions.create_index("status")
    await db.error_events.create_index("created_at")
    await db.analytics_events.create_index("event")
    await db.analytics_events.create_index("created_at")
    await db.analytics_events.create_index("user_id")
    logger.info("MongoDB indexes created")

    # Seed admin
    admin_email = os.environ.get("ADMIN_EMAIL", "admin@veteranpassage.org")
    admin_password = os.environ.get("ADMIN_PASSWORD", "VetPass2026!")

    existing = await db.users.find_one({"email": admin_email})
    if existing is None:
        await db.users.insert_one({
            "email": admin_email,
            "password_hash": hash_password(admin_password),
            "full_name": "Admin",
            "role": "admin",
            "branch": None,
            "discharge": None,
            "location": None,
            "saved_resources": [],
            "created_at": datetime.now(timezone.utc).isoformat()
        })
        logger.info(f"Admin user seeded: {admin_email}")
    elif not verify_password(admin_password, existing["password_hash"]):
        await db.users.update_one(
            {"email": admin_email},
            {"$set": {"password_hash": hash_password(admin_password)}}
        )
        logger.info("Admin password updated")

    logger.info("Veteran Passage API v2.0 started — RBAC enabled")


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
