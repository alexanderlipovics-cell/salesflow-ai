"""
Background Services Scheduler

APScheduler-based background job scheduler for SalesFlow AI.
Handles proactive notifications and automated tasks.
"""

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger
from apscheduler.triggers.interval import IntervalTrigger
import logging

logger = logging.getLogger(__name__)

# Global scheduler instance
scheduler = AsyncIOScheduler()


def setup_scheduler():
    """Setup and start the background job scheduler."""

    from .jobs import (
        check_follow_ups,
        update_lead_scores,
        detect_churn_risks,
        track_goals,
        send_daily_briefing,
        power_hour_reminder
    )
    from .jobs import generate_all_suggestions  # optional background Follow-up Generator
    from .followup_autopilot import run_autopilot_for_all_users

    # FollowUp Checker - every 4 hours
    scheduler.add_job(
        check_follow_ups,
        IntervalTrigger(hours=4),
        id="check_follow_ups",
        name="Check Follow-ups",
        replace_existing=True
    )

    # Lead Scorer - daily at 6:00
    scheduler.add_job(
        update_lead_scores,
        CronTrigger(hour=6, minute=0),
        id="update_lead_scores",
        name="Update Lead Scores",
        replace_existing=True
    )

    # Churn Detector - daily at 7:00
    scheduler.add_job(
        detect_churn_risks,
        CronTrigger(hour=7, minute=0),
        id="detect_churn_risks",
        name="Detect Churn Risks",
        replace_existing=True
    )

    # Goal Tracker - daily at 8:00
    scheduler.add_job(
        track_goals,
        CronTrigger(hour=8, minute=0),
        id="track_goals",
        name="Track Goals",
        replace_existing=True
    )

    # Daily Briefing - daily at 7:30
    scheduler.add_job(
        send_daily_briefing,
        CronTrigger(hour=7, minute=30),
        id="send_daily_briefing",
        name="Send Daily Briefing",
        replace_existing=True
    )

    # Power Hour Reminder - at 9:50 and 14:50
    scheduler.add_job(
        power_hour_reminder,
        CronTrigger(hour=9, minute=50),
        id="power_hour_reminder_morning",
        name="Power Hour Reminder (Morning)",
        replace_existing=True
    )

    scheduler.add_job(
        power_hour_reminder,
        CronTrigger(hour=14, minute=50),
        id="power_hour_reminder_afternoon",
        name="Power Hour Reminder (Afternoon)",
        replace_existing=True
    )

    # Follow-up Suggestions Generator - every 15 minutes
    scheduler.add_job(
        generate_all_suggestions,
        IntervalTrigger(minutes=15),
        id="generate_all_suggestions",
        name="Generate Follow-up Suggestions",
        replace_existing=True
    )

    # Autopilot Follow-up Processor - every 15 minutes
    scheduler.add_job(
        run_autopilot_for_all_users,
        IntervalTrigger(minutes=15),
        id="run_autopilot_followups",
        name="Process Autopilot Follow-ups",
        replace_existing=True
    )

    scheduler.start()
    logger.info("Background scheduler started")


def shutdown_scheduler():
    """Shutdown the scheduler gracefully."""
    scheduler.shutdown()
    logger.info("Background scheduler stopped")


__all__ = ["setup_scheduler", "shutdown_scheduler"]

