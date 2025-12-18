"""
Password Security Module for SalesFlow AI.

Implements secure password handling with:
- bcrypt hashing
- Password policy enforcement
- Breach detection (optional)
- Account lockout
"""
import hashlib
import re
import secrets
import string
from datetime import datetime, timedelta, timezone
from typing import Optional
import logging

import bcrypt
from pydantic import BaseModel

from app.config import get_settings

logger = logging.getLogger(__name__)


class PasswordValidationError(Exception):
    """Password does not meet policy requirements."""
    
    def __init__(self, message: str, violations: list[str]):
        self.message = message
        self.violations = violations
        super().__init__(message)


class PasswordPolicy(BaseModel):
    """Password policy configuration."""
    min_length: int = 12
    require_uppercase: bool = True
    require_lowercase: bool = True
    require_digit: bool = True
    require_special: bool = True
    special_characters: str = "!@#$%^&*()_+-=[]{}|;':\",./<>?"
    max_length: int = 128
    prevent_common: bool = True
    prevent_user_info: bool = True


class LoginAttemptTracker:
    """
    Tracks failed login attempts for account lockout.
    
    In production, use Redis or database for persistence.
    """
    
    def __init__(
        self,
        max_attempts: int = 5,
        lockout_duration_minutes: int = 15,
        progressive_delay: bool = True
    ):
        self.max_attempts = max_attempts
        self.lockout_duration = timedelta(minutes=lockout_duration_minutes)
        self.progressive_delay = progressive_delay
        self._attempts: dict[str, list[datetime]] = {}
        self._lockouts: dict[str, datetime] = {}
    
    def record_attempt(self, identifier: str, success: bool) -> None:
        """Record a login attempt."""
        now = datetime.now(timezone.utc)
        
        if success:
            # Clear attempts on success
            self._attempts.pop(identifier, None)
            self._lockouts.pop(identifier, None)
            return
        
        # Record failed attempt
        if identifier not in self._attempts:
            self._attempts[identifier] = []
        
        self._attempts[identifier].append(now)
        
        # Clean old attempts (outside lockout window)
        cutoff = now - self.lockout_duration
        self._attempts[identifier] = [
            t for t in self._attempts[identifier] if t > cutoff
        ]
        
        # Check if lockout needed
        if len(self._attempts[identifier]) >= self.max_attempts:
            self._lockouts[identifier] = now + self.lockout_duration
            logger.warning(f"Account locked out: {identifier[:20]}...")
    
    def is_locked(self, identifier: str) -> tuple[bool, Optional[int]]:
        """
        Check if account is locked.
        
        Returns:
            Tuple of (is_locked, seconds_remaining)
        """
        if identifier not in self._lockouts:
            return False, None
        
        lockout_until = self._lockouts[identifier]
        now = datetime.now(timezone.utc)
        
        if now >= lockout_until:
            # Lockout expired
            del self._lockouts[identifier]
            return False, None
        
        remaining = int((lockout_until - now).total_seconds())
        return True, remaining
    
    def get_delay(self, identifier: str) -> int:
        """
        Get progressive delay for failed attempts.
        
        Returns delay in seconds.
        """
        if not self.progressive_delay:
            return 0
        
        attempts = len(self._attempts.get(identifier, []))
        if attempts == 0:
            return 0
        
        # Exponential backoff: 1s, 2s, 4s, 8s, 16s...
        return min(2 ** (attempts - 1), 30)
    
    def get_remaining_attempts(self, identifier: str) -> int:
        """Get remaining login attempts before lockout."""
        attempts = len(self._attempts.get(identifier, []))
        return max(0, self.max_attempts - attempts)


# Global tracker instance
login_tracker = LoginAttemptTracker()


# Common passwords list (abbreviated - use full list in production)
COMMON_PASSWORDS = {
    "password", "123456", "12345678", "qwerty", "abc123",
    "monkey", "1234567", "letmein", "trustno1", "dragon",
    "baseball", "iloveyou", "master", "sunshine", "ashley",
    "bailey", "shadow", "123123", "654321", "superman",
    "qazwsx", "michael", "football", "password1", "password123",
    "welcome", "welcome1", "admin", "login", "passw0rd"
}


def get_password_policy() -> PasswordPolicy:
    """Get password policy from settings."""
    settings = get_settings()
    return PasswordPolicy(
        min_length=settings.PASSWORD_MIN_LENGTH,
        require_uppercase=settings.PASSWORD_REQUIRE_UPPERCASE,
        require_lowercase=settings.PASSWORD_REQUIRE_LOWERCASE,
        require_digit=settings.PASSWORD_REQUIRE_DIGIT,
        require_special=settings.PASSWORD_REQUIRE_SPECIAL
    )


def validate_password(
    password: str,
    email: Optional[str] = None,
    username: Optional[str] = None,
    policy: Optional[PasswordPolicy] = None
) -> list[str]:
    """
    Validate password against policy.
    
    Args:
        password: Password to validate
        email: User's email (to prevent in password)
        username: User's username (to prevent in password)
        policy: Custom policy (uses default if None)
    
    Returns:
        List of violation messages (empty if valid)
    """
    policy = policy or get_password_policy()
    violations = []
    
    # Length check
    if len(password) < policy.min_length:
        violations.append(f"Password must be at least {policy.min_length} characters")
    
    if len(password) > policy.max_length:
        violations.append(f"Password must be at most {policy.max_length} characters")
    
    # Character requirements
    if policy.require_uppercase and not re.search(r"[A-Z]", password):
        violations.append("Password must contain at least one uppercase letter")
    
    if policy.require_lowercase and not re.search(r"[a-z]", password):
        violations.append("Password must contain at least one lowercase letter")
    
    if policy.require_digit and not re.search(r"\d", password):
        violations.append("Password must contain at least one digit")
    
    if policy.require_special:
        escaped_special = re.escape(policy.special_characters)
        if not re.search(f"[{escaped_special}]", password):
            violations.append("Password must contain at least one special character")
    
    # Common password check
    if policy.prevent_common:
        if password.lower() in COMMON_PASSWORDS:
            violations.append("Password is too common")
    
    # User info check
    if policy.prevent_user_info:
        password_lower = password.lower()
        
        if email:
            email_parts = email.lower().split("@")[0]
            if len(email_parts) >= 4 and email_parts in password_lower:
                violations.append("Password cannot contain your email")
        
        if username:
            if len(username) >= 4 and username.lower() in password_lower:
                violations.append("Password cannot contain your username")
    
    return violations


def validate_password_strength(password: str) -> dict:
    """
    Calculate password strength score.
    
    Returns dict with score (0-100) and feedback.
    """
    score = 0
    feedback = []
    
    # Length scoring
    length = len(password)
    if length >= 8:
        score += 10
    if length >= 12:
        score += 10
    if length >= 16:
        score += 10
    if length >= 20:
        score += 5
    
    # Character variety
    if re.search(r"[a-z]", password):
        score += 10
    if re.search(r"[A-Z]", password):
        score += 10
    if re.search(r"\d", password):
        score += 10
    if re.search(r"[!@#$%^&*()_+\-=\[\]{}|;':\",./<>?]", password):
        score += 15
    
    # Patterns (reduce score)
    if re.search(r"(.)\1{2,}", password):  # Repeated characters
        score -= 10
        feedback.append("Avoid repeated characters")
    
    if re.search(r"(012|123|234|345|456|567|678|789|890)", password):
        score -= 10
        feedback.append("Avoid sequential numbers")
    
    if re.search(r"(abc|bcd|cde|def|efg|fgh|ghi|hij|ijk|jkl|klm|lmn|mno|nop|opq|pqr|qrs|rst|stu|tuv|uvw|vwx|wxy|xyz)", password.lower()):
        score -= 10
        feedback.append("Avoid sequential letters")
    
    # Common substitutions
    if re.search(r"[@4][a-z]|[3][a-z]|[1!][a-z]|[0][a-z]|[$5][a-z]", password.lower()):
        score -= 5
        feedback.append("Common substitutions (@ for a, 3 for e) are predictable")
    
    # Entropy bonus
    unique_chars = len(set(password))
    if unique_chars >= 10:
        score += 10
    if unique_chars >= 15:
        score += 5
    
    # Normalize score
    score = max(0, min(100, score))
    
    # Strength label
    if score >= 80:
        strength = "very_strong"
    elif score >= 60:
        strength = "strong"
    elif score >= 40:
        strength = "moderate"
    elif score >= 20:
        strength = "weak"
    else:
        strength = "very_weak"
    
    return {
        "score": score,
        "strength": strength,
        "feedback": feedback
    }


def hash_password(password: str) -> str:
    """
    Hash password using bcrypt.
    
    Returns:
        Hashed password string
    """
    settings = get_settings()
    salt = bcrypt.gensalt(rounds=settings.password_bcrypt_rounds)
    hashed = bcrypt.hashpw(password.encode("utf-8"), salt)
    return hashed.decode("utf-8")


def verify_password(password: str, hashed: str) -> bool:
    """
    Verify password against hash.
    
    Returns:
        True if password matches
    """
    try:
        return bcrypt.checkpw(
            password.encode("utf-8"),
            hashed.encode("utf-8")
        )
    except Exception as e:
        logger.warning(f"Password verification error: {str(e)}")
        return False


def generate_password(length: int = 16) -> str:
    """
    Generate a secure random password.
    
    Generated password will meet all policy requirements.
    """
    # Ensure minimum requirements
    password_chars = [
        secrets.choice(string.ascii_uppercase),
        secrets.choice(string.ascii_lowercase),
        secrets.choice(string.digits),
        secrets.choice("!@#$%^&*()_+-=")
    ]
    
    # Fill rest with random characters
    all_chars = string.ascii_letters + string.digits + "!@#$%^&*()_+-="
    remaining = length - len(password_chars)
    password_chars.extend(
        secrets.choice(all_chars) for _ in range(remaining)
    )
    
    # Shuffle
    secrets.SystemRandom().shuffle(password_chars)
    
    return "".join(password_chars)


def generate_reset_token() -> tuple[str, str]:
    """
    Generate a password reset token.
    
    Returns:
        Tuple of (token, hashed_token)
    """
    token = secrets.token_urlsafe(32)
    hashed = hashlib.sha256(token.encode()).hexdigest()
    return token, hashed


def verify_reset_token(token: str, hashed: str) -> bool:
    """Verify a password reset token."""
    token_hash = hashlib.sha256(token.encode()).hexdigest()
    return secrets.compare_digest(token_hash, hashed)


def check_password_breach(password: str) -> bool:
    """
    Check if password appears in known breaches.
    
    Uses k-anonymity with Have I Been Pwned API.
    This is a placeholder - implement with actual API in production.
    
    Returns:
        True if password is found in breaches
    """
    # In production, implement k-anonymity check:
    # 1. SHA1 hash the password
    # 2. Send first 5 chars to HIBP API
    # 3. Check if full hash is in response
    
    # For now, just check against common passwords
    return password.lower() in COMMON_PASSWORDS
