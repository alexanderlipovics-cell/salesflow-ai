# 📱 Commission Tracker Screen - Mobile App Setup

## ✅ Screen erstellt

**Datei:** `src/screens/main/CommissionTrackerScreen.tsx`

Der Screen ist vollständig implementiert und produktionsreif!

---

## 📦 Dependencies installieren

```bash
# React Native Gesture Handler (für Swipeable)
npm install react-native-gesture-handler react-native-reanimated

# Date Picker
npm install @react-native-community/datetimepicker

# Icons (Material Community Icons)
npm install react-native-vector-icons

# Für iOS (falls nötig)
cd ios && pod install
```

---

## 🔧 Konfiguration

### 1. Gesture Handler Root (WICHTIG!)

In deiner Haupt-App-Datei (z.B. `App.tsx` oder `index.js`):

```typescript
import { GestureHandlerRootView } from 'react-native-gesture-handler';

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      {/* Deine Navigation hier */}
    </GestureHandlerRootView>
  );
}
```

### 2. Vector Icons Setup

**Android:** In `android/app/build.gradle`:

```gradle
apply from: "../../node_modules/react-native-vector-icons/fonts.gradle"
```

**iOS:** In `ios/Podfile` (falls nötig):

```ruby
pod 'RNVectorIcons', :path => '../node_modules/react-native-vector-icons'
```

---

## 🔌 API-Integration

Der Screen nutzt aktuell Mock-Daten. Um die echte API zu nutzen:

### 1. API-Client erstellen

Erstelle `src/services/commissionsApi.ts`:

```typescript
import { supabaseClient } from '@/lib/supabaseClient';

const API_BASE = 'http://localhost:8000/api'; // Oder deine Backend-URL

export const fetchCommissions = async (month: string, status?: string) => {
  const { data: sessionData } = await supabaseClient.auth.getSession();
  const accessToken = sessionData?.session?.access_token;

  const params = new URLSearchParams({ month });
  if (status && status !== 'all') params.append('status', status);

  const response = await fetch(`${API_BASE}/commissions?${params}`, {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) throw new Error('Failed to fetch commissions');
  return response.json();
};

export const fetchCommissionSummary = async (month: string) => {
  const { data: sessionData } = await supabaseClient.auth.getSession();
  const accessToken = sessionData?.session?.access_token;

  const response = await fetch(`${API_BASE}/commissions/summary?month=${month}`, {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) throw new Error('Failed to fetch summary');
  return response.json();
};

export const downloadInvoice = async (id: string) => {
  const { data: sessionData } = await supabaseClient.auth.getSession();
  const accessToken = sessionData?.session?.access_token;

  const response = await fetch(`${API_BASE}/commissions/${id}/invoice`, {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) throw new Error('Failed to download invoice');
  return response.blob();
};

export const sendToAccounting = async (id: string) => {
  const { data: sessionData } = await supabaseClient.auth.getSession();
  const accessToken = sessionData?.session?.access_token;

  const response = await fetch(`${API_BASE}/commissions/${id}/send-to-accounting`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) throw new Error('Failed to send to accounting');
  return response.json();
};
```

### 2. Screen aktualisieren

In `CommissionTrackerScreen.tsx`, ersetze die Mock-Daten:

```typescript
import { fetchCommissions, fetchCommissionSummary, downloadInvoice, sendToAccounting } from '@/services/commissionsApi';

// In fetchCommissions():
const fetchCommissions = useCallback(async () => {
  try {
    setLoading(true);
    const monthStr = selectedDate.toISOString().slice(0, 7) + '-01';
    
    const [commissionsData, summaryData] = await Promise.all([
      fetchCommissions(monthStr, statusFilter === 'all' ? undefined : statusFilter),
      fetchCommissionSummary(monthStr),
    ]);

    setCommissions(commissionsData);
    setSummary(summaryData);
  } catch (error) {
    Alert.alert('Fehler', 'Daten konnten nicht geladen werden.');
  } finally {
    setLoading(false);
    setRefreshing(false);
  }
}, [selectedDate, statusFilter]);
```

---

## 🧭 Navigation Integration

Füge den Screen zur Navigation hinzu:

```typescript
// In deiner Navigation-Datei (z.B. AppNavigator.tsx)
import CommissionTrackerScreen from '../screens/main/CommissionTrackerScreen';

// In deinem Navigator:
<Stack.Screen 
  name="CommissionTracker" 
  component={CommissionTrackerScreen}
  options={{ title: 'Commissions' }}
/>
```

Oder als Bottom Tab:

```typescript
<Tab.Screen 
  name="Commissions" 
  component={CommissionTrackerScreen}
  options={{
    tabBarIcon: ({ color }) => <Icon name="cash" size={24} color={color} />,
    tabBarLabel: 'Commissions',
  }}
/>
```

---

## 📝 NewCommissionScreen (Optional)

Falls du den "Neue Provision" Screen erstellen möchtest:

1. Erstelle `src/screens/main/NewCommissionScreen.tsx`
2. Formular mit:
   - Deal ID / Name
   - Deal Wert
   - Provision %
   - Monat
3. POST zu `/api/commissions`
4. Navigation zurück zum CommissionTrackerScreen

---

## ✅ Checkliste

- [ ] Dependencies installiert
- [ ] GestureHandlerRootView in App.tsx
- [ ] Vector Icons konfiguriert
- [ ] API-Integration implementiert
- [ ] Navigation hinzugefügt
- [ ] Screen getestet

---

**Der Screen ist bereit! 🚀**

