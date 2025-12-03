# 🎯 Daily Flow Agent

> Der Daily Flow Agent ist dein persönlicher Sales-Copilot, der täglich die richtigen Aktionen plant, um deine Monatsziele zu erreichen.

## 📋 Übersicht

Der Daily Flow Agent berechnet basierend auf deinen Zielen und historischen Conversion-Rates, wie viele Kontakte und Follow-ups du täglich brauchst, um deine Abschlussziele zu erreichen.

### Kernfunktionen

1. **Ziel-Engine**: Berechnet tägliche Aktionsmenge basierend auf Monatsziel
2. **Tagesplan-Generator**: Erstellt priorisierte Action-Listen
3. **Fortschritts-Tracking**: Zeigt Tagesfortschritt in Echtzeit
4. **Quick Actions**: Done, Skip, Snooze mit einem Tap

---

## 🗄️ Datenbank-Schema

### Tabellen

```sql
-- User-Konfiguration & Ziele
daily_flow_config
├── target_period (week/month/quarter)
├── target_deals_per_period
├── working_days_per_week
├── max_actions_per_day
├── new_to_followup_ratio
└── manual_contact_to_deal_rate

-- Tagespläne
daily_plans
├── plan_date
├── state (NOT_CONFIGURED, PLANNED, IN_PROGRESS, COMPLETED, BLOCKED)
├── planned_new_contacts
├── planned_followups
├── planned_actions_total
└── actions_done / actions_skipped / actions_snoozed

-- Einzelaktionen
daily_actions
├── action_type (new_contact, followup, reactivation, ...)
├── channel (whatsapp, email, phone, ...)
├── status (pending, in_progress, done, skipped, snoozed)
├── lead_id → leads
├── followup_id → follow_up_tasks
└── source (goal_engine, followup_system, ...)
```

### RPCs

| Funktion | Beschreibung |
|----------|--------------|
| `get_or_create_daily_plan()` | Holt oder erstellt Tagesplan |
| `update_daily_action_status()` | Aktualisiert Action-Status + Plan-Stats |
| `get_conversion_rates()` | Berechnet Conversion-Rates aus Lead-Daten |
| `get_daily_stats()` | Holt Tagesstatistiken |

---

## 🧮 Algorithmus: Tägliche Ziele berechnen

```
1. Ziel: X Abschlüsse pro Monat
2. Conversion Rate: Y% der Kontakte werden zu Abschlüssen
3. Benötigte Kontakte = X / Y
4. Arbeitstage im Monat = Arbeitstage/Woche × 4
5. Kontakte pro Tag = Benötigte Kontakte / Arbeitstage verbleibend
6. Split nach new_to_followup_ratio (z.B. 40% neue, 60% Follow-ups)
7. Constraints: max_actions_per_day
```

### Beispiel

```
Ziel: 10 Abschlüsse/Monat
Conversion: 5%
→ 200 Kontakte benötigt
→ Bei 20 Arbeitstagen: 10 Kontakte/Tag
→ 40% neue = 4 neue Kontakte
→ 60% Follow-ups = 6 Follow-ups
```

---

## 📱 Screens

### DailyFlowScreen

Der Hauptscreen zeigt:
- **Fortschrittsbalken**: Tagesfortschritt in %
- **Goal Summary**: Zielzusammenfassung
- **Offene Actions**: Priorisierte Liste
- **Quick Actions**: Done, Skip, Snooze Buttons
- **Erledigte Actions**: Toggle-Ansicht

### DailyFlowSetupScreen

Konfigurationsscreen für:
- Ziel-Periode (Woche/Monat/Quartal)
- Anzahl Abschlüsse pro Periode
- Arbeitstage pro Woche
- Max. Aktionen pro Tag
- Anteil neue Kontakte vs Follow-ups
- Manuelle Conversion-Rate

---

## 🔌 API / Services

### dailyFlowService.js

```javascript
// Config
getDailyFlowConfig()
saveDailyFlowConfig(config)

// Plan
getDailyPlan(date)
generateDailyPlan(date)

// Actions
completeAction(actionId, notes)
skipAction(actionId, reason)
snoozeAction(actionId, until)
startAction(actionId)

// Stats
getDailyStats(date)
getConversionRates(daysBack)
getPlanHistory(limit)
```

### useDailyFlow Hook

```javascript
const {
  // Config
  config,
  isConfigured,
  saveConfig,
  
  // Plan
  plan,
  planState,
  isCompleted,
  
  // Actions
  actions,
  pendingActions,
  completedActions,
  
  // Stats
  progress,
  actionsRemaining,
  
  // Handlers
  generatePlan,
  completeAction,
  skipAction,
  snoozeAction,
  
  // Loading
  isLoading,
  error,
  refetch,
} = useDailyFlow();
```

---

## 🎨 UI/UX Design

### Farben

| Element | Farbe |
|---------|-------|
| Background | `#020617` (Dark Navy) |
| Cards | `#0f172a` |
| Primary | `#06b6d4` (Cyan) |
| Success | `#10b981` (Emerald) |
| Warning | `#f59e0b` (Amber) |
| Error | `#ef4444` (Red) |

### Action Types

| Typ | Icon | Farbe |
|-----|------|-------|
| Neuer Kontakt | 👋 | Blue |
| Follow-up | 🔄 | Purple |
| Reaktivierung | 🔥 | Amber |
| Pipeline | 🧹 | Slate |
| Admin | 📋 | Slate |

---

## 📊 States

### Plan States

| State | Bedeutung |
|-------|-----------|
| `NOT_CONFIGURED` | User hat keine Ziele definiert |
| `PLANNED` | Plan erstellt, noch nicht begonnen |
| `IN_PROGRESS` | User arbeitet aktiv am Plan |
| `COMPLETED` | >= 80% erledigt |
| `BLOCKED` | Keine Leads verfügbar |

### Action Status

| Status | Bedeutung |
|--------|-----------|
| `pending` | Noch nicht bearbeitet |
| `in_progress` | Gerade in Bearbeitung |
| `done` | Erfolgreich erledigt |
| `skipped` | Übersprungen (mit Grund) |
| `snoozed` | Auf später verschoben |

---

## 🔄 Integration mit anderen Modulen

### Follow-up System
- Follow-ups werden als `followup` Actions eingeplant
- Status-Updates werden synchronisiert

### Leads
- Neue Leads werden als `new_contact` Actions eingeplant
- Lead-Status wird beim Kontakt aktualisiert

### Next Best Actions (zukünftig)
- NBA-Empfehlungen können als Actions importiert werden
- Source: `next_best_actions`

---

## 📝 Migration ausführen

```sql
-- In Supabase SQL Editor ausführen:
\i 009_daily_flow_system.sql
```

Oder manuell über das Supabase Dashboard:
1. SQL Editor öffnen
2. Inhalt von `009_daily_flow_system.sql` einfügen
3. "Run" klicken

---

## ✅ Checkliste

Nach Installation sollte funktionieren:

- [ ] User kann Monatsziel eingeben
- [ ] Tagesplan wird automatisch generiert
- [ ] Actions werden aus Follow-ups + neuen Kontakten erstellt
- [ ] Done/Skip/Snooze funktioniert
- [ ] Progress-Bar zeigt Fortschritt
- [ ] "Tagesziel erreicht" bei >= 80% Done
- [ ] Setup-Screen speichert Config

---

## 🚀 Nächste Schritte

1. **Analytics Dashboard**: Wöchentliche/monatliche Statistiken
2. **Streak System**: Tägliche Erfolgsserien
3. **Notifications**: Push bei Tagesbeginn
4. **AI-Optimierung**: Lernende Conversion-Rates
5. **Team-Ansicht**: Manager sieht Team-Fortschritt

