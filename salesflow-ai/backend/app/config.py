"""
Konfigurationsmodul für das Sales Flow AI Backend.
Lädt Umgebungsvariablen aus .env Datei.

Security-Settings gemäß SECURITY_AUDIT.md integriert.
"""

import secrets
from typing import List, Optional

from dotenv import load_dotenv
from pydantic import Field
from pydantic_settings import BaseSettings

load_dotenv()


def _generate_default_key() -> str:
    """Generiert einen sicheren Default-Key für Development."""
    return secrets.token_urlsafe(32)


class Settings(BaseSettings):
    """Zentrale App-Einstellungen, geladen aus Environment-Variablen."""

    # ============= Application =============
    project_name: str = Field(default="Sales Flow AI Backend")
    environment: str = Field(default="development")
    debug: bool = Field(default=False)
    
    # ============= AI =============
    openai_api_key: Optional[str] = Field(default=None)
    openai_model: str = Field(default="gpt-4o-mini")
    anthropic_api_key: Optional[str] = Field(default=None)
    
    # ============= Database =============
    supabase_url: Optional[str] = Field(default=None)
    supabase_service_role_key: Optional[str] = Field(default=None)
    database_url: Optional[str] = Field(default=None)
    
    # ============= User Defaults =============
    default_org_id: Optional[str] = Field(default="demo-org")
    default_user_id: Optional[str] = Field(default="demo-user")
    default_user_name: Optional[str] = Field(default="Demo User")
    
    # ============= JWT Settings =============
    jwt_secret_key: str = Field(
        default="CHANGE_THIS_SECRET_KEY_IN_PRODUCTION_USE_STRONG_RANDOM_STRING",
        description="Secret key for JWT token encoding/decoding"
    )
    jwt_refresh_secret_key: str = Field(
        default="CHANGE_THIS_REFRESH_SECRET_KEY_IN_PRODUCTION",
        description="Secret key for refresh token signing"
    )
    jwt_algorithm: str = Field(default="HS256", description="JWT algorithm")
    jwt_access_token_expire_minutes: int = Field(default=30, description="Access token expiry in minutes")
    jwt_refresh_token_expire_days: int = Field(default=7, description="Refresh token expiry in days")
    
    # Alias für Uppercase-Zugriff (Kompatibilität mit Security-Modulen)
    @property
    def JWT_SECRET_KEY(self) -> str:
        return self.jwt_secret_key
    
    @property
    def JWT_REFRESH_SECRET_KEY(self) -> str:
        return self.jwt_refresh_secret_key
    
    @property
    def JWT_ALGORITHM(self) -> str:
        return self.jwt_algorithm
    
    @property
    def JWT_ACCESS_TOKEN_EXPIRE_MINUTES(self) -> int:
        return self.jwt_access_token_expire_minutes
    
    @property
    def JWT_REFRESH_TOKEN_EXPIRE_DAYS(self) -> int:
        return self.jwt_refresh_token_expire_days
    
    # ============= Password Policy =============
    password_min_length: int = Field(default=12, description="Minimum password length")
    password_require_uppercase: bool = Field(default=True)
    password_require_lowercase: bool = Field(default=True)
    password_require_digit: bool = Field(default=True)
    password_require_special: bool = Field(default=True)
    password_bcrypt_rounds: int = Field(default=12, description="bcrypt cost factor")
    
    @property
    def PASSWORD_MIN_LENGTH(self) -> int:
        return self.password_min_length
    
    @property
    def PASSWORD_REQUIRE_UPPERCASE(self) -> bool:
        return self.password_require_uppercase
    
    @property
    def PASSWORD_REQUIRE_LOWERCASE(self) -> bool:
        return self.password_require_lowercase
    
    @property
    def PASSWORD_REQUIRE_DIGIT(self) -> bool:
        return self.password_require_digit
    
    @property
    def PASSWORD_REQUIRE_SPECIAL(self) -> bool:
        return self.password_require_special
    
    @property
    def PASSWORD_BCRYPT_ROUNDS(self) -> int:
        return self.password_bcrypt_rounds
    
    # ============= Encryption =============
    encryption_key: str = Field(
        default_factory=_generate_default_key,
        description="Key for field-level encryption (32 bytes base64)"
    )
    
    @property
    def ENCRYPTION_KEY(self) -> str:
        return self.encryption_key
    
    # ============= Rate Limiting =============
    rate_limit_enabled: bool = Field(default=True)
    rate_limit_default_requests: int = Field(default=100)
    rate_limit_default_window_seconds: int = Field(default=60)
    rate_limit_auth_requests: int = Field(default=5)
    rate_limit_auth_window_seconds: int = Field(default=300)
    
    # ============= CORS =============
    cors_allowed_origins: List[str] = Field(
        default=[
            "https://aura-os-topaz.vercel.app",
            "http://localhost:5173",
            "http://localhost:5174",
        ]
    )

    model_config = {
        "env_file": ".env",
        "env_file_encoding": "utf-8",
        "extra": "ignore",
    }


_settings_instance: Optional[Settings] = None


def get_settings() -> Settings:
    """
    Liefert eine gecachte Settings-Instanz.
    """
    global _settings_instance
    if _settings_instance is None:
        _settings_instance = Settings()
    return _settings_instance


def clear_settings_cache() -> None:
    """Löscht den Settings-Cache (nützlich für Tests)."""
    global _settings_instance
    _settings_instance = None


__all__ = ["Settings", "get_settings", "clear_settings_cache"]
