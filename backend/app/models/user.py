"""
User Models
Modelle für Benutzer und Authentifizierung
"""

from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List
from datetime import datetime
from enum import Enum


class UserRole(str, Enum):
    """Benutzerrollen."""
    ADMIN = "admin"
    MANAGER = "manager"
    SALES = "sales"
    VIEWER = "viewer"


class UserTier(str, Enum):
    """Abo-Stufen."""
    FREE = "free"
    BASIC = "basic"
    PRO = "pro"
    ENTERPRISE = "enterprise"


class UserBase(BaseModel):
    """Basis-Benutzer-Modell."""
    email: EmailStr
    full_name: Optional[str] = None
    company_name: Optional[str] = None
    phone: Optional[str] = None


class UserCreate(UserBase):
    """Modell für Benutzer-Erstellung."""
    password: str = Field(..., min_length=8)


class UserUpdate(BaseModel):
    """Modell für Benutzer-Update."""
    full_name: Optional[str] = None
    company_name: Optional[str] = None
    phone: Optional[str] = None
    avatar_url: Optional[str] = None


class User(UserBase):
    """Vollständiges Benutzer-Modell."""
    id: str
    role: UserRole = UserRole.SALES
    tier: UserTier = UserTier.FREE
    avatar_url: Optional[str] = None
    is_active: bool = True
    is_verified: bool = False
    created_at: datetime
    updated_at: Optional[datetime] = None
    last_login: Optional[datetime] = None
    
    class Config:
        from_attributes = True


class UserInDB(User):
    """Benutzer mit Passwort-Hash (nur intern)."""
    hashed_password: str


class UserPreferences(BaseModel):
    """Benutzer-Einstellungen."""
    user_id: str
    language: str = "de"
    timezone: str = "Europe/Berlin"
    notification_email: bool = True
    notification_push: bool = True
    notification_sms: bool = False
    theme: str = "light"
    daily_summary: bool = True
    weekly_report: bool = True


class UserStats(BaseModel):
    """Benutzer-Statistiken."""
    user_id: str
    total_leads: int = 0
    converted_leads: int = 0
    total_messages: int = 0
    total_calls: int = 0
    conversion_rate: float = 0.0
    streak_days: int = 0
    xp_points: int = 0
    level: int = 1


class Token(BaseModel):
    """JWT Token Response."""
    access_token: str
    token_type: str = "bearer"
    expires_in: int = 3600


class TokenPayload(BaseModel):
    """JWT Token Payload."""
    sub: str  # user_id
    exp: datetime
    iat: datetime
    role: UserRole


class PasswordReset(BaseModel):
    """Passwort-Reset Request."""
    email: EmailStr


class PasswordResetConfirm(BaseModel):
    """Passwort-Reset Bestätigung."""
    token: str
    new_password: str = Field(..., min_length=8)

