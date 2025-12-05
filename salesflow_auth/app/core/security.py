"""
SalesFlow AI - Security Module
Password hashing and verification using bcrypt
"""

from passlib.context import CryptContext
from typing import Optional
import secrets
import hashlib

# Bcrypt context with recommended settings
pwd_context = CryptContext(
    schemes=["bcrypt"],
    deprecated="auto",
    bcrypt__rounds=12  # Good balance between security and performance
)


def hash_password(password: str) -> str:
    """
    Hash a password using bcrypt.
    
    Args:
        password: Plain text password
        
    Returns:
        Hashed password string
    """
    return pwd_context.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """
    Verify a password against its hash.
    
    Args:
        plain_password: Plain text password to verify
        hashed_password: Stored hash to compare against
        
    Returns:
        True if password matches, False otherwise
    """
    return pwd_context.verify(plain_password, hashed_password)


def generate_secure_token(length: int = 32) -> str:
    """
    Generate a cryptographically secure random token.
    Used for refresh tokens and other secure identifiers.
    
    Args:
        length: Number of bytes (token will be 2x this in hex)
        
    Returns:
        Secure random hex string
    """
    return secrets.token_hex(length)


def hash_token(token: str) -> str:
    """
    Hash a token for secure storage (used for refresh tokens).
    We store hashed refresh tokens to prevent token theft if DB is compromised.
    
    Args:
        token: Plain token string
        
    Returns:
        SHA-256 hash of the token
    """
    return hashlib.sha256(token.encode()).hexdigest()


def validate_password_strength(password: str) -> tuple[bool, Optional[str]]:
    """
    Validate password meets minimum security requirements.
    
    Args:
        password: Password to validate
        
    Returns:
        Tuple of (is_valid, error_message)
    """
    if len(password) < 8:
        return False, "Password must be at least 8 characters long"
    
    if len(password) > 128:
        return False, "Password must not exceed 128 characters"
    
    has_upper = any(c.isupper() for c in password)
    has_lower = any(c.islower() for c in password)
    has_digit = any(c.isdigit() for c in password)
    has_special = any(c in "!@#$%^&*()_+-=[]{}|;:,.<>?" for c in password)
    
    if not (has_upper and has_lower and has_digit):
        return False, "Password must contain uppercase, lowercase, and numeric characters"
    
    return True, None
