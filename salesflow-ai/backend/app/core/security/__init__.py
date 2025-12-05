"""
Security Module for SalesFlow AI.

Exports all security components for easy import.
"""

# ============================================
# Legacy compatibility exceptions (defined here to avoid circular imports)
# ============================================

class SecurityError(Exception):
    """Base exception for security-related errors."""
    pass


class InvalidTokenError(SecurityError):
    """Raised when a JWT token is invalid or expired."""
    pass


class InvalidCredentialsError(SecurityError):
    """Raised when credentials are invalid."""
    pass


# Constants
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24  # 24 hours
REFRESH_TOKEN_EXPIRE_DAYS = 30


# ============================================
# Functions imported from legacy security module
# ============================================
def verify_access_token(token: str):
    """Verify an access token and return its payload."""
    from jose import jwt, JWTError
    from app.config import get_settings
    settings = get_settings()
    try:
        payload = jwt.decode(token, settings.jwt_secret_key, algorithms=[ALGORITHM])
        return payload
    except JWTError:
        raise InvalidTokenError("Invalid access token")


def verify_refresh_token(token: str):
    """Verify a refresh token and return its payload."""
    from jose import jwt, JWTError
    from app.config import get_settings
    settings = get_settings()
    try:
        payload = jwt.decode(token, settings.jwt_refresh_secret_key, algorithms=[ALGORITHM])
        return payload
    except JWTError:
        raise InvalidTokenError("Invalid refresh token")


# JWT
from .jwt import (
    TokenType,
    TokenPayload,
    TokenPair,
    TokenBlacklist,
    token_blacklist,
    JWTError,
    TokenExpiredError,
    TokenInvalidError,
    TokenBlacklistedError,
    TokenFamilyCompromisedError,
    create_access_token,
    create_refresh_token,
    create_token_pair,
    decode_access_token,
    decode_refresh_token,
    rotate_refresh_token,
    revoke_token,
    revoke_all_user_tokens,
    get_token_fingerprint,
)

# Password
from .password import (
    PasswordValidationError,
    PasswordPolicy,
    LoginAttemptTracker,
    login_tracker,
    get_password_policy,
    validate_password,
    validate_password_strength,
    hash_password,
    verify_password,
    generate_password,
    generate_reset_token,
    verify_reset_token,
    check_password_breach,
)

# Sanitization
from .sanitization import (
    SanitizationError,
    SanitizationConfig,
    sanitize_string,
    sanitize_dict,
    sanitize_list,
    sanitize_for_log,
    sanitize_email,
    sanitize_url,
    sanitize_filename,
    sanitize_model,
    sanitize_input,
    LogSanitizingFilter,
    check_sql_injection,
    check_path_traversal,
)

# Encryption
from .encryption import (
    EncryptionError,
    DecryptionError,
    FieldEncryptor,
    get_encryptor,
    encrypt_field,
    decrypt_field,
    encrypt_deterministic,
    mask_field,
    mask_email,
    mask_phone,
    EncryptedField,
    generate_encryption_key,
    rotate_encryption_key,
)

__all__ = [
    # Legacy compatibility
    "SecurityError",
    "InvalidTokenError",
    "InvalidCredentialsError",
    "ALGORITHM",
    "ACCESS_TOKEN_EXPIRE_MINUTES",
    "REFRESH_TOKEN_EXPIRE_DAYS",
    "verify_access_token",
    "verify_refresh_token",
    
    # JWT
    "TokenType",
    "TokenPayload",
    "TokenPair",
    "TokenBlacklist",
    "token_blacklist",
    "JWTError",
    "TokenExpiredError",
    "TokenInvalidError",
    "TokenBlacklistedError",
    "TokenFamilyCompromisedError",
    "create_access_token",
    "create_refresh_token",
    "create_token_pair",
    "decode_access_token",
    "decode_refresh_token",
    "rotate_refresh_token",
    "revoke_token",
    "revoke_all_user_tokens",
    "get_token_fingerprint",
    
    # Password
    "PasswordValidationError",
    "PasswordPolicy",
    "LoginAttemptTracker",
    "login_tracker",
    "get_password_policy",
    "validate_password",
    "validate_password_strength",
    "hash_password",
    "verify_password",
    "generate_password",
    "generate_reset_token",
    "verify_reset_token",
    "check_password_breach",
    
    # Sanitization
    "SanitizationError",
    "SanitizationConfig",
    "sanitize_string",
    "sanitize_dict",
    "sanitize_list",
    "sanitize_for_log",
    "sanitize_email",
    "sanitize_url",
    "sanitize_filename",
    "sanitize_model",
    "sanitize_input",
    "LogSanitizingFilter",
    "check_sql_injection",
    "check_path_traversal",
    
    # Encryption
    "EncryptionError",
    "DecryptionError",
    "FieldEncryptor",
    "get_encryptor",
    "encrypt_field",
    "decrypt_field",
    "encrypt_deterministic",
    "mask_field",
    "mask_email",
    "mask_phone",
    "EncryptedField",
    "generate_encryption_key",
    "rotate_encryption_key",
]
