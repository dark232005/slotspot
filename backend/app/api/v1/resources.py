from datetime import datetime, date
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import or_

from app.core.deps import (
    get_db,
    get_current_user,
    get_current_manager,
    get_current_admin,
    verify_tenant_access,
    verify_manager_resource_access
)
from app.models.resource import (
    Resource,
    ResourceManagerAssignment,
    ResourceStatus,
    ResourceType
)
from app.models.user import User, UserRole
from app.schemas.resource import (
    ResourceCreate,
    ResourceUpdate,
    ResourceOut,
    SlotAvailabilityOut,
    ResourceManagerAssign,
    ManagerAssignmentOut
)
from app.services.booking_engine import calculate_slots_availability
from app.services.audit_service import log_audit_event

router = APIRouter()


@router.get("", response_model=List[ResourceOut])
def list_resources(
    type: Optional[str] = None,
    status: Optional[str] = None,
    search: Optional[str] = None,
    assigned_to_me: bool = False,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    query = db.query(Resource).filter(Resource.college_id == current_user.college_id)

    if type:
        query = query.filter(Resource.type == type)
    if status:
        query = query.filter(Resource.status == status)
    if search:
        search_pattern = f"%{search.strip()}%"
        query = query.filter(
            or_(
                Resource.name.ilike(search_pattern),
                Resource.location.ilike(search_pattern),
                Resource.description.ilike(search_pattern)
            )
        )

    if assigned_to_me and current_user.role == UserRole.RESOURCE_MANAGER.value:
        assigned_ids = [
            a.resource_id for a in db.query(ResourceManagerAssignment).filter(
                ResourceManagerAssignment.user_id == current_user.id
            ).all()
        ]
        query = query.filter(Resource.id.in_(assigned_ids))

    resources = query.order_by(Resource.name.asc()).all()
    return resources


@router.get("/{resource_id}", response_model=ResourceOut)
def get_resource(
    resource_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    resource = db.query(Resource).filter(
        Resource.id == resource_id,
        Resource.college_id == current_user.college_id
    ).first()

    if not resource:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Resource not found in your college.")
    return resource


@router.post("", response_model=ResourceOut, status_code=status.HTTP_201_CREATED)
def create_resource(
    resource_data: ResourceCreate,
    current_user: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    resource = Resource(
        college_id=current_user.college_id,
        name=resource_data.name,
        type=resource_data.type.value,
        description=resource_data.description,
        location=resource_data.location,
        capacity=resource_data.capacity,
        operating_start_time=resource_data.operating_start_time,
        operating_end_time=resource_data.operating_end_time,
        max_booking_duration_minutes=resource_data.max_booking_duration_minutes,
        slot_granularity_minutes=resource_data.slot_granularity_minutes,
        status=resource_data.status.value,
        image_url=resource_data.image_url
    )
    db.add(resource)
    db.flush()

    log_audit_event(
        db=db,
        college_id=current_user.college_id,
        user_id=current_user.id,
        action="RESOURCE_CREATED",
        target_type="RESOURCE",
        target_id=resource.id,
        details={"name": resource.name, "type": resource.type}
    )

    db.commit()
    db.refresh(resource)
    return resource


@router.put("/{resource_id}", response_model=ResourceOut)
def update_resource(
    resource_id: str,
    update_data: ResourceUpdate,
    current_user: User = Depends(get_current_manager),
    db: Session = Depends(get_db)
):
    resource = db.query(Resource).filter(
        Resource.id == resource_id,
        Resource.college_id == current_user.college_id
    ).first()

    if not resource:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Resource not found.")

    verify_manager_resource_access(db, current_user, resource.id, resource.college_id)

    for field, value in update_data.model_dump(exclude_unset=True).items():
        if field in ("type", "status") and value is not None:
            setattr(resource, field, value.value if hasattr(value, "value") else value)
        else:
            setattr(resource, field, value)

    log_audit_event(
        db=db,
        college_id=current_user.college_id,
        user_id=current_user.id,
        action="RESOURCE_UPDATED",
        target_type="RESOURCE",
        target_id=resource.id,
        details=update_data.model_dump(exclude_unset=True)
    )

    db.commit()
    db.refresh(resource)
    return resource


@router.delete("/{resource_id}")
def delete_resource(
    resource_id: str,
    current_user: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    resource = db.query(Resource).filter(
        Resource.id == resource_id,
        Resource.college_id == current_user.college_id
    ).first()

    if not resource:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Resource not found.")

    # Soft deactivate to maintain audit and historical records
    resource.status = ResourceStatus.INACTIVE.value
    log_audit_event(
        db=db,
        college_id=current_user.college_id,
        user_id=current_user.id,
        action="RESOURCE_DEACTIVATED",
        target_type="RESOURCE",
        target_id=resource.id,
        details={"name": resource.name}
    )

    db.commit()
    return {"message": f"Resource '{resource.name}' has been deactivated."}


@router.get("/{resource_id}/availability", response_model=List[SlotAvailabilityOut])
def get_resource_availability(
    resource_id: str,
    date_str: str = Query(..., description="Date formatted as YYYY-MM-DD", alias="date"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    resource = db.query(Resource).filter(
        Resource.id == resource_id,
        Resource.college_id == current_user.college_id
    ).first()

    if not resource:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Resource not found.")

    try:
        target_date = datetime.strptime(date_str, "%Y-%m-%d").date()
    except ValueError:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid date format. Use YYYY-MM-DD.")

    slots = calculate_slots_availability(db, resource, target_date)
    return slots


@router.get("/{resource_id}/managers", response_model=List[ManagerAssignmentOut])
def list_resource_managers(
    resource_id: str,
    current_user: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    resource = db.query(Resource).filter(
        Resource.id == resource_id,
        Resource.college_id == current_user.college_id
    ).first()

    if not resource:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Resource not found.")

    assignments = db.query(ResourceManagerAssignment).filter(
        ResourceManagerAssignment.resource_id == resource_id
    ).all()

    result = []
    for a in assignments:
        result.append(ManagerAssignmentOut(
            id=a.id,
            user_id=a.user_id,
            user_name=a.user.full_name if a.user else None,
            user_email=a.user.email if a.user else None
        ))
    return result


@router.post("/{resource_id}/managers", response_model=ManagerAssignmentOut)
def assign_resource_manager(
    resource_id: str,
    assign_data: ResourceManagerAssign,
    current_user: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    resource = db.query(Resource).filter(
        Resource.id == resource_id,
        Resource.college_id == current_user.college_id
    ).first()

    if not resource:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Resource not found.")

    target_user = db.query(User).filter(
        User.id == assign_data.user_id,
        User.college_id == current_user.college_id
    ).first()

    if not target_user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found in your college.")

    existing = db.query(ResourceManagerAssignment).filter(
        ResourceManagerAssignment.resource_id == resource_id,
        ResourceManagerAssignment.user_id == target_user.id
    ).first()

    if existing:
        return ManagerAssignmentOut(
            id=existing.id,
            user_id=target_user.id,
            user_name=target_user.full_name,
            user_email=target_user.email
        )

    assignment = ResourceManagerAssignment(
        college_id=current_user.college_id,
        resource_id=resource.id,
        user_id=target_user.id
    )
    db.add(assignment)
    db.commit()
    db.refresh(assignment)

    return ManagerAssignmentOut(
        id=assignment.id,
        user_id=target_user.id,
        user_name=target_user.full_name,
        user_email=target_user.email
    )


@router.delete("/{resource_id}/managers/{user_id}")
def remove_resource_manager(
    resource_id: str,
    user_id: str,
    current_user: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    assignment = db.query(ResourceManagerAssignment).filter(
        ResourceManagerAssignment.resource_id == resource_id,
        ResourceManagerAssignment.user_id == user_id,
        ResourceManagerAssignment.college_id == current_user.college_id
    ).first()

    if not assignment:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Assignment not found.")

    db.delete(assignment)
    db.commit()
    return {"message": "Manager assignment removed successfully."}
