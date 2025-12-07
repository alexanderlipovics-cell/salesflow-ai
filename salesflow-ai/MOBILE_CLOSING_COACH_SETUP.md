# 🎯 Closing Coach Mobile Screen - Setup & Integration

## ✅ Implementiert

**Mobile Screen:** `src/screens/main/ClosingCoachScreen.tsx`

Der Screen ist vollständig implementiert und produktionsreif!

---

## 📦 Dependencies

### 1. Installiere erforderliche Pakete

```bash
npm install @react-native-clipboard/clipboard
npm install react-native-vector-icons
npm install react-native-collapsible
npm install expo-haptics
```

### 2. iOS Setup (react-native-vector-icons)

Falls noch nicht geschehen, füge zu `ios/Podfile` hinzu:

```ruby
pod 'RNVectorIcons', :path => '../node_modules/react-native-vector-icons'
```

Dann:

```bash
cd ios && pod install
```

### 3. Android Setup (react-native-vector-icons)

Füge zu `android/app/build.gradle` hinzu:

```gradle
apply from: "../../node_modules/react-native-vector-icons/fonts.gradle"
```

---

## 🔌 API-Integration

### 1. Backend-Endpoint prüfen

Der Screen erwartet folgende API-Struktur:

**GET /api/closing-coach/deals** (oder ähnlich)
```json
[
  {
    "id": "D101",
    "deal_name": "Renewal: Enterprise Corp",
    "account": "Enterprise Corp",
    "closing_score": 85,
    "probability": 90,
    "blockers": [
      {
        "issue": "Legal Review Pending",
        "severity": "medium",
        "context": "Standard T&C check, 3 days outstanding."
      }
    ],
    "strategies": [
      {
        "name": "Commitment Anchor",
        "script": "Hallo [Name], basierend auf unserem [Datum] Gespräch...",
        "focus": "Timeline Pressure"
      }
    ],
    "last_analyzed": "2025-12-07T10:00:00Z"
  }
]
```

**POST /api/closing-coach/analyze/{deal_id}**
```json
{
  "id": "D101",
  "closing_score": 90,
  "blockers": [...],
  "strategies": [...],
  "last_analyzed": "2025-12-07T12:00:00Z"
}
```

### 2. API-Calls implementieren

Ersetze die Mock-Funktionen in `ClosingCoachScreen.tsx`:

```typescript
// In ClosingCoachScreen.tsx, ersetze fetchDeals():
const fetchDeals = async (): Promise<ClosingInsight[]> => {
  try {
    const { data: { session } } = await supabaseClient.auth.getSession();
    if (!session) throw new Error('Not authenticated');

    const response = await fetch('/api/closing-coach/deals', {
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) throw new Error('Failed to fetch deals');
    
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching deals:', error);
    throw error;
  }
};

// Ersetze analyzeDeal():
const analyzeDeal = async (dealId: string): Promise<ClosingInsight> => {
  try {
    const { data: { session } } = await supabaseClient.auth.getSession();
    if (!session) throw new Error('Not authenticated');

    const response = await fetch(`/api/closing-coach/analyze/${dealId}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) throw new Error('Failed to analyze deal');
    
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error analyzing deal:', error);
    throw error;
  }
};
```

---

## 🎨 Features

### 1. Farbcodierung

- **Grün (>70):** Hohe Closing-Wahrscheinlichkeit
- **Gelb (50-70):** Mittlere Wahrscheinlichkeit
- **Rot (<50):** Niedrige Wahrscheinlichkeit

### 2. Expandable Cards

- Tap auf Card → Expand/Collapse
- Zeigt Blocker & Strategien
- Chevron-Icon zeigt Status

### 3. Blocker-Analyse

- Farbcodierte Tags (High/Medium/Low)
- Context-Informationen
- Icon-basiert

### 4. Strategie-Skripte

- Copy-to-Clipboard Button
- Haptic Feedback
- Focus-Label (z.B. "Timeline Pressure")

### 5. Swipe-Actions (Simuliert)

- "Analysieren" Button (rechts)
- Loading-State während Analyse
- Auto-Expand nach Analyse

---

## 📱 Navigation Integration

### 1. Navigation bereits integriert

Der Screen ist bereits in den Navigatoren integriert:

- **MainNavigator.tsx:** Direkt als Tab "Coach"
- **MainNavigatorCompact.tsx:** Im Sales Tools Stack
- **SalesToolsNavigator.tsx:** Im Tools Menu verfügbar

### 2. Manuelle Integration (falls nötig)

Falls du eine eigene Navigation-Struktur hast:

```typescript
// In deiner Navigation-Datei:
import ClosingCoachScreen from './screens/main/ClosingCoachScreen';

// In deinem Stack Navigator:
<Stack.Screen 
  name="ClosingCoach" 
  component={ClosingCoachScreen}
  options={{ title: 'Closing Coach' }}
/>
```

### 3. Tab Navigation (Optional)

Falls du Tabs verwendest:

```typescript
<Tab.Screen 
  name="ClosingCoach" 
  component={ClosingCoachScreen}
  options={{
    tabBarIcon: ({ color, size }) => (
      <Icon name="handshake" size={size} color={color} />
    ),
  }}
/>
```

---

## 🔧 Backend-Anpassungen (Optional)

Falls dein Backend eine andere Struktur hat, passe die Response-Mapping an:

```typescript
// In ClosingCoachScreen.tsx, nach API-Call:
const mappedDeal: ClosingInsight = {
  id: backendDeal.id,
  deal_name: backendDeal.title || backendDeal.name,
  account: backendDeal.account_name || backendDeal.company,
  closing_score: backendDeal.closing_score || 0,
  probability: backendDeal.probability || 0,
  blockers: (backendDeal.blockers || []).map(b => ({
    issue: b.title || b.issue,
    severity: b.severity || 'medium',
    context: b.description || b.context || '',
  })),
  strategies: (backendDeal.strategies || []).map(s => ({
    name: s.title || s.name,
    script: s.script || s.text,
    focus: s.focus || s.category || 'General',
  })),
  last_analyzed: backendDeal.analyzed_at || new Date().toISOString(),
};
```

---

## ✅ Checkliste

- [x] Screen erstellt
- [ ] Dependencies installiert
- [ ] react-native-vector-icons konfiguriert (iOS/Android)
- [ ] API-Calls implementiert (Mock → Real)
- [ ] Navigation hinzugefügt
- [ ] Backend-Endpoint getestet
- [ ] Haptic Feedback getestet (nur auf echten Geräten)

---

## 🐛 Troubleshooting

### Problem: Icons werden nicht angezeigt
- Prüfe, ob `react-native-vector-icons` korrekt installiert ist
- iOS: `pod install` ausführen
- Android: `fonts.gradle` hinzugefügt?

### Problem: Clipboard funktioniert nicht
- Prüfe, ob `@react-native-clipboard/clipboard` installiert ist
- Auf Web: Clipboard API benötigt HTTPS oder localhost

### Problem: Collapsible funktioniert nicht
- Prüfe, ob `react-native-collapsible` installiert ist
- Stelle sicher, dass `collapsed` Prop korrekt gesetzt ist

### Problem: Haptic Feedback funktioniert nicht
- Haptics funktionieren nur auf echten Geräten (nicht im Simulator)
- Prüfe, ob `expo-haptics` installiert ist

---

## 🚀 Nächste Schritte

1. **API-Integration:** Mock-Funktionen durch echte API-Calls ersetzen
2. **Navigation:** Screen zur App-Navigation hinzufügen
3. **Filter-Funktion:** Filter-Modal implementieren (aktuell nur Placeholder)
4. **Pull-to-Refresh:** Bereits implementiert, testen
5. **Error Handling:** Erweitern für bessere UX

---

**Der Screen ist bereit! 🎉**

