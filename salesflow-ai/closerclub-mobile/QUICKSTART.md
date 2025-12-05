# CloserClub Mobile - Quick Start 🚀

Schnellstart-Anleitung in 5 Minuten!

## 📦 Schritt 1: Dependencies installieren

```bash
cd closerclub-mobile
npm install
```

## 🔐 Schritt 2: Umgebungsvariablen einrichten

Erstelle eine `.env` Datei im Root-Verzeichnis:

```env
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
EXPO_PUBLIC_API_URL=https://your-api.com
```

## 🎬 Schritt 3: App starten

```bash
npm start
```

Das öffnet Expo DevTools in deinem Browser.

## 📱 Schritt 4: App auf dem Gerät öffnen

### Option A: Expo Go App (Empfohlen für Testing)

1. **Installiere Expo Go:**
   - iOS: [App Store Link](https://apps.apple.com/app/expo-go/id982107779)
   - Android: [Play Store Link](https://play.google.com/store/apps/details?id=host.exp.exponent)

2. **Scanne QR-Code:**
   - iOS: Öffne Kamera-App und scanne den QR-Code
   - Android: Öffne Expo Go App und scanne den QR-Code

### Option B: iOS Simulator (nur macOS)

```bash
npm run ios
```

### Option C: Android Emulator

```bash
npm run android
```

## 🎉 Fertig!

Die App sollte jetzt auf deinem Gerät laufen!

### Was du siehst:

- ✅ **Dashboard**: Übersicht über KPIs und schnelle Aktionen
- ✅ **Speed Hunter**: Intent Intelligence Monitor
- ✅ **Lead Management**: Lead-Verwaltung mit Filtern
- ✅ **AI Coach**: AI-gestütztes Coaching

## 🔧 Nächste Schritte

1. **Supabase konfigurieren**: Siehe [SETUP.md](./SETUP.md#5-supabase-setup)
2. **API Endpoints implementieren**: Ersetze Mock-Daten mit echten API Calls
3. **Authentication hinzufügen**: Login/Logout Flow implementieren
4. **Push Notifications**: Benachrichtigungen einrichten

## 🆘 Probleme?

### "Cannot find module 'expo'"
```bash
npm install
```

### Metro Bundler startet nicht
```bash
npx expo start --clear
```

### Port bereits in Verwendung
```bash
npx expo start --port 8082
```

### App lädt nicht auf dem Gerät
- Stelle sicher, dass Gerät und Computer im selben WLAN sind
- Überprüfe Firewall-Einstellungen
- Versuche `npx expo start --tunnel`

## 📚 Weitere Dokumentation

- [README.md](./README.md) - Vollständige Projekt-Dokumentation
- [SETUP.md](./SETUP.md) - Detaillierte Setup-Anleitung
- [Expo Docs](https://docs.expo.dev/) - Expo Dokumentation

## 💡 Hilfreiche Befehle

```bash
# Development Server starten
npm start

# Cache löschen
npx expo start --clear

# iOS Simulator
npm run ios

# Android Emulator
npm run android

# Production Build
eas build --platform ios
eas build --platform android
```

---

**Happy Coding! 🎉**

