"""
Konfigurationsmodul für das Sales Flow AI Backend.
"""

from functools import lru_cache
from typing import Optional

from dotenv import load_dotenv
from pydantic import BaseModel, Field

load_dotenv()


class Settings(BaseModel):
    """Zentrale App-Einstellungen, geladen aus Environment-Variablen."""

    project_name: str = Field(default="Sales Flow AI Backend")
    openai_api_key: Optional[str] = Field(default=None, alias="OPENAI_API_KEY")
    openai_model: str = Field(default="gpt-4o-mini", alias="OPENAI_MODEL")
    supabase_url: Optional[str] = Field(default=None, alias="SUPABASE_URL")
    supabase_service_role_key: Optional[str] = Field(
        default=None, alias="SUPABASE_SERVICE_ROLE_KEY"
    )
    default_org_id: Optional[str] = Field(
        default="demo-org", alias="DEFAULT_ORG_ID"
    )
    default_user_id: Optional[str] = Field(
        default="demo-user", alias="DEFAULT_USER_ID"
    )
    default_user_name: Optional[str] = Field(
        default="Demo User", alias="DEFAULT_USER_NAME"
    )

    model_config = {
        "populate_by_name": True,
        "protected_namespaces": (),
    }


@lru_cache
def get_settings() -> Settings:
    """
    Liefert eine gecachte Settings-Instanz.
    Die Nutzung von LRU-Cache verhindert wiederholtes Parsen der Env-Variablen.
    """

    return Settings()  # type: ignore[arg-type]


__all__ = ["Settings", "get_settings"]
