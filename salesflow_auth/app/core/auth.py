"""
SalesFlow AI - JWT Authentication Module
Handles JWT token creation, verification, and refresh token logic
"""

from datetime import datetime, timedelta, timezone
from typing import Optional, Any
from jose import jwt, JWTError, ExpiredSignatureError
from pydantic import ValidationError
import os
from enum import Enum

from app.schemas.auth import TokenPayload, UserRole


# Configuration from environment variables
SECRET_KEY = os.getenv("JWT_SECRET_KEY", "CHANGE_ME_IN_PRODUCTION_use_openssl_rand_hex_32")
REFRESH_SECRET_KEY = os.getenv("JWT_REFRESH_SECRET_KEY", "CHANGE_ME_REFRESH_use_openssl_rand_hex_32")
ALGORITHM = "HS256"

# Token expiry times
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24  # 24 hours
REFRESH_TOKEN_EXPIRE_DAYS = 30  # 30 days


class TokenType(str, Enum):
    ACCESS = "access"
    REFRESH = "refresh"


def create_access_token(
    user_id: str,
    email: str,
    role: UserRole,
    expires_delta: Optional[timedelta] = None
) -> str:
    """
    Create a new JWT access token.
    
    Args:
        user_id: User's unique identifier
        email: User's email address
        role: User's role (user/admin)
        expires_delta: Optional custom expiry time
        
    Returns:
        Encoded JWT token string
    """
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    
    to_encode = {
        "sub": user_id,
        "email": email,
        "role": role.value,
        "type": TokenType.ACCESS.value,
        "exp": expire,
        "iat": datetime.now(timezone.utc),
    }
    
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


def create_refresh_token(
    user_id: str,
    expires_delta: Optional[timedelta] = None
) -> tuple[str, datetime]:
    """
    Create a new refresh token.
    
    Args:
        user_id: User's unique identifier
        expires_delta: Optional custom expiry time
        
    Returns:
        Tuple of (encoded JWT token, expiry datetime)
    """
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS)
    
    to_encode = {
        "sub": user_id,
        "type": TokenType.REFRESH.value,
        "exp": expire,
        "iat": datetime.now(timezone.utc),
    }
    
    token = jwt.encode(to_encode, REFRESH_SECRET_KEY, algorithm=ALGORITHM)
    return token, expire


def decode_access_token(token: str) -> Optional[TokenPayload]:
    """
    Decode and validate an access token.
    
    Args:
        token: JWT token string
        
    Returns:
        TokenPayload if valid, None otherwise
        
    Raises:
        ExpiredSignatureError: If token has expired
        JWTError: If token is invalid
    """
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        
        # Verify it's an access token
        if payload.get("type") != TokenType.ACCESS.value:
            return None
        
        return TokenPayload(
            sub=payload.get("sub"),
            email=payload.get("email"),
            role=UserRole(payload.get("role")),
            exp=payload.get("exp"),
            type=payload.get("type")
        )
    except ExpiredSignatureError:
        raise
    except (JWTError, ValidationError):
        return None


def decode_refresh_token(token: str) -> Optional[dict[str, Any]]:
    """
    Decode and validate a refresh token.
    
    Args:
        token: JWT refresh token string
        
    Returns:
        Payload dict if valid, None otherwise
        
    Raises:
        ExpiredSignatureError: If token has expired
        JWTError: If token is invalid
    """
    try:
        payload = jwt.decode(token, REFRESH_SECRET_KEY, algorithms=[ALGORITHM])
        
        # Verify it's a refresh token
        if payload.get("type") != TokenType.REFRESH.value:
            return None
        
        return payload
    except ExpiredSignatureError:
        raise
    except JWTError:
        return None


def verify_token_not_expired(exp: int) -> bool:
    """
    Check if a token expiry timestamp is still valid.
    
    Args:
        exp: Unix timestamp of token expiry
        
    Returns:
        True if not expired, False otherwise
    """
    return datetime.fromtimestamp(exp, tz=timezone.utc) > datetime.now(timezone.utc)
