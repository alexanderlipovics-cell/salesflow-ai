"""
Security Module for SalesFlow AI.

Exports all security components for easy import.
"""

# Legacy security module compatibility
from ..security import (
    SecurityError,
    InvalidTokenError,
    InvalidCredentialsError,
    ALGORITHM,
    ACCESS_TOKEN_EXPIRE_MINUTES,
    REFRESH_TOKEN_EXPIRE_DAYS,
    hash_password as legacy_hash_password,
    verify_password as legacy_verify_password,
    create_access_token as legacy_create_access_token,
    create_refresh_token as legacy_create_refresh_token,
    decode_token,
    create_token_pair as legacy_create_token_pair,
)

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
    "decode_token",
    
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
