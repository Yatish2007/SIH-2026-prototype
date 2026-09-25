from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from ..auth import (
    create_access_token,
    hash_password,
    verify_password
)

from ..database import get_db
from ..models import User
from ..schemas import (
    TokenResponse,
    UserLogin,
    UserRegister,
    UserResponse
)


router = APIRouter(
    prefix="/auth",
    tags=["Authentication"]
)


VALID_ROLES = {
    "trainee",
    "trainer",
    "admin"
}

# Roles a member of the public may self-register. Admin accounts can only be
# created or assigned by an existing administrator (see admin router), never
# through the public registration endpoint.
PUBLIC_REGISTER_ROLES = {
    "trainee",
    "trainer"
}


@router.post(
    "/register",
    response_model=UserResponse,
    status_code=status.HTTP_201_CREATED
)
def register(
    user_data: UserRegister,
    db: Session = Depends(get_db)
):
    if user_data.role not in VALID_ROLES:
        raise HTTPException(
            status_code=400,
            detail="Invalid role"
        )

    if user_data.role not in PUBLIC_REGISTER_ROLES:
        raise HTTPException(
            status_code=403,
            detail="Self-registration is not allowed for this role. Please contact an administrator."
        )

    existing_user = (
        db.query(User)
        .filter(User.email == user_data.email)
        .first()
    )

    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Email already registered"
        )

    new_user = User(
        name=user_data.name,
        email=user_data.email,
        password=hash_password(user_data.password),
        role=user_data.role
    )

    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    return new_user


@router.post(
    "/login",
    response_model=TokenResponse
)
def login(
    login_data: UserLogin,
    db: Session = Depends(get_db)
):
    user = (
        db.query(User)
        .filter(User.email == login_data.email)
        .first()
    )

    if user is None:
        raise HTTPException(
            status_code=401,
            detail="Invalid email or password"
        )

    if not verify_password(
        login_data.password,
        user.password
    ):
        raise HTTPException(
            status_code=401,
            detail="Invalid email or password"
        )

    token = create_access_token(user.id)

    return {
        "access_token": token,
        "token_type": "bearer",
        "user": user
    }
