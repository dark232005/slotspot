from datetime import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.core.deps import (
    get_db,
    get_current_user,
    get_current_manager,
    get_current_admin,
    verify_tenant_access
)
from app.models.booking import Booking, BookingStatus
from app.models.user import User, UserRole
from app.models.resource import ResourceManagerAssignment, Resource
from app.schemas.booking import (
    BookingCreate,
    BookingCancel,
    BookingOut,
    BookingWithQR
)
from app.services.booking_engine import (
    create_booking_transactional,
    cancel_booking
)
from app.services.qr_service import generate_qr_data_url
from app.services.no_show_worker import release_expired_no_shows

router = APIRouter()


def format_booking_out(b: Booking) -> BookingOut:
    return BookingOut(
        id=b.id,
        college_id=b.college_id,
        resource_id=b.resource_id,
        resource_name=b.resource.name if b.resource else None,
        resource_type=b.resource.type if b.resource else None,
        resource_location=b.resource.location if b.resource else None,
        student_id=b.student_id,
        student_name=b.student.full_name if b.student else None,
        student_email=b.student.email if b.student else None,
        start_time=b.start_time,
        end_time=b.end_time,
        status=b.status,
        qr_lookup_code=b.qr_lookup_code,
        check_in_time=b.check_in_time,
        cancellation_time=b.cancellation_time,
        cancellation_reason=b.cancellation_reason,
        no_show_time=b.no_show_time,
        equipment_issued_at=b.equipment_issued_at,
        equipment_returned_at=b.equipment_returned_at,
        notes=b.notes,
        created_at=b.created_at
    )


@router.post("", response_model=BookingWithQR, status_code=status.HTTP_201_CREATED)
def create_booking(
    booking_data: BookingCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    booking, raw_token, qr_data_url = create_booking_transactional(
        db=db,
        resource_id=booking_data.resource_id,
        user=current_user,
        start_time=booking_data.start_time,
        end_time=booking_data.end_time,
        notes=booking_data.notes
    )

    out = format_booking_out(booking)
    return BookingWithQR(
        **out.model_dump(),
        qr_token=raw_token,
        qr_code_image_base64=qr_data_url
    )


@router.get("", response_model=List[BookingOut])
def list_bookings(
    status: Optional[str] = None,
    resource_id: Optional[str] = None,
    scope: Optional[str] = None,  # "upcoming", "past", "today"
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    query = db.query(Booking).filter(Booking.college_id == current_user.college_id)

    # Role scoping
    if current_user.role == UserRole.STUDENT.value:
        query = query.filter(Booking.student_id == current_user.id)
    elif current_user.role == UserRole.RESOURCE_MANAGER.value:
        # Assigned resources for this manager
        assigned_res_ids = [
            a.resource_id for a in db.query(ResourceManagerAssignment).filter(
                ResourceManagerAssignment.user_id == current_user.id
            ).all()
        ]
        query = query.filter(Booking.resource_id.in_(assigned_res_ids))
    # Admin sees all bookings in their college

    if status:
        query = query.filter(Booking.status == status)
    if resource_id:
        query = query.filter(Booking.resource_id == resource_id)

    now_utc = datetime.utcnow()
    if scope == "upcoming":
        query = query.filter(Booking.start_time >= now_utc, Booking.status == BookingStatus.CONFIRMED.value)
    elif scope == "past":
        query = query.filter(Booking.end_time < now_utc)
    elif scope == "today":
        today_start = datetime(now_utc.year, now_utc.month, now_utc.day, 0, 0, 0)
        today_end = datetime(now_utc.year, now_utc.month, now_utc.day, 23, 59, 59)
        query = query.filter(Booking.start_time >= today_start, Booking.start_time <= today_end)

    bookings = query.order_by(Booking.start_time.desc()).all()
    return [format_booking_out(b) for b in bookings]


@router.get("/{booking_id}", response_model=BookingWithQR)
def get_booking(
    booking_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    booking = db.query(Booking).filter(
        Booking.id == booking_id,
        Booking.college_id == current_user.college_id
    ).first()

    if not booking:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Booking not found.")

    # Permissions
    if current_user.role == UserRole.STUDENT.value and booking.student_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied.")

    out = format_booking_out(booking)
    
    # Generate QR with lookup code as token representation if raw token is not stored
    qr_data_url = generate_qr_data_url(booking.id, booking.qr_lookup_code, booking.qr_lookup_code)

    return BookingWithQR(
        **out.model_dump(),
        qr_token=booking.qr_lookup_code,
        qr_code_image_base64=qr_data_url
    )


@router.post("/{booking_id}/cancel", response_model=BookingOut)
def cancel_booking_endpoint(
    booking_id: str,
    cancel_data: BookingCancel,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    booking = cancel_booking(
        db=db,
        booking_id=booking_id,
        user=current_user,
        reason=cancel_data.reason
    )
    return format_booking_out(booking)


@router.post("/manual-release-test")
def trigger_manual_no_show_release(
    grace_minutes: Optional[int] = Query(None, description="Optional override grace period in minutes for immediate test"),
    current_user: User = Depends(get_current_manager),
    db: Session = Depends(get_db)
):
    released = release_expired_no_shows(db, force_grace_minutes=grace_minutes)
    return {
        "message": f"Processed no-show release scan.",
        "released_count": len(released),
        "released_booking_ids": [b.id for b in released]
    }
