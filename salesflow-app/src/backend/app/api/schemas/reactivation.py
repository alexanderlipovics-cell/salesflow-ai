"""
Reactivation Agent Schemas

Pydantic Models für Request/Response Validation.
"""

from typing import Optional, List, Dict, Any
from datetime import datetime
from pydantic import BaseModel, Field


# ═══════════════════════════════════════════════════════════════════════════
# REQUEST SCHEMAS
# ═══════════════════════════════════════════════════════════════════════════

class StartReactivationRequest(BaseModel):
    """Request zum Starten des Reactivation Agents."""
    lead_id: str = Field(..., description="UUID des Leads")


class ReviewDraftRequest(BaseModel):
    """Request zum Reviewen eines Drafts."""
    action: str = Field(
        ..., 
        description="Action: approved, rejected, edited",
        pattern="^(approved|rejected|edited)$"
    )
    edited_message: Optional[str] = Field(
        None, 
        description="Editierte Nachricht (nur bei action=edited)"
    )
    notes: Optional[str] = Field(
        None, 
        description="Notizen des Reviewers"
    )
    send_now: bool = Field(
        False, 
        description="Ob die Nachricht sofort gesendet werden soll"
    )


# ═══════════════════════════════════════════════════════════════════════════
# RESPONSE SCHEMAS
# ═══════════════════════════════════════════════════════════════════════════

class ReactivationRunResponse(BaseModel):
    """Response für einen Reactivation Run."""
    run_id: Optional[str] = None
    status: str
    message: Optional[str] = None
    lead_id: Optional[str] = None
    signals_found: Optional[int] = None
    confidence_score: Optional[float] = None
    action_taken: Optional[str] = None
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None


class DormantLeadResponse(BaseModel):
    """Response für einen dormanten Lead."""
    id: str
    name: str
    company: Optional[str] = None
    email: Optional[str] = None
    linkedin_url: Optional[str] = None
    status: str
    last_contact_at: Optional[datetime] = None
    days_dormant: Optional[int] = None
    last_reactivation_attempt: Optional[datetime] = None


class BatchReactivationResponse(BaseModel):
    """Response für Batch-Reactivation."""
    batch_id: Optional[str] = None
    message: str
    count: int


class SignalResponse(BaseModel):
    """Ein erkanntes Signal."""
    type: str
    source: str
    title: str
    summary: Optional[str] = None
    url: Optional[str] = None
    relevance_score: float
    detected_at: datetime


class DraftResponse(BaseModel):
    """Response für einen Draft in der Review Queue."""
    id: str
    lead_id: str
    run_id: str
    draft_message: str
    suggested_channel: str
    signals: List[Dict[str, Any]] = []
    lead_context: Dict[str, Any] = {}
    confidence_score: float
    status: str
    created_at: datetime
    expires_at: datetime
    # Joined data
    leads: Optional[Dict[str, Any]] = None


class ReviewDraftResponse(BaseModel):
    """Response nach Draft Review."""
    success: bool
    message: str
    draft_id: str


# ═══════════════════════════════════════════════════════════════════════════
# STATISTICS
# ═══════════════════════════════════════════════════════════════════════════

class ReactivationStats(BaseModel):
    """Statistiken zur Reaktivierung."""
    total_runs: int = 0
    successful_reactivations: int = 0
    pending_drafts: int = 0
    approved_rate: float = 0.0
    average_confidence: float = 0.0
    top_signal_types: List[Dict[str, Any]] = []

