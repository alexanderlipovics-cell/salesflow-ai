"""
Secure Configuration for SalesFlow AI.

Validates all required secrets at startup and provides
type-safe access to configuration values.
"""
import os
import secrets
from functools import lru_cache
from typing import Optional

from pydantic import Field, field_validator, model_validator
from pydantic_settings import BaseSettings


class SecurityConfigError(Exception):
    """Raised when security configuration is invalid."""
    pass


class Settings(BaseSettings):
    """
    Application settings with security validation.
    
    All secrets are validated at startup to prevent
    running with insecure defaults.
    """
    
    # ============= Application =============
    APP_NAME: str = "SalesFlow AI"
    APP_VERSION: str = "1.0.0"
    ENVIRONMENT: str = Field(default="development")
    DEBUG: bool = Field(default=False)
    
    # ============= JWT Settings =============
    JWT_SECRET_KEY: str = Field(
        ...,
        min_length=32,
        description="Secret key for JWT signing (min 32 chars)"
    )
    JWT_REFRESH_SECRET_KEY: str = Field(
        ...,
        min_length=32,
        description="Secret key for refresh token signing"
    )
    JWT_ALGORITHM: str = Field(default="HS256")
    JWT_ACCESS_TOKEN_EXPIRE_MINUTES: int = Field(default=30, ge=5, le=1440)
    JWT_REFRESH_TOKEN_EXPIRE_DAYS: int = Field(default=7, ge=1, le=30)
    
    # ============= Password Policy =============
    PASSWORD_MIN_LENGTH: int = Field(default=12, ge=8)
    PASSWORD_REQUIRE_UPPERCASE: bool = Field(default=True)
    PASSWORD_REQUIRE_LOWERCASE: bool = Field(default=True)
    PASSWORD_REQUIRE_DIGIT: bool = Field(default=True)
    PASSWORD_REQUIRE_SPECIAL: bool = Field(default=True)
    PASSWORD_BCRYPT_ROUNDS: int = Field(default=12, ge=10, le=14)
    
    # ============= Rate Limiting =============
    RATE_LIMIT_ENABLED: bool = Field(default=True)
    RATE_LIMIT_DEFAULT_REQUESTS: int = Field(default=100)
    RATE_LIMIT_DEFAULT_WINDOW_SECONDS: int = Field(default=60)
    RATE_LIMIT_AUTH_REQUESTS: int = Field(default=5)
    RATE_LIMIT_AUTH_WINDOW_SECONDS: int = Field(default=300)
    
    # ============= CORS =============
    CORS_ALLOWED_ORIGINS: list[str] = Field(default_factory=list)
    CORS_ALLOW_CREDENTIALS: bool = Field(default=True)
    CORS_ALLOWED_METHODS: list[str] = Field(
        default=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"]
    )
    CORS_ALLOWED_HEADERS: list[str] = Field(default=["*"])
    
    # ============= Database =============
    DATABASE_URL: str = Field(...)
    SUPABASE_URL: Optional[str] = Field(default=None)
    SUPABASE_SERVICE_KEY: Optional[str] = Field(default=None)
    
    # ============= Encryption =============
    ENCRYPTION_KEY: str = Field(
        ...,
        min_length=32,
        description="Key for field-level encryption (32 bytes base64)"
    )
    
    # ============= Security =============
    ALLOWED_HOSTS: list[str] = Field(default=["*"])
    TRUSTED_PROXIES: list[str] = Field(default_factory=list)
    SESSION_COOKIE_SECURE: bool = Field(default=True)
    SESSION_COOKIE_HTTPONLY: bool = Field(default=True)
    SESSION_COOKIE_SAMESITE: str = Field(default="lax")
    
    # ============= Logging =============
    LOG_LEVEL: str = Field(default="INFO")
    LOG_SANITIZE_ENABLED: bool = Field(default=True)
    
    @field_validator("ENVIRONMENT")
    @classmethod
    def validate_environment(cls, v: str) -> str:
        allowed = ["development", "staging", "production"]
        if v not in allowed:
            raise ValueError(f"ENVIRONMENT must be one of {allowed}")
        return v
    
    @field_validator("CORS_ALLOWED_ORIGINS", mode="before")
    @classmethod
    def parse_cors_origins(cls, v):
        if isinstance(v, str):
            return [origin.strip() for origin in v.split(",") if origin.strip()]
        return v
    
    @field_validator("ALLOWED_HOSTS", mode="before")
    @classmethod
    def parse_allowed_hosts(cls, v):
        if isinstance(v, str):
            return [host.strip() for host in v.split(",") if host.strip()]
        return v
    
    @model_validator(mode="after")
    def validate_production_settings(self):
        """Enforce strict settings in production."""
        if self.ENVIRONMENT == "production":
            errors = []
            
            # Debug must be disabled
            if self.DEBUG:
                errors.append("DEBUG must be False in production")
            
            # CORS must be explicitly configured
            if not self.CORS_ALLOWED_ORIGINS or "*" in self.CORS_ALLOWED_ORIGINS:
                errors.append("CORS_ALLOWED_ORIGINS must be explicitly set in production")
            
            # Hosts must be explicitly configured
            if "*" in self.ALLOWED_HOSTS:
                errors.append("ALLOWED_HOSTS must be explicitly set in production")
            
            # Secure cookies
            if not self.SESSION_COOKIE_SECURE:
                errors.append("SESSION_COOKIE_SECURE must be True in production")
            
            # Rate limiting
            if not self.RATE_LIMIT_ENABLED:
                errors.append("RATE_LIMIT_ENABLED must be True in production")
            
            if errors:
                raise ValueError(f"Production validation failed: {'; '.join(errors)}")
        
        return self
    
    @model_validator(mode="after")
    def validate_secrets_strength(self):
        """Ensure secrets are not weak or default values."""
        weak_patterns = [
            "secret", "password", "changeme", "default",
            "test", "example", "12345", "abcdef"
        ]
        
        secrets_to_check = {
            "JWT_SECRET_KEY": self.JWT_SECRET_KEY,
            "JWT_REFRESH_SECRET_KEY": self.JWT_REFRESH_SECRET_KEY,
            "ENCRYPTION_KEY": self.ENCRYPTION_KEY
        }
        
        for name, value in secrets_to_check.items():
            value_lower = value.lower()
            for pattern in weak_patterns:
                if pattern in value_lower:
                    if self.ENVIRONMENT == "production":
                        raise ValueError(f"{name} appears to be weak or a default value")
        
        return self
    
    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        case_sensitive = True
        extra = "ignore"


@lru_cache()
def get_settings() -> Settings:
    """
    Get cached settings instance.
    
    Raises SecurityConfigError if configuration is invalid.
    """
    try:
        return Settings()
    except Exception as e:
        raise SecurityConfigError(f"Invalid security configuration: {str(e)}")


def generate_secret_key(length: int = 32) -> str:
    """Generate a cryptographically secure secret key."""
    return secrets.token_urlsafe(length)


def validate_startup_security():
    """
    Validate security configuration at startup.
    
    Call this in your application startup to ensure
    all security settings are properly configured.
    """
    try:
        settings = get_settings()
        
        # Additional runtime checks
        checks_passed = []
        warnings = []
        
        # Check JWT secrets are different
        if settings.JWT_SECRET_KEY == settings.JWT_REFRESH_SECRET_KEY:
            warnings.append("JWT_SECRET_KEY and JWT_REFRESH_SECRET_KEY should be different")
        else:
            checks_passed.append("JWT secrets are unique")
        
        # Check environment-specific settings
        if settings.ENVIRONMENT == "production":
            checks_passed.append("Production security settings validated")
        else:
            warnings.append(f"Running in {settings.ENVIRONMENT} mode")
        
        return {
            "status": "ok" if not warnings else "warning",
            "checks_passed": checks_passed,
            "warnings": warnings
        }
        
    except SecurityConfigError as e:
        return {
            "status": "error",
            "error": str(e)
        }
