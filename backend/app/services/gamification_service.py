"""
Gamification Service
Badges, Streaks, Leaderboards, Challenges
"""

from typing import Dict, List, Optional
from datetime import datetime, timedelta, date


class GamificationService:
    """Gamification Logic"""
    
    def __init__(self, db):
        self.db = db
    
    async def check_badge_unlock(self, user_id: str) -> List[Dict]:
        """
        Check if user has unlocked any new badges.
        Returns list of newly unlocked badges.
        """
        
        # Get all active badges
        badges = await self.db.fetch("""
            SELECT * FROM badges WHERE is_active = TRUE
        """)
        
        # Get user's existing achievements
        existing = await self.db.fetch("""
            SELECT badge_id FROM user_achievements WHERE user_id = $1
        """, user_id)
        existing_ids = {a['badge_id'] for a in existing}
        
        newly_unlocked = []
        
        for badge in badges:
            if badge['id'] in existing_ids:
                continue
            
            # Check criteria
            criteria = badge['criteria']
            unlocked = await self._check_badge_criteria(user_id, criteria)
            
            if unlocked:
                # Unlock badge
                await self.db.execute("""
                    INSERT INTO user_achievements (user_id, badge_id, earned_at)
                    VALUES ($1, $2, NOW())
                """, user_id, badge['id'])
                
                newly_unlocked.append(dict(badge))
        
        return newly_unlocked
    
    async def _check_badge_criteria(self, user_id: str, criteria: Dict) -> bool:
        """Check if user meets badge criteria."""
        
        badge_type = criteria.get('type')
        threshold = criteria.get('threshold', 0)
        
        if badge_type == 'lead_count':
            count = await self.db.fetchval("""
                SELECT COUNT(*) FROM leads WHERE user_id = $1
            """, user_id)
            return count >= threshold
        
        elif badge_type == 'deal_count':
            count = await self.db.fetchval("""
                SELECT COUNT(*) FROM leads WHERE user_id = $1 AND status = 'won'
            """, user_id)
            return count >= threshold
        
        elif badge_type == 'activity_count':
            count = await self.db.fetchval("""
                SELECT COUNT(*) FROM activities a
                JOIN leads l ON a.lead_id = l.id
                WHERE l.user_id = $1
            """, user_id)
            return count >= threshold
        
        elif badge_type == 'streak':
            streak = await self.db.fetchval("""
                SELECT current_streak FROM daily_streaks WHERE user_id = $1
            """, user_id)
            return (streak or 0) >= threshold
        
        elif badge_type == 'email_sent':
            count = await self.db.fetchval("""
                SELECT COUNT(*) FROM email_messages em
                JOIN email_accounts ea ON em.email_account_id = ea.id
                WHERE ea.user_id = $1 AND em.direction = 'outbound'
            """, user_id)
            return count >= threshold
        
        elif badge_type == 'follow_up':
            count = await self.db.fetchval("""
                SELECT COUNT(*) FROM follow_ups
                WHERE user_id = $1 AND status = 'completed'
            """, user_id)
            return count >= threshold
        
        return False
    
    async def update_daily_streak(self, user_id: str):
        """Update user's daily streak."""
        
        streak = await self.db.fetchrow("""
            SELECT * FROM daily_streaks WHERE user_id = $1
        """, user_id)
        
        today = datetime.now().date()
        
        if not streak:
            # Create new streak
            await self.db.execute("""
                INSERT INTO daily_streaks (
                    user_id, current_streak, longest_streak,
                    last_activity_date, streak_start_date
                )
                VALUES ($1, 1, 1, $2, $2)
            """, user_id, today)
        else:
            last_date = streak['last_activity_date']
            
            if last_date == today:
                # Already counted today
                return
            
            elif last_date == today - timedelta(days=1):
                # Streak continues!
                new_streak = streak['current_streak'] + 1
                await self.db.execute("""
                    UPDATE daily_streaks
                    SET current_streak = $1,
                        longest_streak = GREATEST(longest_streak, $1),
                        last_activity_date = $2
                    WHERE user_id = $3
                """, new_streak, today, user_id)
            
            else:
                # Streak broken
                await self.db.execute("""
                    UPDATE daily_streaks
                    SET current_streak = 1,
                        last_activity_date = $1,
                        streak_start_date = $1
                    WHERE user_id = $2
                """, today, user_id)
        
        # Check for streak badges
        await self.check_badge_unlock(user_id)
    
    async def get_leaderboard(
        self,
        leaderboard_type: str,
        period: str = 'weekly',
        squad_id: Optional[str] = None
    ) -> List[Dict]:
        """Get leaderboard rankings."""
        
        # Determine period
        if period == 'weekly':
            period_start = datetime.now().date() - timedelta(days=7)
        elif period == 'monthly':
            period_start = datetime.now().date() - timedelta(days=30)
        elif period == 'daily':
            period_start = datetime.now().date()
        else:
            period_start = datetime.now().date() - timedelta(days=7)
        
        period_end = datetime.now().date()
        
        # Get or create leaderboard entries
        entries = await self.db.fetch("""
            SELECT * FROM leaderboard_entries
            WHERE leaderboard_type = $1
              AND period_start = $2
              AND period_end = $3
            ORDER BY rank ASC
        """, leaderboard_type, period_start, period_end)
        
        if not entries:
            # Calculate leaderboard
            entries = await self._calculate_leaderboard(
                leaderboard_type,
                period_start,
                period_end,
                squad_id
            )
        
        return [dict(e) for e in entries]
    
    async def _calculate_leaderboard(
        self,
        leaderboard_type: str,
        period_start: date,
        period_end: date,
        squad_id: Optional[str]
    ) -> List:
        """Calculate leaderboard rankings."""
        
        if leaderboard_type == 'most_leads':
            # Count leads created in period
            query = """
                SELECT u.id AS user_id, u.email, u.full_name,
                       COUNT(l.id) AS score
                FROM users u
                LEFT JOIN leads l ON u.id = l.user_id
                    AND l.created_at::date >= $1
                    AND l.created_at::date <= $2
            """
            params = [period_start, period_end]
            
            if squad_id:
                query += " WHERE u.squad_id = $3"
                params.append(squad_id)
            
            query += " GROUP BY u.id, u.email, u.full_name ORDER BY score DESC LIMIT 100"
            
            results = await self.db.fetch(query, *params)
        
        elif leaderboard_type == 'most_deals':
            # Count won deals
            query = """
                SELECT u.id AS user_id, u.email, u.full_name,
                       COUNT(l.id) AS score
                FROM users u
                LEFT JOIN leads l ON u.id = l.user_id
                    AND l.status = 'won'
                    AND l.updated_at::date >= $1
                    AND l.updated_at::date <= $2
            """
            params = [period_start, period_end]
            
            if squad_id:
                query += " WHERE u.squad_id = $3"
                params.append(squad_id)
            
            query += " GROUP BY u.id, u.email, u.full_name ORDER BY score DESC LIMIT 100"
            
            results = await self.db.fetch(query, *params)
        
        elif leaderboard_type == 'most_activities':
            # Count activities
            query = """
                SELECT u.id AS user_id, u.email, u.full_name,
                       COUNT(a.id) AS score
                FROM users u
                LEFT JOIN leads l ON u.id = l.user_id
                LEFT JOIN activities a ON l.id = a.lead_id
                    AND a.created_at::date >= $1
                    AND a.created_at::date <= $2
            """
            params = [period_start, period_end]
            
            if squad_id:
                query += " WHERE u.squad_id = $3"
                params.append(squad_id)
            
            query += " GROUP BY u.id, u.email, u.full_name ORDER BY score DESC LIMIT 100"
            
            results = await self.db.fetch(query, *params)
        
        elif leaderboard_type == 'longest_streak':
            # Get longest streaks
            query = """
                SELECT u.id AS user_id, u.email, u.full_name,
                       COALESCE(ds.current_streak, 0) AS score
                FROM users u
                LEFT JOIN daily_streaks ds ON u.id = ds.user_id
            """
            params = []
            
            if squad_id:
                query += " WHERE u.squad_id = $1"
                params.append(squad_id)
            
            query += " ORDER BY score DESC LIMIT 100"
            
            results = await self.db.fetch(query, *params)
        
        else:
            results = []
        
        # Save to leaderboard_entries
        entries = []
        for rank, result in enumerate(results, 1):
            entry_id = await self.db.fetchval("""
                INSERT INTO leaderboard_entries (
                    leaderboard_type, period_start, period_end,
                    user_id, score, rank, created_at
                )
                VALUES ($1, $2, $3, $4, $5, $6, NOW())
                RETURNING id
            """,
                leaderboard_type, period_start, period_end,
                result['user_id'], result['score'], rank
            )
            
            entry = await self.db.fetchrow("""
                SELECT * FROM leaderboard_entries WHERE id = $1
            """, entry_id)
            entries.append(entry)
        
        return entries
    
    async def get_user_stats(self, user_id: str) -> Dict:
        """Get comprehensive user gamification stats."""
        
        # Get badges
        badges = await self.db.fetch("""
            SELECT b.*, ua.earned_at
            FROM user_achievements ua
            JOIN badges b ON ua.badge_id = b.id
            WHERE ua.user_id = $1
            ORDER BY ua.earned_at DESC
        """, user_id)
        
        # Get streak
        streak = await self.db.fetchrow("""
            SELECT * FROM daily_streaks WHERE user_id = $1
        """, user_id)
        
        # Get activity counts
        lead_count = await self.db.fetchval("""
            SELECT COUNT(*) FROM leads WHERE user_id = $1
        """, user_id)
        
        deal_count = await self.db.fetchval("""
            SELECT COUNT(*) FROM leads WHERE user_id = $1 AND status = 'won'
        """, user_id)
        
        activity_count = await self.db.fetchval("""
            SELECT COUNT(*) FROM activities a
            JOIN leads l ON a.lead_id = l.id
            WHERE l.user_id = $1
        """, user_id)
        
        return {
            'badges': [dict(b) for b in badges],
            'badge_count': len(badges),
            'streak': dict(streak) if streak else None,
            'stats': {
                'lead_count': lead_count,
                'deal_count': deal_count,
                'activity_count': activity_count
            }
        }

