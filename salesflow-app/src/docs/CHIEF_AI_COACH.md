# 🤖 CHIEF - Der persönliche AI Sales Coach

**CHIEF** = **C**oach + **H**elper + **I**ntelligence + **E**xpert + **F**riend

CHIEF ist der zentrale AI-Copilot von Sales Flow AI, der User durch ihren Vertriebsalltag begleitet.

---

## 📁 Dateistruktur

```
src/
├── prompts/
│   ├── chief-prompt.js          # System Prompt & Helpers
│   └── index.js                  # Zentrale Exports
├── services/
│   ├── chiefService.js          # Chat Service & API
│   └── aiService.js             # Re-exports
├── hooks/
│   ├── useChiefChat.js          # React Hook für Chat UI
│   ├── useChiefDailyFlowContext.js  # Daily Flow Context
│   └── index.js                 # Zentrale Exports
└── backend/
    └── supabase-functions/
        ├── ai-chat/             # Standard AI Function
        └── ai-chat-stream/      # Streaming Function
```

---

## 🚀 Quick Start

### 1. Basic Chat Integration

```jsx
import { useChiefChat } from '../hooks';

function ChiefChatScreen() {
  const {
    messages,
    isLoading,
    sendMessage,
    suggestedPrompts,
  } = useChiefChat({ companyId: 'my-company' });

  return (
    <View>
      {/* Messages anzeigen */}
      {messages.map(msg => (
        <ChatBubble key={msg.id} message={msg} />
      ))}
      
      {/* Suggested Prompts */}
      {suggestedPrompts.map(prompt => (
        <TouchableOpacity 
          key={prompt.text}
          onPress={() => sendMessage(prompt.text)}
        >
          <Text>{prompt.icon} {prompt.text}</Text>
        </TouchableOpacity>
      ))}
      
      {/* Input */}
      <TextInput onSubmitEditing={(e) => sendMessage(e.nativeEvent.text)} />
    </View>
  );
}
```

### 2. Quick Actions

```javascript
import { ChiefQuickActions } from '../services/chiefService';

// Tagesstatus abfragen
const status = await ChiefQuickActions.getDailyStatus(context);

// Nächste Aktion vorschlagen
const nextAction = await ChiefQuickActions.getNextAction(context);

// Einwandbehandlung
const help = await ChiefQuickActions.getObjectionHelp("keine Zeit", context);

// Follow-up Vorschlag
const followUp = await ChiefQuickActions.getFollowUpSuggestion(
  "Anna Müller", 
  "Letzte Woche über Preise gesprochen",
  context
);
```

### 3. Custom Action Handlers

```javascript
const { messages } = useChiefChat({
  actionHandlers: {
    FOLLOWUP_LEADS: (leadIds) => {
      navigation.navigate('FollowUpPanel', { leadIds });
    },
    COMPOSE_MESSAGE: ([leadId]) => {
      navigation.navigate('MessageComposer', { leadId });
    },
  },
});
```

---

## 🎯 Kontext-System

CHIEF nutzt verschiedene Kontext-Quellen um personalisierte Antworten zu geben:

### Daily Flow Status

```javascript
const context = {
  dailyFlow: {
    date: '2024-01-15',
    statusLevel: 'slightly_behind', // behind | slightly_behind | on_track | ahead
    avgRatio: 0.75,
    newContacts: { done: 5, target: 8 },
    followups: { done: 4, target: 6 },
    reactivations: { done: 1, target: 2 },
    remaining: { contacts: 3, followups: 2 },
  },
};
```

### Vertical Profile

```javascript
const context = {
  vertical: {
    name: 'network_marketing', // | 'real_estate' | 'finance' | 'coaching'
    terminology: {
      lead: 'Interessent',
      close: 'Partner-Registrierung',
      product: 'Nahrungsergänzung',
    },
  },
};
```

### User Profile

```javascript
const context = {
  userProfile: {
    name: 'Max',
    role: 'Team Leader',
    experience: 'fortgeschritten', // anfänger | mittel | fortgeschritten
  },
};
```

### Suggested Leads

```javascript
const context = {
  suggestedLeads: [
    { id: 'lead-001', name: 'Anna Müller', priority: 'high', reason: 'Follow-up überfällig' },
    { id: 'lead-002', name: 'Markus Schmidt', priority: 'medium', reason: 'Interesse gezeigt' },
  ],
};
```

---

## 🏷️ Action Tags

CHIEF kann Action-Tags in seine Antworten einbauen, die das Frontend verarbeiten kann:

| Tag | Beschreibung | Beispiel |
|-----|-------------|----------|
| `[[ACTION:FOLLOWUP_LEADS:id1,id2]]` | Öffnet Follow-up Panel | `[[ACTION:FOLLOWUP_LEADS:lead-001,lead-002]]` |
| `[[ACTION:NEW_CONTACT_LIST]]` | Zeigt neue Kontakte | - |
| `[[ACTION:COMPOSE_MESSAGE:id]]` | Öffnet Message-Composer | `[[ACTION:COMPOSE_MESSAGE:lead-001]]` |
| `[[ACTION:LOG_ACTIVITY:type,id]]` | Loggt Aktivität | `[[ACTION:LOG_ACTIVITY:call,lead-001]]` |
| `[[ACTION:OBJECTION_HELP:keyword]]` | Öffnet Objection Brain | `[[ACTION:OBJECTION_HELP:keine_zeit]]` |

### Verarbeitung im Frontend

```javascript
import { handleChiefActions } from '../services/chiefService';

// Nach Empfang der Response
handleChiefActions(response.actions, {
  FOLLOWUP_LEADS: (leadIds) => {
    // Custom Handler
  },
});
```

---

## 📡 Edge Functions

### ai-chat (Standard)

```bash
supabase functions deploy ai-chat
```

**Request:**
```json
{
  "messages": [
    { "role": "system", "content": "Du bist CHIEF..." },
    { "role": "user", "content": "Wie stehe ich heute?" }
  ],
  "model": "gpt-4o-mini",
  "temperature": 0.8,
  "max_tokens": 1500
}
```

### ai-chat-stream (Streaming)

```bash
supabase functions deploy ai-chat-stream
```

**Response:** Plain Text Stream (kein JSON)

---

## 🎨 CHIEF Persönlichkeit

### Stil-Richtlinien

- ✅ Locker, direkt, motivierend
- ✅ Du-Ansprache
- ✅ Dezente Emojis (🔥 💪 ✅ 🎯)
- ✅ Konkrete Zahlen aus dem Kontext
- ✅ Klare nächste Schritte

### Was CHIEF nicht tut

- ❌ Namen erfinden (nur aus `suggested_leads`)
- ❌ Umsatzzahlen versprechen
- ❌ Rechtliche/medizinische Beratung
- ❌ User kritisieren oder demotivieren

---

## 🔧 Environment Variables

In Supabase Dashboard → Settings → Edge Functions:

```env
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-... (optional)
```

---

## 📊 Beispiel-Antworten

### Tagesstatus

**User:** "Wie stehe ich heute?"

**CHIEF:**
```
Hey! Kurzer Check zu deinem Tagesplan:

Du hast heute schon 5 von 8 geplanten neuen Kontakten erledigt ✅
Follow-ups: 4 von 6 ✅
Reaktivierungen: 1 von 2 ✅

Um voll im Plan zu bleiben, fehlen dir noch:
• 3 neue Kontakte
• 2 Follow-ups
• 1 Reaktivierung

Für Follow-ups würde ich mit Anna und Markus starten – beide sind überfällig.

Wie willst du starten?
🟢 2 schnelle Follow-up-Nachrichten
🔵 3 neue Kontakte anschreiben
```

### Einwandbehandlung

**User:** "Wie reagiere ich auf 'keine Zeit'?"

**CHIEF:**
```
"Keine Zeit" ist einer der häufigsten Einwände – und gleichzeitig einer der leichtesten!

Hier meine Top-3 Reaktionen:

1️⃣ Zustimmung + Perspektive
"Verstehe ich! Die Frage ist nicht ob du jetzt Zeit hast, sondern ob dir 10 Minuten wert sind um zu checken, ob das was für dich sein könnte."

2️⃣ Neugier wecken
"Kein Problem! Kurze Frage: Wenn du die Zeit hättest – wäre das Thema grundsätzlich interessant?"

3️⃣ Termin-Anker
"Absolut. Wann passt es besser – eher morgens oder abends?"

Der Trick: Du akzeptierst, aber schließt nicht ab. Was hat dein Lead konkret gesagt?
```

---

## 🔗 Weitere Ressourcen

- [Daily Flow System](./DAILY_FLOW_STATUS.md)
- [Objection Brain](./OBJECTION_BRAIN.md)
- [Vertical System](./VERTICAL_SYSTEM.md)
- [AI Chat Architecture](./AI_CHAT.md)

