from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.deps import get_db, get_current_admin
from app.core.security import get_password_hash
from app.models.user import User, UserRole
from app.schemas.user import UserCreate, UserUpdate, UserOut
from app.services.audit_service import log_audit_event

router = APIRouter()


@router.get("", response_model=List[UserOut])
def list_users(
    role: Optional[str] = None,
    current_user: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    query = db.query(User).filter(User.college_id == current_user.college_id)
    if role:
        query = query.filter(User.role == role)
    users = query.order_by(User.full_name.asc()).all()
    return users


@router.post("", response_model=UserOut, status_code=status.HTTP_201_CREATED)
def create_user(
    user_data: UserCreate,
    current_user: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    existing = db.query(User).filter(User.email == user_data.email.lower().strip()).first()
    if existing:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email already registered.")

    new_user = User(
        college_id=current_user.college_id,
        email=user_data.email.lower().strip(),
        hashed_password=get_password_hash(user_data.password),
        full_name=user_data.full_name.strip(),
        role=user_data.role.value,
        is_active=True
    )
    db.add(new_user)
    db.flush()

    log_audit_event(
        db=db,
        college_id=current_user.college_id,
        user_id=current_user.id,
        action="USER_CREATED",
        target_type="USER",
        target_id=new_user.id,
        details={"email": new_user.email, "role": new_user.role}
    )

    db.commit()
    db.refresh(new_user)
    return new_user


@router.put("/{user_id}", response_model=UserOut)
def update_user(
    user_id: str,
    update_data: UserUpdate,
    current_user: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    target_user = db.query(User).filter(
        User.id == user_id,
        User.college_id == current_user.college_id
    ).first()

    if not target_user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found.")

    if update_data.full_name is not None:
        target_user.full_name = update_data.full_name
    if update_data.role is not None:
        target_user.role = update_data.role.value
    if update_data.is_active is not None:
        target_user.is_active = update_data.is_active
    if update_data.password is not None and len(update_data.password) >= 6:
        target_user.hashed_password = get_password_hash(update_data.password)

    log_audit_event(
        db=db,
        college_id=current_user.college_id,
        user_id=current_user.id,
        action="USER_UPDATED",
        target_type="USER",
        target_id=target_user.id,
        details=update_data.model_dump(exclude_unset=True, exclude={"password"})
    )

    db.commit()
    db.refresh(target_user)
    return target_user
