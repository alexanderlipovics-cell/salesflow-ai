# 📱 PROMPT FÜR GEMINI: MOBILE APP INTEGRATION

## 🎯 AUFGABE: Mobile App zu 100% MVP führen

### WAS DU BAUEN SOLLST:

#### 1. API Integration (echte Daten statt Mocks)
**Dateien**:
- `/closerclub-mobile/src/services/api.ts` (erweitern)
- `/closerclub-mobile/src/hooks/useApi.ts` (neu)

**Features**:
- Vollständige Supabase Integration
- Real-time Subscriptions für Live-Daten
- Offline Data Sync (AsyncStorage + Supabase)
- Error Handling & Retry Logic
- Authentication Flow
- JWT Token Management

#### 2. Authentication Flow
**Dateien**:
- `/closerclub-mobile/src/screens/AuthScreen.tsx` (neu)
- `/closerclub-mobile/src/services/auth.ts` (neu)
- `/closerclub-mobile/src/context/AuthContext.tsx` (neu)

**Features**:
- Login/Register Screens
- Biometric Authentication (Face ID/Touch ID)
- Auto-Login bei App-Start
- Password Reset
- Session Management
- Secure Token Storage

#### 3. Push Notifications
**Dateien**:
- `/closerclub-mobile/src/services/notifications.ts` (neu)
- `/closerclub-mobile/src/hooks/useNotifications.ts` (neu)

**Features**:
- Expo Notifications Setup
- Push Token Registration
- Notification Categories (Lead Updates, Follow-Ups, etc.)
- Deep Linking zu spezifischen Screens
- Badge Count Management
- Notification Preferences

#### 4. Enhanced Screens (Analytics & Daily Flow)
**Dateien**:
- `/closerclub-mobile/src/screens/AnalyticsScreen.tsx` (erweitern)
- `/closerclub-mobile/src/screens/DailyFlowScreen.tsx` (erweitern)

**Features**:
- Real-time Analytics Charts
- Daily Flow Automation
- Progress Tracking
- Gamification Elements
- Achievement Badges

#### 5. Lead Detail Screen
**Dateien**:
- `/closerclub-mobile/src/screens/LeadDetailScreen.tsx` (neu)
- `/closerclub-mobile/src/components/LeadDetailCard.tsx` (neu)

**Features**:
- Vollständige Lead-Informationen
- Editierbare Felder
- Activity Timeline
- Quick Actions (Call, Message, Email)
- Notes & Tags
- Lead Scoring Display

### TECHNISCHE REQUIREMENTS:

#### Expo SDK Features:
```json
{
  "expo-notifications": "~0.29.0",
  "expo-device": "~7.0.0",
  "expo-secure-store": "~14.0.0",
  "@react-native-async-storage/async-storage": "2.1.0",
  "expo-local-authentication": "~14.0.0",
  "expo-linking": "~6.3.1"
}
```

#### Navigation Enhancement:
- Deep Linking Setup
- Tab Navigation für Hauptbereiche
- Modal Stacks für Details
- Protected Routes

#### Offline Strategy:
- AsyncStorage für Cache
- Background Sync
- Conflict Resolution
- Offline Indicators

#### Performance:
- React.memo für alle Components
- FlatList Optimization
- Image Caching
- Bundle Optimization

### ERFOLGSKRITERIEN:
- ✅ Mobile App startet ohne Fehler
- ✅ Authentication funktioniert vollständig
- ✅ Push Notifications kommen an
- ✅ Offline Mode arbeitet
- ✅ Alle Screens zeigen echte Daten
- ✅ Performance ist flüssig
- ✅ App Store ready (TestFlight)

### ZEIT: 2-3 Tage konzentrierte Arbeit

---

**Starte mit API Integration, dann Authentication, dann Notifications. Teste jeden Schritt auf iOS/Android Simulator!**
