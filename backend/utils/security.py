import os
import re
import time
from collections import defaultdict, deque

from fastapi import HTTPException, Request


_rate_buckets = defaultdict(deque)


PLACEHOLDER_SECRETS = {
    "",
    "change-me",
    "change-me-for-local-development",
    "local-dev-secret-change-in-production",
    "replace-with-a-long-random-secret",
}


def get_environment() -> str:
    return os.environ.get("ENVIRONMENT", "development").strip().lower()


def is_production() -> bool:
    return get_environment() == "production"


def get_client_ip(request: Request) -> str:
    forwarded_for = request.headers.get("X-Forwarded-For", "")
    if forwarded_for:
        return forwarded_for.split(",")[0].strip()
    return request.client.host if request.client else "unknown"


def is_strong_secret(value: str) -> bool:
    return bool(value) and len(value) >= 32 and value not in PLACEHOLDER_SECRETS


def is_strong_password(value: str) -> bool:
    if not value or len(value) < 12:
        return False
    return all([
        re.search(r"[a-z]", value),
        re.search(r"[A-Z]", value),
        re.search(r"\d", value),
        re.search(r"[^A-Za-z0-9]", value),
    ])


def get_superadmin_email() -> str:
    return os.environ.get("SUPERADMIN_EMAIL", "glolightmedia@gmail.com").strip().lower()


def validate_security_environment(logger=None):
    if not is_production():
        return

    if not is_strong_secret(os.environ.get("JWT_SECRET", "")):
        raise RuntimeError("JWT_SECRET must be at least 32 characters and non-placeholder in production")

    if os.environ.get("ENABLE_DEV_ADMIN_BOOTSTRAP", "").strip().lower() == "true":
        raise RuntimeError("ENABLE_DEV_ADMIN_BOOTSTRAP must be false in production")

    if not os.environ.get("FRONTEND_URL", "").strip():
        raise RuntimeError("FRONTEND_URL is required in production")

    admin_password = os.environ.get("ADMIN_PASSWORD", "")
    if admin_password and not is_strong_password(admin_password):
        raise RuntimeError("ADMIN_PASSWORD must be strong when set in production")

    superadmin_password = os.environ.get("SUPERADMIN_PASSWORD", "")
    if superadmin_password and not is_strong_password(superadmin_password):
        raise RuntimeError("SUPERADMIN_PASSWORD must be strong when set in production")

    if logger:
        logger.info("Production security environment validated")


async def rate_limit(request: Request, scope: str, limit: int, window_seconds: int):
    now = time.monotonic()
    client_ip = get_client_ip(request)
    key = f"{scope}:{client_ip}"
    bucket = _rate_buckets[key]

    while bucket and now - bucket[0] > window_seconds:
        bucket.popleft()

    if len(bucket) >= limit:
        raise HTTPException(status_code=429, detail="Too many requests. Please try again later.")

    bucket.append(now)
