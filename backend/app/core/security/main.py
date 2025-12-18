"""
Main Security module (FastAPI Auth) for SalesFlow AI.

This file was added to satisfy imports expecting `app.core.security.main`.
Content mirrors the previous `app/core/security.py` helpers for hashing and JWT.
"""

from __future__ import annotations

from datetime import datetime, timedelta
from typing import Any, Dict, Optional

import bcrypt
import jwt
from jwt import PyJWTError

from app.core.config import settings

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
    password_bytes = password.encode("utf-8")
    salt = bcrypt.gensalt()
    hashed = bcrypt.hashpw(password_bytes, salt)
    return hashed.decode("utf-8")


def verify_password(plain_password: str, hashed_password: str) -> bool:
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
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta or timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))
    to_encode.update(
        {"exp": expire, "iat": datetime.utcnow(), "type": "access"}
    )
    secret_key = getattr(settings, "jwt_secret_key", settings.secret_key)
    encoded_jwt = jwt.encode(to_encode, secret_key, algorithm=ALGORITHM)
    return encoded_jwt


def create_refresh_token(
    data: Dict[str, Any],
    expires_delta: Optional[timedelta] = None
) -> str:
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta or timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS))
    to_encode.update(
        {"exp": expire, "iat": datetime.utcnow(), "type": "refresh"}
    )
    secret_key = getattr(settings, "jwt_secret_key", settings.secret_key)
    encoded_jwt = jwt.encode(to_encode, secret_key, algorithm=ALGORITHM)
    return encoded_jwt


def decode_token(token: str) -> Dict[str, Any]:
    """
    Decode a JWT token.
    
    Debug logging added to trace decode issues.
    """
    import logging
    logger = logging.getLogger(__name__)
    
    secret_key = getattr(settings, "jwt_secret_key", settings.secret_key)
    
    logger.debug(f"decode_token: Secret key length: {len(secret_key) if secret_key else 0}")
    logger.debug(f"decode_token: Algorithm: {ALGORITHM}")
    logger.debug(f"decode_token: Token length: {len(token) if token else 0}")
    
    try:
        payload = jwt.decode(token, secret_key, algorithms=[ALGORITHM])
        logger.debug(f"decode_token: Token decoded successfully. Payload keys: {list(payload.keys())}")
        return payload
    except jwt.ExpiredSignatureError as e:
        logger.warning(f"decode_token: Token expired: {str(e)}")
        raise InvalidTokenError("Token has expired")
    except jwt.InvalidSignatureError as e:
        logger.warning(f"decode_token: Invalid signature. Secret key mismatch? Error: {str(e)}")
        logger.debug(f"decode_token: Using secret key (first 20 chars): {secret_key[:20] if secret_key else 'None'}...")
        raise InvalidTokenError(f"Invalid token signature: {str(e)}")
    except PyJWTError as e:
        logger.warning(f"decode_token: JWT decode error: {str(e)}")
        raise InvalidTokenError(f"Invalid token: {str(e)}")
    except Exception as e:
        logger.error(f"decode_token: Unexpected error: {str(e)}", exc_info=True)
        raise InvalidTokenError(f"Token decode failed: {str(e)}")


def verify_access_token(token: str) -> Dict[str, Any]:
    """
    Verify and decode an access token.
    
    Debug logging added to trace validation issues.
    """
    import logging
    logger = logging.getLogger(__name__)
    
    logger.debug(f"verify_access_token: Starting token validation")
    
    try:
        payload = decode_token(token)
        logger.debug(f"verify_access_token: Token decoded. Type: {payload.get('type')}")
        
        if payload.get("type") != "access":
            logger.warning(f"verify_access_token: Invalid token type. Expected 'access', got '{payload.get('type')}'")
            raise InvalidTokenError("Invalid token type")
        
        logger.debug(f"verify_access_token: Token validated successfully")
        return payload
    except InvalidTokenError:
        raise
    except Exception as e:
        logger.error(f"verify_access_token: Unexpected error: {str(e)}", exc_info=True)
        raise InvalidTokenError(f"Token validation failed: {str(e)}")


def verify_refresh_token(token: str) -> Dict[str, Any]:
    payload = decode_token(token)
    if payload.get("type") != "refresh":
        raise InvalidTokenError("Invalid token type")
    return payload


def get_user_id_from_token(token: str) -> str:
    payload = decode_token(token)
    user_id = payload.get("sub")
    if not user_id:
        raise InvalidTokenError("User ID not found in token")
    return user_id


def create_token_pair(user_id: str, email: Optional[str] = None) -> Dict[str, str]:
    access_token = create_access_token({"sub": user_id, "email": email})
    refresh_token = create_refresh_token({"sub": user_id, "email": email})
    return {"access_token": access_token, "refresh_token": refresh_token}


# ============================================================================
# FASTAPI DEPENDENCIES
# ============================================================================
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")


async def get_current_user(token: str = Depends(oauth2_scheme)) -> Dict[str, Any]:
    """
    Get current user from JWT token.
    
    Debug logging added to trace token validation issues.
    """
    import logging
    logger = logging.getLogger(__name__)
    
    logger.debug(f"get_current_user: Token received (first 50 chars): {token[:50] if token else 'None'}...")
    
    try:
        # Debug: Log settings
        from app.config import get_settings
        settings = get_settings()
        secret_key = getattr(settings, "jwt_secret_key", settings.secret_key)
        logger.debug(f"get_current_user: Using secret key (first 20 chars): {secret_key[:20] if secret_key else 'None'}...")
        logger.debug(f"get_current_user: Algorithm: {ALGORITHM}")
        
        payload = verify_access_token(token)
        logger.debug(f"get_current_user: Token decoded successfully. Payload keys: {list(payload.keys())}")
        logger.debug(f"get_current_user: Payload 'sub': {payload.get('sub')}")
        logger.debug(f"get_current_user: Payload 'type': {payload.get('type')}")
        return payload
    except InvalidTokenError as e:
        logger.warning(f"get_current_user: Token validation failed: {str(e)}")
        logger.debug(f"get_current_user: Token (first 50 chars): {token[:50] if token else 'None'}...")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=str(e),
            headers={"WWW-Authenticate": "Bearer"},
        )
    except Exception as e:
        logger.error(f"get_current_user: Unexpected error during token validation: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token validation failed",
            headers={"WWW-Authenticate": "Bearer"},
        )


async def get_current_active_user(token: str = Depends(oauth2_scheme)) -> Dict[str, Any]:
    return await get_current_user(token)


async def get_current_user_dict(token: str = Depends(oauth2_scheme)) -> Dict[str, Any]:
    return await get_current_user(token)


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

