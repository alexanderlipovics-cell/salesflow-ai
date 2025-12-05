"""
Sales Flow AI - Lead Schemas

Pydantic models für Leads mit P-Score (Predictive Lead Scoring)
"""

from datetime import datetime
from typing import List, Optional, Literal
from pydantic import BaseModel, Field


# ============================================================================
# ENUMS & TYPES
# ============================================================================

PScoreTrend = Literal["up", "down", "flat"]


# ============================================================================
# LEAD SCHEMAS
# ============================================================================


class LeadBase(BaseModel):
    """Basis-Felder für Leads"""
    
    name: str = Field(..., min_length=1, max_length=200)
    platform: str = Field(default="WhatsApp", description="Kommunikationsplattform")
    status: str = Field(default="NEW", description="Lead-Status")
    temperature: int = Field(default=50, ge=0, le=100, description="Manuelle Temperatur 0-100")
    tags: List[str] = Field(default_factory=list)
    last_message: Optional[str] = None
    notes: Optional[str] = None
    next_follow_up: Optional[str] = None
    follow_up_reason: Optional[str] = None


class LeadCreate(LeadBase):
    """Schema zum Erstellen eines Leads"""
    pass


class LeadUpdate(BaseModel):
    """Schema zum Aktualisieren eines Leads - alle Felder optional"""
    
    name: Optional[str] = None
    platform: Optional[str] = None
    status: Optional[str] = None
    temperature: Optional[int] = Field(None, ge=0, le=100)
    tags: Optional[List[str]] = None
    last_message: Optional[str] = None
    notes: Optional[str] = None
    next_follow_up: Optional[str] = None
    follow_up_reason: Optional[str] = None
    
    # P-Score Felder (können auch manuell gesetzt werden)
    p_score: Optional[float] = Field(None, ge=0, le=100)
    p_score_trend: Optional[PScoreTrend] = None
    last_scored_at: Optional[datetime] = None


class Lead(LeadBase):
    """Vollständiges Lead Response Schema"""
    
    id: str = Field(description="Unique Lead ID (UUID)")
    
    # P-Score Felder (Predictive Lead Scoring)
    p_score: Optional[float] = Field(
        default=None,
        ge=0,
        le=100,
        description="Predictive Score 0-100 - KI-basierte Abschlusswahrscheinlichkeit"
    )
    p_score_trend: Optional[PScoreTrend] = Field(
        default=None,
        description="Trend: up (steigend), down (fallend), flat (stabil)"
    )
    last_scored_at: Optional[datetime] = Field(
        default=None,
        description="Zeitpunkt der letzten Score-Berechnung"
    )
    
    # Timestamps
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True


class LeadListItem(BaseModel):
    """Lightweight Lead für Listen-Ansichten"""
    
    id: str
    name: str
    platform: str
    status: str
    temperature: int
    p_score: Optional[float] = None
    p_score_trend: Optional[PScoreTrend] = None
    tags: List[str] = Field(default_factory=list)
    next_follow_up: Optional[str] = None
    
    class Config:
        from_attributes = True


# ============================================================================
# P-SCORE SPECIFIC SCHEMAS
# ============================================================================


class PScoreResult(BaseModel):
    """Ergebnis einer P-Score-Berechnung"""
    
    lead_id: str
    p_score: float = Field(ge=0, le=100)
    p_score_trend: PScoreTrend
    factors: dict = Field(
        default_factory=dict,
        description="Aufschlüsselung der Score-Faktoren"
    )
    calculated_at: datetime = Field(default_factory=datetime.utcnow)


class PScoreRecalcSummary(BaseModel):
    """Zusammenfassung einer Bulk-Recalculation"""
    
    total_leads: int
    leads_scored: int
    avg_score: Optional[float] = None
    score_distribution: dict = Field(
        default_factory=dict,
        description="Verteilung: hot (80+), warm (50-79), cold (0-49)"
    )
    duration_ms: int
    errors: List[str] = Field(default_factory=list)


# ============================================================================
# RESPONSE SCHEMAS
# ============================================================================


class LeadResponse(BaseModel):
    """Standard API Response für ein Lead"""
    
    success: bool = True
    lead: Lead


class LeadListResponse(BaseModel):
    """API Response für Liste von Leads"""
    
    success: bool = True
    leads: List[Lead]
    count: int


class PScoreRecalcResponse(BaseModel):
    """API Response für P-Score Recalculation"""
    
    success: bool = True
    summary: PScoreRecalcSummary


# ============================================================================
# EXPORTS
# ============================================================================


__all__ = [
    "PScoreTrend",
    "LeadBase",
    "LeadCreate",
    "LeadUpdate",
    "Lead",
    "LeadListItem",
    "PScoreResult",
    "PScoreRecalcSummary",
    "LeadResponse",
    "LeadListResponse",
    "PScoreRecalcResponse",
]

