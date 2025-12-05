"""
Authentication schemas for SalesFlow AI.

Pydantic models for:
- User registration
- User login
- Token responses
- Token refresh
"""

from __future__ import annotations

from datetime import datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, EmailStr, Field, field_validator


# ============================================================================
# REQUEST SCHEMAS
# ============================================================================


class UserSignupRequest(BaseModel):
    """Request schema for user registration."""
    
    email: EmailStr = Field(..., description="User email address")
    password: str = Field(..., min_length=8, max_length=100, description="User password (min 8 chars)")
    name: str = Field(..., min_length=2, max_length=100, description="User full name")
    company: Optional[str] = Field(None, max_length=200, description="Company/Organization name")
    
    @field_validator("password")
    @classmethod
    def validate_password_strength(cls, v: str) -> str:
        """Validate password contains at least one uppercase, lowercase, and number."""
        if not any(c.isupper() for c in v):
            raise ValueError("Password must contain at least one uppercase letter")
        if not any(c.islower() for c in v):
            raise ValueError("Password must contain at least one lowercase letter")
        if not any(c.isdigit() for c in v):
            raise ValueError("Password must contain at least one number")
        return v
    
    model_config = {
        "json_schema_extra": {
            "example": {
                "email": "max@example.com",
                "password": "SecurePass123!",
                "name": "Max Mustermann",
                "company": "Acme Corp"
            }
        }
    }


class UserLoginRequest(BaseModel):
    """Request schema for user login."""
    
    email: EmailStr = Field(..., description="User email address")
    password: str = Field(..., description="User password")
    
    model_config = {
        "json_schema_extra": {
            "example": {
                "email": "max@example.com",
                "password": "SecurePass123!"
            }
        }
    }


class TokenRefreshRequest(BaseModel):
    """Request schema for token refresh."""
    
    refresh_token: str = Field(..., description="Valid refresh token")
    
    model_config = {
        "json_schema_extra": {
            "example": {
                "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
            }
        }
    }


class PasswordChangeRequest(BaseModel):
    """Request schema for password change."""
    
    old_password: str = Field(..., description="Current password")
    new_password: str = Field(..., min_length=8, max_length=100, description="New password (min 8 chars)")
    
    @field_validator("new_password")
    @classmethod
    def validate_password_strength(cls, v: str) -> str:
        """Validate password strength."""
        if not any(c.isupper() for c in v):
            raise ValueError("Password must contain at least one uppercase letter")
        if not any(c.islower() for c in v):
            raise ValueError("Password must contain at least one lowercase letter")
        if not any(c.isdigit() for c in v):
            raise ValueError("Password must contain at least one number")
        return v


# ============================================================================
# RESPONSE SCHEMAS
# ============================================================================


class TokenResponse(BaseModel):
    """Response schema for token endpoints."""
    
    access_token: str = Field(..., description="JWT access token")
    refresh_token: str = Field(..., description="JWT refresh token")
    token_type: str = Field(default="bearer", description="Token type (always 'bearer')")
    expires_in: int = Field(default=86400, description="Access token expiration in seconds")
    
    model_config = {
        "json_schema_extra": {
            "example": {
                "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
                "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
                "token_type": "bearer",
                "expires_in": 86400
            }
        }
    }


class UserResponse(BaseModel):
    """Response schema for user data."""
    
    id: UUID = Field(..., description="User ID")
    email: str = Field(..., description="User email")
    name: str = Field(..., description="User full name")
    company: Optional[str] = Field(None, description="Company name")
    role: str = Field(default="user", description="User role")
    is_active: bool = Field(default=True, description="Is user active")
    created_at: datetime = Field(..., description="Account creation timestamp")
    
    model_config = {
        "from_attributes": True,
        "json_schema_extra": {
            "example": {
                "id": "123e4567-e89b-12d3-a456-426614174000",
                "email": "max@example.com",
                "name": "Max Mustermann",
                "company": "Acme Corp",
                "role": "user",
                "is_active": True,
                "created_at": "2025-01-05T10:00:00Z"
            }
        }
    }


class SignupResponse(BaseModel):
    """Response schema for successful signup."""
    
    user: UserResponse = Field(..., description="Created user data")
    tokens: TokenResponse = Field(..., description="Authentication tokens")
    message: str = Field(default="Account created successfully", description="Success message")
    
    model_config = {
        "json_schema_extra": {
            "example": {
                "user": {
                    "id": "123e4567-e89b-12d3-a456-426614174000",
                    "email": "max@example.com",
                    "name": "Max Mustermann",
                    "company": "Acme Corp",
                    "role": "user",
                    "is_active": True,
                    "created_at": "2025-01-05T10:00:00Z"
                },
                "tokens": {
                    "access_token": "eyJhbGci...",
                    "refresh_token": "eyJhbGci...",
                    "token_type": "bearer",
                    "expires_in": 86400
                },
                "message": "Account created successfully"
            }
        }
    }


class LoginResponse(BaseModel):
    """Response schema for successful login."""
    
    user: UserResponse = Field(..., description="User data")
    tokens: TokenResponse = Field(..., description="Authentication tokens")
    message: str = Field(default="Login successful", description="Success message")


class LogoutResponse(BaseModel):
    """Response schema for logout."""
    
    message: str = Field(default="Logged out successfully", description="Success message")
    
    model_config = {
        "json_schema_extra": {
            "example": {
                "message": "Logged out successfully"
            }
        }
    }


class MeResponse(BaseModel):
    """Response schema for /me endpoint (current user info)."""
    
    user: UserResponse = Field(..., description="Current user data")


# ============================================================================
# INTERNAL MODELS (Database)
# ============================================================================


class User(BaseModel):
    """Internal user model (matches database schema)."""
    
    id: UUID
    email: str
    password_hash: str
    name: str
    company: Optional[str] = None
    role: str = "user"
    is_active: bool = True
    created_at: datetime
    updated_at: Optional[datetime] = None
    last_login: Optional[datetime] = None
    
    model_config = {
        "from_attributes": True
    }


# ============================================================================
# EXPORTS
# ============================================================================


__all__ = [
    # Request Schemas
    "UserSignupRequest",
    "UserLoginRequest",
    "TokenRefreshRequest",
    "PasswordChangeRequest",
    
    # Response Schemas
    "TokenResponse",
    "UserResponse",
    "SignupResponse",
    "LoginResponse",
    "LogoutResponse",
    "MeResponse",
    
    # Internal Models
    "User",
]

