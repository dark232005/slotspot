from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field


class CollegeSettingsBase(BaseModel):
    no_show_grace_minutes: int = Field(default=10, ge=1, le=120)
    operating_start_time: str = Field(default="08:00")
    operating_end_time: str = Field(default="20:00")
    max_booking_duration_minutes: int = Field(default=180, ge=15, le=720)
    max_advance_booking_days: int = Field(default=7, ge=1, le=30)


class CollegeSettingsUpdate(BaseModel):
    no_show_grace_minutes: Optional[int] = Field(default=None, ge=1, le=120)
    operating_start_time: Optional[str] = None
    operating_end_time: Optional[str] = None
    max_booking_duration_minutes: Optional[int] = Field(default=None, ge=15, le=720)
    max_advance_booking_days: Optional[int] = Field(default=None, ge=1, le=30)


class CollegeSettingsOut(CollegeSettingsBase):
    id: str
    college_id: str
    updated_at: datetime

    class Config:
        from_attributes = True


class CollegeOut(BaseModel):
    id: str
    name: str
    slug: str
    timezone: str
    created_at: datetime
    settings: Optional[CollegeSettingsOut] = None

    class Config:
        from_attributes = True
