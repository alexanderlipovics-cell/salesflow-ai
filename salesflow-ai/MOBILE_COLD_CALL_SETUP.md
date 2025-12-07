# 📱 Cold Call Assistant Screen - Mobile App Setup

## ✅ Screen erstellt

**Datei:** `src/screens/main/ColdCallAssistantScreen.js`

Der Screen ist vollständig implementiert und produktionsreif!

---

## 📦 Dependencies installieren

```bash
# Material Top Tabs (für Tab-Navigation)
npm install @react-navigation/material-top-tabs react-native-tab-view

# Collapsible (für Accordion)
npm install react-native-collapsible

# Bottom Sheet
npm install @gorhom/bottom-sheet

# Haptics (für Vibration)
npm install expo-haptics

# Clipboard
npm install @react-native-clipboard/clipboard

# Für iOS (falls nötig)
cd ios && pod install
```

---

## 🔧 Konfiguration

### 1. API Base URL anpassen

Der Screen nutzt relative Pfade (`/api/...`). Stelle sicher, dass deine API-Base-URL korrekt ist:

```javascript
// In ColdCallAssistantScreen.js, füge eine Konstante hinzu:
const API_BASE = 'http://localhost:8000'; // Oder deine Backend-URL

// Dann in apiFetch():
const res = await fetch(`${API_BASE}${path}`, {
  // ...
});
```

### 2. Supabase Client Pfad prüfen

Stelle sicher, dass der Import-Pfad korrekt ist:

```javascript
import { supabaseClient } from '@/lib/supabaseClient';
// Oder falls anders:
// import { supabaseClient } from '../../lib/supabaseClient';
```

---

## 🎯 Features

Der Screen enthält:

1. **3 Tabs:**
   - **Kontakte:** Liste mit Search, Pull-to-Refresh
   - **Script:** Script-Generator, Timer, Call-Controls, Accordion, Notizen
   - **Sessions:** Session-Liste mit History

2. **Timer-Komponente:**
   - Zeigt Call-Dauer während Live-Call oder Übung
   - Format: `MM:SS` oder `HH:MM:SS`

3. **Script-Accordion:**
   - Expandable Sections (Opener, Objection Response, Close)
   - Copy-to-Clipboard für jeden Abschnitt
   - Tips pro Section

4. **Einwand-Bottom-Sheet:**
   - Einwand-Bibliothek
   - Antworten anzeigen
   - Copy-to-Clipboard

5. **Session-Management:**
   - Live-Call oder Übungsmodus starten
   - Session abschließen mit Notizen
   - Session-History

6. **Haptics:**
   - Vibration bei Actions (Start Call, Copy, etc.)

---

## 🔌 API-Endpoints

Der Screen nutzt folgende Endpoints:

- `GET /api/contacts?per_page=100` - Kontakte laden
- `POST /api/cold-call/generate-script/{contact_id}?goal=...` - Script generieren
- `GET /api/cold-call/sessions` - Sessions laden
- `POST /api/cold-call/session` - Session erstellen
- `POST /api/cold-call/session/{id}/start` - Session starten
- `POST /api/cold-call/session/{id}/complete` - Session abschließen

---

## 🧭 Navigation Integration

Füge den Screen zur Navigation hinzu:

```typescript
// In deiner Navigation-Datei (z.B. AppNavigator.tsx)
import ColdCallAssistantScreen from '../screens/main/ColdCallAssistantScreen';

// In deinem Navigator:
<Stack.Screen 
  name="ColdCallAssistant" 
  component={ColdCallAssistantScreen}
  options={{ title: 'Cold Call' }}
/>
```

Oder als Bottom Tab:

```typescript
<Tab.Screen 
  name="ColdCall" 
  component={ColdCallAssistantScreen}
  options={{
    tabBarIcon: ({ color }) => <Icon name="phone" size={24} color={color} />,
    tabBarLabel: 'Cold Call',
  }}
/>
```

---

## ⚠️ Wichtige Hinweise

### 1. BottomSheetModalProvider

Der Screen ist bereits mit `<BottomSheetModalProvider>` gewrappt. Stelle sicher, dass dieser Provider **nicht doppelt** in deiner App verwendet wird.

### 2. Material Top Tabs

Für Material Top Tabs benötigst du `react-native-tab-view`. Stelle sicher, dass es installiert ist:

```bash
npm install react-native-tab-view
```

### 3. Haptics (Expo)

Falls du **nicht** Expo verwendest, musst du `expo-haptics` durch eine alternative Lösung ersetzen:

```javascript
// Alternative für React Native CLI:
import { Platform, Vibration } from 'react-native';

const triggerHaptic = () => {
  if (Platform.OS === 'ios') {
    // iOS Haptics
  } else {
    Vibration.vibrate(10);
  }
};
```

### 4. API-Base-URL

Der Code nutzt relative Pfade. Passe die `apiFetch` Funktion an:

```javascript
const apiFetch = useCallback(
  async (path, options = {}) => {
    if (!accessToken) throw new Error("No access token");
    
    // API Base URL hinzufügen
    const fullPath = path.startsWith('http') ? path : `${API_BASE}${path}`;
    
    const res = await fetch(fullPath, {
      // ...
    });
    // ...
  },
  [accessToken]
);
```

---

## ✅ Checkliste

- [ ] Dependencies installiert
- [ ] API Base URL konfiguriert
- [ ] Supabase Client Pfad korrekt
- [ ] Navigation hinzugefügt
- [ ] BottomSheetModalProvider nicht doppelt
- [ ] Haptics funktioniert (oder alternative implementiert)
- [ ] Screen getestet

---

## 🐛 Troubleshooting

### Problem: Bottom Sheet öffnet nicht
- Prüfe, ob `@gorhom/bottom-sheet` korrekt installiert ist
- Stelle sicher, dass `BottomSheetModalProvider` vorhanden ist

### Problem: Tabs funktionieren nicht
- Prüfe, ob `@react-navigation/material-top-tabs` und `react-native-tab-view` installiert sind
- Für iOS: `cd ios && pod install`

### Problem: Haptics funktioniert nicht
- Prüfe, ob `expo-haptics` installiert ist
- Falls nicht Expo: Nutze alternative Lösung (siehe oben)

### Problem: API-Calls schlagen fehl
- Prüfe API Base URL
- Prüfe Access Token (Supabase Session)
- Prüfe Backend-Endpoints

---

**Der Screen ist bereit! 🚀**

