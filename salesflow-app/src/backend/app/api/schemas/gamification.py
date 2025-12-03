"""
╔════════════════════════════════════════════════════════════════════════════╗
║  GAMIFICATION SCHEMAS                                                      ║
║  Pydantic Models für Streaks, Achievements & Gamification                  ║
╚════════════════════════════════════════════════════════════════════════════╝
"""

from enum import Enum
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field
from datetime import datetime, date
from uuid import UUID


# =============================================================================
# ENUMS
# =============================================================================

class AchievementType(str, Enum):
    """Typen von Achievements."""
    streak = "streak"                    # X Tage in Folge aktiv
    rules_created = "rules_created"      # X Regeln gelernt
    messages_sent = "messages_sent"      # X Nachrichten gesendet
    deals_closed = "deals_closed"        # X Deals abgeschlossen
    reply_rate = "reply_rate"            # X% Reply Rate erreicht
    daily_complete = "daily_complete"    # Tagesziel X mal erreicht
    team_contributor = "team_contributor"  # X Team-Regeln erstellt
    fast_learner = "fast_learner"        # X Regeln in einer Woche
    consistency = "consistency"          # X Wochen ohne Aussetzer


class StreakStatus(str, Enum):
    """Status der Streak."""
    active_today = "active_today"    # Heute bereits aktiv
    at_risk = "at_risk"              # Gestern aktiv, heute noch nicht
    broken = "broken"                 # Mehr als einen Tag inaktiv
    inactive = "inactive"             # Keine Streak vorhanden


# =============================================================================
# STREAK SCHEMAS
# =============================================================================

class StreakResponse(BaseModel):
    """Streak-Daten Response."""
    current: int = Field(..., description="Aktuelle Streak-Länge in Tagen")
    longest: int = Field(..., description="Längste Streak aller Zeiten")
    last_active: Optional[str] = Field(None, description="Letztes Aktivitätsdatum (ISO)")
    total_days: int = Field(0, description="Gesamte aktive Tage")
    freeze_available: bool = Field(False, description="Ist ein Streak Freeze verfügbar?")
    status: StreakStatus = Field(..., description="Aktueller Streak-Status")
    
    class Config:
        json_schema_extra = {
            "example": {
                "current": 7,
                "longest": 14,
                "last_active": "2025-12-02",
                "total_days": 42,
                "freeze_available": True,
                "status": "active_today"
            }
        }


class StreakFreezeResponse(BaseModel):
    """Response für Streak Freeze Nutzung."""
    success: bool
    message: str
    streak: StreakResponse


# =============================================================================
# ACHIEVEMENT SCHEMAS
# =============================================================================

class Achievement(BaseModel):
    """Einzelnes Achievement."""
    id: Optional[UUID] = None
    type: str = Field(..., description="Achievement-Typ")
    level: int = Field(1, description="Level (1=Bronze, 2=Silver, 3=Gold, 4=Platinum)")
    name: str = Field(..., description="Name des Achievements")
    description: Optional[str] = None
    emoji: str = Field("🏆", description="Emoji für das Achievement")
    
    # Progress
    current: int = Field(0, description="Aktueller Wert")
    target: int = Field(..., description="Zielwert zum Freischalten")
    progress: float = Field(0, ge=0, le=100, description="Fortschritt in Prozent")
    
    # Status
    unlocked: bool = Field(False, description="Ist das Achievement freigeschaltet?")
    unlocked_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True
        json_schema_extra = {
            "example": {
                "type": "streak",
                "level": 2,
                "name": "Auf Kurs",
                "description": "7 Tage in Folge aktiv",
                "emoji": "🔥🔥",
                "current": 7,
                "target": 7,
                "progress": 100.0,
                "unlocked": True,
                "unlocked_at": "2025-12-02T10:30:00Z"
            }
        }


class AchievementsResponse(BaseModel):
    """Alle Achievements eines Users."""
    total_unlocked: int = Field(..., description="Anzahl freigeschalteter Achievements")
    unlocked: List[Achievement] = Field([], description="Freigeschaltete Achievements")
    in_progress: List[Achievement] = Field([], description="Noch nicht freigeschaltete Achievements")
    
    class Config:
        json_schema_extra = {
            "example": {
                "total_unlocked": 5,
                "unlocked": [
                    {
                        "type": "streak",
                        "level": 1,
                        "name": "Erste Schritte",
                        "emoji": "🔥",
                        "unlocked": True
                    }
                ],
                "in_progress": [
                    {
                        "type": "streak",
                        "level": 2,
                        "name": "Auf Kurs",
                        "emoji": "🔥🔥",
                        "current": 4,
                        "target": 7,
                        "progress": 57.14
                    }
                ]
            }
        }


class NewAchievement(BaseModel):
    """Neu freigeschaltetes Achievement (für Notifications)."""
    type: str
    level: int
    name: str
    emoji: str
    description: Optional[str] = None


# =============================================================================
# GAMIFICATION SUMMARY
# =============================================================================

class GamificationSummary(BaseModel):
    """Zusammenfassung aller Gamification-Daten."""
    streak: StreakResponse
    achievements_unlocked: int
    next_achievements: List[Achievement] = Field([], description="Nächste 3 freischaltbare Achievements")
    total_active_days: int
    
    class Config:
        json_schema_extra = {
            "example": {
                "streak": {
                    "current": 7,
                    "longest": 14,
                    "status": "active_today"
                },
                "achievements_unlocked": 5,
                "next_achievements": [],
                "total_active_days": 42
            }
        }


# =============================================================================
# EXPORTS
# =============================================================================

__all__ = [
    # Enums
    "AchievementType",
    "StreakStatus",
    # Streak
    "StreakResponse",
    "StreakFreezeResponse",
    # Achievement
    "Achievement",
    "AchievementsResponse",
    "NewAchievement",
    # Summary
    "GamificationSummary",
]

