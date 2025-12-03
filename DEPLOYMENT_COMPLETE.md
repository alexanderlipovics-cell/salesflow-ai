# 🚀 AURA OS - Vollständige Deployment Anleitung

## 📋 Übersicht

| Komponente | Plattform | URL |
|------------|-----------|-----|
| **Web App** | Vercel | https://aura-os.vercel.app |
| **Backend API** | Render | https://salesflow-api.onrender.com |
| **iOS App** | App Store | Nach EAS Build |
| **Android App** | Play Store | Nach EAS Build |
| **Datenbank** | Supabase | Bereits konfiguriert |

---

## 1️⃣ Backend auf Render deployen

### Schritt 1: Repository auf GitHub pushen
```bash
cd backend
git init
git add .
git commit -m "Initial commit - AURA OS Backend"
git remote add origin https://github.com/YOUR_USERNAME/aura-os-backend.git
git push -u origin main
```

### Schritt 2: Auf Render verbinden
1. Gehe zu [render.com](https://render.com)
2. "New" → "Web Service"
3. Repository verbinden
4. Render erkennt automatisch `render.yaml`

### Schritt 3: Environment Variables setzen
Im Render Dashboard unter "Environment":
```
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your-service-role-key
DATABASE_URL=postgresql://...
OPENAI_API_KEY=sk-...
ENVIRONMENT=production
```

### Schritt 4: Deploy triggern
Render startet automatisch beim Push oder manuell mit "Manual Deploy"

---

## 2️⃣ Web App auf Vercel deployen

### Option A: CLI (Empfohlen)
```powershell
cd salesflow-app
npm install -g vercel
vercel login
vercel --prod
```

### Option B: GitHub Integration
1. Gehe zu [vercel.com](https://vercel.com)
2. "Import Project"
3. Repository wählen
4. Framework: "Other"
5. Build Command: `npx expo export --platform web`
6. Output Directory: `dist`

### Environment Variables in Vercel:
```
EXPO_PUBLIC_API_URL=https://salesflow-api.onrender.com/api/v1
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

---

## 3️⃣ Mobile Apps mit EAS bauen

### Voraussetzungen
```powershell
npm install -g eas-cli
eas login
```

### iOS + Android Preview (APK/TestFlight)
```powershell
cd salesflow-app
eas build --platform all --profile preview
```

### Production (App Store / Play Store)
```powershell
eas build --platform all --profile production
```

### Für iOS brauchst du:
- Apple Developer Account ($99/Jahr)
- App Store Connect App ID
- Apple Team ID

### Für Android brauchst du:
- Google Play Console Account ($25 einmalig)
- google-service-account.json (für automatisches Upload)

---

## 4️⃣ OTA Updates (Over-The-Air)

Nach dem initialen Build kannst du JS-Updates ohne neuen Store-Release pushen:

```powershell
eas update --branch production --message "Bug fixes"
```

---

## 🔒 Sicherheits-Checkliste

- [ ] Alle API Keys sind in Environment Variables (nicht im Code)
- [ ] CORS ist auf Production-Domains beschränkt
- [ ] RLS Policies in Supabase sind aktiv
- [ ] HTTPS ist überall aktiv
- [ ] Rate Limiting ist konfiguriert

---

## 📊 Monitoring

### Render
- Logs: Dashboard → Logs
- Metrics: Dashboard → Metrics

### Vercel
- Analytics: Dashboard → Analytics
- Functions: Dashboard → Functions

### Supabase
- Database: Dashboard → Database
- Auth: Dashboard → Authentication
- Storage: Dashboard → Storage

---

## 🆘 Troubleshooting

### Backend startet nicht
```bash
# Logs prüfen
render logs --tail

# Lokal testen
uvicorn app.main:app --reload
```

### Frontend Build fehlerhaft
```bash
# Cache leeren
npx expo start --clear

# Dependencies neu installieren
rm -rf node_modules
npm install
```

### EAS Build fehlgeschlagen
```bash
# Logs prüfen
eas build:list

# Lokalen Build testen
eas build --platform android --profile preview --local
```

---

## 📞 Support

Bei Problemen:
- GitHub Issues
- Discord Community
- support@salesflow.ai

---

**AURA OS v1.0.0** - Built with ❤️ by Sales Flow AI

