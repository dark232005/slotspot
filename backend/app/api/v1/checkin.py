from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.deps import get_db, get_current_manager
from app.models.user import User
from app.schemas.booking import CheckInRequest, CheckInResponse, EquipmentStatusUpdate, BookingOut
from app.services.booking_engine import check_in_booking, update_equipment_issue_return
from app.services.qr_service import extract_token_from_qr_input
from app.api.v1.bookings import format_booking_out

router = APIRouter()


@router.post("", response_model=CheckInResponse)
def perform_check_in(
    request: CheckInRequest,
    current_user: User = Depends(get_current_manager),
    db: Session = Depends(get_db)
):
    token = None
    lookup = None

    if request.qr_token:
        extracted = extract_token_from_qr_input(request.qr_token)
        if extracted.startswith("SS-"):
            lookup = extracted
        else:
            token = extracted

    if request.lookup_code:
        lookup = request.lookup_code.strip()

    booking = check_in_booking(
        db=db,
        staff_user=current_user,
        qr_token=token,
        lookup_code=lookup
    )

    out = format_booking_out(booking)
    return CheckInResponse(
        success=True,
        message=f"Successfully checked in for '{booking.resource.name}' ({booking.student.full_name}).",
        booking=out
    )


@router.post("/equipment/{booking_id}", response_model=BookingOut)
def equipment_workflow(
    booking_id: str,
    update_data: EquipmentStatusUpdate,
    current_user: User = Depends(get_current_manager),
    db: Session = Depends(get_db)
):
    booking = update_equipment_issue_return(
        db=db,
        booking_id=booking_id,
        action=update_data.action,
        staff_user=current_user,
        notes=update_data.notes
    )
    return format_booking_out(booking)
