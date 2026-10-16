from typing import List, Optional
from fastapi import APIRouter, Depends, Query, Response
from sqlalchemy.orm import Session

from app.core.deps import get_db, get_current_manager, get_current_admin
from app.models.user import User
from app.models.audit import AuditEvent
from app.schemas.analytics import AnalyticsReport
from app.services.analytics_service import get_college_analytics, generate_bookings_csv

router = APIRouter()


@router.get("/overview", response_model=AnalyticsReport)
def get_analytics(
    days: int = Query(default=14, ge=1, le=90),
    current_user: User = Depends(get_current_manager),
    db: Session = Depends(get_db)
):
    report = get_college_analytics(db=db, college_id=current_user.college_id, days=days)
    return report


@router.get("/export")
def export_bookings_csv(
    current_user: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    csv_data = generate_bookings_csv(db=db, college_id=current_user.college_id)
    return Response(
        content=csv_data,
        media_type="text/csv",
        headers={
            "Content-Disposition": f"attachment; filename=slotspot_bookings_report.csv"
        }
    )


@router.get("/audit-logs")
def list_audit_logs(
    limit: int = Query(default=100, ge=1, le=500),
    current_user: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    events = db.query(AuditEvent).filter(
        AuditEvent.college_id == current_user.college_id
    ).order_by(AuditEvent.created_at.desc()).limit(limit).all()

    result = []
    for e in events:
        result.append({
            "id": e.id,
            "action": e.action,
            "target_type": e.target_type,
            "target_id": e.target_id,
            "user_id": e.user_id,
            "user_name": e.user.full_name if e.user else "System Process",
            "details": e.details,
            "created_at": e.created_at
        })
    return result
