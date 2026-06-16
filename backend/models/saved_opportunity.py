from datetime import datetime, timezone

from pydantic import BaseModel, Field


class SavedOpportunity(BaseModel):
    user_id: str = Field(..., min_length=1)
    opportunity_id: str = Field(..., min_length=1, max_length=120)
    status: str = Field(default="saved", pattern="^(saved|applied|completed|dismissed)$")
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    updated_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
