"""
Daily Briefing Service - Get today's most important tasks for network marketers
"""

import logging
from datetime import datetime, timedelta
from typing import List, Dict, Any, Optional
from dataclasses import dataclass

logger = logging.getLogger(__name__)

@dataclass
class TodayLead:
    """A lead that should be contacted today"""
    id: str
    name: str
    company: Optional[str]
    phone: Optional[str]
    email: Optional[str]
    status: str
    score: Optional[int]
    last_contact: Optional[str]
    next_follow_up: Optional[str]
    reason: str  # "overdue", "today", "hot"
    reason_text: str  # Human readable reason
    priority: int  # 1-3, 1 being highest

@dataclass
class TodayStats:
    """Statistics for today's briefing"""
    overdue: int
    today: int
    hot: int
    total: int

@dataclass
class DailyBriefing:
    """Complete daily briefing response"""
    leads: List[TodayLead]
    stats: TodayStats
    last_updated: str

class DailyBriefingService:
    """Service for generating daily task briefings"""

    def __init__(self, db_client):
        self.db = db_client

    async def get_daily_briefing(self, user_id: str) -> DailyBriefing:
        """
        Get the daily briefing for a user.
        Returns up to 5 most important leads to contact today.
        """
        today = datetime.now().date()
        today_str = today.isoformat()

        leads = []

        # 1. Get overdue leads (highest priority)
        overdue_leads = await self._get_overdue_leads(user_id, today_str, limit=2)
        leads.extend(overdue_leads)

        # 2. Get leads scheduled for today
        today_leads = await self._get_today_leads(user_id, today_str, limit=2)
        leads.extend(today_leads)

        # 3. Get hot leads that haven't been contacted recently
        hot_leads = await self._get_hot_leads(user_id, today_str, limit=1)
        leads.extend(hot_leads)

        # Get total counts for stats
        stats = await self._get_today_stats(user_id, today_str)

        return DailyBriefing(
            leads=leads,
            stats=stats,
            last_updated=datetime.now().isoformat()
        )

    async def _get_overdue_leads(self, user_id: str, today_str: str, limit: int = 2) -> List[TodayLead]:
        """Get leads that are overdue for follow-up"""
        try:
            result = (
                self.db.table("leads")
                .select("id, name, company, phone, email, status, score, last_contact, next_follow_up")
                .eq("user_id", user_id)
                .lt("next_follow_up", today_str)
                .not_.is_("next_follow_up", None)
                .order("next_follow_up", desc=True)  # Most overdue first
                .limit(limit)
                .execute()
            )

            leads = []
            for row in result.data:
                days_overdue = self._calculate_days_overdue(row.get("next_follow_up"))
                leads.append(TodayLead(
                    id=row["id"],
                    name=row["name"],
                    company=row.get("company"),
                    phone=row.get("phone"),
                    email=row.get("email"),
                    status=row["status"],
                    score=row.get("score"),
                    last_contact=row.get("last_contact"),
                    next_follow_up=row.get("next_follow_up"),
                    reason="overdue",
                    reason_text=f"Überfällig seit {days_overdue} Tagen",
                    priority=1
                ))

            return leads

        except Exception as e:
            logger.error(f"Error getting overdue leads: {e}")
            return []

    async def _get_today_leads(self, user_id: str, today_str: str, limit: int = 2) -> List[TodayLead]:
        """Get leads scheduled for follow-up today"""
        try:
            tomorrow = (datetime.fromisoformat(today_str) + timedelta(days=1)).date().isoformat()

            result = (
                self.db.table("leads")
                .select("id, name, company, phone, email, status, score, last_contact, next_follow_up")
                .eq("user_id", user_id)
                .gte("next_follow_up", today_str)
                .lt("next_follow_up", tomorrow)
                .order("score", desc=True)  # Highest scoring first
                .limit(limit)
                .execute()
            )

            leads = []
            for row in result.data:
                leads.append(TodayLead(
                    id=row["id"],
                    name=row["name"],
                    company=row.get("company"),
                    phone=row.get("phone"),
                    email=row.get("email"),
                    status=row["status"],
                    score=row.get("score"),
                    last_contact=row.get("last_contact"),
                    next_follow_up=row.get("next_follow_up"),
                    reason="today",
                    reason_text="Follow-up heute fällig",
                    priority=2
                ))

            return leads

        except Exception as e:
            logger.error(f"Error getting today leads: {e}")
            return []

    async def _get_hot_leads(self, user_id: str, today_str: str, limit: int = 1) -> List[TodayLead]:
        """Get hot leads that haven't been contacted recently"""
        try:
            # Define "recently" as within the last 7 days
            week_ago = (datetime.now() - timedelta(days=7)).isoformat()

            result = (
                self.db.table("leads")
                .select("id, name, company, phone, email, status, score, last_contact, next_follow_up")
                .eq("user_id", user_id)
                .eq("status", "hot")
                .or_(".is.last_contact,null", f"last_contact.lt.{week_ago}")
                .order("score", desc=True)
                .limit(limit)
                .execute()
            )

            leads = []
            for row in result.data:
                leads.append(TodayLead(
                    id=row["id"],
                    name=row["name"],
                    company=row.get("company"),
                    phone=row.get("phone"),
                    email=row.get("email"),
                    status=row["status"],
                    score=row.get("score"),
                    last_contact=row.get("last_contact"),
                    next_follow_up=row.get("next_follow_up"),
                    reason="hot",
                    reason_text="Heißer Lead - kontaktieren!",
                    priority=3
                ))

            return leads

        except Exception as e:
            logger.error(f"Error getting hot leads: {e}")
            return []

    async def _get_today_stats(self, user_id: str, today_str: str) -> TodayStats:
        """Get statistics for today's briefing"""
        try:
            # Overdue count
            overdue_result = (
                self.db.table("leads")
                .select("id", count="exact")
                .eq("user_id", user_id)
                .lt("next_follow_up", today_str)
                .not_.is_("next_follow_up", None)
                .execute()
            )
            overdue_count = overdue_result.count or 0

            # Today count
            tomorrow = (datetime.fromisoformat(today_str) + timedelta(days=1)).date().isoformat()
            today_result = (
                self.db.table("leads")
                .select("id", count="exact")
                .eq("user_id", user_id)
                .gte("next_follow_up", today_str)
                .lt("next_follow_up", tomorrow)
                .execute()
            )
            today_count = today_result.count or 0

            # Hot leads count
            week_ago = (datetime.now() - timedelta(days=7)).isoformat()
            hot_result = (
                self.db.table("leads")
                .select("id", count="exact")
                .eq("user_id", user_id)
                .eq("status", "hot")
                .or_(".is.last_contact,null", f"last_contact.lt.{week_ago}")
                .execute()
            )
            hot_count = hot_result.count or 0

            return TodayStats(
                overdue=overdue_count,
                today=today_count,
                hot=hot_count,
                total=overdue_count + today_count + hot_count
            )

        except Exception as e:
            logger.error(f"Error getting today stats: {e}")
            return TodayStats(overdue=0, today=0, hot=0, total=0)

    async def mark_lead_contacted(self, user_id: str, lead_id: str, notes: Optional[str] = None) -> bool:
        """
        Mark a lead as contacted today and schedule next follow-up in 3 days
        """
        try:
            now = datetime.now()
            next_follow_up = (now + timedelta(days=3)).date().isoformat()

            # Update lead
            update_data = {
                "last_contact": now.isoformat(),
                "next_follow_up": next_follow_up,
                "updated_at": now.isoformat()
            }

            result = (
                self.db.table("leads")
                .update(update_data)
                .eq("user_id", user_id)
                .eq("id", lead_id)
                .execute()
            )

            # Log interaction if notes provided
            if notes:
                await self.db.table("lead_interactions").insert({
                    "user_id": user_id,
                    "lead_id": lead_id,
                    "type": "call",
                    "outcome": "contacted",
                    "notes": notes,
                    "created_at": now.isoformat()
                }).execute()

            logger.info(f"Marked lead {lead_id} as contacted for user {user_id}")
            return True

        except Exception as e:
            logger.error(f"Error marking lead contacted: {e}")
            return False

    def _calculate_days_overdue(self, next_follow_up: Optional[str]) -> int:
        """Calculate how many days a follow-up is overdue"""
        if not next_follow_up:
            return 0

        try:
            due_date = datetime.fromisoformat(next_follow_up).date()
            today = datetime.now().date()
            return max(0, (today - due_date).days)
        except:
            return 0
