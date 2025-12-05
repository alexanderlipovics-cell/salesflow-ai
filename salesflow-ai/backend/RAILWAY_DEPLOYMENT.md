# 🚀 Railway Deployment Guide - SalesFlow AI Backend

## 📋 Voraussetzungen

- Railway Account: https://railway.app/
- Zugang zu Supabase Projekt
- OpenAI API Key

## 🔧 Deployment Schritte

### 1. Projekt in Railway importieren

```bash
# Option A: GitHub Repository verknüpfen
# - Gehe zu railway.app/new
# - Wähle "Deploy from GitHub repo"
# - Wähle dieses Repository
# - Root Directory: /backend

# Option B: Railway CLI
npm i -g @railway/cli
railway login
railway init
railway up
```

### 2. Environment Variables setzen

Gehe zu deinem Railway Projekt → Variables und füge folgende hinzu:

```env
# OpenAI Configuration
OPENAI_API_KEY=sk-proj-...
OPENAI_MODEL=gpt-4o-mini

# Supabase Configuration
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbG...

# Default Configuration (Optional)
DEFAULT_ORG_ID=demo-org
DEFAULT_USER_ID=demo-user
DEFAULT_USER_NAME=Demo User

# Railway setzt automatisch:
# PORT=8000 (oder dynamisch)
```

### 3. Deployment starten

Railway deployt automatisch nach jedem Push zu GitHub (wenn connected).

Oder manuell:
```bash
railway up
```

### 4. Health Check verifizieren

Nach dem Deployment:
```bash
curl https://your-app.railway.app/health
# Erwartete Antwort: {"status":"healthy"}
```

## 📊 Konfigurationsdateien

### railway.toml
- Builder: NIXPACKS (automatische Erkennung von Python/FastAPI)
- Start Command: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
- Health Check: `/health` Endpoint
- Restart Policy: ON_FAILURE mit 10 Retries

### Procfile (Fallback)
- Backup für Heroku-kompatibles Deployment

## 🔍 Monitoring

### Logs anzeigen
```bash
railway logs
```

### Service Status
```bash
railway status
```

## 🐛 Troubleshooting

### Problem: Import Errors
**Lösung:** Stelle sicher, dass alle Dependencies in `requirements.txt` sind:
```bash
pip freeze > requirements.txt
```

### Problem: Health Check fails
**Lösung:** Überprüfe, ob `/health` Endpoint erreichbar ist:
```python
# In app/main.py sollte existieren:
@app.get("/health")
async def health():
    return {"status": "healthy"}
```

### Problem: Port Binding Error
**Lösung:** Railway setzt `$PORT` automatisch. Nutze:
```python
import os
port = int(os.getenv("PORT", 8000))
```

### Problem: Module not found
**Lösung:** Prüfe Python Version in Railway:
```bash
# Railway nutzt Python 3.11+ standardmäßig
# Falls nötig, spezifiziere in runtime.txt:
echo "python-3.11" > runtime.txt
```

## 📦 Dependencies Check

Aktuelle `requirements.txt` enthält:
- ✅ fastapi==0.115.0
- ✅ uvicorn[standard]==0.30.6
- ✅ pydantic==2.9.2
- ✅ python-dotenv==1.0.1
- ✅ openai==1.52.2
- ✅ anthropic>=0.18.0
- ✅ supabase==2.6.0
- ✅ pytest==8.3.3
- ✅ httpx>=0.25.0

**Fehlende Dependency:** `pydantic-settings` (wird in config.py verwendet!)

### Fix:
```bash
cd backend
pip install pydantic-settings
pip freeze | grep pydantic-settings >> requirements.txt
```

## 🌐 API Endpoints

Nach erfolgreichem Deployment sind folgende Endpoints verfügbar:

- `GET /` - Root Status
- `GET /health` - Health Check
- `GET /docs` - Swagger UI (FastAPI Auto-Docs)
- `GET /redoc` - ReDoc (Alternative Docs)
- `/api/leads/*` - Lead Management
- `/api/copilot/*` - AI Copilot
- `/api/chat/*` - Chat System
- `/api/autopilot/*` - Autopilot Features
- `/api/analytics/*` - Analytics
- `/api/webhooks/*` - Channel Webhooks
- `/api/lead-generation/*` - Lead Generation System
- `/api/idps/*` - Intelligent DM Persistence System

## 🔐 Security Checklist

- [ ] Environment Variables gesetzt (keine Secrets im Code!)
- [ ] CORS korrekt konfiguriert (nicht `allow_origins=["*"]` in Production!)
- [ ] Supabase Row Level Security aktiviert
- [ ] API Rate Limiting implementiert (empfohlen)
- [ ] HTTPS erzwungen (Railway macht das automatisch)

## 🚀 Nach dem Deployment

1. **API URL notieren:**
   ```
   https://your-app.railway.app
   ```

2. **Frontend ENV aktualisieren:**
   ```env
   VITE_API_URL=https://your-app.railway.app
   ```

3. **Testen:**
   ```bash
   # Health Check
   curl https://your-app.railway.app/health
   
   # API Docs
   open https://your-app.railway.app/docs
   ```

## 📈 Performance Tipps

- Railway Free Tier: 500h/Monat, 512MB RAM, shared CPU
- Für Production: Upgrade auf Pro ($20/Monat) für bessere Performance
- Enable Auto-Scaling in Railway Dashboard
- Consider Redis für Caching (Railway Redis Plugin)

## 📞 Support

- Railway Docs: https://docs.railway.app/
- Railway Discord: https://discord.gg/railway
- SalesFlow Issues: GitHub Issues

---

**Geschätzte Deployment-Zeit: 5-10 Minuten** ⚡

