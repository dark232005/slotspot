from typing import Generator, List
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from app.database import SessionLocal, get_db
from app.core.security import decode_access_token
from app.models.user import User, UserRole
from app.models.resource import ResourceManagerAssignment

security_scheme = HTTPBearer(auto_error=False)


def get_current_user(
    auth: HTTPAuthorizationCredentials = Depends(security_scheme),
    db: Session = Depends(get_db)
) -> User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    if not auth or not auth.credentials:
        raise credentials_exception

    payload = decode_access_token(auth.credentials)
    if payload is None:
        raise credentials_exception

    user_id: str = payload.get("sub")
    if user_id is None:
        raise credentials_exception

    user = db.query(User).filter(User.id == user_id).first()
    if user is None or not user.is_active:
        raise credentials_exception

    return user


def require_role(allowed_roles: List[UserRole]):
    def role_checker(current_user: User = Depends(get_current_user)) -> User:
        if current_user.role not in [role.value for role in allowed_roles]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access forbidden: User does not have sufficient permissions. Allowed roles: {[r.value for r in allowed_roles]}"
            )
        return current_user
    return role_checker


def get_current_student(current_user: User = Depends(get_current_user)) -> User:
    return current_user


def get_current_manager(current_user: User = Depends(require_role([UserRole.RESOURCE_MANAGER, UserRole.COLLEGE_ADMIN]))) -> User:
    return current_user


def get_current_admin(current_user: User = Depends(require_role([UserRole.COLLEGE_ADMIN]))) -> User:
    return current_user


def verify_tenant_access(current_user: User, resource_college_id: str):
    """Enforces strict multi-college tenant data isolation."""
    if current_user.college_id != resource_college_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Cross-tenant access forbidden: You cannot access or modify resources belonging to another college workspace."
        )


def verify_manager_resource_access(db: Session, current_user: User, resource_id: str, resource_college_id: str):
    """Validates that a manager is specifically assigned to the given resource, or is a college administrator."""
    verify_tenant_access(current_user, resource_college_id)
    if current_user.role == UserRole.COLLEGE_ADMIN.value:
        return True
    
    assignment = db.query(ResourceManagerAssignment).filter(
        ResourceManagerAssignment.user_id == current_user.id,
        ResourceManagerAssignment.resource_id == resource_id,
        ResourceManagerAssignment.college_id == current_user.college_id
    ).first()

    if not assignment:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Forbidden: You are not assigned as a manager for this specific resource."
        )
    return True
