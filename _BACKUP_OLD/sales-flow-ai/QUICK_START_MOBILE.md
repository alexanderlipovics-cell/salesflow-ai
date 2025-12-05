# 🚀 Quick Start: Mobile Optimization

Schnellstart-Guide für die Mobile Features Integration.

---

## ⚡ 3 Minuten Setup

### 1. App.tsx erweitern

```tsx
import { useEffect } from 'react';
import * as Linking from 'expo-linking';
import NotificationService from './services/NotificationService';
import HapticService from './services/HapticService';
import { parseDeepLink } from './config/deepLinking';

export default function App() {
  useEffect(() => {
    // Push Notifications initialisieren
    NotificationService.registerForPushNotifications();

    // Notification Click Handler
    NotificationService.setupNotificationListener((notification) => {
      HapticService.light();
      console.log('Notification:', notification);
    });

    // Deep Linking Handler
    const handleUrl = ({ url }: { url: string }) => {
      const parsed = parseDeepLink(url);
      if (parsed) {
        // router.push(parsed.screen); // Uncomment wenn Router verfügbar
      }
    };

    Linking.addEventListener('url', handleUrl);
    Linking.getInitialURL().then((url) => {
      if (url) handleUrl({ url });
    });
  }, []);

  return (
    // ... Deine App
  );
}
```

### 2. Offline-fähige API Calls

**Vorher:**
```tsx
const createLead = async (data) => {
  await fetch('/api/leads', {
    method: 'POST',
    body: JSON.stringify(data)
  });
};
```

**Nachher:**
```tsx
import OfflineService from './services/OfflineService';

const createLead = async (data) => {
  if (OfflineService.isOnlineNow()) {
    // Normal API call
    await fetch('/api/leads', { method: 'POST', body: JSON.stringify(data) });
  } else {
    // Queue for sync
    await OfflineService.queueAction({
      type: 'create_lead',
      endpoint: '/api/leads',
      method: 'POST',
      data,
      timestamp: Date.now()
    });
  }
};
```

### 3. Haptic Feedback zu Buttons

**Vorher:**
```tsx
<Button onPress={handleSubmit} title="Speichern" />
```

**Nachher:**
```tsx
import HapticService from './services/HapticService';

<Button 
  onPress={() => {
    HapticService.light();
    handleSubmit();
  }} 
  title="Speichern" 
/>
```

---

## 🎯 Feature-spezifische Integrationen

### Voice Input zu Notizen hinzufügen

```tsx
import VoiceInput from './components/VoiceInput';

function NotesField() {
  const [notes, setNotes] = useState('');

  return (
    <View style={{ flexDirection: 'row' }}>
      <TextInput 
        value={notes} 
        onChangeText={setNotes}
        style={{ flex: 1 }}
      />
      <VoiceInput onResult={(text) => setNotes(notes + ' ' + text)} />
    </View>
  );
}
```

### Business Card Scanner in Lead Form

```tsx
import BusinessCardScanner from './components/BusinessCardScanner';

function AddLeadScreen() {
  const [leadData, setLeadData] = useState({});

  const handleScan = (data) => {
    setLeadData({
      name: data.name,
      email: data.email,
      phone: data.phone,
      company: data.company
    });
  };

  return (
    <View>
      <BusinessCardScanner onScan={handleScan} />
      {/* Rest of form */}
    </View>
  );
}
```

### Push Notification bei Deal Closed

**Backend:**
```python
from app.routers.notifications import notify_deal_closed

async def close_deal(deal_id: int):
    deal = await get_deal(deal_id)
    user = await get_user(deal.user_id)
    
    # Send push notification
    await notify_deal_closed(
        user.expo_push_token,
        deal.lead_name,
        deal.amount
    )
```

### Performance: Debounced Search

```tsx
import { debounce } from './utils/performance';

function SearchBar() {
  const searchLeads = debounce(async (query: string) => {
    const results = await fetch(`/api/leads/search?q=${query}`);
    setSearchResults(results);
  }, 300); // Wartet 300ms nach letzter Eingabe

  return (
    <TextInput
      onChangeText={searchLeads}
      placeholder="Leads suchen..."
    />
  );
}
```

---

## 📱 Permissions Setup

### app.json erweitern

```json
{
  "expo": {
    "ios": {
      "infoPlist": {
        "NSCameraUsageDescription": "Zum Scannen von Visitenkarten",
        "NSMicrophoneUsageDescription": "Für Sprachnotizen",
        "NSLocationWhenInUseUsageDescription": "Für Außendienst-Features"
      }
    },
    "android": {
      "permissions": [
        "CAMERA",
        "RECORD_AUDIO",
        "ACCESS_FINE_LOCATION",
        "RECEIVE_BOOT_COMPLETED",
        "VIBRATE"
      ]
    }
  }
}
```

---

## 🧪 Schnell-Tests

### Test 1: Offline Mode (30 Sekunden)
1. ✈️ Flugmodus einschalten
2. Lead erstellen → Sollte in Queue landen
3. ✈️ Flugmodus ausschalten
4. → Lead wird automatisch synchronisiert ✅

### Test 2: Voice Input (15 Sekunden)
1. Mikrofon-Button drücken
2. "Max Mustermann" sprechen
3. → Text erscheint im Feld ✅

### Test 3: Haptic Feedback (10 Sekunden)
1. Button mit Haptic drücken
2. → Vibriert beim Klick ✅

### Test 4: Business Card Scanner (20 Sekunden)
1. "Scan Business Card" Button
2. Visitenkarte fotografieren
3. → Daten werden automatisch gefüllt ✅

---

## 🎯 Checkliste für Production

- [ ] Push Notification Permissions getestet (iOS + Android)
- [ ] Offline Mode funktioniert (create, update, delete)
- [ ] Voice Input Language korrekt (de-DE / en-US)
- [ ] Camera Permissions granted
- [ ] Haptic Feedback auf allen kritischen Actions
- [ ] Deep Links funktionieren (aus Notifications, Emails)
- [ ] Backend OCR Endpoint deployed
- [ ] Backend Notification Token Storage implementiert
- [ ] Performance getestet (60 FPS auf Low-End Devices)
- [ ] Error Handling für alle Services vorhanden

---

## 🆘 Troubleshooting

### Push Notifications funktionieren nicht
- ✅ Physical Device verwenden (nicht Simulator)
- ✅ Permissions granted checken
- ✅ Token im Backend registriert prüfen
- ✅ Expo Push Token gültig (nicht expired)

### Voice Input erkennt nichts
- ✅ Mikrofon-Permission granted
- ✅ Internet-Verbindung (Voice API benötigt Online)
- ✅ Sprache korrekt (de-DE für Deutsch)

### Offline Queue synchronisiert nicht
- ✅ Network Listener läuft
- ✅ Token in AsyncStorage vorhanden
- ✅ Backend erreichbar
- ✅ Console logs checken

### Business Card Scanner ungenau
- ✅ Gute Beleuchtung
- ✅ Karte flach und gerade
- ✅ Hohe Auflösung (quality: 1)
- ✅ Backend OCR Service läuft

---

## 📚 Weitere Ressourcen

- **Vollständige Doku**: `MOBILE_OPTIMIZATION_README.md`
- **Integration Example**: `examples/MobileOptimizationIntegration.tsx`
- **Deep Linking Config**: `config/deepLinking.ts`

---

**🎉 Ready to ship! Mobile Optimization ist live.**

Bei Fragen → Doku lesen oder Team fragen.

