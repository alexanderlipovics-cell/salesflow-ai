"""
╔════════════════════════════════════════════════════════════════════════════╗
║  LIVING OS - PYDANTIC SCHEMAS                                             ║
║  Request/Response Models für die Living OS API                            ║
╚════════════════════════════════════════════════════════════════════════════╝
"""

from typing import Optional, List, Dict, Any
from datetime import datetime
from enum import Enum
from pydantic import BaseModel, Field


# =============================================================================
# ENUMS
# =============================================================================

class SignalType(str, Enum):
    """Typ des Learning Signals"""
    implicit_override = "implicit_override"
    explicit_command = "explicit_command"
    template_created = "template_created"
    template_liked = "template_liked"
    template_rejected = "template_rejected"


class RuleStatus(str, Enum):
    """Status einer Regel"""
    candidate = "candidate"
    active = "active"
    testing = "testing"
    archived = "archived"
    rejected = "rejected"


class BroadcastStatus(str, Enum):
    """Status eines Team-Broadcasts"""
    suggested = "suggested"
    leader_approved = "leader_approved"
    team_active = "team_active"
    team_archived = "team_archived"


class RuleScope(str, Enum):
    """Scope einer Regel"""
    personal = "personal"
    team = "team"
    company = "company"


class ProcessingStatus(str, Enum):
    """Processing Status eines Learning Cases"""
    pending = "pending"
    processing = "processing"
    completed = "completed"
    failed = "failed"


# =============================================================================
# OVERRIDE LOOP
# =============================================================================

class OverrideContext(BaseModel):
    """Kontext für eine Override-Erkennung"""
    channel: Optional[str] = None
    lead_status: Optional[str] = None
    message_type: Optional[str] = None
    objection_type: Optional[str] = None
    template_id: Optional[str] = None
    lead_id: Optional[str] = None


class OverrideDetectRequest(BaseModel):
    """Request für Override-Erkennung"""
    original_text: str = Field(..., description="Der ursprüngliche CHIEF-Vorschlag")
    final_text: str = Field(..., description="Was der User tatsächlich gesendet hat")
    context: OverrideContext = Field(default_factory=OverrideContext)


class OverrideAnalysisResponse(BaseModel):
    """Response der Override-Analyse"""
    is_significant: bool = Field(..., description="War die Änderung signifikant?")
    similarity_score: float = Field(..., description="Ähnlichkeit 0-1 (1 = identisch)")
    detected_changes: List[str] = Field(default_factory=list)
    pattern: Optional[str] = None
    significance: str = Field(default="low")
    could_be_template: bool = False
    template_use_case: Optional[str] = None
    signal_id: Optional[str] = None


class LearningSignalResponse(BaseModel):
    """Learning Signal in der DB"""
    id: str
    user_id: str
    signal_type: SignalType
    original_text: str
    final_text: str
    context: Dict[str, Any]
    detected_changes: Optional[Dict[str, Any]] = None
    similarity_score: Optional[float] = None
    got_reply: Optional[bool] = None
    reply_sentiment: Optional[str] = None
    created_at: datetime


class LearningPatternResponse(BaseModel):
    """Learning Pattern Response"""
    id: str
    user_id: str
    pattern_type: str
    pattern_description: Optional[str] = None
    context_filter: Dict[str, Any] = Field(default_factory=dict)
    signal_count: int = 0
    success_rate: Optional[float] = None
    status: RuleStatus


# =============================================================================
# COMMAND LINE
# =============================================================================

class CommandParseRequest(BaseModel):
    """Request zum Parsen eines Commands"""
    command_text: str = Field(..., description="Der natürlichsprachliche Befehl")
    context: Optional[Dict[str, Any]] = None


class TriggerConfig(BaseModel):
    """Trigger-Konfiguration einer Regel"""
    trigger_type: str = "all"
    trigger_pattern: List[str] = Field(default_factory=list)
    channels: List[str] = Field(default=["all"])
    lead_statuses: List[str] = Field(default=["all"])


class ActionConfig(BaseModel):
    """Action-Konfiguration einer Regel"""
    actions: List[str] = Field(default_factory=list)
    instruction: str = ""


class RuleExample(BaseModel):
    """Beispiel für eine Regel"""
    bad: Optional[str] = None
    good: Optional[str] = None


class ParsedCommand(BaseModel):
    """Geparster Command"""
    understood: bool
    rule_type: str
    trigger_config: TriggerConfig
    action_config: ActionConfig
    examples: List[RuleExample] = Field(default_factory=list)
    priority: int = 50
    clarification_needed: Optional[str] = None


class CommandParseResponse(BaseModel):
    """Response für Command-Parsing"""
    is_command: bool
    understood: bool = False
    parsed: Optional[ParsedCommand] = None


class CreateRuleRequest(BaseModel):
    """Request zum Erstellen einer Regel"""
    original_command: str
    parsed_rule: ParsedCommand
    scope: RuleScope = RuleScope.personal


class CommandRuleResponse(BaseModel):
    """Command Rule Response"""
    id: str
    user_id: str
    original_command: str
    rule_type: str
    trigger_config: Dict[str, Any]
    action_config: Dict[str, Any]
    examples: List[Dict[str, str]] = Field(default_factory=list)
    priority: int
    scope: str
    is_active: bool = True
    times_applied: int = 0
    times_followed: int = 0
    times_overridden: int = 0
    follow_rate: Optional[float] = None
    created_at: datetime


class RulesListResponse(BaseModel):
    """Liste von Regeln"""
    rules: List[CommandRuleResponse]
    total: int


# =============================================================================
# TEAM BROADCASTS
# =============================================================================

class BroadcastCandidate(BaseModel):
    """Broadcast-Kandidat (automatisch erkannt)"""
    template_id: str
    template_name: str
    category: Optional[str] = None
    content: str
    send_count: int
    reply_rate: float
    improvement: float
    improvement_percent: str


class CreateBroadcastRequest(BaseModel):
    """Request zum Erstellen eines Broadcasts"""
    team_id: str
    broadcast_type: str = Field(..., description="template, rule, strategy, objection_handler")
    title: str
    description: Optional[str] = None
    content: Dict[str, Any]
    show_in_morning_briefing: bool = True


class ApproveBroadcastRequest(BaseModel):
    """Request zum Genehmigen eines Broadcasts"""
    show_in_morning_briefing: bool = True


class TeamBroadcastResponse(BaseModel):
    """Team Broadcast Response"""
    id: str
    creator_user_id: str
    creator_name: Optional[str] = None
    team_id: str
    broadcast_type: str
    source_type: str
    source_id: Optional[str] = None
    title: str
    description: Optional[str] = None
    content: Dict[str, Any]
    performance_data: Optional[Dict[str, Any]] = None
    status: BroadcastStatus
    approved_by: Optional[str] = None
    approved_at: Optional[datetime] = None
    rejection_reason: Optional[str] = None
    team_adoption_count: int = 0
    show_in_morning_briefing: bool = False
    created_at: datetime


class BroadcastsListResponse(BaseModel):
    """Liste von Broadcasts"""
    broadcasts: List[TeamBroadcastResponse]
    total: int


class BroadcastCandidatesResponse(BaseModel):
    """Liste von Broadcast-Kandidaten"""
    candidates: List[BroadcastCandidate]


# =============================================================================
# LEARNING CASES
# =============================================================================

class ImportCaseRequest(BaseModel):
    """Request zum Importieren eines Learning Cases"""
    raw_conversation: str = Field(..., description="Das rohe Gesprächsprotokoll")
    vertical: Optional[str] = None
    product_or_service: Optional[str] = None
    channel: Optional[str] = None
    conversation_goal: Optional[str] = None
    outcome: Optional[str] = Field(None, description="success, pending, lost, ongoing")
    outcome_details: Optional[str] = None
    source_type: str = Field(default="own", description="own, team_member, external")
    source_seller_name: Optional[str] = None
    source_seller_skill_level: Optional[str] = Field(None, description="rookie, advanced, pro")
    anonymized: bool = False


class ImportCaseResponse(BaseModel):
    """Response beim Case-Import"""
    case_id: str
    status: ProcessingStatus


class ExtractedTemplate(BaseModel):
    """Extrahiertes Template aus einem Case"""
    use_case: str
    message: str
    position: Optional[int] = None
    effectiveness_indicators: List[str] = Field(default_factory=list)
    case_id: Optional[str] = None
    vertical: Optional[str] = None
    channel: Optional[str] = None
    case_quality: Optional[float] = None


class ExtractedObjection(BaseModel):
    """Extrahierte Einwandbehandlung"""
    id: str
    learning_case_id: str
    objection_type: str
    objection_text: str
    objection_context: Optional[str] = None
    response_text: Optional[str] = None
    response_technique: Optional[str] = None
    response_worked: Optional[bool] = None
    created_at: datetime


class SellerStyle(BaseModel):
    """Verkäufer-Stil Analyse"""
    tone: Optional[str] = None
    pressure_level: Optional[str] = None
    emoji_usage: Optional[str] = None
    message_length: Optional[str] = None


class ExtractedData(BaseModel):
    """Extrahierte Daten aus einem Case"""
    message_count: int = 0
    seller_message_count: int = 0
    customer_message_count: int = 0
    key_objections: List[str] = Field(default_factory=list)
    outcome: Optional[str] = None


class LearningCaseResponse(BaseModel):
    """Learning Case Response"""
    id: str
    user_id: str
    vertical: Optional[str] = None
    product_or_service: Optional[str] = None
    channel: Optional[str] = None
    conversation_goal: Optional[str] = None
    outcome: Optional[str] = None
    outcome_details: Optional[str] = None
    raw_conversation: str
    extracted_data: Optional[ExtractedData] = None
    extracted_templates: Optional[List[ExtractedTemplate]] = None
    seller_style: Optional[SellerStyle] = None
    source_type: str = "own"
    source_seller_name: Optional[str] = None
    source_seller_skill_level: Optional[str] = None
    anonymized: bool = False
    processing_status: ProcessingStatus
    processed_at: Optional[datetime] = None
    quality_score: Optional[float] = None
    created_at: datetime


class ProcessCaseResponse(BaseModel):
    """Response nach Case-Verarbeitung"""
    case_id: str
    status: str
    extracted_templates: int = 0
    extracted_objections: int = 0
    quality_score: Optional[float] = None
    error: Optional[str] = None


class CasesListResponse(BaseModel):
    """Liste von Learning Cases"""
    cases: List[LearningCaseResponse]
    total: int


class ExtractedTemplatesResponse(BaseModel):
    """Liste von extrahierten Templates"""
    templates: List[ExtractedTemplate]
    total: int


class ObjectionHandlersResponse(BaseModel):
    """Liste von Einwandbehandlungen"""
    handlers: List[ExtractedObjection]
    total: int


# =============================================================================
# LIVING OS CONTEXT (für CHIEF)
# =============================================================================

class LivingOSContext(BaseModel):
    """Vollständiger Living OS Kontext für CHIEF"""
    rules: List[CommandRuleResponse] = Field(default_factory=list)
    patterns: List[LearningPatternResponse] = Field(default_factory=list)
    broadcasts: List[TeamBroadcastResponse] = Field(default_factory=list)
    formatted_rules: str = ""
    formatted_patterns: str = ""
    formatted_broadcasts: str = ""

