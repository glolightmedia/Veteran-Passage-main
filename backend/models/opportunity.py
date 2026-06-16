from datetime import datetime, timezone
from typing import List, Optional

from pydantic import BaseModel, Field


CATEGORIES = "^(benefits|careers|business|education|housing|wealth|second_chance)$"
OPPORTUNITY_TYPES = "^(grant|training|employer|certification|resource|program|event)$"


class Opportunity(BaseModel):
    id: str = Field(..., min_length=1, max_length=120)
    title: str = Field(..., min_length=1, max_length=200)
    description: str = Field(..., min_length=1, max_length=2000)
    category: str = Field(..., pattern=CATEGORIES)
    state: Optional[str] = None
    eligibility_tags: List[str] = []
    source_url: str
    organization: str
    opportunity_type: str = Field(..., pattern=OPPORTUNITY_TYPES)
    is_featured: bool = False
    is_active: bool = True
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    updated_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())


class OpportunitySaveRequest(BaseModel):
    opportunity_id: str = Field(..., min_length=1, max_length=120)


class OpportunityStatusRequest(OpportunitySaveRequest):
    status: str = Field(..., pattern="^(saved|applied|completed|dismissed)$")
