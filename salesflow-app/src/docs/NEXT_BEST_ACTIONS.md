# 🎯 Sales Flow AI - Next Best Actions

> **Technische Dokumentation** | Version 1.0  
> KI-priorisierte Aufgaben für maximale Sales-Effizienz

---

## 📑 Inhaltsverzeichnis

1. [Überblick](#-überblick)
2. [Architektur](#-architektur)
3. [Frontend: NextBestActionsScreen](#-frontend-nextbestactionsscreen)
4. [Konfiguration](#-konfiguration)
5. [Datenmodell](#-datenmodell)
6. [UI-Komponenten](#-ui-komponenten)
7. [Nutzung & Beispiele](#-nutzung--beispiele)

---

## 🎯 Überblick

Das **Next Best Actions** Modul zeigt KI-priorisierte Verkaufsaktionen:

- ✅ **Prioritäts-Ranking**: Urgent, High, Medium, Low
- ✅ **Kategorisiert**: Closing, Engagement, Nurturing, Qualification
- ✅ **Script-Vorschläge**: Fertige Nachrichten für jede Aktion
- ✅ **Zeit-Schätzung**: Geschätzter Zeitaufwand pro Aktion
- ✅ **Tages-Ziel**: Fortschrittsanzeige

### Kernfunktion
Der KI-Algorithmus analysiert Leads, BANT-Scores und Aktivitäten, um die optimale Reihenfolge der Verkaufsaktionen zu empfehlen.

---

## 🏗 Architektur

```
┌─────────────────────────────────────────────────────────────────┐
│                  FRONTEND (React Native)                         │
├─────────────────────────────────────────────────────────────────┤
│  NextBestActionsScreen.js                                        │
│  - Priorisierte Action-Liste                                     │
│  - Expandierbare Karten mit Scripts                              │
│  - Erledigt-Markierung                                           │
│  - Tages-Ziel Fortschritt                                        │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼ (Geplant: API Integration)
┌─────────────────────────────────────────────────────────────────┐
│                    KI-RECOMMENDATION ENGINE                      │
├─────────────────────────────────────────────────────────────────┤
│  - Lead-Score Analyse                                            │
│  - BANT-Qualifizierung                                           │
│  - Letzte Aktivitäten                                            │
│  - Persönlichkeitstyp (DISG)                                     │
│  → Priorisierte Aktions-Empfehlungen                             │
└─────────────────────────────────────────────────────────────────┘
```

---

## 📱 Frontend: NextBestActionsScreen

**Datei:** `src/screens/main/NextBestActionsScreen.js`

### Beschreibung
React Native Screen zur Anzeige und Verwaltung KI-priorisierter Verkaufsaktionen.

### State Management

| State | Typ | Beschreibung |
|-------|-----|--------------|
| `actions` | `Array` | Liste aller Actions |
| `loading` | `Boolean` | Ladezustand |
| `refreshing` | `Boolean` | Pull-to-Refresh aktiv |
| `expandedId` | `String` | ID der aufgeklappten Karte |
| `completedIds` | `Array` | IDs erledigter Actions |

### Hauptfunktionen

```javascript
// Pull-to-Refresh
const onRefresh = async () => {
  setRefreshing(true);
  // TODO: Fetch from AI recommendation engine
  await new Promise(resolve => setTimeout(resolve, 1500));
  setRefreshing(false);
};

// Action als erledigt markieren
const markComplete = (id) => {
  setCompletedIds(prev => [...prev, id]);
};

// Aktive/Erledigte Actions filtern
const activeActions = actions.filter(a => !completedIds.includes(a.id));
const completedActions = actions.filter(a => completedIds.includes(a.id));
```

---

## ⚙️ Konfiguration

### Prioritäts-Levels

```javascript
const getPriorityConfig = (priority) => {
  switch (priority) {
    case 'urgent': return { 
      color: '#ef4444',  // Rot
      bg: '#fef2f2', 
      label: '🔥 URGENT', 
      icon: '🔴' 
    };
    case 'high': return { 
      color: '#f59e0b',  // Orange
      bg: '#fffbeb', 
      label: '⚡ HIGH', 
      icon: '🟡' 
    };
    case 'medium': return { 
      color: '#3b82f6',  // Blau
      bg: '#eff6ff', 
      label: '📌 MEDIUM', 
      icon: '🔵' 
    };
    default: return { 
      color: '#10b981',  // Grün
      bg: '#f0fdf4', 
      label: '📋 LOW', 
      icon: '🟢' 
    };
  }
};
```

### Kategorien

```javascript
const getCategoryIcon = (category) => {
  switch (category) {
    case 'closing': return '🎯';      // Abschluss-Aktionen
    case 'engagement': return '💬';   // Engagement-Aktionen
    case 'nurturing': return '🌱';    // Pflege-Aktionen
    case 'qualification': return '🔍'; // Qualifizierungs-Aktionen
    default: return '📌';
  }
};
```

### Sample Actions (Demo-Daten)

```javascript
const SAMPLE_ACTIONS = [
  {
    id: '1',
    lead_name: 'Thomas Weber',
    action: 'Follow-up Call vereinbaren',
    priority: 'urgent',
    reasoning: 'Enterprise-Lead mit 85er BANT Score wartet auf Angebot.',
    category: 'closing',
    expected_impact: 'high',
    estimated_time: '15 Min',
    suggested_script: 'Hey Thomas, ich wollte kurz nachfragen...'
  },
  // ... weitere Actions
];
```

---

## 📊 Datenmodell

### Action Object

```typescript
interface NextBestAction {
  id: string;
  lead_name: string;          // Name des Leads
  action: string;             // Aktions-Beschreibung
  priority: 'urgent' | 'high' | 'medium' | 'low';
  reasoning: string;          // KI-Begründung für Priorität
  category: 'closing' | 'engagement' | 'nurturing' | 'qualification';
  expected_impact: 'high' | 'medium' | 'low';
  estimated_time: string;     // z.B. "15 Min"
  suggested_script: string;   // Vorgeschlagener Text/Script
}
```

### Priority-Logik

| Priorität | Kriterien |
|-----------|-----------|
| **Urgent** | BANT-Score > 80, Budget bestätigt, Timeline diese Woche |
| **High** | BANT-Score 60-80, Qualifiziert, Persönlichkeitstyp D |
| **Medium** | BANT-Score 40-60, Kontaktiert, Nurturing nötig |
| **Low** | BANT-Score < 40, Neue Leads, Qualifizierung nötig |

### Kategorien erklärt

| Kategorie | Beschreibung | Typische Aktionen |
|-----------|--------------|-------------------|
| **Closing** | Abschluss-nah | Follow-up Call, Angebot besprechen |
| **Engagement** | Interaktion stärken | Video senden, Demo anbieten |
| **Nurturing** | Beziehung pflegen | Content teilen, Check-in |
| **Qualification** | Qualifizieren | BANT-Fragen, Discovery Call |

---

## 🎨 UI-Komponenten

### Stats Bar

```
┌──────────────────────────────────────────┐
│   4        │    1       │    2          │
│  Offen     │  Erledigt  │   Urgent      │
└──────────────────────────────────────────┘
```

### Action Card (Collapsed)

```
┌──────────────────────────────────────────┐
│ [🔥 URGENT]                  ⏱️ 15 Min   │
│                                          │
│ 🎯  Thomas Weber                         │
│     Follow-up Call vereinbaren           │
│                                          │
│ 💡 Enterprise-Lead mit 85er BANT Score...│
└──────────────────────────────────────────┘
```

### Action Card (Expanded)

```
┌──────────────────────────────────────────┐
│ [🔥 URGENT]                  ⏱️ 15 Min   │
│                                          │
│ 🎯  Thomas Weber                         │
│     Follow-up Call vereinbaren           │
│                                          │
│ 💡 Enterprise-Lead mit 85er BANT Score...│
├──────────────────────────────────────────┤
│ 📝 Vorgeschlagenes Script:               │
│ ┌────────────────────────────────────┐   │
│ │ "Hey Thomas, ich wollte kurz      │   │
│ │ nachfragen, ob du die Chance..."   │   │
│ └────────────────────────────────────┘   │
│                                          │
│ [✅ Erledigt] [📋 Kopieren] [🚀 Starten] │
└──────────────────────────────────────────┘
```

### Completed Card

```
┌──────────────────────────────────────────┐
│ ✓  Thomas Weber                          │
│    ̶F̶o̶l̶l̶o̶w̶-̶u̶p̶ ̶C̶a̶l̶l̶ ̶v̶e̶r̶e̶i̶n̶b̶a̶r̶e̶n̶             │
└──────────────────────────────────────────┘
```

### Goal Card

```
┌──────────────────────────────────────────┐
│ 🏆  Tages-Ziel                           │
│     1 / 4 Actions erledigt               │
│     [████░░░░░░░░░░░░░] 25%              │
└──────────────────────────────────────────┘
```

---

## 🚀 Nutzung & Beispiele

### 1. Actions durcharbeiten

1. Öffne den Next Best Actions Screen
2. Starte mit der obersten Action (höchste Priorität)
3. Tippe auf die Karte um das Script zu sehen
4. Nutze "📋 Kopieren" für das Script
5. Führe die Aktion aus
6. Tippe "✅ Erledigt" um fortzufahren

### 2. Tages-Workflow

```
┌────────────────────────────────────────────────┐
│ MORGEN (9:00)                                  │
│ → Next Best Actions öffnen                     │
│ → Urgent Actions zuerst (Closing)              │
├────────────────────────────────────────────────┤
│ MITTAG (12:00)                                 │
│ → High Priority Actions (Engagement)           │
├────────────────────────────────────────────────┤
│ NACHMITTAG (15:00)                             │
│ → Medium Priority (Nurturing)                  │
├────────────────────────────────────────────────┤
│ ABEND (17:00)                                  │
│ → Low Priority (Qualification für morgen)      │
│ → ✨ KI-Empfehlungen neu laden                 │
└────────────────────────────────────────────────┘
```

### 3. Script nutzen

**Beispiel: Follow-up Call Script**

```
Lead: Thomas Weber
Priorität: Urgent
Kategorie: Closing

Script:
"Hey Thomas, ich wollte kurz nachfragen, ob du 
die Chance hattest, das Angebot durchzugehen. 
Wann passt dir ein kurzer Call diese Woche?"

→ [📋 Kopieren] um in WhatsApp einzufügen
→ [🚀 Starten] um direkt anzurufen (geplant)
```

---

## 🎨 Styling

### Farben

| Element | Farbe | Hex |
|---------|-------|-----|
| Header | Orange | `#f59e0b` |
| Urgent | Rot | `#ef4444` |
| High | Orange | `#f59e0b` |
| Medium | Blau | `#3b82f6` |
| Low | Grün | `#10b981` |
| Erledigt | Grün | `#22c55e` |
| Progress Bar | Orange | `#f59e0b` |

### Card Styling

```javascript
actionCard: { 
  backgroundColor: 'white', 
  borderRadius: 16, 
  padding: 16, 
  marginBottom: 12,
  borderLeftWidth: 4,  // Farbiger Indikator
  shadowColor: '#000',
  shadowOpacity: 0.05,
  shadowRadius: 8,
  elevation: 2
}
```

---

## 🔮 Geplante Features

### KI-Recommendation Engine Integration

```javascript
// Geplant: Fetch von KI-Engine
const fetchRecommendations = async () => {
  const response = await fetch(`${API_URL}/api/next-best-actions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      user_id: user?.id,
      leads: leads,  // Aktuelle Leads
      context: {
        time_of_day: 'morning',
        available_time: 60  // Minuten
      }
    })
  });
  
  return await response.json();
};
```

### Action Buttons Funktionalität

- **✅ Erledigt**: Action als abgeschlossen markieren
- **📋 Kopieren**: Script in Zwischenablage kopieren
- **🚀 Starten**: Deep-Link zu WhatsApp/Telefon/E-Mail

---

## 📚 Abhängigkeiten

- `react-native` – UI Framework
- Sample Data (aktuell)
- Geplant: Backend API für KI-Empfehlungen

---

## 🔧 Extending this Module

### Priorisierungslogik (Scoring-Formel)

```typescript
function calculatePriority(lead: Lead): number {
  const urgency = getUrgencyScore(lead.last_contact_at);      // 0-30
  const dealValue = getDealValueScore(lead.potential_value);  // 0-25
  const relationship = getRelationshipScore(lead.interactions); // 0-25
  const penalty = getLastContactPenalty(lead.last_contact_at); // 0-20
  
  return urgency + dealValue + relationship - penalty;
}

// Score → Priority Mapping
function getPriorityFromScore(score: number): Priority {
  if (score >= 80) return 'urgent';
  if (score >= 60) return 'high';
  if (score >= 40) return 'medium';
  return 'low';
}
```

### Neue Kategorie/Aktion hinzufügen

1. **Action-Typ definieren**:

```typescript
type ActionType = 
  | 'follow_up' 
  | 'send_info' 
  | 'schedule_call' 
  | 'webinar_invite'  // NEU
  | 'cross_sell';      // NEU

const ACTION_CONFIG = {
  webinar_invite: {
    icon: '🎥',
    label: 'Webinar einladen',
    defaultTime: '10 Min'
  },
  cross_sell: {
    icon: '💎',
    label: 'Cross-Sell Angebot',
    defaultTime: '15 Min'
  }
};
```

2. **Trigger-Bedingungen festlegen**:

```typescript
const triggers: ActionTrigger[] = [
  { 
    action: 'webinar_invite', 
    condition: (lead) => lead.status === 'interested' && !lead.webinar_attended 
  },
  { 
    action: 'cross_sell', 
    condition: (lead) => lead.status === 'won' && lead.products_count < 2 
  }
];
```

### Edge Cases

| Fall | Verhalten |
|------|-----------|
| Zu wenig Daten | Fallback auf `follow_up` mit Standard-Priorität |
| Alle Actions erledigt | `check_in` nach 7 Tagen |
| Lead dormant | `reactivation` Sequenz starten |
| Keine Leads | Empty State anzeigen |

### KI-Integration (geplant)

```python
# Backend: AI-basierte Empfehlungen
@router.post("/api/next-best-actions/generate")
async def generate_actions(
    leads: List[Lead],
    user_context: dict
) -> List[NextBestAction]:
    prompt = f"""
    Analysiere diese Leads und priorisiere Aktionen:
    {leads}
    
    User-Kontext: {user_context}
    """
    
    response = await ai_service.chat(prompt)
    return parse_actions(response)
```

### Checkliste

- [ ] Neuen ActionType definiert
- [ ] Icon und Label konfiguriert
- [ ] Trigger-Bedingung implementiert
- [ ] UI Karte erweitert
- [ ] Tests geschrieben

---

## 📅 Changelog

| Version | Datum | Änderungen |
|---------|-------|------------|
| 1.0 | 2024 | Initial mit Sample Data, Expand/Collapse, Erledigt-Markierung |

---

## 🔧 Extending this Module

### Priorisierungslogik (Scoring-Formel)

```typescript
interface PriorityFactors {
  urgency: number;      // 0-30 - Wie dringend?
  dealValue: number;    // 0-25 - Wie wertvoll?
  relationship: number; // 0-25 - Wie warm ist die Beziehung?
  penalty: number;      // 0-20 - Abzüge für Inaktivität
}

function calculatePriority(lead: Lead): number {
  // Dringlichkeit (0-30)
  const urgency = getUrgencyScore(lead);
  
  // Deal-Wert (0-25)
  const dealValue = getDealValueScore(lead.potential_value);
  
  // Beziehungsstärke (0-25)
  const relationship = getRelationshipScore(lead.interactions);
  
  // Penalty für lange Inaktivität (0-20)
  const penalty = getLastContactPenalty(lead.last_contact_at);
  
  return urgency + dealValue + relationship - penalty;
}

// Urgency Score
function getUrgencyScore(lead: Lead): number {
  const daysSinceContact = getDaysSince(lead.last_contact_at);
  
  if (lead.status === 'active' && daysSinceContact < 3) return 30;
  if (lead.status === 'active' && daysSinceContact < 7) return 20;
  if (lead.status === 'contacted') return 15;
  if (lead.status === 'new') return 10;
  return 5;
}

// Deal Value Score
function getDealValueScore(value: number): number {
  if (value > 10000) return 25;
  if (value > 5000) return 20;
  if (value > 1000) return 15;
  if (value > 500) return 10;
  return 5;
}

// Relationship Score
function getRelationshipScore(interactions: number): number {
  if (interactions > 10) return 25;
  if (interactions > 5) return 20;
  if (interactions > 2) return 15;
  if (interactions > 0) return 10;
  return 5;
}

// Penalty für Inaktivität
function getLastContactPenalty(lastContact: Date): number {
  const days = getDaysSince(lastContact);
  if (days > 30) return 20;
  if (days > 14) return 15;
  if (days > 7) return 10;
  return 0;
}
```

---

### Neue Kategorie/Aktion hinzufügen

**1. Action-Typ definieren**

```typescript
type ActionType = 
  | 'follow_up'      // Standard Follow-up
  | 'send_info'      // Infomaterial senden
  | 'schedule_call'  // Anruf planen
  | 'webinar_invite' // Webinar Einladung (NEU)
  | 'cross_sell'     // Cross-Sell Angebot (NEU)
  | 'referral_ask'   // Um Empfehlung bitten (NEU)
  | 'reactivation';  // Reaktivierung (NEU)

const ACTION_CONFIG: Record<ActionType, ActionConfig> = {
  webinar_invite: {
    label: 'Webinar einladen',
    icon: '🎥',
    color: '#8b5cf6',
    defaultPriority: 'medium',
    estimatedMinutes: 5
  },
  cross_sell: {
    label: 'Cross-Sell',
    icon: '🛒',
    color: '#10b981',
    defaultPriority: 'low',
    estimatedMinutes: 15
  },
  referral_ask: {
    label: 'Empfehlung erfragen',
    icon: '👥',
    color: '#f59e0b',
    defaultPriority: 'low',
    estimatedMinutes: 10
  }
};
```

**2. Trigger-Bedingungen festlegen**

```typescript
interface ActionTrigger {
  action: ActionType;
  condition: string;  // Pseudo-Code für Bedingung
  priority_boost: number;
}

const ACTION_TRIGGERS: ActionTrigger[] = [
  // Bestehende
  { action: 'follow_up', condition: 'no_contact > 3d', priority_boost: 10 },
  { action: 'send_info', condition: 'interested AND no_info_sent', priority_boost: 5 },
  
  // Neue Trigger
  { 
    action: 'webinar_invite', 
    condition: 'interested AND no_webinar_yet AND webinar_scheduled',
    priority_boost: 15 
  },
  { 
    action: 'cross_sell', 
    condition: 'status = won AND product_count < 2 AND days_since_purchase > 30',
    priority_boost: 5 
  },
  { 
    action: 'referral_ask', 
    condition: 'status = won AND satisfaction_score > 8',
    priority_boost: 5 
  },
  { 
    action: 'reactivation', 
    condition: 'status = dormant AND last_contact > 60d',
    priority_boost: 10 
  }
];

// Trigger-Prüfung
function checkTriggers(lead: Lead): ActionType[] {
  return ACTION_TRIGGERS
    .filter(trigger => evaluateCondition(trigger.condition, lead))
    .map(trigger => trigger.action);
}
```

**3. Backend-Endpoint erweitern**

```python
# backend/app/routers/next_best_actions.py

@router.get("/actions")
async def get_next_best_actions(
    user_id: str,
    limit: int = 10,
    action_types: list[str] = Query(default=None)  # Filter nach Typ
):
    leads = await get_user_leads(user_id)
    
    actions = []
    for lead in leads:
        triggered_actions = check_triggers(lead)
        
        for action_type in triggered_actions:
            if action_types and action_type not in action_types:
                continue
                
            priority = calculate_priority(lead)
            priority += get_trigger_boost(action_type)
            
            actions.append({
                'lead_id': lead.id,
                'lead_name': lead.name,
                'action_type': action_type,
                'priority': priority,
                'suggested_script': generate_script(lead, action_type)
            })
    
    # Nach Priorität sortieren
    actions.sort(key=lambda x: x['priority'], reverse=True)
    
    return actions[:limit]
```

---

### Edge Cases

| Situation | Fallback-Aktion | Begründung |
|-----------|-----------------|------------|
| **Zu wenig Daten** | `follow_up` mit Standard-Priorität (50) | Immer sicher, sammelt mehr Infos |
| **Alle Actions erledigt** | `check_in` nach 7 Tagen | Beziehung aufrechterhalten |
| **Lead dormant** | `reactivation` Sequenz starten | Letzte Chance auf Wiederbelebung |
| **Lead verloren** | Keine Action (außer manuell) | Respektiere Entscheidung |
| **Hohe Priorität, keine Action** | `schedule_call` | Persönlicher Kontakt |

**Implementation:**

```typescript
function getFallbackAction(lead: Lead): Action | null {
  // Lead verloren → keine automatische Action
  if (lead.status === 'lost') {
    return null;
  }
  
  // Lead dormant → Reaktivierung
  if (lead.status === 'dormant') {
    return {
      type: 'reactivation',
      priority: 30,
      reason: 'Lead ist inaktiv - Reaktivierungsversuch'
    };
  }
  
  // Alle Actions erledigt → Check-in planen
  const pendingActions = await getPendingActions(lead.id);
  if (pendingActions.length === 0) {
    return {
      type: 'check_in',
      priority: 20,
      scheduled_for: addDays(new Date(), 7),
      reason: 'Keine offenen Actions - Check-in geplant'
    };
  }
  
  // Standard: Follow-up
  return {
    type: 'follow_up',
    priority: 50,
    reason: 'Standard Follow-up (zu wenig Daten für spezifische Action)'
  };
}
```

---

### Checkliste für neue Actions

- [ ] Action-Typ in TypeScript definiert
- [ ] `ACTION_CONFIG` mit Icon, Farbe, etc.
- [ ] Trigger-Bedingungen in `ACTION_TRIGGERS`
- [ ] Backend-Endpoint unterstützt neuen Typ
- [ ] Script-Generator für neuen Typ
- [ ] UI-Karte mit passendem Design
- [ ] Analytics trackt neue Action
- [ ] Edge Cases dokumentiert

---

> **Erstellt für Sales Flow AI** | Next Best Actions Modul

