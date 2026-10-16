from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.core.deps import get_db, get_current_user, get_current_admin
from app.models.college import College, CollegeSettings
from app.models.user import User
from app.schemas.college import CollegeOut, CollegeSettingsOut, CollegeSettingsUpdate
from app.services.audit_service import log_audit_event

router = APIRouter()


@router.get("", response_model=List[CollegeOut])
def list_colleges(db: Session = Depends(get_db)):
    colleges = db.query(College).all()
    return colleges


@router.get("/settings", response_model=CollegeSettingsOut)
def get_college_settings(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    settings = db.query(CollegeSettings).filter(CollegeSettings.college_id == current_user.college_id).first()
    if not settings:
        # Create default if missing
        settings = CollegeSettings(college_id=current_user.college_id)
        db.add(settings)
        db.commit()
        db.refresh(settings)
    return settings


@router.put("/settings", response_model=CollegeSettingsOut)
def update_college_settings(
    update_data: CollegeSettingsUpdate,
    current_user: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    settings = db.query(CollegeSettings).filter(CollegeSettings.college_id == current_user.college_id).first()
    if not settings:
        settings = CollegeSettings(college_id=current_user.college_id)
        db.add(settings)

    for field, value in update_data.model_dump(exclude_unset=True).items():
        setattr(settings, field, value)

    log_audit_event(
        db=db,
        college_id=current_user.college_id,
        user_id=current_user.id,
        action="SETTINGS_UPDATED",
        target_type="SETTING",
        target_id=settings.id,
        details=update_data.model_dump(exclude_unset=True)
    )

    db.commit()
    db.refresh(settings)
    return settings
