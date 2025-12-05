"""
SalesFlow AI - Authentication Schemas
Pydantic models for auth requests and responses
"""

from pydantic import BaseModel, EmailStr, Field, field_validator
from typing import Optional
from datetime import datetime
from enum import Enum


class UserRole(str, Enum):
    """User roles for RBAC"""
    USER = "user"
    ADMIN = "admin"


# ─────────────────────────────────────────────────────────────────────────────
# Request Schemas
# ─────────────────────────────────────────────────────────────────────────────

class UserSignupRequest(BaseModel):
    """Schema for user registration"""
    email: EmailStr
    password: str = Field(..., min_length=8, max_length=128)
    full_name: str = Field(..., min_length=2, max_length=100)
    
    @field_validator("password")
    @classmethod
    def validate_password(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters")
        if not any(c.isupper() for c in v):
            raise ValueError("Password must contain at least one uppercase letter")
        if not any(c.islower() for c in v):
            raise ValueError("Password must contain at least one lowercase letter")
        if not any(c.isdigit() for c in v):
            raise ValueError("Password must contain at least one digit")
        return v


class UserLoginRequest(BaseModel):
    """Schema for user login"""
    email: EmailStr
    password: str


class RefreshTokenRequest(BaseModel):
    """Schema for token refresh"""
    refresh_token: str


class PasswordResetRequest(BaseModel):
    """Schema for password reset request"""
    email: EmailStr


class PasswordResetConfirm(BaseModel):
    """Schema for password reset confirmation"""
    token: str
    new_password: str = Field(..., min_length=8, max_length=128)
    
    @field_validator("new_password")
    @classmethod
    def validate_password(cls, v: str) -> str:
        if not any(c.isupper() for c in v):
            raise ValueError("Password must contain at least one uppercase letter")
        if not any(c.islower() for c in v):
            raise ValueError("Password must contain at least one lowercase letter")
        if not any(c.isdigit() for c in v):
            raise ValueError("Password must contain at least one digit")
        return v


class ChangePasswordRequest(BaseModel):
    """Schema for changing password while logged in"""
    current_password: str
    new_password: str = Field(..., min_length=8, max_length=128)


# ─────────────────────────────────────────────────────────────────────────────
# Response Schemas
# ─────────────────────────────────────────────────────────────────────────────

class TokenResponse(BaseModel):
    """Schema for token response after login/signup"""
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int  # seconds until access token expires


class UserResponse(BaseModel):
    """Schema for user data in responses"""
    id: str
    email: str
    full_name: str
    role: UserRole
    is_active: bool
    created_at: datetime
    updated_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True


class AuthResponse(BaseModel):
    """Combined response with tokens and user info"""
    user: UserResponse
    tokens: TokenResponse


class MessageResponse(BaseModel):
    """Generic message response"""
    message: str
    success: bool = True


# ─────────────────────────────────────────────────────────────────────────────
# Internal Schemas
# ─────────────────────────────────────────────────────────────────────────────

class TokenPayload(BaseModel):
    """Schema for decoded JWT payload"""
    sub: str  # user_id
    email: str
    role: UserRole
    exp: int  # expiry timestamp
    type: str  # "access" or "refresh"


class UserInDB(BaseModel):
    """Schema for user as stored in database"""
    id: str
    email: str
    full_name: str
    hashed_password: str
    role: UserRole = UserRole.USER
    is_active: bool = True
    created_at: datetime
    updated_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True


class RefreshTokenInDB(BaseModel):
    """Schema for refresh token as stored in database"""
    id: str
    user_id: str
    token_hash: str
    expires_at: datetime
    created_at: datetime
    revoked: bool = False
    
    class Config:
        from_attributes = True


class TokenBlacklistEntry(BaseModel):
    """Schema for blacklisted tokens"""
    token_hash: str
    user_id: str
    blacklisted_at: datetime
    expires_at: datetime  # When to remove from blacklist (same as token expiry)
