from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, Field
from app.models.resource import ResourceType, ResourceStatus


class ResourceBase(BaseModel):
    name: str = Field(min_length=2, max_length=255)
    type: ResourceType
    description: str = Field(default="", max_length=1000)
    location: str = Field(default="", max_length=255)
    capacity: Optional[int] = Field(default=None, ge=1)
    operating_start_time: str = Field(default="08:00")
    operating_end_time: str = Field(default="20:00")
    max_booking_duration_minutes: int = Field(default=180, ge=15, le=720)
    slot_granularity_minutes: int = Field(default=30, ge=15, le=120)
    status: ResourceStatus = ResourceStatus.ACTIVE
    image_url: Optional[str] = None


class ResourceCreate(ResourceBase):
    pass


class ResourceUpdate(BaseModel):
    name: Optional[str] = None
    type: Optional[ResourceType] = None
    description: Optional[str] = None
    location: Optional[str] = None
    capacity: Optional[int] = None
    operating_start_time: Optional[str] = None
    operating_end_time: Optional[str] = None
    max_booking_duration_minutes: Optional[int] = None
    slot_granularity_minutes: Optional[int] = None
    status: Optional[ResourceStatus] = None
    image_url: Optional[str] = None


class ResourceManagerAssign(BaseModel):
    user_id: str


class ManagerAssignmentOut(BaseModel):
    id: str
    user_id: str
    user_name: Optional[str] = None
    user_email: Optional[str] = None

    class Config:
        from_attributes = True


class ResourceOut(ResourceBase):
    id: str
    college_id: str
    created_at: datetime
    active_maintenance: bool = False

    class Config:
        from_attributes = True


class SlotAvailabilityOut(BaseModel):
    start_time: datetime
    end_time: datetime
    is_available: bool
    status_label: str  # "AVAILABLE", "RESERVED", "MAINTENANCE", "CLOSED"
