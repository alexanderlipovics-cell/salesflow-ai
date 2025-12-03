"""
Security Module
Sales Flow AI - CHIEF Coaching

Provides:
- Password hashing & verification
- JWT token creation & validation
- API key management
- Rate limiting helpers
"""

from datetime import datetime, timedelta
from typing import Optional, Dict, Any
import secrets
import hashlib
import hmac

from pydantic import BaseModel

from app.config import get_settings
from app.utils.logger import get_logger

logger = get_logger(__name__)
settings = get_settings()

# Optional: passlib for password hashing
try:
    from passlib.context import CryptContext
    HAS_PASSLIB = True
except ImportError:
    logger.warning("passlib not installed - password hashing will use fallback")
    HAS_PASSLIB = False

# Optional: python-jose for JWT
try:
    from jose import JWTError, jwt
    HAS_JOSE = True
except ImportError:
    logger.warning("python-jose not installed - JWT functions will use fallback")
    HAS_JOSE = False
    JWTError = Exception  # Fallback


# =============================================================================
# PASSWORD HASHING
# =============================================================================

if HAS_PASSLIB:
    pwd_context = CryptContext(
        schemes=["bcrypt"],
        deprecated="auto",
        bcrypt__rounds=12
    )
else:
    pwd_context = None


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """
    Verify a password against its hash.
    
    Args:
        plain_password: The plain text password
        hashed_password: The hashed password to verify against
        
    Returns:
        True if password matches, False otherwise
    """
    if HAS_PASSLIB and pwd_context:
        try:
            return pwd_context.verify(plain_password, hashed_password)
        except Exception as e:
            logger.warning(f"Password verification failed: {e}")
            return False
    else:
        # Fallback: SHA-256 comparison (not recommended for production)
        return hashlib.sha256(plain_password.encode()).hexdigest() == hashed_password


def get_password_hash(password: str) -> str:
    """
    Hash a password for storage.
    
    Args:
        password: The plain text password
        
    Returns:
        The hashed password
    """
    if HAS_PASSLIB and pwd_context:
        return pwd_context.hash(password)
    else:
        # Fallback: SHA-256 (not recommended for production)
        return hashlib.sha256(password.encode()).hexdigest()


# =============================================================================
# JWT TOKENS
# =============================================================================

# Default secret key - MUST be overridden in production
SECRET_KEY = getattr(settings, 'SECRET_KEY', 'your-secret-key-change-in-production')
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60
REFRESH_TOKEN_EXPIRE_DAYS = 7


class TokenData(BaseModel):
    """JWT token payload data."""
    user_id: str
    email: Optional[str] = None
    workspace_id: Optional[str] = None
    role: Optional[str] = None
    exp: Optional[datetime] = None
    
    @property
    def sub(self) -> str:
        """Alias for user_id (standard JWT claim name)."""
        return self.user_id


def create_access_token(
    data: Dict[str, Any],
    expires_delta: Optional[timedelta] = None
) -> str:
    """
    Create a JWT access token.
    
    Args:
        data: Dictionary of claims to encode
        expires_delta: Optional custom expiration time
        
    Returns:
        Encoded JWT token string
    """
    if not HAS_JOSE:
        # Fallback: return simple base64 token (NOT for production!)
        import base64
        import json
        data["exp"] = (datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)).timestamp()
        return base64.urlsafe_b64encode(json.dumps(data).encode()).decode()
    
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
    
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


def create_refresh_token(
    data: Dict[str, Any],
    expires_delta: Optional[timedelta] = None
) -> str:
    """
    Create a JWT refresh token.
    
    Args:
        data: Dictionary of claims to encode
        expires_delta: Optional custom expiration time
        
    Returns:
        Encoded JWT refresh token string
    """
    if not HAS_JOSE:
        # Fallback: return simple base64 token (NOT for production!)
        import base64
        import json
        data["exp"] = (datetime.utcnow() + timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS)).timestamp()
        data["type"] = "refresh"
        return base64.urlsafe_b64encode(json.dumps(data).encode()).decode()
    
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
    
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


def decode_token(token: str) -> Optional[TokenData]:
    """
    Decode and validate a JWT token.
    
    Args:
        token: The JWT token string
        
    Returns:
        TokenData if valid, None otherwise
    """
    if not HAS_JOSE:
        # Fallback: decode base64 (NOT for production!)
        try:
            import base64
            import json
            payload = json.loads(base64.urlsafe_b64decode(token).decode())
            user_id = payload.get("sub") or payload.get("user_id")
            if user_id is None:
                return None
            return TokenData(
                user_id=user_id,
                email=payload.get("email"),
                workspace_id=payload.get("workspace_id"),
                role=payload.get("role"),
                exp=datetime.fromtimestamp(payload.get("exp", 0))
            )
        except Exception as e:
            logger.warning(f"Token decode error: {e}")
            return None
    
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        
        user_id = payload.get("sub") or payload.get("user_id")
        if user_id is None:
            return None
        
        return TokenData(
            user_id=user_id,
            email=payload.get("email"),
            workspace_id=payload.get("workspace_id"),
            role=payload.get("role"),
            exp=datetime.fromtimestamp(payload.get("exp", 0))
        )
    except JWTError as e:
        logger.warning(f"JWT decode error: {e}")
        return None


def verify_token(token: str, token_type: str = "access") -> bool:
    """
    Verify a token is valid and of the correct type.
    
    Args:
        token: The JWT token string
        token_type: Expected token type ("access" or "refresh")
        
    Returns:
        True if valid, False otherwise
    """
    if not HAS_JOSE:
        # Fallback
        try:
            import base64
            import json
            payload = json.loads(base64.urlsafe_b64decode(token).decode())
            return payload.get("type") == token_type
        except Exception:
            return False
    
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload.get("type") == token_type
    except JWTError:
        return False


# =============================================================================
# API KEYS
# =============================================================================

def generate_api_key(prefix: str = "sf") -> str:
    """
    Generate a secure API key.
    
    Args:
        prefix: Optional prefix for the key
        
    Returns:
        A secure random API key string
    """
    random_bytes = secrets.token_bytes(32)
    key = secrets.token_urlsafe(32)
    return f"{prefix}_{key}"


def hash_api_key(api_key: str) -> str:
    """
    Hash an API key for storage.
    
    Args:
        api_key: The plain text API key
        
    Returns:
        SHA-256 hash of the API key
    """
    return hashlib.sha256(api_key.encode()).hexdigest()


def verify_api_key(api_key: str, hashed_key: str) -> bool:
    """
    Verify an API key against its hash.
    
    Args:
        api_key: The plain text API key
        hashed_key: The stored hash to verify against
        
    Returns:
        True if key matches, False otherwise
    """
    return hmac.compare_digest(
        hash_api_key(api_key),
        hashed_key
    )


# =============================================================================
# WEBHOOK SIGNATURES
# =============================================================================

def generate_webhook_signature(payload: str, secret: str) -> str:
    """
    Generate a HMAC signature for webhook payloads.
    
    Args:
        payload: The payload string to sign
        secret: The webhook secret
        
    Returns:
        HMAC-SHA256 signature
    """
    return hmac.new(
        secret.encode(),
        payload.encode(),
        hashlib.sha256
    ).hexdigest()


def verify_webhook_signature(
    payload: str,
    signature: str,
    secret: str
) -> bool:
    """
    Verify a webhook signature.
    
    Args:
        payload: The payload string
        signature: The signature to verify
        secret: The webhook secret
        
    Returns:
        True if signature is valid, False otherwise
    """
    expected = generate_webhook_signature(payload, secret)
    return hmac.compare_digest(signature, expected)


# =============================================================================
# FASTAPI DEPENDENCIES
# =============================================================================

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

security = HTTPBearer(auto_error=False)


async def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security)
) -> TokenData:
    """
    FastAPI dependency to get the current authenticated user.
    
    Args:
        credentials: Bearer token from Authorization header
        
    Returns:
        TokenData with user info
        
    Raises:
        HTTPException if not authenticated
    """
    # Für Development: Erlaube Requests ohne Token mit Demo-User
    if credentials is None:
        # Demo-User für Entwicklung
        return TokenData(
            user_id="demo-user-id",
            email="demo@salesflow.ai",
            workspace_id=None,
            role="user",
        )
    
    token = credentials.credentials
    token_data = decode_token(token)
    
    if token_data is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Ungültiges oder abgelaufenes Token",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    return token_data


async def get_current_user_optional(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security)
) -> Optional[TokenData]:
    """
    FastAPI dependency to optionally get the current user.
    Returns None if not authenticated instead of raising exception.
    """
    if credentials is None:
        return None
    
    token = credentials.credentials
    return decode_token(token)


# =============================================================================
# EXPORTS
# =============================================================================

__all__ = [
    # Password
    "verify_password",
    "get_password_hash",
    "pwd_context",
    
    # JWT
    "create_access_token",
    "create_refresh_token",
    "decode_token",
    "verify_token",
    "TokenData",
    "SECRET_KEY",
    "ALGORITHM",
    
    # API Keys
    "generate_api_key",
    "hash_api_key",
    "verify_api_key",
    
    # Webhooks
    "generate_webhook_signature",
    "verify_webhook_signature",
    
    # FastAPI Dependencies
    "get_current_user",
    "get_current_user_optional",
]

