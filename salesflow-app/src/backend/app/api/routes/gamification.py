"""
╔════════════════════════════════════════════════════════════════════════════╗
║  GAMIFICATION API ROUTES                                                   ║
║  Streaks, Achievements & Gamification Endpoints                            ║
╚════════════════════════════════════════════════════════════════════════════╝

Endpoints:
    
    STREAKS:
    - GET    /gamification/streak           - Aktuelle Streak abrufen
    - POST   /gamification/streak/freeze    - Streak Freeze nutzen
    
    ACHIEVEMENTS:
    - GET    /gamification/achievements     - Alle Achievements abrufen
    - POST   /gamification/achievements/check - Achievements prüfen & freischalten
    
    SUMMARY:
    - GET    /gamification/summary          - Gamification-Zusammenfassung
"""

from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from typing import List, Optional
from uuid import UUID

from app.db.deps import get_db, get_current_user, CurrentUser
from app.api.schemas.gamification import (
    StreakResponse,
    StreakFreezeResponse,
    AchievementsResponse,
    Achievement,
    NewAchievement,
    GamificationSummary,
    StreakStatus,
)
from app.services.gamification import GamificationService
from app.services.push import ExpoPushService

router = APIRouter(prefix="/gamification", tags=["gamification"])


# =============================================================================
# STREAK ENDPOINTS
# =============================================================================

@router.get("/streak", response_model=StreakResponse)
async def get_streak(
    db = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    """
    Holt aktuelle Streak-Daten für den User.
    
    Returns:
        StreakResponse mit:
        - current: Aktuelle Streak-Länge
        - longest: Längste Streak aller Zeiten
        - status: 'active_today', 'at_risk', 'broken', 'inactive'
        - freeze_available: Ob ein Streak Freeze verfügbar ist
    """
    service = GamificationService(db)
    streak_data = service.get_streak(current_user.id)
    
    return StreakResponse(
        current=streak_data.get("current", 0),
        longest=streak_data.get("longest", 0),
        last_active=streak_data.get("last_active"),
        total_days=streak_data.get("total_days", 0),
        freeze_available=streak_data.get("freeze_available", False),
        status=StreakStatus(streak_data.get("status", "inactive")),
    )


@router.post("/streak/freeze", response_model=StreakFreezeResponse)
async def use_streak_freeze(
    db = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    """
    Nutzt Streak Freeze um einen verpassten Tag zu überbrücken.
    
    - Jeder User bekommt jeden Montag einen neuen Freeze
    - Kann nur genutzt werden wenn die Streak "broken" ist
    - Rettet die Streak indem der letzte aktive Tag auf gestern gesetzt wird
    
    Returns:
        StreakFreezeResponse mit Erfolg/Fehler und aktualisierten Streak-Daten
    """
    service = GamificationService(db)
    result = service.use_streak_freeze(current_user.id)
    
    streak_data = result.get("streak", {})
    
    return StreakFreezeResponse(
        success=result.get("success", False),
        message=result.get("message", ""),
        streak=StreakResponse(
            current=streak_data.get("current", 0),
            longest=streak_data.get("longest", 0),
            last_active=streak_data.get("last_active"),
            total_days=streak_data.get("total_days", 0),
            freeze_available=streak_data.get("freeze_available", False),
            status=StreakStatus(streak_data.get("status", "inactive")),
        ),
    )


@router.post("/streak/record")
async def record_activity(
    db = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    """
    Zeichnet eine Aktivität auf und aktualisiert die Streak.
    
    Normalerweise wird dies automatisch durch Trigger aufgerufen,
    kann aber auch manuell getriggert werden.
    """
    service = GamificationService(db)
    streak_data = service.record_activity(current_user.id)
    
    return StreakResponse(
        current=streak_data.get("current", 0),
        longest=streak_data.get("longest", 0),
        last_active=streak_data.get("last_active"),
        total_days=streak_data.get("total_days", 0),
        freeze_available=streak_data.get("freeze_available", False),
        status=StreakStatus(streak_data.get("status", "inactive")),
    )


# =============================================================================
# ACHIEVEMENT ENDPOINTS
# =============================================================================

@router.get("/achievements", response_model=AchievementsResponse)
async def get_achievements(
    db = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    """
    Holt alle Achievements des Users.
    
    Returns:
        AchievementsResponse mit:
        - total_unlocked: Anzahl freigeschalteter Achievements
        - unlocked: Liste freigeschalteter Achievements
        - in_progress: Liste noch nicht freigeschalteter Achievements mit Fortschritt
    """
    service = GamificationService(db)
    data = service.get_achievements(current_user.id)
    
    unlocked = [
        Achievement(
            id=UUID(a.get("id")) if a.get("id") else None,
            type=a.get("type", ""),
            level=a.get("level", 1),
            name=a.get("name", ""),
            description=a.get("description"),
            emoji=a.get("emoji", "🏆"),
            current=a.get("current", 0),
            target=a.get("target", 1),
            progress=a.get("progress", 0),
            unlocked=True,
            unlocked_at=a.get("unlocked_at"),
        )
        for a in data.get("unlocked", [])
    ]
    
    in_progress = [
        Achievement(
            id=UUID(a.get("id")) if a.get("id") else None,
            type=a.get("type", ""),
            level=a.get("level", 1),
            name=a.get("name", ""),
            description=a.get("description"),
            emoji=a.get("emoji", "🏆"),
            current=a.get("current", 0),
            target=a.get("target", 1),
            progress=a.get("progress", 0),
            unlocked=False,
        )
        for a in data.get("in_progress", [])
    ]
    
    return AchievementsResponse(
        total_unlocked=data.get("total_unlocked", 0),
        unlocked=unlocked,
        in_progress=in_progress,
    )


@router.post("/achievements/check", response_model=List[NewAchievement])
async def check_achievements(
    background_tasks: BackgroundTasks,
    db = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    """
    Prüft und schaltet Achievements frei.
    
    Sollte nach relevanten Aktionen aufgerufen werden:
    - Nach Nachricht senden
    - Nach Regel erstellen
    - Nach Deal abschluss
    
    Returns:
        Liste der neu freigeschalteten Achievements
    """
    service = GamificationService(db)
    newly_unlocked = service.check_and_unlock_achievements(current_user.id)
    
    # Send push notifications for newly unlocked achievements
    if newly_unlocked:
        background_tasks.add_task(
            send_achievement_notifications,
            db,
            current_user.id,
            newly_unlocked,
        )
    
    return [
        NewAchievement(
            type=a.get("type", ""),
            level=a.get("level", 1),
            name=a.get("name", ""),
            emoji=a.get("emoji", "🏆"),
            description=a.get("description"),
        )
        for a in newly_unlocked
    ]


# =============================================================================
# SUMMARY ENDPOINT
# =============================================================================

@router.get("/summary", response_model=GamificationSummary)
async def get_gamification_summary(
    db = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    """
    Holt zusammenfassende Gamification-Daten.
    
    Nützlich für Dashboard-Anzeige mit einem einzigen API-Call.
    
    Returns:
        GamificationSummary mit Streak, Achievements und Stats
    """
    service = GamificationService(db)
    data = service.get_user_stats_summary(current_user.id)
    
    streak_data = data.get("streak", {})
    
    return GamificationSummary(
        streak=StreakResponse(
            current=streak_data.get("current", 0),
            longest=streak_data.get("longest", 0),
            last_active=streak_data.get("last_active"),
            total_days=streak_data.get("total_days", 0),
            freeze_available=streak_data.get("freeze_available", False),
            status=StreakStatus(streak_data.get("status", "inactive")),
        ),
        achievements_unlocked=data.get("achievements_unlocked", 0),
        next_achievements=[
            Achievement(
                type=a.get("type", ""),
                level=a.get("level", 1),
                name=a.get("name", ""),
                emoji=a.get("emoji", "🏆"),
                current=a.get("current", 0),
                target=a.get("target", 1),
                progress=a.get("progress", 0),
                unlocked=False,
            )
            for a in data.get("next_achievements", [])
        ],
        total_active_days=data.get("total_active_days", 0),
    )


# =============================================================================
# BACKGROUND TASKS
# =============================================================================

async def send_achievement_notifications(
    db,
    user_id: str,
    achievements: List[dict],
):
    """Sendet Push Notifications für neue Achievements."""
    try:
        # Get push token
        result = db.table("push_schedules") \
            .select("push_token, achievement_push_enabled") \
            .eq("user_id", user_id) \
            .single() \
            .execute()
        
        if not result.data:
            return
        
        if not result.data.get("achievement_push_enabled", True):
            return
        
        push_token = result.data.get("push_token")
        if not push_token:
            return
        
        # Send notifications
        push_service = ExpoPushService()
        
        for achievement in achievements:
            await push_service.send_achievement_unlocked(
                push_token=push_token,
                achievement_name=achievement.get("name", ""),
                achievement_emoji=achievement.get("emoji", "🏆"),
                achievement_description=achievement.get("description", ""),
            )
    except Exception as e:
        print(f"Error sending achievement notifications: {e}")

