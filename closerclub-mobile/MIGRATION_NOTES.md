# Migration Notes - Web zu Mobile 📱

Wichtige Hinweise zur Migration von Web-Komponenten zu Mobile.

## 🎯 Erfolgreich migrierte Screens

### ✅ Dashboard Screen
**Original**: `src/screens/main/DashboardScreen.js`
**Mobile**: `src/screens/DashboardScreen.tsx`

**Änderungen:**
- React Native StyleSheet statt CSS
- LinearGradient statt CSS Gradients
- TouchableOpacity statt Button/Link
- SafeAreaView für sichere Bereiche
- RefreshControl für Pull-to-Refresh

### ✅ Speed Hunter Screen
**Original**: `src/features/speedhunter/SpeedHunterPanel.jsx`
**Mobile**: `src/screens/SpeedHunterScreen.tsx`

**Änderungen:**
- Horizontales Scrollen für Tabs
- Native Scroll-Performance
- Optimierte Card-Layouts für Mobile
- Touch-optimierte Button-Größen

### ✅ Lead Management Screen
**Original**: `src/screens/main/LeadsScreen.js`
**Mobile**: `src/screens/LeadManagementScreen.tsx`

**Änderungen:**
- Native TextInput für Suche
- ScrollView mit Virtualisierung
- Swipe-Actions vorbereitet
- Floating Action Button (FAB)

### ✅ AI Coach Screen
**Original**: `src/components/live-assist/CoachOverlay.tsx`
**Mobile**: `src/screens/AICoachScreen.tsx`

**Änderungen:**
- Chat-Interface optimiert
- KeyboardAvoidingView für Tastatur
- Auto-Scroll bei neuen Nachrichten
- Quick Actions als Horizontal Scroll

## 🔄 Unterschiede Web vs. Mobile

### Styling

**Web (CSS):**
```css
.button {
  background: linear-gradient(to right, #06b6d4, #0891b2);
  border-radius: 12px;
  padding: 16px;
}
```

**Mobile (StyleSheet):**
```typescript
const styles = StyleSheet.create({
  button: {
    borderRadius: 12,
    overflow: 'hidden',
  }
});

// Mit LinearGradient Component
<LinearGradient
  colors={['#06b6d4', '#0891b2']}
  start={{ x: 0, y: 0 }}
  end={{ x: 1, y: 0 }}
  style={styles.button}
>
  <Text>Button</Text>
</LinearGradient>
```

### Navigation

**Web (React Router):**
```jsx
import { useNavigate } from 'react-router-dom';
const navigate = useNavigate();
navigate('/dashboard');
```

**Mobile (React Navigation):**
```typescript
import { useNavigation } from '@react-navigation/native';
const navigation = useNavigation();
navigation.navigate('Dashboard');
```

### Icons

**Web:**
```jsx
import { Icon } from 'lucide-react';
<Icon size={24} />
```

**Mobile:**
```jsx
// Emoji oder expo-vector-icons
<Text style={styles.icon}>🎯</Text>

// Oder mit expo-vector-icons
import { Ionicons } from '@expo/vector-icons';
<Ionicons name="rocket" size={24} color="white" />
```

## 🚧 Noch nicht implementiert

### 1. Authentication
**Status**: 🔴 Nicht implementiert
**Nächste Schritte:**
- Supabase Auth integrieren
- Login/Signup Screens erstellen
- Session Management
- Protected Routes

### 2. API Integration
**Status**: 🟡 Vorbereitet, aber Mock-Daten
**Nächste Schritte:**
- API Service Layer erstellen
- Supabase Queries implementieren
- Error Handling
- Loading States

### 3. Push Notifications
**Status**: 🟡 Konfiguriert, aber nicht implementiert
**Nächste Schritte:**
- Push Token registrieren
- Notification Handler
- Badge Updates
- Deep Links

### 4. Offline Support
**Status**: 🔴 Nicht implementiert
**Nächste Schritte:**
- AsyncStorage für lokale Daten
- Sync Mechanismus
- Offline-First Architecture
- Queue für API Calls

### 5. Biometrics
**Status**: 🔴 Nicht implementiert
**Nächste Schritte:**
- Face ID / Touch ID Integration
- Secure Storage für Credentials
- Fallback zu PIN

## 📦 Fehlende Dependencies

Für vollständige Feature-Parität installiere:

```bash
# Icons
npx expo install @expo/vector-icons

# Biometrics
npx expo install expo-local-authentication

# Camera
npx expo install expo-camera

# Image Picker
npx expo install expo-image-picker

# Haptics
npx expo install expo-haptics

# Contacts
npx expo install expo-contacts
```

## 🎨 Design System Adaptierung

### Spacing
- Web: `padding: 16px` → Mobile: `padding: SPACING.md` (16)
- Größere Touch Targets (min. 44x44pt)

### Typography
- Web: Font Sizes 12-32px
- Mobile: Responsive Typography mit Scale Factor
- Bessere Lesbarkeit auf kleinen Screens

### Colors
- Dark Theme beibehalten
- Glassmorphism Effect angepasst
- Höhere Kontraste für Outdoor-Nutzung

## 🔧 Performance Optimierungen

### Umgesetzt
- ✅ FlatList für lange Listen (vorbereitet)
- ✅ useMemo für schwere Berechnungen
- ✅ React.memo für teure Components
- ✅ Debounced Search Input

### TODO
- ⏳ Image Caching
- ⏳ Code Splitting
- ⏳ Lazy Loading für Screens
- ⏳ Redux oder Zustand für State Management

## 📱 Platform-spezifische Features

### iOS
- [ ] Haptic Feedback
- [ ] Swipe Gestures
- [ ] 3D Touch
- [ ] Widget Extension

### Android
- [ ] Material Design Ripple
- [ ] Back Handler
- [ ] App Shortcuts
- [ ] Widget

## 🧪 Testing

### Unit Tests
```bash
npm install --save-dev @testing-library/react-native jest
```

### E2E Tests
```bash
npm install --save-dev detox
```

### Test Coverage Ziel: 80%+

## 🚀 Deployment Checklist

- [ ] Environment Variables gesetzt
- [ ] Supabase Production Projekt
- [ ] Analytics integriert (Firebase/Amplitude)
- [ ] Error Tracking (Sentry)
- [ ] App Icons erstellt (alle Größen)
- [ ] Splash Screens erstellt
- [ ] Screenshots für Store
- [ ] Privacy Policy & Terms
- [ ] Store Listings (iOS/Android)

## 📝 Bekannte Probleme

1. **TypeScript Strict Mode**: Einige Types sind noch `any`
2. **Error Boundaries**: Nicht überall implementiert
3. **Loading States**: Könnten konsistenter sein
4. **Empty States**: Mehr Variation gewünscht

## 🤝 Contribution Guidelines

Beim Hinzufügen neuer Features:
1. Folge dem bestehenden Design System
2. Nutze TypeScript mit strikten Types
3. Implementiere Loading & Error States
4. Teste auf iOS und Android
5. Dokumentiere komplexe Logik
6. Schreibe Tests (min. Unit Tests)

## 📚 Ressourcen

- [React Native Docs](https://reactnative.dev/)
- [Expo Docs](https://docs.expo.dev/)
- [React Navigation Docs](https://reactnavigation.org/)
- [Supabase React Native Guide](https://supabase.com/docs/guides/with-react-native)

---

**Stand**: Dezember 2024

