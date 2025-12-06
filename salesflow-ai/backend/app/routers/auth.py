"""
Authentication router for SalesFlow AI Backend.
Handles login, signup, token refresh, password reset, and user profile.
"""

from datetime import timedelta
from typing import Any, Dict

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

from ..core.security import (
    create_token_pair,
    get_current_active_user,
    hash_password,
    verify_password,
    verify_refresh_token,
)
from ..db.session import get_db
from ..models.user import User
from ..schemas.auth import (
    LoginRequest,
    LoginResponse,
    RefreshTokenRequest,
    SignupRequest,
    SignupResponse,
    UserProfile,
    UserProfileUpdate,
)

router = APIRouter(prefix="/auth", tags=["authentication"])


@router.post("/signup", response_model=SignupResponse)
async def signup(
    user_data: SignupRequest,
    db: Session = Depends(get_db),
) -> SignupResponse:
    """
    Create a new user account.

    - Validates email uniqueness
    - Hashes password
    - Creates user in database
    - Returns JWT tokens
    """
    # Check if user already exists
    existing_user = db.query(User).filter(User.email == user_data.email).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered",
        )

    # Hash password
    hashed_password = hash_password(user_data.password)

    # Create user
    user = User(
        id=user_data.email,  # Using email as ID for simplicity, could be UUID
        email=user_data.email,
        first_name=user_data.first_name,
        last_name=user_data.last_name,
        hashed_password=hashed_password,
        company=user_data.company,
    )

    db.add(user)
    db.commit()
    db.refresh(user)

    # Create tokens
    tokens = create_token_pair(user.id, {
        "email": user.email,
        "first_name": user.first_name,
        "last_name": user.last_name,
    })

    return SignupResponse(
        access_token=tokens["access_token"],
        refresh_token=tokens["refresh_token"],
        token_type="bearer",
        expires_in=1800,  # 30 minutes
        user=UserProfile(
            id=user.id,
            email=user.email,
            first_name=user.first_name,
            last_name=user.last_name,
            role=user.role,
            is_verified=user.is_verified,
        ),
    )


@router.post("/login", response_model=LoginResponse)
async def login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db),
) -> LoginResponse:
    """
    Authenticate user with email and password.

    Returns JWT access and refresh tokens.
    """
    user = db.query(User).filter(User.email == form_data.username).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Account is deactivated",
        )

    # Create tokens
    tokens = create_token_pair(user.id, {
        "email": user.email,
        "first_name": user.first_name,
        "last_name": user.last_name,
    })

    return LoginResponse(
        access_token=tokens["access_token"],
        refresh_token=tokens["refresh_token"],
        token_type="bearer",
        expires_in=1800,  # 30 minutes
        user=UserProfile(
            id=user.id,
            email=user.email,
            first_name=user.first_name,
            last_name=user.last_name,
            role=user.role,
            is_verified=user.is_verified,
        ),
    )


@router.post("/refresh", response_model=LoginResponse)
async def refresh_token(
    token_data: RefreshTokenRequest,
    db: Session = Depends(get_db),
) -> LoginResponse:
    """
    Refresh access token using refresh token.

    Returns new JWT access and refresh tokens.
    """
    try:
        payload = verify_refresh_token(token_data.refresh_token)
        user_id: str = payload.get("sub")

        if not user_id:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid refresh token",
            )

        user = db.query(User).filter(User.id == user_id).first()
        if not user or not user.is_active:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="User not found or inactive",
            )

        # Create new tokens
        tokens = create_token_pair(user.id, {
            "email": user.email,
            "first_name": user.first_name,
            "last_name": user.last_name,
        })

        return LoginResponse(
            access_token=tokens["access_token"],
            refresh_token=tokens["refresh_token"],
            token_type="bearer",
            expires_in=1800,  # 30 minutes
            user=UserProfile(
                id=user.id,
                email=user.email,
                first_name=user.first_name,
                last_name=user.last_name,
                role=user.role,
                is_verified=user.is_verified,
            ),
        )

    except Exception:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid refresh token",
        )


@router.post("/logout")
async def logout() -> Dict[str, str]:
    """
    Logout endpoint (client-side token removal).
    In a real implementation, you might want to blacklist tokens.
    """
    return {"message": "Successfully logged out"}


@router.post("/request-password-reset")
async def request_password_reset(
    email: str,
    db: Session = Depends(get_db),
) -> Dict[str, str]:
    """
    Request password reset.
    In production, this would send an email with reset link.
    """
    user = db.query(User).filter(User.email == email).first()
    if user:
        # TODO: Generate reset token and send email
        # For now, just return success to avoid email enumeration
        pass

    return {
        "message": "If an account with this email exists, a password reset link has been sent."
    }


@router.get("/me", response_model=UserProfile)
async def get_current_user_profile(
    current_user: User = Depends(get_current_active_user),
) -> UserProfile:
    """
    Get current user profile.
    """
    return UserProfile(
        id=current_user.id,
        email=current_user.email,
        first_name=current_user.first_name,
        last_name=current_user.last_name,
        role=current_user.role,
        is_verified=current_user.is_verified,
        company=current_user.company,
        phone=current_user.phone,
        avatar_url=current_user.avatar_url,
    )


@router.patch("/me", response_model=UserProfile)
async def update_current_user_profile(
    user_update: UserProfileUpdate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
) -> UserProfile:
    """
    Update current user profile.
    """
    update_data = user_update.dict(exclude_unset=True)

    # Don't allow email changes for now
    if "email" in update_data:
        del update_data["email"]

    # Update user fields
    for field, value in update_data.items():
        if hasattr(current_user, field):
            setattr(current_user, field, value)

    db.commit()
    db.refresh(current_user)

    return UserProfile(
        id=current_user.id,
        email=current_user.email,
        first_name=current_user.first_name,
        last_name=current_user.last_name,
        role=current_user.role,
        is_verified=current_user.is_verified,
        company=current_user.company,
        phone=current_user.phone,
        avatar_url=current_user.avatar_url,
    )