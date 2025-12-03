# Configuration Management
import os
from dotenv import load_dotenv
from pydantic_settings import BaseSettings

# Load environment variables
load_dotenv()  # Reload trigger

class Settings(BaseSettings):
    """Application configuration"""
    OPENAI_API_KEY: str = ""
    SUPABASE_URL: str = ""
    SUPABASE_KEY: str = ""
    SUPABASE_SERVICE_KEY: str = ""
    DATABASE_URL: str = ""
    BACKEND_PORT: int = 8000
    DEBUG: bool = False
    ENVIRONMENT: str = "development"
    
    # OpenAI Settings
    OPENAI_TEAM_CHIEF_MODEL: str = "gpt-4o-mini"  # FIXED: was "gpt-4.1-mini"
    OPENAI_MAX_RETRIES: int = 3
    OPENAI_TIMEOUT: int = 30  # seconds
    
    # Caching
    TEAM_CHIEF_CACHE_TTL: int = 3600  # 1 hour in seconds
    
    # Rate Limiting
    TEAM_CHIEF_RATE_LIMIT: int = 10  # requests per hour per user
    
    # Cost Tracking
    TRACK_LLM_COSTS: bool = True
    
    class Config:
        env_file = ".env"
        case_sensitive = False
        extra = "ignore"  # Ignore extra fields from .env

    @property
    def environment(self) -> str:
        """Returns environment name"""
        return self.ENVIRONMENT

settings = Settings()

# Legacy config object for backward compatibility
class Config:
    """Legacy Application configuration"""
    OPENAI_API_KEY = settings.OPENAI_API_KEY
    SUPABASE_URL = settings.SUPABASE_URL
    SUPABASE_KEY = settings.SUPABASE_KEY or settings.SUPABASE_SERVICE_KEY
    DATABASE_URL = settings.DATABASE_URL
    BACKEND_PORT = settings.BACKEND_PORT
    DEBUG = settings.DEBUG

config = Config()

