"""
AI Cost Tracking Service - Logs usage and calculates costs for optimization
"""

import logging
from datetime import datetime
from typing import Dict, Any, Optional
from .model_router import ModelTier

logger = logging.getLogger(__name__)

class CostTracker:
    """Tracks AI usage costs for billing and optimization analytics."""

    # Model costs per 1M tokens (in USD)
    MODEL_COSTS = {
        "gpt-4o": {"input": 2.50, "output": 10.00},
        "gpt-4o-mini": {"input": 0.15, "output": 0.60},
        "llama-3-70b": {"input": 0.001, "output": 0.002},  # Future: nearly free
    }

    def __init__(self, supabase_client):
        self.supabase = supabase_client

    def calculate_cost(self, model: str, input_tokens: int, output_tokens: int) -> float:
        """
        Calculate cost in USD for given token usage.

        Args:
            model: Model name (e.g., "gpt-4o", "gpt-4o-mini")
            input_tokens: Number of input tokens
            output_tokens: Number of output tokens

        Returns:
            Cost in USD (float)
        """
        if model not in self.MODEL_COSTS:
            logger.warning(f"Unknown model: {model}, using gpt-4o pricing")
            model = "gpt-4o"

        costs = self.MODEL_COSTS[model]
        input_cost = (input_tokens * costs["input"]) / 1_000_000
        output_cost = (output_tokens * costs["output"]) / 1_000_000

        return input_cost + output_cost

    async def log_usage(
        self,
        user_id: str,
        org_id: Optional[str],
        model: str,
        input_tokens: int,
        output_tokens: int,
        intent: Optional[str] = None,
        session_id: Optional[str] = None,
        tool_calls: Optional[list] = None
    ) -> str:
        """
        Log AI usage for cost tracking and analytics.

        Returns:
            The inserted record ID
        """
        try:
            cost_usd = self.calculate_cost(model, input_tokens, output_tokens)

            now = datetime.now()
            usage_data = {
                "user_id": user_id,
                "org_id": org_id,
                "model": model,
                "input_tokens": input_tokens,
                "output_tokens": output_tokens,
                "total_tokens": input_tokens + output_tokens,
                "cost_usd": cost_usd,
                "intent": intent,
                "session_id": session_id,
                "tool_calls_count": len(tool_calls) if tool_calls else 0,
                "usage_date": now.date().isoformat(),
                "created_at": now.isoformat()
            }

            result = self.supabase.table("ai_usage").upsert(
                usage_data,
                on_conflict="user_id,usage_date"
            ).execute()

            logger.info(
                f"Logged AI usage: {model} | {input_tokens}i + {output_tokens}o tokens | "
                f"€{cost_usd:.6f} | User: {user_id}"
            )

            return result.data[0]["id"] if result.data else None

        except Exception as e:
            logger.error(f"Failed to log AI usage: {e}")
            # Don't fail the main request if logging fails
            return None

    async def get_user_costs(
        self,
        user_id: str,
        days: int = 30
    ) -> Dict[str, Any]:
        """
        Get cost summary for a user over the last N days.
        """
        try:
            # Calculate date range
            start_date = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)
            start_date = start_date.replace(day=start_date.day - days)

            result = self.supabase.table("ai_usage").select(
                "model, input_tokens, output_tokens, cost_usd, intent, created_at"
            ).eq("user_id", user_id).gte("created_at", start_date.isoformat()).execute()

            records = result.data or []

            # Aggregate by model
            model_summary = {}
            total_cost = 0
            total_tokens = 0

            for record in records:
                model = record["model"]
                if model not in model_summary:
                    model_summary[model] = {
                        "cost": 0,
                        "input_tokens": 0,
                        "output_tokens": 0,
                        "calls": 0
                    }

                model_summary[model]["cost"] += record["cost_usd"]
                model_summary[model]["input_tokens"] += record["input_tokens"]
                model_summary[model]["output_tokens"] += record["output_tokens"]
                model_summary[model]["calls"] += 1

                total_cost += record["cost_usd"]
                total_tokens += record["input_tokens"] + record["output_tokens"]

            return {
                "period_days": days,
                "total_cost_usd": total_cost,
                "total_tokens": total_tokens,
                "total_calls": len(records),
                "model_breakdown": model_summary,
                "records": records
            }

        except Exception as e:
            logger.error(f"Failed to get user costs: {e}")
            return {
                "error": str(e),
                "total_cost_usd": 0,
                "total_tokens": 0,
                "total_calls": 0
            }

    async def get_org_costs(
        self,
        org_id: str,
        days: int = 30
    ) -> Dict[str, Any]:
        """
        Get cost summary for an organization over the last N days.
        """
        try:
            start_date = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)
            start_date = start_date.replace(day=start_date.day - days)

            result = self.supabase.table("ai_usage").select(
                "model, input_tokens, output_tokens, cost_usd, user_id, created_at"
            ).eq("org_id", org_id).gte("created_at", start_date.isoformat()).execute()

            records = result.data or []

            # Group by user
            user_costs = {}
            total_cost = 0

            for record in records:
                user_id = record["user_id"]
                if user_id not in user_costs:
                    user_costs[user_id] = 0
                user_costs[user_id] += record["cost_usd"]
                total_cost += record["cost_usd"]

            return {
                "period_days": days,
                "total_cost_usd": total_cost,
                "total_users": len(user_costs),
                "avg_cost_per_user": total_cost / len(user_costs) if user_costs else 0,
                "user_breakdown": user_costs,
                "records_count": len(records)
            }

        except Exception as e:
            logger.error(f"Failed to get org costs: {e}")
            return {"error": str(e), "total_cost_usd": 0}

    def estimate_savings(self, usage_stats: Dict[str, Any]) -> Dict[str, Any]:
        """
        Estimate cost savings if all queries used GPT-4o-mini instead of GPT-4o.
        """
        model_breakdown = usage_stats.get("model_breakdown", {})

        gpt4_cost = model_breakdown.get("gpt-4o", {}).get("cost", 0)
        mini_cost = model_breakdown.get("gpt-4o-mini", {}).get("cost", 0)

        # What it would cost if everything was GPT-4o
        all_gpt4_cost = (gpt4_cost + mini_cost) * (self.MODEL_COSTS["gpt-4o"]["input"] / self.MODEL_COSTS["gpt-4o-mini"]["input"])

        # What it would cost if everything was mini
        all_mini_cost = (gpt4_cost * self.MODEL_COSTS["gpt-4o-mini"]["input"] / self.MODEL_COSTS["gpt-4o"]["input"]) + mini_cost

        return {
            "current_cost": gpt4_cost + mini_cost,
            "all_gpt4_cost": all_gpt4_cost,
            "all_mini_cost": all_mini_cost,
            "potential_savings": all_gpt4_cost - (gpt4_cost + mini_cost),
            "savings_percentage": ((all_gpt4_cost - (gpt4_cost + mini_cost)) / all_gpt4_cost * 100) if all_gpt4_cost > 0 else 0
        }
