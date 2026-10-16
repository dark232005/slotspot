from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field


class MaintenanceCreate(BaseModel):
    resource_id: str
    start_time: datetime
    end_time: datetime
    reason: str = Field(min_length=3, max_length=500)


class MaintenanceOut(BaseModel):
    id: str
    college_id: str
    resource_id: str
    resource_name: Optional[str] = None
    start_time: datetime
    end_time: datetime
    reason: str
    created_by_user_id: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True
