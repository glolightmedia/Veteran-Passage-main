from pydantic import BaseModel, Field


class RoadmapCreate(BaseModel):
    branch: str = Field(..., min_length=1, max_length=80)
    state: str = Field(..., min_length=1, max_length=80)
    employment_status: str = Field(..., min_length=1, max_length=120)
    disability_status: str = Field(..., min_length=1, max_length=120)
    primary_interest: str = Field(..., min_length=1, max_length=80)


class RoadmapStepUpdate(BaseModel):
    step_id: str = Field(..., min_length=1, max_length=120)
    completed: bool = True
