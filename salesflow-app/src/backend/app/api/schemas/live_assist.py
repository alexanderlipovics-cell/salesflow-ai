"""
╔════════════════════════════════════════════════════════════════════════════╗
║  LIVE ASSIST SCHEMAS                                                       ║
║  Pydantic Models für Echtzeit-Verkaufsassistenz                            ║
╚════════════════════════════════════════════════════════════════════════════╝

Features:
    - Session Management (Start, End)
    - Live Query Processing
    - Quick Facts & Objection Responses
    - Intent Detection
"""

from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field
from datetime import datetime
from enum import Enum
from uuid import UUID


# =============================================================================
# ENUMS
# =============================================================================

class AssistIntent(str, Enum):
    """Erkannte Absicht einer Anfrage."""
    product_info = "product_info"      # Frage nach Produktdetails
    usp = "usp"                        # Frage nach Alleinstellungsmerkmalen
    objection = "objection"            # Kunde hat Einwand
    facts = "facts"                    # Frage nach Zahlen/Statistiken
    science = "science"                # Frage nach Studien/Wissenschaft
    pricing = "pricing"                # Frage nach Kosten
    comparison = "comparison"          # Vergleich zu Konkurrenz
    story = "story"                    # Frage nach Geschichte/Story
    quick_answer = "quick_answer"      # Allgemeine schnelle Frage
    unknown = "unknown"                # Nicht erkannt


class QueryType(str, Enum):
    """Art der Anfrage."""
    voice = "voice"                    # Spracheingabe
    text = "text"                      # Texteingabe


class SessionOutcome(str, Enum):
    """Ergebnis einer Session."""
    sale_made = "sale_made"            # Verkauf abgeschlossen
    appointment_set = "appointment_set"  # Termin vereinbart
    follow_up_needed = "follow_up_needed"  # Follow-up nötig
    lost = "lost"                      # Verloren
    unknown = "unknown"                # Unbekannt


class ContactMood(str, Enum):
    """Stimmung des Kontakts (v3.3)."""
    positiv = "positiv"
    neutral = "neutral"
    gestresst = "gestresst"
    skeptisch = "skeptisch"
    vorsichtig = "vorsichtig"


class DecisionTendency(str, Enum):
    """Entscheidungstendenz des Kontakts (v3.3)."""
    close_to_yes = "close_to_yes"
    close_to_no = "close_to_no"
    on_hold = "on_hold"
    neutral = "neutral"


class ToneHint(str, Enum):
    """Empfohlener Ton für Antwort (v3.3)."""
    neutral = "neutral"
    direct = "direct"
    reassuring = "reassuring"
    value_focused = "value_focused"
    evidence_based = "evidence_based"


class ObjectionType(str, Enum):
    """Typen von Einwänden."""
    price = "price"                    # Zu teuer
    time = "time"                      # Keine Zeit
    think_about_it = "think_about_it"  # Muss überlegen
    not_interested = "not_interested"  # Kein Interesse
    competitor = "competitor"          # Nutzt Konkurrenz
    trust = "trust"                    # Skeptisch/Misstrauen
    need = "need"                      # Brauche das nicht
    authority = "authority"            # Muss jemand fragen
    already_have = "already_have"      # Habe schon etwas
    bad_experience = "bad_experience"  # Schlechte Erfahrung


class FactType(str, Enum):
    """Typen von Quick Facts."""
    number = "number"                  # Zahlen/Statistiken
    percentage = "percentage"          # Prozentsätze
    comparison = "comparison"          # Vergleiche
    benefit = "benefit"                # Vorteile
    differentiator = "differentiator"  # Unterscheidungsmerkmale
    social_proof = "social_proof"      # Soziale Beweise


# =============================================================================
# REQUEST SCHEMAS
# =============================================================================

class StartSessionRequest(BaseModel):
    """Request zum Starten einer Live Assist Session."""
    
    company_id: Optional[str] = Field(None, description="ID der aktiven Firma")
    vertical: Optional[str] = Field(None, description="Branche (network_marketing, etc.)")
    lead_id: Optional[str] = Field(None, description="ID des Leads im Gespräch")
    
    # Optional Context
    context_notes: Optional[str] = Field(None, description="Notizen zum Kontext")
    
    class Config:
        json_schema_extra = {
            "example": {
                "company_id": "123e4567-e89b-12d3-a456-426614174000",
                "vertical": "network_marketing",
                "context_notes": "Neuer Lead, erstes Gespräch"
            }
        }


class LiveQueryRequest(BaseModel):
    """Request für eine Live-Anfrage."""
    
    session_id: str = Field(..., description="ID der aktiven Session")
    query_text: str = Field(..., min_length=1, description="Die Anfrage des Users")
    query_type: QueryType = Field(QueryType.text, description="Art der Anfrage")
    
    # Optional: Explicit Intent (wenn UI es schon weiß)
    explicit_intent: Optional[AssistIntent] = Field(None, description="Explizit angegebene Absicht")
    
    # Optional: Product Context
    product_id: Optional[str] = Field(None, description="ID des besprochenen Produkts")
    
    class Config:
        json_schema_extra = {
            "example": {
                "session_id": "123e4567-e89b-12d3-a456-426614174000",
                "query_text": "Kunde sagt zu teuer",
                "query_type": "text"
            }
        }


class EndSessionRequest(BaseModel):
    """Request zum Beenden einer Session."""
    
    session_id: str = Field(..., description="ID der Session")
    outcome: Optional[SessionOutcome] = Field(None, description="Ergebnis des Gesprächs")
    user_rating: Optional[int] = Field(None, ge=1, le=5, description="Bewertung 1-5")
    user_feedback: Optional[str] = Field(None, description="Optionales Feedback")
    
    class Config:
        json_schema_extra = {
            "example": {
                "session_id": "123e4567-e89b-12d3-a456-426614174000",
                "outcome": "appointment_set",
                "user_rating": 5
            }
        }


# =============================================================================
# RESPONSE SCHEMAS
# =============================================================================

class QuickFactItem(BaseModel):
    """Ein Quick Fact."""
    
    fact_key: str
    fact_value: str
    fact_short: Optional[str] = None
    fact_type: str
    is_key_fact: bool = False
    source: Optional[str] = None


class StartSessionResponse(BaseModel):
    """Response nach Session-Start."""
    
    session_id: str
    company_name: Optional[str] = None
    
    # Preloaded Context
    key_facts: List[QuickFactItem] = Field(default_factory=list)
    available_products: List[Dict[str, Any]] = Field(default_factory=list)
    
    message: str = "Live Assist aktiv. Frag mich was!"
    
    class Config:
        json_schema_extra = {
            "example": {
                "session_id": "123e4567-e89b-12d3-a456-426614174000",
                "company_name": "Zinzino",
                "key_facts": [
                    {
                        "fact_key": "test_based_nutrition",
                        "fact_short": "Einzige Firma mit Bluttest vor/nach.",
                        "fact_type": "differentiator",
                        "is_key_fact": True
                    }
                ],
                "message": "Live Assist für Zinzino aktiv. Frag mich was!"
            }
        }


class LiveQueryResponse(BaseModel):
    """Response auf eine Live-Anfrage."""
    
    # Main Response
    response_text: str = Field(..., description="Die Hauptantwort")
    response_short: Optional[str] = Field(None, description="Kurze Version für Voice (max 2 Sätze)")
    
    # Intent Detection
    detected_intent: AssistIntent = Field(..., description="Erkannte Absicht")
    confidence: float = Field(0.9, ge=0, le=1, description="Konfidenz der Intent-Erkennung")
    
    # Source Info
    source: str = Field(..., description="Quelle der Antwort")
    source_id: Optional[str] = Field(None, description="ID der Quelle (wenn aus DB)")
    
    # Additional Data
    follow_up_question: Optional[str] = Field(None, description="Vorgeschlagene Gegenfrage")
    related_facts: List[Dict[str, Any]] = Field(default_factory=list, description="Verwandte Fakten")
    
    # For Objections
    objection_type: Optional[str] = Field(None, description="Typ des Einwands (wenn erkannt)")
    response_technique: Optional[str] = Field(None, description="Verwendete Antwort-Technik")
    
    # Timing
    response_time_ms: int = Field(..., description="Antwortzeit in Millisekunden")
    
    # Audio (if TTS enabled)
    audio_url: Optional[str] = Field(None, description="URL zur Audio-Antwort (wenn TTS aktiv)")
    
    # Emotion Data (v3.3)
    contact_mood: Optional[str] = Field(None, description="Erkannte Stimmung des Kontakts")
    engagement_level: Optional[int] = Field(None, ge=1, le=5, description="Engagement-Level 1-5")
    decision_tendency: Optional[str] = Field(None, description="Entscheidungstendenz")
    tone_hint: Optional[str] = Field(None, description="Empfohlener Ton für Antwort")
    
    # DISC Profile (v3.4)
    disc_profile: Optional[Dict[str, Any]] = Field(None, description="Erkanntes DISC-Profil des Kontakts")
    
    # Compliance (v4.0)
    compliance_score: Optional[float] = Field(None, ge=0, le=100, description="Compliance-Score der Antwort (0-100%)")
    compliance_issues: Optional[int] = Field(None, ge=0, description="Anzahl der korrigierten Compliance-Probleme")
    
    class Config:
        json_schema_extra = {
            "example": {
                "response_text": "Verstehe ich. Runtergebrochen sind das etwa 1,50€ am Tag - weniger als ein Kaffee - und du bekommst nach 120 Tagen einen Bluttest, der zeigt, ob es wirklich wirkt.",
                "response_short": "1,50€/Tag, weniger als ein Kaffee, mit Bluttest-Beweis.",
                "detected_intent": "objection",
                "confidence": 0.95,
                "source": "objection_responses",
                "objection_type": "price",
                "response_technique": "reduce_to_daily",
                "follow_up_question": "Was wäre es dir wert, wenn du wüsstest, dass dein Körper optimal versorgt ist?",
                "response_time_ms": 245
            }
        }


class SessionStatsResponse(BaseModel):
    """Stats einer Session."""
    
    session_id: str
    duration_seconds: int
    queries_count: int
    facts_served: int
    objections_handled: int
    
    most_asked_topics: List[str] = Field(default_factory=list)
    objections_encountered: List[str] = Field(default_factory=list)


# =============================================================================
# QUICK ACCESS SCHEMAS (ohne Session)
# =============================================================================

class QuickFactsRequest(BaseModel):
    """Request für Quick Facts ohne aktive Session."""
    
    company_id: Optional[str] = None
    vertical: Optional[str] = None
    fact_type: Optional[FactType] = None
    key_only: bool = False
    query: Optional[str] = None
    limit: int = Field(10, ge=1, le=50)


class ObjectionResponseRequest(BaseModel):
    """Request für Einwand-Antwort ohne aktive Session."""
    
    company_id: Optional[str] = None
    objection_type: ObjectionType
    keywords: Optional[List[str]] = None


class ObjectionResponseItem(BaseModel):
    """Eine Einwand-Antwort."""
    
    id: str
    objection_type: str
    objection_example: Optional[str] = None
    response_short: str
    response_full: Optional[str] = None
    response_technique: Optional[str] = None
    follow_up_question: Optional[str] = None
    success_rate: Optional[float] = None


class VerticalKnowledgeItem(BaseModel):
    """Ein Wissenseintrag."""
    
    id: str
    vertical: str
    knowledge_type: str
    topic: str
    question: Optional[str] = None
    answer_short: str
    answer_full: Optional[str] = None
    keywords: List[str] = Field(default_factory=list)


# =============================================================================
# SEED DATA SCHEMAS
# =============================================================================

class QuickFactCreate(BaseModel):
    """Schema zum Erstellen eines Quick Facts."""
    
    company_id: Optional[str] = None
    product_id: Optional[str] = None
    vertical: Optional[str] = None
    
    fact_type: FactType
    fact_key: str
    fact_value: str
    fact_short: Optional[str] = None
    
    source: Optional[str] = None
    use_in_contexts: List[str] = Field(default_factory=list)
    
    importance: int = Field(50, ge=0, le=100)
    is_key_fact: bool = False
    language: str = "de"


class ObjectionResponseCreate(BaseModel):
    """Schema zum Erstellen einer Einwand-Antwort."""
    
    company_id: Optional[str] = None
    vertical: Optional[str] = None
    
    objection_type: ObjectionType
    objection_keywords: List[str] = Field(default_factory=list)
    objection_example: Optional[str] = None
    
    response_short: str
    response_full: Optional[str] = None
    response_technique: Optional[str] = None
    follow_up_question: Optional[str] = None
    
    source_type: str = "system"
    language: str = "de"


class VerticalKnowledgeCreate(BaseModel):
    """Schema zum Erstellen eines Wissenseintrags."""
    
    vertical: str
    company_id: Optional[str] = None
    
    knowledge_type: str
    topic: str
    question: Optional[str] = None
    answer_short: str
    answer_full: Optional[str] = None
    
    keywords: List[str] = Field(default_factory=list)
    related_topics: List[str] = Field(default_factory=list)
    
    source: Optional[str] = None
    language: str = "de"


# =============================================================================
# COACH ANALYTICS SCHEMAS (v3.3)
# =============================================================================

class CoachTipItem(BaseModel):
    """Ein Coach-Tipp."""
    
    id: str
    title: str
    description: str
    priority: str = Field(..., description="high, medium, low")
    action_type: str = Field(..., description="info, script_change, follow_up, training")


class CoachInsightsResponse(BaseModel):
    """Coach-Insights für einen User."""
    
    user_id: str
    company_id: str
    vertical: Optional[str] = None
    days: int = Field(30, description="Analyse-Zeitraum in Tagen")
    sessions_analyzed: int
    
    moods: List[Dict[str, Any]] = Field(default_factory=list, description="Mood-Verteilung")
    decisions: List[Dict[str, Any]] = Field(default_factory=list, description="Decision-Verteilung")
    tips: List[CoachTipItem] = Field(default_factory=list, description="Personalisierte Tipps")
    
    class Config:
        json_schema_extra = {
            "example": {
                "user_id": "123e4567-e89b-12d3-a456-426614174000",
                "company_id": "123e4567-e89b-12d3-a456-426614174001",
                "vertical": "network_marketing",
                "days": 30,
                "sessions_analyzed": 42,
                "moods": [
                    {"mood": "skeptisch", "count": 18},
                    {"mood": "positiv", "count": 12}
                ],
                "decisions": [
                    {"tendency": "on_hold", "count": 20},
                    {"tendency": "close_to_yes", "count": 10}
                ],
                "tips": [
                    {
                        "id": "high_skepticism",
                        "title": "Viele skeptische Kontakte",
                        "description": "Nutze mehr evidenzbasierte Antworten.",
                        "priority": "high",
                        "action_type": "script_change"
                    }
                ]
            }
        }


class QueryFeedbackRequest(BaseModel):
    """Request für Query-Feedback mit Learning (v3.3)."""
    
    was_helpful: bool = Field(..., description="War die Antwort hilfreich?")
    corrected_intent: Optional[str] = Field(None, description="Korrigierter Intent")
    corrected_objection_type: Optional[str] = Field(None, description="Korrigierter Einwand-Typ")
    feedback_text: Optional[str] = Field(None, description="Zusätzliches Feedback")
    
    class Config:
        json_schema_extra = {
            "example": {
                "was_helpful": False,
                "corrected_intent": "objection",
                "corrected_objection_type": "price",
                "feedback_text": "Kunde meinte Preis, nicht Zeit"
            }
        }


class PerformanceMetricsResponse(BaseModel):
    """Performance-Metriken (v3.3)."""
    
    total_sessions: int
    total_queries: int
    avg_session_duration: int = Field(..., description="Durchschnittliche Session-Dauer in Sekunden")
    avg_response_time_ms: int = Field(..., description="Durchschnittliche Antwortzeit in ms")
    queries_per_session: float
    outcomes: Dict[str, int] = Field(default_factory=dict, description="Session-Outcomes")
    cache_hit_rate: Optional[float] = Field(None, description="Cache-Hit-Rate in %")


class ObjectionAnalyticsItem(BaseModel):
    """Einwand-Statistik."""
    
    objection_type: str
    count: int
    helpful_rate: float = Field(..., description="Hilfreiche Antworten in %")


# =============================================================================
# EXPORTS
# =============================================================================

__all__ = [
    # Enums
    "AssistIntent",
    "QueryType",
    "SessionOutcome",
    "ObjectionType",
    "FactType",
    "ContactMood",
    "DecisionTendency",
    "ToneHint",
    # Session
    "StartSessionRequest",
    "StartSessionResponse",
    "LiveQueryRequest",
    "LiveQueryResponse",
    "EndSessionRequest",
    "SessionStatsResponse",
    # Quick Access
    "QuickFactItem",
    "QuickFactsRequest",
    "ObjectionResponseRequest",
    "ObjectionResponseItem",
    "VerticalKnowledgeItem",
    # Create/Seed
    "QuickFactCreate",
    "ObjectionResponseCreate",
    "VerticalKnowledgeCreate",
    # Coach Analytics (v3.3)
    "CoachTipItem",
    "CoachInsightsResponse",
    "QueryFeedbackRequest",
    "PerformanceMetricsResponse",
    "ObjectionAnalyticsItem",
]

