"""
Sales Flow AI - Security Utilities
Password Hashing, JWT Token Handling.
"""

from datetime import datetime, timedelta
from typing import Optional, Dict, Any
from jose import JWTError, jwt
from passlib.context import CryptContext

from app.config import settings


# ===========================================
# PASSWORD HASHING
# ===========================================

pwd_context = CryptContext(
    schemes=["bcrypt"],
    deprecated="auto"
)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verifiziert Passwort gegen Hash."""
    return pwd_context.verify(plain_password, hashed_password)


def get_password_hash(password: str) -> str:
    """Erstellt Passwort-Hash."""
    return pwd_context.hash(password)


# ===========================================
# JWT TOKEN HANDLING
# ===========================================

def create_access_token(
    data: Dict[str, Any],
    expires_delta: Optional[timedelta] = None
) -> str:
    """
    Erstellt JWT Access Token.
    
    Args:
        data: Payload-Daten (z.B. user_id, email)
        expires_delta: Token-Gültigkeit (default: ACCESS_TOKEN_EXPIRE_MINUTES)
    
    Returns:
        Encoded JWT Token
    """
    to_encode = data.copy()
    
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(
            minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES
        )
    
    to_encode.update({
        "exp": expire,
        "iat": datetime.utcnow(),
        "type": "access"
    })
    
    return jwt.encode(
        to_encode,
        settings.SECRET_KEY,
        algorithm=settings.ALGORITHM
    )


def create_refresh_token(
    data: Dict[str, Any],
    expires_delta: Optional[timedelta] = None
) -> str:
    """
    Erstellt JWT Refresh Token.
    
    Args:
        data: Payload-Daten (z.B. user_id)
        expires_delta: Token-Gültigkeit (default: REFRESH_TOKEN_EXPIRE_DAYS)
    
    Returns:
        Encoded JWT Refresh Token
    """
    to_encode = data.copy()
    
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(
            days=settings.REFRESH_TOKEN_EXPIRE_DAYS
        )
    
    to_encode.update({
        "exp": expire,
        "iat": datetime.utcnow(),
        "type": "refresh"
    })
    
    return jwt.encode(
        to_encode,
        settings.SECRET_KEY,
        algorithm=settings.ALGORITHM
    )


def verify_token(token: str) -> Optional[Dict[str, Any]]:
    """
    Verifiziert JWT Token und gibt Payload zurück.
    
    Args:
        token: JWT Token String
    
    Returns:
        Token Payload oder None bei ungültigem Token
    """
    try:
        payload = jwt.decode(
            token,
            settings.SECRET_KEY,
            algorithms=[settings.ALGORITHM]
        )
        return payload
    except JWTError:
        return None


def decode_token(token: str) -> Optional[Dict[str, Any]]:
    """Alias für verify_token()."""
    return verify_token(token)


# ===========================================
# TOKEN VALIDATION HELPERS
# ===========================================

def is_token_expired(payload: Dict[str, Any]) -> bool:
    """Prüft ob Token abgelaufen ist."""
    exp = payload.get("exp")
    if not exp:
        return True
    return datetime.utcnow() > datetime.fromtimestamp(exp)


def get_token_type(payload: Dict[str, Any]) -> Optional[str]:
    """Gibt Token-Typ zurück (access/refresh)."""
    return payload.get("type")

