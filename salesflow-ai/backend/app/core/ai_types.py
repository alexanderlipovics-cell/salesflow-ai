"""
AI Integration Types & Enums für SalesFlow AI.

Definiert zentrale Typen für Multi-Model-Support, Smart Routing und Monitoring.
"""

from enum import Enum
from typing import Literal, TypedDict, Optional, Dict, Any, List
from datetime import datetime


class AIModelName(str, Enum):
    """Unterstützte AI-Modelle"""
    GPT_4O = "gpt-4o"
    GPT_4O_MINI = "gpt-4o-mini"
    CLAUDE_35_SONNET = "claude-3-5-sonnet-20241022"
    CLAUDE_35_HAIKU = "claude-3-5-haiku-20241022"


class AITaskType(str, Enum):
    """Task-Kategorien für Smart Routing"""
    SALES_COACH_CHAT = "sales_coach_chat"
    FOLLOWUP_GENERATION = "followup_generation"
    TEMPLATE_OPTIMIZATION = "template_optimization"
    SENTIMENT_ANALYSIS = "sentiment_analysis"
    CLASSIFICATION = "classification"
    OBJECTION_HANDLER = "objection_handler"
    LEAD_ANALYSIS = "lead_analysis"
    CLOSING_HELPER = "closing_helper"
    OFFER_CREATE = "offer_create"
    RESEARCH_PERSON = "research_person"
    CALL_SCRIPT = "call_script"
    DAILY_PLAN = "daily_plan"
    SUMMARY_COACHING = "summary_coaching"
    GENERATE_MESSAGE = "generate_message"


class ImportanceLevel(str, Enum):
    """Wichtigkeit für Modellauswahl"""
    LOW = "low"      # Mini reicht
    MEDIUM = "medium"  # 4o empfohlen
    HIGH = "high"    # 4o zwingend


class CostSensitivity(str, Enum):
    """Kostenbewusstsein"""
    LOW = "low"      # Qualität > Kosten
    MEDIUM = "medium"
    HIGH = "high"    # Kosten > Qualität


class AIRequestConfig(TypedDict, total=False):
    """Konfiguration für AI-Request"""
    model: Optional[AIModelName]  # Explizite Modellauswahl (überschreibt Routing)
    temperature: float  # Default: 0.35
    max_tokens: int  # Default: 600
    importance: ImportanceLevel  # Default: MEDIUM
    cost_sensitivity: CostSensitivity  # Default: MEDIUM
    timeout: float  # Default: 30.0
    retry_count: int  # Default: 3
    enable_fallback: bool  # Default: True
    context_max_tokens: Optional[int]  # Trunkierung bei langen Histories


class PromptDefinition(TypedDict, total=False):
    """Versionierte Prompt-Definition"""
    key: str  # z.B. "sales_coach_chat"
    version: str  # z.B. "v1", "v2"
    variant: str  # z.B. "A", "B" für A/B-Testing
    task_type: AITaskType
    default_model: AIModelName
    system_prompt: str
    few_shot_examples: List[Dict[str, str]]  # [{"input": "...", "output": "..."}]
    metadata: Dict[str, Any]  # Zusätzliche Metadaten


class AIRequestResult(TypedDict):
    """Ergebnis eines AI-Requests"""
    text: str
    model_used: AIModelName
    prompt_key: str
    prompt_version: str
    prompt_variant: str
    tokens_prompt: int
    tokens_completion: int
    cost_estimate: float  # USD
    latency_ms: float
    fallback_used: bool
    retry_count: int
    metadata: Dict[str, Any]


__all__ = [
    "AIModelName",
    "AITaskType",
    "ImportanceLevel",
    "CostSensitivity",
    "AIRequestConfig",
    "PromptDefinition",
    "AIRequestResult",
]

