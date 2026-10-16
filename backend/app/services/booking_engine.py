from datetime import datetime, time, timedelta
from typing import List, Optional, Tuple
from fastapi import HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import or_, and_

from app.models.college import CollegeSettings
from app.models.resource import Resource, ResourceStatus, ResourceType
from app.models.booking import Booking, BookingStatus
from app.models.maintenance import ResourceMaintenanceBlock
from app.models.user import User, UserRole
from app.core.security import generate_secure_qr_token, hash_qr_token, generate_lookup_code
from app.services.qr_service import generate_qr_data_url
from app.services.audit_service import log_audit_event
from app.services.notification_service import create_notification


def parse_time_str(time_str: str) -> time:
    parts = [int(p) for p in time_str.split(":")]
    return time(hour=parts[0], minute=parts[1])


def validate_booking_request(
    db: Session,
    resource: Resource,
    user: User,
    start_time: datetime,
    end_time: datetime,
    allow_past_for_testing: bool = False
):
    now_utc = datetime.utcnow()

    # 1. Start before end
    if start_time >= end_time:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Booking start time must be strictly before end time."
        )

    # 2. Prevent past bookings (allow 2-minute clock skew tolerance)
    if not allow_past_for_testing and start_time < (now_utc - timedelta(minutes=2)):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot book a time slot in the past."
        )

    # 3. Same-day booking check
    if start_time.date() != end_time.date():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Reservations cannot span across multiple calendar days."
        )

    # 4. Check advance booking limits from college settings
    settings = db.query(CollegeSettings).filter(CollegeSettings.college_id == user.college_id).first()
    max_advance_days = settings.max_advance_booking_days if settings else 7
    if start_time.date() > (now_utc.date() + timedelta(days=max_advance_days)):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Bookings can only be made up to {max_advance_days} days in advance."
        )

    # 5. Check resource status
    if resource.status != ResourceStatus.ACTIVE.value:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Resource '{resource.name}' is currently {resource.status} and cannot be reserved."
        )

    # 6. Check duration limits
    duration_minutes = (end_time - start_time).total_seconds() / 60.0
    if duration_minutes < 15:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Minimum booking duration is 15 minutes."
        )
    if duration_minutes > resource.max_booking_duration_minutes:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Duration exceeds maximum allowed limit of {resource.max_booking_duration_minutes} minutes."
        )

    # 7. Check operating hours
    res_start = parse_time_str(resource.operating_start_time)
    res_end = parse_time_str(resource.operating_end_time)
    req_start = start_time.time()
    req_end = end_time.time()

    if req_start < res_start or req_end > res_end:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Requested time falls outside resource operating hours ({resource.operating_start_time} - {resource.operating_end_time})."
        )

    # 8. Check maintenance blocks
    overlap_maint = db.query(ResourceMaintenanceBlock).filter(
        ResourceMaintenanceBlock.resource_id == resource.id,
        ResourceMaintenanceBlock.start_time < end_time,
        ResourceMaintenanceBlock.end_time > start_time
    ).first()

    if overlap_maint:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Resource is scheduled for maintenance during this time: {overlap_maint.reason}"
        )


import threading

_resource_concurrency_lock = threading.Lock()


def create_booking_transactional(
    db: Session,
    resource_id: str,
    user: User,
    start_time: datetime,
    end_time: datetime,
    notes: Optional[str] = None,
    allow_past_for_testing: bool = False
) -> Tuple[Booking, str, str]:
    """
    Creates a new booking with database-enforced row lock concurrency control.
    Returns (Booking, raw_qr_token, qr_image_base64).
    """
    with _resource_concurrency_lock:
        try:
            resource = db.query(Resource).filter(
                Resource.id == resource_id,
                Resource.college_id == user.college_id
            ).with_for_update().first()
        except Exception:
            resource = db.query(Resource).filter(
                Resource.id == resource_id,
                Resource.college_id == user.college_id
            ).first()

        if not resource:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Resource not found in your college workspace."
            )


        # 2. Validate request parameters
        validate_booking_request(db, resource, user, start_time, end_time, allow_past_for_testing)

        # 3. Check for overlapping active bookings (CONFIRMED or CHECKED_IN)
        conflicting_booking = db.query(Booking).filter(
            Booking.resource_id == resource_id,
            Booking.status.in_([BookingStatus.CONFIRMED.value, BookingStatus.CHECKED_IN.value]),
            Booking.start_time < end_time,
            Booking.end_time > start_time
        ).first()

        if conflicting_booking:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Double-booking conflict: This resource is already reserved from {conflicting_booking.start_time.strftime('%H:%M')} to {conflicting_booking.end_time.strftime('%H:%M')}."
            )

        # 4. Generate cryptographically secure tokens
        raw_token = generate_secure_qr_token()
        token_hash = hash_qr_token(raw_token)
        lookup_code = generate_lookup_code()

        # 5. Insert new booking
        booking = Booking(
            college_id=user.college_id,
            resource_id=resource.id,
            student_id=user.id,
            start_time=start_time,
            end_time=end_time,
            status=BookingStatus.CONFIRMED.value,
            qr_token_hash=token_hash,
            qr_lookup_code=lookup_code,
            notes=notes
        )
        db.add(booking)
        db.flush()

        # 6. Generate QR code
        qr_data_url = generate_qr_data_url(booking.id, raw_token, lookup_code)

        # 7. Audit log & Notification
        log_audit_event(
            db=db,
            college_id=user.college_id,
            user_id=user.id,
            action="BOOKING_CREATED",
            target_type="BOOKING",
            target_id=booking.id,
            details={
                "resource_id": resource.id,
                "resource_name": resource.name,
                "start_time": start_time.isoformat(),
                "end_time": end_time.isoformat(),
                "lookup_code": lookup_code
            }
        )

        create_notification(
            db=db,
            college_id=user.college_id,
            user_id=user.id,
            title="Reservation Confirmed",
            message=f"Your booking for {resource.name} on {start_time.strftime('%b %d, %Y from %H:%M')} to {end_time.strftime('%H:%M')} has been confirmed. Code: {lookup_code}.",
            notification_type="CONFIRMATION"
        )

        db.commit()
        db.refresh(booking)
        return booking, raw_token, qr_data_url



def cancel_booking(
    db: Session,
    booking_id: str,
    user: User,
    reason: Optional[str] = "Cancelled by user"
) -> Booking:
    booking = db.query(Booking).filter(
        Booking.id == booking_id,
        Booking.college_id == user.college_id
    ).first()

    if not booking:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Booking not found.")

    # Permissions: Student can only cancel their own; Manager/Admin can cancel any in their college
    if user.role == UserRole.STUDENT.value and booking.student_id != user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You cannot cancel another student's booking.")

    # State validation: Only CONFIRMED bookings can be cancelled
    if booking.status != BookingStatus.CONFIRMED.value:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot cancel booking with current status '{booking.status}'."
        )

    booking.status = BookingStatus.CANCELLED.value
    booking.cancellation_time = datetime.utcnow()
    booking.cancellation_reason = reason

    log_audit_event(
        db=db,
        college_id=user.college_id,
        user_id=user.id,
        action="BOOKING_CANCELLED",
        target_type="BOOKING",
        target_id=booking.id,
        details={"reason": reason, "cancelled_by_role": user.role}
    )

    create_notification(
        db=db,
        college_id=user.college_id,
        user_id=booking.student_id,
        title="Reservation Cancelled",
        message=f"Your reservation for {booking.resource.name} has been cancelled. Reason: {reason}",
        notification_type="CANCELLATION"
    )

    db.commit()
    db.refresh(booking)
    return booking


def check_in_booking(
    db: Session,
    staff_user: User,
    qr_token: Optional[str] = None,
    lookup_code: Optional[str] = None,
    override_window: bool = False
) -> Booking:
    """
    Validates QR token or lookup code and performs staff check-in.
    Ensures authorized manager/admin role and correct tenant.
    """
    if not qr_token and not lookup_code:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Either QR token or lookup code must be provided.")

    booking = None
    if qr_token:
        # Check by token hash
        token_hash = hash_qr_token(qr_token)
        booking = db.query(Booking).filter(
            Booking.qr_token_hash == token_hash,
            Booking.college_id == staff_user.college_id
        ).first()

    if not booking and lookup_code:
        cleaned_code = lookup_code.strip().upper()
        booking = db.query(Booking).filter(
            Booking.qr_lookup_code == cleaned_code,
            Booking.college_id == staff_user.college_id
        ).first()

    if not booking:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No valid booking found for the provided QR code or lookup code."
        )

    # Verify staff permissions for this resource
    if staff_user.role == UserRole.RESOURCE_MANAGER.value:
        from app.models.resource import ResourceManagerAssignment
        assignment = db.query(ResourceManagerAssignment).filter(
            ResourceManagerAssignment.user_id == staff_user.id,
            ResourceManagerAssignment.resource_id == booking.resource_id
        ).first()
        if not assignment:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Forbidden: You are not authorized to check in bookings for resource '{booking.resource.name}'."
            )

    # State validation
    if booking.status == BookingStatus.CHECKED_IN.value:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Booking is already checked in at {booking.check_in_time.strftime('%H:%M:%S')}."
        )

    if booking.status != BookingStatus.CONFIRMED.value:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot check in booking with status '{booking.status}'."
        )

    # Window validation
    now_utc = datetime.utcnow()
    settings = db.query(CollegeSettings).filter(CollegeSettings.college_id == staff_user.college_id).first()
    grace_minutes = settings.no_show_grace_minutes if settings else 10

    # Allow check-in from 15 minutes prior to start until (start_time + grace_period)
    checkin_earliest = booking.start_time - timedelta(minutes=15)
    checkin_latest = booking.start_time + timedelta(minutes=grace_minutes)

    if not override_window:
        if now_utc < checkin_earliest:
            minutes_to_wait = int((checkin_earliest - now_utc).total_seconds() / 60)
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Check-in opens 15 minutes before the booking starts (starts in {minutes_to_wait + 15} minutes)."
            )
        if now_utc > checkin_latest:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Check-in grace period expired at {checkin_latest.strftime('%H:%M')}. Booking is eligible for no-show release."
            )

    # Valid check-in transition
    booking.status = BookingStatus.CHECKED_IN.value
    booking.check_in_time = now_utc
    if booking.resource.type == ResourceType.EQUIPMENT.value:
        booking.equipment_issued_at = now_utc

    log_audit_event(
        db=db,
        college_id=staff_user.college_id,
        user_id=staff_user.id,
        action="CHECK_IN_SUCCESS",
        target_type="BOOKING",
        target_id=booking.id,
        details={
            "resource_name": booking.resource.name,
            "student_name": booking.student.full_name,
            "check_in_time": now_utc.isoformat(),
            "checked_in_by": staff_user.full_name
        }
    )

    create_notification(
        db=db,
        college_id=staff_user.college_id,
        user_id=booking.student_id,
        title="Check-In Confirmed",
        message=f"You have been successfully checked in for {booking.resource.name}.",
        notification_type="CONFIRMATION"
    )

    db.commit()
    db.refresh(booking)
    return booking


def update_equipment_issue_return(
    db: Session,
    booking_id: str,
    action: str,  # "ISSUE" or "RETURN"
    staff_user: User,
    notes: Optional[str] = None
) -> Booking:
    booking = db.query(Booking).filter(
        Booking.id == booking_id,
        Booking.college_id == staff_user.college_id
    ).first()

    if not booking:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Booking not found.")

    if booking.resource.type != ResourceType.EQUIPMENT.value:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Issue/Return is only applicable for equipment resources.")

    now_utc = datetime.utcnow()
    if action == "ISSUE":
        if booking.status not in [BookingStatus.CONFIRMED.value, BookingStatus.CHECKED_IN.value]:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Cannot issue equipment for booking with status '{booking.status}'.")
        booking.status = BookingStatus.CHECKED_IN.value
        booking.check_in_time = booking.check_in_time or now_utc
        booking.equipment_issued_at = now_utc
    elif action == "RETURN":
        if booking.status != BookingStatus.CHECKED_IN.value:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Cannot return equipment that was not issued/checked-in.")
        booking.status = BookingStatus.COMPLETED.value
        booking.equipment_returned_at = now_utc
    else:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid action. Allowed: 'ISSUE', 'RETURN'.")

    if notes:
        booking.notes = f"{booking.notes or ''}\n[{action}] {notes}".strip()

    log_audit_event(
        db=db,
        college_id=staff_user.college_id,
        user_id=staff_user.id,
        action=f"EQUIPMENT_{action}",
        target_type="BOOKING",
        target_id=booking.id,
        details={"notes": notes, "action_by": staff_user.full_name}
    )

    create_notification(
        db=db,
        college_id=staff_user.college_id,
        user_id=booking.student_id,
        title=f"Equipment {action.capitalize()}",
        message=f"{booking.resource.name} has been marked as {action.lower()}ed.",
        notification_type="INFO"
    )

    db.commit()
    db.refresh(booking)
    return booking


def calculate_slots_availability(
    db: Session,
    resource: Resource,
    target_date: datetime.date
) -> List[dict]:
    """
    Computes time slot availability breakdown for a given resource and date.
    """
    now_utc = datetime.utcnow()
    slots = []
    
    start_hour, start_min = [int(p) for p in resource.operating_start_time.split(":")]
    end_hour, end_min = [int(p) for p in resource.operating_end_time.split(":")]
    granularity = resource.slot_granularity_minutes

    current_slot_start = datetime(
        year=target_date.year,
        month=target_date.month,
        day=target_date.day,
        hour=start_hour,
        minute=start_min
    )
    operating_end_dt = datetime(
        year=target_date.year,
        month=target_date.month,
        day=target_date.day,
        hour=end_hour,
        minute=end_min
    )

    # Fetch active bookings for this day
    day_start = datetime(target_date.year, target_date.month, target_date.day, 0, 0, 0)
    day_end = datetime(target_date.year, target_date.month, target_date.day, 23, 59, 59)

    active_bookings = db.query(Booking).filter(
        Booking.resource_id == resource.id,
        Booking.status.in_([BookingStatus.CONFIRMED.value, BookingStatus.CHECKED_IN.value]),
        Booking.start_time < day_end,
        Booking.end_time > day_start
    ).all()

    maintenance_blocks = db.query(ResourceMaintenanceBlock).filter(
        ResourceMaintenanceBlock.resource_id == resource.id,
        ResourceMaintenanceBlock.start_time < day_end,
        ResourceMaintenanceBlock.end_time > day_start
    ).all()

    while current_slot_start + timedelta(minutes=granularity) <= operating_end_dt:
        current_slot_end = current_slot_start + timedelta(minutes=granularity)

        is_available = True
        status_label = "AVAILABLE"

        # Check if in past
        if current_slot_end < now_utc:
            is_available = False
            status_label = "PAST"
        # Check maintenance
        elif any(m.start_time < current_slot_end and m.end_time > current_slot_start for m in maintenance_blocks):
            is_available = False
            status_label = "MAINTENANCE"
        # Check active booking overlap
        elif any(b.start_time < current_slot_end and b.end_time > current_slot_start for b in active_bookings):
            is_available = False
            status_label = "RESERVED"

        slots.append({
            "start_time": current_slot_start,
            "end_time": current_slot_end,
            "is_available": is_available,
            "status_label": status_label
        })

        current_slot_start = current_slot_end

    return slots
