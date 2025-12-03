# backend/app/api/schemas/phoenix.py
"""
╔════════════════════════════════════════════════════════════════════════════╗
║  🔥 PHOENIX SCHEMAS                                                         ║
║  Pydantic Models für Außendienst-Reaktivierungs-System                      ║
╚════════════════════════════════════════════════════════════════════════════╝
"""

from enum import Enum
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field
from datetime import date, datetime


# =============================================================================
# ENUMS
# =============================================================================

class VisitType(str, Enum):
    planned_meeting = "planned_meeting"
    spontaneous_visit = "spontaneous_visit"
    drive_by = "drive_by"
    phone_from_location = "phone_from_location"
    reactivation_attempt = "reactivation_attempt"


class VisitOutcome(str, Enum):
    successful = "successful"
    not_home = "not_home"
    rescheduled = "rescheduled"
    rejected = "rejected"
    no_contact = "no_contact"


class SessionType(str, Enum):
    field_day = "field_day"
    territory_sweep = "territory_sweep"
    appointment_buffer = "appointment_buffer"
    reactivation_blitz = "reactivation_blitz"


class AlertType(str, Enum):
    nearby_cold_lead = "nearby_cold_lead"
    nearby_old_customer = "nearby_old_customer"
    reactivation_opportunity = "reactivation_opportunity"
    territory_untouched = "territory_untouched"


class AlertPriority(str, Enum):
    low = "low"
    medium = "medium"
    high = "high"
    urgent = "urgent"


class SuggestedAction(str, Enum):
    visit = "visit"
    call = "call"
    drive_by = "drive_by"
    reactivation_visit = "reactivation_visit"
    leave_material = "leave_material"


# =============================================================================
# REQUEST SCHEMAS
# =============================================================================

class LocationUpdate(BaseModel):
    """Standort-Update"""
    latitude: float = Field(..., ge=-90, le=90)
    longitude: float = Field(..., ge=-180, le=180)


class NearbyLeadsRequest(BaseModel):
    """Request für Leads in der Nähe"""
    latitude: float = Field(..., ge=-90, le=90)
    longitude: float = Field(..., ge=-180, le=180)
    radius_meters: int = Field(default=5000, ge=100, le=50000)
    min_days_since_contact: int = Field(default=14, ge=0)
    limit: int = Field(default=20, ge=1, le=100)
    include_cold: bool = False


class ImEarlyRequest(BaseModel):
    """Request für 'Bin zu früh beim Termin'"""
    latitude: float = Field(..., ge=-90, le=90)
    longitude: float = Field(..., ge=-180, le=180)
    minutes_available: int = Field(default=30, ge=5, le=180)
    appointment_id: Optional[str] = None


class StartSessionRequest(BaseModel):
    """Session starten"""
    session_type: SessionType
    latitude: float = Field(..., ge=-90, le=90)
    longitude: float = Field(..., ge=-180, le=180)
    settings: Optional[Dict[str, Any]] = None


class LogVisitRequest(BaseModel):
    """Besuch protokollieren"""
    lead_id: str
    latitude: float = Field(..., ge=-90, le=90)
    longitude: float = Field(..., ge=-180, le=180)
    visit_type: VisitType
    outcome: VisitOutcome
    notes: Optional[str] = None
    next_action_type: Optional[str] = None
    next_action_date: Optional[date] = None
    session_id: Optional[str] = None


class CreateTerritoryRequest(BaseModel):
    """Territory erstellen"""
    name: str = Field(..., min_length=1, max_length=100)
    center_latitude: float = Field(..., ge=-90, le=90)
    center_longitude: float = Field(..., ge=-180, le=180)
    radius_km: float = Field(default=10, ge=1, le=100)
    postal_codes: Optional[List[str]] = None


class AlertResponseRequest(BaseModel):
    """Auf Alert reagieren"""
    action: str = Field(..., pattern="^(acted|dismissed)$")
    action_taken: Optional[str] = None
    action_outcome: Optional[str] = None


# =============================================================================
# RESPONSE SCHEMAS
# =============================================================================

class NearbyLeadResponse(BaseModel):
    """Lead in der Nähe"""
    lead_id: str
    name: str
    status: str
    phone: Optional[str]
    address: Optional[str]
    city: Optional[str]
    distance_meters: int
    distance_km: float
    travel_time_minutes: int
    days_since_contact: int
    last_contact_at: Optional[datetime]
    priority_score: int
    suggested_action: SuggestedAction
    suggested_message: Optional[str]


class ImEarlyResponse(BaseModel):
    """Response für 'Bin zu früh'"""
    minutes_available: int
    location: Dict[str, float]
    search_radius_km: float
    total_leads_found: int
    visit_candidates: int
    call_candidates: int
    suggestions: List[Dict[str, Any]]
    message: str


class SessionResponse(BaseModel):
    """Session Response"""
    id: str
    session_type: SessionType
    started_at: datetime
    current_latitude: Optional[float]
    current_longitude: Optional[float]
    leads_suggested: int
    leads_visited: int
    leads_contacted: int
    leads_reactivated: int
    settings: Dict[str, Any]


class SessionSummaryResponse(BaseModel):
    """Session Zusammenfassung"""
    session_id: str
    session_type: str
    duration_minutes: int
    leads_suggested: int
    leads_visited: int
    leads_contacted: int
    leads_reactivated: int
    distance_km: float
    xp_earned: int


class VisitResponse(BaseModel):
    """Visit Response"""
    visit_id: str
    xp_earned: int


class TerritoryResponse(BaseModel):
    """Territory Response"""
    id: str
    name: str
    lead_count: int
    active_leads: int
    cold_leads: int
    reactivation_candidates: int
    last_sweep_at: Optional[datetime]


class AlertResponse(BaseModel):
    """Alert Response"""
    id: str
    lead_id: str
    lead_name: str
    alert_type: AlertType
    title: str
    message: str
    distance_meters: int
    priority: AlertPriority
    appointment_id: Optional[str]
    appointment_title: Optional[str]


class AppointmentOpportunityResponse(BaseModel):
    """Termin mit nahen Leads"""
    appointment_id: str
    appointment_title: str
    appointment_time: datetime
    appointment_address: Optional[str]
    buffer_minutes: int
    nearby_leads: List[Dict[str, Any]]


class ReactivationCandidateResponse(BaseModel):
    """Reaktivierungs-Kandidat"""
    lead_id: str
    lead_name: str
    lead_status: str
    deal_state: Optional[str]
    lead_phone: Optional[str]
    lead_address: Optional[str]
    city: Optional[str]
    days_inactive: int
    last_contact_at: Optional[datetime]
    field_visit_count: int
    reactivation_priority: str

