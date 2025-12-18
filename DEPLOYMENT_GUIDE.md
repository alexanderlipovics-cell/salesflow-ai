# 🚀 SalesFlow AI - Deployment Guide

## Übersicht

| Service | Plattform | URL nach Deployment |
|---------|-----------|---------------------|
| **Frontend (Web)** | Vercel | `salesflow-ai.vercel.app` |
| **Backend (API)** | Railway | `salesflow-ai-backend.up.railway.app` |
| **Mobile App** | Expo EAS | App Store / Google Play |
| **Database** | Supabase | Bereits konfiguriert |

---

## 1️⃣ Backend Deployment (Railway)

### Option A: Mit Railway CLI (Empfohlen)

```bash
# 1. Railway CLI installieren
npm install -g @railway/cli

# 2. Einloggen
railway login

# 3. Neues Projekt erstellen
cd backend
railway init

# 4. Environment Variables setzen
railway variables set SUPABASE_URL=https://xxx.supabase.co
railway variables set SUPABASE_KEY=xxx
railway variables set SUPABASE_SERVICE_KEY=xxx
railway variables set OPENAI_API_KEY=sk-xxx
railway variables set JWT_SECRET_KEY=your-secret-min-32-chars
railway variables set CORS_ALLOWED_ORIGINS=https://salesflow-ai.vercel.app

# 5. Deployen
railway up
```

### Option B: Mit GitHub (Auto-Deploy)

1. Gehe zu [railway.app](https://railway.app)
2. Klicke "New Project" → "Deploy from GitHub"
3. Wähle `alexanderlipovics-cell/salesflow-ai`
4. Root Directory: `salesflow-ai/backend`
5. Environment Variables hinzufügen (siehe unten)
6. Deploy!

### Erforderliche Environment Variables (Backend)

```env
# REQUIRED
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your-anon-key
SUPABASE_SERVICE_KEY=your-service-role-key
OPENAI_API_KEY=sk-xxx
JWT_SECRET_KEY=min-32-char-random-string
JWT_ALGORITHM=HS256
CORS_ALLOWED_ORIGINS=https://salesflow-ai.vercel.app,http://localhost:5173

# OPTIONAL
ANTHROPIC_API_KEY=sk-ant-xxx
ENVIRONMENT=production
DEBUG=false
RATE_LIMIT_ENABLED=true
```

---

## 2️⃣ Frontend Deployment (Vercel)

### Mit Vercel CLI

```bash
# 1. Vercel CLI installieren
npm install -g vercel

# 2. In das Projekt-Root wechseln
cd salesflow-ai

# 3. Vercel Login
vercel login

# 4. Deployen
vercel

# 5. Environment Variables in Vercel Dashboard setzen:
# - VITE_SUPABASE_URL
# - VITE_SUPABASE_ANON_KEY
# - VITE_API_URL (Railway Backend URL)

# 6. Production Deploy
vercel --prod
```

### Mit GitHub (Auto-Deploy)

1. Gehe zu [vercel.com](https://vercel.com)
2. Import Project → GitHub → `salesflow-ai`
3. Framework Preset: `Vite`
4. Root Directory: `salesflow-ai` (nicht backend!)
5. Environment Variables:

```
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=xxx
VITE_API_URL=https://salesflow-ai-backend.up.railway.app/api
```

6. Deploy!

### vercel.json anpassen

Die API-Rewrites müssen auf dein Railway Backend zeigen:

```json
{
  "rewrites": [
    { 
      "source": "/api/(.*)", 
      "destination": "https://YOUR-RAILWAY-URL.up.railway.app/api/$1" 
    },
    { "source": "/(.*)", "destination": "/" }
  ]
}
```

---

## 3️⃣ Mobile App Deployment (Expo EAS)

```bash
# 1. In Mobile Ordner wechseln
cd closerclub-mobile

# 2. EAS CLI installieren
npm install -g eas-cli

# 3. EAS Login
eas login

# 4. EAS Build konfigurieren
eas build:configure

# 5. Preview Build (für Tester)
eas build --platform all --profile preview

# 6. Production Build (für App Stores)
eas build --platform all --profile production

# 7. App Store Submit
eas submit --platform ios
eas submit --platform android
```

---

## 4️⃣ Nach dem Deployment

### Backend URL updaten

1. **Frontend `vercel.json`**: Backend URL eintragen
2. **Mobile `src/services/api.ts`**: Backend URL eintragen

### Health Check

```bash
# Backend Status
curl https://YOUR-BACKEND.railway.app/health

# API Docs
open https://YOUR-BACKEND.railway.app/docs
```

### Supabase CORS

1. Supabase Dashboard → Settings → API
2. "Allowed Origins" hinzufügen:
   - `https://salesflow-ai.vercel.app`
   - `http://localhost:5173` (für Dev)

---

## 🔒 Sicherheits-Checkliste

- [ ] `JWT_SECRET_KEY` ist mindestens 32 Zeichen lang
- [ ] `SUPABASE_SERVICE_KEY` ist NICHT im Frontend!
- [ ] CORS ist korrekt konfiguriert
- [ ] Rate Limiting ist aktiviert
- [ ] Environment Variables sind als "Secret" markiert
- [ ] Debug Mode ist aus in Production

---

## 📊 Monitoring

### Railway

- Dashboard zeigt Logs, Metrics, und Deploys
- Automatische Restarts bei Crashes

### Vercel

- Analytics Tab zeigt Traffic
- Functions Tab für API Routes

### Supabase

- Dashboard → Logs für DB Queries
- Dashboard → Auth für User Sessions

---

## 🆘 Troubleshooting

### Backend startet nicht

```bash
# Logs checken
railway logs

# Häufige Probleme:
# - Missing env vars → railway variables list
# - Port nicht gesetzt → Sollte automatisch sein
# - Python version → Muss 3.11+ sein
```

### Frontend API Calls scheitern

```bash
# CORS Fehler?
# - Backend CORS_ALLOWED_ORIGINS checken
# - Vercel rewrites checken

# 404 Fehler?
# - Backend URL in vercel.json korrekt?
# - /api/ Prefix korrekt?
```

### Mobile App verbindet nicht

```bash
# API URL in src/services/api.ts korrekt?
# HTTPS erforderlich für Production!
```

---

## 💰 Kosten-Übersicht

| Service | Free Tier | Geschätzt (Production) |
|---------|-----------|------------------------|
| **Railway** | $5 free credit | ~$10-20/Monat |
| **Vercel** | Unlimited Hobby | $0 (Hobby) |
| **Supabase** | 500MB DB, 2GB Bandwidth | ~$25/Monat (Pro) |
| **OpenAI** | Pay per use | ~$20-50/Monat |
| **Expo EAS** | Free builds | $0-99/Monat |

**Gesamt: ~$55-100/Monat für Production**

---

## 🎉 Fertig!

Nach dem Deployment hast du:

- ✅ **Web App**: `https://salesflow-ai.vercel.app`
- ✅ **API Docs**: `https://YOUR-BACKEND.railway.app/docs`
- ✅ **Mobile App**: In App Stores oder TestFlight

Viel Erfolg mit SalesFlow AI! 🚀

