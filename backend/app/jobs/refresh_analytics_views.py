"""
Refresh Analytics Views Cron Job

Runs hourly to refresh materialized views
"""

import asyncio
import schedule
import time
from datetime import datetime
import os
import sys

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '../..')))

from app.core.database import get_db


async def refresh_analytics():
    """
    Refresh all materialized views
    
    Views refreshed:
    - response_heatmap
    - weekly_activity_trend
    - gpt_vs_human_messages
    - channel_performance
    - playbook_performance
    - template_performance
    - user_activity_summary
    - lead_pipeline_summary
    - ai_prompt_performance
    - daily_stats_snapshot
    """
    
    print(f"[{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}] Refreshing analytics views...")
    
    try:
        async with get_db() as db:
            result = await db.fetchval("SELECT refresh_all_analytics_views()")
            print(f"✅ {result}")
            
    except Exception as e:
        print(f"❌ Error refreshing views: {e}")


def run_job():
    """Wrapper to run async job"""
    asyncio.run(refresh_analytics())


def main():
    """
    Main scheduler
    Runs hourly by default
    """
    
    interval_minutes = int(os.getenv('ANALYTICS_REFRESH_INTERVAL_MINUTES', '60'))
    
    print(f"🚀 Analytics refresh scheduler started")
    print(f"📊 Refreshing every {interval_minutes} minutes")
    print(f"⏰ Press Ctrl+C to stop\n")
    
    # Schedule job
    schedule.every(interval_minutes).minutes.do(run_job)
    
    # Run immediately
    run_job()
    
    # Main loop
    try:
        while True:
            schedule.run_pending()
            time.sleep(60)
    except KeyboardInterrupt:
        print("\n\n🛑 Scheduler stopped")


if __name__ == "__main__":
    main()

