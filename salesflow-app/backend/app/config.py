"""
Sales Flow AI - Configuration
Lädt Umgebungsvariablen und stellt Settings bereit.
"""

from pydantic_settings import BaseSettings
from pydantic import Field
from typing import Optional, List
from functools import lru_cache


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""
    
    # ===========================================
    # SUPABASE
    # ===========================================
    SUPABASE_URL: str = Field(
        default="https://lncwvbhcafkdorypnpnz.supabase.co",
        description="Supabase Project URL"
    )
    SUPABASE_KEY: str = Field(
        default="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxuY3d2YmhjYWZrZG9yeXBucG56Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzE3NzQyNjMsImV4cCI6MjA0NzM1MDI2M30.bLhJFHT_AwVlb-jXqpMvEZuGRCqjohULO8cHkfqNRBQ",
        description="Supabase Anon Key"
    )
    SUPABASE_SERVICE_KEY: Optional[str] = Field(None, description="Supabase Service Role Key")
    
    # ===========================================
    # DATABASE (Direct Connection - Optional)
    # ===========================================
    DATABASE_URL: Optional[str] = Field(
        None, 
        description="PostgreSQL connection string for SQLAlchemy"
    )
    
    # ===========================================
    # REDIS (Optional - for caching)
    # ===========================================
    REDIS_HOST: str = Field(default="localhost", description="Redis host")
    REDIS_PORT: int = Field(default=6379, description="Redis port")
    CACHE_ENABLED: bool = Field(default=False, description="Enable Redis caching")
    CACHE_TTL: int = Field(default=3600, description="Default cache TTL in seconds")
    
    # ===========================================
    # OPENAI
    # ===========================================
    OPENAI_API_KEY: str = Field(
        default="sk-placeholder-set-in-env",
        description="OpenAI API Key"
    )
    OPENAI_MODEL: str = Field(default="gpt-4-turbo-preview", description="OpenAI Model")
    OPENAI_MAX_TOKENS: int = Field(default=2000, description="Max tokens per request")
    
    # ===========================================
    # SECURITY
    # ===========================================
    SECRET_KEY: str = Field(
        default="change-this-in-production-min-32-characters",
        description="JWT Secret Key"
    )
    ALGORITHM: str = Field(default="HS256", description="JWT Algorithm")
    ACCESS_TOKEN_EXPIRE_MINUTES: int = Field(default=60, description="Access token lifetime")
    REFRESH_TOKEN_EXPIRE_DAYS: int = Field(default=7, description="Refresh token lifetime")
    
    # ===========================================
    # APP
    # ===========================================
    DEBUG: bool = Field(default=False, description="Debug mode")
    APP_NAME: str = Field(default="Sales Flow AI", description="Application name")
    APP_VERSION: str = Field(default="1.0.0", description="Application version")
    API_PREFIX: str = Field(default="/api", description="API route prefix")
    
    # CORS
    CORS_ORIGINS: str = Field(
        default="http://localhost:3000,http://localhost:19006,http://localhost:8081",
        description="Comma-separated list of allowed origins"
    )
    
    @property
    def cors_origins_list(self) -> List[str]:
        """Parse CORS origins as list."""
        return [origin.strip() for origin in self.CORS_ORIGINS.split(",")]
    
    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        case_sensitive = True


@lru_cache()
def get_settings() -> Settings:
    """Get cached settings instance."""
    return Settings()


# Global settings instance
settings = get_settings()

