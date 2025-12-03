# Daily Flow Status & Activity Tracking

## 📋 Übersicht

Das **Daily Flow Status & Activity Tracking** System ermöglicht:

1. **Activity Tracking** - Trackt alle Sales-Aktivitäten (Kontakte, Follow-ups, Reaktivierungen)
2. **IST vs. SOLL Vergleich** - Vergleicht aktuelle Aktivitäten mit User-Zielen
3. **Status Dashboard** - Zeigt dem User in menschlicher Sprache, wo er steht
4. **CHIEF AI Integration** - Bereitet Kontext für AI-gestütztes Coaching vor

## 🎯 User Experience

```
┌─────────────────────────────────────────────────────────────────┐
│  🎯 Heute auf Kurs bleiben                     [Auf Kurs ✓]    │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  "Du bist heute auf Kurs – 6/8 neue Kontakte, 5/6 Follow-ups   │
│   und 2/2 Reaktivierungen. Weiter so! 🔥"                      │
│                                                                 │
│  ─────────────────────────────────────────────────────────────  │
│                                                                 │
│  📋 Heute zu erledigen                                          │
│                                                                 │
│  Neue Kontakte         6 / 8     [████████░░] 75%              │
│  Follow-ups            5 / 6     [█████████░] 83%              │
│  Reaktivierungen       2 / 2     [██████████] 100%             │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## 📁 Dateistruktur

```
backend/migrations/
└── 012_activity_tracking.sql         # SQL Schema + RPCs

src/types/
└── activity.js                       # Types & Constants

src/services/
└── activityService.js                # Activity CRUD + Status

src/hooks/
├── useDailyFlowStatus.js            # Status Hook
└── useChiefDailyFlowContext.js      # CHIEF AI Integration

src/screens/main/
└── DailyFlowStatusScreen.js         # Status Dashboard

src/components/daily-flow/
├── DailyFlowStatusCard.js           # Kompakte Dashboard Card
├── DailyProgressBar.js              # Progress Komponente
├── StatusBadge.js                   # Status Indicator
├── WeeklyProgressList.js            # Wochen-Übersicht
├── QuickActivityButtons.js          # Schnell-Aktions-Buttons
└── index.js                         # Component Exports
```

## 🗄️ Datenbank-Schema

### Tables

#### `activity_logs`
Trackt alle Sales-Aktivitäten:
- `id` - UUID Primary Key
- `user_id` - Referenz auf User
- `company_id` - Multi-Company Support
- `lead_id` - Optional: Referenz auf Lead
- `activity_type` - Typ der Aktivität (enum)
- `channel` - Kommunikationskanal
- `title`, `notes` - Details
- `outcome` - Ergebnis
- `occurred_at` - Zeitpunkt der Aktivität

#### `user_daily_flow_targets`
Speichert Ziele pro User:
- `daily_new_contacts` - Tägliche neue Kontakte (default: 8)
- `daily_followups` - Tägliche Follow-ups (default: 6)
- `daily_reactivations` - Tägliche Reaktivierungen (default: 2)
- `weekly_*` - Wöchentliche Aggregate

### Activity Types

```javascript
const ACTIVITY_TYPES = {
  new_contact: 'Neuer Erstkontakt',
  followup: 'Follow-up',
  reactivation: 'Reaktivierung',
  call: 'Telefonat',
  message: 'Nachricht',
  meeting: 'Meeting',
  presentation: 'Präsentation',
  close_won: 'Deal gewonnen',
  close_lost: 'Deal verloren',
  referral: 'Empfehlung',
};
```

### Status Levels

| Level | Beschreibung | Ratio |
|-------|--------------|-------|
| `ahead` | Voraus 🔥 | >= 110% |
| `on_track` | Auf Kurs ✓ | 85-110% |
| `slightly_behind` | Leicht hinten ⚡ | 50-85% |
| `behind` | Aufholen nötig 💪 | < 50% |

## 🔧 RPCs

### `log_activity`
Loggt eine neue Aktivität.

```sql
SELECT log_activity(
  p_user_id := 'user-uuid',
  p_company_id := 'default',
  p_activity_type := 'new_contact',
  p_channel := 'whatsapp',
  p_lead_id := 'lead-uuid',
  p_title := 'Neuer Kontakt',
  p_notes := 'Sehr interessiert'
);
```

### `get_daily_flow_status`
Berechnet den kompletten Daily Flow Status.

```sql
SELECT get_daily_flow_status(
  p_user_id := 'user-uuid',
  p_company_id := 'default',
  p_date := CURRENT_DATE
);
```

Gibt zurück:
```json
{
  "date": "2024-01-15",
  "status_level": "on_track",
  "avg_ratio": 0.86,
  "daily": {
    "new_contacts": { "done": 6, "target": 8, "ratio": 0.75 },
    "followups": { "done": 5, "target": 6, "ratio": 0.83 },
    "reactivations": { "done": 2, "target": 2, "ratio": 1.0 }
  },
  "weekly": { ... }
}
```

## 📱 Frontend-Nutzung

### Hook: `useDailyFlowStatus`

```javascript
import { useDailyFlowStatus } from '../hooks';

function MyComponent() {
  const {
    status,           // Daily Flow Status Object
    summaryMessage,   // Menschliche Summary
    tipMessage,       // Tipp für den User
    isLoading,
    refresh,
    logContact,       // Quick-Log Funktionen
    logFollowUp,
    logReactivate,
  } = useDailyFlowStatus('default');

  return (
    <View>
      <Text>{summaryMessage}</Text>
      <Button onPress={logContact}>+ Kontakt</Button>
    </View>
  );
}
```

### Component: `DailyFlowStatusCard`

Kompakte Dashboard-Card für Übersichten:

```javascript
import { DailyFlowStatusCard } from '../components/daily-flow';

<DailyFlowStatusCard companyId="default" />
```

### Component: `QuickActivityButtons`

Schnell-Aktions-Buttons für Activity Logging:

```javascript
import { QuickActivityButtons } from '../components/daily-flow';

<QuickActivityButtons 
  companyId="default"
  onActivityLogged={(type) => console.log('Logged:', type)}
/>
```

## 🤖 CHIEF AI Integration

### Hook: `useChiefDailyFlowContext`

```javascript
import { 
  useChiefDailyFlowContext,
  formatDailyFlowForChiefPrompt 
} from '../hooks';

function ChiefChat() {
  const chiefContext = useChiefDailyFlowContext('default');
  
  // Füge zum System Prompt hinzu
  const systemPrompt = basePrompt + formatDailyFlowForChiefPrompt(chiefContext);
}
```

### Context-Format für CHIEF

```
<daily_flow_context>
DAILY FLOW STATUS (2024-01-15):
- Status: ON_TRACK
- Tagesziel Fortschritt:
  • Neue Kontakte: 6/8 (75%)
  • Follow-ups: 5/6 (83%)
  • Reaktivierungen: 2/2 (100%)

MÖGLICHE AKTIONEN:
1. Schlage 2 potenzielle neue Kontakte vor...
2. Zeige die 1 wichtigsten offenen Follow-ups...
</daily_flow_context>
```

## 🔄 System Flow

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│  User macht     │     │  Activity Log   │     │  Daily Flow     │
│  Sales-Aktion   │ ──► │  wird erstellt  │ ──► │  Status updated │
│  (Chat, Call)   │     │  (automatisch)  │     │  (real-time)    │
└─────────────────┘     └─────────────────┘     └─────────────────┘
                                                        │
                                                        ▼
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│  CHIEF AI       │ ◄── │  Status wird    │ ◄── │  User sieht     │
│  gibt Tipps     │     │  in Context     │     │  Progress       │
│  basierend auf  │     │  geladen        │     │  Dashboard      │
│  Fortschritt    │     │                 │     │                 │
└─────────────────┘     └─────────────────┘     └─────────────────┘
```

## 📦 Installation

### 1. Migration ausführen

```bash
# In Supabase SQL Editor
\i backend/migrations/012_activity_tracking.sql
```

### 2. Navigation prüfen

Der Screen `DailyFlowStatus` ist bereits in der AppNavigator.js registriert.

### 3. Dashboard integrieren

```javascript
// In DashboardScreen.js
import { DailyFlowStatusCard } from '../components/daily-flow';

<DailyFlowStatusCard companyId="default" />
```

## ✅ Features

- [x] Activity Logging (manuell + automatisch bei Lead-Status-Änderung)
- [x] Tages- und Wochen-Statistiken
- [x] Status Level Berechnung (ahead, on_track, slightly_behind, behind)
- [x] Menschliche Summary-Messages
- [x] Quick-Action Buttons
- [x] Pull-to-Refresh
- [x] CHIEF AI Context Integration
- [x] Kompakte Dashboard Card
- [x] Multi-Company Support

## 🔮 Zukünftige Erweiterungen

- [ ] Activity Details Modal
- [ ] Lead-Auswahl bei Quick-Actions
- [ ] Streak-Tracking
- [ ] Gamification (Badges, Achievements)
- [ ] Team-Vergleiche
- [ ] Push-Notifications bei Zielabweichung

