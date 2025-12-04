# Configuration Management
import os
from dotenv import load_dotenv
from pydantic_settings import BaseSettings

# Load environment variables
load_dotenv()

class Settings(BaseSettings):
    """Application configuration"""
    model_config = {"extra": "ignore", "env_file": ".env"}
    
    OPENAI_API_KEY: str = ""
    SUPABASE_URL: str = ""
    SUPABASE_KEY: str = ""
    SUPABASE_SERVICE_KEY: str = ""
    DATABASE_URL: str = ""
    BACKEND_PORT: int = 8000
    DEBUG: bool = False
    ENVIRONMENT: str = "development"
    
    # OpenAI Settings
    OPENAI_TEAM_CHIEF_MODEL: str = "gpt-4o-mini"
    OPENAI_MAX_RETRIES: int = 3
    OPENAI_TIMEOUT: int = 30
    
    # Caching
    TEAM_CHIEF_CACHE_TTL: int = 3600
    
    # Rate Limiting
    TEAM_CHIEF_RATE_LIMIT: int = 10
    
    # Cost Tracking
    TRACK_LLM_COSTS: bool = True

settings = Settings()