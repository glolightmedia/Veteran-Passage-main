from fastapi import APIRouter, HTTPException, Request, Response
from datetime import datetime, timezone
from bson import ObjectId
import logging

from models.auth import UserRegister, UserLogin, UserUpdate, ForgotPasswordRequest, ResetPasswordRequest
from utils.auth import (
    hash_password, verify_password,
    create_access_token, create_refresh_token,
    get_current_user, get_jwt_secret, generate_reset_token,
    JWT_ALGORITHM
)
import jwt

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/auth", tags=["auth"])

# Will be set from server.py
db = None


def set_db(database):
    global db
    db = database


def set_auth_cookies(response: Response, access_token: str, refresh_token: str):
    response.set_cookie(
        key="access_token", value=access_token,
        httponly=True, secure=True, samesite="none",
        max_age=3600, path="/"
    )
    response.set_cookie(
        key="refresh_token", value=refresh_token,
        httponly=True, secure=True, samesite="none",
        max_age=604800, path="/"
    )


def sanitize_user(user: dict) -> dict:
    user["id"] = str(user.pop("_id"))
    user.pop("password_hash", None)
    return user


async def check_brute_force(identifier: str):
    record = await db.login_attempts.find_one({"identifier": identifier})
    if record and record.get("attempts", 0) >= 5:
        lockout_until = record.get("lockout_until")
        if lockout_until and datetime.now(timezone.utc) < lockout_until:
            raise HTTPException(
                status_code=429,
                detail="Too many failed login attempts. Please try again in 15 minutes."
            )
        else:
            await db.login_attempts.delete_one({"identifier": identifier})


async def record_failed_attempt(identifier: str):
    record = await db.login_attempts.find_one({"identifier": identifier})
    if record:
        new_attempts = record.get("attempts", 0) + 1
        update = {"$set": {"attempts": new_attempts, "last_attempt": datetime.now(timezone.utc)}}
        if new_attempts >= 5:
            update["$set"]["lockout_until"] = datetime.now(timezone.utc) + __import__("datetime").timedelta(minutes=15)
        await db.login_attempts.update_one({"identifier": identifier}, update)
    else:
        await db.login_attempts.insert_one({
            "identifier": identifier,
            "attempts": 1,
            "last_attempt": datetime.now(timezone.utc)
        })


@router.post("/register")
async def register(data: UserRegister, response: Response):
    email = data.email.lower().strip()
    existing = await db.users.find_one({"email": email})
    if existing:
        raise HTTPException(status_code=400, detail="An account with this email already exists")

    user_doc = {
        "email": email,
        "password_hash": hash_password(data.password),
        "full_name": data.full_name,
        "branch": data.branch,
        "discharge": data.discharge,
        "location": data.location,
        "role": "customer",
        "saved_resources": [],
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    result = await db.users.insert_one(user_doc)
    user_id = str(result.inserted_id)

    access_token = create_access_token(user_id, email)
    refresh_token = create_refresh_token(user_id)
    set_auth_cookies(response, access_token, refresh_token)

    user_doc["id"] = user_id
    user_doc.pop("_id", None)
    user_doc.pop("password_hash", None)
    user_doc["access_token"] = access_token
    user_doc["refresh_token"] = refresh_token
    return user_doc


@router.post("/login")
async def login(data: UserLogin, request: Request, response: Response):
    email = data.email.lower().strip()
    client_ip = request.client.host if request.client else "unknown"
    identifier = f"{client_ip}:{email}"

    await check_brute_force(identifier)

    user = await db.users.find_one({"email": email})

    # Track auth events with specific reasons
    if not user:
        await record_failed_attempt(identifier)
        await db.auth_events.insert_one({
            "type": "login_failed", "email": email, "ip": client_ip,
            "reason": "no_user_found",
            "created_at": datetime.now(timezone.utc).isoformat()
        })
        raise HTTPException(status_code=401, detail="Invalid email or password")

    if user.get("suspended"):
        await db.auth_events.insert_one({
            "type": "login_failed", "email": email, "ip": client_ip,
            "reason": "account_suspended",
            "created_at": datetime.now(timezone.utc).isoformat()
        })
        raise HTTPException(status_code=401, detail="Account suspended. Contact support.")

    if not verify_password(data.password, user["password_hash"]):
        await record_failed_attempt(identifier)
        await db.auth_events.insert_one({
            "type": "login_failed", "email": email, "ip": client_ip,
            "reason": "wrong_password",
            "created_at": datetime.now(timezone.utc).isoformat()
        })
        raise HTTPException(status_code=401, detail="Invalid email or password")

    await db.login_attempts.delete_many({"identifier": identifier})

    user_id = str(user["_id"])
    access_token = create_access_token(user_id, email)
    refresh_token = create_refresh_token(user_id)
    set_auth_cookies(response, access_token, refresh_token)

    user_data = sanitize_user(user)
    user_data["access_token"] = access_token
    user_data["refresh_token"] = refresh_token
    return user_data


@router.post("/logout")
async def logout(response: Response):
    response.delete_cookie("access_token", path="/")
    response.delete_cookie("refresh_token", path="/")
    return {"message": "Logged out successfully"}


@router.get("/me")
async def get_me(request: Request):
    user = await get_current_user(request, db)
    return user


@router.post("/refresh")
async def refresh_token(request: Request, response: Response):
    token = request.cookies.get("refresh_token")
    if not token:
        raise HTTPException(status_code=401, detail="No refresh token")
    try:
        payload = jwt.decode(token, get_jwt_secret(), algorithms=[JWT_ALGORITHM])
        if payload.get("type") != "refresh":
            raise HTTPException(status_code=401, detail="Invalid token type")

        user = await db.users.find_one({"_id": ObjectId(payload["sub"])})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")

        user_id = str(user["_id"])
        new_access = create_access_token(user_id, user["email"])
        response.set_cookie(
            key="access_token", value=new_access,
            httponly=True, secure=False, samesite="lax",
            max_age=3600, path="/"
        )
        return {"message": "Token refreshed"}
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Refresh token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid refresh token")


@router.put("/profile")
async def update_profile(data: UserUpdate, request: Request):
    user = await get_current_user(request, db)
    update_data = {k: v for k, v in data.model_dump().items() if v is not None}
    if not update_data:
        raise HTTPException(status_code=400, detail="No fields to update")

    # Note: get_current_user converts _id to id
    user_id = user["id"]
    await db.users.update_one(
        {"_id": ObjectId(user_id)},
        {"$set": update_data}
    )
    updated = await db.users.find_one({"_id": ObjectId(user_id)})
    return sanitize_user(updated)


@router.post("/forgot-password")
async def forgot_password(data: ForgotPasswordRequest):
    email = data.email.lower().strip()
    user = await db.users.find_one({"email": email})
    if not user:
        return {"message": "If an account exists with that email, a reset link has been sent."}

    token = generate_reset_token()
    await db.password_reset_tokens.insert_one({
        "token": token,
        "user_id": str(user["_id"]),
        "email": email,
        "expires_at": datetime.now(timezone.utc) + __import__("datetime").timedelta(hours=1),
        "used": False
    })
    logger.info(f"Password reset link: /reset-password?token={token}")
    return {"message": "If an account exists with that email, a reset link has been sent."}


@router.post("/reset-password")
async def reset_password(data: ResetPasswordRequest):
    record = await db.password_reset_tokens.find_one({
        "token": data.token,
        "used": False
    })
    if not record:
        raise HTTPException(status_code=400, detail="Invalid or expired reset token")

    if datetime.now(timezone.utc) > record["expires_at"]:
        raise HTTPException(status_code=400, detail="Reset token has expired")

    await db.users.update_one(
        {"_id": ObjectId(record["user_id"])},
        {"$set": {"password_hash": hash_password(data.new_password)}}
    )
    await db.password_reset_tokens.update_one(
        {"_id": record["_id"]},
        {"$set": {"used": True}}
    )
    return {"message": "Password reset successfully"}
