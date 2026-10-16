from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.core.deps import get_db, get_current_user
from app.core.security import verify_password, create_access_token
from app.models.user import User
from app.models.college import College
from app.schemas.auth import LoginRequest, TokenResponse, UserSummary

router = APIRouter()


@router.post("/login", response_model=TokenResponse)
def login(login_data: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == login_data.email.lower().strip()).first()
    if not user or not verify_password(login_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is deactivated. Please contact your college administrator."
        )

    token = create_access_token(subject=user.id)
    college = db.query(College).filter(College.id == user.college_id).first()

    user_summary = UserSummary(
        id=user.id,
        college_id=user.college_id,
        college_name=college.name if college else "Unknown College",
        email=user.email,
        full_name=user.full_name,
        role=user.role,
        is_active=user.is_active,
        created_at=user.created_at
    )

    return TokenResponse(access_token=token, token_type="bearer", user=user_summary)


@router.get("/me", response_model=UserSummary)
def get_current_profile(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    college = db.query(College).filter(College.id == current_user.college_id).first()
    return UserSummary(
        id=current_user.id,
        college_id=current_user.college_id,
        college_name=college.name if college else "Unknown College",
        email=current_user.email,
        full_name=current_user.full_name,
        role=current_user.role,
        is_active=current_user.is_active,
        created_at=current_user.created_at
    )
