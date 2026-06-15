from datetime import datetime, timezone
import logging

logger = logging.getLogger(__name__)

SENSITIVE_KEYS = {
    "password", "new_password", "password_hash", "token", "bootstrap_token",
    "x-bootstrap-token", "authorization", "access_token", "refresh_token",
}


def _redact(value):
    if isinstance(value, dict):
        return {
            key: "[redacted]" if key.lower() in SENSITIVE_KEYS else _redact(item)
            for key, item in value.items()
        }
    if isinstance(value, list):
        return [_redact(item) for item in value]
    return value


async def log_audit_event(
    db,
    request=None,
    action="security_event",
    actor_id=None,
    target_id=None,
    metadata=None,
    success=True,
):
    if db is None:
        return

    ip = request.client.host if request and request.client else None
    user_agent = request.headers.get("user-agent") if request else None
    doc = {
        "user_id": actor_id,
        "actor_id": actor_id,
        "target_id": target_id,
        "action": action,
        "success": success,
        "ip": ip,
        "user_agent": user_agent,
        "metadata": _redact(metadata or {}),
        "created_at": datetime.now(timezone.utc).isoformat(),
    }

    try:
        await db.activity_logs.insert_one(doc)
    except Exception as exc:
        logger.warning("Audit event write failed for %s: %s", action, exc)
