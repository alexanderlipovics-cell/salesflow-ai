# 🚀 SALES FLOW AI - JETZT DEPLOYEN!

## ✅ ALLES BEREIT FÜR DEPLOYMENT

---

## 📋 SCHRITT 1: Git Repository erstellen (2 Min)

### Option A: GitHub (empfohlen)

1. Gehe zu https://github.com/new
2. Repository Name: `salesflow-ai`
3. Private Repository wählen
4. **Ohne** README erstellen

### Dann in PowerShell:

```powershell
cd C:\Users\Akquise WinStage\Desktop\SALESFLOW

# Git initialisieren
git init
git add .
git commit -m "🚀 Initial commit - Sales Flow AI"

# Remote hinzufügen (ersetze USERNAME)
git remote add origin https://github.com/USERNAME/salesflow-ai.git
git branch -M main
git push -u origin main
```

---

## 📋 SCHRITT 2: Backend deployen - Render.com (5 Min)

### 2.1 Account erstellen
1. Gehe zu https://render.com
2. Sign up mit GitHub

### 2.2 Neuen Web Service erstellen
1. Dashboard → **New** → **Web Service**
2. **Connect Repository** → Wähle `salesflow-ai`
3. Konfiguration:
   - **Name:** `salesflow-api`
   - **Region:** Frankfurt (EU)
   - **Branch:** `main`
   - **Root Directory:** `backend`
   - **Runtime:** Python 3
   - **Build Command:** `pip install -r requirements.txt`
   - **Start Command:** `uvicorn app.main:app --host 0.0.0.0 --port $PORT`

### 2.3 Environment Variables setzen
Klicke auf **Environment** und füge hinzu:

| Variable | Wert |
|----------|------|
| `ENVIRONMENT` | `production` |
| `DEBUG` | `false` |
| `SUPABASE_URL` | `https://incwvbhcafkdorppnpnz.supabase.co` |
| `SUPABASE_KEY` | (dein Key aus Supabase) |
| `DATABASE_URL` | (dein Connection String) |
| `OPENAI_API_KEY` | `sk-proj-...` |
| `ALLOWED_ORIGINS` | `https://salesflow.vercel.app,https://app.salesflow.ai` |
| `CACHE_ENABLED` | `false` |

4. Klicke **Create Web Service**
5. Warte auf Build (ca. 3-5 Min)

### 2.4 API URL kopieren
Nach dem Build bekommst du eine URL wie:
```
https://salesflow-api.onrender.com
```

---

## 📋 SCHRITT 3: Frontend deployen - Vercel (3 Min)

### 3.1 Account erstellen
1. Gehe zu https://vercel.com
2. Sign up mit GitHub

### 3.2 Projekt importieren
1. Dashboard → **Add New** → **Project**
2. **Import Git Repository** → Wähle `salesflow-ai`
3. Konfiguration:
   - **Framework Preset:** Other
   - **Root Directory:** `salesflow-app`
   - **Build Command:** `npx expo export -p web`
   - **Output Directory:** `dist`
   - **Install Command:** `npm install`

### 3.3 Environment Variables setzen

| Variable | Wert |
|----------|------|
| `EXPO_PUBLIC_API_URL` | `https://salesflow-api.onrender.com` |
| `EXPO_PUBLIC_SUPABASE_URL` | `https://incwvbhcafkdorppnpnz.supabase.co` |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | (dein Anon Key) |

4. Klicke **Deploy**
5. Warte auf Build (ca. 2-3 Min)

### 3.4 Frontend URL kopieren
Nach dem Build bekommst du eine URL wie:
```
https://salesflow.vercel.app
```

---

## 📋 SCHRITT 4: CORS aktualisieren (1 Min)

Zurück zu Render.com:
1. Gehe zu deinem Backend Service
2. **Environment** → `ALLOWED_ORIGINS` bearbeiten
3. Füge deine Vercel URL hinzu:
   ```
   https://salesflow.vercel.app,https://app.salesflow.ai
   ```
4. Klicke **Save Changes**
5. Backend wird automatisch neu deployed

---

## 📋 SCHRITT 5: Custom Domain (Optional)

### Backend (Render)
1. Service → **Settings** → **Custom Domains**
2. Füge hinzu: `api.salesflow.ai`
3. DNS-Eintrag bei deinem Provider:
   ```
   CNAME api → salesflow-api.onrender.com
   ```

### Frontend (Vercel)
1. Project → **Settings** → **Domains**
2. Füge hinzu: `app.salesflow.ai`
3. DNS-Eintrag bei deinem Provider:
   ```
   CNAME app → cname.vercel-dns.com
   ```

---

## 📱 SCHRITT 6: Mobile App (Optional)

### Expo EAS Build

```powershell
cd salesflow-app

# EAS CLI installieren
npm install -g eas-cli

# Login
eas login

# Preview Build (APK für Android)
eas build --platform android --profile preview

# Production Build (App Bundle für Play Store)
eas build --platform android --profile production

# iOS Build (benötigt Apple Developer Account)
eas build --platform ios --profile production
```

---

## ✅ DEPLOYMENT CHECKLIST

| Schritt | Status |
|---------|--------|
| Git Repository erstellt | ⬜ |
| Backend auf Render deployed | ⬜ |
| Backend Environment Variables gesetzt | ⬜ |
| Frontend auf Vercel deployed | ⬜ |
| Frontend Environment Variables gesetzt | ⬜ |
| CORS auf Backend aktualisiert | ⬜ |
| Health Check: `https://API_URL/health` | ⬜ |
| Frontend lädt ohne Fehler | ⬜ |

---

## 🧪 TESTEN

### Backend Health Check
```powershell
curl https://salesflow-api.onrender.com/health
```

Erwartete Response:
```json
{
  "status": "healthy",
  "version": "1.0.0",
  "environment": "production"
}
```

### API Docs
```
https://salesflow-api.onrender.com/docs
```

### Frontend
```
https://salesflow.vercel.app
```

---

## 🔧 TROUBLESHOOTING

### "Build failed" auf Render
- Prüfe `requirements.txt` auf fehlende Dependencies
- Prüfe Python Version (3.11 erforderlich)

### "CORS Error" im Frontend
- Prüfe `ALLOWED_ORIGINS` auf Backend
- Stelle sicher, dass die Frontend URL enthalten ist

### "Supabase connection failed"
- Prüfe `SUPABASE_URL` und `SUPABASE_KEY`
- Stelle sicher, dass Row Level Security (RLS) deaktiviert ist für Development

### Frontend zeigt Blank Page
- Öffne Browser Console (F12)
- Prüfe auf JavaScript Errors
- Prüfe `EXPO_PUBLIC_API_URL`

---

## 🎉 GESCHAFFT!

Nach erfolgreichem Deployment hast du:

- ✅ **Backend API** auf `https://salesflow-api.onrender.com`
- ✅ **Web App** auf `https://salesflow.vercel.app`
- ✅ **API Docs** auf `https://salesflow-api.onrender.com/docs`
- ✅ **Mobile App** via Expo Go oder als APK

---

## 💡 KOSTEN

| Service | Free Tier | Paid |
|---------|-----------|------|
| **Render** | 750h/Monat (mit Spin-down) | $7/Monat (immer aktiv) |
| **Vercel** | Unlimited für persönliche Projekte | $20/Monat (Pro) |
| **Supabase** | 500MB DB, 2GB Bandwidth | $25/Monat (Pro) |

**Empfehlung für Start:** Alles kostenlos möglich! 🎉

---

**🚀 LOS GEHT'S - JETZT DEPLOYEN!**

