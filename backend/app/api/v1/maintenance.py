from datetime import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.deps import get_db, get_current_user, get_current_manager, verify_manager_resource_access
from app.models.maintenance import ResourceMaintenanceBlock
from app.models.resource import Resource
from app.models.user import User
from app.schemas.maintenance import MaintenanceCreate, MaintenanceOut
from app.services.audit_service import log_audit_event

router = APIRouter()


@router.get("", response_model=List[MaintenanceOut])
def list_maintenance_blocks(
    resource_id: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    query = db.query(ResourceMaintenanceBlock).filter(
        ResourceMaintenanceBlock.college_id == current_user.college_id
    )
    if resource_id:
        query = query.filter(ResourceMaintenanceBlock.resource_id == resource_id)

    blocks = query.order_by(ResourceMaintenanceBlock.start_time.desc()).all()
    result = []
    for b in blocks:
        result.append(MaintenanceOut(
            id=b.id,
            college_id=b.college_id,
            resource_id=b.resource_id,
            resource_name=b.resource.name if b.resource else "N/A",
            start_time=b.start_time,
            end_time=b.end_time,
            reason=b.reason,
            created_by_user_id=b.created_by_user_id,
            created_at=b.created_at
        ))
    return result


@router.post("", response_model=MaintenanceOut, status_code=status.HTTP_201_CREATED)
def create_maintenance_block(
    maint_data: MaintenanceCreate,
    current_user: User = Depends(get_current_manager),
    db: Session = Depends(get_db)
):
    resource = db.query(Resource).filter(
        Resource.id == maint_data.resource_id,
        Resource.college_id == current_user.college_id
    ).first()

    if not resource:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Resource not found.")

    verify_manager_resource_access(db, current_user, resource.id, resource.college_id)

    if maint_data.start_time >= maint_data.end_time:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Start time must be before end time.")

    block = ResourceMaintenanceBlock(
        college_id=current_user.college_id,
        resource_id=resource.id,
        start_time=maint_data.start_time,
        end_time=maint_data.end_time,
        reason=maint_data.reason,
        created_by_user_id=current_user.id
    )
    db.add(block)
    db.flush()

    log_audit_event(
        db=db,
        college_id=current_user.college_id,
        user_id=current_user.id,
        action="MAINTENANCE_CREATED",
        target_type="RESOURCE",
        target_id=resource.id,
        details={
            "reason": maint_data.reason,
            "start_time": maint_data.start_time.isoformat(),
            "end_time": maint_data.end_time.isoformat()
        }
    )

    db.commit()
    db.refresh(block)

    return MaintenanceOut(
        id=block.id,
        college_id=block.college_id,
        resource_id=block.resource_id,
        resource_name=resource.name,
        start_time=block.start_time,
        end_time=block.end_time,
        reason=block.reason,
        created_by_user_id=block.created_by_user_id,
        created_at=block.created_at
    )


@router.delete("/{block_id}")
def delete_maintenance_block(
    block_id: str,
    current_user: User = Depends(get_current_manager),
    db: Session = Depends(get_db)
):
    block = db.query(ResourceMaintenanceBlock).filter(
        ResourceMaintenanceBlock.id == block_id,
        ResourceMaintenanceBlock.college_id == current_user.college_id
    ).first()

    if not block:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Maintenance block not found.")

    verify_manager_resource_access(db, current_user, block.resource_id, block.college_id)

    db.delete(block)
    db.commit()
    return {"message": "Maintenance block removed."}
