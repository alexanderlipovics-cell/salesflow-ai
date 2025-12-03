"""
Daily Follow-up Check Cron Job

Runs daily at 9:00 AM (configurable)
Checks all leads and triggers automatic follow-ups
"""

import asyncio
import schedule
import time
from datetime import datetime
import os
import sys

# Add parent directory to path for imports
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '../..')))

from app.services.followup_service import followup_service


async def daily_followup_check():
    """
    Main cron job function
    
    Checks all leads and triggers follow-ups based on:
    - Days since last contact
    - Lead status
    - Recommended playbooks
    """
    
    print(f"\n{'='*60}")
    print(f"[{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}] Starting daily follow-up check...")
    print(f"{'='*60}\n")
    
    try:
        # Run follow-up check for all users
        results = await followup_service.check_and_trigger_followups()
        
        print(f"\n{'='*60}")
        print(f"Follow-up check complete:")
        print(f"  ✅ Checked:   {results['checked']} leads")
        print(f"  📤 Triggered: {results['triggered']} follow-ups")
        print(f"  ❌ Failed:    {results['failed']}")
        print(f"  ⏭️  Skipped:   {results['skipped']}")
        
        if results['details']:
            print(f"\n  Details:")
            for detail in results['details'][:10]:  # Show first 10
                print(f"    - {detail['lead_name']} via {detail['channel']} ({detail['playbook']})")
            
            if len(results['details']) > 10:
                print(f"    ... and {len(results['details']) - 10} more")
        
        print(f"{'='*60}\n")
        
        # Log to file
        log_to_file(results)
        
    except Exception as e:
        print(f"\n❌ ERROR: {e}\n")
        import traceback
        traceback.print_exc()


def log_to_file(results: dict):
    """Log results to file for monitoring"""
    
    log_dir = os.path.join(os.path.dirname(__file__), '../../logs')
    os.makedirs(log_dir, exist_ok=True)
    
    log_file = os.path.join(log_dir, 'followup_cron.log')
    
    with open(log_file, 'a') as f:
        f.write(f"\n[{datetime.now().isoformat()}]\n")
        f.write(f"Checked: {results['checked']}, ")
        f.write(f"Triggered: {results['triggered']}, ")
        f.write(f"Failed: {results['failed']}, ")
        f.write(f"Skipped: {results['skipped']}\n")


def run_job():
    """Wrapper to run async job in event loop"""
    asyncio.run(daily_followup_check())


def main():
    """
    Main scheduler
    
    Configurable via environment variables:
    - FOLLOWUP_CRON_TIME: Time to run (default: 09:00)
    - FOLLOWUP_CRON_ENABLED: Enable/disable (default: true)
    """
    
    cron_time = os.getenv('FOLLOWUP_CRON_TIME', '09:00')
    cron_enabled = os.getenv('FOLLOWUP_CRON_ENABLED', 'true').lower() == 'true'
    
    if not cron_enabled:
        print("⚠️  Cron job disabled via FOLLOWUP_CRON_ENABLED")
        return
    
    print(f"🚀 Daily follow-up job scheduler started")
    print(f"📅 Scheduled to run daily at {cron_time}")
    print(f"⏰ Press Ctrl+C to stop\n")
    
    # Schedule daily job
    schedule.every().day.at(cron_time).do(run_job)
    
    # Run immediately on startup (optional)
    if os.getenv('FOLLOWUP_RUN_ON_START', 'false').lower() == 'true':
        print("⚡ Running initial check now...")
        run_job()
    
    # Main loop
    try:
        while True:
            schedule.run_pending()
            time.sleep(60)  # Check every minute
    except KeyboardInterrupt:
        print("\n\n🛑 Scheduler stopped by user")


if __name__ == "__main__":
    main()
