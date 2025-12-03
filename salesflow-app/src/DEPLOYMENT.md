# 🚀 SALES FLOW AI - PRODUCTION DEPLOYMENT

## Inhaltsverzeichnis
1. [Voraussetzungen](#voraussetzungen)
2. [Backend Deployment](#backend-deployment)
3. [Frontend Deployment](#frontend-deployment)
4. [Environment Variables](#environment-variables)
5. [Monitoring](#monitoring)

---

## Voraussetzungen

### Accounts benötigt:
- ✅ **Supabase** (Bereits konfiguriert)
- ✅ **Anthropic** (Claude API Key)
- 🔲 **Render.com** oder **Railway** (Backend Hosting)
- 🔲 **Vercel** oder **Expo EAS** (Frontend Hosting)
- 🔲 **Sentry** (Error Tracking - optional)

---

## Backend Deployment

### Option A: Render.com (Empfohlen)

1. **Repository verbinden:**
   ```bash
   # render.yaml ist bereits konfiguriert
   ```

2. **Environment Variables setzen:**
   - Gehe zu Render Dashboard → Service → Environment
   - Füge alle Variablen aus `.env.production` hinzu

3. **Deploy:**
   ```bash
   git push origin main
   # Render deployed automatisch
   ```

### Option B: Railway

1. **Projekt erstellen:**
   ```bash
   railway login
   railway init
   ```

2. **Deployen:**
   ```bash
   railway up
   ```

### Option C: Docker

```dockerfile
# Dockerfile bereits vorhanden
docker build -t salesflow-backend .
docker run -p 8000:8000 --env-file .env.production salesflow-backend
```

---

## Frontend Deployment

### Option A: Expo EAS Build (Mobile)

```bash
# Installation
npm install -g eas-cli

# Login
eas login

# Build für iOS
eas build --platform ios --profile production

# Build für Android
eas build --platform android --profile production
```

### Option B: Vercel (Web)

```bash
# In salesflow-app/ Ordner
npx vercel --prod
```

### Option C: Expo Web Export

```bash
npx expo export --platform web
# Dann dist/ Ordner auf beliebigen Webserver deployen
```

---

## Environment Variables

### Backend (Production)

| Variable | Beschreibung | Pflicht |
|----------|--------------|---------|
| `ENVIRONMENT` | `production` | ✅ |
| `SECRET_KEY` | Sicherer Key (32+ chars) | ✅ |
| `SUPABASE_URL` | Supabase Projekt URL | ✅ |
| `SUPABASE_ANON_KEY` | Supabase Anon Key | ✅ |
| `ANTHROPIC_API_KEY` | Claude API Key | ✅ |
| `CORS_ORIGINS` | Erlaubte Frontend URLs | ✅ |
| `SENTRY_DSN` | Sentry Error Tracking | Optional |
| `REDIS_URL` | Redis für Caching | Optional |

### Frontend (app.json / eas.json)

```json
{
  "expo": {
    "extra": {
      "apiUrl": "https://api.salesflow.app",
      "supabaseUrl": "https://xxx.supabase.co",
      "supabaseAnonKey": "eyJ..."
    }
  }
}
```

---

## Monitoring

### Sentry Setup

1. **Account erstellen:** https://sentry.io
2. **Projekt anlegen:** FastAPI + React Native
3. **DSN kopieren** und in ENV setzen:
   ```
   SENTRY_DSN=https://xxx@xxx.ingest.sentry.io/xxx
   ```

### Health Checks

- **Liveness:** `GET /health/live`
- **Readiness:** `GET /health/ready`
- **Metrics:** `GET /metrics`

---

## Checkliste vor Go-Live

- [ ] SECRET_KEY geändert (nicht default!)
- [ ] CORS_ORIGINS auf Production URLs gesetzt
- [ ] ANTHROPIC_API_KEY gültig
- [ ] Supabase RLS Policies aktiv
- [ ] SSL/HTTPS aktiviert
- [ ] Sentry konfiguriert (optional)
- [ ] Backup-Strategie definiert
- [ ] Rate Limiting getestet
- [ ] Error Logging funktioniert

---

## Support

Bei Fragen: support@salesflow.app

