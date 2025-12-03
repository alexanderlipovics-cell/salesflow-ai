#!/usr/bin/env python3
"""
╔════════════════════════════════════════════════════════════════════════════╗
║  PUSH NOTIFICATION CRONJOB                                                 ║
║  Morning Briefings & Evening Recaps                                        ║
╚════════════════════════════════════════════════════════════════════════════╝

Ausführung:
    # Morning (alle Stunden zwischen 6-10 Uhr)
    0 6-10 * * * cd /path/to/backend && python -m app.jobs.send_push_notifications morning
    
    # Evening (alle Stunden zwischen 17-21 Uhr)  
    0 17-21 * * * cd /path/to/backend && python -m app.jobs.send_push_notifications evening

Der Job prüft die individuelle Uhrzeit jedes Users in seiner Zeitzone.
Nur User deren eingestellte Zeit innerhalb eines 5-Minuten-Fensters liegt,
bekommen die Notification.

Alternative: Celery Beat / APScheduler für präzisere Zeitplanung.
"""

import asyncio
from datetime import datetime
import sys
import os

# Add parent directory to path for imports
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from backend.app.db.supabase import get_supabase
from backend.app.services.push import PushService


async def send_morning_briefings():
    """
    Sendet Morning Briefings an alle fälligen User.
    
    Logik:
    1. Hole alle User deren morning_time jetzt ist (±5 Min)
    2. Generiere für jeden das Morning Briefing
    3. Sende Push Notification
    """
    
    db = get_supabase()
    service = PushService(db)
    
    now = datetime.now()
    current_hour = now.hour
    current_minute = now.minute
    
    print(f"[Morning Briefings] Starting at {now.strftime('%H:%M')} UTC")
    
    try:
        # Get users whose morning time is now
        users = service.get_users_for_morning_push(current_hour, current_minute)
        
        print(f"[Morning Briefings] Found {len(users)} users")
        
        sent = 0
        errors = 0
        
        for user_data in users:
            user_id = user_data.get("user_id")
            
            if not user_id:
                continue
            
            try:
                # Generate briefing
                briefing = service.generate_morning_briefing(user_id)
                
                # Build notification body
                targets_total = sum(briefing.daily_targets.values())
                body = f"📋 {targets_total} Aktionen heute"
                
                if briefing.streak_days > 0:
                    body += f" | 🔥 {briefing.streak_days} Tage Streak"
                
                # Send push
                success = await service.send_push(
                    user_id=user_id,
                    title=briefing.greeting,
                    body=body,
                    data={
                        "type": "morning_briefing",
                        "targets": briefing.daily_targets,
                        "top_leads": [l.model_dump() for l in briefing.top_leads] if briefing.top_leads else [],
                    },
                    push_type="morning_briefing",
                )
                
                if success:
                    sent += 1
                    print(f"  ✓ Sent to {user_id}")
                    
            except Exception as e:
                errors += 1
                print(f"  ✗ Error for {user_id}: {e}")
        
        print(f"[Morning Briefings] Completed: {sent} sent, {errors} errors")
        
    except Exception as e:
        print(f"[Morning Briefings] Fatal error: {e}")
        raise


async def send_evening_recaps():
    """
    Sendet Evening Recaps an alle fälligen User.
    
    Logik:
    1. Hole alle User deren evening_time jetzt ist (±5 Min)
    2. Generiere für jeden den Evening Recap
    3. Sende Push Notification
    """
    
    db = get_supabase()
    service = PushService(db)
    
    now = datetime.now()
    current_hour = now.hour
    current_minute = now.minute
    
    print(f"[Evening Recaps] Starting at {now.strftime('%H:%M')} UTC")
    
    try:
        # Get users whose evening time is now
        users = service.get_users_for_evening_push(current_hour, current_minute)
        
        print(f"[Evening Recaps] Found {len(users)} users")
        
        sent = 0
        errors = 0
        
        for user_data in users:
            user_id = user_data.get("user_id")
            
            if not user_id:
                continue
            
            try:
                # Generate recap
                recap = service.generate_evening_recap(user_id)
                
                # Build notification body
                body = f"📊 {recap.completion_rate:.0f}% erreicht"
                
                if recap.wins:
                    body += f" | {len(recap.wins)} Wins heute"
                
                # Send push
                success = await service.send_push(
                    user_id=user_id,
                    title=recap.greeting,
                    body=body,
                    data={
                        "type": "evening_recap",
                        "completed": recap.completed,
                        "targets": recap.targets,
                        "completion_rate": recap.completion_rate,
                        "wins": recap.wins,
                    },
                    push_type="evening_recap",
                )
                
                if success:
                    sent += 1
                    print(f"  ✓ Sent to {user_id}")
                    
            except Exception as e:
                errors += 1
                print(f"  ✗ Error for {user_id}: {e}")
        
        print(f"[Evening Recaps] Completed: {sent} sent, {errors} errors")
        
    except Exception as e:
        print(f"[Evening Recaps] Fatal error: {e}")
        raise


async def send_reminder(user_id: str, reminder_type: str, message: str):
    """
    Sendet eine individuelle Reminder-Notification.
    
    Args:
        user_id: User ID
        reminder_type: Art des Reminders (z.B. "followup_due")
        message: Nachrichtentext
    """
    
    db = get_supabase()
    service = PushService(db)
    
    await service.send_push(
        user_id=user_id,
        title="📌 Reminder",
        body=message,
        data={"type": reminder_type},
        push_type="reminder",
    )


async def send_achievement(user_id: str, achievement: str, description: str):
    """
    Sendet eine Achievement-Notification.
    
    Args:
        user_id: User ID
        achievement: Name des Achievements
        description: Beschreibung
    """
    
    db = get_supabase()
    service = PushService(db)
    
    await service.send_push(
        user_id=user_id,
        title=f"🏆 {achievement}",
        body=description,
        data={"type": "achievement", "achievement": achievement},
        push_type="achievement",
    )


def main():
    """
    CLI Entry Point.
    
    Usage:
        python send_push_notifications.py morning
        python send_push_notifications.py evening
        python send_push_notifications.py test <user_id>
    """
    
    if len(sys.argv) < 2:
        print("Usage: python send_push_notifications.py [morning|evening|test]")
        print("")
        print("Commands:")
        print("  morning  - Send morning briefings to all due users")
        print("  evening  - Send evening recaps to all due users")
        print("  test     - Test push for a specific user")
        print("")
        print("Crontab Examples:")
        print("  # Run every hour 6-10 AM for morning briefings")
        print("  0 6-10 * * * python send_push_notifications.py morning")
        print("")
        print("  # Run every hour 5-9 PM for evening recaps")
        print("  0 17-21 * * * python send_push_notifications.py evening")
        sys.exit(1)
    
    mode = sys.argv[1].lower()
    
    if mode == "morning":
        print("=" * 60)
        print("SALES FLOW AI - MORNING BRIEFINGS")
        print("=" * 60)
        asyncio.run(send_morning_briefings())
        
    elif mode == "evening":
        print("=" * 60)
        print("SALES FLOW AI - EVENING RECAPS")
        print("=" * 60)
        asyncio.run(send_evening_recaps())
        
    elif mode == "test":
        if len(sys.argv) < 3:
            print("Usage: python send_push_notifications.py test <user_id>")
            sys.exit(1)
        
        user_id = sys.argv[2]
        print(f"Testing push for user: {user_id}")
        
        db = get_supabase()
        service = PushService(db)
        
        # Generate and print morning briefing
        print("\n--- MORNING BRIEFING ---")
        briefing = service.generate_morning_briefing(user_id)
        print(f"Greeting: {briefing.greeting}")
        print(f"Date: {briefing.date}")
        print(f"Targets: {briefing.daily_targets}")
        print(f"Streak: {briefing.streak_days} days")
        print(f"Motivation: {briefing.motivational_message}")
        print(f"Quick Actions: {briefing.quick_actions}")
        
        # Generate and print evening recap
        print("\n--- EVENING RECAP ---")
        recap = service.generate_evening_recap(user_id)
        print(f"Greeting: {recap.greeting}")
        print(f"Completed: {recap.completed}")
        print(f"Targets: {recap.targets}")
        print(f"Completion Rate: {recap.completion_rate}%")
        print(f"Wins: {recap.wins}")
        print(f"Lessons: {recap.lessons}")
        print(f"Tomorrow: {recap.tomorrow_preview}")
        
    else:
        print(f"Unknown mode: {mode}")
        print("Use 'morning', 'evening', or 'test'")
        sys.exit(1)


if __name__ == "__main__":
    main()

