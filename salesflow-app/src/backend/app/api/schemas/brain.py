"""
╔════════════════════════════════════════════════════════════════════════════╗
║  SALES BRAIN SCHEMAS                                                       ║
║  Pydantic Models für das Self-Learning Rules System                        ║
╚════════════════════════════════════════════════════════════════════════════╝

Features:
    - Rule Management (Create, Update, Response)
    - Correction Analysis
    - Push Notification Schedules
    - Morning Briefing & Evening Recap
"""

from enum import Enum
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field
from datetime import datetime, time
from uuid import UUID


# =============================================================================
# ENUMS
# =============================================================================

class RuleType(str, Enum):
    """Typen von Lernregeln."""
    tone = "tone"                    # Wie schreiben (formell, locker, etc.)
    structure = "structure"          # Aufbau von Nachrichten
    vocabulary = "vocabulary"        # Welche Wörter nutzen/vermeiden
    timing = "timing"                # Wann senden, wie lange warten
    channel = "channel"              # Kanal-spezifische Regeln
    objection = "objection"          # Einwandbehandlung
    persona = "persona"              # Lead-Typ-spezifisch
    product = "product"              # Produkt-spezifische Formulierungen
    compliance = "compliance"        # Compliance/rechtliche Regeln
    custom = "custom"                # Benutzerdefiniert


class RuleScope(str, Enum):
    """Geltungsbereich einer Regel."""
    personal = "personal"            # Nur für diesen User
    team = "team"                    # Für das ganze Team/Company
    global_ = "global"               # System-weit (nur Admins)


class RulePriority(str, Enum):
    """Priorität einer Regel."""
    override = "override"            # Überschreibt alles andere (höchste)
    high = "high"                    # Hohe Priorität
    normal = "normal"                # Standard
    suggestion = "suggestion"        # Nur als Vorschlag


class FeedbackType(str, Enum):
    """Feedback-Typ für Korrekturen."""
    personal = "personal"            # Nur für mich lernen
    team = "team"                    # Fürs Team lernen
    ignore = "ignore"                # Nicht lernen


# =============================================================================
# RULE SCHEMAS
# =============================================================================

class RuleCreate(BaseModel):
    """Schema zum Erstellen einer neuen Regel."""
    rule_type: RuleType
    scope: RuleScope = RuleScope.personal
    priority: RulePriority = RulePriority.normal
    
    context: Optional[Dict[str, Any]] = None
    # Beispiel: {"channel": "instagram_dm", "lead_status": "cold"}
    
    title: str = Field(..., min_length=3, max_length=100)
    description: Optional[str] = None
    instruction: str = Field(..., min_length=10)
    
    example_bad: Optional[str] = None
    example_good: Optional[str] = None
    
    class Config:
        json_schema_extra = {
            "example": {
                "rule_type": "tone",
                "scope": "personal",
                "priority": "normal",
                "title": "Direkte Ansprache",
                "instruction": "Verwende nie 'Ich würde gerne...'. Nutze direkte Aussagen.",
                "example_bad": "Ich würde gerne mit dir über deine Ziele sprechen.",
                "example_good": "Lass uns über deine Ziele sprechen!"
            }
        }


class RuleUpdate(BaseModel):
    """Schema zum Aktualisieren einer Regel."""
    priority: Optional[RulePriority] = None
    context: Optional[Dict[str, Any]] = None
    title: Optional[str] = Field(None, min_length=3, max_length=100)
    description: Optional[str] = None
    instruction: Optional[str] = Field(None, min_length=10)
    example_bad: Optional[str] = None
    example_good: Optional[str] = None
    is_active: Optional[bool] = None


class RuleResponse(BaseModel):
    """Antwort-Schema für eine Regel."""
    id: UUID
    rule_type: str
    scope: str
    priority: str
    
    context: Optional[Dict[str, Any]] = None
    
    title: str
    description: Optional[str] = None
    instruction: str
    
    example_bad: Optional[str] = None
    example_good: Optional[str] = None
    
    times_applied: int = 0
    times_helpful: int = 0
    times_ignored: int = 0
    effectiveness_score: Optional[float] = None
    
    is_active: bool = True
    is_verified: bool = False
    
    source_type: Optional[str] = None
    
    created_at: datetime
    updated_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True


class RulesForContext(BaseModel):
    """Kontext für Regel-Abfrage (für CHIEF)."""
    channel: Optional[str] = None
    lead_status: Optional[str] = None
    message_type: Optional[str] = None
    vertical_id: Optional[str] = None


# =============================================================================
# CORRECTION SCHEMAS
# =============================================================================

class CorrectionCreate(BaseModel):
    """Schema zum Loggen einer User-Korrektur."""
    lead_id: Optional[UUID] = None
    original_suggestion: str = Field(..., min_length=1)
    user_final_text: str = Field(..., min_length=1)
    channel: Optional[str] = None
    lead_status: Optional[str] = None
    message_type: Optional[str] = None  # 'first_contact', 'followup', 'reactivation'
    
    class Config:
        json_schema_extra = {
            "example": {
                "original_suggestion": "Ich würde gerne mit dir über unser Produkt sprechen.",
                "user_final_text": "Hey! Lass uns kurz über etwas Spannendes quatschen.",
                "channel": "instagram_dm",
                "lead_status": "cold",
                "message_type": "first_contact"
            }
        }


class CorrectionResponse(BaseModel):
    """Antwort-Schema für eine Korrektur."""
    id: UUID
    original_suggestion: str
    user_final_text: str
    channel: Optional[str] = None
    lead_status: Optional[str] = None
    message_type: Optional[str] = None
    similarity_score: Optional[float] = None
    rule_extracted: bool = False
    user_feedback: Optional[str] = None
    created_at: datetime
    
    class Config:
        from_attributes = True


class CorrectionFeedback(BaseModel):
    """User-Feedback zu einer Korrektur."""
    correction_id: UUID
    feedback: FeedbackType
    # 'personal' = Nur für mich lernen
    # 'team' = Fürs Team lernen
    # 'ignore' = Nicht lernen
    
    class Config:
        json_schema_extra = {
            "example": {
                "correction_id": "123e4567-e89b-12d3-a456-426614174000",
                "feedback": "personal"
            }
        }


class CorrectionAnalysis(BaseModel):
    """Analyse einer Korrektur mit optionalem Regel-Vorschlag."""
    correction_id: UUID
    similarity_score: float
    detected_changes: Dict[str, Any]
    suggested_rule: Optional[RuleCreate] = None
    should_create_rule: bool


class DetectedChange(BaseModel):
    """Ein erkannter Unterschied in einer Korrektur."""
    change_type: str  # 'tone', 'structure', 'vocabulary', etc.
    description: str
    is_learnable: bool
    rule_instruction: Optional[str] = None


# =============================================================================
# PUSH NOTIFICATION SCHEMAS
# =============================================================================

class PushScheduleUpdate(BaseModel):
    """Schema zum Aktualisieren des Push-Schedules."""
    morning_enabled: Optional[bool] = None
    morning_time: Optional[time] = None
    morning_days: Optional[List[int]] = None  # 1=Mo, 7=So
    
    evening_enabled: Optional[bool] = None
    evening_time: Optional[time] = None
    evening_days: Optional[List[int]] = None
    
    timezone: Optional[str] = None
    
    include_stats: Optional[bool] = None
    include_tips: Optional[bool] = None
    include_motivation: Optional[bool] = None
    
    class Config:
        json_schema_extra = {
            "example": {
                "morning_enabled": True,
                "morning_time": "08:30:00",
                "morning_days": [1, 2, 3, 4, 5],
                "timezone": "Europe/Vienna"
            }
        }


class PushScheduleResponse(BaseModel):
    """Antwort-Schema für Push-Schedule."""
    morning_enabled: bool = True
    morning_time: time = time(8, 0)
    morning_days: List[int] = [1, 2, 3, 4, 5]
    
    evening_enabled: bool = True
    evening_time: time = time(18, 0)
    evening_days: List[int] = [1, 2, 3, 4, 5]
    
    timezone: str = "Europe/Vienna"
    
    include_stats: bool = True
    include_tips: bool = True
    include_motivation: bool = True
    
    push_token_registered: bool = False
    
    class Config:
        from_attributes = True


class PushTokenRegister(BaseModel):
    """Schema zum Registrieren eines Push Tokens."""
    token: str
    platform: str = Field(..., pattern="^(ios|android|web)$")


# =============================================================================
# MORNING BRIEFING
# =============================================================================

class TopLead(BaseModel):
    """Ein priorisierter Lead für das Morning Briefing."""
    id: Optional[UUID] = None
    name: str
    status: str
    channel: Optional[str] = None
    priority: str = "normal"  # 'high', 'normal', 'low'
    last_contact_days: Optional[int] = None
    suggested_action: Optional[str] = None


class MorningBriefing(BaseModel):
    """Morning Push Content."""
    greeting: str
    date: str
    
    # Ziele
    daily_targets: Dict[str, int]  # {"new_contacts": 5, "followups": 3, "reactivations": 2}
    
    # Prioritäten
    top_leads: List[TopLead]  # Top 3 Leads für heute
    
    # Motivation
    streak_days: int = 0
    motivational_message: str
    
    # Quick Actions
    quick_actions: List[str]
    
    class Config:
        json_schema_extra = {
            "example": {
                "greeting": "Guten Morgen, Max! ☀️",
                "date": "Dienstag, 3. Dezember 2025",
                "daily_targets": {
                    "new_contacts": 5,
                    "followups": 3,
                    "reactivations": 2
                },
                "top_leads": [
                    {
                        "name": "Anna Müller",
                        "status": "hot",
                        "channel": "whatsapp",
                        "priority": "high"
                    }
                ],
                "streak_days": 7,
                "motivational_message": "🔥 7 Tage in Folge aktiv! Weiter so!",
                "quick_actions": [
                    "📱 5 neue Kontakte ansprechen",
                    "🔄 3 Follow-ups senden",
                    "🎯 Anna Müller kontaktieren"
                ]
            }
        }


# =============================================================================
# EVENING RECAP
# =============================================================================

class EveningRecap(BaseModel):
    """Evening Push Content."""
    greeting: str
    
    # Ergebnisse
    completed: Dict[str, int]
    targets: Dict[str, int]
    completion_rate: float
    
    # Highlights
    wins: List[str]  # Was gut lief
    lessons: List[str]  # Was gelernt wurde
    
    # Learning
    new_rules_learned: int = 0
    templates_improved: int = 0
    
    # Morgen
    tomorrow_preview: str
    
    class Config:
        json_schema_extra = {
            "example": {
                "greeting": "Super Tag, Max! 🏆",
                "completed": {
                    "new_contacts": 6,
                    "followups": 3,
                    "reactivations": 2
                },
                "targets": {
                    "new_contacts": 5,
                    "followups": 3,
                    "reactivations": 2
                },
                "completion_rate": 110.0,
                "wins": [
                    "🎉 1 Deal abgeschlossen!",
                    "💬 4 Antworten erhalten",
                    "✅ Tagesziel übertroffen!"
                ],
                "lessons": [
                    "📚 2 neue Regeln gelernt"
                ],
                "new_rules_learned": 2,
                "templates_improved": 1,
                "tomorrow_preview": "Morgen: 5 Follow-ups geplant"
            }
        }


# =============================================================================
# RULE APPLICATION TRACKING
# =============================================================================

class RuleApplicationLog(BaseModel):
    """Log einer Regel-Anwendung."""
    rule_id: UUID
    message_id: Optional[UUID] = None
    context: Optional[Dict[str, Any]] = None


class RuleFeedback(BaseModel):
    """Feedback zu einer Regel-Anwendung."""
    application_id: UUID
    was_helpful: bool
    user_modified: bool = False


# =============================================================================
# CHIEF INTEGRATION
# =============================================================================

class RulesForChief(BaseModel):
    """Formatierte Regeln für CHIEF Prompt."""
    rules_count: int
    formatted_prompt: str
    rule_ids: List[UUID]  # Für Tracking welche Regeln verwendet wurden


# =============================================================================
# DETECTION SCHEMAS (v2)
# =============================================================================

class CorrectionDetectionRequest(BaseModel):
    """Request für Korrektur-Erkennung."""
    original_suggestion: str = Field(..., min_length=1)
    user_final_text: str = Field(..., min_length=1)
    channel: Optional[str] = None
    lead_status: Optional[str] = None
    message_type: Optional[str] = None
    lead_id: Optional[UUID] = None
    disg_type: Optional[str] = None
    
    class Config:
        json_schema_extra = {
            "example": {
                "original_suggestion": "Ich würde gerne mit dir über unser Produkt sprechen.",
                "user_final_text": "Lass uns kurz über etwas Spannendes sprechen!",
                "channel": "instagram_dm",
                "lead_status": "cold"
            }
        }


class SuggestedRulePreview(BaseModel):
    """Vorschau einer vorgeschlagenen Regel im Modal."""
    title: str
    instruction: str
    rule_type: str
    confidence: Optional[float] = None


class CorrectionDetectionResponse(BaseModel):
    """Response für Korrektur-Erkennung."""
    should_show_modal: bool = Field(..., description="Soll das Teach-Modal gezeigt werden?")
    correction_id: Optional[str] = Field(None, description="ID der gespeicherten Korrektur")
    similarity_score: float = Field(..., description="Ähnlichkeit (0-1)")
    change_significance: str = Field(..., description="minor, moderate, oder significant")
    suggested_rule: Optional[SuggestedRulePreview] = None
    reason: Optional[str] = Field(None, description="Warum kein Modal (wenn should_show_modal=false)")
    change_summary: List[str] = Field([], description="Lesbare Zusammenfassung der Änderungen")
    
    class Config:
        json_schema_extra = {
            "example": {
                "should_show_modal": True,
                "correction_id": "123e4567-e89b-12d3-a456-426614174000",
                "similarity_score": 0.72,
                "change_significance": "significant",
                "suggested_rule": {
                    "title": "Direkte Ansprache",
                    "instruction": "Vermeide 'Ich würde gerne...' - nutze direkte Aussagen.",
                    "rule_type": "tone",
                    "confidence": 0.85
                },
                "change_summary": [
                    "Unsichere Formulierungen entfernt",
                    "Direkter formuliert"
                ]
            }
        }


class CorrectionFeedbackRequest(BaseModel):
    """Request für Korrektur-Feedback (aus Modal)."""
    correction_id: UUID
    feedback: FeedbackType
    
    class Config:
        json_schema_extra = {
            "example": {
                "correction_id": "123e4567-e89b-12d3-a456-426614174000",
                "feedback": "personal"
            }
        }


class CorrectionFeedbackResponse(BaseModel):
    """Response für Korrektur-Feedback."""
    success: bool
    rule_created: bool
    rule_id: Optional[str] = None
    rule_title: Optional[str] = None


# =============================================================================
# EXPORTS
# =============================================================================

__all__ = [
    # Enums
    "RuleType",
    "RuleScope", 
    "RulePriority",
    "FeedbackType",
    # Rules
    "RuleCreate",
    "RuleUpdate",
    "RuleResponse",
    "RulesForContext",
    # Corrections
    "CorrectionCreate",
    "CorrectionResponse",
    "CorrectionFeedback",
    "CorrectionAnalysis",
    "DetectedChange",
    # Detection v2
    "CorrectionDetectionRequest",
    "CorrectionDetectionResponse",
    "SuggestedRulePreview",
    "CorrectionFeedbackRequest",
    "CorrectionFeedbackResponse",
    # Push
    "PushScheduleUpdate",
    "PushScheduleResponse",
    "PushTokenRegister",
    # Briefings
    "TopLead",
    "MorningBriefing",
    "EveningRecap",
    # Tracking
    "RuleApplicationLog",
    "RuleFeedback",
    # CHIEF
    "RulesForChief",
]

