# CloserClub Mobile - Setup Guide 🚀

Detaillierte Anleitung zum Einrichten der CloserClub Mobile App.

## 📋 Checkliste

- [ ] Node.js installiert (v18+)
- [ ] Expo CLI installiert
- [ ] Expo Account erstellt
- [ ] Supabase Projekt eingerichtet
- [ ] Umgebungsvariablen konfiguriert

## 🔧 Schritt-für-Schritt Anleitung

### 1. Node.js Installation

**Windows:**
- Download von https://nodejs.org/
- Installiere LTS Version
- Verifiziere: `node --version`

**macOS:**
```bash
brew install node
```

**Linux:**
```bash
curl -fsSL https://deb.nodesource.com/setup_lts.x | sudo -E bash -
sudo apt-get install -y nodejs
```

### 2. Expo CLI Global Installation

```bash
npm install -g expo-cli
```

Verifiziere Installation:
```bash
expo --version
```

### 3. Expo Account erstellen

1. Gehe zu https://expo.dev/signup
2. Erstelle einen Account
3. Login im Terminal: `expo login`

### 4. Projekt Setup

```bash
cd closerclub-mobile
npm install
```

### 5. Supabase Setup

1. Gehe zu https://supabase.com
2. Erstelle ein neues Projekt
3. Kopiere die Projekt-URL und Anon-Key
4. Füge sie in die `.env` Datei ein:

```env
EXPO_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### 6. Datenbank Schema

Führe folgende SQL Queries in Supabase aus:

```sql
-- Leads Tabelle
CREATE TABLE leads (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  company TEXT,
  email TEXT,
  phone TEXT,
  status TEXT DEFAULT 'new',
  priority TEXT DEFAULT 'medium',
  score INTEGER DEFAULT 0,
  last_contact TIMESTAMP,
  estimated_value NUMERIC,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Row Level Security
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;

-- Policy: Users können nur ihre eigenen Leads sehen
CREATE POLICY "Users can view own leads"
  ON leads FOR SELECT
  USING (auth.uid() = user_id);
```

### 7. Expo Go App installieren

**iOS:**
- App Store: https://apps.apple.com/app/expo-go/id982107779

**Android:**
- Play Store: https://play.google.com/store/apps/details?id=host.exp.exponent

### 8. App starten

```bash
npm start
```

Optionen:
- Press `i` für iOS Simulator
- Press `a` für Android Emulator
- Scanne QR-Code mit Expo Go App

## 🔍 Troubleshooting

### Metro Bundler startet nicht

```bash
npx expo start --clear
```

### iOS Simulator nicht gefunden

```bash
sudo xcode-select --switch /Applications/Xcode.app/Contents/Developer
```

### Android Emulator Probleme

1. Öffne Android Studio
2. Tools > AVD Manager
3. Erstelle ein neues Virtual Device
4. Starte den Emulator vor `npm run android`

### Cache Probleme

```bash
rm -rf node_modules
npm install
npx expo start --clear
```

### Port bereits in Verwendung

```bash
npx expo start --port 8082
```

## 📱 Geräte-spezifische Einstellungen

### iOS Development

**Voraussetzungen:**
- macOS
- Xcode installiert
- iOS Developer Account (für Physical Devices)

```bash
# Simulator öffnen
open -a Simulator

# App im Simulator starten
npm run ios
```

### Android Development

**Voraussetzungen:**
- Android Studio
- Android SDK installiert
- Virtual Device erstellt

```bash
# Emulator starten
emulator -avd Pixel_4_API_30

# App im Emulator starten
npm run android
```

## 🚀 Hot Reload & Fast Refresh

- Änderungen werden automatisch aktualisiert
- Bei Problemen: Shake Device > "Reload"
- Oder drücke `r` im Terminal

## 🔐 Environment Variables

Erstelle eine `.env` Datei im Root:

```env
# Supabase
EXPO_PUBLIC_SUPABASE_URL=your_supabase_url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_anon_key

# API
EXPO_PUBLIC_API_URL=https://api.closerclub.com

# Feature Flags
EXPO_PUBLIC_ENABLE_AI_COACH=true
EXPO_PUBLIC_ENABLE_SPEED_HUNTER=true
```

**Wichtig:** Füge `.env` zur `.gitignore` hinzu!

## 🧪 Testing Setup

### Jest & React Native Testing Library

```bash
npm install --save-dev @testing-library/react-native jest
```

### E2E Testing mit Detox

```bash
npm install --save-dev detox
```

## 📊 Performance Monitoring

### Flipper Installation

1. Download: https://fbflipper.com/
2. Installiere
3. Starte App im Development Mode
4. Öffne Flipper - App verbindet automatisch

## 🔔 Push Notifications Setup

1. Konfiguriere in `app.json`:
```json
{
  "expo": {
    "plugins": [
      [
        "expo-notifications",
        {
          "icon": "./assets/notification-icon.png"
        }
      ]
    ]
  }
}
```

2. Erhalte Push Token:
```typescript
import * as Notifications from 'expo-notifications';

const token = await Notifications.getExpoPushTokenAsync();
```

## 🎨 Assets Vorbereiten

### App Icon
- 1024x1024px PNG
- Kein Transparency
- Speichere als `assets/icon.png`

### Splash Screen
- 1284x2778px PNG
- Zentriertes Logo
- Speichere als `assets/splash.png`

### Adaptive Icon (Android)
- 1024x1024px PNG
- Speichere als `assets/adaptive-icon.png`

## 📦 Build für Production

### EAS Build Setup

```bash
npm install -g eas-cli
eas login
eas build:configure
```

### Build erstellen

**iOS:**
```bash
eas build --platform ios --profile production
```

**Android:**
```bash
eas build --platform android --profile production
```

## 🎯 Next Steps

Nach erfolgreichem Setup:

1. ✅ Teste alle Screens
2. ✅ Implementiere API Calls
3. ✅ Füge Authentication hinzu
4. ✅ Konfiguriere Push Notifications
5. ✅ Erstelle Production Build
6. ✅ Teste auf echten Geräten
7. ✅ Submit zu App Store / Play Store

## 💡 Hilfreiche Befehle

```bash
# Projekt Info
expo diagnostics

# Dependencies updaten
expo upgrade

# Cache löschen
expo start --clear

# Production Build lokal testen
expo build:ios --type archive
expo build:android --type apk

# EAS Build Status checken
eas build:list
```

## 📚 Ressourcen

- **Expo Docs**: https://docs.expo.dev/
- **React Native Docs**: https://reactnative.dev/
- **Supabase Docs**: https://supabase.com/docs
- **React Navigation**: https://reactnavigation.org/

## 🆘 Support

Bei Problemen:
1. Checke Console Output
2. Suche in Expo Forums: https://forums.expo.dev/
3. Prüfe GitHub Issues
4. Kontaktiere das Dev Team

---

**Viel Erfolg! 🚀**

