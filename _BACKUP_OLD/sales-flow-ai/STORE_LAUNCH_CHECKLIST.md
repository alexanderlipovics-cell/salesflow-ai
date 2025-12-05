# SalesFlow AI – Store Launch Leitfaden

Dieser Leitfaden bündelt alle Schritte, Assets und Checklisten, um die Expo-App für App Store und Play Store vorzubereiten.

---

## 1. Environment & Secrets

### `.env.production` Vorlage
```
API_URL=https://api.salesflow.ai/api
SUPABASE_URL=https://production-project.supabase.co
SUPABASE_ANON_KEY=your_production_anon_key
SENTRY_DSN=https://xxx@sentry.io/xxx
```
> Nicht committen – lokal verschlüsselt ablegen.

### EAS Secrets
```
eas secret:create --scope project --name API_URL --value https://api.salesflow.ai/api
eas secret:create --scope project --name SUPABASE_URL --value https://production-project.supabase.co
eas secret:create --scope project --name SUPABASE_ANON_KEY --value your_key
eas secret:create --scope project --name SENTRY_DSN --value https://xxx@sentry.io/xxx
```

### Zugriff in der App
```ts
import Constants from 'expo-constants';

const API_URL = Constants.expoConfig?.extra?.apiUrl;
```

---

## 2. Build Workflow (EAS)

1. **Initial Setup**
   - `npm install -g eas-cli`
   - `eas login`
   - `eas build:configure`

2. **Credentials**
   - `eas credentials` → iOS: neues Distribution-Zertifikat + Provisioning Profile erzeugen.
   - `eas credentials` → Android: Keystore generieren oder existierenden hochladen.

3. **Builds**
   - Dev Client: `eas build --profile development --platform all`
   - Preview/TestFlight/Internal: `eas build --profile preview --platform all`
   - Production (Store): `eas build --profile production --platform all`
   - Vor jedem Prod-Build `app.json` Version / `buildNumber` / `versionCode` erhöhen.

4. **Submission**
   - iOS: `eas submit --platform ios --latest`
   - Android: `eas submit --platform android --latest`
   - Status prüfen: `eas build:list`

---

## 3. Store Assets

### iOS (App Store)
- **Screenshots** pro Gerät:  
  - iPhone 6.7" (1290×2796) – 3‑10 Bilder  
  - iPhone 6.5" (1284×2778) – 3‑10 Bilder  
  - iPad Pro 12.9" (2048×2732) – 3‑10 Bilder
- **App Icon**: 1024×1024 px (ohne Alpha).
- **Optional Video**: 15‑30 s, MP4/MOV.
- **Metadata**: Name, Subtitle, Description, Keywords, Support/Marketing/Privacy URLs.

### Android (Play Store)
- **Screenshots**  
  - Phone 1080×1920 (2‑8)  
  - 7" Tablet 1024×600 (2‑8)  
  - 10" Tablet 1280×800 (2‑8)
- **Feature Graphic**: 1024×500 px.  
- **App Icon**: 512×512 px (32‑bit PNG, Alpha ok).  
- **Optional Video**: YouTube-Link.  
- **Metadata**: Title, Short/Full Description, Kategorie, Content Rating, Privacy URL.

---

## 4. Beta Testing

### TestFlight
1. Build mit `--profile preview`.
2. Upload erfolgt automatisch.
3. Interne Tester (bis 100) einladen → Review abwarten.
4. Externe Tester (bis 10 000) nach Approval hinzufügen.
5. Feedback via TestFlight sammeln.

### Google Play (Internal Testing)
1. Preview-APK bauen.
2. In Play Console unter „Internal testing“ hochladen.
3. Tester per Mail hinterlegen oder Link teilen.
4. Feedback in der Console auswerten.

### Funktionale Checklist
- **Authentifizierung**
  - ☐ Login korrekt / Fehlerfall
  - ☐ Token persistiert & Logout löscht Token
- **Core Features**
  - ☐ Today Dashboard Daten
  - ☐ Squad Coach Stats
  - ☐ Lead Detail vollständig
  - ☐ Action Log Echtzeit
- **Error Handling**
  - ☐ Error Banner bei API-Fail & dismissbar
  - ☐ Offline Hinweis
  - ☐ Timeout Meldung
- **Performance**
  - ☐ App-Start <3 s
  - ☐ Navigation flüssig
  - ☐ 30 min Stresstest ohne Crash
  - ☐ Akkuverbrauch im Rahmen
- **Geräte**
  - ☐ iPhone 12 Pro, iPhone 14 Pro Max, iPad Air  
  - ☐ Samsung S23, Pixel 7 Pro

---

## 5. Pre-Submission Checklist

### Code & Config
- ☐ `USE_MOCK_API` nur in Dev aktiv.
- ☐ `LIVE_API_BASE_URL` zeigt auf Prod.
- ☐ Logging via `logger` (keine `console.*`).
- ☐ Fehlerbehandlung & Memory-Leaks getestet.

### App Manifest
- ☐ `app.json` Version aktualisiert.
- ☐ iOS `buildNumber` & Android `versionCode` erhöht.
- ☐ Bundle-ID/Package korrekt.
- ☐ Berechtigungen minimal, begründet.
- ☐ Icons/Splash final.

### Build
- ☐ EAS Credentials aktuell.
- ☐ Prod-Build erfolgreich & auf Geräten installiert.
- ☐ 30‑Minuten Device-Test ohne Crash.

### Store Assets
- ☐ Screenshots alle Größen.
- ☐ Icons 1024×1024 & 512×512.
- ☐ Feature Graphic 1024×500.
- ☐ Beschreibung + Keywords (SEO).
- ☐ Privacy & Support URLs hinterlegt.

### Legal & Compliance
- ☐ Privacy Policy live.
- ☐ Terms of Service live.
- ☐ GDPR geprüft.
- ☐ Alters-/Content-Rating Fragebogen (Android) erledigt.

---

## 6. Post-Launch Monitoring

### Error Tracking (Sentry)
1. `npx expo install @sentry/react-native`
2. Initialisierung in `app/_layout.tsx` oder Entry:
   ```ts
   import * as Sentry from '@sentry/react-native';

   Sentry.init({
     dsn: process.env.SENTRY_DSN,
     enableInExpoDevelopment: false,
     debug: __DEV__,
   });
   ```

### Analytics
- `npx expo install @react-native-firebase/app @react-native-firebase/analytics`
- Beispiel:
  ```ts
  import analytics from '@react-native-firebase/analytics';
  analytics().logEvent('login_success', { method: 'email' });
  ```

### Performance & Crash Reporting
- Native Crash Reports: App Store Connect / Play Console.
- Optional: `@shopify/react-native-performance` für Messpunkte.

### Nach dem Launch
- ☐ Crash-Reports täglich prüfen.
- ☐ Funnel-/Event-Daten im Blick behalten.
- ☐ Store-Reviews beantworten.
- ☐ Backlog fürs nächste Update definieren.

---

## 7. Quick Recap vor Release
1. ☐ Code Cleanup abgeschlossen.
2. ☐ `app.json` + `eas.json` final.
3. ☐ Secrets gesetzt & überprüft.
4. ☐ Assets & Metadaten hochgeladen.
5. ☐ Geräte-Tests + Beta-Feedback erledigt.
6. ☐ Submission gestartet & Status monitored.

Happy Launch! 🚀


