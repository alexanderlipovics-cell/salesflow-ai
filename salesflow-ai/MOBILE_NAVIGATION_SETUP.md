# 📱 Mobile Navigation Setup - SalesFlow AI

## ✅ Implementiert

**Navigation-Varianten:**
- `src/navigation/MainNavigator.tsx` - Vollständige Variante (6+ Tabs)
- `src/navigation/MainNavigatorCompact.tsx` - Kompakte Variante (5 Tabs mit Stack)
- `src/navigation/SalesToolsNavigator.tsx` - Stack Navigator für Tools

---

## 🎯 Zwei Navigations-Varianten

### Variante 1: Vollständig (MainNavigator.tsx)

**Alle Features als separate Tabs:**

```
┌─────────────────────────────────────┐
│  Bottom Tab Bar (6 Tabs)           │
├─────────────────────────────────────┤
│ Home | Calls | Stats | Pay | Coach │ Rank │
└─────────────────────────────────────┘
```

**Vorteile:**
- Direkter Zugriff auf alle Features
- Keine zusätzlichen Navigationsebenen

**Nachteile:**
- Viele Tabs → kleine Touch-Ziele
- Nicht ideal für kleine Bildschirme

---

### Variante 2: Kompakt (MainNavigatorCompact.tsx) ⭐ **EMPFOHLEN**

**Tools gruppiert in Stack:**

```
┌─────────────────────────────────────┐
│  Bottom Tab Bar (4-5 Tabs)         │
├─────────────────────────────────────┤
│ Home | Pay | Tools | Stats | Chat  │
└─────────────────────────────────────┘
         │
         └─> Tools Stack:
             ├─ Tools Menu (Grid)
             ├─ Closing Coach
             ├─ Cold Call Assistant
             └─ Gamification
```

**Vorteile:**
- Saubere UI (max. 5 Tabs = Best Practice)
- Logische Gruppierung
- Bessere Touch-Ziele

**Nachteile:**
- Eine zusätzliche Navigationsebene

---

## 📦 Setup

### 1. Dependencies installieren

```bash
npm install @react-navigation/bottom-tabs
npm install @react-navigation/stack
npm install react-native-vector-icons
```

### 2. Navigation in App integrieren

**Option A: Vollständige Variante**

```typescript
// In App.tsx oder deiner Root-Navigation:
import { MainNavigator } from './navigation/MainNavigator';

export default function App() {
  return (
    <NavigationContainer>
      <MainNavigator />
    </NavigationContainer>
  );
}
```

**Option B: Kompakte Variante (Empfohlen)**

```typescript
// In App.tsx oder deiner Root-Navigation:
import { MainNavigatorCompact } from './navigation/MainNavigatorCompact';

export default function App() {
  return (
    <NavigationContainer>
      <MainNavigatorCompact />
    </NavigationContainer>
  );
}
```

---

## 🎨 Icon Mapping

| Screen | Icon Name | Bedeutung |
|--------|-----------|-----------|
| Dashboard | `view-dashboard` | Hauptübersicht |
| Commissions | `cash-multiple` | Geldstapel / Auszahlung |
| Cold Call | `phone-in-talk` | Aktives Telefonat |
| Closing Coach | `handshake` | Deal Abschluss |
| Performance | `chart-line` | Aufsteigender Graph |
| Gamification | `trophy` | Pokal / Wettbewerb |
| Sales Tools | `tools` | Werkzeuge |
| Chat | `message-text` | Nachrichten |

---

## 🔧 Anpassungen

### 1. Bestehende Screens integrieren

Falls du bereits `DashboardScreen` oder `ChatScreen` hast:

```typescript
// In MainNavigator.tsx oder MainNavigatorCompact.tsx:
import DashboardScreen from '../screens/main/DashboardScreen';
import ChatScreen from '../screens/main/ChatScreen';

// Dann die auskommentierten Tab.Screen Einträge aktivieren
```

### 2. Farben anpassen

```typescript
// In MainNavigator.tsx:
const activeColor = '#007AFF'; // iOS Blue
const inactiveColor = '#8E8E93'; // iOS Gray

// Oder aus Theme-Context:
const { colors } = useTheme();
const activeColor = colors.primary;
```

### 3. Tools Menu anpassen

Falls du weitere Tools hinzufügen möchtest:

```typescript
// In SalesToolsNavigator.tsx, erweitere das tools-Array:
const tools = [
  // ... bestehende Tools
  {
    id: 'new-tool',
    title: 'Neues Tool',
    description: 'Beschreibung',
    icon: 'icon-name',
    color: '#FF0000',
    screen: 'NewToolScreen',
  },
];
```

---

## 📱 Screen-Integration Checkliste

- [x] MainNavigator.tsx erstellt
- [x] MainNavigatorCompact.tsx erstellt
- [x] SalesToolsNavigator.tsx erstellt
- [x] ToolsMenuScreen erstellt
- [ ] Dependencies installiert
- [ ] Navigation in App.tsx integriert
- [ ] Bestehende Screens (Dashboard, Chat) integriert
- [ ] Icons getestet (iOS & Android)
- [ ] Navigation getestet (alle Screens erreichbar)

---

## 🐛 Troubleshooting

### Problem: Icons werden nicht angezeigt
- Prüfe, ob `react-native-vector-icons` installiert ist
- iOS: `pod install` ausführen
- Android: `fonts.gradle` hinzugefügt?

### Problem: Navigation funktioniert nicht
- Prüfe, ob `@react-navigation/bottom-tabs` und `@react-navigation/stack` installiert sind
- Stelle sicher, dass `NavigationContainer` die Navigation umschließt

### Problem: TypeScript-Fehler
- Prüfe, ob alle Screen-Imports korrekt sind
- Stelle sicher, dass alle Screens existieren

---

## 🚀 Nächste Schritte

1. **Navigation wählen:** Entscheide dich für Variante 1 oder 2
2. **Integration:** Füge Navigation in App.tsx ein
3. **Testen:** Navigiere durch alle Screens
4. **Anpassen:** Passe Farben, Icons, Labels an dein Branding an

---

**Die Navigation ist bereit! 🎉**

