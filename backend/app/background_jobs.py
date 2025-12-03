"""
SALES FLOW AI - BACKGROUND JOBS
Scheduled jobs for autonomous system
Version: 2.0.0 | Created: 2024-12-01
"""

import asyncio
import logging
from datetime import datetime

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger
from apscheduler.triggers.interval import IntervalTrigger

from app.core.supabase import get_supabase_client
from app.services.autonomous_agent_service import AutonomousAgentService
from app.services.lead_lifecycle_service import LeadLifecycleService
from config import settings

logger = logging.getLogger(__name__)

# Initialize services
agent_service = None
lifecycle_service = None


def init_services():
    """Initialize services"""
    global agent_service, lifecycle_service
    
    agent_service = AutonomousAgentService(openai_api_key=settings.OPENAI_API_KEY)
    lifecycle_service = LeadLifecycleService(openai_api_key=settings.OPENAI_API_KEY)
    
    logger.info("Background job services initialized")


# ============================================================================
# JOB 1: DAILY LEAD REVIEW (Every morning at 8 AM)
# ============================================================================

async def daily_lead_review_job():
    """
    Daily automated lead review for all users.
    Generates action plans and sends notifications.
    """
    try:
        logger.info("Starting daily lead review job...")
        
        # Get all active users
        users = await get_all_active_users()
        
        total_users = len(users)
        successful = 0
        failed = 0
        
        for user in users:
            try:
                result = await agent_service.daily_lead_review(user['id'])
                
                if result.get('success'):
                    successful += 1
                    logger.info(f"Daily review completed for user {user['id']}: {result.get('leads_analyzed', 0)} leads")
                else:
                    failed += 1
                    logger.error(f"Daily review failed for user {user['id']}: {result.get('error')}")
                
                # Small delay to avoid rate limits
                await asyncio.sleep(0.5)
                
            except Exception as e:
                failed += 1
                logger.error(f"Error in daily review for user {user['id']}: {e}")
        
        logger.info(f"Daily lead review completed: {successful}/{total_users} successful, {failed} failed")
        
    except Exception as e:
        logger.error(f"Error in daily_lead_review_job: {e}")


# ============================================================================
# JOB 2: INACTIVITY CHECK (Every hour)
# ============================================================================

async def hourly_inactivity_check():
    """
    Check all leads for inactivity and trigger actions.
    Runs hourly to catch time-sensitive situations.
    """
    try:
        logger.info("Starting hourly inactivity check...")
        
        result = await lifecycle_service.check_all_leads_inactivity()
        
        logger.info(f"Inactivity check completed: {result.get('leads_checked', 0)} leads checked, {result.get('actions_triggered', 0)} actions triggered")
        
    except Exception as e:
        logger.error(f"Error in hourly_inactivity_check: {e}")


# ============================================================================
# JOB 3: VIEW REFRESH (Every 6 hours)
# ============================================================================

async def refresh_materialized_views():
    """
    Refresh all materialized views for analytics.
    Runs every 6 hours to keep dashboards up-to-date.
    """
    try:
        logger.info("Refreshing materialized views...")
        
        supabase = get_supabase_client()
        
        # Refresh all KI views
        supabase.rpc("refresh_all_ki_views", {}).execute()
        
        logger.info("Materialized views refreshed successfully")
        
    except Exception as e:
        logger.error(f"Error refreshing views: {e}")


# ============================================================================
# JOB 4: RECOMMENDATION EXPIRY (Daily at midnight)
# ============================================================================

async def expire_old_recommendations():
    """
    Mark old recommendations as expired.
    Keeps recommendation queue clean.
    """
    try:
        logger.info("Expiring old recommendations...")
        
        supabase = get_supabase_client()
        
        # Update recommendations older than 7 days
        from datetime import timedelta
        seven_days_ago = (datetime.utcnow() - timedelta(days=7)).isoformat()
        
        result = supabase.table("ai_recommendations").update({
            "status": "dismissed",
            "dismissed_reason": "Auto-expired after 7 days"
        }).eq("status", "pending").lt("created_at", seven_days_ago).execute()
        
        count = len(result.data) if result.data else 0
        logger.info(f"Expired {count} old recommendations")
        
    except Exception as e:
        logger.error(f"Error expiring recommendations: {e}")


# ============================================================================
# JOB 5: SQUAD PERFORMANCE ANALYSIS (Weekly on Monday at 9 AM)
# ============================================================================

async def weekly_squad_analysis():
    """
    Analyze squad performance and generate coaching insights.
    Runs every Monday morning.
    """
    try:
        logger.info("Starting weekly squad analysis...")
        
        # Get all active squads
        squads = await get_all_active_squads()
        
        for squad in squads:
            try:
                # Placeholder - implement squad_intelligence_service
                logger.info(f"Squad analysis for {squad['id']} - placeholder")
                
            except Exception as e:
                logger.error(f"Error analyzing squad {squad['id']}: {e}")
        
        logger.info("Weekly squad analysis completed")
        
    except Exception as e:
        logger.error(f"Error in weekly_squad_analysis: {e}")


# ============================================================================
# JOB 6: CLEANUP OLD DATA (Daily at 2 AM)
# ============================================================================

async def cleanup_old_data():
    """
    Clean up old data to maintain performance.
    Runs daily at 2 AM.
    """
    try:
        logger.info("Starting data cleanup...")
        
        supabase = get_supabase_client()
        
        # 1. Delete old compliance logs (>1 year, non-critical)
        one_year_ago = (datetime.utcnow() - timedelta(days=365)).isoformat()
        
        result = supabase.table("compliance_logs").delete().lt(
            "checked_at", one_year_ago
        ).not_.in_("severity", ['high', 'critical']).execute()
        
        compliance_deleted = len(result.data) if result.data else 0
        
        # 2. Delete old coaching sessions (>6 months)
        six_months_ago = (datetime.utcnow() - timedelta(days=180)).isoformat()
        
        result = supabase.table("ai_coaching_sessions").delete().lt(
            "started_at", six_months_ago
        ).execute()
        
        coaching_deleted = len(result.data) if result.data else 0
        
        # 3. Delete old agent memory (low importance, >90 days)
        ninety_days_ago = (datetime.utcnow() - timedelta(days=90)).isoformat()
        
        result = supabase.table("agent_memory").delete().lt(
            "created_at", ninety_days_ago
        ).lt("importance_score", 0.3).execute()
        
        memory_deleted = len(result.data) if result.data else 0
        
        logger.info(f"Cleanup completed: {compliance_deleted} compliance logs, {coaching_deleted} coaching sessions, {memory_deleted} agent memories deleted")
        
    except Exception as e:
        logger.error(f"Error in cleanup_old_data: {e}")


# ============================================================================
# JOB 7: HEALTH CHECK (Every 15 minutes)
# ============================================================================

async def system_health_check():
    """
    Monitor system health and alert on issues.
    Runs every 15 minutes.
    """
    try:
        supabase = get_supabase_client()
        
        # Check database connection
        result = supabase.table("users").select("id").limit(1).execute()
        
        if not result:
            logger.error("Health check failed: Database connection issue")
            # Send alert to admins
        
        # Check pending jobs
        pending_count = supabase.table("outbound_messages_queue").select(
            "id"
        ).eq("status", "queued").execute()
        
        if pending_count and len(pending_count.data) > 1000:
            logger.warning(f"High queue count: {len(pending_count.data)} pending messages")
        
    except Exception as e:
        logger.error(f"Health check failed: {e}")


# ============================================================================
# HELPER FUNCTIONS
# ============================================================================

async def get_all_active_users() -> list:
    """Get all active users"""
    try:
        supabase = get_supabase_client()
        result = supabase.table("users").select("id").execute()
        return result.data if result.data else []
    except Exception as e:
        logger.error(f"Error getting active users: {e}")
        return []


async def get_all_active_squads() -> list:
    """Get all active squads"""
    try:
        supabase = get_supabase_client()
        result = supabase.table("squads").select("id").execute()
        return result.data if result.data else []
    except Exception as e:
        logger.error(f"Error getting active squads: {e}")
        return []


# ============================================================================
# SCHEDULER SETUP
# ============================================================================

scheduler = AsyncIOScheduler()


def start_scheduler():
    """Start the background job scheduler"""
    
    # Initialize services
    init_services()
    
    # JOB 1: Daily Lead Review (8 AM daily)
    scheduler.add_job(
        daily_lead_review_job,
        trigger=CronTrigger(hour=8, minute=0),
        id='daily_lead_review',
        name='Daily Lead Review',
        replace_existing=True
    )
    
    # JOB 2: Inactivity Check (Every hour)
    scheduler.add_job(
        hourly_inactivity_check,
        trigger=IntervalTrigger(hours=1),
        id='hourly_inactivity_check',
        name='Hourly Inactivity Check',
        replace_existing=True
    )
    
    # JOB 3: View Refresh (Every 6 hours)
    scheduler.add_job(
        refresh_materialized_views,
        trigger=IntervalTrigger(hours=6),
        id='refresh_views',
        name='Refresh Materialized Views',
        replace_existing=True
    )
    
    # JOB 4: Expire Old Recommendations (Midnight daily)
    scheduler.add_job(
        expire_old_recommendations,
        trigger=CronTrigger(hour=0, minute=0),
        id='expire_recommendations',
        name='Expire Old Recommendations',
        replace_existing=True
    )
    
    # JOB 5: Squad Analysis (Monday 9 AM)
    scheduler.add_job(
        weekly_squad_analysis,
        trigger=CronTrigger(day_of_week='mon', hour=9, minute=0),
        id='weekly_squad_analysis',
        name='Weekly Squad Analysis',
        replace_existing=True
    )
    
    # JOB 6: Data Cleanup (2 AM daily)
    scheduler.add_job(
        cleanup_old_data,
        trigger=CronTrigger(hour=2, minute=0),
        id='cleanup_old_data',
        name='Cleanup Old Data',
        replace_existing=True
    )
    
    # JOB 7: Health Check (Every 15 min)
    scheduler.add_job(
        system_health_check,
        trigger=IntervalTrigger(minutes=15),
        id='health_check',
        name='System Health Check',
        replace_existing=True
    )
    
    # Start scheduler
    scheduler.start()
    
    logger.info("Background job scheduler started with 7 jobs")
    logger.info("Jobs: Daily Lead Review (8AM), Inactivity Check (hourly), View Refresh (6h), Expire Recommendations (midnight), Squad Analysis (Mon 9AM), Data Cleanup (2AM), Health Check (15min)")


def stop_scheduler():
    """Stop the background job scheduler"""
    scheduler.shutdown()
    logger.info("Background job scheduler stopped")


# ============================================================================
# MANUAL JOB TRIGGERS (for testing)
# ============================================================================

async def run_job_manual(job_name: str) -> dict:
    """Manually trigger a background job"""
    
    jobs = {
        'daily_review': daily_lead_review_job,
        'inactivity_check': hourly_inactivity_check,
        'refresh_views': refresh_materialized_views,
        'expire_recommendations': expire_old_recommendations,
        'squad_analysis': weekly_squad_analysis,
        'cleanup': cleanup_old_data,
        'health_check': system_health_check
    }
    
    if job_name not in jobs:
        return {"error": f"Job '{job_name}' not found"}
    
    try:
        logger.info(f"Manually triggering job: {job_name}")
        await jobs[job_name]()
        return {"success": True, "job": job_name, "timestamp": datetime.utcnow().isoformat()}
    except Exception as e:
        logger.error(f"Error running manual job {job_name}: {e}")
        return {"success": False, "job": job_name, "error": str(e)}


# ============================================================================
# INTEGRATION WITH FASTAPI
# ============================================================================

# Add to main.py:
# 
# from app.background_jobs import start_scheduler, stop_scheduler
# 
# @app.on_event("startup")
# async def startup_event():
#     start_scheduler()
# 
# @app.on_event("shutdown")
# async def shutdown_event():
#     stop_scheduler()

