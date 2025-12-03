"""
╔════════════════════════════════════════════════════════════════════════════╗
║  SCRIPT LIBRARY MODELS                                                      ║
║  Datenmodelle für die Script Library                                        ║
╚════════════════════════════════════════════════════════════════════════════╝
"""

from typing import Optional, List, Dict, Any
from dataclasses import dataclass, field
from enum import Enum
from datetime import datetime


# =============================================================================
# ENUMS
# =============================================================================

class ScriptCategory(str, Enum):
    """Kategorien von Scripts."""
    ERSTKONTAKT = "erstkontakt"
    FOLLOW_UP = "follow_up"
    EINWAND = "einwand"
    CLOSING = "closing"
    ONBOARDING = "onboarding"
    REAKTIVIERUNG = "reaktivierung"
    SOCIAL_MEDIA = "social_media"


class ScriptContext(str, Enum):
    """Spezifischer Kontext innerhalb einer Kategorie."""
    # Erstkontakt
    WARM_FAMILIE = "warm_familie"
    WARM_FREUNDE = "warm_freunde"
    KALT_EVENT = "kalt_event"
    KALT_SOCIAL = "kalt_social"
    KALT_GEMEINSAM = "kalt_gemeinsam"
    ONLINE_LEAD = "online_lead"
    
    # Follow-Up
    NACH_PRAESENTATION = "nach_praesentation"
    GHOSTED = "ghosted"
    LANGZEIT = "langzeit"
    
    # Einwand
    KEINE_ZEIT = "keine_zeit"
    KEIN_GELD = "kein_geld"
    PARTNER_FRAGEN = "partner_fragen"
    MLM_PYRAMIDE = "mlm_pyramide"
    KENNE_NIEMANDEN = "kenne_niemanden"
    NICHT_VERKAUFER = "nicht_verkaufer"
    SCHON_VERSUCHT = "schon_versucht"
    NUR_OBEN = "nur_oben"
    NACHDENKEN = "nachdenken"
    
    # Closing
    SOFT_CLOSE = "soft_close"
    ASSUMPTIVE_CLOSE = "assumptive_close"
    URGENCY_CLOSE = "urgency_close"
    
    # Onboarding
    WILLKOMMEN = "willkommen"
    ERSTE_SCHRITTE = "erste_schritte"
    TEAM_MOTIVATION = "team_motivation"
    
    # Reaktivierung
    INAKTIVE_KUNDEN = "inaktive_kunden"
    INAKTIVE_PARTNER = "inaktive_partner"
    
    # Social Media
    STORY_ENGAGEMENT = "story_engagement"
    POST_FOLLOW_UP = "post_follow_up"
    NEUER_FOLLOWER = "neuer_follower"


class RelationshipLevel(str, Enum):
    """Beziehungslevel zum Prospect."""
    KALT = "kalt"          # Unbekannt
    LAUWARMER = "lauwarm"   # Leichter Kontakt
    WARM = "warm"           # Bekannt
    HEISS = "heiss"         # Aktiv interessiert


class DISGType(str, Enum):
    """DISG Persönlichkeitstypen."""
    D = "D"  # Dominant - Macher
    I = "I"  # Initiativ - Entertainer
    S = "S"  # Stetig - Teamplayer
    G = "G"  # Gewissenhaft - Analytiker


# =============================================================================
# DATA CLASSES
# =============================================================================

@dataclass
class ScriptVariant:
    """Eine DISG-spezifische Variante eines Scripts."""
    
    disg_type: DISGType
    text: str
    adjustments: List[str] = field(default_factory=list)
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "disg_type": self.disg_type.value,
            "text": self.text,
            "adjustments": self.adjustments,
        }


@dataclass
class ScriptPerformance:
    """Performance-Metriken eines Scripts."""
    
    usage_count: int = 0
    reply_rate: float = 0.0      # % die geantwortet haben
    positive_rate: float = 0.0   # % positive Antworten
    conversion_rate: float = 0.0 # % die convertiert sind
    avg_response_time: float = 0.0
    best_for_disg: Optional[DISGType] = None
    best_for_channel: Optional[str] = None
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "usage_count": self.usage_count,
            "reply_rate": self.reply_rate,
            "positive_rate": self.positive_rate,
            "conversion_rate": self.conversion_rate,
            "avg_response_time": self.avg_response_time,
            "best_for_disg": self.best_for_disg.value if self.best_for_disg else None,
            "best_for_channel": self.best_for_channel,
        }


@dataclass
class Script:
    """Ein vollständiges Script mit allen Metadaten."""
    
    # Identifikation
    id: str
    number: int  # Script-Nummer aus der Library (1-52)
    name: str
    
    # Kategorisierung
    category: ScriptCategory
    context: ScriptContext
    relationship_level: RelationshipLevel
    
    # Content
    text: str  # Haupt-Script-Text
    description: Optional[str] = None
    
    # Variablen
    variables: List[str] = field(default_factory=list)  # z.B. [NAME], [PRODUKT]
    
    # DISG Varianten
    variants: List[ScriptVariant] = field(default_factory=list)
    
    # Metadata
    vertical: str = "network_marketing"
    language: str = "de"
    tags: List[str] = field(default_factory=list)
    
    # Performance
    performance: Optional[ScriptPerformance] = None
    
    # Timestamps
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "id": self.id,
            "number": self.number,
            "name": self.name,
            "category": self.category.value,
            "context": self.context.value,
            "relationship_level": self.relationship_level.value,
            "text": self.text,
            "description": self.description,
            "variables": self.variables,
            "variants": [v.to_dict() for v in self.variants],
            "vertical": self.vertical,
            "language": self.language,
            "tags": self.tags,
            "performance": self.performance.to_dict() if self.performance else None,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }
    
    def get_variant_for_disg(self, disg_type: DISGType) -> Optional[ScriptVariant]:
        """Holt die spezifische Variante für einen DISG-Typ."""
        for variant in self.variants:
            if variant.disg_type == disg_type:
                return variant
        return None


# =============================================================================
# DISG ANPASSUNGS-REGELN
# =============================================================================

DISG_ADAPTATIONS = {
    DISGType.D: {
        "name": "Dominant - Macher",
        "rules": [
            "Kurz und direkt formulieren",
            "Fakten und Ergebnisse betonen",
            "Keine Smalltalk-Elemente",
            "Schnell zum Punkt kommen",
        ],
        "remove_elements": [
            "lange Einleitungen",
            "übermäßige Emojis",
            "emotionale Appelle",
        ],
        "add_elements": [
            "konkrete Zahlen",
            "ROI-Fokus",
            "Entscheidungsoptionen",
        ],
        "tone": "direct",
        "max_length_factor": 0.7,  # 30% kürzer
    },
    DISGType.I: {
        "name": "Initiativ - Entertainer",
        "rules": [
            "Mehr Emojis verwenden",
            "Enthusiastisch schreiben",
            "Soziale Beweise einbauen",
            "Spaß-Faktor betonen",
        ],
        "remove_elements": [
            "zu viele Zahlen",
            "trockene Fakten",
        ],
        "add_elements": [
            "Emojis 🎉🚀",
            "persönliche Stories",
            "Team/Community-Aspekte",
        ],
        "tone": "enthusiastic",
        "max_length_factor": 1.2,  # 20% länger erlaubt
    },
    DISGType.S: {
        "name": "Stetig - Teamplayer",
        "rules": [
            "Druck rausnehmen",
            "Sicherheit betonen",
            "Mehr Zeit geben",
            "Beziehung betonen",
        ],
        "remove_elements": [
            "Dringlichkeit",
            "aggressive CTAs",
            "zu direkte Fragen",
        ],
        "add_elements": [
            "beruhigende Phrasen",
            "Sicherheits-Garantien",
            "Team-Support",
        ],
        "tone": "reassuring",
        "max_length_factor": 1.0,
    },
    DISGType.G: {
        "name": "Gewissenhaft - Analytiker",
        "rules": [
            "Fakten und Zahlen einbauen",
            "Detaillierte Informationen",
            "Logische Argumente",
            "Keine übertriebenen Versprechen",
        ],
        "remove_elements": [
            "vage Aussagen",
            "emotionale Übertreibungen",
            "zu viele Emojis",
        ],
        "add_elements": [
            "Studien-Referenzen",
            "Prozent-Angaben",
            "konkrete Daten",
        ],
        "tone": "evidence_based",
        "max_length_factor": 1.3,  # 30% länger für Details
    },
}


# =============================================================================
# EXPORTS
# =============================================================================

__all__ = [
    # Enums
    "ScriptCategory",
    "ScriptContext",
    "RelationshipLevel",
    "DISGType",
    # Dataclasses
    "Script",
    "ScriptVariant",
    "ScriptPerformance",
    # Constants
    "DISG_ADAPTATIONS",
]

