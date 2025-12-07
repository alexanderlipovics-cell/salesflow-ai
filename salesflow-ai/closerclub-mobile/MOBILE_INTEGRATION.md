# 📱 Mobile App Integration - CloserClub

## ✅ Navigation integriert

Die Navigation wurde erfolgreich in `closerclub-mobile` integriert:

1. ✅ `src/navigation/MainTabNavigator.tsx` - Bottom Tab Navigator erstellt
2. ✅ `src/navigation/AppNavigator.tsx` - Aktualisiert, nutzt jetzt MainTabNavigator
3. ✅ `src/types/navigation.ts` - Navigation Types erweitert

---

## 📦 Fehlende Dependencies

Die folgenden Pakete müssen installiert werden:

**WICHTIG:** Da das Projekt `@react-navigation/native@6.1.18` verwendet, müssen wir die **Version 6** von `@react-navigation/bottom-tabs` installieren (nicht Version 7):

```bash
cd closerclub-mobile
npm install @react-navigation/bottom-tabs@^6.5.20
npm install @react-navigation/material-top-tabs@^6.6.5
npm install react-native-gesture-handler
npm install @react-native-community/datetimepicker
npm install @react-native-clipboard/clipboard
npm install react-native-collapsible
npm install @gorhom/bottom-sheet
npm install react-native-chart-kit
npm install @react-native-segmented-control/segmented-control
npm install react-native-confetti-cannon
```

**Oder alle auf einmal:**
```bash
npm install @react-navigation/bottom-tabs@^6.5.20 @react-navigation/material-top-tabs@^6.6.5 react-native-gesture-handler @react-native-community/datetimepicker @react-native-clipboard/clipboard react-native-collapsible @gorhom/bottom-sheet react-native-chart-kit @react-native-segmented-control/segmented-control react-native-confetti-cannon
```

---

## 📁 Screens kopieren

Die folgenden Screens müssen aus dem Hauptprojekt in `closerclub-mobile/src/screens/main/` kopiert werden:

1. `CommissionTrackerScreen.tsx` (aus `src/screens/main/`)
2. `ColdCallAssistantScreen.js` (aus `src/screens/main/`)
3. `ClosingCoachScreen.tsx` (aus `src/screens/main/`)
4. `PerformanceInsightsScreen.js` (aus `src/screens/main/`)
5. `GamificationScreen.js` (aus `src/screens/main/`)

### Import-Anpassungen

Nach dem Kopieren müssen folgende Imports angepasst werden:

**In allen Screens:**
- `@/lib/supabaseClient` → `../../config/supabase` (importiere `supabaseClient`)
- `react-native-vector-icons/MaterialCommunityIcons` → `@expo/vector-icons` (importiere `MaterialCommunityIcons`)

**Beispiel:**
```typescript
// Alt:
import { supabaseClient } from '@/lib/supabaseClient';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

// Neu:
import { supabaseClient } from '../../config/supabase';
import { MaterialCommunityIcons } from '@expo/vector-icons';
```

**Spezifische Anpassungen:**

**CommissionTrackerScreen.tsx:**
- `react-native-vector-icons/MaterialCommunityIcons` → `@expo/vector-icons`
- `@react-native-community/datetimepicker` → muss installiert werden

**ColdCallAssistantScreen.js:**
- `@/lib/supabaseClient` → `../../config/supabase`
- `@gorhom/bottom-sheet` → muss installiert werden
- `@react-native-clipboard/clipboard` → muss installiert werden
- `react-native-collapsible` → muss installiert werden

**ClosingCoachScreen.tsx:**
- `react-native-vector-icons/MaterialCommunityIcons` → `@expo/vector-icons`
- `@react-native-clipboard/clipboard` → muss installiert werden
- `react-native-collapsible` → muss installiert werden

**PerformanceInsightsScreen.js:**
- `@/lib/supabaseClient` → `../../config/supabase`
- `react-native-chart-kit` → muss installiert werden
- `@react-native-segmented-control/segmented-control` → muss installiert werden

**GamificationScreen.js:**
- `@/lib/supabaseClient` → `../../config/supabase`
- `react-native-confetti-cannon` → muss installiert werden

---

## 🚀 Nächste Schritte

1. **Dependencies installieren:**
   ```bash
   cd closerclub-mobile
   npm install @react-navigation/bottom-tabs@^6.5.20 @react-navigation/material-top-tabs@^6.6.5 react-native-gesture-handler @react-native-community/datetimepicker @react-native-clipboard/clipboard react-native-collapsible @gorhom/bottom-sheet react-native-chart-kit @react-native-segmented-control/segmented-control react-native-confetti-cannon
   ```
   
   **Hinweis:** Falls weiterhin Konflikte auftreten, verwende:
   ```bash
   npm install --legacy-peer-deps
   ```

2. **Screens-Verzeichnis erstellen:**
   ```bash
   mkdir -p src/screens/main
   ```

3. **Screens kopieren und Imports anpassen:**
   - Kopiere die 5 Screens aus `src/screens/main/` (Hauptprojekt)
   - Passe die Imports wie oben beschrieben an

4. **Supabase-Client prüfen:**
   - Stelle sicher, dass `src/config/supabase.ts` den `supabaseClient` exportiert
   - Falls nicht, passe die Screens entsprechend an

5. **Testen:**
   ```bash
   npm start
   ```

---

## 📋 Checkliste

- [x] MainTabNavigator.tsx erstellt
- [x] AppNavigator.tsx aktualisiert
- [x] Navigation Types erweitert
- [ ] Dependencies installiert
- [ ] Screens-Verzeichnis erstellt (`src/screens/main/`)
- [ ] Screens kopiert
- [ ] Imports angepasst
- [ ] Supabase-Client geprüft
- [ ] App getestet

---

## 🐛 Troubleshooting

### Problem: "Cannot find module '@expo/vector-icons'"
- Lösung: `@expo/vector-icons` ist bereits in `package.json` vorhanden, sollte funktionieren

### Problem: "Cannot find module '../../config/supabase'"
- Lösung: Prüfe, ob `src/config/supabase.ts` existiert und `supabaseClient` exportiert

### Problem: "Bottom Tab Navigator zeigt keine Screens"
- Lösung: Prüfe, ob alle Screen-Imports korrekt sind und die Screens existieren

---

**Die Navigation ist bereit! Jetzt nur noch Screens kopieren und Dependencies installieren.** 🎉

