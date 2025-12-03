"""
╔════════════════════════════════════════════════════════════════════════════╗
║  SCRIPT LIBRARY SCHEMAS                                                     ║
║  Pydantic Models für die Script Library API                                 ║
╚════════════════════════════════════════════════════════════════════════════╝
"""

from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field
from datetime import datetime
from enum import Enum


# =============================================================================
# ENUMS
# =============================================================================

class ScriptCategoryEnum(str, Enum):
    """Kategorien von Scripts."""
    erstkontakt = "erstkontakt"
    follow_up = "follow_up"
    einwand = "einwand"
    closing = "closing"
    onboarding = "onboarding"
    reaktivierung = "reaktivierung"
    social_media = "social_media"


class ScriptContextEnum(str, Enum):
    """Spezifischer Kontext."""
    # Erstkontakt
    warm_familie = "warm_familie"
    warm_freunde = "warm_freunde"
    kalt_event = "kalt_event"
    kalt_social = "kalt_social"
    kalt_gemeinsam = "kalt_gemeinsam"
    online_lead = "online_lead"
    
    # Follow-Up
    nach_praesentation = "nach_praesentation"
    ghosted = "ghosted"
    langzeit = "langzeit"
    
    # Einwand
    keine_zeit = "keine_zeit"
    kein_geld = "kein_geld"
    partner_fragen = "partner_fragen"
    mlm_pyramide = "mlm_pyramide"
    kenne_niemanden = "kenne_niemanden"
    nicht_verkaufer = "nicht_verkaufer"
    schon_versucht = "schon_versucht"
    nur_oben = "nur_oben"
    nachdenken = "nachdenken"
    
    # Closing
    soft_close = "soft_close"
    assumptive_close = "assumptive_close"
    urgency_close = "urgency_close"
    
    # Onboarding
    willkommen = "willkommen"
    erste_schritte = "erste_schritte"
    team_motivation = "team_motivation"
    
    # Reaktivierung
    inaktive_kunden = "inaktive_kunden"
    inaktive_partner = "inaktive_partner"
    
    # Social Media
    story_engagement = "story_engagement"
    post_follow_up = "post_follow_up"
    neuer_follower = "neuer_follower"


class RelationshipLevelEnum(str, Enum):
    """Beziehungslevel."""
    kalt = "kalt"
    lauwarm = "lauwarm"
    warm = "warm"
    heiss = "heiss"


class DISGTypeEnum(str, Enum):
    """DISG Persönlichkeitstypen."""
    D = "D"  # Dominant
    I = "I"  # Initiativ
    S = "S"  # Stetig
    G = "G"  # Gewissenhaft


# =============================================================================
# REQUEST SCHEMAS
# =============================================================================

class ScriptQueryRequest(BaseModel):
    """Query-Parameter für Script-Suche."""
    
    category: Optional[ScriptCategoryEnum] = Field(None, description="Kategorie filtern")
    context: Optional[ScriptContextEnum] = Field(None, description="Kontext filtern")
    relationship_level: Optional[RelationshipLevelEnum] = Field(None, description="Beziehungslevel filtern")
    disg_type: Optional[DISGTypeEnum] = Field(None, description="DISG-Typ für Anpassung")
    vertical: str = Field("network_marketing", description="Branche")
    language: str = Field("de", description="Sprache")
    adapt_to_disg: bool = Field(True, description="Scripts an DISG anpassen")
    limit: int = Field(10, ge=1, le=50, description="Max. Anzahl")
    
    class Config:
        json_schema_extra = {
            "example": {
                "category": "einwand",
                "context": "keine_zeit",
                "disg_type": "S",
                "adapt_to_disg": True,
                "limit": 5
            }
        }


class ScriptSuggestionRequest(BaseModel):
    """Request für Script-Vorschlag."""
    
    situation_description: str = Field(..., min_length=5, description="Beschreibung der Situation")
    disg_type: Optional[DISGTypeEnum] = Field(None, description="DISG-Typ")
    relationship_level: Optional[RelationshipLevelEnum] = Field(None, description="Beziehungslevel")
    contact_name: Optional[str] = Field(None, description="Name des Kontakts")
    variables: Optional[Dict[str, str]] = Field(None, description="Variablen zum Ersetzen")
    
    class Config:
        json_schema_extra = {
            "example": {
                "situation_description": "Kunde sagt er hat keine Zeit",
                "disg_type": "D",
                "contact_name": "Max",
                "variables": {"Produkt": "BalanceOil"}
            }
        }


class ScriptUsageLogRequest(BaseModel):
    """Request für Script-Usage-Logging."""
    
    script_id: str = Field(..., description="Script-ID")
    was_sent: bool = Field(True, description="Wurde gesendet?")
    got_reply: bool = Field(False, description="Antwort erhalten?")
    was_positive: bool = Field(False, description="Positive Antwort?")
    converted: bool = Field(False, description="Konvertiert?")
    response_time_minutes: Optional[int] = Field(None, description="Antwortzeit in Minuten")
    channel: Optional[str] = Field(None, description="Kanal (instagram, whatsapp, etc.)")
    disg_type: Optional[DISGTypeEnum] = Field(None, description="DISG-Typ des Kontakts")


# =============================================================================
# RESPONSE SCHEMAS
# =============================================================================

class ScriptPerformanceResponse(BaseModel):
    """Performance-Metriken eines Scripts."""
    
    usage_count: int = 0
    reply_rate: float = Field(0.0, description="% die geantwortet haben")
    positive_rate: float = Field(0.0, description="% positive Antworten")
    conversion_rate: float = Field(0.0, description="% Konversionen")
    avg_response_time: float = Field(0.0, description="Durchschnittliche Antwortzeit")
    best_for_disg: Optional[str] = Field(None, description="Bester DISG-Typ")
    best_for_channel: Optional[str] = Field(None, description="Bester Kanal")


class ScriptResponse(BaseModel):
    """Ein einzelnes Script."""
    
    id: str
    number: int = Field(..., description="Script-Nummer (1-52)")
    name: str
    category: str
    context: str
    relationship_level: str
    text: str
    description: Optional[str] = None
    variables: List[str] = Field(default_factory=list)
    vertical: str = "network_marketing"
    language: str = "de"
    tags: List[str] = Field(default_factory=list)
    performance: Optional[ScriptPerformanceResponse] = None
    adapted_for_disg: Optional[str] = Field(None, description="Für welchen DISG-Typ angepasst")
    tone_recommendation: Optional[str] = Field(None, description="Empfohlener Ton")
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    
    class Config:
        json_schema_extra = {
            "example": {
                "id": "123e4567-e89b-12d3-a456-426614174000",
                "number": 20,
                "name": "Zeit-Einwand (Standard)",
                "category": "einwand",
                "context": "keine_zeit",
                "relationship_level": "warm",
                "text": "Das verstehe ich total! Zeit ist wertvoll...",
                "description": "Standard-Antwort auf Keine-Zeit-Einwand",
                "variables": ["gewünschtes Ergebnis", "X"],
                "tags": ["einwand", "zeit", "hypothetisch"],
                "adapted_for_disg": "S",
                "tone_recommendation": "reassuring"
            }
        }


class ScriptListResponse(BaseModel):
    """Liste von Scripts."""
    
    scripts: List[ScriptResponse]
    total: int
    category: Optional[str] = None
    context: Optional[str] = None
    disg_adapted: bool = False


class ScriptCategorySummary(BaseModel):
    """Zusammenfassung einer Kategorie."""
    
    category: str
    name: str
    description: str
    script_count: int
    contexts: List[str]


class ScriptLibraryOverview(BaseModel):
    """Übersicht über die gesamte Script Library."""
    
    total_scripts: int
    categories: List[ScriptCategorySummary]
    verticals: List[str]
    languages: List[str]


class DISGAdaptationHints(BaseModel):
    """Anpassungs-Hinweise für DISG-Typ."""
    
    disg_type: str
    name: str
    rules: List[str]
    remove_elements: List[str]
    add_elements: List[str]
    tone: str
    max_length_factor: float


# =============================================================================
# EXPORTS
# =============================================================================

__all__ = [
    # Enums
    "ScriptCategoryEnum",
    "ScriptContextEnum",
    "RelationshipLevelEnum",
    "DISGTypeEnum",
    # Request
    "ScriptQueryRequest",
    "ScriptSuggestionRequest",
    "ScriptUsageLogRequest",
    # Response
    "ScriptPerformanceResponse",
    "ScriptResponse",
    "ScriptListResponse",
    "ScriptCategorySummary",
    "ScriptLibraryOverview",
    "DISGAdaptationHints",
]

