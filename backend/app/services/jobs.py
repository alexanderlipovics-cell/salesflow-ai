"""
Background Jobs for Al Sales Solutions

Automated tasks that run on schedule to make the AI proactive.
"""

from datetime import datetime, timedelta
import logging
from ..core.deps import get_supabase
from .notifications import create_notification, log_job_start, log_job_complete

logger = logging.getLogger(__name__)


# ═══════════════════════════════════════════════════════════
# JOB 1: FOLLOW-UP CHECKER (every 4 hours)
# ═══════════════════════════════════════════════════════════

async def check_follow_ups():
    """
    Checks for overdue follow-ups and leads without response.
    Creates notifications for users.
    """
    db = await get_supabase()  # MUSS awaited werden!
    job_id = await log_job_start(db, "check_follow_ups")

    try:
        # Get all overdue follow-up suggestions grouped by user
        overdue = await db.from_("followup_suggestions").select(
            "id, title, due_at, user_id, lead_id, leads(name)"
        ).eq("status", "pending").lt(
            "due_at", datetime.now().isoformat()
        ).execute()

        # Group by user
        by_user = {}
        for task in overdue.data:
            user_id = task["user_id"]
            if user_id not in by_user:
                by_user[user_id] = []
            by_user[user_id].append(task)

        # Create notifications
        notifications_created = 0
        for user_id, tasks in by_user.items():
            count = len(tasks)
            oldest = tasks[0]

            await create_notification(
                db=db,
                user_id=user_id,
                type="overdue_followups",
                title=f"📋 {count} überfällige Follow-up{'s' if count > 1 else ''}",
                body=f"Ältester: {oldest['leads']['name'] if oldest.get('leads') else 'Unbekannt'} - {oldest['title']}",
                data={
                    "task_ids": [t["id"] for t in tasks],
                    "count": count
                }
            )
            notifications_created += 1

        await log_job_complete(db, job_id, records_processed=len(overdue.data))
        logger.info(f"FollowUp Checker: {len(overdue.data)} overdue, {notifications_created} notifications")

    except Exception as e:
        logger.error(f"FollowUp Checker failed: {e}")
        await log_job_complete(db, job_id, error=str(e))


# ═══════════════════════════════════════════════════════════
# JOB 2: LEAD SCORER (daily at 6:00)
# ═══════════════════════════════════════════════════════════

async def update_lead_scores():
    """
    Recalculates lead scores and flags newly hot leads.
    """
    db = await get_supabase()  # MUSS awaited werden!
    job_id = await log_job_start(db, "update_lead_scores")

    try:
        # Get all active leads
        leads = await db.from_("leads").select(
            "id, user_id, name, score, last_contact, status, created_at"
        ).not_.in_("status", ["lost", "won"]).execute()

        updated = 0
        new_hot_leads = []

        for lead in leads.data:
            old_score = lead.get("score") or 0
            new_score = await calculate_lead_score(db, lead)

            # Update if changed
            if new_score != old_score:
                await db.from_("leads").update({
                    "score": new_score
                }).eq("id", lead["id"]).execute()
                updated += 1

            # Track newly hot leads
            if new_score >= 70 and old_score < 70:
                new_hot_leads.append({
                    "lead": lead,
                    "new_score": new_score
                })

        # Notify about new hot leads
        for hot in new_hot_leads:
            await create_notification(
                db=db,
                user_id=hot["lead"]["user_id"],
                type="hot_lead",
                title="🔥 Neuer Hot Lead!",
                body=f"{hot['lead']['name']} ist jetzt ein Hot Lead (Score: {hot['new_score']})",
                data={
                    "lead_id": hot["lead"]["id"],
                    "score": hot["new_score"]
                }
            )

        await log_job_complete(db, job_id, records_processed=updated, metadata={
            "new_hot_leads": len(new_hot_leads)
        })
        logger.info(f"Lead Scorer: {updated} updated, {len(new_hot_leads)} new hot leads")

    except Exception as e:
        logger.error(f"Lead Scorer failed: {e}")
        await log_job_complete(db, job_id, error=str(e))


async def calculate_lead_score(db, lead: dict) -> int:
    """Calculate a lead's score based on various factors."""

    score = 50  # Base score

    # Factor 1: Recency of contact (-20 to +20)
    if lead.get("last_contact"):
        last_contact = datetime.fromisoformat(lead["last_contact"].replace("Z", ""))
        days_since = (datetime.now() - last_contact).days

        if days_since <= 3:
            score += 20
        elif days_since <= 7:
            score += 10
        elif days_since <= 14:
            score += 0
        elif days_since <= 30:
            score -= 10
        else:
            score -= 20
    else:
        score -= 10

    # Factor 2: Number of interactions (+2 per interaction, max +20)
    interactions = await db.from_("lead_interactions").select(
        "id"
    ).eq("lead_id", lead["id"]).execute()

    interaction_bonus = min(len(interactions.data) * 2, 20)
    score += interaction_bonus

    # Factor 3: Positive outcomes (+5 each, max +15)
    positive = await db.from_("lead_interactions").select(
        "id"
    ).eq("lead_id", lead["id"]).eq("outcome", "positive").execute()

    positive_bonus = min(len(positive.data) * 5, 15)
    score += positive_bonus

    # Factor 4: Status progression
    status_scores = {
        "new": 0,
        "contacted": 5,
        "qualified": 15,
        "proposal": 25,
        "negotiation": 30
    }
    score += status_scores.get(lead.get("status"), 0)

    # Clamp score to 0-100
    return max(0, min(100, score))


# ═══════════════════════════════════════════════════════════
# JOB 3: CHURN DETECTOR (daily at 7:00)
# ═══════════════════════════════════════════════════════════

async def detect_churn_risks():
    """
    Identifies customers at risk of churning.
    """
    db = await get_supabase()  # MUSS awaited werden!
    job_id = await log_job_start(db, "detect_churn_risks")

    try:
        # Find customers with no contact for 30+ days
        cutoff = datetime.now() - timedelta(days=30)

        at_risk = await db.from_("leads").select(
            "id, user_id, name, company, last_contact"
        ).eq("status", "won").lt(
            "last_contact", cutoff.isoformat()
        ).execute()

        # Group by user
        by_user = {}
        for lead in at_risk.data:
            user_id = lead["user_id"]
            if user_id not in by_user:
                by_user[user_id] = []
            by_user[user_id].append(lead)

        # Create notifications
        for user_id, leads in by_user.items():
            if len(leads) == 0:
                continue

            count = len(leads)
            first = leads[0]

            # Calculate days since last contact
            last_contact = datetime.fromisoformat(first["last_contact"].replace("Z", ""))
            days_since = (datetime.now() - last_contact).days

            await create_notification(
                db=db,
                user_id=user_id,
                type="churn_risk",
                title=f"⚠️ {count} Kunde{'n' if count > 1 else ''} brauchen Aufmerksamkeit",
                body=f"{first['name']} - {days_since} Tage kein Kontakt",
                data={
                    "lead_ids": [l["id"] for l in leads],
                    "count": count
                }
            )

        await log_job_complete(db, job_id, records_processed=len(at_risk.data))
        logger.info(f"Churn Detector: {len(at_risk.data)} at risk customers found")

    except Exception as e:
        logger.error(f"Churn Detector failed: {e}")
        await log_job_complete(db, job_id, error=str(e))


# ═══════════════════════════════════════════════════════════
# JOB 4: GOAL TRACKER (daily at 8:00)
# ═══════════════════════════════════════════════════════════

async def track_goals():
    """
    Compares current performance vs goals.
    """
    db = await get_supabase()  # MUSS awaited werden!
    job_id = await log_job_start(db, "track_goals")

    try:
        # Get all users with goals
        users = await db.from_("profiles").select(
            "id, name, monthly_revenue_goal"
        ).not_.is_("monthly_revenue_goal", "null").gt(
            "monthly_revenue_goal", 0
        ).execute()

        notifications_sent = 0

        for user in users.data:
            user_id = user["id"]
            goal = user["monthly_revenue_goal"]

            # Get current month's revenue
            start_of_month = datetime.now().replace(day=1, hour=0, minute=0, second=0)

            revenue = await db.from_("deals").select(
                "value"
            ).eq("user_id", user_id).eq(
                "status", "won"
            ).gte("closed_at", start_of_month.isoformat()).execute()

            current = sum([d["value"] or 0 for d in revenue.data])
            percentage = (current / goal * 100) if goal > 0 else 0

            # Calculate expected percentage based on day of month
            day_of_month = datetime.now().day
            days_in_month = 30  # Simplified
            expected_percentage = (day_of_month / days_in_month) * 100

            # Determine notification type
            if percentage >= expected_percentage + 10:
                # Ahead of goal
                await create_notification(
                    db=db,
                    user_id=user_id,
                    type="goal_ahead",
                    title="🚀 Du bist ahead of target!",
                    body=f"{percentage:.0f}% erreicht - weiter so!",
                    data={
                        "current": current,
                        "goal": goal,
                        "percentage": percentage
                    }
                )
                notifications_sent += 1

            elif percentage < expected_percentage - 20:
                # Behind goal
                remaining = goal - current
                await create_notification(
                    db=db,
                    user_id=user_id,
                    type="goal_behind",
                    title=f"📊 Noch €{remaining:,.0f} bis zum Ziel",
                    body=f"Du bist bei {percentage:.0f}% - soll ich Quick Wins zeigen?",
                    data={
                        "current": current,
                        "goal": goal,
                        "remaining": remaining,
                        "percentage": percentage
                    }
                )
                notifications_sent += 1

        await log_job_complete(db, job_id, records_processed=len(users.data), metadata={
            "notifications_sent": notifications_sent
        })
        logger.info(f"Goal Tracker: {len(users.data)} users checked, {notifications_sent} notifications")

    except Exception as e:
        logger.error(f"Goal Tracker failed: {e}")
        await log_job_complete(db, job_id, error=str(e))


# ═══════════════════════════════════════════════════════════
# JOB 5: DAILY BRIEFING (daily at 7:30)
# ═══════════════════════════════════════════════════════════

async def send_daily_briefing():
    """
    Sends personalized morning briefing to all users.
    """
    db = await get_supabase()  # MUSS awaited werden!
    job_id = await log_job_start(db, "send_daily_briefing")

    try:
        # Get all users with daily briefing enabled
        users = await db.from_("user_notification_preferences").select(
            "user_id"
        ).eq("daily_briefing", True).execute()

        # If no preferences set, get all users
        if not users.data:
            users = await db.from_("profiles").select("id").execute()
            user_ids = [u["id"] for u in users.data]
        else:
            user_ids = [u["user_id"] for u in users.data]

        briefings_sent = 0
        today = datetime.now().date()
        tomorrow = today + timedelta(days=1)

        for user_id in user_ids:
            # Get user name
            user = await db.from_("profiles").select("name").eq(
                "id", user_id
            ).single().execute()

            user_name = user.data.get("name", "").split()[0] if user.data else ""

            # Get today's follow-ups
            followups = await db.from_("followup_suggestions").select(
                "id"
            ).eq("user_id", user_id).eq("status", "pending").gte(
                "due_at", today.isoformat()
            ).lt(
                "due_at", tomorrow.isoformat()
            ).execute()

            # Get today's appointments (if calendar_events table exists)
            try:
                appointments = await db.from_("calendar_events").select(
                    "id"
                ).eq("user_id", user_id).gte(
                    "start_time", today.isoformat()
                ).lt(
                    "start_time", tomorrow.isoformat()
                ).execute()
                appointment_count = len(appointments.data)
            except:
                appointment_count = 0

            # Get overdue tasks
            overdue = await db.from_("followup_suggestions").select(
                "id"
            ).eq("user_id", user_id).eq("status", "pending").lt(
                "due_at", today.isoformat()
            ).execute()

            # Build briefing
            parts = []

            if followups.data:
                parts.append(f"📋 {len(followups.data)} Follow-up{'s' if len(followups.data) > 1 else ''}")

            if appointment_count > 0:
                parts.append(f"📅 {appointment_count} Termin{'e' if appointment_count > 1 else ''}")

            if overdue.data:
                parts.append(f"⚠️ {len(overdue.data)} überfällig")

            if not parts:
                body = "Keine geplanten Aktivitäten - perfekt für Akquise!"
            else:
                body = " | ".join(parts)

            await create_notification(
                db=db,
                user_id=user_id,
                type="daily_briefing",
                title=f"☀️ Guten Morgen{', ' + user_name if user_name else ''}!",
                body=body,
                data={
                    "followups": len(followups.data),
                    "appointments": appointment_count,
                    "overdue": len(overdue.data)
                }
            )
            briefings_sent += 1

        await log_job_complete(db, job_id, records_processed=briefings_sent)
        logger.info(f"Daily Briefing: {briefings_sent} briefings sent")

    except Exception as e:
        logger.error(f"Daily Briefing failed: {e}")
        await log_job_complete(db, job_id, error=str(e))


# ═══════════════════════════════════════════════════════════
# JOB 6: POWER HOUR REMINDER
# ═══════════════════════════════════════════════════════════

async def power_hour_reminder():
    """
    Reminds users about upcoming Power Hour.
    """
    db = await get_supabase()  # MUSS awaited werden!
    job_id = await log_job_start(db, "power_hour_reminder")

    try:
        current_hour = datetime.now().hour + 1  # Reminder is 10 min before

        # Get users with Power Hour enabled at this time
        users = await db.from_("user_notification_preferences").select(
            "user_id, power_hour_times"
        ).eq("power_hour_enabled", True).execute()

        reminders_sent = 0

        for pref in users.data:
            times = pref.get("power_hour_times", [10, 15])

            if current_hour in times:
                await create_notification(
                    db=db,
                    user_id=pref["user_id"],
                    type="power_hour",
                    title="⚡ Power Hour in 10 Minuten!",
                    body="Zeit für fokussierte Akquise. Bist du bereit?",
                    data={
                        "action": "start_power_hour",
                        "suggested_time": current_hour
                    }
                )
                reminders_sent += 1

        await log_job_complete(db, job_id, records_processed=reminders_sent)
        logger.info(f"Power Hour Reminder: {reminders_sent} reminders sent")

    except Exception as e:
        logger.error(f"Power Hour Reminder failed: {e}")
        await log_job_complete(db, job_id, error=str(e))


# ═══════════════════════════════════════════════════════════
# JOB 7: FOLLOW-UP SUGGESTION GENERATOR (placeholder)
# ═══════════════════════════════════════════════════════════

async def generate_all_suggestions():
    """
    Placeholder für globale Follow-up Vorschlags-Generierung.
    Aktuell nur Logging – kann später mit Supabase-Flow befüllt werden.
    """
    db = await get_supabase()  # MUSS awaited werden!
    job_id = await log_job_start(db, "generate_all_suggestions")

    try:
        # Die eigentliche Generierung wird vom Follow-up Router übernommen.
        await log_job_complete(db, job_id, metadata={"status": "noop"})
        logger.info("generate_all_suggestions executed (noop)")
    except Exception as e:
        logger.error(f"generate_all_suggestions failed: {e}")
        await log_job_complete(db, job_id, error=str(e))


__all__ = [
    "check_follow_ups",
    "update_lead_scores",
    "detect_churn_risks",
    "track_goals",
    "send_daily_briefing",
    "power_hour_reminder",
    "generate_all_suggestions",
]
