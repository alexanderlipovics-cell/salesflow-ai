"""
Sales Flow AI - Autopilot Schemas

Pydantic models für Autopilot-Settings
"""

from datetime import datetime
from enum import Enum
from typing import List, Optional

from pydantic import BaseModel, ConfigDict, Field


# ============================================================================
# ENUMS
# ============================================================================


class AutopilotMode(str, Enum):
    """Autopilot Betriebsmodus"""
    
    OFF = "off"           # Deaktiviert
    ASSIST = "assist"     # KI-Vorschläge, manueller Versand
    ONE_CLICK = "one_click"  # Ein-Klick-Versand mit KI-Vorschlag
    AUTO = "auto"         # Vollautomatischer Versand


class AutopilotChannel(str, Enum):
    """Verfügbare Kanäle für Autopilot"""
    
    EMAIL = "email"
    WHATSAPP = "whatsapp"
    LINKEDIN = "linkedin"
    INSTAGRAM = "instagram"
    SMS = "sms"


# ============================================================================
# BASE SCHEMA
# ============================================================================


class AutopilotSettingsBase(BaseModel):
    """Basis-Felder für Autopilot-Settings"""
    
    mode: AutopilotMode = Field(
        default=AutopilotMode.OFF,
        description="Betriebsmodus: off, assist, one_click, auto"
    )
    channels: List[str] = Field(
        default=["email"],
        description="Aktive Kanäle für Autopilot",
        examples=[["email"], ["email", "whatsapp"]]
    )
    max_auto_replies_per_day: int = Field(
        default=10,
        ge=0,
        le=1000,
        description="Maximale automatische Antworten pro Tag"
    )
    is_active: bool = Field(
        default=True,
        description="Ob Autopilot für diesen User/Contact aktiv ist"
    )
    min_confidence: float = Field(
        default=90.0,
        ge=0.0,
        le=100.0,
        description="Minimaler Confidence Score für Auto-Send (0-100)"
    )


# ============================================================================
# CREATE / UPDATE SCHEMA (Request)
# ============================================================================


class AutopilotSettingsCreate(AutopilotSettingsBase):
    """Schema zum Erstellen von Autopilot-Settings"""
    
    contact_id: Optional[str] = Field(
        default=None,
        description="Contact-UUID für spezifische Settings (NULL = global)"
    )


class AutopilotSettingsUpdate(AutopilotSettingsBase):
    """Schema zum Aktualisieren von Autopilot-Settings"""
    
    contact_id: Optional[str] = Field(
        default=None,
        description="Contact-UUID für spezifische Settings (NULL = global)"
    )


# ============================================================================
# READ SCHEMA (Response)
# ============================================================================


class AutopilotSettings(AutopilotSettingsBase):
    """Vollständiges Autopilot-Settings Response Schema"""
    
    id: str = Field(description="Unique Settings ID")
    user_id: str = Field(description="User-UUID")
    contact_id: Optional[str] = Field(
        default=None,
        description="Contact-UUID (NULL = globale User-Settings)"
    )
    created_at: datetime = Field(description="Erstellungszeitpunkt")
    updated_at: datetime = Field(description="Letzte Aktualisierung")

    model_config = ConfigDict(from_attributes=True, protected_namespaces=())


# ============================================================================
# CONVENIENCE SCHEMAS
# ============================================================================


class AutopilotSettingsResponse(BaseModel):
    """Standard API Response für Autopilot-Settings"""
    
    success: bool = True
    settings: AutopilotSettings


class AutopilotSettingsListResponse(BaseModel):
    """API Response für Liste von Autopilot-Settings"""
    
    success: bool = True
    settings: List[AutopilotSettings]
    count: int


# ============================================================================
# EXPORTS
# ============================================================================


__all__ = [
    "AutopilotMode",
    "AutopilotChannel",
    "AutopilotSettingsBase",
    "AutopilotSettingsCreate",
    "AutopilotSettingsUpdate",
    "AutopilotSettings",
    "AutopilotSettingsResponse",
    "AutopilotSettingsListResponse",
]

