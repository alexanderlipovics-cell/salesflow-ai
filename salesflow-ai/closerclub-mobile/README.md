# CloserClub Mobile App 📱

Die mobile Version der CloserClub Sales Plattform - entwickelt mit Expo und React Native.

## 🚀 Features

- **Dashboard**: Übersicht über wichtigste KPIs und Aktionen
- **Speed Hunter**: Intent Intelligence Monitor für Hot Accounts
- **Lead Management**: Vollständige Lead-Verwaltung mit Filtern
- **AI Coach**: AI-gestütztes Verkaufscoaching

## 📋 Voraussetzungen

- Node.js (v18 oder höher)
- npm oder yarn
- Expo Go App (für Testing auf dem Gerät)
- iOS Simulator (für macOS) oder Android Studio (für Android Emulator)

## 🛠️ Installation

1. **Dependencies installieren**
```bash
npm install
```

2. **Umgebungsvariablen konfigurieren**
Erstelle eine `.env` Datei basierend auf `.env.example`:
```bash
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
EXPO_PUBLIC_API_URL=https://your-api.com
```

3. **App starten**
```bash
npm start
```

## 📱 Testing

### iOS
```bash
npm run ios
```

### Android
```bash
npm run android
```

### Web (Preview)
```bash
npm run web
```

### Mit Expo Go App
1. Installiere die Expo Go App aus dem App Store / Play Store
2. Scanne den QR-Code aus dem Terminal
3. Die App öffnet sich automatisch

## 🏗️ Projektstruktur

```
closerclub-mobile/
├── src/
│   ├── screens/           # App Screens
│   │   ├── DashboardScreen.tsx
│   │   ├── SpeedHunterScreen.tsx
│   │   ├── LeadManagementScreen.tsx
│   │   └── AICoachScreen.tsx
│   ├── navigation/        # Navigation Setup
│   │   └── RootNavigator.tsx
│   ├── components/        # Wiederverwendbare Komponenten
│   ├── config/           # Konfigurationsdateien
│   │   ├── supabase.ts
│   │   └── theme.ts
│   ├── services/         # API Services
│   ├── types/            # TypeScript Types
│   ├── context/          # React Context
│   └── utils/            # Utility Funktionen
├── assets/               # Bilder, Icons, Fonts
├── app.json             # Expo Konfiguration
└── App.tsx              # Main Entry Point
```

## 🎨 Design System

Das Design basiert auf einem Dark Glassmorphism Theme mit folgenden Hauptfarben:

- **Primary**: Cyan (#06b6d4)
- **Background**: Slate-900 (#0f172a)
- **Surface**: Slate-800 (#1e293b)
- **Accent**: Orange (#f97316)

## 🔧 Technologie Stack

- **Framework**: Expo SDK 54
- **UI**: React Native
- **Navigation**: React Navigation 6
- **State Management**: React Hooks + Context
- **Backend**: Supabase
- **Styling**: StyleSheet API mit Custom Theme

## 📦 Dependencies

### Core
- `expo` - Expo SDK
- `react-native` - React Native Framework
- `@react-navigation/native` - Navigation Library
- `@supabase/supabase-js` - Supabase Client

### UI Components
- `expo-linear-gradient` - Gradient Komponenten
- `react-native-safe-area-context` - Safe Area Support
- `react-native-screens` - Native Screen Optimization

### Services
- `expo-notifications` - Push Notifications
- `expo-secure-store` - Secure Storage
- `@react-native-async-storage/async-storage` - Async Storage

## 🚢 Deployment

### Erstelle Production Build

**iOS:**
```bash
eas build --platform ios
```

**Android:**
```bash
eas build --platform android
```

### App Store / Play Store Submission

1. Erstelle EAS Account: `eas login`
2. Konfiguriere `eas.json`
3. Baue Production Version
4. Submitte zur Review

Mehr Infos: https://docs.expo.dev/submit/introduction/

## 🔐 Sicherheit

- Alle sensiblen Daten werden in Expo SecureStore gespeichert
- API Keys sollten niemals im Code committed werden
- Nutze `.env` Dateien für Umgebungsvariablen

## 📝 TODOs für Production

- [ ] Supabase Credentials in `.env` hinzufügen
- [ ] API Endpoints implementieren
- [ ] Push Notifications konfigurieren
- [ ] Error Tracking (z.B. Sentry) einrichten
- [ ] Analytics (z.B. Firebase) integrieren
- [ ] App Icons und Splash Screen erstellen
- [ ] Deep Linking konfigurieren
- [ ] Authentication Flow implementieren
- [ ] Offline-Support hinzufügen
- [ ] Testing (Unit & E2E) schreiben

## 🤝 Contributing

1. Fork das Repository
2. Erstelle einen Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit deine Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push zum Branch (`git push origin feature/AmazingFeature`)
5. Öffne einen Pull Request

## 📄 License

Copyright © 2024 CloserClub. Alle Rechte vorbehalten.

## 💬 Support

Bei Fragen oder Problemen:
- Erstelle ein Issue auf GitHub
- Kontaktiere das Development Team

---

**Entwickelt mit ❤️ für CloserClub**

