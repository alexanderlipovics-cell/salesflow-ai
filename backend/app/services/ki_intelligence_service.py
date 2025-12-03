"""
SALES FLOW AI - KI INTELLIGENCE SERVICE
Core Service für BANT, DISG, Recommendations & GPT Integration
Version: 1.0.0 | Created: 2024-12-01
"""

import json
import logging
from datetime import datetime, timedelta
from typing import Any, Optional
from uuid import UUID

from openai import AsyncOpenAI

from app.core.supabase import get_supabase_client
from app.prompts.ki_system_prompts import (
    AI_COACH_SYSTEM_PROMPT,
    COMPLIANCE_FILTER_PROMPT,
    DEAL_MEDIC_SYSTEM_PROMPT,
    MEMORY_EXTRACTION_PROMPT,
    NEURO_PROFILER_SYSTEM_PROMPT,
    get_recommendation_engine_prompt,
    get_script_generation_prompt,
)

logger = logging.getLogger(__name__)


class KIIntelligenceService:
    """Service for KI-powered sales intelligence"""

    def __init__(self, openai_api_key: str):
        self.client = AsyncOpenAI(api_key=openai_api_key)
        self.supabase = get_supabase_client()

    # ========================================================================
    # BANT ASSESSMENT
    # ========================================================================

    async def create_bant_assessment(
        self,
        user_id: str,
        lead_id: str,
        scores: dict[str, int],
        notes: dict[str, str] = None,
    ) -> dict:
        """Create BANT assessment"""
        try:
            data = {
                "lead_id": lead_id,
                "user_id": user_id,
                "budget_score": scores["budget_score"],
                "authority_score": scores["authority_score"],
                "need_score": scores["need_score"],
                "timeline_score": scores["timeline_score"],
                **(notes or {}),
            }

            result = (
                self.supabase.table("bant_assessments")
                .insert(data)
                .execute()
            )

            logger.info(f"Created BANT assessment for lead {lead_id}")
            return result.data[0] if result.data else {}

        except Exception as e:
            logger.error(f"Error creating BANT assessment: {e}")
            raise

    async def generate_bant_recommendations(
        self, lead_id: str
    ) -> dict:
        """Generate DISG recommendations via RPC"""
        try:
            result = self.supabase.rpc(
                "generate_disg_recommendations",
                {"p_lead_id": lead_id}
            ).execute()

            return result.data if result.data else {}

        except Exception as e:
            logger.error(f"Error generating BANT recommendations: {e}")
            return {"success": False, "error": str(e)}

    # ========================================================================
    # PERSONALITY PROFILING (DISG)
    # ========================================================================

    async def create_personality_profile(
        self,
        user_id: str,
        lead_id: str,
        scores: dict[str, int],
        assessment_method: str = "ai_analysis",
    ) -> dict:
        """Create personality profile"""
        try:
            data = {
                "lead_id": lead_id,
                "user_id": user_id,
                "dominance_score": scores["dominance_score"],
                "influence_score": scores["influence_score"],
                "steadiness_score": scores["steadiness_score"],
                "conscientiousness_score": scores["conscientiousness_score"],
                "assessment_method": assessment_method,
                "confidence_score": scores.get("confidence_score", 0.7),
            }

            result = (
                self.supabase.table("personality_profiles")
                .upsert(data, on_conflict="lead_id")
                .execute()
            )

            # Generate recommendations
            if result.data:
                await self.generate_bant_recommendations(lead_id)

            logger.info(f"Created personality profile for lead {lead_id}")
            return result.data[0] if result.data else {}

        except Exception as e:
            logger.error(f"Error creating personality profile: {e}")
            raise

    async def analyze_personality_from_messages(
        self,
        lead_id: str,
        user_id: str,
        messages: list[str],
    ) -> dict:
        """Analyze personality from message history using GPT"""
        try:
            messages_text = "\n".join(messages[-20:])  # Last 20 messages

            prompt = f"""Analysiere diese Nachrichten und bestimme den DISG-Persönlichkeitstyp:

{messages_text}

Bewerte jeden DISG-Typ auf einer Skala von 0-100:
- D (Dominant): Direkt, ergebnisorientiert, entscheidungsfreudig
- I (Influence): Enthusiastisch, sozial, optimistisch
- S (Steadiness): Geduldig, zuverlässig, risikoavers
- C (Conscientiousness): Analytisch, präzise, detail-fokussiert

Antworte mit JSON:
{{
  "dominance_score": 0-100,
  "influence_score": 0-100,
  "steadiness_score": 0-100,
  "conscientiousness_score": 0-100,
  "confidence_score": 0.0-1.0,
  "reasoning": "Kurze Begründung"
}}
"""

            response = await self.client.chat.completions.create(
                model="gpt-4",
                messages=[
                    {"role": "system", "content": NEURO_PROFILER_SYSTEM_PROMPT},
                    {"role": "user", "content": prompt},
                ],
                temperature=0.3,
                response_format={"type": "json_object"},
            )

            result = json.loads(response.choices[0].message.content)

            # Save profile
            await self.create_personality_profile(
                user_id=user_id,
                lead_id=lead_id,
                scores=result,
                assessment_method="ai_analysis",
            )

            return result

        except Exception as e:
            logger.error(f"Error analyzing personality: {e}")
            raise

    # ========================================================================
    # LEAD MEMORY & CONTEXT
    # ========================================================================

    async def update_lead_memory(
        self, lead_id: str, user_id: str
    ) -> dict:
        """Update lead context summary via RPC"""
        try:
            result = self.supabase.rpc(
                "update_lead_memory",
                {"p_lead_id": lead_id, "p_user_id": user_id}
            ).execute()

            return result.data if result.data else {}

        except Exception as e:
            logger.error(f"Error updating lead memory: {e}")
            return {"success": False, "error": str(e)}

    async def get_lead_intelligence(self, lead_id: str) -> dict:
        """Get complete lead intelligence via RPC"""
        try:
            result = self.supabase.rpc(
                "get_lead_intelligence",
                {"p_lead_id": lead_id}
            ).execute()

            return result.data if result.data else {}

        except Exception as e:
            logger.error(f"Error getting lead intelligence: {e}")
            return {"error": str(e)}

    # ========================================================================
    # AI RECOMMENDATIONS
    # ========================================================================

    async def create_recommendation(
        self,
        user_id: str,
        recommendation_data: dict,
    ) -> dict:
        """Create AI recommendation"""
        try:
            data = {
                "user_id": user_id,
                **recommendation_data,
            }

            result = (
                self.supabase.table("ai_recommendations")
                .insert(data)
                .execute()
            )

            logger.info(f"Created recommendation for user {user_id}")
            return result.data[0] if result.data else {}

        except Exception as e:
            logger.error(f"Error creating recommendation: {e}")
            raise

    async def get_pending_recommendations(
        self, user_id: str, limit: int = 10
    ) -> list[dict]:
        """Get pending recommendations for user"""
        try:
            result = (
                self.supabase.table("ai_recommendations")
                .select("*")
                .eq("user_id", user_id)
                .eq("status", "pending")
                .order("priority.desc")
                .order("created_at.desc")
                .limit(limit)
                .execute()
            )

            return result.data if result.data else []

        except Exception as e:
            logger.error(f"Error getting recommendations: {e}")
            return []

    async def recommend_followup_actions(
        self, user_id: str, limit: int = 5
    ) -> list[dict]:
        """Get follow-up recommendations via RPC"""
        try:
            result = self.supabase.rpc(
                "recommend_followup_actions",
                {"p_user_id": user_id, "p_limit": limit}
            ).execute()

            return result.data if result.data else []

        except Exception as e:
            logger.error(f"Error getting followup recommendations: {e}")
            return []

    async def update_recommendation_status(
        self,
        recommendation_id: str,
        status: str,
        dismissed_reason: str = None,
    ) -> dict:
        """Update recommendation status"""
        try:
            data = {"status": status}

            if status == "dismissed" and dismissed_reason:
                data["dismissed_reason"] = dismissed_reason
            elif status == "accepted":
                data["accepted_at"] = datetime.utcnow().isoformat()
            elif status == "completed":
                data["completed_at"] = datetime.utcnow().isoformat()

            result = (
                self.supabase.table("ai_recommendations")
                .update(data)
                .eq("id", recommendation_id)
                .execute()
            )

            return result.data[0] if result.data else {}

        except Exception as e:
            logger.error(f"Error updating recommendation: {e}")
            raise

    # ========================================================================
    # COMPLIANCE
    # ========================================================================

    async def check_compliance(
        self,
        user_id: str,
        content: str,
        content_type: str,
        related_lead_id: str = None,
    ) -> dict:
        """Check content for compliance violations"""
        try:
            prompt = f"""Prüfe diesen {content_type} auf Compliance-Verstöße:

CONTENT:
{content}

Analysiere und antworte mit JSON.
"""

            response = await self.client.chat.completions.create(
                model="gpt-4",
                messages=[
                    {"role": "system", "content": COMPLIANCE_FILTER_PROMPT},
                    {"role": "user", "content": prompt},
                ],
                temperature=0.1,
                response_format={"type": "json_object"},
            )

            result = json.loads(response.choices[0].message.content)

            # Log to database via RPC
            log_id = self.supabase.rpc(
                "log_ai_output_compliance",
                {
                    "p_user_id": user_id,
                    "p_content_type": content_type,
                    "p_original_content": content,
                    "p_filtered_content": result.get("filtered_content"),
                    "p_violation_detected": result.get("violation_detected", False),
                    "p_violation_types": json.dumps(result.get("violation_types", [])),
                    "p_action": result.get("action", "allowed"),
                    "p_related_lead_id": related_lead_id,
                }
            ).execute()

            result["log_id"] = log_id.data if log_id.data else None

            return result

        except Exception as e:
            logger.error(f"Error checking compliance: {e}")
            return {
                "violation_detected": False,
                "action": "allowed",
                "error": str(e),
            }

    # ========================================================================
    # SCRIPT GENERATION
    # ========================================================================

    async def generate_personalized_script(
        self,
        lead_id: str,
        script_type: str = "follow-up",
    ) -> str:
        """Generate personalized script for lead"""
        try:
            # Get lead intelligence
            intelligence = await self.get_lead_intelligence(lead_id)

            lead_name = intelligence.get("name", "Lead")
            personality_type = intelligence.get("personality", {}).get("primary_type")
            bant_score = intelligence.get("bant", {}).get("score")
            context_summary = intelligence.get("context", {}).get("short_summary")

            prompt = get_script_generation_prompt(
                lead_name=lead_name,
                personality_type=personality_type,
                bant_score=bant_score,
                context_summary=context_summary,
                script_type=script_type,
            )

            response = await self.client.chat.completions.create(
                model="gpt-4",
                messages=[
                    {"role": "system", "content": AI_COACH_SYSTEM_PROMPT},
                    {"role": "user", "content": prompt},
                ],
                temperature=0.7,
            )

            script = response.choices[0].message.content

            # Check compliance
            compliance_check = await self.check_compliance(
                user_id=intelligence.get("user_id"),
                content=script,
                content_type="script",
                related_lead_id=lead_id,
            )

            if compliance_check.get("violation_detected"):
                return compliance_check.get("filtered_content", script)

            return script

        except Exception as e:
            logger.error(f"Error generating script: {e}")
            raise

    # ========================================================================
    # ANALYTICS
    # ========================================================================

    async def get_scored_leads(
        self, user_id: str, limit: int = 50
    ) -> list[dict]:
        """Get scored leads from materialized view"""
        try:
            result = (
                self.supabase.table("view_leads_scored")
                .select("*")
                .eq("user_id", user_id)
                .order("overall_health_score.desc")
                .limit(limit)
                .execute()
            )

            return result.data if result.data else []

        except Exception as e:
            logger.error(f"Error getting scored leads: {e}")
            return []

    async def get_conversion_microsteps(
        self, user_id: str
    ) -> dict:
        """Get conversion funnel micro-steps"""
        try:
            result = (
                self.supabase.table("view_conversion_microsteps")
                .select("*")
                .eq("user_id", user_id)
                .execute()
            )

            return result.data[0] if result.data else {}

        except Exception as e:
            logger.error(f"Error getting conversion microsteps: {e}")
            return {}

    async def get_personality_insights(
        self, user_id: str
    ) -> dict:
        """Get personality insights analytics"""
        try:
            result = (
                self.supabase.table("view_personality_insights")
                .select("*")
                .eq("user_id", user_id)
                .execute()
            )

            return result.data[0] if result.data else {}

        except Exception as e:
            logger.error(f"Error getting personality insights: {e}")
            return {}

    async def refresh_views(self) -> bool:
        """Refresh all materialized views"""
        try:
            self.supabase.rpc("refresh_all_ki_views", {}).execute()
            logger.info("Refreshed all KI materialized views")
            return True

        except Exception as e:
            logger.error(f"Error refreshing views: {e}")
            return False

    # ========================================================================
    # PLAYBOOK EXECUTION
    # ========================================================================

    async def start_playbook_execution(
        self,
        user_id: str,
        lead_id: str,
        playbook_name: str,
        total_steps: int,
    ) -> dict:
        """Start playbook execution"""
        try:
            data = {
                "lead_id": lead_id,
                "user_id": user_id,
                "playbook_name": playbook_name,
                "total_steps": total_steps,
            }

            result = (
                self.supabase.table("playbook_executions")
                .insert(data)
                .execute()
            )

            logger.info(f"Started {playbook_name} for lead {lead_id}")
            return result.data[0] if result.data else {}

        except Exception as e:
            logger.error(f"Error starting playbook: {e}")
            raise

    async def update_playbook_execution(
        self,
        execution_id: str,
        update_data: dict,
    ) -> dict:
        """Update playbook execution"""
        try:
            if update_data.get("status") == "completed":
                update_data["completed_at"] = datetime.utcnow().isoformat()

            result = (
                self.supabase.table("playbook_executions")
                .update(update_data)
                .eq("id", execution_id)
                .execute()
            )

            return result.data[0] if result.data else {}

        except Exception as e:
            logger.error(f"Error updating playbook: {e}")
            raise

