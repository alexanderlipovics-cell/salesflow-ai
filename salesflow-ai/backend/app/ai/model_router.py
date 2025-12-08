"""
AI Model Router - Routes queries to cheapest capable model for cost optimization
"""

import re
from enum import Enum
from typing import Optional

class ModelTier(Enum):
    MINI = "gpt-4o-mini"      # Simple queries, DB operations, routing
    STANDARD = "gpt-4o"       # Complex content generation, reasoning
    # LLAMA = "llama-3-70b"   # Future: background jobs (nearly free)

class ModelRouter:
    """Routes AI queries to the cheapest capable model."""

    # Tools/functions that require GPT-4o (complex reasoning/content generation)
    COMPLEX_TOOLS = [
        "generate_script",
        "handle_objection",
        "write_message",
        "analyze_lead",
        "get_coaching_tip",
        "generate_sequence",
        "create_content",
        "content_generation"
    ]

    # Tools that work fine with GPT-4o-mini (simple data operations)
    SIMPLE_TOOLS = [
        "query_leads",
        "get_lead_details",
        "create_task",
        "update_lead_status",
        "log_interaction",
        "get_daily_briefing",
        "search_leads",
        "get_performance_stats",
        "get_commission_status",
        "get_churn_risks",
        "get_objection_scripts",
        "get_calendar_events",
        "web_search",
        "search_nearby_places"
    ]

    # Keywords that indicate complex content generation
    COMPLEX_KEYWORDS = [
        "schreib", "schreiben", "formulier", "formulierung",
        "nachricht", "message", "script", "skript",
        "text", "inhalt", "content", "generier",
        "erstelle", "create", "design", "entwurf",
        "hilf", "help", "einwand", "objection",
        "coaching", "beratung", "analyse", "analysis"
    ]

    # Keywords that indicate simple queries
    SIMPLE_KEYWORDS = [
        "zeig", "show", "liste", "list", "finde", "find",
        "suche", "search", "gib", "get", "hole", "fetch",
        "wie viele", "how many", "wann", "when", "wer", "who",
        "was", "what", "wo", "where", "status", "überblick"
    ]

    def route(self, message: str, detected_intent: Optional[str] = None, tool_calls: Optional[list] = None) -> ModelTier:
        """
        Route to cheapest capable model based on message content, intent, and tools used.

        Priority order:
        1. Tool-based routing (most accurate)
        2. Intent-based routing
        3. Keyword-based routing
        4. Default to MINI
        """

        # 1. Check tool calls first (most accurate signal)
        if tool_calls:
            tool_names = [call.get("function", {}).get("name", "") for call in tool_calls]
            if any(tool in self.COMPLEX_TOOLS for tool in tool_names):
                return ModelTier.STANDARD
            if any(tool in self.SIMPLE_TOOLS for tool in tool_names):
                return ModelTier.MINI

        # 2. Intent-based routing
        if detected_intent:
            intent_lower = detected_intent.lower()
            if intent_lower in ["content", "complex", "generation"]:
                return ModelTier.STANDARD
            elif intent_lower in ["query", "action", "simple"]:
                return ModelTier.MINI

        # 3. Keyword-based routing
        message_lower = message.lower()

        # Check for complex keywords
        if any(keyword in message_lower for keyword in self.COMPLEX_KEYWORDS):
            return ModelTier.STANDARD

        # Check for simple keywords
        if any(keyword in message_lower for keyword in self.SIMPLE_KEYWORDS):
            return ModelTier.MINI

        # 4. Length-based heuristic (longer messages often need more reasoning)
        if len(message.split()) > 50:
            return ModelTier.STANDARD

        # 5. Default to MINI for cost optimization
        return ModelTier.MINI

    def estimate_cost(self, model: ModelTier, input_tokens: int, output_tokens: int) -> float:
        """
        Estimate cost in USD for given token usage.
        Costs per 1M tokens.
        """
        MODEL_COSTS = {
            ModelTier.STANDARD: {"input": 2.50, "output": 10.00},  # GPT-4o
            ModelTier.MINI: {"input": 0.15, "output": 0.60},       # GPT-4o-mini
        }

        costs = MODEL_COSTS[model]
        return (input_tokens * costs["input"] + output_tokens * costs["output"]) / 1_000_000

    def get_model_for_intent_detection(self) -> ModelTier:
        """
        Always use MINI for intent detection (fast and cheap).
        """
        return ModelTier.MINI

    def should_fallback_to_standard(self, response_quality: str) -> bool:
        """
        Check if a MINI response needs fallback to STANDARD.
        Useful for implementing quality-based routing.
        """
        # For now, always keep with initial routing
        # Future: analyze response quality and route complex queries to STANDARD
        return False
