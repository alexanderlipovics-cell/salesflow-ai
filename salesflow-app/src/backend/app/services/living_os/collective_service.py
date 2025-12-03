"""
╔════════════════════════════════════════════════════════════════════════════╗
║  COLLECTIVE INTELLIGENCE SERVICE                                           ║
║  Lernen von anderen Usern (anonymisiert)                                   ║
╚════════════════════════════════════════════════════════════════════════════╝

Das System wird nicht nur durch den eigenen User besser, sondern auch durch:
1. Company-weite Erfolgsstrategien (anonymisiert)
2. Vertical-Benchmarks (was funktioniert in der Branche?)
3. Top-Performer Insights (was machen die Top 10% anders?)
4. Aggregierte Einwandbehandlungen (was hat bei vielen funktioniert?)

Alles ANONYM - keine User-Daten werden geteilt, nur aggregierte Patterns.
"""

from typing import Optional, Dict, Any, List
from datetime import datetime, timedelta, date
import json

from supabase import Client


class CollectiveIntelligenceService:
    """
    Aggregiert anonymisierte Learnings über User hinweg.
    
    Der User profitiert von den Erfahrungen anderer, ohne dass
    personenbezogene Daten geteilt werden.
    """
    
    # Minimum Sample Sizes für verschiedene Confidence Levels
    MIN_SAMPLE_LOW = 3
    MIN_SAMPLE_MEDIUM = 10
    MIN_SAMPLE_HIGH = 20
    
    def __init__(self, db: Client):
        self.db = db
    
    # =========================================================================
    # INSIGHTS ABRUFEN
    # =========================================================================
    
    def get_insights_for_user(
        self,
        user_id: str,
        limit: int = 5,
        insight_type: Optional[str] = None,
    ) -> List[Dict[str, Any]]:
        """
        Holt relevante Collective Insights für einen User.
        
        Berücksichtigt:
        - Company-spezifische Insights (höchste Relevanz)
        - Vertical-spezifische Insights
        - Globale Insights (niedrigste Priorität)
        
        Args:
            user_id: User ID
            limit: Maximale Anzahl Insights
            insight_type: Optional Filter (top_template, best_pattern, etc.)
            
        Returns:
            Liste von Insights, sortiert nach Relevanz
        """
        try:
            # Use RPC function
            result = self.db.rpc(
                "get_collective_insights_for_user",
                {"p_user_id": user_id, "p_limit": limit}
            ).execute()
            
            insights = result.data or []
            
            # Filter by type if specified
            if insight_type:
                insights = [i for i in insights if i.get("insight_type") == insight_type]
            
            return insights
            
        except Exception as e:
            print(f"Error getting collective insights: {e}")
            # Fallback: Direct query
            return self._get_insights_direct(user_id, limit, insight_type)
    
    def _get_insights_direct(
        self,
        user_id: str,
        limit: int,
        insight_type: Optional[str],
    ) -> List[Dict[str, Any]]:
        """Fallback: Direkte Query wenn RPC nicht verfügbar"""
        try:
            # Get user context
            profile = self.db.table("profiles").select(
                "company_id, vertical_id"
            ).eq("id", user_id).single().execute()
            
            if not profile.data:
                return []
            
            company_id = profile.data.get("company_id")
            vertical_id = profile.data.get("vertical_id")
            
            # Query insights
            query = self.db.table("collective_insights").select("*").eq(
                "is_active", True
            ).eq("show_to_users", True).in_(
                "confidence_level", ["medium", "high"]
            )
            
            if insight_type:
                query = query.eq("insight_type", insight_type)
            
            result = query.order("success_rate", desc=True).limit(limit).execute()
            
            # Filter by scope
            insights = []
            for i in (result.data or []):
                if i.get("scope_type") == "company" and i.get("company_id") == company_id:
                    i["relevance"] = "company"
                    insights.append(i)
                elif i.get("scope_type") == "vertical" and i.get("vertical_id") == vertical_id:
                    i["relevance"] = "vertical"
                    insights.append(i)
                elif i.get("scope_type") == "global":
                    i["relevance"] = "global"
                    insights.append(i)
            
            return insights[:limit]
            
        except Exception as e:
            print(f"Error in fallback insights query: {e}")
            return []
    
    def get_user_benchmark(
        self,
        user_id: str,
        benchmark_type: str = "reply_rate",
    ) -> Dict[str, Any]:
        """
        Zeigt dem User wo er im Vergleich zu anderen steht.
        
        Args:
            user_id: User ID
            benchmark_type: reply_rate, conversion_rate, etc.
            
        Returns:
            Dict mit percentile, comparison, tip
        """
        try:
            result = self.db.rpc(
                "get_user_benchmark_position",
                {"p_user_id": user_id, "p_benchmark_type": benchmark_type}
            ).execute()
            
            if result.data:
                return result.data[0]
            
        except Exception as e:
            print(f"Error getting benchmark: {e}")
        
        # Fallback
        return self._calculate_benchmark_fallback(user_id, benchmark_type)
    
    def _calculate_benchmark_fallback(
        self,
        user_id: str,
        benchmark_type: str,
    ) -> Dict[str, Any]:
        """Fallback Benchmark-Berechnung"""
        try:
            # Get user's rate
            user_events = self.db.table("learning_events").select("*").eq(
                "user_id", user_id
            ).gte(
                "created_at", (datetime.utcnow() - timedelta(days=30)).isoformat()
            ).execute()
            
            if not user_events.data:
                return {
                    "user_value": 0,
                    "percentile": 50,
                    "top_10_value": 0.5,
                    "median_value": 0.3,
                    "improvement_potential": 0.5,
                    "tip": "Starte mit dem Tracken deiner Nachrichten um Insights zu bekommen!",
                }
            
            events = user_events.data
            if benchmark_type == "reply_rate":
                user_value = sum(1 for e in events if e.get("response_received")) / len(events) if events else 0
            else:
                user_value = sum(1 for e in events if e.get("converted_to_next_stage")) / len(events) if events else 0
            
            # Simplified percentile calculation
            if user_value >= 0.5:
                percentile = 90
                tip = "Du gehörst zu den Top 10%! 🏆"
            elif user_value >= 0.35:
                percentile = 75
                tip = "Überdurchschnittlich! Mit ein paar Optimierungen könntest du zu den Top 10% gehören."
            elif user_value >= 0.25:
                percentile = 50
                tip = "Du bist im Durchschnitt. Schau dir die Team Best Practices an!"
            else:
                percentile = 25
                tip = "Es gibt Verbesserungspotenzial. Die Collective Insights können dir helfen!"
            
            return {
                "user_value": round(user_value, 3),
                "percentile": percentile,
                "top_10_value": 0.5,
                "median_value": 0.3,
                "improvement_potential": round(0.5 - user_value, 3) if user_value < 0.5 else 0,
                "tip": tip,
            }
            
        except Exception as e:
            print(f"Error in fallback benchmark: {e}")
            return {
                "user_value": 0,
                "percentile": 50,
                "tip": "Benchmark-Daten werden geladen...",
            }
    
    # =========================================================================
    # INSIGHTS ÜBERNEHMEN
    # =========================================================================
    
    def adopt_insight(
        self,
        user_id: str,
        insight_id: str,
    ) -> Dict[str, Any]:
        """
        User übernimmt einen Insight.
        
        Trackt die Adoption um später messen zu können,
        ob es dem User geholfen hat.
        """
        # Get current success rate for comparison
        current_rate = self._get_user_current_rate(user_id)
        
        adoption_data = {
            "user_id": user_id,
            "insight_id": insight_id,
            "success_rate_before": current_rate,
        }
        
        result = self.db.table("collective_adoptions").upsert(
            adoption_data,
            on_conflict="user_id,insight_id"
        ).execute()
        
        if result.data:
            return {"success": True, "adoption": result.data[0]}
        
        raise Exception("Failed to adopt insight")
    
    def dismiss_insight(
        self,
        user_id: str,
        insight_id: str,
        reason: Optional[str] = None,
    ):
        """User lehnt Insight ab (nicht nochmal zeigen)"""
        self.db.table("collective_adoptions").upsert({
            "user_id": user_id,
            "insight_id": insight_id,
            "is_active": False,
            "dismissed_at": datetime.utcnow().isoformat(),
            "dismiss_reason": reason,
        }, on_conflict="user_id,insight_id").execute()
    
    def _get_user_current_rate(self, user_id: str) -> float:
        """Berechnet aktuelle Reply-Rate des Users"""
        try:
            result = self.db.table("learning_events").select("response_received").eq(
                "user_id", user_id
            ).gte(
                "created_at", (datetime.utcnow() - timedelta(days=30)).isoformat()
            ).execute()
            
            if result.data:
                replies = sum(1 for e in result.data if e.get("response_received"))
                return replies / len(result.data)
        except Exception:
            pass
        
        return 0
    
    def get_user_adoptions(
        self,
        user_id: str,
        active_only: bool = True,
    ) -> List[Dict[str, Any]]:
        """Holt alle Insights die der User übernommen hat"""
        query = self.db.table("collective_adoptions").select(
            "*, collective_insights(*)"
        ).eq("user_id", user_id)
        
        if active_only:
            query = query.eq("is_active", True)
        
        result = query.order("adopted_at", desc=True).execute()
        
        return result.data or []
    
    # =========================================================================
    # AGGREGATION (Admin/Background Job)
    # =========================================================================
    
    def compute_insights(
        self,
        company_id: Optional[str] = None,
        vertical_id: Optional[str] = None,
        days: int = 30,
    ):
        """
        Berechnet/aktualisiert Collective Insights.
        
        Sollte als Background Job laufen (z.B. täglich).
        """
        try:
            self.db.rpc(
                "compute_collective_insights",
                {
                    "p_company_id": company_id,
                    "p_vertical_id": vertical_id,
                    "p_days": days,
                }
            ).execute()
            
            return {"success": True}
        except Exception as e:
            print(f"Error computing insights: {e}")
            return {"error": str(e)}
    
    def compute_benchmarks(
        self,
        company_id: str,
        period_type: str = "monthly",
    ):
        """
        Berechnet Performer-Benchmarks für eine Company.
        
        Ermittelt:
        - Top 10% Performance
        - Median
        - Unteres Quartil
        """
        try:
            today = date.today()
            if period_type == "monthly":
                period_start = today.replace(day=1)
                if today.month == 12:
                    period_end = today.replace(year=today.year + 1, month=1, day=1) - timedelta(days=1)
                else:
                    period_end = today.replace(month=today.month + 1, day=1) - timedelta(days=1)
            else:  # weekly
                period_start = today - timedelta(days=today.weekday())
                period_end = period_start + timedelta(days=6)
            
            # Get all users' performance
            result = self.db.table("learning_events").select(
                "user_id, response_received, converted_to_next_stage"
            ).eq("company_id", company_id).gte(
                "created_at", period_start.isoformat()
            ).lte(
                "created_at", period_end.isoformat()
            ).execute()
            
            if not result.data:
                return {"message": "Not enough data"}
            
            # Group by user
            user_stats = {}
            for event in result.data:
                uid = event.get("user_id")
                if uid not in user_stats:
                    user_stats[uid] = {"total": 0, "replies": 0, "conversions": 0}
                user_stats[uid]["total"] += 1
                if event.get("response_received"):
                    user_stats[uid]["replies"] += 1
                if event.get("converted_to_next_stage"):
                    user_stats[uid]["conversions"] += 1
            
            # Calculate rates
            reply_rates = []
            for stats in user_stats.values():
                if stats["total"] >= 10:  # Minimum sample size
                    reply_rates.append(stats["replies"] / stats["total"])
            
            if not reply_rates:
                return {"message": "Not enough qualified users"}
            
            reply_rates.sort(reverse=True)
            n = len(reply_rates)
            
            benchmark_data = {
                "company_id": company_id,
                "period_type": period_type,
                "period_start": period_start.isoformat(),
                "period_end": period_end.isoformat(),
                "benchmark_type": "reply_rate",
                "top_10_percent": reply_rates[max(0, n // 10 - 1)] if n >= 10 else reply_rates[0],
                "top_25_percent": reply_rates[max(0, n // 4 - 1)] if n >= 4 else reply_rates[0],
                "median": reply_rates[n // 2] if n > 0 else 0,
                "bottom_25_percent": reply_rates[min(n - 1, 3 * n // 4)] if n >= 4 else reply_rates[-1],
                "sample_size": n,
            }
            
            self.db.table("performer_benchmarks").upsert(
                benchmark_data,
                on_conflict="company_id,period_type,period_start,benchmark_type"
            ).execute()
            
            return {"success": True, "users_analyzed": n}
            
        except Exception as e:
            print(f"Error computing benchmarks: {e}")
            return {"error": str(e)}
    
    # =========================================================================
    # FORMATTING FOR CHIEF
    # =========================================================================
    
    def format_insights_for_prompt(
        self,
        insights: List[Dict[str, Any]],
    ) -> str:
        """Formatiert Insights für CHIEF System Prompt"""
        if not insights:
            return ""
        
        lines = ["═══════════════════════════════════════════════════════════════════════════════"]
        lines.append("COLLECTIVE INTELLIGENCE - Was bei anderen funktioniert")
        lines.append("═══════════════════════════════════════════════════════════════════════════════\n")
        
        for insight in insights[:3]:
            insight_type = insight.get("insight_type", "")
            title = insight.get("title", "")
            sample = insight.get("sample_size", 0)
            rate = insight.get("success_rate", 0) or insight.get("avg_reply_rate", 0) or 0
            confidence = insight.get("confidence_level", "low")
            
            confidence_emoji = "🟢" if confidence == "high" else "🟡" if confidence == "medium" else "⚪"
            
            lines.append(f"{confidence_emoji} **{title}**")
            lines.append(f"   {insight.get('description', '')}")
            lines.append(f"   📊 {sample} User | {rate * 100:.0f}% Erfolgsrate")
            
            content = insight.get("content", {})
            if insight_type == "top_template" and content.get("preview"):
                lines.append(f"   💬 \"{content['preview']}\"")
            elif insight_type == "winning_objection_handler" and content.get("example_response"):
                lines.append(f"   💬 Beispiel: \"{content['example_response']}\"")
            
            lines.append("")
        
        return "\n".join(lines)
    
    def format_benchmark_for_prompt(
        self,
        benchmark: Dict[str, Any],
    ) -> str:
        """Formatiert Benchmark für CHIEF System Prompt"""
        if not benchmark:
            return ""
        
        percentile = benchmark.get("percentile", 50)
        tip = benchmark.get("tip", "")
        
        if percentile >= 90:
            emoji = "🏆"
            status = "Top 10%"
        elif percentile >= 75:
            emoji = "📈"
            status = "Top 25%"
        elif percentile >= 50:
            emoji = "➡️"
            status = "Durchschnitt"
        else:
            emoji = "📊"
            status = "Verbesserungspotenzial"
        
        return f"""
═══════════════════════════════════════════════════════════════════════════════
DEIN BENCHMARK {emoji}
═══════════════════════════════════════════════════════════════════════════════

Position: {status} (Perzentil {percentile})
{tip}

Top-Performer erreichen: {benchmark.get('top_10_value', 0) * 100:.0f}% Reply-Rate
Deine aktuelle Rate: {benchmark.get('user_value', 0) * 100:.0f}%
"""

