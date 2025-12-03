# 🔄 Vertical Adapter System

> Full-Stack Branchen-Adapter für Goal-Berechnungen (Python + TypeScript)

## Übersicht

Das Vertical Adapter System ermöglicht branchen-spezifische Goal-Berechnungen:

| Branche | Goal → Breakdown |
|---------|------------------|
| **Network Marketing** | Einkommen → Rang → Volumen → Kunden/Partner |
| **Immobilien** | Provision → Deals → Leads → Kontakte |
| **Coaching** | MRR → Klienten → Discovery Calls |
| **Solar** | Umsatz → Installationen → Leads |

---

## Architektur

```
┌─────────────────────────────────────────────────────────────┐
│                      FRONTEND (TypeScript)                   │
├─────────────────────────────────────────────────────────────┤
│  services/verticalAdapters/                                  │
│    ├── index.ts              ← Registry & Exports           │
│    ├── baseAdapter.ts        ← Abstract Base Class          │
│    └── networkMarketing.ts   ← MLM Adapter                  │
│                                                              │
│  types/verticalAdapter.ts    ← Shared Types (Zod)           │
│  config/compensation/        ← Comp Plans (Zinzino, PM...)  │
└─────────────────────────────────────────────────────────────┘
                           ↕ sync
┌─────────────────────────────────────────────────────────────┐
│                      BACKEND (Python)                        │
├─────────────────────────────────────────────────────────────┤
│  backend/app/domain/goals/                                   │
│    ├── __init__.py                                          │
│    ├── types.py              ← Dataclasses & Enums          │
│    └── vertical_adapter.py   ← Abstract Base Class          │
│                                                              │
│  backend/app/verticals/                                      │
│    ├── __init__.py           ← Registry & get_adapter()     │
│    └── network_marketing/                                    │
│        ├── __init__.py                                       │
│        ├── adapter.py        ← NetworkMarketingAdapter      │
│        └── comp_plans.py     ← Zinzino, PM, LR, Ringana     │
└─────────────────────────────────────────────────────────────┘
```

---

## Verwendung

### TypeScript (Frontend)

```typescript
import { 
  getAdapter, 
  networkMarketingAdapter 
} from '@/services/verticalAdapters';

// 1. Adapter holen
const adapter = getAdapter('network_marketing');

// 2. Goal Breakdown berechnen
const breakdown = adapter.computeGoalBreakdown({
  vertical_id: 'network_marketing',
  goal_kind: 'income',
  target_value: 2000,  // 2.000€/Monat Ziel
  timeframe_months: 6,
  vertical_meta: { comp_plan_id: 'zinzino' }
});

// 3. Daily Flow Targets ableiten
const targets = adapter.computeFlowTargets(breakdown);
console.log(targets.daily);
// → { new_contacts: 8, followups: 5, reactivations: 2 }

// 4. KPIs für Dashboard
const kpis = adapter.getKpiDefinitions();
```

### Python (Backend)

```python
from app.verticals import get_adapter
from app.domain.goals import GoalInput, GoalKind, VerticalId

# 1. Adapter holen
adapter = get_adapter("network_marketing")

# 2. Goal Breakdown berechnen
goal_input = GoalInput(
    vertical_id=VerticalId.NETWORK_MARKETING,
    goal_kind=GoalKind.INCOME,
    target_value=2000,  # 2.000€/Monat
    timeframe_months=6,
    vertical_meta={"comp_plan_id": "zinzino"}
)

breakdown = adapter.compute_goal_breakdown(goal_input)

# 3. Daily Targets berechnen
config = adapter.get_default_conversion_config()
daily = adapter.compute_daily_targets(breakdown, config)
```

---

## Compensation Plans

Aktuell unterstützte MLM-Firmen:

| Firma | Plan ID | Region | Unit |
|-------|---------|--------|------|
| Zinzino | `zinzino` | DE | Credits |
| PM International | `pm_international`, `pm` | DE | PV |
| LR Health & Beauty | `lr_health`, `lr` | DE | VP |
| Ringana | `ringana` | DE | Punkte |

```typescript
// TypeScript
import { getCompensationPlan } from '@/config/compensation';
const plan = getCompensationPlan('zinzino');
```

```python
# Python
from app.verticals.network_marketing import get_compensation_plan
plan = get_compensation_plan("zinzino")
```

---

## Neuen Adapter hinzufügen

### 1. Python Adapter

```python
# backend/app/verticals/real_estate/adapter.py
from app.domain.goals import BaseVerticalAdapter, GoalInput, GoalBreakdown

class RealEstateAdapter(BaseVerticalAdapter):
    @property
    def vertical_id(self) -> str:
        return "real_estate"
    
    def get_label(self) -> str:
        return "Immobilien"
    
    def compute_goal_breakdown(self, goal_input: GoalInput) -> GoalBreakdown:
        # Provision → Deals → Leads Berechnung
        ...
```

### 2. TypeScript Adapter

```typescript
// services/verticalAdapters/realEstate.ts
import { BaseVerticalAdapter } from './baseAdapter';

export class RealEstateAdapter extends BaseVerticalAdapter {
  readonly verticalId = 'real_estate';
  
  getLabel() { return 'Immobilien'; }
  
  computeGoalBreakdown(goalInput: GoalInput): GoalBreakdown {
    // Provision → Deals → Leads Berechnung
    ...
  }
}
```

### 3. Registry eintragen

```typescript
// services/verticalAdapters/index.ts
const VERTICAL_ADAPTERS = {
  network_marketing: networkMarketingAdapter,
  real_estate: realEstateAdapter,  // ← Hinzufügen
};
```

```python
# backend/app/verticals/__init__.py
VERTICAL_ADAPTERS = {
    VerticalId.NETWORK_MARKETING.value: network_marketing_adapter,
    VerticalId.REAL_ESTATE.value: real_estate_adapter,  # ← Hinzufügen
}
```

---

## Type Sync

Die Types sind synchron zwischen Python und TypeScript:

| Python | TypeScript |
|--------|------------|
| `GoalInput` (dataclass) | `GoalInput` (Zod schema) |
| `GoalBreakdown` (dataclass) | `GoalBreakdown` (Zod schema) |
| `GoalKind` (Enum) | `GoalKind` (z.enum) |
| `DailyFlowConfig` | `DailyFlowConversionConfig` |
| `KpiDefinition` | `AdapterKpiDefinition` |

---

## Dateistruktur

```
src/
├── backend/
│   └── app/
│       ├── __init__.py
│       ├── domain/
│       │   ├── __init__.py
│       │   └── goals/
│       │       ├── __init__.py
│       │       ├── types.py
│       │       └── vertical_adapter.py
│       └── verticals/
│           ├── __init__.py
│           └── network_marketing/
│               ├── __init__.py
│               ├── adapter.py
│               └── comp_plans.py
│
├── services/
│   └── verticalAdapters/
│       ├── index.ts
│       ├── baseAdapter.ts
│       └── networkMarketing.ts
│
├── types/
│   ├── index.js
│   ├── verticalAdapter.ts
│   └── compensation.ts
│
└── config/
    └── compensation/
        ├── index.ts
        ├── zinzino.plan.ts
        ├── pm-international.plan.ts
        └── lr-health.plan.ts
```

