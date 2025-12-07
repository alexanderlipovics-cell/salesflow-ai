"""
Authentication router for SalesFlow AI Backend.
Handles login, signup, token refresh, password reset, and user profile.
"""

from datetime import timedelta
from typing import Any, Dict

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from supabase import Client

from ..core.security import (
    create_token_pair,
    get_current_active_user,
    hash_password,
    verify_password,
    verify_refresh_token,
)
from ..core.deps import get_supabase
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
    supabase: Client = Depends(get_supabase),
) -> SignupResponse:
    """
    Create a new user account.

    - Validates email uniqueness
    - Hashes password
    - Creates user in database
    - Returns JWT tokens
    """
    # Check if user already exists
    existing_result = supabase.table("users").select("id, email").eq("email", user_data.email).maybe_single().execute()
    if existing_result.data:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered",
        )

    # Hash password
    hashed_password = hash_password(user_data.password)

    # Create user in Supabase
    user_id = user_data.email  # Using email as ID for simplicity, could be UUID
    user_data_dict = {
        "id": user_id,
        "email": user_data.email,
        "first_name": user_data.first_name,
        "last_name": user_data.last_name,
        "hashed_password": hashed_password,
        "is_active": True,
        "is_verified": False,
        "role": "user",
    }
    
    if user_data.company:
        user_data_dict["company"] = user_data.company

    result = supabase.table("users").insert(user_data_dict).execute()
    
    if not result.data:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create user",
        )
    
    user = result.data[0]

    # Create tokens
    tokens = create_token_pair(user_id, user["email"])

    return SignupResponse(
        access_token=tokens["access_token"],
        refresh_token=tokens["refresh_token"],
        token_type="bearer",
        expires_in=1800,  # 30 minutes
        user=UserProfile(
            id=user["id"],
            email=user["email"],
            first_name=user.get("first_name"),
            last_name=user.get("last_name"),
            role=user.get("role", "user"),
            is_verified=user.get("is_verified", False),
        ),
    )


@router.post("/login", response_model=LoginResponse)
async def login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    supabase: Client = Depends(get_supabase),
) -> LoginResponse:
    """
    Authenticate user with email and password.

    Returns JWT access and refresh tokens.
    """
    # Find user by email
    result = supabase.table("users").select("*").eq("email", form_data.username).maybe_single().execute()
    
    if not result.data:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    user = result.data

    if not verify_password(form_data.password, user.get("hashed_password", "")):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not user.get("is_active", True):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Account is deactivated",
        )

    # Create tokens
    tokens = create_token_pair(user["id"], user["email"])

    return LoginResponse(
        access_token=tokens["access_token"],
        refresh_token=tokens["refresh_token"],
        token_type="bearer",
        expires_in=1800,  # 30 minutes
        user=UserProfile(
            id=user["id"],
            email=user["email"],
            first_name=user.get("first_name"),
            last_name=user.get("last_name"),
            role=user.get("role", "user"),
            is_verified=user.get("is_verified", False),
        ),
    )


@router.post("/refresh", response_model=LoginResponse)
async def refresh_token(
    token_data: RefreshTokenRequest,
    supabase: Client = Depends(get_supabase),
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

        # Find user in Supabase
        result = supabase.table("users").select("*").eq("id", user_id).maybe_single().execute()
        
        if not result.data:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="User not found or inactive",
            )

        user = result.data
        
        if not user.get("is_active", True):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="User not found or inactive",
            )

        # Create new tokens
        tokens = create_token_pair(user["id"], user["email"])

        return LoginResponse(
            access_token=tokens["access_token"],
            refresh_token=tokens["refresh_token"],
            token_type="bearer",
            expires_in=1800,  # 30 minutes
            user=UserProfile(
                id=user["id"],
                email=user["email"],
                first_name=user.get("first_name"),
                last_name=user.get("last_name"),
                role=user.get("role", "user"),
                is_verified=user.get("is_verified", False),
            ),
        )

    except HTTPException:
        raise
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
    supabase: Client = Depends(get_supabase),
) -> Dict[str, str]:
    """
    Request password reset.
    In production, this would send an email with reset link.
    """
    result = supabase.table("users").select("id").eq("email", email).maybe_single().execute()
    if result.data:
        # TODO: Generate reset token and send email
        # For now, just return success to avoid email enumeration
        pass

    return {
        "message": "If an account with this email exists, a password reset link has been sent."
    }


@router.get("/me", response_model=UserProfile)
async def get_current_user_profile(
    current_user: Dict[str, Any] = Depends(get_current_active_user),
    supabase: Client = Depends(get_supabase),
) -> UserProfile:
    """
    Get current user profile.
    """
    user_id = current_user.get("sub")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User ID not found in token",
        )

    # Fetch user from Supabase
    result = supabase.table("users").select("*").eq("id", user_id).maybe_single().execute()
    
    if not result.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )

    user = result.data
    return UserProfile(
        id=user["id"],
        email=user["email"],
        first_name=user.get("first_name"),
        last_name=user.get("last_name"),
        role=user.get("role", "user"),
        is_verified=user.get("is_verified", False),
        company=user.get("company"),
        phone=user.get("phone"),
        avatar_url=user.get("avatar_url"),
    )


@router.patch("/me", response_model=UserProfile)
async def update_current_user_profile(
    user_update: UserProfileUpdate,
    current_user: Dict[str, Any] = Depends(get_current_active_user),
    supabase: Client = Depends(get_supabase),
) -> UserProfile:
    """
    Update current user profile.
    """
    user_id = current_user.get("sub")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User ID not found in token",
        )

    update_data = user_update.dict(exclude_unset=True)

    # Don't allow email changes for now
    if "email" in update_data:
        del update_data["email"]

    # Update user in Supabase
    if update_data:
        result = supabase.table("users").update(update_data).eq("id", user_id).execute()
        
        if not result.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found",
            )
        
        user = result.data[0]
    else:
        # No updates, just fetch current user
        result = supabase.table("users").select("*").eq("id", user_id).maybe_single().execute()
        if not result.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found",
            )
        user = result.data

    return UserProfile(
        id=user["id"],
        email=user["email"],
        first_name=user.get("first_name"),
        last_name=user.get("last_name"),
        role=user.get("role", "user"),
        is_verified=user.get("is_verified", False),
        company=user.get("company"),
        phone=user.get("phone"),
        avatar_url=user.get("avatar_url"),
    )