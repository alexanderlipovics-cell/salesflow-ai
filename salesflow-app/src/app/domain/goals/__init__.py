"""
╔════════════════════════════════════════════════════════════════════════════╗
║  SALES FLOW AI - GOAL ENGINE DOMAIN                                       ║
║  Multi-Vertical Goal Planning & Daily Flow Integration                    ║
╚════════════════════════════════════════════════════════════════════════════╝

Dieses Modul enthält die gesamte Goal-Engine Logik:

📦 Types (types.py)
   - GoalInput, GoalBreakdown, DailyFlowConfig, DailyFlowTargets
   - KpiDefinition, VerticalId, GoalType

🔌 Vertical Adapter (vertical_adapter.py)
   - VerticalPlanAdapter Protocol
   - BaseVerticalAdapter Abstract Class

🏭 Concrete Adapters (adapters/)
   - MLMAdapter: Network Marketing
   - RealEstateAdapter: Immobilien
   - FinanceAdapter: Finanzvertrieb
   - CoachingAdapter: Coaching & Beratung

📋 Registry (registry.py)
   - VerticalAdapterRegistry
   - get_adapter() Convenience-Funktion

Verwendung:
```python
from app.domain.goals import get_adapter, GoalInput, VerticalId, GoalType

# Adapter für MLM holen
adapter = get_adapter(VerticalId.NETWORK_MARKETING)

# Goal berechnen
goal_input = GoalInput(
    vertical_id=VerticalId.NETWORK_MARKETING,
    goal_type=GoalType.INCOME,
    timeframe_months=6,
    target_value=2000,  # €/Monat
)

breakdown = adapter.compute_goal_breakdown(goal_input)
targets = adapter.compute_daily_flow_targets(breakdown)

print(f"Tägliche Kontakte: {targets.new_contacts}")
print(f"Tägliche Follow-ups: {targets.followups}")
```
"""

# Types
from .types import (
    VerticalId,
    GoalType,
    GoalInput,
    GoalBreakdown,
    DailyFlowConfig,
    DailyFlowTargets,
    KpiDefinition,
    GoalProgress,
    TimeRemaining,
)

# Adapter Interface
from .vertical_adapter import (
    VerticalPlanAdapter,
    BaseVerticalAdapter,
)

# Concrete Adapters
from .adapters import (
    MLMAdapter,
    RealEstateAdapter,
    FinanceAdapter,
    CoachingAdapter,
)

# Registry
from .registry import (
    VerticalAdapterRegistry,
    get_registry,
    get_adapter,
)


__all__ = [
    # Types
    "VerticalId",
    "GoalType",
    "GoalInput",
    "GoalBreakdown",
    "DailyFlowConfig",
    "DailyFlowTargets",
    "KpiDefinition",
    "GoalProgress",
    "TimeRemaining",
    # Adapter Interface
    "VerticalPlanAdapter",
    "BaseVerticalAdapter",
    # Concrete Adapters
    "MLMAdapter",
    "RealEstateAdapter",
    "FinanceAdapter",
    "CoachingAdapter",
    # Registry
    "VerticalAdapterRegistry",
    "get_registry",
    "get_adapter",
]

