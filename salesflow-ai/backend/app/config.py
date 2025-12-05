"""
Konfigurationsmodul für das Sales Flow AI Backend.
Lädt Umgebungsvariablen aus .env Datei.
"""

from typing import Optional

from dotenv import load_dotenv
from pydantic import Field
from pydantic_settings import BaseSettings

load_dotenv()


class Settings(BaseSettings):
    """Zentrale App-Einstellungen, geladen aus Environment-Variablen."""

    project_name: str = Field(default="Sales Flow AI Backend")
    openai_api_key: Optional[str] = Field(default=None)
    openai_model: str = Field(default="gpt-4o-mini")
    supabase_url: Optional[str] = Field(default=None)
    supabase_service_role_key: Optional[str] = Field(default=None)
    default_org_id: Optional[str] = Field(default="demo-org")
    default_user_id: Optional[str] = Field(default="demo-user")
    default_user_name: Optional[str] = Field(default="Demo User")

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
