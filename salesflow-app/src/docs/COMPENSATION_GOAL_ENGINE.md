# Compensation Plan & Goal Engine System

## 🎯 Übersicht

Das **Compensation Plan & Goal Engine System** ermöglicht MLM-Vertriebspartnern, ihre Firma auszuwählen und automatisch Tagesziele basierend auf ihrem Einkommensziel zu berechnen.

### Vision

> "Ich wähle Zinzino, tippe ein: 2.000 € im Monat, 6 Monate Zeit –
> und Sales Flow AI zeigt mir: So viele Credits/Kunden/Partner brauchst du,
> so viele Aktivitäten täglich."

---

## 📁 Dateistruktur

```
src/
├── backend/migrations/
│   └── 011_compensation_plans.sql      # SQL Schema
│
├── types/
│   └── compensation.ts                  # Zod Schemas + Types
│
├── config/compensation/
│   ├── plan.types.ts                    # Plan Interfaces
│   ├── zinzino.plan.ts                  # Zinzino Config
│   ├── pm-international.plan.ts         # PM Config
│   ├── lr-health.plan.ts                # LR Config
│   └── index.ts                         # Registry
│
├── services/
│   ├── compensationService.ts           # Plan Loading & DB Access
│   └── goalEngineService.ts             # Goal Calculation
│
├── hooks/
│   └── useGoalEngine.ts                 # Goal Hook
│
├── screens/main/
│   └── CompanyGoalWizardScreen.tsx      # 3-Step Wizard
│
└── components/goal-wizard/
    ├── StepCompanySelect.tsx            # Step 1
    ├── StepGoalDefine.tsx               # Step 2
    ├── StepPlanSummary.tsx              # Step 3
    ├── GoalProgressCard.tsx             # Dashboard Widget
    └── index.ts                         # Exports
```

---

## 🔄 User Flow

```
┌─────────────────────────────────────────────────────────────────┐
│  STEP 1: Firma wählen                                           │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  Mit welcher Firma arbeitest du?                         │   │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐                 │   │
│  │  │ 🧬       │ │ 💪       │ │ 💄       │                 │   │
│  │  │ Zinzino  │ │ PM-Int.  │ │ LR Health│                 │   │
│  │  └──────────┘ └──────────┘ └──────────┘                 │   │
│  └─────────────────────────────────────────────────────────┘   │
├─────────────────────────────────────────────────────────────────┤
│  STEP 2: Ziel definieren                                        │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  ○ Monatliches Einkommen: [____2.000___] €              │   │
│  │  ○ Ziel-Rang: [Team Leader ▼]                           │   │
│  │                                                          │   │
│  │  Zeitraum: [======●======] 6 Monate                     │   │
│  └─────────────────────────────────────────────────────────┘   │
├─────────────────────────────────────────────────────────────────┤
│  STEP 3: Dein Plan                                              │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  🎯 Um 2.000 €/Monat mit Zinzino zu erreichen:          │   │
│  │                                                          │   │
│  │  Ziel-Rang: Team Leader                                  │   │
│  │  Fehlendes Volumen: 3.000 Credits                        │   │
│  │                                                          │   │
│  │  Das bedeutet ca.:                                       │   │
│  │  • 18 neue Kunden in 6 Monaten                          │   │
│  │  • 4 aktive Partner                                      │   │
│  │                                                          │   │
│  │  Pro Woche:                                              │   │
│  │  • 8 neue Kontakte ansprechen                           │   │
│  │  • 6 Follow-ups                                          │   │
│  │  • 2 Reaktivierungen                                     │   │
│  │                                                          │   │
│  │  [        ✅ In Daily Flow übernehmen        ]          │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

---

## 📊 Goal Engine Flow

```
User Input (2.000 €/Monat, 6 Monate)
         ↓
Find Target Rank (Team Leader)
         ↓
Calculate Missing Volume (3.000 Credits)
         ↓
Estimate Customers/Partners (18/4)
         ↓
Convert to Weekly/Daily Tasks
         ↓
Save to user_daily_flow_targets
         ↓
Daily Flow shows: "8 Kontakte, 6 Follow-ups, 2 Reaktivierungen"
```

---

## 🗃️ Datenbank Schema

### Tabellen

| Tabelle | Beschreibung |
|---------|--------------|
| `user_company_selections` | Welche MLM-Firma nutzt der User? |
| `user_goals` | Einkommensziele oder Rang-Ziele |
| `user_daily_flow_targets` | Berechnete Daily/Weekly Targets |
| `compensation_plan_cache` | Cache für Compensation Plans |

### RPCs

| Funktion | Beschreibung |
|----------|--------------|
| `upsert_user_goal` | Erstellt/aktualisiert ein Ziel |
| `upsert_daily_flow_targets` | Speichert Daily Flow Targets |
| `get_user_daily_targets` | Lädt aktive Targets eines Users |
| `get_active_goal_summary` | Vollständige Ziel-Übersicht |

---

## 🏢 Unterstützte Firmen

| Firma | ID | Plan Type | Einheit |
|-------|----|-----------| --------|
| Zinzino | `zinzino` | Unilevel | Credits |
| PM-International | `pm-international` | Unilevel | Punkte (PV) |
| LR Health & Beauty | `lr-health` | Unilevel | PV |

### Neue Firma hinzufügen

```typescript
// 1. Erstelle src/config/compensation/neue-firma.plan.ts
import { CompensationPlan } from '../../types/compensation';

export const NEUE_FIRMA_PLAN: CompensationPlan = {
  company_id: 'neue-firma',
  company_name: 'Neue Firma',
  company_logo: '🚀',
  region: 'DE',
  plan_type: 'unilevel',
  unit_label: 'Punkte',
  unit_code: 'pv',
  currency: 'EUR',
  
  avg_personal_volume_per_customer: 60,
  avg_personal_volume_per_partner: 100,
  
  ranks: [
    {
      id: 'starter',
      name: 'Starter',
      order: 0,
      unit: 'pv',
      requirements: { min_personal_volume: 0 },
      earning_estimate: { avg_monthly_income: 0 },
    },
    // ... weitere Ränge
  ],
  
  disclaimer: 'Keine Verdienstgarantie.',
};

// 2. Registriere in index.ts
import { NEUE_FIRMA_PLAN } from './neue-firma.plan';

export const COMPENSATION_PLANS = [
  ZINZINO_DE_PLAN,
  PM_INTERNATIONAL_DE_PLAN,
  LR_HEALTH_DE_PLAN,
  NEUE_FIRMA_PLAN,  // NEU
];
```

---

## 🔧 Hook Verwendung

### useGoalEngine

```typescript
import { useGoalEngine } from '@/hooks/useGoalEngine';

function MyComponent() {
  const {
    // Firmen
    companies,
    selectedPlan,
    selectCompany,
    
    // Wizard State
    step,
    setStep,
    canProceed,
    
    // Ziel-Einstellungen
    goalType,
    setGoalType,
    targetIncome,
    setTargetIncome,
    timeframeMonths,
    setTimeframeMonths,
    
    // Ergebnis
    result,
    calculate,
    
    // Speichern
    saveGoal,
    isSaving,
    error,
  } = useGoalEngine();
  
  // Firma auswählen
  selectCompany('zinzino');
  
  // Ziel setzen
  setGoalType('income');
  setTargetIncome(2000);
  setTimeframeMonths(6);
  
  // Berechnen
  calculate();
  
  // Ergebnis anzeigen
  console.log(result?.daily_targets);
  // { weekly: { new_contacts: 8, followups: 6, ... }, daily: { ... } }
  
  // Speichern
  const success = await saveGoal();
}
```

### useActiveGoal

```typescript
import { useActiveGoal } from '@/hooks/useGoalEngine';

function Dashboard() {
  const { goal, targets, isLoading, error } = useActiveGoal();
  
  if (goal) {
    return (
      <GoalProgressCard
        companyName={goal.company_id}
        targetRankName={goal.target_rank_name}
        daysRemaining={goal.days_remaining}
        progressPercent={goal.progress_percent}
        dailyContacts={targets.daily_new_contacts}
        dailyFollowups={targets.daily_followups}
        dailyReactivations={targets.daily_reactivations}
      />
    );
  }
  
  return <GoalProgressCardEmpty onSetGoal={() => navigate('GoalWizard')} />;
}
```

---

## 📱 Navigation einbinden

```typescript
// In AppNavigator.js
import { CompanyGoalWizardScreen } from '@/screens/main/CompanyGoalWizardScreen';

// Im Stack Navigator
<Stack.Screen
  name="GoalWizard"
  component={CompanyGoalWizardScreen}
  options={{
    headerShown: false,
    presentation: 'modal',
  }}
/>

// Aufruf
navigation.navigate('GoalWizard', {
  onComplete: () => {
    // Wird aufgerufen wenn Ziel gespeichert wurde
    refreshDashboard();
  }
});
```

---

## 🧮 Berechnung erklärt

### 1. Ziel-Rang finden

```typescript
// Bei Einkommen → Suche Rang mit passendem avg_monthly_income
const rank = findRankByIncome(plan, 2000);
// → Team Leader (avg: 400€, aber erster Rang ≥ Ziel)

// Bei Rang → Direktauswahl
const rank = findRankById(plan, 'team_leader');
```

### 2. Volumen berechnen

```typescript
const requiredVolume = rank.requirements.min_group_volume; // 2000
const currentVolume = 0; // User hat noch nichts
const missingVolume = 2000 - 0; // = 2000 Credits
```

### 3. Kunden/Partner schätzen

```typescript
// 70% über Kunden, 30% über Partner
const customerVolume = 2000 * 0.7 = 1400;
const partnerVolume = 2000 * 0.3 = 600;

// Bei Ø 60 Credits/Kunde
const customers = Math.ceil(1400 / 60) = 24;

// Bei Ø 100 Credits/Partner  
const partners = Math.ceil(600 / 100) = 6;
```

### 4. Daily Targets berechnen

```typescript
// In 6 Monaten = 26 Wochen
const customersPerWeek = 24 / 26 = 0.9;
const partnersPerWeek = 6 / 26 = 0.2;

// Bei 20% Conversion Rate
const contactsForCustomers = 0.9 / 0.2 = 4.5;
const contactsForPartners = 0.2 / 0.05 = 4;
// → 8-9 Kontakte pro Woche

// Bei 5 Arbeitstagen
const contactsPerDay = 8.5 / 5 = 1.7 ≈ 2;
```

---

## ⚠️ Rechtliche Hinweise

Alle Zahlen sind als **Beispielwerte** gekennzeichnet:

1. **Disclaimer in jedem Plan**:
   ```typescript
   disclaimer: 'Vereinfachte Beispielwerte. Keine Verdienstgarantie.'
   ```

2. **Disclaimer im Wizard** (Step 3):
   ```
   ⚠️ Hinweis: Alle Angaben sind unverbindliche Beispielrechnungen 
   und keine Verdienstgarantie. Dein tatsächliches Einkommen hängt 
   von deiner eigenen Leistung, deinem Team und den offiziellen 
   Richtlinien deiner Firma ab.
   ```

3. **Basiert auf öffentlichen/vereinfachten Daten**

---

## 🚀 Migration ausführen

```sql
-- In Supabase SQL Editor
-- Datei: backend/migrations/011_compensation_plans.sql

-- Prüfen ob erfolgreich:
SELECT * FROM user_goals LIMIT 1;
SELECT * FROM user_daily_flow_targets LIMIT 1;
SELECT * FROM compensation_plan_cache;
```

---

## 📊 Daily Flow Integration

Die berechneten Targets werden in `user_daily_flow_targets` gespeichert und können vom Daily Flow Agent abgerufen werden:

```typescript
// In dailyFlowService.ts
async function getDailyTargets(userId: string) {
  const { data } = await supabase.rpc('get_user_daily_targets', {
    p_user_id: userId
  });
  
  return {
    contacts: data[0].daily_new_contacts,
    followups: data[0].daily_followups,
    reactivations: data[0].daily_reactivations,
  };
}
```

---

## ✅ Zusammenfassung

| Feature | Status |
|---------|--------|
| Multi-Company Support | ✅ |
| Ziel nach Einkommen | ✅ |
| Ziel nach Rang | ✅ |
| Automatische Berechnung | ✅ |
| Speicherung in DB | ✅ |
| Daily Flow Integration | ✅ |
| Rechtlicher Disclaimer | ✅ |
| Dashboard Widget | ✅ |

