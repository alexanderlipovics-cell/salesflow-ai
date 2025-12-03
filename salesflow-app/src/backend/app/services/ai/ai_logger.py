"""
╔════════════════════════════════════════════════════════════════════════════╗
║  AI LOGGER                                                                 ║
║  Logging Layer for AI Interactions & Analytics                             ║
╚════════════════════════════════════════════════════════════════════════════╝

Tracks:
- Every AI call (skill, model, tokens, latency)
- Request/Response summaries
- Outcome tracking (did user use the response?)
- Cost estimation

Data Flywheel:
- Analyze which skills are most useful
- Track response adoption rates
- Identify improvement opportunities
"""

import logging
import uuid
from typing import Optional, Dict, Any
from datetime import datetime
from dataclasses import dataclass, field, asdict
from enum import Enum

from ...db.supabase import get_supabase

logger = logging.getLogger(__name__)


# ═══════════════════════════════════════════════════════════════════════════════
# ENUMS & TYPES
# ═══════════════════════════════════════════════════════════════════════════════

class OutcomeStatus(str, Enum):
    """Possible outcomes of an AI interaction."""
    UNKNOWN = "unknown"
    IGNORED = "ignored"
    MODIFIED = "modified"
    USED_AS_IS = "used_as_is"
    SENT_TO_LEAD = "sent_to_lead"
    LEAD_REPLIED = "lead_replied"
    MEETING_BOOKED = "meeting_booked"
    DEAL_WON = "deal_won"
    DEAL_LOST = "deal_lost"


# Cost per 1K tokens (approximate, update as needed)
TOKEN_COSTS = {
    "gpt-4o": {"input": 0.0025, "output": 0.01},
    "gpt-4o-mini": {"input": 0.00015, "output": 0.0006},
    "gpt-4-turbo": {"input": 0.01, "output": 0.03},
    "gpt-3.5-turbo": {"input": 0.0005, "output": 0.0015},
    "claude-sonnet-4-20250514": {"input": 0.003, "output": 0.015},
    "claude-3-5-sonnet-20241022": {"input": 0.003, "output": 0.015},
    "claude-3-haiku-20240307": {"input": 0.00025, "output": 0.00125},
}


# ═══════════════════════════════════════════════════════════════════════════════
# DATA CLASSES
# ═══════════════════════════════════════════════════════════════════════════════

@dataclass
class AIInteractionLog:
    """Data structure for logging an AI interaction."""
    
    # Required fields
    skill_name: str
    provider: str
    model: str
    
    # Context
    user_id: Optional[str] = None
    company_id: Optional[str] = None
    lead_id: Optional[str] = None
    session_id: Optional[str] = None
    
    # Version tracking
    skill_version: str = "1.0"
    prompt_version: str = "1.0"
    
    # LLM params
    temperature: Optional[float] = None
    
    # Request/Response
    request_summary: Optional[str] = None
    request_payload: Optional[Dict[str, Any]] = None
    response_summary: Optional[str] = None
    response_payload: Optional[Dict[str, Any]] = None
    
    # Performance
    latency_ms: Optional[int] = None
    tokens_in: Optional[int] = None
    tokens_out: Optional[int] = None
    
    # Outcome (updated later)
    outcome_status: OutcomeStatus = OutcomeStatus.UNKNOWN
    
    # Error tracking
    error_type: Optional[str] = None
    error_message: Optional[str] = None
    
    # Computed fields
    id: str = field(default_factory=lambda: str(uuid.uuid4()))
    created_at: datetime = field(default_factory=datetime.utcnow)
    cost_usd: Optional[float] = None
    metadata: Dict[str, Any] = field(default_factory=dict)
    
    def estimate_cost(self) -> float:
        """Estimate the cost of this interaction."""
        if not self.tokens_in or not self.tokens_out:
            return 0.0
        
        rates = TOKEN_COSTS.get(self.model, {"input": 0.001, "output": 0.002})
        input_cost = (self.tokens_in / 1000) * rates["input"]
        output_cost = (self.tokens_out / 1000) * rates["output"]
        
        return round(input_cost + output_cost, 6)
    
    def to_db_dict(self) -> Dict[str, Any]:
        """Convert to database-ready dictionary."""
        self.cost_usd = self.estimate_cost()
        
        return {
            "id": self.id,
            "user_id": self.user_id,
            "company_id": self.company_id,
            "lead_id": self.lead_id,
            "session_id": self.session_id,
            "skill_name": self.skill_name,
            "skill_version": self.skill_version,
            "prompt_version": self.prompt_version,
            "provider": self.provider,
            "model": self.model,
            "temperature": self.temperature,
            "request_summary": self.request_summary,
            "request_payload": self.request_payload,
            "response_summary": self.response_summary,
            "response_payload": self.response_payload,
            "latency_ms": self.latency_ms,
            "tokens_in": self.tokens_in,
            "tokens_out": self.tokens_out,
            "cost_usd": self.cost_usd,
            "outcome_status": self.outcome_status.value,
            "error_type": self.error_type,
            "error_message": self.error_message,
            "created_at": self.created_at.isoformat(),
            "metadata": self.metadata,
        }


# ═══════════════════════════════════════════════════════════════════════════════
# AI LOGGER
# ═══════════════════════════════════════════════════════════════════════════════

class AILogger:
    """
    Service for logging and tracking AI interactions.
    
    Features:
    - Log AI calls with full context
    - Update outcome status
    - Query analytics
    - Cost tracking
    """
    
    def __init__(self, supabase=None):
        self.db = supabase or get_supabase()
    
    # ─────────────────────────────────────────────────────────────────────────
    # LOGGING
    # ─────────────────────────────────────────────────────────────────────────
    
    async def log(self, interaction: AIInteractionLog) -> str:
        """
        Log an AI interaction to the database.
        
        Args:
            interaction: AIInteractionLog object
            
        Returns:
            Interaction ID
        """
        try:
            data = interaction.to_db_dict()
            result = self.db.table("ai_interactions").insert(data).execute()
            
            logger.debug(
                f"Logged AI interaction: {interaction.skill_name} "
                f"({interaction.latency_ms}ms, {interaction.tokens_in}+{interaction.tokens_out} tokens)"
            )
            
            return interaction.id
            
        except Exception as e:
            logger.error(f"Failed to log AI interaction: {e}")
            # Don't raise - logging should not break the main flow
            return interaction.id
    
    async def log_error(
        self,
        skill_name: str,
        provider: str,
        model: str,
        error: Exception,
        user_id: Optional[str] = None,
        company_id: Optional[str] = None,
        **kwargs
    ) -> str:
        """Log a failed AI interaction."""
        interaction = AIInteractionLog(
            skill_name=skill_name,
            provider=provider,
            model=model,
            user_id=user_id,
            company_id=company_id,
            error_type=type(error).__name__,
            error_message=str(error),
            **kwargs
        )
        
        return await self.log(interaction)
    
    # ─────────────────────────────────────────────────────────────────────────
    # OUTCOME TRACKING
    # ─────────────────────────────────────────────────────────────────────────
    
    async def update_outcome(
        self,
        interaction_id: str,
        outcome: OutcomeStatus,
        user_rating: Optional[int] = None,
        user_feedback: Optional[str] = None,
    ) -> bool:
        """
        Update the outcome of an AI interaction.
        
        Called when we know what happened with the AI response:
        - User used it as-is
        - User modified it
        - User ignored it
        - Lead replied
        - Meeting was booked
        - Deal was won/lost
        """
        try:
            update_data = {
                "outcome_status": outcome.value,
                "outcome_updated_at": datetime.utcnow().isoformat(),
            }
            
            if user_rating is not None:
                update_data["user_rating"] = user_rating
            if user_feedback is not None:
                update_data["user_feedback"] = user_feedback
            
            self.db.table("ai_interactions").update(
                update_data
            ).eq("id", interaction_id).execute()
            
            logger.debug(f"Updated outcome for {interaction_id}: {outcome.value}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to update outcome: {e}")
            return False
    
    async def mark_used(self, interaction_id: str) -> bool:
        """Mark that the user used the AI response."""
        try:
            self.db.table("ai_interactions").update({
                "used_in_message": True,
            }).eq("id", interaction_id).execute()
            return True
        except Exception:
            return False
    
    # ─────────────────────────────────────────────────────────────────────────
    # ANALYTICS
    # ─────────────────────────────────────────────────────────────────────────
    
    async def get_skill_stats(
        self,
        skill_name: str,
        days: int = 30,
    ) -> Dict[str, Any]:
        """Get usage statistics for a skill."""
        from datetime import timedelta
        
        cutoff = (datetime.utcnow() - timedelta(days=days)).isoformat()
        
        result = self.db.table("ai_interactions").select(
            "outcome_status, latency_ms, tokens_in, tokens_out, cost_usd, used_in_message"
        ).eq("skill_name", skill_name).gte("created_at", cutoff).execute()
        
        if not result.data:
            return {"total_calls": 0}
        
        data = result.data
        total = len(data)
        
        # Calculate averages
        latencies = [d["latency_ms"] for d in data if d.get("latency_ms")]
        tokens_in = [d["tokens_in"] for d in data if d.get("tokens_in")]
        tokens_out = [d["tokens_out"] for d in data if d.get("tokens_out")]
        costs = [d["cost_usd"] for d in data if d.get("cost_usd")]
        
        # Outcome distribution
        outcomes = {}
        for d in data:
            status = d.get("outcome_status", "unknown")
            outcomes[status] = outcomes.get(status, 0) + 1
        
        # Usage rate
        used_count = sum(1 for d in data if d.get("used_in_message"))
        
        return {
            "skill_name": skill_name,
            "period_days": days,
            "total_calls": total,
            "avg_latency_ms": sum(latencies) / len(latencies) if latencies else 0,
            "avg_tokens_in": sum(tokens_in) / len(tokens_in) if tokens_in else 0,
            "avg_tokens_out": sum(tokens_out) / len(tokens_out) if tokens_out else 0,
            "total_cost_usd": sum(costs) if costs else 0,
            "usage_rate": used_count / total if total > 0 else 0,
            "outcome_distribution": outcomes,
        }
    
    async def get_user_stats(
        self,
        user_id: str,
        days: int = 30,
    ) -> Dict[str, Any]:
        """Get AI usage statistics for a user."""
        from datetime import timedelta
        
        cutoff = (datetime.utcnow() - timedelta(days=days)).isoformat()
        
        result = self.db.table("ai_interactions").select(
            "skill_name, cost_usd, used_in_message"
        ).eq("user_id", user_id).gte("created_at", cutoff).execute()
        
        if not result.data:
            return {"total_calls": 0}
        
        data = result.data
        
        # Skills breakdown
        skills = {}
        for d in data:
            skill = d.get("skill_name", "unknown")
            skills[skill] = skills.get(skill, 0) + 1
        
        # Cost
        total_cost = sum(d.get("cost_usd", 0) for d in data)
        
        # Usage
        used_count = sum(1 for d in data if d.get("used_in_message"))
        
        return {
            "user_id": user_id,
            "period_days": days,
            "total_calls": len(data),
            "total_cost_usd": total_cost,
            "usage_rate": used_count / len(data) if data else 0,
            "skills_breakdown": skills,
            "most_used_skill": max(skills.items(), key=lambda x: x[1])[0] if skills else None,
        }


# ═══════════════════════════════════════════════════════════════════════════════
# CONVENIENCE FUNCTIONS
# ═══════════════════════════════════════════════════════════════════════════════

_ai_logger: Optional[AILogger] = None


def get_ai_logger() -> AILogger:
    """Get singleton AILogger instance."""
    global _ai_logger
    if _ai_logger is None:
        _ai_logger = AILogger()
    return _ai_logger


async def log_ai_interaction(
    skill_name: str,
    provider: str,
    model: str,
    **kwargs
) -> str:
    """Convenience function to log an AI interaction."""
    logger_instance = get_ai_logger()
    interaction = AIInteractionLog(
        skill_name=skill_name,
        provider=provider,
        model=model,
        **kwargs
    )
    return await logger_instance.log(interaction)

