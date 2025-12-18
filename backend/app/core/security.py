"""
Security utilities for SalesFlow AI Backend.

Handles:
- Password hashing (bcrypt)
- JWT token generation & validation
- Token refresh logic
"""

from __future__ import annotations

from datetime import datetime, timedelta
from typing import Any, Dict, Optional

import bcrypt
import jwt
from jwt import PyJWTError

from ..config import get_settings


# JWT Configuration
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24  # 24 hours
REFRESH_TOKEN_EXPIRE_DAYS = 30


class SecurityError(Exception):
    """Base exception for security-related errors."""


class InvalidTokenError(SecurityError):
    """Raised when a JWT token is invalid or expired."""


class InvalidCredentialsError(SecurityError):
    """Raised when credentials are invalid."""


# ============================================================================
# PASSWORD HASHING (bcrypt)
# ============================================================================


def hash_password(password: str) -> str:
    """
    Hash a password using bcrypt.
    
    Args:
        password: Plain text password
        
    Returns:
        Hashed password (bcrypt format)
        
    Example:
        >>> hashed = hash_password("MySecurePassword123!")
        >>> verify_password("MySecurePassword123!", hashed)
        True
    """
    password_bytes = password.encode("utf-8")
    salt = bcrypt.gensalt()
    hashed = bcrypt.hashpw(password_bytes, salt)
    return hashed.decode("utf-8")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """
    Verify a password against its hash.
    
    Args:
        plain_password: Plain text password
        hashed_password: Hashed password from database
        
    Returns:
        True if password matches, False otherwise
        
    Example:
        >>> hashed = hash_password("test123")
        >>> verify_password("test123", hashed)
        True
        >>> verify_password("wrong", hashed)
        False
    """
    try:
        password_bytes = plain_password.encode("utf-8")
        hashed_bytes = hashed_password.encode("utf-8")
        return bcrypt.checkpw(password_bytes, hashed_bytes)
    except Exception:
        return False


# ============================================================================
# JWT TOKEN GENERATION & VALIDATION
# ============================================================================


def create_access_token(
    data: Dict[str, Any],
    expires_delta: Optional[timedelta] = None
) -> str:
    """
    Create a JWT access token.
    
    Args:
        data: Payload data to encode (e.g., {"sub": user_id, "email": email})
        expires_delta: Optional custom expiration time
        
    Returns:
        Encoded JWT token
        
    Example:
        >>> token = create_access_token({"sub": "user-123", "email": "test@example.com"})
        >>> # Returns: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
    """
    settings = get_settings()
    
    to_encode = data.copy()
    
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    
    to_encode.update({
        "exp": expire,
        "iat": datetime.utcnow(),
        "type": "access"
    })
    
    # Use a secret key from settings (fallback to default for dev)
    secret_key = getattr(settings, "jwt_secret_key", "CHANGE_THIS_IN_PRODUCTION_OR_USE_ENV_VAR")
    
    encoded_jwt = jwt.encode(to_encode, secret_key, algorithm=ALGORITHM)
    return encoded_jwt


def create_refresh_token(
    data: Dict[str, Any],
    expires_delta: Optional[timedelta] = None
) -> str:
    """
    Create a JWT refresh token.
    
    Args:
        data: Payload data to encode
        expires_delta: Optional custom expiration time
        
    Returns:
        Encoded JWT refresh token
    """
    settings = get_settings()
    
    to_encode = data.copy()
    
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS)
    
    to_encode.update({
        "exp": expire,
        "iat": datetime.utcnow(),
        "type": "refresh"
    })
    
    secret_key = getattr(settings, "jwt_secret_key", "CHANGE_THIS_IN_PRODUCTION_OR_USE_ENV_VAR")
    
    encoded_jwt = jwt.encode(to_encode, secret_key, algorithm=ALGORITHM)
    return encoded_jwt


def decode_token(token: str) -> Dict[str, Any]:
    """
    Decode and validate a JWT token.
    
    Args:
        token: JWT token string
        
    Returns:
        Decoded payload
        
    Raises:
        InvalidTokenError: If token is invalid or expired
        
    Example:
        >>> token = create_access_token({"sub": "user-123"})
        >>> payload = decode_token(token)
        >>> payload["sub"]
        'user-123'
    """
    settings = get_settings()
    secret_key = getattr(settings, "jwt_secret_key", "CHANGE_THIS_IN_PRODUCTION_OR_USE_ENV_VAR")
    
    try:
        payload = jwt.decode(token, secret_key, algorithms=[ALGORITHM])
        return payload
    except jwt.ExpiredSignatureError:
        raise InvalidTokenError("Token has expired")
    except PyJWTError as e:
        raise InvalidTokenError(f"Invalid token: {str(e)}")


def verify_access_token(token: str) -> Dict[str, Any]:
    """
    Verify that a token is a valid access token.
    
    Args:
        token: JWT token string
        
    Returns:
        Decoded payload
        
    Raises:
        InvalidTokenError: If token is not a valid access token
    """
    payload = decode_token(token)
    
    if payload.get("type") != "access":
        raise InvalidTokenError("Token is not an access token")
    
    return payload


def verify_refresh_token(token: str) -> Dict[str, Any]:
    """
    Verify that a token is a valid refresh token.
    
    Args:
        token: JWT token string
        
    Returns:
        Decoded payload
        
    Raises:
        InvalidTokenError: If token is not a valid refresh token
    """
    payload = decode_token(token)
    
    if payload.get("type") != "refresh":
        raise InvalidTokenError("Token is not a refresh token")
    
    return payload


# ============================================================================
# TOKEN HELPERS
# ============================================================================


def get_user_id_from_token(token: str) -> str:
    """
    Extract user ID from a JWT token.
    
    Args:
        token: JWT token string
        
    Returns:
        User ID from token payload
        
    Raises:
        InvalidTokenError: If token is invalid or missing user ID
    """
    payload = verify_access_token(token)
    user_id = payload.get("sub")
    
    if not user_id:
        raise InvalidTokenError("Token missing user ID (sub)")
    
    return user_id


def create_token_pair(user_id: str, user_data: Optional[Dict[str, Any]] = None) -> Dict[str, str]:
    """
    Create both access and refresh tokens for a user.
    
    Args:
        user_id: User ID to encode in tokens
        user_data: Optional additional user data (email, role, etc.)
        
    Returns:
        Dict with access_token and refresh_token
        
    Example:
        >>> tokens = create_token_pair("user-123", {"email": "test@example.com", "role": "user"})
        >>> tokens.keys()
        dict_keys(['access_token', 'refresh_token', 'token_type'])
    """
    payload = {"sub": user_id}
    
    if user_data:
        payload.update(user_data)
    
    access_token = create_access_token(payload)
    refresh_token = create_refresh_token({"sub": user_id})
    
    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer"
    }


# ============================================================================
# FASTAPI DEPENDENCIES & AUTH
# ============================================================================

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session

from ..db.session import get_db
from ..models.user import User  # Adjust import path as needed

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")


def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db),
) -> User:
    """
    FastAPI dependency to get the current authenticated user.
    Validates JWT token and returns User object from database.
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )

    try:
        payload = verify_access_token(token)
        user_id: str = payload.get("sub")
        if user_id is None:
            raise credentials_exception
    except InvalidTokenError:
        raise credentials_exception

    user = db.query(User).filter(User.id == user_id).first()
    if user is None:
        raise credentials_exception
    return user


def get_current_active_user(
    current_user: User = Depends(get_current_user),
) -> User:
    """
    FastAPI dependency to ensure the current user is active.
    """
    if hasattr(current_user, "is_active") and not current_user.is_active:
        raise HTTPException(status_code=400, detail="Inactive user")
    return current_user


# ============================================================================
# LEGACY COMPATIBILITY (for existing routers that expect Dict)
# ============================================================================

from fastapi import Depends


def get_current_user_dict(
    current_user: User = Depends(get_current_active_user),
) -> Dict[str, Any]:
    """
    Legacy compatibility function that returns user as Dict.
    Used by existing routers that expect the old format.
    """
    return {
        "org_id": "demo-org",  # Default org for now
        "team_member_id": current_user.id,
        "user_id": current_user.id,
        "sub": current_user.id,  # JWT standard field (subject)
        "role": current_user.role,
        "name": f"{current_user.first_name or ''} {current_user.last_name or ''}".strip(),
        "email": current_user.email,
        "is_verified": current_user.is_verified,
        "company": current_user.company,
    }


__all__ = [
    "hash_password",
    "verify_password",
    "create_access_token",
    "create_refresh_token",
    "decode_token",
    "verify_access_token",
    "verify_refresh_token",
    "get_user_id_from_token",
    "create_token_pair",
    "SecurityError",
    "InvalidTokenError",
    "InvalidCredentialsError",
    "ACCESS_TOKEN_EXPIRE_MINUTES",
    "REFRESH_TOKEN_EXPIRE_DAYS",
    "oauth2_scheme",
    "get_current_user",
    "get_current_active_user",
    "get_current_user_dict",
]

