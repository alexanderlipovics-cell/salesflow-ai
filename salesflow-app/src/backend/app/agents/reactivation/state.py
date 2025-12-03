"""
Reactivation Agent - State Definitions

TypedDict-basierte State-Definitionen für LangGraph.
Alle Datenstrukturen sind strikt typisiert für Type Safety.
"""

from typing import TypedDict, Literal, Optional, List
from datetime import datetime


class ReactivationSignal(TypedDict):
    """
    Ein erkanntes Reaktivierungssignal.
    
    Beispiele:
    - Job Change: Ansprechpartner hat Firma gewechselt
    - Funding: Firma hat Investment erhalten
    - News: Relevante Unternehmensnachricht
    - Intent: Pricing Page Visit
    """
    type: Literal["job_change", "funding", "news", "website_change", "intent"]
    source: str  # google_news, linkedin, website_monitor, intent_tracker
    title: str
    summary: str
    url: Optional[str]
    relevance_score: float  # 0-1
    detected_at: str  # ISO datetime string


class LeadContext(TypedDict):
    """
    Angereicherte Lead-Informationen aus RAG/CRM.
    
    Wird im perception Node aus verschiedenen Quellen zusammengestellt.
    """
    lead_id: str
    name: str
    company: str
    email: Optional[str]
    linkedin_url: Optional[str]
    
    # Interaktionshistorie
    last_interaction_summary: str
    interaction_count: int
    days_dormant: int
    
    # Persona & Tonalität (DACH-spezifisch)
    persona_type: Literal["corporate", "startup", "solopreneur", "unknown"]
    preferred_formality: Literal["Sie", "Du"]  # Kritisch für DACH!
    preferred_channel: Literal["linkedin", "email", "unknown"]
    
    # Sales Context
    top_pain_points: List[str]
    previous_objections: List[str]
    deal_value_estimate: Optional[float]
    
    # Compliance
    has_email_consent: bool
    has_linkedin_connection: bool


class RetrievedInteraction(TypedDict):
    """Eine aus dem Vector Store abgerufene Interaktion."""
    id: str
    content: str
    summary: str
    interaction_type: str  # email, linkedin, call, note
    interaction_date: str
    similarity_score: float
    sentiment: Optional[str]
    topics: List[str]


class ReactivationState(TypedDict, total=False):
    """
    LangGraph State für den Reactivation Agent.
    
    Wird durch die Graph Nodes schrittweise angereichert.
    total=False erlaubt optionale Felder.
    
    Flow:
    1. perception: lead_context wird geladen
    2. memory_retrieval: retrieved_interactions gefüllt
    3. signal_detection: signals gesammelt
    4. reasoning: should_reactivate + strategy entschieden
    5. message_generation: draft_message erstellt
    6. compliance_check: compliance_passed geprüft
    7. human_handoff: in Review Queue geschoben
    """
    
    # ═══════════════════════════════════════════════════════════════
    # INPUT (Required)
    # ═══════════════════════════════════════════════════════════════
    lead_id: str
    user_id: str
    
    # ═══════════════════════════════════════════════════════════════
    # PERCEPTION PHASE
    # ═══════════════════════════════════════════════════════════════
    lead_context: Optional[LeadContext]
    
    # ═══════════════════════════════════════════════════════════════
    # MEMORY RETRIEVAL PHASE (RAG)
    # ═══════════════════════════════════════════════════════════════
    retrieved_interactions: List[RetrievedInteraction]
    memory_summary: Optional[str]
    
    # ═══════════════════════════════════════════════════════════════
    # SIGNAL DETECTION PHASE
    # ═══════════════════════════════════════════════════════════════
    signals: List[ReactivationSignal]
    primary_signal: Optional[ReactivationSignal]
    signal_summary: Optional[str]
    
    # ═══════════════════════════════════════════════════════════════
    # REASONING PHASE
    # ═══════════════════════════════════════════════════════════════
    should_reactivate: bool
    reactivation_strategy: Optional[str]
    confidence_score: float  # 0-1
    reasoning_explanation: Optional[str]
    
    # ═══════════════════════════════════════════════════════════════
    # ACTION PHASE
    # ═══════════════════════════════════════════════════════════════
    draft_message: Optional[str]
    suggested_channel: Literal["linkedin", "email"]
    message_tone: Literal["professional", "casual", "urgent"]
    
    # ═══════════════════════════════════════════════════════════════
    # COMPLIANCE PHASE
    # ═══════════════════════════════════════════════════════════════
    compliance_passed: bool
    compliance_issues: List[str]
    
    # ═══════════════════════════════════════════════════════════════
    # HUMAN-IN-THE-LOOP
    # ═══════════════════════════════════════════════════════════════
    requires_review: bool
    review_reason: Optional[str]
    draft_id: Optional[str]  # ID in reactivation_drafts table
    
    # ═══════════════════════════════════════════════════════════════
    # METADATA
    # ═══════════════════════════════════════════════════════════════
    run_id: str
    started_at: str
    completed_at: Optional[str]
    error: Optional[str]
    
    # ═══════════════════════════════════════════════════════════════
    # FEW-SHOT LEARNING CONTEXT
    # ═══════════════════════════════════════════════════════════════
    few_shot_examples: List[dict]  # Erfolgreiche Beispiele für Message Gen


def create_initial_state(
    lead_id: str,
    user_id: str,
    run_id: str
) -> ReactivationState:
    """
    Erstellt den initialen State für einen neuen Agent Run.
    """
    return ReactivationState(
        # Input
        lead_id=lead_id,
        user_id=user_id,
        
        # Initialize empty
        lead_context=None,
        retrieved_interactions=[],
        memory_summary=None,
        signals=[],
        primary_signal=None,
        signal_summary=None,
        should_reactivate=False,
        reactivation_strategy=None,
        confidence_score=0.0,
        reasoning_explanation=None,
        draft_message=None,
        suggested_channel="email",
        message_tone="professional",
        compliance_passed=False,
        compliance_issues=[],
        requires_review=True,
        review_reason=None,
        draft_id=None,
        
        # Metadata
        run_id=run_id,
        started_at=datetime.utcnow().isoformat(),
        completed_at=None,
        error=None,
        
        # Few-Shot
        few_shot_examples=[],
    )

