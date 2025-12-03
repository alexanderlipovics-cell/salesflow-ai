"""
╔════════════════════════════════════════════════════════════════════════════╗
║  PULSE TRACKER SERVICE v2.1                                                ║
║  Mit Redis-Caching, Bulk-Operationen, Analytics                            ║
║                                                                            ║
║  NEU v2.1:                                                                ║
║  - Dynamic Check-in Timing (basierend auf Lead-Engagement)                ║
║  - Dynamic Ghost Thresholds (personalisiert pro Lead)                     ║
║  - Soft vs. Hard Ghost Classification                                     ║
║  - Smart Status Inference aus Chat-Import                                 ║
║  - Intent-basiertes Funnel Analytics                                      ║
║  - A/B Testing by Behavioral Profile                                      ║
╚════════════════════════════════════════════════════════════════════════════╝
"""

from typing import Optional, Dict, Any, List
import json
import os
import re
import logging
from datetime import datetime, timedelta, date

from supabase import Client
import anthropic

from ...api.schemas.pulse_tracker import (
    CreateOutreachRequest,
    UpdateStatusRequest,
    MessageStatus,
    MessageIntent,
    GhostType,
    FollowUpStrategy,
    ContactMood,
    DecisionTendency,
    BehaviorAnalysisResult,
    GhostBusterSuggestion,
    CheckInItem,
    CheckInSummary,
    AccurateFunnelResponse,
    IntentFunnelItem,
    IntentFunnelResponse,
    IntentCoachingInsight,
    DynamicTimingInfo,
    SmartInferenceResult,
    GhostClassificationResponse,
    GhostStatsByType,
    BestTemplateRecommendation,
)
from ...config.prompts.behavioral_analysis import (
    build_behavioral_analysis_prompt,
    build_ghost_buster_prompt,
)

logger = logging.getLogger(__name__)


class PulseTrackerService:
    """
    Pulse Tracker v2.1: Message Status + Ghost-Buster + Behavioral Intelligence
    Mit optionalem Redis-Caching für Live-Performance
    
    NEU v2.1:
    - Dynamic Check-in Timing (6h-72h basierend auf Engagement)
    - Dynamic Ghost Thresholds (avg_response * 3)
    - Soft vs. Hard Ghost Classification
    - Smart Status Inference
    - Intent-basiertes Analytics
    """
    
    # Default Timing Constants (überschrieben durch Dynamic Timing v2.1)
    CHECK_IN_HOURS = 24
    GHOST_THRESHOLD_HOURS = 48
    GHOST_MAX_DAYS = 14
    STALE_THRESHOLD_DAYS = 7
    
    # NEU v2.1: Dynamic Timing Constants
    MIN_CHECK_IN_HOURS = 6
    MAX_CHECK_IN_HOURS = 72
    GHOST_MULTIPLIER = 3  # Ghost = avg_response * 3
    MIN_GHOST_THRESHOLD = 8
    MAX_GHOST_THRESHOLD = 168  # 7 Tage
    
    # NEU v2.1: Ghost Classification Thresholds
    SOFT_GHOST_MAX_HOURS = 72
    HARD_GHOST_MIN_HOURS = 72
    
    # Cache TTL
    SESSION_CACHE_TTL = 900      # 15 Minuten
    COMPANY_CACHE_TTL = 3600     # 1 Stunde
    
    def __init__(self, supabase: Client, anthropic_key: Optional[str] = None):
        self.db = supabase
        self.anthropic_key = anthropic_key or os.getenv("ANTHROPIC_API_KEY")
        
        if self.anthropic_key:
            self.anthropic = anthropic.Anthropic(api_key=self.anthropic_key)
        else:
            self.anthropic = None
            logger.warning("ANTHROPIC_API_KEY nicht gesetzt - Behavioral Analysis deaktiviert")
        
        # Redis Connection (optional - fallback to no-cache)
        self.redis = None
        self.cache_enabled = False
        try:
            import redis
            redis_host = os.getenv("REDIS_HOST")
            if redis_host:
                self.redis = redis.Redis(
                    host=redis_host,
                    port=int(os.getenv("REDIS_PORT", 6379)),
                    decode_responses=True
                )
                self.redis.ping()
                self.cache_enabled = True
                logger.info("Redis-Cache aktiviert")
        except Exception as e:
            logger.info(f"Redis nicht verfügbar, Cache deaktiviert: {e}")
    
    # =========================================================================
    # CACHING HELPERS
    # =========================================================================
    
    def _cache_get(self, key: str) -> Optional[Dict]:
        """Holt Wert aus Cache"""
        if not self.cache_enabled:
            return None
        try:
            data = self.redis.get(key)
            return json.loads(data) if data else None
        except Exception:
            return None
    
    def _cache_set(self, key: str, value: Dict, ttl: int = 900):
        """Setzt Wert in Cache"""
        if not self.cache_enabled:
            return
        try:
            self.redis.setex(key, ttl, json.dumps(value, default=str))
        except Exception:
            pass
    
    def _cache_delete(self, pattern: str):
        """Löscht Cache-Keys nach Pattern"""
        if not self.cache_enabled:
            return
        try:
            for key in self.redis.scan_iter(pattern):
                self.redis.delete(key)
        except Exception:
            pass
    
    # =========================================================================
    # OUTREACH TRACKING
    # =========================================================================
    
    async def create_outreach(
        self,
        user_id: str,
        request: CreateOutreachRequest,
    ) -> Dict:
        """Erstellt eine neue Outreach-Nachricht mit dynamischem Check-in Timing (v2.1)"""
        
        # NEU v2.1: Dynamic Check-in Zeit basierend auf Lead-Verhalten
        check_in_hours = self.CHECK_IN_HOURS  # Default
        if request.lead_id:
            dynamic_timing = await self._get_dynamic_timing(request.lead_id)
            if dynamic_timing:
                check_in_hours = dynamic_timing.predicted_check_in_hours
        
        check_in_due = datetime.now() + timedelta(hours=check_in_hours)
        
        data = {
            "user_id": user_id,
            "lead_id": request.lead_id,
            "message_text": request.message_text,
            "message_type": request.message_type,
            "channel": request.channel,
            "status": request.initial_status.value,
            "template_id": request.template_id,
            "template_variant": request.template_variant,
            "check_in_due_at": check_in_due.isoformat(),
            "check_in_hours_used": check_in_hours,  # NEU v2.1
            "sent_at": datetime.now().isoformat(),
            "intent": request.intent.value,  # NEU v2.1
        }
        
        result = self.db.table("pulse_outreach_messages").insert(data).execute()
        
        if not result.data:
            raise Exception("Failed to create outreach")
        
        return {
            "id": result.data[0]["id"],
            "sent_at": result.data[0]["sent_at"],
            "check_in_due_at": check_in_due.isoformat(),
            "check_in_hours": check_in_hours,  # NEU v2.1
            "intent": request.intent.value,  # NEU v2.1
            "message": f"Outreach erstellt. Check-in in {check_in_hours}h (dynamisch berechnet).",
        }
    
    async def update_status(
        self,
        user_id: str,
        outreach_id: str,
        request: UpdateStatusRequest,
    ) -> Dict:
        """Aktualisiert den Status einer Nachricht"""
        
        # Determine if ghosted
        status = request.status
        
        if status == MessageStatus.seen:
            # Check if it's been long enough to be ghosted
            outreach = self.db.table("pulse_outreach_messages")\
                .select("sent_at")\
                .eq("id", outreach_id)\
                .single()\
                .execute()
            
            if outreach.data:
                sent_at = datetime.fromisoformat(outreach.data["sent_at"].replace("Z", "+00:00"))
                hours_since = (datetime.now(sent_at.tzinfo) - sent_at).total_seconds() / 3600
                if hours_since >= self.GHOST_THRESHOLD_HOURS:
                    status = MessageStatus.ghosted
        
        # Update data
        update_data = {
            "status": status.value,
            "status_updated_at": datetime.now().isoformat(),
            "check_in_completed": True,
            "status_source": request.status_source,
        }
        
        if request.seen_at:
            update_data["seen_at"] = request.seen_at.isoformat()
        
        if request.replied_at:
            update_data["replied_at"] = request.replied_at.isoformat()
        
        self.db.table("pulse_outreach_messages")\
            .update(update_data)\
            .eq("id", outreach_id)\
            .eq("user_id", user_id)\
            .execute()
        
        # If ghosted, suggest strategy
        suggestion = None
        if status == MessageStatus.ghosted:
            suggestion = await self._suggest_ghost_buster_strategy(outreach_id, user_id)
            if suggestion:
                self.db.table("pulse_outreach_messages")\
                    .update({
                        "suggested_strategy": suggestion.strategy.value,
                        "suggested_follow_up_text": suggestion.template_text,
                    })\
                    .eq("id", outreach_id)\
                    .execute()
        
        return {
            "success": True,
            "new_status": status.value,
            "ghost_buster_suggestion": suggestion.model_dump() if suggestion else None,
        }
    
    # =========================================================================
    # BULK CHECK-IN OPERATIONS
    # =========================================================================
    
    async def bulk_update_status(
        self,
        user_id: str,
        outreach_ids: List[str],
        status: MessageStatus,
    ) -> Dict:
        """Bulk-Update für viele Check-ins auf einmal"""
        
        affected = 0
        for oid in outreach_ids:
            try:
                self.db.table("pulse_outreach_messages")\
                    .update({
                        "status": status.value,
                        "status_updated_at": datetime.now().isoformat(),
                        "check_in_completed": True,
                        "status_source": "bulk_update",
                    })\
                    .eq("id", oid)\
                    .eq("user_id", user_id)\
                    .execute()
                affected += 1
            except Exception as e:
                logger.error(f"Bulk update failed for {oid}: {e}")
        
        return {
            "success": True,
            "affected_count": affected,
            "status": status.value,
        }
    
    async def bulk_skip_checkins(
        self,
        user_id: str,
        outreach_ids: List[str],
    ) -> Dict:
        """Überspringt mehrere Check-ins (werden später stale)"""
        
        affected = 0
        for oid in outreach_ids:
            try:
                self.db.table("pulse_outreach_messages")\
                    .update({
                        "check_in_skipped": True,
                        "status": "skipped",
                        "status_updated_at": datetime.now().isoformat(),
                    })\
                    .eq("id", oid)\
                    .eq("user_id", user_id)\
                    .eq("check_in_completed", False)\
                    .execute()
                affected += 1
            except Exception as e:
                logger.error(f"Bulk skip failed for {oid}: {e}")
        
        return {
            "success": True,
            "skipped_count": affected,
            "message": f"{affected} Check-ins übersprungen. Werden in {self.STALE_THRESHOLD_DAYS} Tagen zu 'stale'.",
        }
    
    async def run_auto_inference(self, user_id: Optional[str] = None) -> Dict:
        """Führt Auto-Inference für stale Messages aus"""
        
        # Finde alle alten Messages ohne Check-in
        cutoff = (datetime.now() - timedelta(days=self.STALE_THRESHOLD_DAYS)).isoformat()
        
        query = self.db.table("pulse_outreach_messages")\
            .select("id")\
            .eq("status", "sent")\
            .eq("check_in_completed", False)\
            .eq("check_in_skipped", False)\
            .lt("sent_at", cutoff)
        
        if user_id:
            query = query.eq("user_id", user_id)
        
        result = query.execute()
        
        affected = 0
        for row in result.data or []:
            try:
                self.db.table("pulse_outreach_messages")\
                    .update({
                        "status": "stale",
                        "auto_inferred": True,
                        "inference_reason": "No check-in after 7 days",
                        "status_updated_at": datetime.now().isoformat(),
                    })\
                    .eq("id", row["id"])\
                    .execute()
                affected += 1
            except Exception:
                pass
        
        return {
            "success": True,
            "stale_count": affected,
            "message": f"{affected} Nachrichten als 'stale' markiert (kein Check-in nach {self.STALE_THRESHOLD_DAYS} Tagen).",
        }
    
    # =========================================================================
    # CHECK-INS
    # =========================================================================
    
    async def get_pending_checkins(self, user_id: str) -> List[CheckInItem]:
        """Holt alle fälligen Check-ins"""
        
        # Nachrichten die älter als 20h sind und noch kein Check-in haben
        cutoff = (datetime.now() - timedelta(hours=20)).isoformat()
        
        result = self.db.table("pulse_outreach_messages")\
            .select("id, lead_id, message_text, channel, sent_at, check_in_reminder_count")\
            .eq("user_id", user_id)\
            .eq("status", "sent")\
            .eq("check_in_completed", False)\
            .eq("check_in_skipped", False)\
            .lt("sent_at", cutoff)\
            .order("sent_at", desc=False)\
            .limit(100)\
            .execute()
        
        checkins = []
        for row in result.data or []:
            sent_at = datetime.fromisoformat(row["sent_at"].replace("Z", "+00:00"))
            hours_since = (datetime.now(sent_at.tzinfo) - sent_at).total_seconds() / 3600
            
            # Lead name holen wenn verfügbar
            lead_name = None
            if row.get("lead_id"):
                lead = self.db.table("leads")\
                    .select("name")\
                    .eq("id", row["lead_id"])\
                    .single()\
                    .execute()
                lead_name = lead.data.get("name") if lead.data else None
            
            # Priority berechnen
            priority = 3
            if hours_since > 120:  # > 5 Tage
                priority = 1
            elif hours_since > 72:  # > 3 Tage
                priority = 2
            elif row.get("check_in_reminder_count", 0) >= 2:
                priority = 2
            
            checkins.append(CheckInItem(
                outreach_id=row["id"],
                lead_id=row.get("lead_id"),
                lead_name=lead_name,
                message_text=row["message_text"],
                channel=row["channel"],
                sent_at=sent_at,
                hours_since_sent=round(hours_since, 1),
                priority=priority,
                reminder_count=row.get("check_in_reminder_count", 0),
            ))
        
        return checkins
    
    async def get_checkin_summary(self, user_id: str) -> CheckInSummary:
        """Zusammenfassung für Morning Briefing"""
        
        checkins = await self.get_pending_checkins(user_id)
        
        priority_1 = len([c for c in checkins if c.priority == 1])
        priority_2 = len([c for c in checkins if c.priority == 2])
        priority_3 = len([c for c in checkins if c.priority == 3])
        
        return CheckInSummary(
            total_pending=len(checkins),
            urgent=priority_1,
            important=priority_2,
            normal=priority_3,
            estimated_time_minutes=len(checkins) * 0.5,  # ~30 Sek pro Check-in
            xp_reward=len(checkins) * 2,  # 2 XP pro Check-in
        )
    
    # =========================================================================
    # GHOST BUSTER
    # =========================================================================
    
    async def get_ghost_leads(
        self,
        user_id: str,
        min_hours: int = 48,
        max_days: int = 14,
    ) -> List[Dict]:
        """Holt alle Ghost-Leads für Ghost-Buster Kampagne"""
        
        min_cutoff = (datetime.now() - timedelta(hours=min_hours)).isoformat()
        max_cutoff = (datetime.now() - timedelta(days=max_days)).isoformat()
        
        result = self.db.table("pulse_outreach_messages")\
            .select("*, leads(name)")\
            .eq("user_id", user_id)\
            .eq("status", "ghosted")\
            .eq("follow_up_sent", False)\
            .gt("seen_at", max_cutoff)\
            .lt("seen_at", min_cutoff)\
            .order("seen_at", desc=True)\
            .limit(50)\
            .execute()
        
        ghosts = []
        for row in result.data or []:
            seen_at = datetime.fromisoformat(row["seen_at"].replace("Z", "+00:00")) if row.get("seen_at") else datetime.now()
            hours_ghosted = (datetime.now(seen_at.tzinfo) - seen_at).total_seconds() / 3600
            
            # Get behavior profile if exists
            behavior = None
            if row.get("lead_id"):
                bp = self.db.table("lead_behavior_profiles")\
                    .select("current_mood, decision_tendency")\
                    .eq("lead_id", row["lead_id"])\
                    .single()\
                    .execute()
                behavior = bp.data if bp.data else None
            
            # Get matching templates
            templates = await self._get_matching_templates(
                mood=behavior.get("current_mood") if behavior else None,
                decision=behavior.get("decision_tendency") if behavior else None,
                hours_ghosted=hours_ghosted,
            )
            
            ghosts.append({
                "outreach_id": row["id"],
                "lead_id": row.get("lead_id"),
                "lead_name": row.get("leads", {}).get("name") if row.get("leads") else None,
                "last_message_text": row["message_text"],
                "channel": row["channel"],
                "seen_at": row.get("seen_at"),
                "hours_ghosted": round(hours_ghosted, 1),
                "behavior_mood": behavior.get("current_mood", "unknown") if behavior else "unknown",
                "behavior_decision": behavior.get("decision_tendency", "undecided") if behavior else "undecided",
                "suggested_strategy": row.get("suggested_strategy"),
                "suggested_templates": templates,
            })
        
        return ghosts
    
    async def _suggest_ghost_buster_strategy(
        self,
        outreach_id: str,
        user_id: str,
    ) -> Optional[GhostBusterSuggestion]:
        """Schlägt eine Ghost-Buster Strategie vor"""
        
        # Get outreach details
        outreach = self.db.table("pulse_outreach_messages")\
            .select("*, leads(name)")\
            .eq("id", outreach_id)\
            .single()\
            .execute()
        
        if not outreach.data:
            return None
        
        data = outreach.data
        lead_name = data.get("leads", {}).get("name", "") if data.get("leads") else ""
        
        seen_at = datetime.fromisoformat(data["seen_at"].replace("Z", "+00:00")) if data.get("seen_at") else datetime.now()
        hours_ghosted = (datetime.now(seen_at.tzinfo) - seen_at).total_seconds() / 3600
        
        # Get behavior profile
        mood = "unknown"
        decision = "undecided"
        if data.get("lead_id"):
            bp = self.db.table("lead_behavior_profiles")\
                .select("current_mood, decision_tendency")\
                .eq("lead_id", data["lead_id"])\
                .single()\
                .execute()
            if bp.data:
                mood = bp.data.get("current_mood", "unknown")
                decision = bp.data.get("decision_tendency", "undecided")
        
        # Get matching templates
        templates = await self._get_matching_templates(
            mood=mood,
            decision=decision,
            hours_ghosted=hours_ghosted,
        )
        
        if not templates:
            # Fallback to default
            return GhostBusterSuggestion(
                strategy=FollowUpStrategy.ghost_buster,
                template_text=f"Hey {lead_name}, hab ich dich mit der letzten Nachricht komplett verschreckt? 😅",
                reasoning="Standard Ghost-Buster (keine spezifischen Templates gefunden)",
                confidence=0.6,
            )
        
        best = templates[0]
        template_text = best["template_text"].replace("{name}", lead_name)
        
        return GhostBusterSuggestion(
            strategy=FollowUpStrategy(best["strategy"]),
            template_id=best.get("id"),
            template_text=template_text,
            reasoning=f"Basierend auf Mood: {mood}, Decision: {decision}",
            confidence=0.8,
        )
    
    async def _get_matching_templates(
        self,
        mood: Optional[str] = None,
        decision: Optional[str] = None,
        hours_ghosted: float = 72,
        ghost_type: Optional[GhostType] = None,  # NEU v2.1
    ) -> List[Dict]:
        """Findet passende Ghost-Buster Templates basierend auf Ghost-Typ (v2.1)"""
        
        days_ghosted = int(hours_ghosted / 24)
        
        # Query templates
        result = self.db.table("ghost_buster_templates")\
            .select("*")\
            .eq("is_active", True)\
            .order("success_rate", desc=True)\
            .limit(15)\
            .execute()
        
        templates = []
        for row in result.data or []:
            # Filter by days
            if row.get("days_since_ghost") and row["days_since_ghost"] > days_ghosted + 3:
                continue
            
            # Score template
            score = 0
            
            # Mood match
            if mood and row.get("works_for_mood") and mood in row["works_for_mood"]:
                score += 2
            
            # Decision match
            if decision and row.get("works_for_decision") and decision in row["works_for_decision"]:
                score += 2
            
            # NEU v2.1: Ghost-Typ match
            if ghost_type:
                strategy = row.get("strategy", "")
                if ghost_type == GhostType.soft:
                    # Soft Ghost: Bevorzuge sanfte Strategien
                    if strategy in ("value_add", "story_reply", "voice_note"):
                        score += 3
                    elif strategy == "takeaway":
                        score -= 1  # Takeaway zu stark für Soft Ghost
                else:  # Hard Ghost
                    # Hard Ghost: Bevorzuge Pattern Interrupts
                    if strategy in ("ghost_buster", "takeaway", "direct_ask"):
                        score += 3
                    elif strategy == "value_add":
                        score -= 1  # Value Add zu soft für Hard Ghost
            
            # Success rate bonus
            if row.get("success_rate"):
                score += row["success_rate"] / 20  # 0-5 bonus
            
            templates.append({
                **row,
                "_score": score,
                "_ghost_type_match": ghost_type.value if ghost_type else None,
            })
        
        # Sort by score
        templates.sort(key=lambda x: x.get("_score", 0), reverse=True)
        
        return templates[:5]
    
    async def send_ghost_buster(
        self,
        user_id: str,
        original_outreach_id: str,
        template_text: str,
        strategy: FollowUpStrategy,
    ) -> Dict:
        """Sendet eine Ghost-Buster Nachricht"""
        
        # Get original outreach
        original = self.db.table("pulse_outreach_messages")\
            .select("lead_id, channel")\
            .eq("id", original_outreach_id)\
            .single()\
            .execute()
        
        if not original.data:
            raise ValueError("Original outreach not found")
        
        # Create new outreach
        check_in_due = datetime.now() + timedelta(hours=self.CHECK_IN_HOURS)
        
        result = self.db.table("pulse_outreach_messages")\
            .insert({
                "user_id": user_id,
                "lead_id": original.data.get("lead_id"),
                "message_text": template_text,
                "message_type": "ghost_buster",
                "channel": original.data["channel"],
                "status": "sent",
                "check_in_due_at": check_in_due.isoformat(),
                "suggested_strategy": strategy.value,
            })\
            .execute()
        
        ghost_buster_id = result.data[0]["id"]
        
        # Mark original as followed up
        self.db.table("pulse_outreach_messages")\
            .update({
                "follow_up_sent": True,
                "follow_up_message_id": ghost_buster_id,
            })\
            .eq("id", original_outreach_id)\
            .execute()
        
        return {
            "success": True,
            "ghost_buster_id": ghost_buster_id,
            "message": "Ghost-Buster gesendet. Check-in in 24h.",
        }
    
    # =========================================================================
    # BEHAVIORAL ANALYSIS
    # =========================================================================
    
    async def analyze_behavior(
        self,
        user_id: str,
        lead_id: str,
        chat_text: str,
        context: Optional[Dict] = None,
    ) -> BehaviorAnalysisResult:
        """Analysiert Verhalten aus einem Chatverlauf"""
        
        if not self.anthropic:
            raise Exception("ANTHROPIC_API_KEY nicht konfiguriert")
        
        # Get existing profile
        existing = self.db.table("lead_behavior_profiles")\
            .select("*")\
            .eq("lead_id", lead_id)\
            .single()\
            .execute()
        
        existing_dict = existing.data if existing.data else None
        
        # Build prompt
        prompt = build_behavioral_analysis_prompt(
            raw_text=chat_text,
            existing_profile=existing_dict,
            context=context,
        )
        
        # Call Claude
        response = self.anthropic.messages.create(
            model="claude-sonnet-4-20250514",
            max_tokens=2000,
            messages=[{"role": "user", "content": prompt}]
        )
        
        content = response.content[0].text
        
        # Parse JSON
        content = re.sub(r'^```json\s*', '', content)
        content = re.sub(r'\s*```$', '', content)
        
        try:
            data = json.loads(content)
        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse behavioral analysis: {e}")
            logger.error(f"Content: {content[:500]}")
            raise Exception("Failed to parse behavioral analysis response")
        
        # Build result
        result = self._parse_behavior_result(data)
        
        # Save to database
        await self._save_behavior_profile(user_id, lead_id, data)
        
        return result
    
    def _parse_behavior_result(self, data: Dict) -> BehaviorAnalysisResult:
        """Konvertiert Claude-Output zu BehaviorAnalysisResult"""
        
        emotion = data.get("emotion_analysis", {})
        engagement = data.get("engagement_analysis", {})
        decision = data.get("decision_analysis", {})
        trust = data.get("trust_analysis", {})
        coherence = data.get("coherence_analysis", {})
        style = data.get("communication_style", {})
        recommendations = data.get("strategic_recommendations", {})
        
        return BehaviorAnalysisResult(
            # Emotion
            current_mood=ContactMood(emotion.get("current_mood", "unknown")),
            mood_confidence=emotion.get("mood_confidence", 0.5),
            sentiment_trajectory=emotion.get("sentiment_trajectory"),
            mood_indicators=emotion.get("mood_indicators", []),
            
            # Engagement
            engagement_level=engagement.get("engagement_level", 3),
            asks_questions=engagement.get("engagement_indicators", {}).get("asks_questions", False),
            proactive_contact=engagement.get("engagement_indicators", {}).get("proactive_contact", False),
            uses_emojis=engagement.get("engagement_indicators", {}).get("uses_emojis", False),
            engagement_trajectory=engagement.get("engagement_trajectory"),
            
            # Decision
            decision_tendency=DecisionTendency(decision.get("decision_tendency", "undecided")),
            commitment_strength=decision.get("commitment_strength", 3),
            objections_raised=decision.get("objections_raised", []),
            buying_signals=decision.get("buying_signals", []),
            hesitation_signals=decision.get("hesitation_signals", []),
            
            # Trust
            trust_level=trust.get("trust_level", 3),
            risk_flags=trust.get("risk_flags", []),
            risk_descriptions=trust.get("risk_descriptions", {}),
            
            # Coherence
            reliability_score=coherence.get("reliability_score", 3),
            coherence_notes=coherence.get("coherence_interpretation"),
            words_vs_behavior=coherence.get("words_vs_behavior"),
            
            # Style
            communication_style=style.get("tone"),
            formality=style.get("formality"),
            
            # Recommendations
            recommended_approach=recommendations.get("recommended_approach", "soft_nurture"),
            recommended_tone=recommendations.get("recommended_tone", "warm"),
            recommended_message_length=recommendations.get("recommended_message_length", "medium"),
            recommended_timing=recommendations.get("recommended_timing"),
            avoid=recommendations.get("avoid", []),
            do_this=recommendations.get("do", []),
            
            # Key Insights
            key_insights=data.get("key_insights", []),
        )
    
    async def _save_behavior_profile(
        self,
        user_id: str,
        lead_id: str,
        data: Dict,
    ):
        """Speichert/Aktualisiert Behavior Profile"""
        
        emotion = data.get("emotion_analysis", {})
        engagement = data.get("engagement_analysis", {})
        decision = data.get("decision_analysis", {})
        trust = data.get("trust_analysis", {})
        coherence = data.get("coherence_analysis", {})
        style = data.get("communication_style", {})
        recommendations = data.get("strategic_recommendations", {})
        
        profile_data = {
            "user_id": user_id,
            "lead_id": lead_id,
            "current_mood": emotion.get("current_mood", "unknown"),
            "mood_confidence": emotion.get("mood_confidence", 0.5),
            "sentiment_trajectory": emotion.get("sentiment_trajectory"),
            "engagement_level": engagement.get("engagement_level", 3),
            "asks_questions": engagement.get("engagement_indicators", {}).get("asks_questions", False),
            "proactive_contact": engagement.get("engagement_indicators", {}).get("proactive_contact", False),
            "uses_emojis": engagement.get("engagement_indicators", {}).get("uses_emojis", False),
            "decision_tendency": decision.get("decision_tendency", "undecided"),
            "commitment_strength": decision.get("commitment_strength", 3),
            "objections_raised": decision.get("objections_raised", []),
            "trust_level": trust.get("trust_level", 3),
            "risk_flags": trust.get("risk_flags", []),
            "reliability_score": coherence.get("reliability_score", 3),
            "coherence_notes": coherence.get("coherence_interpretation"),
            "communication_style": style.get("formality"),
            "recommended_approach": recommendations.get("recommended_approach", "soft_nurture"),
            "recommended_tone": recommendations.get("recommended_tone", "warm"),
            "recommended_message_length": recommendations.get("recommended_message_length", "medium"),
            "last_analyzed_at": datetime.now().isoformat(),
            "analysis_source": "chat_import",
        }
        
        # Check if exists
        existing = self.db.table("lead_behavior_profiles")\
            .select("id")\
            .eq("lead_id", lead_id)\
            .execute()
        
        if existing.data:
            # Update
            self.db.table("lead_behavior_profiles")\
                .update(profile_data)\
                .eq("lead_id", lead_id)\
                .execute()
        else:
            # Insert
            self.db.table("lead_behavior_profiles")\
                .insert(profile_data)\
                .execute()
    
    async def get_behavior_profile(
        self,
        user_id: str,
        lead_id: str,
    ) -> Optional[Dict]:
        """Holt das Verhaltensprofil eines Leads"""
        
        result = self.db.table("lead_behavior_profiles")\
            .select("*, leads(name)")\
            .eq("lead_id", lead_id)\
            .eq("user_id", user_id)\
            .single()\
            .execute()
        
        return result.data if result.data else None
    
    # =========================================================================
    # CONVERSION FUNNEL
    # =========================================================================
    
    async def get_accurate_funnel(
        self,
        user_id: str,
        target_date: Optional[date] = None,
    ) -> AccurateFunnelResponse:
        """Holt Funnel mit Unterscheidung bestätigt/unbestätigt"""
        
        if not target_date:
            target_date = date.today()
        
        date_str = target_date.isoformat()
        next_date = (target_date + timedelta(days=1)).isoformat()
        
        result = self.db.table("pulse_outreach_messages")\
            .select("status, check_in_completed, check_in_skipped")\
            .eq("user_id", user_id)\
            .gte("sent_at", date_str)\
            .lt("sent_at", next_date)\
            .execute()
        
        data = result.data or []
        
        # Calculate counts
        total = len(data)
        confirmed = [d for d in data if d.get("check_in_completed")]
        
        confirmed_seen = len([d for d in confirmed if d["status"] in ("seen", "replied", "ghosted")])
        confirmed_replied = len([d for d in data if d["status"] == "replied"])
        confirmed_ghosted = len([d for d in data if d["status"] == "ghosted"])
        confirmed_invisible = len([d for d in data if d["status"] == "invisible"])
        
        unconfirmed = len([d for d in data if d["status"] == "sent" and not d.get("check_in_completed") and not d.get("check_in_skipped")])
        stale = len([d for d in data if d["status"] == "stale"])
        skipped = len([d for d in data if d.get("check_in_skipped")])
        
        # Calculate rates
        confirmed_open_rate = round(confirmed_seen / len(confirmed) * 100, 1) if confirmed else 0
        confirmed_reply_rate = round(confirmed_replied / confirmed_seen * 100, 1) if confirmed_seen > 0 else 0
        confirmed_ghost_rate = round(confirmed_ghosted / confirmed_seen * 100, 1) if confirmed_seen > 0 else 0
        
        # Data quality
        completion_rate = round(len(confirmed) / total * 100, 1) if total > 0 else 0
        
        quality_score = 0
        if total > 0:
            ratio = len(confirmed) / total
            if ratio >= 0.9:
                quality_score = 100
            elif ratio >= 0.7:
                quality_score = 80
            elif ratio >= 0.5:
                quality_score = 60
            elif ratio >= 0.3:
                quality_score = 40
            else:
                quality_score = 20
        
        return AccurateFunnelResponse(
            date=date_str,
            confirmed_sent=len(confirmed),
            confirmed_seen=confirmed_seen,
            confirmed_replied=confirmed_replied,
            confirmed_ghosted=confirmed_ghosted,
            confirmed_invisible=confirmed_invisible,
            unconfirmed_count=unconfirmed,
            stale_count=stale,
            skipped_count=skipped,
            confirmed_open_rate=confirmed_open_rate,
            confirmed_reply_rate=confirmed_reply_rate,
            confirmed_ghost_rate=confirmed_ghost_rate,
            check_in_completion_rate=completion_rate,
            data_quality_score=quality_score,
        )
    
    async def get_funnel_insights(self, user_id: str) -> Dict:
        """Generiert Insights zum Funnel"""
        
        # Get last 7 days
        result = self.db.table("conversion_funnel_daily")\
            .select("*")\
            .eq("user_id", user_id)\
            .order("date", desc=True)\
            .limit(7)\
            .execute()
        
        rows = result.data or []
        
        if not rows:
            return {
                "overall_health": "unknown",
                "health_score": 0,
                "recommendations": [],
            }
        
        # Calculate averages
        total_sent = sum(r.get("messages_sent", 0) for r in rows)
        total_seen = sum(r.get("messages_seen", 0) for r in rows)
        total_replied = sum(r.get("messages_replied", 0) for r in rows)
        total_ghosted = sum(r.get("messages_ghosted", 0) for r in rows)
        
        open_rate = (total_seen / total_sent * 100) if total_sent > 0 else 0
        reply_rate = (total_replied / total_seen * 100) if total_seen > 0 else 0
        ghost_rate = (total_ghosted / total_seen * 100) if total_seen > 0 else 0
        
        # Determine health
        if reply_rate >= 30:
            health = "good"
            score = 80
        elif reply_rate >= 15:
            health = "warning"
            score = 50
        else:
            health = "critical"
            score = 20
        
        # Generate recommendations
        recommendations = []
        
        if open_rate < 50:
            recommendations.append({
                "type": "visibility",
                "message": "Deine Nachrichten werden oft nicht gelesen. Versuch Cross-Channel (Kommentar unter Post) um Sichtbarkeit zu erhöhen.",
            })
        
        if ghost_rate > 60:
            recommendations.append({
                "type": "opener",
                "message": "Hohe Ghost-Rate! Deine Opener werden gelesen aber nicht beantwortet. Teste kürzere, persönlichere Nachrichten.",
            })
        
        if reply_rate < 15:
            recommendations.append({
                "type": "engagement",
                "message": "Niedrige Reply-Rate. Stelle mehr Fragen in deinen Nachrichten und mach sie weniger werblich.",
            })
        
        return {
            "overall_health": health,
            "health_score": score,
            "metrics": {
                "open_rate": round(open_rate, 1),
                "reply_rate": round(reply_rate, 1),
                "ghost_rate": round(ghost_rate, 1),
            },
            "recommendations": recommendations,
        }
    
    # =========================================================================
    # INTENT CORRECTION
    # =========================================================================
    
    async def submit_intent_correction(
        self,
        user_id: str,
        query_text: str,
        detected_intent: str,
        corrected_intent: str,
        detected_objection: Optional[str] = None,
        corrected_objection: Optional[str] = None,
        reason: Optional[str] = None,
    ) -> Dict:
        """Speichert eine Intent-Korrektur für späteres Training"""
        
        self.db.table("intent_corrections").insert({
            "user_id": user_id,
            "query_text": query_text,
            "original_language": "de",
            "detected_intent": detected_intent,
            "detected_objection_type": detected_objection,
            "corrected_intent": corrected_intent,
            "corrected_objection_type": corrected_objection,
            "correction_reason": reason,
        }).execute()
        
        return {
            "success": True,
            "message": "Korrektur gespeichert. Danke fürs Training!",
        }
    
    # =========================================================================
    # NEU v2.1: DYNAMIC TIMING
    # =========================================================================
    
    async def _get_dynamic_timing(self, lead_id: str) -> Optional[DynamicTimingInfo]:
        """Holt dynamische Timing-Informationen für einen Lead"""
        
        result = self.db.table("lead_behavior_profiles")\
            .select("avg_response_time_hours, engagement_level, predicted_check_in_hours, predicted_ghost_threshold_hours, response_time_trend")\
            .eq("lead_id", lead_id)\
            .single()\
            .execute()
        
        if not result.data:
            return None
        
        data = result.data
        return DynamicTimingInfo(
            lead_id=lead_id,
            avg_response_time_hours=data.get("avg_response_time_hours"),
            engagement_level=data.get("engagement_level", 3),
            predicted_check_in_hours=data.get("predicted_check_in_hours", self.CHECK_IN_HOURS),
            predicted_ghost_threshold_hours=data.get("predicted_ghost_threshold_hours", self.GHOST_THRESHOLD_HOURS),
            response_time_trend=data.get("response_time_trend"),
        )
    
    def _calculate_dynamic_check_in_hours(
        self,
        avg_response_hours: Optional[float],
        engagement_level: int = 3,
    ) -> int:
        """Berechnet dynamische Check-in Zeit basierend auf Lead-Engagement"""
        
        if avg_response_hours is None:
            return self.CHECK_IN_HOURS  # Default 24h
        
        # Multiplier basierend auf Engagement Level
        multipliers = {
            5: 2.0,   # High: 2x avg
            4: 2.5,
            3: 3.0,   # Medium: 3x avg
            2: 3.0,
            1: 4.0,   # Low: 4x avg
        }
        
        multiplier = multipliers.get(engagement_level, 3.0)
        check_in_hours = int(avg_response_hours * multiplier)
        
        # Bounds: 6h - 72h
        return max(self.MIN_CHECK_IN_HOURS, min(self.MAX_CHECK_IN_HOURS, check_in_hours))
    
    def _calculate_ghost_threshold_hours(
        self,
        avg_response_hours: Optional[float],
    ) -> int:
        """Berechnet dynamische Ghost-Schwelle basierend auf Lead-Verhalten"""
        
        if avg_response_hours is None:
            return self.GHOST_THRESHOLD_HOURS  # Default 48h
        
        # Ghost = avg_response * 3 (aber min 8h, max 168h/7 Tage)
        threshold = int(avg_response_hours * self.GHOST_MULTIPLIER)
        return max(self.MIN_GHOST_THRESHOLD, min(self.MAX_GHOST_THRESHOLD, threshold))
    
    async def update_lead_dynamic_thresholds(self, lead_id: str) -> DynamicTimingInfo:
        """Aktualisiert die dynamischen Thresholds für einen Lead"""
        
        # Berechne avg Response Time aus Outreach-History
        result = self.db.table("pulse_outreach_messages")\
            .select("response_time_hours")\
            .eq("lead_id", lead_id)\
            .not_.is_("response_time_hours", "null")\
            .execute()
        
        response_times = [r["response_time_hours"] for r in (result.data or []) if r.get("response_time_hours")]
        
        if not response_times:
            return DynamicTimingInfo(
                lead_id=lead_id,
                predicted_check_in_hours=self.CHECK_IN_HOURS,
                predicted_ghost_threshold_hours=self.GHOST_THRESHOLD_HOURS,
            )
        
        avg_response = sum(response_times) / len(response_times)
        
        # Hole Engagement Level
        profile = self.db.table("lead_behavior_profiles")\
            .select("engagement_level")\
            .eq("lead_id", lead_id)\
            .single()\
            .execute()
        
        engagement_level = profile.data.get("engagement_level", 3) if profile.data else 3
        
        # Berechne Dynamic Thresholds
        check_in_hours = self._calculate_dynamic_check_in_hours(avg_response, engagement_level)
        ghost_threshold = self._calculate_ghost_threshold_hours(avg_response)
        
        # Trend berechnen (letzte 3 vs. vorherige 3)
        trend = "stable"
        if len(response_times) >= 6:
            recent = sum(response_times[-3:]) / 3
            previous = sum(response_times[-6:-3]) / 3
            if recent < previous * 0.8:
                trend = "faster"
            elif recent > previous * 1.2:
                trend = "slower"
        
        # Update Profile
        self.db.table("lead_behavior_profiles")\
            .update({
                "avg_response_time_hours": avg_response,
                "predicted_check_in_hours": check_in_hours,
                "predicted_ghost_threshold_hours": ghost_threshold,
                "response_time_trend": trend,
                "updated_at": datetime.now().isoformat(),
            })\
            .eq("lead_id", lead_id)\
            .execute()
        
        return DynamicTimingInfo(
            lead_id=lead_id,
            avg_response_time_hours=avg_response,
            engagement_level=engagement_level,
            predicted_check_in_hours=check_in_hours,
            predicted_ghost_threshold_hours=ghost_threshold,
            response_time_trend=trend,
        )
    
    # =========================================================================
    # NEU v2.1: SMART STATUS INFERENCE
    # =========================================================================
    
    async def smart_infer_status_from_chat(
        self,
        user_id: str,
        lead_id: str,
        latest_sender: str,
        has_unread_from_lead: bool = False,
    ) -> List[SmartInferenceResult]:
        """Inferiert Status automatisch aus Chat-Import"""
        
        # Finde alle pending Outreach für diesen Lead
        result = self.db.table("pulse_outreach_messages")\
            .select("id, status")\
            .eq("user_id", user_id)\
            .eq("lead_id", lead_id)\
            .in_("status", ["sent", "delivered", "seen"])\
            .eq("check_in_completed", False)\
            .execute()
        
        inferred = []
        
        for row in result.data or []:
            if latest_sender == "lead" or has_unread_from_lead:
                old_status = row["status"]
                new_status = "replied"
                
                self.db.table("pulse_outreach_messages")\
                    .update({
                        "status": new_status,
                        "status_updated_at": datetime.now().isoformat(),
                        "status_source": "chat_import",
                        "auto_inferred": True,
                        "inference_reason": f"Lead replied (detected from chat import, sender={latest_sender})",
                        "check_in_completed": True,
                        "replied_at": datetime.now().isoformat(),
                    })\
                    .eq("id", row["id"])\
                    .execute()
                
                inferred.append(SmartInferenceResult(
                    outreach_id=row["id"],
                    old_status=MessageStatus(old_status),
                    new_status=MessageStatus(new_status),
                    inference_reason=f"Lead replied (detected from chat import)",
                    was_auto_inferred=True,
                ))
        
        return inferred
    
    # =========================================================================
    # NEU v2.1: GHOST CLASSIFICATION (SOFT vs HARD)
    # =========================================================================
    
    def _classify_ghost_type(
        self,
        hours_since_seen: float,
        lead_was_online_since: Optional[bool] = None,
        lead_posted_since: Optional[bool] = None,
    ) -> GhostType:
        """Klassifiziert einen Ghost als Soft oder Hard"""
        
        # HARD Ghost: Sehr lange her
        if hours_since_seen > 120:
            return GhostType.hard
        
        # HARD Ghost: Lange her UND Lead war aktiv
        if hours_since_seen > self.HARD_GHOST_MIN_HOURS:
            if lead_was_online_since or lead_posted_since:
                return GhostType.hard
        
        # SOFT Ghost: Alles andere
        return GhostType.soft
    
    async def classify_ghost(
        self,
        outreach_id: str,
        lead_was_online_since: Optional[bool] = None,
        lead_posted_since: Optional[bool] = None,
    ) -> GhostClassificationResponse:
        """Klassifiziert einen Ghost und gibt Strategie-Empfehlung"""
        
        # Hole Outreach-Details
        outreach = self.db.table("pulse_outreach_messages")\
            .select("*, leads(name)")\
            .eq("id", outreach_id)\
            .single()\
            .execute()
        
        if not outreach.data:
            raise ValueError("Outreach not found")
        
        data = outreach.data
        seen_at = datetime.fromisoformat(data["seen_at"].replace("Z", "+00:00")) if data.get("seen_at") else datetime.now()
        hours_since_seen = (datetime.now(seen_at.tzinfo) - seen_at).total_seconds() / 3600
        
        # Klassifizieren
        ghost_type = self._classify_ghost_type(hours_since_seen, lead_was_online_since, lead_posted_since)
        
        # Update in DB
        self.db.table("pulse_outreach_messages")\
            .update({
                "ghost_type": ghost_type.value,
                "ghost_detected_at": datetime.now().isoformat(),
            })\
            .eq("id", outreach_id)\
            .execute()
        
        # Strategie basierend auf Ghost-Typ
        if ghost_type == GhostType.soft:
            recommended_strategy = FollowUpStrategy.value_add
            strategy_reasoning = "Soft Ghost: Sanfter Check-in, kein Druck. Lead war evtl. nur busy."
        else:
            recommended_strategy = FollowUpStrategy.takeaway
            strategy_reasoning = "Hard Ghost: Pattern Interrupt oder Takeaway nötig. Lead ignoriert aktiv."
        
        # Templates für diesen Ghost-Typ
        templates = await self._get_matching_templates(
            mood=data.get("behavior_mood"),
            decision=data.get("behavior_decision"),
            hours_ghosted=hours_since_seen,
            ghost_type=ghost_type,
        )
        
        return GhostClassificationResponse(
            outreach_id=outreach_id,
            ghost_type=ghost_type,
            hours_since_seen=round(hours_since_seen, 1),
            recommended_strategy=recommended_strategy,
            strategy_reasoning=strategy_reasoning,
            suggested_templates=templates,
        )
    
    async def get_ghost_stats_by_type(self, user_id: str, days: int = 30) -> GhostStatsByType:
        """Holt Ghost-Statistiken nach Typ"""
        
        cutoff = (datetime.now() - timedelta(days=days)).isoformat()
        
        result = self.db.table("pulse_outreach_messages")\
            .select("ghost_type, status")\
            .eq("user_id", user_id)\
            .eq("status", "ghosted")\
            .gt("sent_at", cutoff)\
            .execute()
        
        soft_ghosts = 0
        hard_ghosts = 0
        soft_reactivated = 0
        hard_reactivated = 0
        
        for row in result.data or []:
            if row.get("ghost_type") == "soft":
                soft_ghosts += 1
            elif row.get("ghost_type") == "hard":
                hard_ghosts += 1
        
        # Reactivation aus Follow-ups
        followups = self.db.table("pulse_outreach_messages")\
            .select("follow_up_message_id, ghost_type")\
            .eq("user_id", user_id)\
            .eq("status", "ghosted")\
            .eq("follow_up_sent", True)\
            .gt("sent_at", cutoff)\
            .execute()
        
        for row in followups.data or []:
            if row.get("follow_up_message_id"):
                # Check if follow-up got reply
                follow_up = self.db.table("pulse_outreach_messages")\
                    .select("status")\
                    .eq("id", row["follow_up_message_id"])\
                    .single()\
                    .execute()
                
                if follow_up.data and follow_up.data.get("status") == "replied":
                    if row.get("ghost_type") == "soft":
                        soft_reactivated += 1
                    elif row.get("ghost_type") == "hard":
                        hard_reactivated += 1
        
        return GhostStatsByType(
            soft_ghosts=soft_ghosts,
            hard_ghosts=hard_ghosts,
            soft_reactivation_rate=round(soft_reactivated / soft_ghosts * 100, 1) if soft_ghosts > 0 else 0,
            hard_reactivation_rate=round(hard_reactivated / hard_ghosts * 100, 1) if hard_ghosts > 0 else 0,
        )
    
    # =========================================================================
    # NEU v2.1: INTENT-BASIERTES FUNNEL
    # =========================================================================
    
    async def get_funnel_by_intent(
        self,
        user_id: str,
        start_date: Optional[date] = None,
        end_date: Optional[date] = None,
    ) -> IntentFunnelResponse:
        """Holt Funnel-Metriken aufgeschlüsselt nach Message Intent"""
        
        if not start_date:
            start_date = date.today() - timedelta(days=30)
        if not end_date:
            end_date = date.today()
        
        result = self.db.table("pulse_outreach_messages")\
            .select("intent, status")\
            .eq("user_id", user_id)\
            .gte("sent_at", start_date.isoformat())\
            .lte("sent_at", end_date.isoformat())\
            .not_.is_("intent", "null")\
            .execute()
        
        # Aggregiere nach Intent
        intent_stats: Dict[str, Dict] = {}
        for row in result.data or []:
            intent = row.get("intent", "follow_up")
            status = row.get("status", "sent")
            
            if intent not in intent_stats:
                intent_stats[intent] = {"sent": 0, "seen": 0, "replied": 0, "ghosted": 0}
            
            intent_stats[intent]["sent"] += 1
            if status in ("seen", "replied", "ghosted"):
                intent_stats[intent]["seen"] += 1
            if status == "replied":
                intent_stats[intent]["replied"] += 1
            if status == "ghosted":
                intent_stats[intent]["ghosted"] += 1
        
        # Konvertiere zu IntentFunnelItems
        items = []
        total_sent = 0
        total_replied = 0
        
        for intent_str, stats in intent_stats.items():
            try:
                intent = MessageIntent(intent_str)
            except ValueError:
                continue
            
            sent = stats["sent"]
            seen = stats["seen"]
            replied = stats["replied"]
            ghosted = stats["ghosted"]
            
            reply_rate = round(replied / seen * 100, 1) if seen > 0 else 0
            ghost_rate = round(ghosted / seen * 100, 1) if seen > 0 else 0
            
            total_sent += sent
            total_replied += replied
            
            items.append(IntentFunnelItem(
                intent=intent,
                sent_count=sent,
                seen_count=seen,
                replied_count=replied,
                ghosted_count=ghosted,
                reply_rate=reply_rate,
                ghost_rate=ghost_rate,
            ))
        
        # Sortiere nach sent_count
        items.sort(key=lambda x: x.sent_count, reverse=True)
        
        # Best/Worst Intent
        best_intent = None
        worst_intent = None
        if items:
            valid_items = [i for i in items if i.sent_count >= 5]  # Min 5 für Signifikanz
            if valid_items:
                best_intent = max(valid_items, key=lambda x: x.reply_rate).intent
                worst_intent = min(valid_items, key=lambda x: x.reply_rate).intent
        
        return IntentFunnelResponse(
            start_date=start_date,
            end_date=end_date,
            intents=items,
            total_sent=total_sent,
            overall_reply_rate=round(total_replied / total_sent * 100, 1) if total_sent > 0 else 0,
            best_intent=best_intent,
            worst_intent=worst_intent,
        )
    
    async def get_intent_coaching_insights(
        self,
        user_id: str,
        days: int = 30,
    ) -> List[IntentCoachingInsight]:
        """Generiert Intent-basierte Coaching Insights"""
        
        funnel = await self.get_funnel_by_intent(
            user_id,
            start_date=date.today() - timedelta(days=days),
            end_date=date.today(),
        )
        
        # Durchschnittliche Reply-Rate berechnen
        valid_intents = [i for i in funnel.intents if i.sent_count >= 5]
        if not valid_intents:
            return []
        
        avg_reply_rate = sum(i.reply_rate for i in valid_intents) / len(valid_intents)
        
        insights = []
        coaching_tips = {
            MessageIntent.intro: {
                "weak": "Deine Intro-Messages performen unter dem Schnitt. Teste persönlichere Hooks und kürzere Nachrichten.",
                "average": "Deine Intros sind okay. Teste A/B Varianten für mehr Optimierung.",
                "strong": "Starke Intro-Performance! Halte diesen Stil bei.",
            },
            MessageIntent.discovery: {
                "weak": "Stelle mehr offene Fragen in der Discovery-Phase. Zeige echtes Interesse.",
                "average": "Discovery läuft okay. Probiere spezifischere Fragen zum Business des Leads.",
                "strong": "Gute Discovery! Du verstehst deine Leads.",
            },
            MessageIntent.pitch: {
                "weak": "Pitch-Messages zu lang oder zu werblich? Fokussiere auf 1-2 Kernbenefits, nicht auf Features.",
                "average": "Pitches okay. Teste kürzere, benefit-fokussierte Varianten.",
                "strong": "Deine Pitches überzeugen. Weiter so!",
            },
            MessageIntent.scheduling: {
                "weak": "Scheduling-Probleme? Biete konkrete Zeiten an statt 'wann passt es dir?'",
                "average": "Termin-Koordination läuft. Teste Calendly-Links.",
                "strong": "Gutes Termin-Management!",
            },
            MessageIntent.closing: {
                "weak": "Closing Messages performen schlecht. Teste kürzere, direktere Abschluss-Fragen. Weniger ist mehr!",
                "average": "Closing okay. Probiere mehr Takeaway-Psychologie.",
                "strong": "Stark im Closing! Du machst den Sack zu.",
            },
            MessageIntent.follow_up: {
                "weak": "Follow-ups zu werblich? Mehr Value, weniger Push. Zeige dass du an sie denkst.",
                "average": "Follow-ups okay. Variiere die Timing und Inhalte.",
                "strong": "Solide Follow-up Performance.",
            },
            MessageIntent.reactivation: {
                "weak": "Ghost-Reaktivierung schwach. Teste Humor, Pattern Interrupts oder Takeaway-Messages.",
                "average": "Reactivation okay. Probiere Voice Notes für persönlicheren Touch.",
                "strong": "Du holst Ghosts gut zurück!",
            },
        }
        
        for item in funnel.intents:
            if item.sent_count < 3:
                continue
            
            # Performance Level bestimmen
            if item.reply_rate >= avg_reply_rate * 1.3:
                performance_level = "strong"
            elif item.reply_rate >= avg_reply_rate * 0.7:
                performance_level = "average"
            else:
                performance_level = "weak"
            
            tip = coaching_tips.get(item.intent, {}).get(performance_level, "Weiter beobachten.")
            
            insights.append(IntentCoachingInsight(
                intent=item.intent,
                sent_count=item.sent_count,
                reply_rate=item.reply_rate,
                performance_level=performance_level,
                coaching_tip=tip,
            ))
        
        return insights
    
    # =========================================================================
    # NEU v2.1: A/B TESTING BY PROFILE
    # =========================================================================
    
    async def get_best_template_for_lead(
        self,
        lead_id: str,
        campaign_id: Optional[str] = None,
    ) -> BestTemplateRecommendation:
        """Empfiehlt die beste Template-Variante basierend auf Lead-Mood"""
        
        # Hole Lead Mood
        profile = self.db.table("lead_behavior_profiles")\
            .select("current_mood, best_template_variant, best_template_mood_match")\
            .eq("lead_id", lead_id)\
            .single()\
            .execute()
        
        mood = ContactMood.neutral
        if profile.data:
            try:
                mood = ContactMood(profile.data.get("current_mood", "neutral"))
            except ValueError:
                mood = ContactMood.neutral
            
            # Check if we have mood-specific best template
            mood_match = profile.data.get("best_template_mood_match", {})
            if mood.value in mood_match:
                return BestTemplateRecommendation(
                    lead_id=lead_id,
                    lead_mood=mood,
                    recommended_variant=mood_match[mood.value],
                    expected_reply_rate=0,  # TODO: Berechnen aus Campaign-Daten
                    reasoning=f"Beste Variante für {mood.value} Leads basierend auf historischer Performance",
                )
        
        # Hole Campaign-Performance wenn angegeben
        if campaign_id:
            campaign = self.db.table("outreach_campaigns")\
                .select("variant_performance_by_mood")\
                .eq("id", campaign_id)\
                .single()\
                .execute()
            
            if campaign.data and campaign.data.get("variant_performance_by_mood"):
                perf_by_mood = campaign.data["variant_performance_by_mood"]
                
                best_variant = None
                best_rate = 0
                
                for variant, mood_perf in perf_by_mood.items():
                    if mood.value in mood_perf:
                        rate = mood_perf[mood.value].get("reply_rate", 0)
                        if rate > best_rate:
                            best_rate = rate
                            best_variant = variant
                
                if best_variant:
                    return BestTemplateRecommendation(
                        lead_id=lead_id,
                        lead_mood=mood,
                        recommended_variant=best_variant,
                        expected_reply_rate=best_rate,
                        reasoning=f"Variante {best_variant} hat {best_rate}% Reply-Rate für {mood.value} Leads",
                    )
        
        # Fallback: Standard-Variante
        return BestTemplateRecommendation(
            lead_id=lead_id,
            lead_mood=mood,
            recommended_variant="A",
            expected_reply_rate=0,
            reasoning="Keine historischen Daten - Standard-Variante A",
        )

