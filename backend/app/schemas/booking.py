from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field
from app.models.booking import BookingStatus


class BookingCreate(BaseModel):
    resource_id: str
    start_time: datetime
    end_time: datetime
    notes: Optional[str] = Field(default=None, max_length=500)


class BookingCancel(BaseModel):
    reason: Optional[str] = Field(default="Cancelled by student", max_length=500)


class BookingOut(BaseModel):
    id: str
    college_id: str
    resource_id: str
    resource_name: Optional[str] = None
    resource_type: Optional[str] = None
    resource_location: Optional[str] = None
    student_id: str
    student_name: Optional[str] = None
    student_email: Optional[str] = None
    start_time: datetime
    end_time: datetime
    status: str
    qr_lookup_code: str
    check_in_time: Optional[datetime] = None
    cancellation_time: Optional[datetime] = None
    cancellation_reason: Optional[str] = None
    no_show_time: Optional[datetime] = None
    equipment_issued_at: Optional[datetime] = None
    equipment_returned_at: Optional[datetime] = None
    notes: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


class BookingWithQR(BookingOut):
    qr_token: Optional[str] = None
    qr_code_image_base64: Optional[str] = None


class CheckInRequest(BaseModel):
    qr_token: Optional[str] = None
    lookup_code: Optional[str] = None


class CheckInResponse(BaseModel):
    success: bool
    message: str
    booking: Optional[BookingOut] = None


class EquipmentStatusUpdate(BaseModel):
    action: str  # "ISSUE" or "RETURN"
    notes: Optional[str] = None
