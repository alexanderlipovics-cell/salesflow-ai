"""
Authentication Router for SalesFlow AI.

Endpoints:
- POST /auth/signup - User registration
- POST /auth/login - User login
- POST /auth/refresh - Refresh access token
- POST /auth/logout - User logout (token blacklist)
- GET /auth/me - Get current user info
- POST /auth/change-password - Change password
"""

from __future__ import annotations

import logging
from datetime import datetime
from typing import Dict
from uuid import UUID, uuid4

from fastapi import APIRouter, Depends, HTTPException, status
from supabase import Client

from ..core.deps import get_supabase
from ..core.security import (
    InvalidCredentialsError,
    InvalidTokenError,
    create_token_pair,
    hash_password,
    verify_access_token,
    verify_password,
    verify_refresh_token,
)
from ..schemas.auth import (
    LoginResponse,
    LogoutResponse,
    MeResponse,
    PasswordChangeRequest,
    SignupResponse,
    TokenRefreshRequest,
    TokenResponse,
    User,
    UserLoginRequest,
    UserResponse,
    UserSignupRequest,
)

router = APIRouter(prefix="/auth", tags=["authentication"])
logger = logging.getLogger(__name__)


# ============================================================================
# HELPER FUNCTIONS
# ============================================================================


async def get_user_by_email(supabase: Client, email: str) -> Dict | None:
    """Get user by email from database."""
    try:
        result = supabase.table("users").select("*").eq("email", email).execute()
        if result.data and len(result.data) > 0:
            return result.data[0]
        return None
    except Exception as e:
        logger.error(f"Error fetching user by email: {e}")
        return None


async def get_user_by_id(supabase: Client, user_id: str) -> Dict | None:
    """Get user by ID from database."""
    try:
        result = supabase.table("users").select("*").eq("id", user_id).execute()
        if result.data and len(result.data) > 0:
            return result.data[0]
        return None
    except Exception as e:
        logger.error(f"Error fetching user by ID: {e}")
        return None


async def create_user(supabase: Client, user_data: Dict) -> Dict:
    """Create a new user in database."""
    try:
        result = supabase.table("users").insert(user_data).execute()
        if result.data and len(result.data) > 0:
            return result.data[0]
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create user"
        )
    except Exception as e:
        logger.error(f"Error creating user: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Database error: {str(e)}"
        )


async def update_user(supabase: Client, user_id: str, update_data: Dict) -> Dict:
    """Update user in database."""
    try:
        result = supabase.table("users").update(update_data).eq("id", user_id).execute()
        if result.data and len(result.data) > 0:
            return result.data[0]
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    except Exception as e:
        logger.error(f"Error updating user: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Database error: {str(e)}"
        )


async def get_current_user_from_token(
    token: str,
    supabase: Client
) -> Dict:
    """
    Validate token and get current user.
    
    Raises:
        HTTPException: If token is invalid or user not found
    """
    try:
        payload = verify_access_token(token)
        user_id = payload.get("sub")
        
        if not user_id:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token: missing user ID"
            )
        
        user = await get_user_by_id(supabase, user_id)
        
        if not user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="User not found"
            )
        
        if not user.get("is_active", True):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="User account is inactive"
            )
        
        return user
        
    except InvalidTokenError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=str(e),
            headers={"WWW-Authenticate": "Bearer"}
        )


# ============================================================================
# DEPENDENCY: Get Current User
# ============================================================================


async def get_current_user(
    authorization: str = Depends(lambda: None),  # Will be set in actual endpoint
    supabase: Client = Depends(get_supabase)
) -> Dict:
    """
    Dependency to get current authenticated user.
    
    Usage:
        @router.get("/protected")
        async def protected_route(user: Dict = Depends(get_current_user)):
            return {"user_id": user["id"]}
    """
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing or invalid authorization header",
            headers={"WWW-Authenticate": "Bearer"}
        )
    
    token = authorization.replace("Bearer ", "")
    return await get_current_user_from_token(token, supabase)


# ============================================================================
# AUTH ENDPOINTS
# ============================================================================


@router.post("/signup", response_model=SignupResponse, status_code=status.HTTP_201_CREATED)
async def signup(
    signup_data: UserSignupRequest,
    supabase: Client = Depends(get_supabase)
):
    """
    Register a new user account.
    
    - Validates email uniqueness
    - Hashes password with bcrypt
    - Creates user in database
    - Returns user data + authentication tokens
    """
    # Check if email already exists
    existing_user = await get_user_by_email(supabase, signup_data.email)
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    
    # Hash password
    password_hash = hash_password(signup_data.password)
    
    # Create user
    user_id = str(uuid4())
    user_data = {
        "id": user_id,
        "email": signup_data.email,
        "password_hash": password_hash,
        "name": signup_data.name,
        "company": signup_data.company,
        "role": "user",
        "is_active": True,
        "created_at": datetime.utcnow().isoformat()
    }
    
    created_user = await create_user(supabase, user_data)
    
    # Generate tokens
    tokens = create_token_pair(
        user_id=user_id,
        user_data={
            "email": created_user["email"],
            "role": created_user["role"]
        }
    )
    
    # Update last_login
    await update_user(supabase, user_id, {"last_login": datetime.utcnow().isoformat()})
    
    logger.info(f"User registered: {signup_data.email}")
    
    return SignupResponse(
        user=UserResponse(**created_user),
        tokens=TokenResponse(**tokens),
        message="Account created successfully"
    )


@router.post("/login", response_model=LoginResponse)
async def login(
    login_data: UserLoginRequest,
    supabase: Client = Depends(get_supabase)
):
    """
    Authenticate user and return tokens.
    
    - Validates email and password
    - Returns user data + authentication tokens
    """
    # Get user by email
    user = await get_user_by_email(supabase, login_data.email)
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password"
        )
    
    # Verify password
    if not verify_password(login_data.password, user["password_hash"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password"
        )
    
    # Check if account is active
    if not user.get("is_active", True):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is inactive. Please contact support."
        )
    
    # Generate tokens
    tokens = create_token_pair(
        user_id=str(user["id"]),
        user_data={
            "email": user["email"],
            "role": user.get("role", "user")
        }
    )
    
    # Update last_login
    await update_user(supabase, str(user["id"]), {"last_login": datetime.utcnow().isoformat()})
    
    logger.info(f"User logged in: {login_data.email}")
    
    return LoginResponse(
        user=UserResponse(**user),
        tokens=TokenResponse(**tokens),
        message="Login successful"
    )


@router.post("/refresh", response_model=TokenResponse)
async def refresh_token(
    refresh_data: TokenRefreshRequest,
    supabase: Client = Depends(get_supabase)
):
    """
    Refresh access token using refresh token.
    
    - Validates refresh token
    - Issues new access token
    - Returns new token pair
    """
    try:
        # Verify refresh token
        payload = verify_refresh_token(refresh_data.refresh_token)
        user_id = payload.get("sub")
        
        if not user_id:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid refresh token"
            )
        
        # Get user from database
        user = await get_user_by_id(supabase, user_id)
        
        if not user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="User not found"
            )
        
        if not user.get("is_active", True):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Account is inactive"
            )
        
        # Generate new token pair
        tokens = create_token_pair(
            user_id=user_id,
            user_data={
                "email": user["email"],
                "role": user.get("role", "user")
            }
        )
        
        logger.info(f"Token refreshed for user: {user['email']}")
        
        return TokenResponse(**tokens)
        
    except InvalidTokenError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=str(e)
        )


@router.get("/me", response_model=MeResponse)
async def get_me(
    authorization: str = Depends(lambda: None),
    supabase: Client = Depends(get_supabase)
):
    """
    Get current authenticated user information.
    
    Requires: Authorization header with Bearer token
    """
    user = await get_current_user(authorization, supabase)
    
    return MeResponse(user=UserResponse(**user))


@router.post("/logout", response_model=LogoutResponse)
async def logout(
    authorization: str = Depends(lambda: None),
    supabase: Client = Depends(get_supabase)
):
    """
    Logout current user.
    
    Note: In this implementation, we don't maintain a token blacklist.
    Client should simply delete the tokens.
    For production, consider implementing a Redis-based token blacklist.
    """
    # Verify user is authenticated
    user = await get_current_user(authorization, supabase)
    
    logger.info(f"User logged out: {user['email']}")
    
    return LogoutResponse(message="Logged out successfully")


@router.post("/change-password")
async def change_password(
    password_data: PasswordChangeRequest,
    authorization: str = Depends(lambda: None),
    supabase: Client = Depends(get_supabase)
):
    """
    Change user password.
    
    - Validates old password
    - Updates to new password
    - Returns success message
    """
    user = await get_current_user(authorization, supabase)
    
    # Verify old password
    if not verify_password(password_data.old_password, user["password_hash"]):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Current password is incorrect"
        )
    
    # Hash new password
    new_password_hash = hash_password(password_data.new_password)
    
    # Update password
    await update_user(
        supabase,
        str(user["id"]),
        {
            "password_hash": new_password_hash,
            "updated_at": datetime.utcnow().isoformat()
        }
    )
    
    logger.info(f"Password changed for user: {user['email']}")
    
    return {"message": "Password changed successfully"}


# ============================================================================
# EXPORTS
# ============================================================================


__all__ = ["router", "get_current_user"]

