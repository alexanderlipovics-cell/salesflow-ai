"""
╔════════════════════════════════════════════════════════════════════════════╗
║  GOAL CALCULATION SERVICE                                                  ║
║  Zentrale Logik für Goal-Berechnung über alle Verticals                   ║
╚════════════════════════════════════════════════════════════════════════════╝
"""

from typing import Dict, Optional, Type

from .types import (
    VerticalId,
    GoalInput,
    GoalBreakdown,
    DailyFlowConfig,
    DailyFlowTargets,
    WeeklyFlowTargets,
    CompensationPlan,
)
from .vertical_adapter import BaseVerticalAdapter
from .adapters.network_marketing import NetworkMarketingAdapter
from .adapters.real_estate import RealEstateAdapter
from .adapters.coaching import CoachingAdapter


class GoalCalculationService:
    """
    Service für Goal-Berechnungen.
    
    Verwendet den passenden Vertical-Adapter basierend auf der vertical_id.
    
    Usage:
        service = GoalCalculationService()
        
        # Mit Compensation Plan (für MLM)
        plan = load_compensation_plan("zinzino")
        service.register_adapter(NetworkMarketingAdapter(plan))
        
        # Berechnung
        breakdown = service.calculate_goal(GoalInput(...))
        targets = service.calculate_daily_targets(breakdown)
    """
    
    def __init__(self):
        self._adapters: Dict[str, BaseVerticalAdapter] = {}
        self._register_default_adapters()
    
    def _register_default_adapters(self):
        """Registriert Standard-Adapter für alle Verticals."""
        self.register_adapter(NetworkMarketingAdapter())
        self.register_adapter(RealEstateAdapter())
        self.register_adapter(CoachingAdapter())
    
    def register_adapter(self, adapter: BaseVerticalAdapter):
        """Registriert einen Vertical-Adapter."""
        self._adapters[adapter.vertical_id] = adapter
    
    def get_adapter(self, vertical_id: str) -> Optional[BaseVerticalAdapter]:
        """Holt den Adapter für ein Vertical."""
        return self._adapters.get(vertical_id)
    
    def get_available_verticals(self) -> list[str]:
        """Liste aller verfügbaren Verticals."""
        return list(self._adapters.keys())
    
    # ═══════════════════════════════════════════════════════════════════════
    # GOAL CALCULATION
    # ═══════════════════════════════════════════════════════════════════════
    
    def calculate_goal(self, goal_input: GoalInput) -> GoalBreakdown:
        """
        Berechnet den Goal-Breakdown.
        
        Args:
            goal_input: Ziel-Definition
            
        Returns:
            GoalBreakdown mit allen berechneten Werten
            
        Raises:
            ValueError: Wenn kein Adapter für das Vertical existiert
        """
        vertical_id = goal_input.vertical_id.value if isinstance(goal_input.vertical_id, VerticalId) else goal_input.vertical_id
        adapter = self._adapters.get(vertical_id)
        
        if not adapter:
            raise ValueError(f"Kein Adapter für Vertical '{vertical_id}' registriert. "
                           f"Verfügbar: {self.get_available_verticals()}")
        
        return adapter.compute_goal_breakdown(goal_input)
    
    def calculate_daily_targets(
        self,
        breakdown: GoalBreakdown,
        config: Optional[DailyFlowConfig] = None,
    ) -> dict:
        """
        Berechnet tägliche/wöchentliche Aktivitäts-Targets.
        
        Args:
            breakdown: Goal-Breakdown
            config: Optional - Conversion-Konfiguration
            
        Returns:
            Dict mit 'daily' und 'weekly' Targets
        """
        vertical_id = breakdown.vertical_id.value if isinstance(breakdown.vertical_id, VerticalId) else breakdown.vertical_id
        adapter = self._adapters.get(vertical_id)
        
        if not adapter:
            raise ValueError(f"Kein Adapter für Vertical '{vertical_id}'")
        
        if config is None:
            config = adapter.get_default_conversion_config()
        
        return adapter.compute_daily_targets(breakdown, config)
    
    def get_kpi_definitions(self, vertical_id: str) -> list:
        """Holt die KPI-Definitionen für ein Vertical."""
        adapter = self._adapters.get(vertical_id)
        if not adapter:
            return []
        return adapter.get_kpi_definitions()
    
    def get_conversion_config(self, vertical_id: str) -> Optional[DailyFlowConfig]:
        """Holt die Default-Conversion-Config für ein Vertical."""
        adapter = self._adapters.get(vertical_id)
        if not adapter:
            return None
        return adapter.get_default_conversion_config()
    
    # ═══════════════════════════════════════════════════════════════════════
    # WITH COMPENSATION PLAN (MLM)
    # ═══════════════════════════════════════════════════════════════════════
    
    def register_mlm_with_plan(self, plan: CompensationPlan):
        """
        Registriert einen MLM-Adapter mit spezifischem Compensation Plan.
        
        Args:
            plan: Compensation Plan (Zinzino, PM, LR, etc.)
        """
        adapter = NetworkMarketingAdapter(compensation_plan=plan)
        self.register_adapter(adapter)


# ═══════════════════════════════════════════════════════════════════════════
# SINGLETON INSTANCE
# ═══════════════════════════════════════════════════════════════════════════

_service_instance: Optional[GoalCalculationService] = None


def get_goal_service() -> GoalCalculationService:
    """
    Holt die Singleton-Instanz des GoalCalculationService.
    
    Usage:
        service = get_goal_service()
        breakdown = service.calculate_goal(...)
    """
    global _service_instance
    if _service_instance is None:
        _service_instance = GoalCalculationService()
    return _service_instance

