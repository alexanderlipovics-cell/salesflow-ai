# 🔄 Sales Flow AI - Workflow & Automatisierungen

## Übersicht der Verbesserungen

Diese Aktualisierung vereinheitlicht und automatisiert den gesamten Daily Flow:

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    UNIFIED DAILY FLOW SYSTEM                            │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌──────────────┐   ┌──────────────┐   ┌──────────────┐                │
│  │   Pending    │ + │  Daily Flow  │ = │   Unified    │                │
│  │   Actions    │   │   Actions    │   │   Actions    │                │
│  │ (Zahlungen,  │   │ (aus Plan)   │   │  (sortiert,  │                │
│  │  Follow-ups) │   │              │   │  priorisiert)│                │
│  └──────────────┘   └──────────────┘   └──────────────┘                │
│         │                  │                   │                        │
│         └────────────┬─────┘                   │                        │
│                      ▼                         │                        │
│              ┌──────────────┐                  │                        │
│              │ CHIEF Context│◄─────────────────┘                        │
│              │ (weiß alles) │                                           │
│              └──────────────┘                                           │
│                      │                                                  │
│         ┌────────────┼────────────┐                                    │
│         ▼            ▼            ▼                                    │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐                                │
│  │ Workflow │ │  Finance │ │ Coaching │                                │
│  │ Coaching │ │ Warnings │ │  Prompts │                                │
│  └──────────┘ └──────────┘ └──────────┘                                │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

## Neue Komponenten

### 1. Backend Services

#### `daily_flow_actions.py`
Vereinheitlicht alle Action-Quellen:
- Pending Actions (aus `lead_pending_actions`)
- Daily Flow Actions (aus `daily_flow_actions`)
- Automatische Priorisierung
- Zeit-Schätzungen

```python
# Nutzung
service = get_daily_flow_actions_service(db)
actions = await service.get_unified_actions(user_id)
summary = await service.get_daily_summary(user_id)
```

#### `workflow_automation.py` (Cron Job)
Automatisierte Hintergrund-Prozesse:

| Job | Zeitpunkt | Funktion |
|-----|-----------|----------|
| `recurring` | 00:05 | Wiederkehrende Buchungen |
| `snooze` | Stündlich | Gesnoozete Actions reaktivieren |
| `payments` | Alle 4h | Zahlungsprüfungs-Reminder |
| `inactive` | 00:05 | Inaktive Leads markieren |
| `daily` | 23:00 | Daily Flow vorbereiten |
| `tax` | Quartalsende | Steuer-Reserve Warnung |

### 2. API Routes

#### `/api/v1/daily-flow/unified-actions`
```json
GET /daily-flow/unified-actions?for_date=2025-12-02

Response:
[
  {
    "id": "uuid",
    "source": "pending_action",
    "action_type": "check_payment",
    "priority": 1,
    "lead_name": "Maria Müller",
    "title": "💰 Zahlung prüfen: Maria Müller",
    "is_urgent": true,
    "is_overdue": false
  },
  ...
]
```

#### `/api/v1/daily-flow/summary`
```json
GET /daily-flow/summary

Response:
{
  "date": "2025-12-02",
  "total_actions": 15,
  "completed_actions": 3,
  "completion_rate": 20.0,
  "payment_checks": 2,
  "follow_ups": 8,
  "overdue_count": 1,
  "urgent_count": 3,
  "estimated_time_minutes": 95
}
```

### 3. Frontend

#### `useUnifiedActions` Hook
```javascript
const {
  actions,           // Alle Actions
  urgentActions,     // Nur dringende
  paymentChecks,     // Nur Zahlungen
  summary,           // Tages-Summary
  
  complete,          // Action abschließen
  snooze,            // Verschieben
  snoozeTomorrow,    // Auf morgen
  
  isLoading,
  refresh,
} = useUnifiedActions();
```

#### `UrgentActionsWidget`
Widget für Dashboard:
- Zeigt dringende Actions prominent
- Rot markiert überfällige
- Quick-Actions (Tap → Lead öffnen)

#### `PaymentChecksWidget`
Spezial-Widget für Zahlungsprüfungen:
- Anzahl offener Prüfungen
- Geschätzte Summe
- Quick-Access zu Leads

### 4. CHIEF Integration

#### Erweiterter Context
CHIEF kennt jetzt:
- Pending Actions (Anzahl, Typen, Top 3)
- Finance Summary (Profit, Reserve, fehlende Belege)
- Workflow-Status (überfällig, dringend)

#### Proaktives Coaching
```
User: "Was muss ich heute machen?"

CHIEF: "Dein nächster Move: Prüf die Zahlung von Maria – sie hat 
vor 3 Tagen bestellt. 💰

Wenn bezahlt → als Kunde markieren, Welcome-Nachricht senden.
Wenn nicht → freundlich nachhaken.

Danach hast du noch 2 Follow-ups und 5 neue Kontakte für heute."
```

## Priorisierungs-Logik

```
1. 💰 Zahlungsprüfungen (Geld wartet!)
   └─ priority: 1
   
2. ⏰ Überfällige Actions
   └─ is_overdue: true
   
3. 🔥 Heiße Leads (deal_state)
   └─ 'pending_payment' > 'negotiating' > 'interested'
   
4. 📱 Follow-ups nach Alter
   └─ Älteste zuerst
   
5. 👋 Neue Kontakte
   └─ Aus Daily Flow Plan
```

## Zeit-Schätzungen

| Action Type | Geschätzte Minuten |
|-------------|-------------------|
| check_payment | 5 |
| follow_up | 8 |
| call | 15 |
| send_info | 5 |
| new_contact | 10 |
| reactivation | 8 |
| close | 20 |

## Installation

### 1. Backend
```bash
# Neue Routen sind automatisch registriert via main.py
uvicorn backend.app.main:app --reload
```

### 2. Cronjobs
Siehe `backend/cron/CRON_SETUP.md`

### 3. Frontend
```javascript
// In App.js oder Navigation
import { useUnifiedActions } from './hooks/useUnifiedActions';
import { UrgentActionsWidget } from './components/workflow';
```

## Testing

```bash
# Backend
python -m app.jobs.workflow_automation all

# API
curl http://localhost:8000/api/v1/daily-flow/summary

# Frontend
# → DailyFlowScreen öffnen, Unified Actions sollten erscheinen
```

## Nächste Schritte

- [ ] Drag & Drop Reihenfolge für Actions
- [ ] Bulk-Completion (mehrere auf einmal)
- [ ] Zeitblock-Scheduling ("Focus Mode")
- [ ] Team-Ansicht für Leader
- [ ] Automatische Eskalation bei überfälligen Actions

