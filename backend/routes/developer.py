from fastapi import APIRouter, HTTPException, Request, Query
from datetime import datetime, timezone
from bson import ObjectId
import secrets
import hashlib
import logging

from utils.rbac import require_role
from utils.auth import get_current_user
from models.roles import ApiKeyCreate

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/developer", tags=["developer"])
db = None


def set_db(database):
    global db
    db = database


def generate_api_key():
    raw = secrets.token_urlsafe(32)
    return f"vp_{raw}"


def hash_api_key(key: str) -> str:
    return hashlib.sha256(key.encode()).hexdigest()


@router.post("/api-keys")
async def create_api_key(request: Request, data: ApiKeyCreate):
    user = await require_role(request, db, ["developer", "admin"])

    count = await db.api_keys.count_documents({"user_id": user["id"], "revoked": False})
    if count >= 5:
        raise HTTPException(status_code=400, detail="Maximum 5 active API keys allowed")

    raw_key = generate_api_key()
    key_hash = hash_api_key(raw_key)
    prefix = raw_key[:10]

    doc = {
        "user_id": user["id"],
        "name": data.name,
        "description": data.description,
        "key_hash": key_hash,
        "key_prefix": prefix,
        "revoked": False,
        "last_used": None,
        "request_count": 0,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    result = await db.api_keys.insert_one(doc)

    return {
        "id": str(result.inserted_id),
        "name": data.name,
        "api_key": raw_key,
        "key_prefix": prefix,
        "message": "Store this key securely. It won't be shown again."
    }


@router.get("/api-keys")
async def list_api_keys(request: Request):
    user = await require_role(request, db, ["developer", "admin"])
    cursor = db.api_keys.find({"user_id": user["id"]}).sort("created_at", -1)
    keys = []
    async for k in cursor:
        keys.append({
            "id": str(k["_id"]),
            "name": k["name"],
            "description": k.get("description"),
            "key_prefix": k["key_prefix"],
            "revoked": k["revoked"],
            "last_used": k.get("last_used"),
            "request_count": k.get("request_count", 0),
            "created_at": k["created_at"]
        })
    return {"api_keys": keys}


@router.delete("/api-keys/{key_id}")
async def revoke_api_key(request: Request, key_id: str):
    user = await require_role(request, db, ["developer", "admin"])
    key = await db.api_keys.find_one({"_id": ObjectId(key_id)})
    if not key:
        raise HTTPException(status_code=404, detail="API key not found")
    if key["user_id"] != user["id"] and user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Not your API key")

    await db.api_keys.update_one(
        {"_id": ObjectId(key_id)},
        {"$set": {"revoked": True, "revoked_at": datetime.now(timezone.utc).isoformat()}}
    )
    return {"message": "API key revoked"}


@router.get("/public/resources")
async def public_resources(request: Request, category: str = Query(None), limit: int = Query(20, ge=1, le=50)):
    api_key_header = request.headers.get("X-API-Key")
    if not api_key_header:
        raise HTTPException(status_code=401, detail="API key required. Pass X-API-Key header.")

    key_hash = hash_api_key(api_key_header)
    key_doc = await db.api_keys.find_one({"key_hash": key_hash, "revoked": False})
    if not key_doc:
        raise HTTPException(status_code=401, detail="Invalid or revoked API key")

    await db.api_keys.update_one(
        {"_id": key_doc["_id"]},
        {"$set": {"last_used": datetime.now(timezone.utc).isoformat()}, "$inc": {"request_count": 1}}
    )

    query = {"status": "approved"}
    if category:
        query["categories"] = category

    cursor = db.resources.find(query, {"_id": 0, "provider_id": 0}).limit(limit)
    resources = await cursor.to_list(limit)
    return {"resources": resources, "count": len(resources)}


@router.get("/public/stats")
async def public_stats(request: Request):
    api_key_header = request.headers.get("X-API-Key")
    if not api_key_header:
        raise HTTPException(status_code=401, detail="API key required")

    key_hash = hash_api_key(api_key_header)
    key_doc = await db.api_keys.find_one({"key_hash": key_hash, "revoked": False})
    if not key_doc:
        raise HTTPException(status_code=401, detail="Invalid or revoked API key")

    await db.api_keys.update_one(
        {"_id": key_doc["_id"]},
        {"$set": {"last_used": datetime.now(timezone.utc).isoformat()}, "$inc": {"request_count": 1}}
    )

    total_resources = await db.resources.count_documents({"status": "approved"})
    total_users = await db.users.count_documents({})
    categories = await db.resources.distinct("categories", {"status": "approved"})

    return {
        "total_resources": total_resources,
        "total_users": total_users,
        "categories": categories
    }
