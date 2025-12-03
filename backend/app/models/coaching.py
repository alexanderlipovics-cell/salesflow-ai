from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator


class TeamSummary(BaseModel):
    """Teamweite Kennzahlen."""

    total_reps: int = Field(..., ge=1, description="Anzahl aktiver Reps")
    avg_reply_rate_percent: float = Field(..., ge=0, le=100)
    avg_conversion_rate_percent: float = Field(..., ge=0, le=100)
    avg_overdue_followups: float = Field(..., ge=0)


class RepMetrics(BaseModel):
    """Performance-Metriken eines Reps."""

    leads_created: int = Field(..., ge=0)
    contacts_contacted: int = Field(..., ge=0)
    contacts_signed: int = Field(..., ge=0)
    first_messages: int = Field(..., ge=0)
    reply_events: int = Field(..., ge=0)
    reply_rate_percent: float = Field(..., ge=0, le=100)
    conversion_rate_percent: float = Field(..., ge=0, le=100)


class RepFollowups(BaseModel):
    """Follow-up-Metriken eines Reps."""

    overdue_followups: int = Field(..., ge=0)
    high_priority_open_followups: int = Field(..., ge=0)
    avg_priority_score: float = Field(..., ge=0, le=120)


class HighPriorityContact(BaseModel):
    """Kontaktbeispiel mit hoher Priorität."""

    contact_name: str | None = None
    segment: Literal["overdue", "today", "week", "later"]
    priority_score: float = Field(..., ge=0, le=120)
    status: str | None = None
    due_at: str
    last_contact_at: str | None = None


class RepInput(BaseModel):
    """Input-Daten pro Rep."""

    user_id: str = Field(..., min_length=1, description="UUID des Reps")
    email: str | None = None
    display_name: str | None = None
    focus_area: Literal["timing_help", "script_help", "lead_quality", "balanced"]
    metrics: RepMetrics
    followups: RepFollowups
    recent_examples: dict[str, list[HighPriorityContact]] = Field(
        default_factory=lambda: {"high_priority_contacts": []}
    )

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "user_id": "123e4567-e89b-12d3-a456-426614174000",
                "email": "rep@example.com",
                "display_name": "John Doe",
                "focus_area": "timing_help",
                "metrics": {
                    "leads_created": 50,
                    "contacts_contacted": 40,
                    "contacts_signed": 10,
                    "first_messages": 40,
                    "reply_events": 20,
                    "reply_rate_percent": 50.0,
                    "conversion_rate_percent": 25.0,
                },
                "followups": {
                    "overdue_followups": 5,
                    "high_priority_open_followups": 3,
                    "avg_priority_score": 85.5,
                },
            }
        }
    )


class CoachingInput(BaseModel):
    """Gesamtes Coaching-Request-Payload."""

    workspace_id: str = Field(..., min_length=1)
    timeframe_days: int = Field(..., ge=1, le=365)
    language: str = Field(default="de", pattern=r"^(de|en)$")
    team_summary: TeamSummary
    reps: list[RepInput] = Field(..., min_length=1, max_length=50)

    @field_validator("reps")
    @classmethod
    def validate_unique_user_ids(cls, reps: list[RepInput]) -> list[RepInput]:
        user_ids = [rep.user_id for rep in reps]
        if len(user_ids) != len(set(user_ids)):
            raise ValueError("Duplicate user_ids found in reps list")
        return reps


class RepOutput(BaseModel):
    """Coaching-Output pro Rep."""

    user_id: str
    display_name: str | None = None
    focus_area: Literal["timing_help", "script_help", "lead_quality", "balanced"]
    diagnosis: str = Field(..., min_length=10, max_length=1000)
    suggested_actions: list[str] = Field(..., min_length=1, max_length=5)
    script_ideas: list[str] = Field(..., min_length=1, max_length=5)
    priority_actions: list[str] = Field(default_factory=list)
    timeline: str | None = None

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "user_id": "123e4567-e89b-12d3-a456-426614174000",
                "display_name": "John Doe",
                "focus_area": "timing_help",
                "diagnosis": "Überfällige Follow-ups deuten auf Zeitmanagement-Probleme hin.",
                "suggested_actions": [
                    "Implementiere tägliche Follow-up-Blöcke",
                    "Nutze Task-Priorisierung nach Score",
                ],
                "script_ideas": [
                    "Opener: 'Ich folge up zu unserem Gespräch von [Datum]...'",
                ],
            }
        }
    )


class TeamSummaryOutput(BaseModel):
    """Teamweite Coaching-Output-Struktur."""

    headline: str = Field(..., min_length=10, max_length=200)
    description: str = Field(..., min_length=20, max_length=1000)
    suggested_team_actions: list[str] = Field(..., min_length=1, max_length=5)
    key_insights: list[str] = Field(default_factory=list)


class CoachingOutput(BaseModel):
    """Komplette Coaching-Antwort."""

    timeframe_days: int
    language: str
    generated_at: str = Field(default_factory=lambda: datetime.utcnow().isoformat())
    team_summary: TeamSummaryOutput
    reps: list[RepOutput]

    model_config = ConfigDict(from_attributes=True)


