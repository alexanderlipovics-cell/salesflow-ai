"""
AI Routing Policies für SalesFlow AI.

Definiert Task-basierte Modellauswahl und Fallback-Strategien.
"""

from typing import Dict, List, Optional
from .ai_types import AIModelName, AITaskType, ImportanceLevel, CostSensitivity


# Task → Modell-Mapping (Default-Policy)
TASK_MODEL_MAPPING: Dict[AITaskType, AIModelName] = {
    # High-Quality Tasks → GPT-4o
    AITaskType.SALES_COACH_CHAT: AIModelName.GPT_4O,
    AITaskType.OBJECTION_HANDLER: AIModelName.GPT_4O,
    AITaskType.CLOSING_HELPER: AIModelName.GPT_4O,
    AITaskType.LEAD_ANALYSIS: AIModelName.GPT_4O,
    AITaskType.OFFER_CREATE: AIModelName.GPT_4O,
    
    # Medium Tasks → GPT-4o (kann auf Mini downgraden bei Cost Sensitivity)
    AITaskType.FOLLOWUP_GENERATION: AIModelName.GPT_4O,
    AITaskType.TEMPLATE_OPTIMIZATION: AIModelName.GPT_4O,
    AITaskType.RESEARCH_PERSON: AIModelName.GPT_4O,
    AITaskType.CALL_SCRIPT: AIModelName.GPT_4O,
    
    # Low-Complexity Tasks → Mini
    AITaskType.SENTIMENT_ANALYSIS: AIModelName.GPT_4O_MINI,
    AITaskType.CLASSIFICATION: AIModelName.GPT_4O_MINI,
    AITaskType.DAILY_PLAN: AIModelName.GPT_4O_MINI,
    AITaskType.GENERATE_MESSAGE: AIModelName.GPT_4O_MINI,
    AITaskType.SUMMARY_COACHING: AIModelName.GPT_4O_MINI,
}

# Fallback-Kaskade
FALLBACK_CASCADE: Dict[AIModelName, List[AIModelName]] = {
    AIModelName.GPT_4O: [
        AIModelName.CLAUDE_35_SONNET,
        AIModelName.GPT_4O_MINI,
    ],
    AIModelName.GPT_4O_MINI: [
        AIModelName.CLAUDE_35_HAIKU,
    ],
    AIModelName.CLAUDE_35_SONNET: [
        AIModelName.GPT_4O_MINI,
    ],
    AIModelName.CLAUDE_35_HAIKU: [
        AIModelName.GPT_4O_MINI,
    ],
}


def select_model(
    task_type: AITaskType,
    importance: ImportanceLevel = ImportanceLevel.MEDIUM,
    cost_sensitivity: CostSensitivity = CostSensitivity.MEDIUM,
    explicit_model: Optional[AIModelName] = None,
) -> AIModelName:
    """
    Wählt Modell basierend auf Task, Importance und Cost Sensitivity.
    
    Args:
        task_type: Task-Kategorie
        importance: Wichtigkeit (LOW/MEDIUM/HIGH)
        cost_sensitivity: Kostenbewusstsein (LOW/MEDIUM/HIGH)
        explicit_model: Explizite Modellauswahl (überschreibt alles)
    
    Returns:
        AIModelName
    """
    if explicit_model:
        return explicit_model
    
    base_model = TASK_MODEL_MAPPING.get(task_type, AIModelName.GPT_4O)
    
    # Cost-Optimierung: Downgrade zu Mini wenn möglich
    if cost_sensitivity == CostSensitivity.HIGH and base_model == AIModelName.GPT_4O:
        # Nur bei LOW Importance downgraden
        if importance == ImportanceLevel.LOW:
            return AIModelName.GPT_4O_MINI
    
    # Quality-First: Upgrade zu 4o wenn HIGH Importance
    if importance == ImportanceLevel.HIGH and base_model == AIModelName.GPT_4O_MINI:
        return AIModelName.GPT_4O
    
    return base_model


def get_fallback_models(primary_model: AIModelName) -> List[AIModelName]:
    """
    Gibt Fallback-Modelle für ein Primary-Modell zurück.
    
    Args:
        primary_model: Primary-Modell
    
    Returns:
        Liste von Fallback-Modellen (in Reihenfolge)
    """
    return FALLBACK_CASCADE.get(primary_model, [])


__all__ = [
    "TASK_MODEL_MAPPING",
    "FALLBACK_CASCADE",
    "select_model",
    "get_fallback_models",
]

