# Live Assist Integration Guide

## Übersicht

Der **Live Sales Assistant Mode** wird in der ChatScreen integriert und aktiviert sich automatisch wenn der User "Bin mit Kunde" sagt (oder manuell).

---

## 1. Migration ausführen

```sql
-- In Supabase SQL Editor die Datei ausführen:
-- backend/migrations/20251208_live_assist.sql
```

---

## 2. Seed Data einspielen

```python
# In Python Shell oder Script:
from backend.app.seeds.zinzino_live_assist_seed import seed_zinzino_live_assist
from supabase import create_client

supabase = create_client("YOUR_SUPABASE_URL", "YOUR_SERVICE_KEY")
seed_zinzino_live_assist(supabase, company_id="YOUR_ZINZINO_COMPANY_ID")
```

---

## 3. ChatScreen Integration

### 3.1 Imports hinzufügen

```javascript
// In ChatScreen.js - oben bei den Imports:
import { useLiveAssist, detectActivation, detectDeactivation } from '../../hooks/useLiveAssist';
import { LiveAssistBanner, LiveAssistResponse } from '../../components/live-assist';
import * as Haptics from 'expo-haptics';
```

### 3.2 Hook einbinden

```javascript
// In ChatScreen.js - in der Komponente:
export default function ChatScreen({ navigation }) {
  const { user } = useAuth();
  
  // ... bestehender State ...
  
  // 🆕 Live Assist Hook
  const liveAssist = useLiveAssist({
    companyId: user?.company_id,
    vertical: 'network_marketing', // oder aus User-Profil
    onActivate: () => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      // Optional: Toast/Alert anzeigen
    },
    onDeactivate: () => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    },
    onResponse: (response) => {
      // Optional: Auto-Read aktivieren
      if (autoRead && voiceSupport.tts) {
        speakText(response.response_short || response.response_text);
      }
    },
    onError: (error) => {
      console.error('Live Assist Error:', error);
    },
  });
  
  // ... rest of component
}
```

### 3.3 sendMessage anpassen

```javascript
// Die sendMessage Funktion erweitern:
const sendMessage = async () => {
  if (!input.trim() || loading) return;
  
  const messageText = input.trim();
  
  // 🆕 Prüfen ob Live Assist aktiviert/deaktiviert werden soll
  if (detectActivation(messageText)) {
    await liveAssist.activate();
    setInput('');
    // Aktivierungs-Nachricht hinzufügen
    setMessages(prev => [...prev, 
      { 
        id: Date.now().toString(),
        role: 'user', 
        content: messageText 
      },
      {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: `🟢 **Live Assist aktiviert!**\n\nFrag mich:\n• "Kunde sagt zu teuer"\n• "Warum ${liveAssist.companyName || 'wir'}?"\n• "Gib mir Zahlen"\n\nIch bin bereit! 🎯`,
        isLiveAssist: true,
        contextUsed: true,
      }
    ]);
    return;
  }
  
  if (detectDeactivation(messageText)) {
    await liveAssist.deactivate();
    setInput('');
    setMessages(prev => [...prev, 
      { 
        id: Date.now().toString(),
        role: 'user', 
        content: messageText 
      },
      {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: '🔴 Live Assist beendet. Zurück im normalen Modus. Wie kann ich dir helfen?',
        isLiveAssist: false,
      }
    ]);
    return;
  }
  
  // 🆕 Wenn Live Assist aktiv ist, dort verarbeiten
  if (liveAssist.isActive) {
    const messageId = Date.now().toString();
    setMessages(prev => [...prev, { id: messageId, role: 'user', content: messageText }]);
    setInput('');
    setLoading(true);
    
    try {
      const response = await liveAssist.query(messageText);
      
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: response.response_text,
        isLiveAssist: true,
        liveAssistData: response, // Für LiveAssistResponse Komponente
        contextUsed: true,
      }]);
      
    } catch (error) {
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: '⚠️ Fehler bei Live Assist. Versuch es nochmal.',
        isLiveAssist: true,
      }]);
    }
    
    setLoading(false);
    return;
  }
  
  // Normaler CHIEF Chat-Flow (bestehender Code)
  // ... rest of sendMessage ...
};
```

### 3.4 UI mit Banner erweitern

```javascript
// In der return-Anweisung, vor der ScrollView:
return (
  <KeyboardAvoidingView ...>
    {/* 🆕 Live Assist Banner */}
    <LiveAssistBanner 
      isActive={liveAssist.isActive}
      companyName={liveAssist.companyName}
      keyFacts={liveAssist.keyFacts}
      onDeactivate={() => liveAssist.deactivate()}
    />
    
    <ScrollView ref={scrollViewRef} ...>
      {messages.map((message, index) => (
        <View key={message.id}>
          {/* Unterschiedliche Darstellung für Live Assist Responses */}
          {message.isLiveAssist && message.liveAssistData ? (
            <LiveAssistResponse 
              response={message.liveAssistData}
              onCopy={() => {/* Clipboard.setString(...) */}}
              onSpeak={() => speakText(message.liveAssistData.response_short || message.content)}
              onFeedback={(helpful) => {/* API call */}}
            />
          ) : (
            // Normale Message-Darstellung
            <MessageBubble message={message} ... />
          )}
        </View>
      ))}
    </ScrollView>
    
    {/* ... Input Area ... */}
  </KeyboardAvoidingView>
);
```

---

## 4. Quick Actions hinzufügen (Optional)

```javascript
// Zusätzliche Quick Actions für Live Assist:
const liveAssistQuickActions = [
  { 
    label: '🟢 Kundengespräch', 
    type: 'live_assist_start',
    prompt: 'Bin mit Kunde'
  },
  { 
    label: '📊 Quick Facts', 
    type: 'live_assist_facts',
    prompt: 'Gib mir die wichtigsten Fakten'
  },
  { 
    label: '🛡️ Einwand-Hilfe', 
    type: 'live_assist_objection',
    prompt: 'Kunde sagt zu teuer'
  },
];

// In Quick Actions anzeigen wenn Live Assist aktiv:
{liveAssist.isActive && liveAssistQuickActions.map(action => (
  <Pressable 
    key={action.type}
    onPress={() => {
      setInput(action.prompt);
      sendMessage();
    }}
    style={styles.quickAction}
  >
    <Text>{action.label}</Text>
  </Pressable>
))}
```

---

## 5. API Endpoints

| Endpoint | Methode | Beschreibung |
|----------|---------|--------------|
| `/live-assist/start` | POST | Session starten |
| `/live-assist/end` | POST | Session beenden |
| `/live-assist/query` | POST | Live-Anfrage verarbeiten |
| `/live-assist/facts/{company_id}` | GET | Quick Facts abrufen |
| `/live-assist/objections/{company_id}` | GET | Einwand-Antworten abrufen |
| `/live-assist/ws/{session_id}` | WebSocket | Echtzeit-Verbindung |

---

## 6. Trigger-Wörter

### Aktivierung
- "Bin mit Kunde"
- "Kundengespräch"
- "Live Hilfe"
- "Assist Mode"
- "Meeting läuft"
- "Unterstütz mich"

### Deaktivierung
- "Gespräch vorbei"
- "Kunde weg"
- "Assist aus"
- "Danke Chief"
- "Meeting fertig"

---

## 7. Intent-Typen

| Intent | Trigger-Beispiele | Response-Quelle |
|--------|-------------------|-----------------|
| `objection` | "Kunde sagt zu teuer" | `objection_responses` |
| `usp` | "Warum Zinzino?" | `quick_facts` (differentiator) |
| `facts` | "Gib mir Zahlen" | `quick_facts` |
| `science` | "Welche Studien?" | `quick_facts` + AI |
| `product_info` | "Was ist BalanceOil?" | `company_products` |
| `pricing` | "Was kostet das?" | `quick_facts` + AI |
| `comparison` | "Besser als Konkurrenz?" | AI-generiert |
| `story` | "Erzähl die Gründerstory" | `company_stories` |

---

## 8. Beispiel-Flow

```
User: "Bin mit Kunde"
→ Live Assist aktiviert

User: "Kunde sagt zu teuer"
→ Intent: objection (price)
→ Response: "Verstehe ich. Runtergebrochen sind das etwa 1,50€ am Tag..."
→ Follow-up: "Was wäre es dir wert, wenn du wüsstest..."

User: "Gib mir Zahlen"
→ Intent: facts
→ Response: "90% verbessern ihre Balance in 120 Tagen. 1 Million+ Tests weltweit."

User: "Danke Chief"
→ Live Assist deaktiviert
```

---

## Fertig! 🎯

Der Live Sales Assistant ist jetzt bereit, Verkäufer während Kundengesprächen in Echtzeit zu unterstützen.

