# 🏢 VERTICAL SYSTEM - Multi-Branche Support

## 📋 Übersicht

Das **Vertical System** ermöglicht Sales Flow AI, verschiedene Branchen zu unterstützen:

- 🌐 **Network Marketing** - MLM, Direktvertrieb & Teamaufbau
- 🏠 **Immobilien** - Makler, Vermittlung & Investments
- 💼 **Coaching** - Business & Life Coaching
- 💰 **Finanzvertrieb** - Beratung, Investments & Vorsorge
- 🛡️ **Versicherung** - Vermittlung & Maklertätigkeit
- ☀️ **Solar** - Photovoltaik & Energielösungen

## 🎯 Features pro Vertical

| Feature | NWM | Immo | Coach | Finanz | Vers. | Solar |
|---------|-----|------|-------|--------|-------|-------|
| Compensation Plan | ✅ | ❌ | ❌ | ✅ | ❌ | ❌ |
| Team-Struktur | ✅ | ❌ | ❌ | ✅ | ❌ | ❌ |
| Lead Scoring | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Objection Brain | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Daily Flow | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |

## 📁 Dateistruktur

```
config/verticals/
├── types.ts              # Type-Definitionen
├── definitions.ts        # Vertical-Konfigurationen
└── index.ts              # Exports & Helpers

backend/migrations/
└── 013_vertical_system.sql   # DB Schema

services/
└── verticalService.js    # API Service

hooks/
└── useVertical.js        # React Hook

components/
└── VerticalSelector.js   # UI Komponenten

prompts/
└── objection-vertical-prompts.js  # Branchenspezifische Prompts
```

## 🗄️ Datenbank-Schema

### `user_vertical_settings`

```sql
CREATE TABLE user_vertical_settings (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  
  vertical_id vertical_type NOT NULL,
  company_id TEXT,                      -- Für NWM/Finance
  
  custom_label TEXT,                    -- Für "custom"
  custom_daily_contacts INTEGER,        -- Überschreibt Defaults
  custom_daily_followups INTEGER,
  custom_daily_reactivations INTEGER,
  
  enable_lead_scoring BOOLEAN,          -- Feature Flags
  enable_team_dashboard BOOLEAN,
  
  onboarding_completed BOOLEAN,
  is_active BOOLEAN
);
```

## 📱 Frontend-Nutzung

### Hook: `useVertical`

```javascript
import { useVertical } from '../hooks';

function MyComponent() {
  const {
    vertical,              // Aktuelle Vertical-Config
    verticalId,            // z.B. 'real_estate'
    dailyFlowTargets,      // { newContacts, followups, reactivations }
    features,              // Feature-Flags
    
    selectVertical,        // Vertical wechseln
    updateDailyFlow,       // Targets anpassen
    needsOnboarding,       // Onboarding nötig?
  } = useVertical();

  return (
    <View>
      <Text>{vertical.icon} {vertical.label}</Text>
    </View>
  );
}
```

### Component: `VerticalSelector`

```javascript
import VerticalSelector from '../components/VerticalSelector';

// Im Dashboard
<VerticalSelector />

// Oder einzelne Teile:
<VerticalBadge vertical={vertical} />
<VerticalOnboardingCard onSelect={handleSelect} />
```

## 🤖 Objection Brain Integration

### Vertical-spezifische Prompts

```javascript
import { getObjectionSystemPrompt, buildObjectionPrompt } from '../prompts';

// System-Prompt für Immobilien
const systemPrompt = getObjectionSystemPrompt('real_estate');

// Vollständiger Prompt für Einwandbehandlung
const prompt = buildObjectionPrompt(
  'real_estate',
  'Die Provision ist mir zu hoch',
  'phone'
);
```

### Typische Einwände pro Branche

**Network Marketing:**
- "Das ist doch Pyramide"
- "Ich kenne niemanden"

**Immobilien:**
- "Die Provision ist zu hoch"
- "Ich verkaufe lieber privat"

**Coaching:**
- "Was ist der ROI?"
- "Ich schaffe das alleine"

**Finanzvertrieb:**
- "Das ist mir zu riskant"
- "Mein Bankberater sagt..."

## 🔧 Neues Vertical hinzufügen

### 1. Definition erweitern

```typescript
// config/verticals/definitions.ts
export const MY_NEW_VERTICAL: VerticalConfig = {
  id: 'my_new',
  label: 'Meine Branche',
  icon: '🆕',
  color: '#...',
  // ... alle anderen Felder
};
```

### 2. Enum erweitern

```sql
-- Migration
ALTER TYPE vertical_type ADD VALUE 'my_new';
```

### 3. Objection Prompts hinzufügen

```javascript
// prompts/objection-vertical-prompts.js
VERTICAL_OBJECTION_PROMPTS.my_new = {
  systemContext: `...`,
  exampleObjections: [...],
};
```

## 🚀 Setup

### 1. Migration ausführen

```sql
-- backend/migrations/013_vertical_system.sql
```

### 2. Dashboard integrieren

```javascript
// In DashboardScreen.js
import { VerticalBadge } from '../components/VerticalSelector';
import { useVertical } from '../hooks';

const { vertical, needsOnboarding } = useVertical();

// Im Header
<VerticalBadge vertical={vertical} onPress={openSelector} />

// Bei Erstnutzung
{needsOnboarding && <VerticalOnboardingCard onSelect={selectVertical} />}
```

## ✅ Checkliste

- [x] Vertical Types & Definitionen
- [x] SQL Migration
- [x] Vertical Service
- [x] useVertical Hook
- [x] VerticalSelector Component
- [x] Objection Brain Prompts
- [ ] Dashboard Integration (manuell)
- [ ] Onboarding Flow
- [ ] Compensation Plan Integration (für NWM/Finance)

## 📊 KPIs pro Vertical

| Vertical | Primärer KPI | Weitere KPIs |
|----------|--------------|--------------|
| Network Marketing | Team-Volumen | Kunden, Partner, Rang |
| Immobilien | Abschlüsse | Objekte, Besichtigungen |
| Coaching | Klienten | Discovery Calls, MRR |
| Finanzvertrieb | Verträge | Volumen, Provision |
| Versicherung | Policen | Prämienvolumen |
| Solar | Installationen | kWp, Umsatz |

