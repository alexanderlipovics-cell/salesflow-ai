# 🤖 LLM-Prompts für Mobile App (React Native)

Diese Prompts kannst du an **GPT, Claude oder Gemini** geben, um die fehlenden Mobile Screens zu erstellen.

**Wichtig:** Die Mobile App nutzt React Native, nicht React Web!

---

## 📋 Prompt 1: Commission Tracker Screen (Mobile)

```
Du bist ein Senior React Native Entwickler. Erstelle einen Mobile Screen für "Commission Tracker".

KONTEXT:
- Framework: React Native (nicht React Web!)
- Navigation: React Navigation (vermutlich)
- API: FastAPI Backend auf /api/commissions
- Styling: StyleSheet oder styled-components
- State: React Hooks (useState, useEffect)

ANFORDERUNGEN:
1. Erstelle eine Screen-Komponente: `src/screens/main/CommissionTrackerScreen.js` oder `.tsx`
2. Die Screen soll:
   - Monatsübersicht anzeigen (GET /api/commissions?month=YYYY-MM-01)
   - Summary Cards: Gesamt Brutto, Netto, Steuer, Offene Provisionen
   - Liste aller Provisionen mit: Deal, Dealwert, Provision %, Betrag, Status
   - Filter: Nach Monat (DatePicker), Status (Dropdown)
   - Pull-to-Refresh
   - Loading-States
   - Error-Handling

3. API-Struktur:
   - GET /api/commissions?month=YYYY-MM-01&status=... → List[Commission]
   - GET /api/commissions/summary?month=YYYY-MM-01 → CommissionSummary
   - POST /api/commissions → Commission
   - GET /api/commissions/{id}/invoice → PDF (Blob)
   - POST /api/commissions/{id}/send-to-accounting → Email

4. Design:
   - Mobile-optimiert (ScrollView)
   - Summary Cards oben (horizontal scrollbar)
   - Liste darunter (FlatList)
   - Status-Badges: Rot (overdue), Gelb (pending), Grün (paid)
   - Swipe-Actions: PDF-Download, "An Buchhaltung senden"
   - FAB (Floating Action Button) für "Neue Provision"

5. Nutze bestehende Patterns aus dem Codebase:
   - API-Calls: fetch() mit Supabase Auth Token
   - Navigation: useNavigation() Hook
   - Styling: StyleSheet.create() oder ähnlich
   - Components: Nutze bestehende UI-Komponenten falls vorhanden

6. Mobile-spezifische Features:
   - Pull-to-Refresh
   - Bottom Sheet für Filter
   - DatePicker für Monatsauswahl
   - Share-Funktion für PDF

ERSTELLE:
- Vollständigen React Native Code
- Alle notwendigen Imports
- Type-Definitionen (falls TypeScript)
- Kommentare für komplexe Logik
- Mobile-optimierte UI
```

---

## 📋 Prompt 2: Cold Call Assistant Screen (Mobile)

```
Du bist ein Senior React Native Entwickler. Erstelle einen Mobile Screen für "Cold Call Assistant".

KONTEXT:
- Framework: React Native
- Navigation: React Navigation
- API: FastAPI Backend auf /api/cold-call
- Styling: StyleSheet
- Auth: Supabase Auth (getSession() für Token)

ANFORDERUNGEN:
1. Erstelle: `src/screens/main/ColdCallAssistantScreen.js`
2. Features:
   - Kontakt-Auswahl (Liste mit Search)
   - Script-Generator: Kontakt auswählen → Script generieren
   - Session-Manager: Live-Call oder Übungsmodus starten
   - Timer während Call
   - Notizen während Call
   - Einwand-Bibliothek (Dropdown)
   - Copy-to-Clipboard für Scripts

3. API-Struktur:
   - GET /api/contacts?per_page=100 → { items: List[Contact] }
   - POST /api/cold-call/generate-script/{contact_id}?goal=... → PersonalizedScript
   - POST /api/cold-call/session → ColdCallSession
   - GET /api/cold-call/sessions → List[ColdCallSession]
   - POST /api/cold-call/session/{id}/start → Session starten
   - POST /api/cold-call/session/{id}/complete → Session abschließen

4. Design (Mobile-optimiert):
   - Tab-Navigation: "Kontakte", "Script", "Sessions" (createMaterialTopTabNavigator)
   - Kontakt-Liste: SearchBar oben, FlatList
   - Script-View: ScrollView mit Sections (Accordion mit react-native-collapsible)
   - Timer: Prominent oben während Call (große Anzeige)
   - Notizen: TextInput während Call (multiline)
   - Bottom Sheet für Einwand-Bibliothek (@gorhom/bottom-sheet)

5. Code-Struktur:
   ```javascript
   import React, { useState, useEffect } from 'react';
   import { View, Text, StyleSheet, ScrollView, FlatList, TextInput } from 'react-native';
   import { createMaterialTopTabNavigator } from '@react-navigation/material-top-tabs';
   import { supabaseClient } from '@/lib/supabaseClient';
   
   const Tab = createMaterialTopTabNavigator();
   
   function ContactsTab() {
     // Kontakt-Liste mit Search
   }
   
   function ScriptTab() {
     // Script-Anzeige mit Accordion
   }
   
   function SessionsTab() {
     // Session-Liste
   }
   
   export default function ColdCallAssistantScreen() {
     return (
       <Tab.Navigator>
         <Tab.Screen name="Kontakte" component={ContactsTab} />
         <Tab.Screen name="Script" component={ScriptTab} />
         <Tab.Screen name="Sessions" component={SessionsTab} />
       </Tab.Navigator>
     );
   }
   ```

6. Mobile-spezifische Features:
   - Haptic Feedback bei Actions (expo-haptics)
   - Voice-to-Text für Notizen (optional, expo-speech)
   - Share Script per WhatsApp/Email (expo-sharing)
   - Clipboard: @react-native-clipboard/clipboard

ERSTELLE:
- Vollständigen React Native Code
- Tab-Navigation
- Timer-Komponente
- Mobile-optimierte UI
- Pull-to-Refresh
```

---

## 📋 Prompt 3: Closing Coach Screen (Mobile)

```
Du bist ein Senior React Native Entwickler. Erstelle einen Mobile Screen für "Closing Coach".

KONTEXT:
- Framework: React Native
- Navigation: React Navigation
- API: FastAPI Backend auf /api/closing-coach
- Styling: StyleSheet
- Auth: Supabase Auth

ANFORDERUNGEN:
1. Erstelle: `src/screens/main/ClosingCoachScreen.js`
2. Features:
   - Deal-Liste mit Closing-Score
   - Farbcodierung: Rot (<50), Gelb (50-70), Grün (>70)
   - Blocker-Anzeige mit Severity
   - Empfohlene Closing-Strategien
   - Copy-to-Clipboard für Scripts
   - "Analysieren" Button pro Deal

3. API-Struktur:
   - GET /api/closing-coach/my-deals → List[ClosingInsight]
   - POST /api/closing-coach/analyze/{deal_id} → ClosingInsight

4. Design (Mobile-optimiert):
   - Deal-Cards in FlatList
   - Score-Badge oben rechts (farbcodiert)
   - Expandable Cards: Tap to expand → Zeige Blocker & Strategien
   - Swipe-Actions: "Analysieren", "Details" (react-native-swipeable)
   - Pull-to-Refresh
   - Filter: Nach Score, Probability (Modal)

5. Code-Struktur:
   ```javascript
   import React, { useState, useEffect } from 'react';
   import { View, Text, StyleSheet, FlatList, TouchableOpacity, Animated } from 'react-native';
   import { supabaseClient } from '@/lib/supabaseClient';
   import Collapsible from 'react-native-collapsible';
   
   export default function ClosingCoachScreen() {
     const [deals, setDeals] = useState([]);
     const [expandedId, setExpandedId] = useState(null);
     
     const toggleExpand = (id) => {
       setExpandedId(expandedId === id ? null : id);
     };
     
     return (
       <FlatList
         data={deals}
         renderItem={({ item }) => (
           <TouchableOpacity onPress={() => toggleExpand(item.id)}>
             <View style={[styles.card, getScoreColor(item.closing_score)]}>
               <Text>{item.deal_name}</Text>
               <Text>Score: {item.closing_score}</Text>
               <Collapsible collapsed={expandedId !== item.id}>
                 {/* Blocker & Strategien */}
               </Collapsible>
             </View>
           </TouchableOpacity>
         )}
       />
     );
   }
   ```

6. Mobile-spezifische Features:
   - Expandable Cards (react-native-collapsible)
   - Haptic Feedback (expo-haptics)
   - Share Script (expo-sharing)
   - Clipboard (@react-native-clipboard/clipboard)

ERSTELLE:
- Vollständigen React Native Code
- Expandable Cards
- Mobile-optimierte UI
- Smooth Animations
```

---

## 📋 Prompt 4: Performance Insights Screen (Mobile)

```
Du bist ein Senior React Native Entwickler. Erstelle einen Mobile Screen für "Performance Insights".

KONTEXT:
- Framework: React Native
- Navigation: React Navigation
- API: FastAPI Backend auf /api/performance-insights
- Charts: react-native-chart-kit oder victory-native (falls vorhanden, sonst einfache Visualisierung)
- Auth: Supabase Auth

ANFORDERUNGEN:
1. Erstelle: `src/screens/main/PerformanceInsightsScreen.js`
2. Features:
   - Period-Auswahl: Monat, Quartal, Jahr (Segmented Control)
   - KPI-Cards: Revenue, Calls, Deals, Conversion (mit Trend)
   - Charts: Calls/Deals über Zeit (Line Chart)
   - Issue-Detection: Erkannte Probleme mit Severity
   - AI-Empfehlungen: Action Items

3. API-Struktur:
   - POST /api/performance-insights/analyze?period_start=...&period_end=... → PerformanceInsight
   - GET /api/performance-insights/my-insights → List[PerformanceInsight]

4. Design (Mobile-optimiert):
   - ScrollView für gesamten Content
   - KPI-Cards oben (horizontal scrollbar mit ScrollView horizontal)
   - Chart in der Mitte (oder einfache Visualisierung ohne Library)
   - Issues & Recommendations unten
   - Period-Picker oben (Segmented Control oder Picker)

5. Code-Struktur:
   ```javascript
   import React, { useState, useEffect } from 'react';
   import { View, Text, StyleSheet, ScrollView } from 'react-native';
   import { SegmentedControlIOS } from 'react-native'; // oder @react-native-segmented-control/segmented-control
   import { supabaseClient } from '@/lib/supabaseClient';
   
   export default function PerformanceInsightsScreen() {
     const [period, setPeriod] = useState('month');
     const [data, setData] = useState(null);
     
     return (
       <ScrollView style={styles.container}>
         <SegmentedControlIOS
           values={['Monat', 'Quartal', 'Jahr']}
           selectedIndex={0}
           onChange={(event) => {
             setPeriod(['month', 'quarter', 'year'][event.nativeEvent.selectedSegmentIndex]);
           }}
         />
         {/* KPI Cards */}
         {/* Chart */}
         {/* Issues & Recommendations */}
       </ScrollView>
     );
   }
   ```

6. Mobile-spezifische Features:
   - Horizontal scrollbare KPI-Cards
   - Touch-optimierte Charts (oder einfache Visualisierung)
   - Swipe zwischen Perioden (optional)
   - Share Report (expo-sharing)

ERSTELLE:
- Vollständigen React Native Code
- Chart-Integration (oder einfache Visualisierung)
- Mobile-optimierte UI
- Smooth Scrolling
```

---

## 📋 Prompt 5: Gamification Screen (Mobile)

```
Du bist ein Senior React Native Entwickler. Erstelle einen Mobile Screen für "Gamification".

KONTEXT:
- Framework: React Native
- Navigation: React Navigation
- API: FastAPI Backend auf /api/gamification
- Animationen: Animated API (built-in) oder react-native-reanimated
- Auth: Supabase Auth

ANFORDERUNGEN:
1. Erstelle: `src/screens/main/GamificationScreen.js`
2. Features:
   - Streak-Anzeige: Aktueller Streak, Längster Streak
   - Achievements: Liste mit Progress-Bars
   - Leaderboard: Top-Performer
   - Daily Tasks: Checkboxen mit XP-Belohnung
   - Celebration-Animation bei Achievement-Freischaltung

3. API-Struktur:
   - GET /api/gamification/achievements → List[Achievement]
   - GET /api/gamification/daily-activities?days=7 → List[DailyActivity]
   - POST /api/gamification/daily-activities/track → DailyActivity
   - GET /api/gamification/leaderboard → List[LeaderboardEntry]

4. Design (Mobile-optimiert):
   - Hero-Section: Streak groß anzeigen (mit Animation)
   - Tab-Navigation: "Achievements", "Leaderboard", "Daily Tasks" (createMaterialTopTabNavigator)
   - Achievement-Cards: Icon (Emoji), Name, Progress-Bar
   - Leaderboard: Rank, Avatar (Initials), Points, Trend
   - Daily Tasks: Checkboxen mit XP

5. Code-Struktur:
   ```javascript
   import React, { useState, useEffect } from 'react';
   import { View, Text, StyleSheet, Animated, TouchableOpacity } from 'react-native';
   import { createMaterialTopTabNavigator } from '@react-navigation/material-top-tabs';
   import { supabaseClient } from '@/lib/supabaseClient';
   
   const Tab = createMaterialTopTabNavigator();
   
   function AchievementsTab() {
     // Achievement-Liste mit Progress-Bars
   }
   
   function LeaderboardTab() {
     // Leaderboard
   }
   
   function DailyTasksTab() {
     // Daily Tasks
   }
   
   export default function GamificationScreen() {
     const [streak, setStreak] = useState(0);
     const fadeAnim = new Animated.Value(0);
     
     return (
       <View style={styles.container}>
         <Animated.View style={[styles.hero, { opacity: fadeAnim }]}>
           <Text style={styles.streakNumber}>{streak}</Text>
           <Text>🔥 Tage Streak</Text>
         </Animated.View>
         <Tab.Navigator>
           <Tab.Screen name="Achievements" component={AchievementsTab} />
           <Tab.Screen name="Leaderboard" component={LeaderboardTab} />
           <Tab.Screen name="Daily Tasks" component={DailyTasksTab} />
         </Tab.Navigator>
       </View>
     );
   }
   ```

6. Mobile-spezifische Features:
   - Haptic Feedback (expo-haptics)
   - Confetti-Animation (einfache Animated-Animation oder react-native-confetti-cannon)
   - Pull-to-Refresh
   - Share Achievement (expo-sharing)

ERSTELLE:
- Vollständigen React Native Code
- Tab-Navigation
- Animationen (Animated API)
- Mobile-optimierte UI
- Celebration-Effekte
```

---

## 📋 Prompt 6: Navigation Integration (Mobile)

```
Du bist ein Senior React Native Entwickler. Integriere die neuen Screens in die Mobile App Navigation.

KONTEXT:
- Navigation: React Navigation
- Screens: In `src/screens/main/` gespeichert
- Bestehende Screens: ChatScreen, LeadsScreen, DashboardScreen, etc.

ANFORDERUNGEN:
1. Finde die Haupt-Navigation-Datei (vermutlich in `src/navigation/` oder `App.js` im Root)
2. Füge die 5 neuen Screens hinzu:
   - CommissionTrackerScreen (aus `src/screens/main/CommissionTrackerScreen.js`)
   - ColdCallAssistantScreen (aus `src/screens/main/ColdCallAssistantScreen.js`)
   - ClosingCoachScreen (aus `src/screens/main/ClosingCoachScreen.js`)
   - PerformanceInsightsScreen (aus `src/screens/main/PerformanceInsightsScreen.js`)
   - GamificationScreen (aus `src/screens/main/GamificationScreen.js`)

3. Navigation-Struktur:
   - Bottom Tab Navigation: Füge Icons hinzu
     - 💰 Commissions → CommissionTrackerScreen
     - 📞 Cold Call → ColdCallAssistantScreen
     - 🎯 Closing Coach → ClosingCoachScreen
     - 📈 Performance → PerformanceInsightsScreen
     - 🏆 Gamification → GamificationScreen
   - ODER: Drawer Navigation mit neuen Items
   - ODER: Stack Navigation mit neuen Routes

4. Code-Beispiel (Bottom Tabs):
   ```javascript
   import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
   import CommissionTrackerScreen from '../screens/main/CommissionTrackerScreen';
   import ColdCallAssistantScreen from '../screens/main/ColdCallAssistantScreen';
   import ClosingCoachScreen from '../screens/main/ClosingCoachScreen';
   import PerformanceInsightsScreen from '../screens/main/PerformanceInsightsScreen';
   import GamificationScreen from '../screens/main/GamificationScreen';
   
   const Tab = createBottomTabNavigator();
   
   export default function AppNavigator() {
     return (
       <Tab.Navigator>
         <Tab.Screen 
           name="Commissions" 
           component={CommissionTrackerScreen}
           options={{
             tabBarIcon: ({ color }) => <Text>💰</Text>,
             tabBarLabel: 'Commissions'
           }}
         />
         <Tab.Screen 
           name="ColdCall" 
           component={ColdCallAssistantScreen}
           options={{
             tabBarIcon: ({ color }) => <Text>📞</Text>,
             tabBarLabel: 'Cold Call'
           }}
         />
         {/* ... weitere Screens */}
       </Tab.Navigator>
     );
   }
   ```

5. Icons:
   - Nutze @expo/vector-icons oder react-native-vector-icons
   - Oder Emojis als Fallback (wie im Beispiel)
   - Oder lucide-react-native (falls vorhanden)

ERSTELLE:
- Navigation-Integration
- Icon-Mapping
- Route-Definitionen
- Screen-Imports
```

---

## 🎯 Verwendung

### Für GPT-4:
1. Kopiere einen Prompt
2. Gehe zu ChatGPT
3. Füge den Prompt ein
4. GPT erstellt den Code

### Für Claude (Anthropic):
1. Kopiere einen Prompt
2. Gehe zu claude.ai
3. Füge den Prompt ein
4. Claude erstellt den Code

### Für Gemini:
1. Kopiere einen Prompt
2. Gehe zu gemini.google.com
3. Füge den Prompt ein
4. Gemini erstellt den Code

---

## 💡 Tipps

1. **Ein Prompt = Ein Screen**: Gib immer nur einen Prompt pro LLM-Session
2. **Code prüfen**: LLM-Code immer testen und anpassen
3. **Patterns befolgen**: LLM sollte bestehende Patterns aus dem Codebase nutzen
4. **Iterativ**: Wenn Code nicht passt, gib Feedback und lass es anpassen
5. **Mobile-first**: Stelle sicher, dass der Code für Mobile optimiert ist

---

## 📝 Beispiel-Prompt für Code-Analyse

```
Du bist ein Senior React Native Entwickler. Analysiere die bestehende Mobile App Struktur.

KONTEXT:
- Framework: React Native
- Screens in: src/screens/main/
- Navigation: React Navigation (vermutlich)

FRAGE:
Wie ist die Mobile App strukturiert? Welche Patterns werden verwendet?

Bitte analysiere:
1. Navigation-Struktur (Bottom Tabs, Drawer, Stack?)
2. API-Call-Patterns (fetch, axios, custom hooks?)
3. Styling-Approach (StyleSheet, styled-components, Tailwind?)
4. State-Management (useState, Context, Redux?)
5. Komponenten-Struktur (gemeinsame Components?)

Gib konkrete Beispiele aus dem Codebase mit Dateinamen.
```

---

**Viel Erfolg! 🚀**

