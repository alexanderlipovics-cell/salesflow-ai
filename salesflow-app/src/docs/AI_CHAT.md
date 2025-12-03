# 💬 Sales Flow AI - KI-Chat (CHIEF)

> **Technische Dokumentation** | Version 1.0  
> Sales AI Coach mit Memory & Learning

---

## 📑 Inhaltsverzeichnis

1. [Überblick](#-überblick)
2. [Frontend: ChatScreen](#-frontend-chatscreen)
3. [Features](#-features)
4. [API-Integration](#-api-integration)
5. [Feedback-System](#-feedback-system)
6. [Datenmodell](#-datenmodell)

---

## 🎯 Überblick

**CHIEF** ist der KI-Coach von Sales Flow AI:

- ✅ **Konversations-Gedächtnis**: Erinnert sich an frühere Gespräche
- ✅ **Feedback-Learning**: Lernt aus 👍/👎 Bewertungen
- ✅ **Quick Actions**: Schnellstart-Buttons
- ✅ **RAG-Integration**: Zugriff auf Knowledge Base

---

## 📱 Frontend: ChatScreen

**Dateien:**
- `src/screens/main/ChatScreen.js` (Hauptkomponente)
- `src/screens/main/AIChatScreen.js` (Alias)

### State Management

| State | Typ | Beschreibung |
|-------|-----|--------------|
| `messages` | `Array` | Chat-Verlauf |
| `input` | `String` | Aktuelle Eingabe |
| `loading` | `Boolean` | Ladezustand |
| `feedbackGiven` | `Object` | Feedback pro Nachricht |

### Initialnachricht

```javascript
{
  id: '1',
  role: 'assistant', 
  content: 'Hallo! 👋 Ich bin CHIEF, dein Sales Flow AI Coach.\n\n🧠 Ich erinnere mich an unsere Gespräche...',
  memories: 0,
  patterns: 0
}
```

---

## ✨ Features

### Quick Actions

```javascript
const quickActions = [
  { 
    label: '🛡️ Einwand behandeln', 
    type: 'objection_help',
    prompt: 'Hilf mir, den Einwand "Das ist mir zu teuer" zu behandeln.'
  },
  { 
    label: '🎬 Opener vorschlagen', 
    type: 'opener_suggest',
    prompt: 'Schlage mir einen guten Cold Call Opener vor.'
  },
  { 
    label: '🎯 Closing Tipp', 
    type: 'closing_tip',
    prompt: 'Wie bringe ich ein Gespräch zum Abschluss?'
  },
  { 
    label: '📧 Follow-up Idee', 
    type: 'followup_suggest',
    prompt: 'Schreibe mir eine Follow-up Email nach einem Demo-Call.'
  },
];
```

### Memory Badges

```javascript
// In der Nachricht angezeigt
{msg.memories > 0 && <Text>💾 {msg.memories}</Text>}
{msg.patterns > 0 && <Text>📚 {msg.patterns}</Text>}
```

---

## 🌐 API-Integration

### Chat Endpoint

**POST** `/api/ai/chat`

```javascript
const response = await fetch(`${API_URL}/api/ai/chat`, {
  method: 'POST',
  body: JSON.stringify({
    message: userMessage.content,
    conversation_history: conversationHistory,
    user_id: user?.id
  })
});

const data = await response.json();
// data.response, data.memories_used, data.patterns_used
```

### Quick Action Endpoint

**POST** `/api/ai/quick-action`

```javascript
const response = await fetch(`${API_URL}/api/ai/quick-action`, {
  method: 'POST',
  body: JSON.stringify({
    action_type: 'objection_help',
    context: 'Hilf mir bei "Das ist mir zu teuer"',
    user_id: user?.id
  })
});
```

---

## 👍 Feedback-System

```javascript
const sendFeedback = async (messageId, userMessage, aiResponse, feedbackType) => {
  setFeedbackGiven(prev => ({ ...prev, [messageId]: feedbackType }));
  
  await fetch(`${API_URL}/api/ai/feedback`, {
    method: 'POST',
    body: JSON.stringify({
      message: userMessage,
      response: aiResponse,
      feedback: feedbackType,  // 'positive' oder 'negative'
      pattern_type: 'general',
      user_id: user?.id
    })
  });
};
```

### UI-Feedback

```
┌────────────────────────────────────────┐
│ War das hilfreich?  [👍] [👎]          │
│                                        │
│ ✓ Danke! Ich lerne dazu.               │
└────────────────────────────────────────┘
```

---

## 📊 Datenmodell

```typescript
interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  memories?: number;      // Anzahl genutzter Memories
  patterns?: number;      // Anzahl genutzter Patterns
  tokens?: number;        // Verbrauchte Tokens
  conversationId?: string;
  isQuickAction?: boolean;
}
```

---

## 🎨 Styling

| Element | Farbe |
|---------|-------|
| Header | Blau `#3b82f6` |
| User Bubble | Blau `#3b82f6` |
| Assistant Bubble | Weiß |
| RAG Badge | Hellblau |
| Feedback Positiv | Grün `#22c55e` |
| Feedback Negativ | Rot `#ef4444` |

---

## 🔧 Extending this Module

### Prompt-Architektur

```
┌─────────────────────────────────────┐
│ 1. System Prompt                    │
│    - CHIEF Persona                  │
│    - Verhaltensregeln               │
│    - Output Format                  │
├─────────────────────────────────────┤
│ 2. Company Context                  │
│    - Power-Up Daten                 │
│    - Produkte & Compensation        │
├─────────────────────────────────────┤
│ 3. User Context                     │
│    - Rolle, Team, Stats             │
│    - Aktuelle Leads                 │
├─────────────────────────────────────┤
│ 4. Conversation History             │
│    - Letzte 10 Messages             │
│    - Summarized älter               │
├─────────────────────────────────────┤
│ 5. Tool Outputs                     │
│    - Next Best Actions              │
│    - Objection Brain                │
│    - Playbook Suggestions           │
└─────────────────────────────────────┘
```

### Neue Quick Action hinzufügen

1. **Backend: Action Handler definieren**

```python
# backend/app/api/ai.py
QUICK_ACTIONS = {
    'objection_help': 'Hilf mir bei diesem Einwand: ',
    'opener_suggest': 'Schlage einen guten Opener vor für: ',
    'closing_tip': 'Gib mir einen Closing-Tipp für: ',
    'followup_suggest': 'Erstelle eine Follow-up Nachricht für: ',
    'script_generate': 'Generiere ein Verkaufsskript für: ',  # NEU
}
```

2. **Frontend: Button hinzufügen**

```javascript
// ChatScreen.js
const quickActions = [
  // ... bestehende
  { 
    label: '📜 Skript generieren', 
    type: 'script_generate',
    prompt: 'Generiere ein Telefonverkaufs-Skript für mein Produkt.'
  },
];
```

### Memory System erweitern

```typescript
// Memory-Typen
type MemoryType = 
  | 'conversation'     // Chat-Verlauf
  | 'user_preference'  // User-Präferenzen
  | 'lead_context'     // Lead-spezifisches
  | 'feedback'         // Feedback-Daten
  | 'pattern';         // Erkannte Muster

// Memory-Eintrag
interface Memory {
  id: string;
  user_id: string;
  type: MemoryType;
  content: string;
  embedding?: number[];  // Für Similarity Search
  created_at: Date;
  last_accessed: Date;
  access_count: number;
}
```

### Feedback & Logging

| Event | Gespeichert | Verwendung |
|-------|-------------|------------|
| 👍 Thumbs Up | `feedback_positive` | Model Evaluation |
| 👎 Thumbs Down | `feedback_negative` + Grund | Prompt Verbesserung |
| Kommentar | `feedback_comment` | Qualitative Analyse |
| Response Time | `response_ms` | Performance Monitoring |
| Token Usage | `tokens_used` | Cost Tracking |

### RAG-Integration (geplant)

```python
# Vector Store für Knowledge Base
async def search_knowledge_base(query: str, top_k: int = 3):
    query_embedding = await generate_embedding(query)
    
    results = await supabase.rpc(
        'match_documents',
        {
            'query_embedding': query_embedding,
            'match_threshold': 0.7,
            'match_count': top_k
        }
    ).execute()
    
    return results.data
```

### Checkliste

- [ ] Quick Action in Frontend + Backend hinzugefügt
- [ ] Prompt Templates aktualisiert
- [ ] Feedback-Logging getestet
- [ ] Token-Limit überwacht
- [ ] Response-Qualität validiert

---

## 🔧 Extending this Module

### Prompt-Architektur

```
┌─────────────────────────────────────┐
│ 1. System Prompt                    │
│    - CHIEF Persona                  │
│    - Verhaltensregeln               │
│    - Output Format                  │
├─────────────────────────────────────┤
│ 2. Company Context                  │
│    - Power-Up Daten                 │
│    - Produkte & Compensation        │
├─────────────────────────────────────┤
│ 3. User Context                     │
│    - Rolle, Team, Stats             │
│    - Aktuelle Leads                 │
├─────────────────────────────────────┤
│ 4. Conversation History             │
│    - Letzte 10 Messages             │
│    - Summarized älter               │
├─────────────────────────────────────┤
│ 5. Tool Outputs                     │
│    - Next Best Actions              │
│    - Objection Brain                │
│    - Playbook Suggestions           │
└─────────────────────────────────────┘
```

**Implementation:**

```python
def build_chief_prompt(user: User, conversation: list, context: dict) -> str:
    return f"""
    {SYSTEM_PROMPT}
    
    === COMPANY CONTEXT ===
    {get_company_context(user.power_up_id)}
    
    === USER CONTEXT ===
    Name: {user.name}
    Rolle: {user.role}
    Team: {user.team_name}
    Aktive Leads: {context.get('active_leads_count', 0)}
    Conversion Rate: {context.get('conversion_rate', 0)}%
    
    === CONVERSATION ===
    {format_conversation(conversation[-10:])}
    
    === TOOLS OUTPUT ===
    {format_tool_outputs(context.get('tool_outputs', {}))}
    """
```

---

### Neue Quick Action hinzufügen

**1. Backend: Action definieren**

```python
# backend/app/services/intelligent_chat_service.py

QUICK_ACTIONS = {
    'objection_help': {
        'handler': objection_handler,
        'prompt_template': 'Hilf mir, den Einwand "{objection}" zu behandeln.',
        'requires': ['objection']
    },
    'opener_suggest': {
        'handler': opener_handler,
        'prompt_template': 'Schlage einen Opener für {channel} vor.',
        'requires': ['channel']
    },
    # NEU
    'daily_plan': {
        'handler': daily_plan_handler,
        'prompt_template': 'Erstelle meinen Sales-Plan für heute basierend auf meinen offenen Tasks.',
        'requires': []
    },
    'deal_diagnosis': {
        'handler': deal_diagnosis_handler,
        'prompt_template': 'Analysiere warum der Deal mit {lead_name} stockt.',
        'requires': ['lead_name']
    }
}

async def daily_plan_handler(user: User, params: dict) -> str:
    """Generiert personalisierter Tagesplan."""
    pending_tasks = await get_pending_tasks(user.id)
    leads = await get_active_leads(user.id)
    
    return generate_daily_plan_prompt(pending_tasks, leads)
```

**2. Frontend: Button hinzufügen**

```javascript
// ChatScreen.js
const quickActions = [
  // Bestehende...
  { 
    label: '📅 Tagesplan', 
    type: 'daily_plan',
    prompt: 'Erstelle meinen Sales-Plan für heute basierend auf meinen offenen Tasks.',
    icon: '📅'
  },
  { 
    label: '🩺 Deal Diagnose', 
    type: 'deal_diagnosis',
    prompt: 'Analysiere warum mein wichtigster Deal stockt.',
    icon: '🩺'
  },
];

// Button rendern
<QuickActionButton 
  label={action.label}
  icon={action.icon}
  onPress={() => handleQuickAction(action)}
/>
```

**3. UI-Komponente**

```jsx
const QuickActionButton = ({ label, icon, onPress, disabled }) => (
  <TouchableOpacity 
    onPress={onPress}
    disabled={disabled}
    style={[styles.quickAction, disabled && styles.disabled]}
  >
    <Text style={styles.icon}>{icon}</Text>
    <Text style={styles.label}>{label}</Text>
  </TouchableOpacity>
);
```

---

### Feedback & Logging

| Event | Gespeichert | Verwendung |
|-------|-------------|------------|
| 👍 Thumbs Up | `feedback_positive` | Model Evaluation |
| 👎 Thumbs Down | `feedback_negative` + Grund | Prompt Verbesserung |
| Kommentar | `feedback_comment` | Qualitative Analyse |
| Response Time | `response_ms` | Performance Monitoring |

**Implementation:**

```typescript
interface FeedbackEvent {
  message_id: string;
  session_id: string;
  user_id: string;
  feedback_type: 'positive' | 'negative';
  reason?: string;  // Bei negativ
  comment?: string;
  created_at: Date;
}

async function submitFeedback(event: FeedbackEvent) {
  // 1. In Datenbank speichern
  await supabase.from('chat_feedback').insert(event);
  
  // 2. Analytics tracken
  await trackEvent('chat_feedback', {
    type: event.feedback_type,
    reason: event.reason
  });
  
  // 3. Bei negativem Feedback: Alert für Review
  if (event.feedback_type === 'negative') {
    await createReviewTask(event);
  }
}
```

**Datenbank-Schema:**

```sql
CREATE TABLE chat_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL,
  session_id UUID REFERENCES chat_sessions(id),
  user_id UUID REFERENCES auth.users(id),
  
  feedback_type TEXT NOT NULL CHECK (feedback_type IN ('positive', 'negative')),
  reason TEXT,  -- 'unhelpful', 'incorrect', 'inappropriate', 'other'
  comment TEXT,
  
  -- Context für Analyse
  prompt TEXT,
  response TEXT,
  model_used TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index für Analyse
CREATE INDEX idx_feedback_type ON chat_feedback(feedback_type, created_at);
```

---

### RAG-Integration erweitern

```python
async def search_knowledge_base(query: str, user: User) -> list[KnowledgeChunk]:
    """Sucht relevante Chunks aus der Knowledge Base."""
    
    # 1. Query Embedding generieren
    embedding = await generate_embedding(query)
    
    # 2. Similarity Search in pgvector
    results = await supabase.rpc(
        'match_knowledge_chunks',
        {
            'query_embedding': embedding,
            'match_threshold': 0.7,
            'match_count': 5,
            'workspace_id': user.workspace_id
        }
    ).execute()
    
    # 3. Chunks formatieren
    return [
        KnowledgeChunk(
            content=r['content'],
            source=r['source'],
            similarity=r['similarity']
        )
        for r in results.data
    ]
```

---

### Checkliste für CHIEF-Erweiterungen

- [ ] Neuer System Prompt getestet
- [ ] Quick Action im Backend registriert
- [ ] Quick Action im Frontend hinzugefügt
- [ ] Feedback-Logging funktioniert
- [ ] RAG-Index aktualisiert (falls nötig)
- [ ] Performance getestet (Response Time < 3s)
- [ ] Edge Cases dokumentiert

---

> **Erstellt für Sales Flow AI** | CHIEF KI-Coach

