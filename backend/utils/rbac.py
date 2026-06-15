from functools import wraps
from fastapi import HTTPException, Request
from utils.auth import get_current_user

ROLES = ["superadmin", "admin", "moderator", "partner", "support_agent", "developer", "customer"]

PARTNER_SUBTYPES = ["employer", "legal_aid", "school", "grant_provider", "housing", "healthcare", "nonprofit"]

ROLE_PERMISSIONS = {
    "superadmin": {
        "manage_users", "create_users", "delete_users", "manage_roles", "manage_resources",
        "approve_resources", "view_analytics", "manage_promotions", "manage_moderation",
        "view_all_activity", "manage_api_keys", "manage_settings", "manage_billing",
        "manage_partners", "create_partners", "impersonate_users", "manage_announcements",
        "manage_feature_flags", "export_data", "view_audit_log", "view_errors",
        "manage_pricing", "view_leads", "manage_leads"
    },
    "admin": {
        "manage_users", "create_users", "manage_roles", "manage_resources", "approve_resources",
        "view_analytics", "manage_promotions", "manage_moderation", "view_all_activity",
        "manage_announcements", "view_leads", "manage_leads", "view_audit_log", "view_errors",
        "manage_partners", "reset_passwords"
    },
    "moderator": {
        "view_users", "manage_moderation", "view_all_activity", "flag_content", "review_reports"
    },
    "partner": {
        "manage_own_resources", "view_own_analytics", "manage_own_promotions",
        "create_checkout", "manage_own_profile", "view_own_leads",
        "post_jobs", "edit_own_jobs", "view_own_billing"
    },
    "support_agent": {
        "view_users", "view_support_logs", "resend_invites", "reset_passwords",
        "assist_partner_onboarding", "view_own_activity"
    },
    "developer": {
        "manage_own_api_keys", "access_public_api", "view_api_docs",
        "view_technical_logs", "manage_integrations"
    },
    "customer": {
        "browse_resources", "use_navigator", "manage_own_profile",
        "save_resources", "view_own_activity", "apply_jobs", "request_help",
        "use_forum", "use_mentorship", "use_barter"
    }
}

BILLING_PLANS = {
    "standard": {
        "id": "standard",
        "name": "Standard",
        "price": 39,
        "job_limit": 1,
        "duration_days": 30,
        "features": ["1 active job post", "30-day listing", "Standard visibility"],
        "stripe_mode": "payment"
    },
    "growth": {
        "id": "growth",
        "name": "Growth",
        "price": 99,
        "job_limit": 5,
        "duration_days": 30,
        "features": ["5 active job posts", "Badge support", "Basic analytics"],
        "stripe_mode": "payment"
    },
    "featured": {
        "id": "featured",
        "name": "Featured",
        "price": 199,
        "job_limit": 10,
        "duration_days": 30,
        "features": ["10 active jobs", "Featured placement", "Verified badge", "Full analytics"],
        "stripe_mode": "payment"
    }
}


def has_permission(role: str, permission: str) -> bool:
    return permission in ROLE_PERMISSIONS.get(role, set())


async def require_role(request: Request, db, roles: list) -> dict:
    user = await get_current_user(request, db)
    user_role = user.get("role", "customer")
    # superadmin can access everything
    if user_role == "superadmin":
        return user
    if user_role not in roles:
        raise HTTPException(status_code=403, detail=f"Insufficient permissions. Required: {', '.join(roles)}")
    return user


async def require_superadmin(request: Request, db) -> dict:
    user = await get_current_user(request, db)
    if user.get("role") != "superadmin":
        raise HTTPException(status_code=403, detail="SuperAdmin access required")
    return user


async def require_permission(request: Request, db, permission: str) -> dict:
    user = await get_current_user(request, db)
    user_role = user.get("role", "customer")
    if user_role == "superadmin":
        return user
    if not has_permission(user_role, permission):
        raise HTTPException(status_code=403, detail=f"Missing permission: {permission}")
    return user
