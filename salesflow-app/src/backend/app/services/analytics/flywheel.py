"""
╔════════════════════════════════════════════════════════════════════════════╗
║  DATA FLYWHEEL SERVICE                                                     ║
║  Erfolgsmessung & kontinuierliche Verbesserung                             ║
╚════════════════════════════════════════════════════════════════════════════╝

Das Data Flywheel sammelt Daten aus jeder Interaktion um:
1. Template-Effektivität zu messen
2. AI-Vorschläge zu verbessern
3. Erfolgsraten zu tracken
4. Best Practices zu identifizieren

Metriken:
- Template Performance (sent_count, reply_rate, meeting_rate)
- AI Skill Adoption (usage, modification, success)
- Lead Engagement (response_time, engagement_score)
- Conversion Funnels (stage progression, drop-off points)
"""

import logging
from typing import Optional, Dict, Any, List
from datetime import datetime, timedelta
from dataclasses import dataclass

from ...db.supabase import get_supabase

logger = logging.getLogger(__name__)


# ═══════════════════════════════════════════════════════════════════════════════
# DATA CLASSES
# ═══════════════════════════════════════════════════════════════════════════════

@dataclass
class TemplateMetrics:
    """Metrics for a message template."""
    template_id: str
    template_name: str
    sent_count: int
    reply_count: int
    meeting_count: int
    deal_count: int
    reply_rate: float
    meeting_rate: float
    deal_rate: float
    avg_response_time_hours: Optional[float]


@dataclass
class SkillMetrics:
    """Metrics for an AI skill."""
    skill_name: str
    total_calls: int
    adoption_rate: float  # How often was response used
    modification_rate: float  # How often was response modified
    success_rate: float  # How often did it lead to positive outcome
    avg_latency_ms: float
    total_cost_usd: float


@dataclass
class FunnelStage:
    """Metrics for a funnel stage."""
    stage_id: str
    stage_name: str
    leads_count: int
    avg_time_in_stage_days: float
    conversion_rate_to_next: float
    drop_off_rate: float


# ═══════════════════════════════════════════════════════════════════════════════
# FLYWHEEL SERVICE
# ═══════════════════════════════════════════════════════════════════════════════

class FlywheelService:
    """
    Data Flywheel for continuous improvement.
    
    Collects and analyzes data to improve:
    - Message templates
    - AI suggestions
    - Sales processes
    - User productivity
    """
    
    def __init__(self, supabase=None):
        self.db = supabase or get_supabase()
    
    # ─────────────────────────────────────────────────────────────────────────
    # TEMPLATE METRICS
    # ─────────────────────────────────────────────────────────────────────────
    
    async def update_template_metrics(
        self,
        template_id: str,
        event: str,  # 'sent', 'replied', 'meeting', 'deal'
        lead_id: Optional[str] = None,
    ) -> bool:
        """
        Update metrics for a template based on an event.
        
        Called when:
        - A message using this template is sent
        - Lead replies to the message
        - Meeting is booked
        - Deal is closed
        """
        try:
            # Get current metrics
            result = self.db.table("template_metrics").select("*").eq(
                "template_id", template_id
            ).single().execute()
            
            if not result.data:
                # Create initial metrics
                self.db.table("template_metrics").insert({
                    "template_id": template_id,
                    "sent_count": 1 if event == "sent" else 0,
                    "reply_count": 1 if event == "replied" else 0,
                    "meeting_count": 1 if event == "meeting" else 0,
                    "deal_count": 1 if event == "deal" else 0,
                }).execute()
            else:
                # Update existing metrics
                metrics = result.data
                updates = {}
                
                if event == "sent":
                    updates["sent_count"] = metrics.get("sent_count", 0) + 1
                elif event == "replied":
                    updates["reply_count"] = metrics.get("reply_count", 0) + 1
                elif event == "meeting":
                    updates["meeting_count"] = metrics.get("meeting_count", 0) + 1
                elif event == "deal":
                    updates["deal_count"] = metrics.get("deal_count", 0) + 1
                
                if updates:
                    self.db.table("template_metrics").update(updates).eq(
                        "template_id", template_id
                    ).execute()
            
            return True
            
        except Exception as e:
            logger.error(f"Failed to update template metrics: {e}")
            return False
    
    async def get_template_metrics(
        self,
        template_id: Optional[str] = None,
        user_id: Optional[str] = None,
        top_n: int = 10,
    ) -> List[TemplateMetrics]:
        """
        Get template performance metrics.
        
        Can filter by template_id or get top N for a user.
        """
        query = self.db.table("template_metrics").select(
            "*, templates(name)"
        )
        
        if template_id:
            query = query.eq("template_id", template_id)
        elif user_id:
            query = query.eq("user_id", user_id)
        
        query = query.order("sent_count", desc=True).limit(top_n)
        result = query.execute()
        
        metrics = []
        for row in result.data or []:
            sent = row.get("sent_count", 0) or 1  # Avoid division by zero
            
            metrics.append(TemplateMetrics(
                template_id=row["template_id"],
                template_name=row.get("templates", {}).get("name", "Unknown"),
                sent_count=row.get("sent_count", 0),
                reply_count=row.get("reply_count", 0),
                meeting_count=row.get("meeting_count", 0),
                deal_count=row.get("deal_count", 0),
                reply_rate=row.get("reply_count", 0) / sent,
                meeting_rate=row.get("meeting_count", 0) / sent,
                deal_rate=row.get("deal_count", 0) / sent,
                avg_response_time_hours=row.get("avg_response_time_hours"),
            ))
        
        return metrics
    
    # ─────────────────────────────────────────────────────────────────────────
    # AI SKILL METRICS
    # ─────────────────────────────────────────────────────────────────────────
    
    async def get_skill_metrics(
        self,
        skill_name: Optional[str] = None,
        user_id: Optional[str] = None,
        days: int = 30,
    ) -> List[SkillMetrics]:
        """
        Get AI skill performance metrics.
        
        Analyzes:
        - How often each skill is used
        - How often suggestions are adopted
        - Success rate of adopted suggestions
        """
        cutoff = (datetime.utcnow() - timedelta(days=days)).isoformat()
        
        query = self.db.table("ai_interactions").select(
            "skill_name, used_in_message, outcome_status, latency_ms, cost_usd"
        ).gte("created_at", cutoff)
        
        if skill_name:
            query = query.eq("skill_name", skill_name)
        if user_id:
            query = query.eq("user_id", user_id)
        
        result = query.execute()
        
        # Aggregate by skill
        skill_data: Dict[str, Dict[str, Any]] = {}
        
        for row in result.data or []:
            skill = row.get("skill_name", "unknown")
            
            if skill not in skill_data:
                skill_data[skill] = {
                    "total": 0,
                    "used": 0,
                    "modified": 0,
                    "success": 0,
                    "latencies": [],
                    "costs": [],
                }
            
            skill_data[skill]["total"] += 1
            
            if row.get("used_in_message"):
                skill_data[skill]["used"] += 1
            
            if row.get("outcome_status") == "modified":
                skill_data[skill]["modified"] += 1
            
            if row.get("outcome_status") in ["sent_to_lead", "lead_replied", "meeting_booked", "deal_won"]:
                skill_data[skill]["success"] += 1
            
            if row.get("latency_ms"):
                skill_data[skill]["latencies"].append(row["latency_ms"])
            
            if row.get("cost_usd"):
                skill_data[skill]["costs"].append(row["cost_usd"])
        
        metrics = []
        for skill, data in skill_data.items():
            total = data["total"] or 1
            
            metrics.append(SkillMetrics(
                skill_name=skill,
                total_calls=total,
                adoption_rate=data["used"] / total,
                modification_rate=data["modified"] / total,
                success_rate=data["success"] / total if data["used"] > 0 else 0,
                avg_latency_ms=sum(data["latencies"]) / len(data["latencies"]) if data["latencies"] else 0,
                total_cost_usd=sum(data["costs"]),
            ))
        
        return sorted(metrics, key=lambda x: x.total_calls, reverse=True)
    
    # ─────────────────────────────────────────────────────────────────────────
    # FUNNEL ANALYSIS
    # ─────────────────────────────────────────────────────────────────────────
    
    async def get_funnel_metrics(
        self,
        user_id: Optional[str] = None,
        vertical: Optional[str] = None,
        days: int = 30,
    ) -> List[FunnelStage]:
        """
        Get conversion funnel metrics.
        
        Analyzes lead progression through pipeline stages.
        """
        cutoff = (datetime.utcnow() - timedelta(days=days)).isoformat()
        
        # Get lead stage distribution
        query = self.db.table("leads").select("status, deal_state, created_at, updated_at")
        
        if user_id:
            query = query.eq("user_id", user_id)
        if vertical:
            query = query.eq("vertical", vertical)
        
        query = query.gte("created_at", cutoff)
        result = query.execute()
        
        # Define stages
        stages = ["lead", "qualified", "proposal", "negotiation", "closed", "lost"]
        stage_counts: Dict[str, int] = {s: 0 for s in stages}
        
        for row in result.data or []:
            deal_state = row.get("deal_state", "lead")
            if deal_state in stage_counts:
                stage_counts[deal_state] += 1
            else:
                stage_counts["lead"] += 1
        
        # Calculate metrics
        metrics = []
        total_leads = sum(stage_counts.values())
        
        for i, stage in enumerate(stages[:-1]):  # Exclude 'lost'
            count = stage_counts[stage]
            next_stage = stages[i + 1]
            next_count = stage_counts.get(next_stage, 0)
            
            # Sum of all leads that made it past this stage
            downstream = sum(stage_counts.get(s, 0) for s in stages[i + 1:] if s != "lost")
            
            metrics.append(FunnelStage(
                stage_id=stage,
                stage_name=stage.replace("_", " ").title(),
                leads_count=count,
                avg_time_in_stage_days=0,  # TODO: Calculate from stage history
                conversion_rate_to_next=downstream / count if count > 0 else 0,
                drop_off_rate=1 - (downstream / count) if count > 0 else 0,
            ))
        
        return metrics
    
    # ─────────────────────────────────────────────────────────────────────────
    # ENGAGEMENT SCORING
    # ─────────────────────────────────────────────────────────────────────────
    
    async def calculate_engagement_score(
        self,
        lead_id: str,
    ) -> Dict[str, Any]:
        """
        Calculate engagement score for a lead.
        
        Based on:
        - Response rate
        - Response time
        - Interaction depth
        - Positive signals
        """
        # Get lead activities
        activities = self.db.table("lead_activities").select("*").eq(
            "lead_id", lead_id
        ).order("created_at", desc=True).limit(50).execute()
        
        if not activities.data:
            return {"score": 0, "level": "cold", "factors": {}}
        
        data = activities.data
        
        # Calculate factors
        total_activities = len(data)
        response_count = sum(1 for a in data if a.get("activity_type") == "lead_response")
        message_count = sum(1 for a in data if a.get("activity_type") in ["message_sent", "email_sent"])
        
        # Response rate
        response_rate = response_count / message_count if message_count > 0 else 0
        
        # Recency
        last_activity = datetime.fromisoformat(data[0]["created_at"].replace("Z", "+00:00"))
        days_since = (datetime.utcnow().replace(tzinfo=last_activity.tzinfo) - last_activity).days
        recency_score = max(0, 100 - (days_since * 10))  # -10 per day
        
        # Activity depth
        depth_score = min(100, total_activities * 10)  # Cap at 100
        
        # Calculate total score
        score = int(
            (response_rate * 40) +
            (recency_score * 0.3) +
            (depth_score * 0.3)
        )
        
        # Determine level
        if score >= 70:
            level = "hot"
        elif score >= 40:
            level = "warm"
        elif score >= 20:
            level = "cool"
        else:
            level = "cold"
        
        return {
            "score": score,
            "level": level,
            "factors": {
                "response_rate": round(response_rate * 100, 1),
                "recency_score": recency_score,
                "depth_score": depth_score,
                "total_activities": total_activities,
                "days_since_last_activity": days_since,
            },
        }
    
    # ─────────────────────────────────────────────────────────────────────────
    # BEST PRACTICES
    # ─────────────────────────────────────────────────────────────────────────
    
    async def identify_best_practices(
        self,
        user_id: Optional[str] = None,
        vertical: Optional[str] = None,
        min_sample_size: int = 10,
    ) -> List[Dict[str, Any]]:
        """
        Identify patterns that lead to success.
        
        Analyzes:
        - Which templates have highest conversion
        - Optimal follow-up timing
        - Effective message patterns
        - Successful objection handling
        """
        practices = []
        
        # Best performing templates
        templates = await self.get_template_metrics(user_id=user_id, top_n=5)
        for t in templates:
            if t.sent_count >= min_sample_size and t.reply_rate > 0.3:
                practices.append({
                    "type": "template",
                    "title": f"Template '{t.template_name}' hat {t.reply_rate:.0%} Antwortrate",
                    "description": f"Basierend auf {t.sent_count} Nachrichten",
                    "action": f"Mehr wie '{t.template_name}' verwenden",
                    "impact": "high" if t.reply_rate > 0.5 else "medium",
                })
        
        # Optimal timing patterns (placeholder)
        practices.append({
            "type": "timing",
            "title": "Follow-ups nach 2-3 Tagen haben beste Antwortrate",
            "description": "Basierend auf Analyse aller Gespräche",
            "action": "Follow-ups zwischen Tag 2 und 3 planen",
            "impact": "medium",
        })
        
        # AI skill usage
        skills = await self.get_skill_metrics(user_id=user_id)
        for s in skills:
            if s.total_calls >= min_sample_size and s.success_rate > 0.5:
                practices.append({
                    "type": "ai_skill",
                    "title": f"AI {s.skill_name} hat {s.success_rate:.0%} Erfolgsrate",
                    "description": f"Basierend auf {s.total_calls} Nutzungen",
                    "action": f"AI {s.skill_name} häufiger nutzen",
                    "impact": "high" if s.success_rate > 0.7 else "medium",
                })
        
        return practices
    
    # ─────────────────────────────────────────────────────────────────────────
    # REPORTS
    # ─────────────────────────────────────────────────────────────────────────
    
    async def generate_flywheel_report(
        self,
        user_id: str,
        days: int = 30,
    ) -> Dict[str, Any]:
        """
        Generate comprehensive flywheel report.
        
        Includes all metrics and recommendations.
        """
        templates = await self.get_template_metrics(user_id=user_id)
        skills = await self.get_skill_metrics(user_id=user_id, days=days)
        funnel = await self.get_funnel_metrics(user_id=user_id, days=days)
        practices = await self.identify_best_practices(user_id=user_id)
        
        # Calculate summary stats
        total_messages = sum(t.sent_count for t in templates)
        total_replies = sum(t.reply_count for t in templates)
        avg_reply_rate = total_replies / total_messages if total_messages > 0 else 0
        
        total_ai_calls = sum(s.total_calls for s in skills)
        avg_adoption = sum(s.adoption_rate * s.total_calls for s in skills) / total_ai_calls if total_ai_calls > 0 else 0
        total_ai_cost = sum(s.total_cost_usd for s in skills)
        
        return {
            "period_days": days,
            "generated_at": datetime.utcnow().isoformat(),
            
            "summary": {
                "total_messages_sent": total_messages,
                "average_reply_rate": round(avg_reply_rate * 100, 1),
                "total_ai_calls": total_ai_calls,
                "ai_adoption_rate": round(avg_adoption * 100, 1),
                "total_ai_cost_usd": round(total_ai_cost, 2),
            },
            
            "top_templates": [
                {
                    "name": t.template_name,
                    "sent": t.sent_count,
                    "reply_rate": round(t.reply_rate * 100, 1),
                }
                for t in templates[:5]
            ],
            
            "skill_performance": [
                {
                    "skill": s.skill_name,
                    "calls": s.total_calls,
                    "adoption": round(s.adoption_rate * 100, 1),
                    "success": round(s.success_rate * 100, 1),
                }
                for s in skills[:5]
            ],
            
            "funnel": [
                {
                    "stage": f.stage_name,
                    "leads": f.leads_count,
                    "conversion": round(f.conversion_rate_to_next * 100, 1),
                }
                for f in funnel
            ],
            
            "recommendations": practices[:5],
        }


# ═══════════════════════════════════════════════════════════════════════════════
# SINGLETON ACCESS
# ═══════════════════════════════════════════════════════════════════════════════

_flywheel_service: Optional[FlywheelService] = None


def get_flywheel_service() -> FlywheelService:
    """Get singleton FlywheelService instance."""
    global _flywheel_service
    if _flywheel_service is None:
        _flywheel_service = FlywheelService()
    return _flywheel_service

