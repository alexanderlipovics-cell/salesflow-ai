"""
╔════════════════════════════════════════════════════════════════════════════╗
║  TEACH-UI SCHEMAS                                                          ║
║  Pydantic Models für Learning System                                       ║
╚════════════════════════════════════════════════════════════════════════════╝

Integration mit Living OS & Sales Brain.
"""

from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field
from enum import Enum
from datetime import datetime


# =============================================================================
# ENUMS
# =============================================================================

class RuleScope(str, Enum):
    personal = "personal"
    team = "team"
    company = "company"


class ChangeType(str, Enum):
    shorter_more_direct = "shorter_more_direct"
    longer_more_detailed = "longer_more_detailed"
    informal_tone = "informal_tone"
    formal_tone = "formal_tone"
    emoji_added = "emoji_added"
    emoji_removed = "emoji_removed"
    question_added = "question_added"
    question_removed = "question_removed"
    cta_changed = "cta_changed"
    greeting_changed = "greeting_changed"
    closing_changed = "closing_changed"
    personalization_added = "personalization_added"
    urgency_added = "urgency_added"
    urgency_removed = "urgency_removed"
    social_proof_added = "social_proof_added"
    price_mention_removed = "price_mention_removed"
    enthusiasm_added = "enthusiasm_added"
    enthusiasm_reduced = "enthusiasm_reduced"
    length_reduced = "length_reduced"
    length_increased = "length_increased"
    custom = "custom"


class Significance(str, Enum):
    none = "none"
    low = "low"
    medium = "medium"
    high = "high"


class PatternStatus(str, Enum):
    candidate = "candidate"
    active = "active"
    testing = "testing"
    archived = "archived"
    rejected = "rejected"


# =============================================================================
# REQUEST SCHEMAS
# =============================================================================

class OverrideContextSchema(BaseModel):
    """Context in dem die Korrektur passierte"""
    
    vertical_id: Optional[str] = None
    company_id: Optional[str] = None
    channel: Optional[str] = None
    lead_id: Optional[str] = None
    lead_status: Optional[str] = None
    message_type: Optional[str] = None
    objection_type: Optional[str] = None
    template_id: Optional[str] = None
    disg_type: Optional[str] = None
    language: Optional[str] = "de"
    day_of_week: Optional[int] = None
    time_of_day: Optional[str] = None


class OverrideDataSchema(BaseModel):
    """Die eigentlichen Override-Daten"""
    
    original_text: str = Field(..., min_length=1)
    final_text: str = Field(..., min_length=1)
    similarity_score: float = Field(..., ge=0, le=1)
    detected_changes: List[str] = Field(default_factory=list)
    context: OverrideContextSchema = Field(default_factory=OverrideContextSchema)


class RuleConfigSchema(BaseModel):
    """Optionale erweiterte Konfiguration"""
    
    priority: int = Field(default=50, ge=0, le=100)
    apply_to: Optional[List[str]] = None  # Channels
    trigger_conditions: Optional[Dict[str, Any]] = None


class TeachRequestSchema(BaseModel):
    """Request für Teach-Action"""
    
    scope: RuleScope
    override: OverrideDataSchema
    note: Optional[str] = Field(None, max_length=500)
    tags: Optional[List[str]] = Field(default_factory=list)
    rule_config: Optional[RuleConfigSchema] = None
    
    class Config:
        json_schema_extra = {
            "example": {
                "scope": "personal",
                "override": {
                    "original_text": "Ich würde mich freuen, wenn wir telefonieren könnten.",
                    "final_text": "Lass uns telefonieren! 📞",
                    "similarity_score": 0.42,
                    "detected_changes": ["shorter_more_direct", "emoji_added", "informal_tone"],
                    "context": {
                        "channel": "whatsapp",
                        "message_type": "follow_up"
                    }
                },
                "note": "Bei Follow-ups immer direkter",
                "tags": ["follow_up", "whatsapp"]
            }
        }


class IgnoreRequestSchema(BaseModel):
    """Request für Ignore-Action"""
    
    original_text: str
    final_text: str
    similarity_score: float
    context: OverrideContextSchema = Field(default_factory=OverrideContextSchema)


class DeepAnalysisRequestSchema(BaseModel):
    """Request für Deep Analysis mit Claude"""
    
    original_text: str = Field(..., min_length=1)
    final_text: str = Field(..., min_length=1)


# =============================================================================
# RESPONSE SCHEMAS
# =============================================================================

class PatternDetectedSchema(BaseModel):
    """Info über erkanntes Pattern"""
    
    pattern_type: str
    signal_count: int
    success_rate: float
    will_become_rule: bool


class TeachResponseSchema(BaseModel):
    """Response für Teach-Action"""
    
    success: bool
    
    created: Dict[str, Optional[str]] = Field(default_factory=dict)
    # signal_id, rule_id, template_id, pattern_id, broadcast_id
    
    xp_earned: int = 0
    message: str
    
    pattern_detected: Optional[PatternDetectedSchema] = None
    
    class Config:
        json_schema_extra = {
            "example": {
                "success": True,
                "created": {
                    "signal_id": "123e4567-e89b-12d3-a456-426614174000",
                    "rule_id": "123e4567-e89b-12d3-a456-426614174001"
                },
                "xp_earned": 30,
                "message": "✅ Regel gespeichert! 🎯 Pattern 'shorter_more_direct' erkannt!",
                "pattern_detected": {
                    "pattern_type": "shorter_more_direct",
                    "signal_count": 5,
                    "success_rate": 0.8,
                    "will_become_rule": True
                }
            }
        }


class TeachStatsSchema(BaseModel):
    """User's Teach Statistics"""
    
    total_teach_actions: int = 0
    rules_created: int = 0
    templates_created: int = 0
    patterns_discovered: int = 0
    
    current_streak: int = 0
    longest_streak: int = 0
    
    total_xp_from_teaching: int = 0
    
    rules_adopted_by_team: int = 0
    template_usage_count: int = 0
    
    pending_patterns: int = 0


class PendingPatternSchema(BaseModel):
    """Pending Pattern (nicht aktiviert)"""
    
    id: str
    pattern_type: str
    signal_count: int
    success_rate: float
    last_signal_at: datetime


class PatternActivateResponseSchema(BaseModel):
    """Response für Pattern-Aktivierung"""
    
    rule_id: str
    xp_earned: int


class DeepAnalysisResponseSchema(BaseModel):
    """Response für Deep Analysis"""
    
    changes: List[str]
    pattern: Optional[str]
    insights: str
    suggested_rule_name: str


# =============================================================================
# EXPORTS
# =============================================================================

__all__ = [
    # Enums
    "RuleScope",
    "ChangeType",
    "Significance",
    "PatternStatus",
    # Request Schemas
    "OverrideContextSchema",
    "OverrideDataSchema",
    "RuleConfigSchema",
    "TeachRequestSchema",
    "IgnoreRequestSchema",
    "DeepAnalysisRequestSchema",
    # Response Schemas
    "PatternDetectedSchema",
    "TeachResponseSchema",
    "TeachStatsSchema",
    "PendingPatternSchema",
    "PatternActivateResponseSchema",
    "DeepAnalysisResponseSchema",
]

