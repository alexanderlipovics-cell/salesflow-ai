"""
SalesFlow AI - Authentication Router
Endpoints for user authentication and token management
"""

from fastapi import APIRouter, HTTPException, status, Depends, Request, Response
from fastapi.responses import JSONResponse
from datetime import datetime, timezone
from typing import Optional
import uuid
import hashlib

from app.core.auth import (
    create_access_token,
    create_refresh_token,
    decode_refresh_token,
    ACCESS_TOKEN_EXPIRE_MINUTES,
)
from app.core.security import (
    hash_password,
    verify_password,
    hash_token,
    validate_password_strength,
)
from app.core.deps import (
    get_current_user,
    get_current_active_user,
    login_rate_limiter,
)
from app.schemas.auth import (
    UserSignupRequest,
    UserLoginRequest,
    RefreshTokenRequest,
    ChangePasswordRequest,
    TokenResponse,
    UserResponse,
    AuthResponse,
    MessageResponse,
    UserRole,
    UserInDB,
)
from app.db.supabase import get_supabase_client


router = APIRouter(prefix="/auth", tags=["Authentication"])


# ─────────────────────────────────────────────────────────────────────────────
# Helper Functions
# ─────────────────────────────────────────────────────────────────────────────

def get_client_ip(request: Request) -> str:
    """Extract client IP from request for rate limiting."""
    forwarded = request.headers.get("X-Forwarded-For")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else "unknown"


async def create_user_tokens(user_id: str, email: str, role: UserRole) -> TokenResponse:
    """Create access and refresh tokens for a user."""
    # Create access token
    access_token = create_access_token(
        user_id=user_id,
        email=email,
        role=role
    )
    
    # Create refresh token
    refresh_token, refresh_expires = create_refresh_token(user_id=user_id)
    
    # Store refresh token hash in database
    supabase = get_supabase_client()
    supabase.table("refresh_tokens").insert({
        "id": str(uuid.uuid4()),
        "user_id": user_id,
        "token_hash": hash_token(refresh_token),
        "expires_at": refresh_expires.isoformat(),
        "created_at": datetime.now(timezone.utc).isoformat(),
        "revoked": False
    }).execute()
    
    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        token_type="bearer",
        expires_in=ACCESS_TOKEN_EXPIRE_MINUTES * 60
    )


# ─────────────────────────────────────────────────────────────────────────────
# Endpoints
# ─────────────────────────────────────────────────────────────────────────────

@router.post("/signup", response_model=AuthResponse, status_code=status.HTTP_201_CREATED)
async def signup(request: Request, user_data: UserSignupRequest):
    """
    Register a new user account.
    
    - Creates user in database with hashed password
    - Returns access and refresh tokens
    - Default role is 'user'
    """
    supabase = get_supabase_client()
    
    # Check if email already exists
    existing = supabase.table("users").select("id").eq(
        "email", user_data.email.lower()
    ).execute()
    
    if existing.data:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Email already registered"
        )
    
    # Validate password strength
    is_valid, error = validate_password_strength(user_data.password)
    if not is_valid:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=error
        )
    
    # Create user
    user_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc)
    
    new_user = {
        "id": user_id,
        "email": user_data.email.lower(),
        "full_name": user_data.full_name,
        "hashed_password": hash_password(user_data.password),
        "role": UserRole.USER.value,
        "is_active": True,
        "created_at": now.isoformat(),
        "updated_at": now.isoformat()
    }
    
    result = supabase.table("users").insert(new_user).execute()
    
    if not result.data:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create user"
        )
    
    # Create tokens
    tokens = await create_user_tokens(
        user_id=user_id,
        email=user_data.email.lower(),
        role=UserRole.USER
    )
    
    user_response = UserResponse(
        id=user_id,
        email=user_data.email.lower(),
        full_name=user_data.full_name,
        role=UserRole.USER,
        is_active=True,
        created_at=now
    )
    
    return AuthResponse(user=user_response, tokens=tokens)


@router.post("/login", response_model=AuthResponse)
async def login(request: Request, credentials: UserLoginRequest):
    """
    Authenticate user and return tokens.
    
    - Rate limited to 5 attempts per 5 minutes per IP
    - Returns access and refresh tokens on success
    """
    client_ip = get_client_ip(request)
    
    # Check rate limit
    if not await login_rate_limiter.check_rate_limit(client_ip):
        remaining = login_rate_limiter.get_remaining_attempts(client_ip)
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=f"Too many login attempts. Please try again later.",
            headers={"Retry-After": "300"}
        )
    
    supabase = get_supabase_client()
    
    # Find user by email
    result = supabase.table("users").select("*").eq(
        "email", credentials.email.lower()
    ).execute()
    
    if not result.data:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password"
        )
    
    user_data = result.data[0]
    
    # Verify password
    if not verify_password(credentials.password, user_data["hashed_password"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password"
        )
    
    # Check if user is active
    if not user_data.get("is_active", True):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is deactivated"
        )
    
    # Reset rate limit on successful login
    login_rate_limiter.reset(client_ip)
    
    # Create tokens
    tokens = await create_user_tokens(
        user_id=user_data["id"],
        email=user_data["email"],
        role=UserRole(user_data["role"])
    )
    
    user_response = UserResponse(
        id=user_data["id"],
        email=user_data["email"],
        full_name=user_data["full_name"],
        role=UserRole(user_data["role"]),
        is_active=user_data["is_active"],
        created_at=user_data["created_at"],
        updated_at=user_data.get("updated_at")
    )
    
    return AuthResponse(user=user_response, tokens=tokens)


@router.post("/refresh", response_model=TokenResponse)
async def refresh_token(request: Request, token_data: RefreshTokenRequest):
    """
    Refresh access token using refresh token.
    
    - Validates refresh token
    - Issues new access token
    - Optionally rotates refresh token
    """
    try:
        payload = decode_refresh_token(token_data.refresh_token)
        if payload is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid refresh token"
            )
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired refresh token"
        )
    
    user_id = payload.get("sub")
    token_hash = hash_token(token_data.refresh_token)
    
    supabase = get_supabase_client()
    
    # Verify refresh token exists and is not revoked
    token_result = supabase.table("refresh_tokens").select("*").eq(
        "token_hash", token_hash
    ).eq("revoked", False).execute()
    
    if not token_result.data:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Refresh token not found or revoked"
        )
    
    # Get user data
    user_result = supabase.table("users").select("*").eq("id", user_id).execute()
    
    if not user_result.data:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found"
        )
    
    user_data = user_result.data[0]
    
    if not user_data.get("is_active", True):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is deactivated"
        )
    
    # Revoke old refresh token (token rotation)
    supabase.table("refresh_tokens").update({
        "revoked": True
    }).eq("token_hash", token_hash).execute()
    
    # Create new tokens
    tokens = await create_user_tokens(
        user_id=user_data["id"],
        email=user_data["email"],
        role=UserRole(user_data["role"])
    )
    
    return tokens


@router.post("/logout", response_model=MessageResponse)
async def logout(
    request: Request,
    current_user: UserInDB = Depends(get_current_active_user)
):
    """
    Logout user by blacklisting current access token.
    
    - Adds token to blacklist
    - Revokes all refresh tokens for user
    """
    # Get the token from Authorization header
    auth_header = request.headers.get("Authorization", "")
    if auth_header.startswith("Bearer "):
        token = auth_header[7:]
        token_hash = hashlib.sha256(token.encode()).hexdigest()
        
        supabase = get_supabase_client()
        
        # Add to blacklist
        supabase.table("token_blacklist").insert({
            "id": str(uuid.uuid4()),
            "token_hash": token_hash,
            "user_id": current_user.id,
            "blacklisted_at": datetime.now(timezone.utc).isoformat(),
            "expires_at": datetime.now(timezone.utc).isoformat()  # Will be cleaned up by cron
        }).execute()
        
        # Revoke all refresh tokens for user
        supabase.table("refresh_tokens").update({
            "revoked": True
        }).eq("user_id", current_user.id).execute()
    
    return MessageResponse(message="Successfully logged out", success=True)


@router.get("/me", response_model=UserResponse)
async def get_current_user_info(
    current_user: UserInDB = Depends(get_current_active_user)
):
    """
    Get current authenticated user's information.
    """
    return UserResponse(
        id=current_user.id,
        email=current_user.email,
        full_name=current_user.full_name,
        role=current_user.role,
        is_active=current_user.is_active,
        created_at=current_user.created_at,
        updated_at=current_user.updated_at
    )


@router.post("/change-password", response_model=MessageResponse)
async def change_password(
    password_data: ChangePasswordRequest,
    current_user: UserInDB = Depends(get_current_active_user)
):
    """
    Change password for authenticated user.
    
    - Verifies current password
    - Updates to new password
    - Revokes all existing tokens
    """
    # Verify current password
    if not verify_password(password_data.current_password, current_user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Current password is incorrect"
        )
    
    # Validate new password
    is_valid, error = validate_password_strength(password_data.new_password)
    if not is_valid:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=error
        )
    
    # Update password
    supabase = get_supabase_client()
    
    supabase.table("users").update({
        "hashed_password": hash_password(password_data.new_password),
        "updated_at": datetime.now(timezone.utc).isoformat()
    }).eq("id", current_user.id).execute()
    
    # Revoke all refresh tokens (force re-login)
    supabase.table("refresh_tokens").update({
        "revoked": True
    }).eq("user_id", current_user.id).execute()
    
    return MessageResponse(message="Password changed successfully", success=True)


# ─────────────────────────────────────────────────────────────────────────────
# Admin Endpoints
# ─────────────────────────────────────────────────────────────────────────────

@router.post("/admin/deactivate/{user_id}", response_model=MessageResponse)
async def deactivate_user(
    user_id: str,
    current_user: UserInDB = Depends(get_current_active_user)
):
    """
    Deactivate a user account (admin only).
    """
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin privileges required"
        )
    
    if user_id == current_user.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot deactivate your own account"
        )
    
    supabase = get_supabase_client()
    
    # Deactivate user
    result = supabase.table("users").update({
        "is_active": False,
        "updated_at": datetime.now(timezone.utc).isoformat()
    }).eq("id", user_id).execute()
    
    if not result.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    # Revoke all tokens
    supabase.table("refresh_tokens").update({
        "revoked": True
    }).eq("user_id", user_id).execute()
    
    return MessageResponse(message="User deactivated successfully", success=True)


@router.post("/admin/activate/{user_id}", response_model=MessageResponse)
async def activate_user(
    user_id: str,
    current_user: UserInDB = Depends(get_current_active_user)
):
    """
    Reactivate a user account (admin only).
    """
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin privileges required"
        )
    
    supabase = get_supabase_client()
    
    result = supabase.table("users").update({
        "is_active": True,
        "updated_at": datetime.now(timezone.utc).isoformat()
    }).eq("id", user_id).execute()
    
    if not result.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    return MessageResponse(message="User activated successfully", success=True)
