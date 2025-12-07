"""
Pydantic schemas for authentication endpoints.
"""

from typing import Optional

from pydantic import BaseModel, EmailStr, Field


class SignupRequest(BaseModel):
    """Request schema for user signup."""

    email: EmailStr = Field(..., description="User email address")
    password: str = Field(..., min_length=8, description="User password")
    first_name: str = Field(..., min_length=1, max_length=100, description="User first name")
    last_name: str = Field(..., min_length=1, max_length=100, description="User last name")
    company: Optional[str] = Field(None, description="Company name")


class LoginRequest(BaseModel):
    """Request schema for user login."""

    email: EmailStr = Field(..., description="User email address")
    password: str = Field(..., description="User password")


class RefreshTokenRequest(BaseModel):
    """Request schema for token refresh."""

    refresh_token: str = Field(..., description="Valid refresh token")


class UserProfile(BaseModel):
    """User profile response schema."""

    id: str
    email: EmailStr
    first_name: Optional[str]
    last_name: Optional[str]
    role: str
    is_verified: bool
    company: Optional[str] = None
    phone: Optional[str] = None
    avatar_url: Optional[str] = None
    vertical_id: Optional[str] = Field(
        None, description="ID des zugewiesenen Verticals (Branche)"
    )


class UserProfileUpdate(BaseModel):
    """User profile update schema."""

    first_name: Optional[str] = Field(None, min_length=1, max_length=100)
    last_name: Optional[str] = Field(None, min_length=1, max_length=100)
    company: Optional[str] = Field(None)
    phone: Optional[str] = Field(None)
    avatar_url: Optional[str] = Field(None)
    vertical_id: Optional[str] = Field(None, description="ID des zugewiesenen Verticals")


class LoginResponse(BaseModel):
    """Response schema for login and refresh endpoints."""

    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int  # seconds
    user: UserProfile


class SignupResponse(BaseModel):
    """Response schema for signup endpoint."""

    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int  # seconds
    user: UserProfile