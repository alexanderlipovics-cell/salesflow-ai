# backend/app/ai/scenarios.py

from __future__ import annotations
from dataclasses import dataclass
from enum import Enum


class ScenarioId(str, Enum):
    FOLLOWUP_SHORT_WHATSAPP = "FOLLOWUP_SHORT_WHATSAPP"
    OBJECTION_PRICE_ANALYSIS = "OBJECTION_PRICE_ANALYSIS"
    LEAD_EXTRACTION_GENERIC = "LEAD_EXTRACTION_GENERIC"


@dataclass(frozen=True)
class ScenarioDefinition:
    id: ScenarioId
    description: str
    max_tokens: int
    latency_sensitivity: float
    cost_sensitivity: float


SCENARIOS: dict[ScenarioId, ScenarioDefinition] = {
    ScenarioId.FOLLOWUP_SHORT_WHATSAPP: ScenarioDefinition(
        id=ScenarioId.FOLLOWUP_SHORT_WHATSAPP,
        description="Kurze Follow-Up Nachricht für WhatsApp.",
        max_tokens=512,
        latency_sensitivity=0.9,
        cost_sensitivity=0.8,
    ),
    ScenarioId.OBJECTION_PRICE_ANALYSIS: ScenarioDefinition(
        id=ScenarioId.OBJECTION_PRICE_ANALYSIS,
        description="Analyse eines Preiseinwands mit Antwort.",
        max_tokens=1024,
        latency_sensitivity=0.6,
        cost_sensitivity=0.5,
    ),
    ScenarioId.LEAD_EXTRACTION_GENERIC: ScenarioDefinition(
        id=ScenarioId.LEAD_EXTRACTION_GENERIC,
        description="Lead-Extraktion aus unstrukturierten Quellen.",
        max_tokens=1024,
        latency_sensitivity=0.7,
        cost_sensitivity=0.7,
    ),
}

