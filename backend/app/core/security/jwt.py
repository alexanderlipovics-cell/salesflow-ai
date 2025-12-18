"""
JWT Security Module for SalesFlow AI.

Implements secure JWT handling with:
- Access and refresh token management
- Token expiration validation
- Token blacklisting
- Refresh token rotation with family tracking
"""
from datetime import datetime, timedelta, timezone
from enum import Enum
from typing import Any, Optional
from uuid import UUID, uuid4
import hashlib
import logging

from jose import JWTError, jwt
from pydantic import BaseModel

from app.config import get_settings

logger = logging.getLogger(__name__)


class TokenType(str, Enum):
    """Token types."""
    ACCESS = "access"
    REFRESH = "refresh"


class TokenPayload(BaseModel):
    """JWT token payload structure."""
    sub: str  # User ID
    type: TokenType
    role: str
    org_id: Optional[str] = None
    jti: str  # JWT ID for blacklisting
    family_id: Optional[str] = None  # For refresh token rotation
    exp: datetime
    iat: datetime
    
    class Config:
        use_enum_values = True


class TokenPair(BaseModel):
    """Access and refresh token pair."""
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int  # Seconds


class TokenBlacklist:
    """
    In-memory token blacklist.
    
    In production, use Redis or database for persistence.
    """
    
    def __init__(self):
        self._blacklist: set[str] = set()
        self._family_blacklist: set[str] = set()
    
    def add(self, jti: str) -> None:
        """Add token to blacklist."""
        self._blacklist.add(jti)
    
    def add_family(self, family_id: str) -> None:
        """Blacklist entire token family (for stolen refresh tokens)."""
        self._family_blacklist.add(family_id)
    
    def is_blacklisted(self, jti: str) -> bool:
        """Check if token is blacklisted."""
        return jti in self._blacklist
    
    def is_family_blacklisted(self, family_id: str) -> bool:
        """Check if token family is blacklisted."""
        return family_id in self._family_blacklist
    
    def cleanup_expired(self) -> int:
        """Remove expired tokens from blacklist (call periodically)."""
        # In production, implement TTL-based cleanup
        return 0


# Global blacklist instance
token_blacklist = TokenBlacklist()


class JWTError(Exception):
    """Base JWT error."""
    pass


class TokenExpiredError(JWTError):
    """Token has expired."""
    pass


class TokenInvalidError(JWTError):
    """Token is invalid."""
    pass


class TokenBlacklistedError(JWTError):
    """Token has been revoked."""
    pass


class TokenFamilyCompromisedError(JWTError):
    """Token family has been compromised (possible theft)."""
    pass


def create_access_token(
    user_id: UUID,
    role: str,
    organization_id: Optional[UUID] = None,
    additional_claims: Optional[dict] = None
) -> tuple[str, str]:
    """
    Create a new access token.
    
    Returns:
        Tuple of (token, jti)
    """
    settings = get_settings()
    now = datetime.now(timezone.utc)
    jti = str(uuid4())
    
    payload = {
        "sub": str(user_id),
        "type": TokenType.ACCESS.value,
        "role": role,
        "jti": jti,
        "iat": now,
        "exp": now + timedelta(minutes=settings.JWT_ACCESS_TOKEN_EXPIRE_MINUTES)
    }
    
    if organization_id:
        payload["org_id"] = str(organization_id)
    
    if additional_claims:
        payload.update(additional_claims)
    
    token = jwt.encode(
        payload,
        settings.JWT_SECRET_KEY,
        algorithm=settings.JWT_ALGORITHM
    )
    
    return token, jti


def create_refresh_token(
    user_id: UUID,
    role: str,
    organization_id: Optional[UUID] = None,
    family_id: Optional[str] = None
) -> tuple[str, str, str]:
    """
    Create a new refresh token.
    
    Args:
        family_id: Existing family ID for rotation, or None for new family
    
    Returns:
        Tuple of (token, jti, family_id)
    """
    settings = get_settings()
    now = datetime.now(timezone.utc)
    jti = str(uuid4())
    family_id = family_id or str(uuid4())
    
    payload = {
        "sub": str(user_id),
        "type": TokenType.REFRESH.value,
        "role": role,
        "jti": jti,
        "family_id": family_id,
        "iat": now,
        "exp": now + timedelta(days=settings.JWT_REFRESH_TOKEN_EXPIRE_DAYS)
    }
    
    if organization_id:
        payload["org_id"] = str(organization_id)
    
    token = jwt.encode(
        payload,
        settings.JWT_REFRESH_SECRET_KEY,
        algorithm=settings.JWT_ALGORITHM
    )
    
    return token, jti, family_id


def create_token_pair(
    user_id: UUID,
    role: str,
    organization_id: Optional[UUID] = None
) -> TokenPair:
    """Create a new access/refresh token pair."""
    settings = get_settings()
    
    access_token, _ = create_access_token(user_id, role, organization_id)
    refresh_token, _, _ = create_refresh_token(user_id, role, organization_id)
    
    return TokenPair(
        access_token=access_token,
        refresh_token=refresh_token,
        expires_in=settings.JWT_ACCESS_TOKEN_EXPIRE_MINUTES * 60
    )


def decode_access_token(token: str) -> TokenPayload:
    """
    Decode and validate an access token.
    
    Raises:
        TokenExpiredError: If token has expired
        TokenInvalidError: If token is malformed
        TokenBlacklistedError: If token has been revoked
    """
    settings = get_settings()
    
    try:
        payload = jwt.decode(
            token,
            settings.JWT_SECRET_KEY,
            algorithms=[settings.JWT_ALGORITHM]
        )
    except jwt.ExpiredSignatureError:
        raise TokenExpiredError("Access token has expired")
    except jwt.JWTError as e:
        logger.warning(f"Invalid access token: {str(e)}")
        raise TokenInvalidError("Invalid access token")
    
    # Validate token type
    if payload.get("type") != TokenType.ACCESS.value:
        raise TokenInvalidError("Invalid token type")
    
    # Check blacklist
    jti = payload.get("jti")
    if jti and token_blacklist.is_blacklisted(jti):
        raise TokenBlacklistedError("Token has been revoked")
    
    return TokenPayload(**payload)


def decode_refresh_token(token: str) -> TokenPayload:
    """
    Decode and validate a refresh token.
    
    Raises:
        TokenExpiredError: If token has expired
        TokenInvalidError: If token is malformed
        TokenBlacklistedError: If token has been revoked
        TokenFamilyCompromisedError: If token family is compromised
    """
    settings = get_settings()
    
    try:
        payload = jwt.decode(
            token,
            settings.JWT_REFRESH_SECRET_KEY,
            algorithms=[settings.JWT_ALGORITHM]
        )
    except jwt.ExpiredSignatureError:
        raise TokenExpiredError("Refresh token has expired")
    except jwt.JWTError as e:
        logger.warning(f"Invalid refresh token: {str(e)}")
        raise TokenInvalidError("Invalid refresh token")
    
    # Validate token type
    if payload.get("type") != TokenType.REFRESH.value:
        raise TokenInvalidError("Invalid token type")
    
    # Check family blacklist (indicates potential theft)
    family_id = payload.get("family_id")
    if family_id and token_blacklist.is_family_blacklisted(family_id):
        logger.warning(f"Attempted use of compromised token family: {family_id}")
        raise TokenFamilyCompromisedError("Token family has been compromised")
    
    # Check individual blacklist
    jti = payload.get("jti")
    if jti and token_blacklist.is_blacklisted(jti):
        # This refresh token was already used - possible theft!
        # Blacklist the entire family
        if family_id:
            token_blacklist.add_family(family_id)
            logger.warning(f"Refresh token reuse detected, blacklisting family: {family_id}")
        raise TokenBlacklistedError("Token has been revoked")
    
    return TokenPayload(**payload)


def rotate_refresh_token(old_token: str) -> TokenPair:
    """
    Rotate a refresh token.
    
    The old refresh token is blacklisted and a new pair is issued.
    This implements refresh token rotation for security.
    
    Raises:
        TokenExpiredError, TokenInvalidError, TokenBlacklistedError
    """
    # Decode and validate old token
    payload = decode_refresh_token(old_token)
    
    # Blacklist the old token
    token_blacklist.add(payload.jti)
    
    # Create new tokens with same family
    user_id = UUID(payload.sub)
    org_id = UUID(payload.org_id) if payload.org_id else None
    
    access_token, _ = create_access_token(user_id, payload.role, org_id)
    refresh_token, _, _ = create_refresh_token(
        user_id, payload.role, org_id,
        family_id=payload.family_id  # Keep same family
    )
    
    settings = get_settings()
    return TokenPair(
        access_token=access_token,
        refresh_token=refresh_token,
        expires_in=settings.JWT_ACCESS_TOKEN_EXPIRE_MINUTES * 60
    )


def revoke_token(token: str, token_type: TokenType = TokenType.ACCESS) -> bool:
    """
    Revoke a token by adding it to the blacklist.
    
    Returns:
        True if token was successfully revoked
    """
    try:
        settings = get_settings()
        secret = (
            settings.JWT_SECRET_KEY 
            if token_type == TokenType.ACCESS 
            else settings.JWT_REFRESH_SECRET_KEY
        )
        
        payload = jwt.decode(
            token,
            secret,
            algorithms=[settings.JWT_ALGORITHM],
            options={"verify_exp": False}  # Allow revoking expired tokens
        )
        
        jti = payload.get("jti")
        if jti:
            token_blacklist.add(jti)
            logger.info(f"Token revoked: {jti[:8]}...")
            return True
        return False
        
    except jwt.JWTError:
        return False


def revoke_all_user_tokens(user_id: UUID) -> None:
    """
    Revoke all tokens for a user.
    
    In production, this would query and blacklist all tokens
    from the database.
    """
    logger.info(f"Revoking all tokens for user: {user_id}")
    # In production: query database for all user tokens and blacklist


def get_token_fingerprint(token: str) -> str:
    """
    Generate a fingerprint for token tracking.
    
    Useful for logging without exposing the full token.
    """
    return hashlib.sha256(token.encode()).hexdigest()[:16]
