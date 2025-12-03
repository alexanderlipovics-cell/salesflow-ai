"""
╔════════════════════════════════════════════════════════════════════════════╗
║  CRON JOBS API ROUTES                                                       ║
║  Manuelle Trigger für Background Jobs                                      ║
╚════════════════════════════════════════════════════════════════════════════╝
"""

from datetime import date, timedelta
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from supabase import Client

from ...core.dependencies import get_db, get_current_user
from ...services.cron import (
    aggregate_daily_effectiveness,
    check_ab_test_winners,
    cleanup_old_momentum_signals,
    archive_stale_ab_tests,
    run_all_jobs_manually,
)
from ...services.jobs import FollowUpReminderService, get_redis_queue

router = APIRouter(prefix="/cron", tags=["Cron Jobs"])


# =============================================================================
# INDIVIDUAL JOB TRIGGERS
# =============================================================================

@router.post("/effectiveness/aggregate")
async def trigger_effectiveness_aggregation(
    target_date: Optional[str] = Query(None, description="YYYY-MM-DD (default: yesterday)"),
    db: Client = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """
    Triggert die Daily Effectiveness Aggregation manuell.
    
    Normalerweise läuft dieser Job täglich um 02:00 UTC.
    Kann manuell getriggert werden um Daten für ein bestimmtes Datum zu aggregieren.
    """
    # Parse date
    if target_date:
        try:
            parsed_date = date.fromisoformat(target_date)
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid date format. Use YYYY-MM-DD")
    else:
        parsed_date = date.today() - timedelta(days=1)
    
    result = await aggregate_daily_effectiveness(db, parsed_date)
    return result


@router.post("/ab-tests/check-winners")
async def trigger_ab_test_winner_check(
    min_sample_size: int = Query(30, ge=10, le=1000),
    significance_threshold: float = Query(0.95, ge=0.8, le=0.99),
    db: Client = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """
    Triggert die A/B Test Winner Check manuell.
    
    Normalerweise läuft dieser Job stündlich.
    Prüft alle laufenden Tests auf statistische Signifikanz.
    """
    result = await check_ab_test_winners(
        db,
        min_sample_size=min_sample_size,
        significance_threshold=significance_threshold,
    )
    return result


@router.post("/momentum/cleanup")
async def trigger_momentum_cleanup(
    days_to_keep: int = Query(90, ge=30, le=365),
    db: Client = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """
    Triggert das Momentum Signal Cleanup manuell.
    
    Normalerweise läuft dieser Job wöchentlich.
    Löscht Signals die älter als X Tage sind.
    """
    result = await cleanup_old_momentum_signals(db, days_to_keep)
    return result


@router.post("/ab-tests/archive-stale")
async def trigger_stale_test_archive(
    inactive_days: int = Query(30, ge=7, le=90),
    db: Client = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """
    Triggert das Archivieren von inaktiven A/B Tests.
    
    Normalerweise läuft dieser Job täglich.
    Pausiert Tests die länger als X Tage keine Aktivität haben.
    """
    result = await archive_stale_ab_tests(db, inactive_days)
    return result


# =============================================================================
# RUN ALL JOBS
# =============================================================================

@router.post("/run-all")
async def trigger_all_jobs(
    db: Client = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """
    Führt alle Cron Jobs manuell aus.
    
    ⚠️ Nur für Testing/Debugging verwenden!
    In Production laufen diese Jobs automatisch auf Schedule.
    """
    result = await run_all_jobs_manually(db)
    return {
        "message": "All jobs executed",
        "results": result,
    }


# =============================================================================
# FOLLOW-UP REMINDER JOBS (NetworkerOS)
# =============================================================================

@router.post("/followup/daily-check")
async def trigger_followup_daily_check(
    db: Client = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """
    Triggert den täglichen Follow-Up Check für alle User.
    
    Prüft alle Kontakte auf überfällige Follow-ups und:
    - Erstellt Pending Actions
    - Sendet Push Notifications
    
    Normalerweise läuft dieser Job täglich um 08:00 Uhr.
    """
    service = FollowUpReminderService(db)
    result = await service.run_daily_check()
    
    return {
        "success": True,
        "result": result,
    }


@router.post("/followup/check-user/{user_id}")
async def trigger_followup_check_user(
    user_id: str,
    send_push: bool = Query(True),
    db: Client = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """
    Triggert Follow-Up Check für einen einzelnen User.
    """
    service = FollowUpReminderService(db)
    result = await service.check_and_create_reminders(
        user_id=user_id,
        send_push=send_push,
    )
    
    return {
        "success": True,
        "result": result,
    }


@router.get("/queue/stats")
async def get_queue_stats(
    current_user: dict = Depends(get_current_user),
):
    """
    Gibt Redis Queue Statistiken zurück.
    """
    queue = get_redis_queue()
    stats = await queue.get_stats()
    
    return {
        "queue_stats": stats,
    }


# =============================================================================
# JOB STATUS
# =============================================================================

@router.get("/status")
async def get_cron_job_status(
    db: Client = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """
    Zeigt Status der Cron Jobs.
    
    Returns:
        Info über letzten Run, nächsten Run, etc.
    """
    # In Production würde hier der APScheduler Status abgefragt
    return {
        "jobs": [
            {
                "id": "daily_effectiveness_aggregation",
                "name": "Daily Effectiveness Aggregation",
                "schedule": "02:00 UTC daily",
                "description": "Aggregiert Framework/Buyer/Industry Stats",
            },
            {
                "id": "ab_test_winner_check",
                "name": "A/B Test Winner Check",
                "schedule": "Every hour at :00",
                "description": "Prüft statistische Signifikanz, ermittelt Winner",
            },
            {
                "id": "momentum_signal_cleanup",
                "name": "Momentum Signal Cleanup",
                "schedule": "Sunday 03:00 UTC",
                "description": "Löscht alte Momentum Signals (90+ Tage)",
            },
            {
                "id": "archive_stale_ab_tests",
                "name": "Archive Stale A/B Tests",
                "schedule": "04:00 UTC daily",
                "description": "Pausiert inaktive Tests (30+ Tage)",
            },
        ],
        "note": "In Development müssen Jobs manuell getriggert werden. In Production laufen sie automatisch."
    }

