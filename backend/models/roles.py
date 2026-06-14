from pydantic import BaseModel, Field, EmailStr
from typing import Optional, List, Dict
from datetime import datetime


# Admin models
class UpdateUserRole(BaseModel):
    role: str = Field(..., pattern="^(admin|moderator|provider|developer|customer)$")


class SuspendUser(BaseModel):
    suspended: bool
    reason: Optional[str] = None


# Provider models
class ResourceCreate(BaseModel):
    name: str = Field(min_length=1, max_length=200)
    description: str = Field(min_length=10, max_length=2000)
    categories: List[str]
    eligibility: Optional[str] = None
    url: str
    phone: Optional[str] = None


class ResourceUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    categories: Optional[List[str]] = None
    eligibility: Optional[str] = None
    url: Optional[str] = None
    phone: Optional[str] = None


class PromotionCreate(BaseModel):
    resource_id: str
    plan: str = Field(..., pattern="^(basic|premium|featured)$")


# Developer models
class ApiKeyCreate(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    description: Optional[str] = None


# Interaction models
class ActivityLog(BaseModel):
    action: str
    resource_id: Optional[str] = None
    metadata: Optional[Dict] = None


class ModerationReport(BaseModel):
    target_type: str = Field(..., pattern="^(resource|user|comment)$")
    target_id: str
    reason: str = Field(min_length=5, max_length=500)


class ModerationAction(BaseModel):
    action: str = Field(..., pattern="^(dismiss|warn|remove|suspend)$")
    notes: Optional[str] = None
