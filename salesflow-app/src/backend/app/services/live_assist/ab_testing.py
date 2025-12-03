"""
================================================================================
A/B TESTING FRAMEWORK FÜR LIVE ASSIST
================================================================================

Features:
    - Experiment-basierte Response-Varianten
    - User-Zuordnung zu Test-Gruppen
    - Metriken-Tracking (Response Time, Conversion, Satisfaction)
    - Statistical Significance Berechnung
    
Verwendung:
    experiment = ABExperiment(
        name="tone_test",
        variants=["neutral", "evidence_based", "value_focused"]
    )
    variant = experiment.get_variant(user_id)
    # ... use variant ...
    experiment.record_outcome(user_id, {"helpful": True, "conversion": False})

================================================================================
"""

import os
import hashlib
import random
from datetime import datetime, timedelta
from typing import Dict, Any, List, Optional, Tuple
from dataclasses import dataclass, field
from enum import Enum
import json

try:
    from supabase import Client
    HAS_SUPABASE = True
except ImportError:
    HAS_SUPABASE = False


# =============================================================================
# EXPERIMENT TYPES
# =============================================================================

class ExperimentType(Enum):
    TONE = "tone"               # Ton-Varianten testen
    RESPONSE_LENGTH = "length"  # Kurz vs Lang
    FOLLOW_UP = "follow_up"     # Mit/Ohne Follow-up Frage
    TECHNIQUE = "technique"     # Verschiedene Einwand-Techniken
    CLOSING = "closing"         # Closing-Strategien


@dataclass
class ExperimentVariant:
    """Eine Variante eines Experiments."""
    name: str
    weight: float = 1.0  # Traffic-Gewicht
    config: Dict[str, Any] = field(default_factory=dict)


@dataclass 
class ExperimentResult:
    """Ergebnis eines Experiments für einen User."""
    variant_name: str
    assigned_at: datetime
    outcomes: Dict[str, Any] = field(default_factory=dict)


# =============================================================================
# A/B EXPERIMENT CLASS
# =============================================================================

class ABExperiment:
    """
    Verwaltet ein A/B (oder A/B/C/...) Experiment.
    
    Features:
        - Deterministische User-Zuordnung (gleicher User = gleiche Gruppe)
        - Gewichtete Varianten
        - In-Memory oder Supabase Tracking
    """
    
    def __init__(
        self,
        name: str,
        variants: List[str],
        weights: Optional[List[float]] = None,
        db: Optional['Client'] = None,
        enabled: bool = True
    ):
        self.name = name
        self.enabled = enabled
        self.db = db
        
        # Varianten mit Gewichten erstellen
        if weights is None:
            weights = [1.0] * len(variants)
        
        total_weight = sum(weights)
        self.variants = [
            ExperimentVariant(
                name=v,
                weight=w / total_weight  # Normalisieren
            )
            for v, w in zip(variants, weights)
        ]
        
        # In-Memory Cache für schnelle Lookups
        self._user_assignments: Dict[str, str] = {}
        self._outcomes: Dict[str, List[Dict[str, Any]]] = {}
    
    def get_variant(self, user_id: str, company_id: Optional[str] = None) -> str:
        """
        Gibt die Variante für einen User zurück.
        Deterministisch: gleicher User bekommt immer gleiche Variante.
        
        Args:
            user_id: User ID
            company_id: Optional Company ID für Company-weite Tests
            
        Returns:
            Varianten-Name
        """
        if not self.enabled:
            return self.variants[0].name  # Default = erste Variante
        
        # Cache-Check
        cache_key = f"{user_id}_{company_id or ''}"
        if cache_key in self._user_assignments:
            return self._user_assignments[cache_key]
        
        # Deterministische Zuordnung via Hash
        hash_input = f"{self.name}_{user_id}_{company_id or ''}"
        hash_value = int(hashlib.md5(hash_input.encode()).hexdigest(), 16)
        normalized = (hash_value % 10000) / 10000.0  # 0.0 - 1.0
        
        # Variante basierend auf kumulativen Gewichten wählen
        cumulative = 0.0
        selected = self.variants[0].name
        for variant in self.variants:
            cumulative += variant.weight
            if normalized < cumulative:
                selected = variant.name
                break
        
        # Cache speichern
        self._user_assignments[cache_key] = selected
        
        # Optional in DB speichern
        if self.db:
            self._persist_assignment(user_id, company_id, selected)
        
        return selected
    
    def record_outcome(
        self,
        user_id: str,
        outcome: Dict[str, Any],
        company_id: Optional[str] = None
    ) -> None:
        """
        Zeichnet ein Experiment-Ergebnis auf.
        
        Args:
            user_id: User ID
            outcome: Ergebnis-Daten (z.B. {"helpful": True, "conversion": False})
            company_id: Optional Company ID
        """
        cache_key = f"{user_id}_{company_id or ''}"
        
        if cache_key not in self._outcomes:
            self._outcomes[cache_key] = []
        
        self._outcomes[cache_key].append({
            "timestamp": datetime.now().isoformat(),
            "variant": self._user_assignments.get(cache_key, "unknown"),
            **outcome
        })
        
        # Optional in DB speichern
        if self.db:
            self._persist_outcome(user_id, company_id, outcome)
    
    def get_stats(self) -> Dict[str, Any]:
        """
        Berechnet Experiment-Statistiken.
        
        Returns:
            Dictionary mit Statistiken pro Variante
        """
        stats = {v.name: {
            "users": 0,
            "outcomes": 0,
            "helpful_count": 0,
            "conversion_count": 0,
            "helpful_rate": 0.0,
            "conversion_rate": 0.0
        } for v in self.variants}
        
        # Zähle Zuordnungen
        for cache_key, variant in self._user_assignments.items():
            if variant in stats:
                stats[variant]["users"] += 1
        
        # Zähle Outcomes
        for cache_key, outcomes in self._outcomes.items():
            for outcome in outcomes:
                variant = outcome.get("variant", "unknown")
                if variant in stats:
                    stats[variant]["outcomes"] += 1
                    if outcome.get("helpful"):
                        stats[variant]["helpful_count"] += 1
                    if outcome.get("conversion"):
                        stats[variant]["conversion_count"] += 1
        
        # Berechne Raten
        for variant, data in stats.items():
            if data["outcomes"] > 0:
                data["helpful_rate"] = data["helpful_count"] / data["outcomes"]
                data["conversion_rate"] = data["conversion_count"] / data["outcomes"]
        
        return stats
    
    def _persist_assignment(self, user_id: str, company_id: Optional[str], variant: str) -> None:
        """Speichert Zuordnung in Supabase."""
        try:
            self.db.table("ab_experiment_assignments").upsert({
                "experiment_name": self.name,
                "user_id": user_id,
                "company_id": company_id,
                "variant": variant,
                "assigned_at": datetime.now().isoformat()
            }, on_conflict="experiment_name,user_id").execute()
        except Exception as e:
            print(f"[AB] Assignment persist error: {e}")
    
    def _persist_outcome(self, user_id: str, company_id: Optional[str], outcome: Dict[str, Any]) -> None:
        """Speichert Outcome in Supabase."""
        try:
            self.db.table("ab_experiment_outcomes").insert({
                "experiment_name": self.name,
                "user_id": user_id,
                "company_id": company_id,
                "variant": self._user_assignments.get(f"{user_id}_{company_id or ''}", "unknown"),
                "outcome_data": json.dumps(outcome),
                "created_at": datetime.now().isoformat()
            }).execute()
        except Exception as e:
            print(f"[AB] Outcome persist error: {e}")


# =============================================================================
# VORDEFINIERTE EXPERIMENTE FÜR ZINZINO
# =============================================================================

ZINZINO_EXPERIMENTS = {
    "tone_test": ABExperiment(
        name="zinzino_tone_v1",
        variants=["neutral", "evidence_based", "value_focused"],
        weights=[0.34, 0.33, 0.33],
        enabled=True
    ),
    "response_length": ABExperiment(
        name="zinzino_length_v1",
        variants=["short", "medium", "detailed"],
        weights=[0.34, 0.33, 0.33],
        enabled=True
    ),
    "follow_up_style": ABExperiment(
        name="zinzino_followup_v1",
        variants=["question", "statement", "none"],
        weights=[0.4, 0.4, 0.2],
        enabled=True
    ),
    "objection_technique": ABExperiment(
        name="zinzino_objection_v1",
        variants=["feel_felt_found", "reframe", "agree_and_pivot", "evidence_first"],
        weights=[0.25, 0.25, 0.25, 0.25],
        enabled=True
    ),
}


# =============================================================================
# HELPER FUNCTIONS
# =============================================================================

def get_ab_variant(
    experiment_name: str,
    user_id: str,
    company_id: Optional[str] = None
) -> str:
    """
    Shortcut um eine Variante für ein vordefiniertes Experiment zu bekommen.
    
    Args:
        experiment_name: Name des Experiments (z.B. "tone_test")
        user_id: User ID
        company_id: Optional Company ID
        
    Returns:
        Varianten-Name
    """
    experiment = ZINZINO_EXPERIMENTS.get(experiment_name)
    if not experiment:
        return "control"  # Fallback
    
    return experiment.get_variant(user_id, company_id)


def record_ab_outcome(
    experiment_name: str,
    user_id: str,
    outcome: Dict[str, Any],
    company_id: Optional[str] = None
) -> None:
    """
    Zeichnet ein Outcome für ein vordefiniertes Experiment auf.
    
    Args:
        experiment_name: Name des Experiments
        user_id: User ID
        outcome: Ergebnis-Daten
        company_id: Optional Company ID
    """
    experiment = ZINZINO_EXPERIMENTS.get(experiment_name)
    if experiment:
        experiment.record_outcome(user_id, outcome, company_id)


def get_all_ab_stats() -> Dict[str, Dict[str, Any]]:
    """Gibt Statistiken für alle Experimente zurück."""
    return {
        name: experiment.get_stats()
        for name, experiment in ZINZINO_EXPERIMENTS.items()
    }


# =============================================================================
# STATISTICAL SIGNIFICANCE
# =============================================================================

def calculate_significance(
    control_conversions: int,
    control_total: int,
    variant_conversions: int,
    variant_total: int
) -> Tuple[float, bool]:
    """
    Berechnet statistische Signifikanz (Chi-Square Test).
    
    Args:
        control_conversions: Conversions in Control-Gruppe
        control_total: Gesamt in Control-Gruppe
        variant_conversions: Conversions in Variante
        variant_total: Gesamt in Variante
        
    Returns:
        Tuple von (p-value, is_significant)
    """
    try:
        from scipy.stats import chi2_contingency
        
        # Contingency Table
        observed = [
            [control_conversions, control_total - control_conversions],
            [variant_conversions, variant_total - variant_conversions]
        ]
        
        chi2, p_value, dof, expected = chi2_contingency(observed)
        
        return p_value, p_value < 0.05
        
    except ImportError:
        # Fallback ohne scipy: einfacher Proportionstest
        if control_total == 0 or variant_total == 0:
            return 1.0, False
        
        control_rate = control_conversions / control_total
        variant_rate = variant_conversions / variant_total
        
        # Sehr vereinfachte Heuristik
        diff = abs(control_rate - variant_rate)
        min_sample = min(control_total, variant_total)
        
        # Grobe Schätzung: >10% Diff bei >100 Samples = signifikant
        is_significant = diff > 0.10 and min_sample >= 100
        
        return 0.05 if is_significant else 0.5, is_significant


# =============================================================================
# EXPORTS
# =============================================================================

__all__ = [
    "ABExperiment",
    "ExperimentVariant",
    "ExperimentResult",
    "ExperimentType",
    "ZINZINO_EXPERIMENTS",
    "get_ab_variant",
    "record_ab_outcome",
    "get_all_ab_stats",
    "calculate_significance",
]
