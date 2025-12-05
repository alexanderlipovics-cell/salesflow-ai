# ⚡ Railway Quick Start - 3 Minuten bis zur API URL

## 🎯 Schritt 1: Railway Projekt erstellen (1 Min)

1. Gehe zu **https://railway.app/new**
2. Wähle **"Deploy from GitHub repo"**
3. Autorisiere Railway für dein GitHub Repository
4. Wähle Repository: `salesflow-ai`
5. **Root Directory setzen:** `/backend`
6. Click **"Deploy Now"**

## 🔑 Schritt 2: Environment Variables setzen (1 Min)

Im Railway Dashboard → **Variables** → **Raw Editor**:

```env
OPENAI_API_KEY=sk-proj-...
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbG...
OPENAI_MODEL=gpt-4o-mini
```

**Speichern** → Railway deployt automatisch neu!

## ✅ Schritt 3: URL testen (1 Min)

Railway zeigt die URL an (z.B. `https://salesflow-ai-production.up.railway.app`)

**Test 1 - Health Check:**
```bash
curl https://your-app.railway.app/health
# ✅ {"status":"healthy"}
```

**Test 2 - API Docs:**
```
https://your-app.railway.app/docs
```

**Test 3 - Root:**
```bash
curl https://your-app.railway.app/
# ✅ {"status":"ok","app":"SalesFlow AI"}
```

## 🎉 Fertig!

**Deine API URL:** `https://your-app.railway.app`

### Nächste Schritte:

1. **Frontend aktualisieren:**
   ```env
   # In Frontend .env
   VITE_API_URL=https://your-app.railway.app
   ```

2. **CORS anpassen** (in `backend/app/main.py`):
   ```python
   # Statt allow_origins=["*"]
   allow_origins=[
       "https://your-frontend.netlify.app",
       "https://your-domain.com"
   ]
   ```

3. **Custom Domain** (Optional):
   - Railway Dashboard → Settings → Domains
   - Add Custom Domain

## 🐛 Schnelle Fixes

### Build Error?
```bash
# Logs checken:
railway logs

# Häufigster Fehler: Missing dependency
# Fix: Füge zu requirements.txt hinzu
```

### Health Check Failed?
```bash
# Check ob Port korrekt ist:
# Railway setzt $PORT automatisch
# uvicorn sollte --port $PORT nutzen (bereits konfiguriert!)
```

### Environment Variables nicht geladen?
```bash
# Stelle sicher, dass alle 4 Variablen gesetzt sind:
# 1. OPENAI_API_KEY
# 2. SUPABASE_URL
# 3. SUPABASE_SERVICE_ROLE_KEY
# 4. OPENAI_MODEL
```

## 📊 Railway Dashboard Features

- **Metrics:** CPU, Memory, Network Usage
- **Logs:** Real-time logs mit `railway logs`
- **Deployments:** History aller Deployments
- **Settings:** Custom domains, environment variables

## 💰 Kosten

- **Free Tier:** 500 Stunden/Monat, 512MB RAM
  - Perfekt für Testing & MVP
  
- **Pro:** $20/Monat
  - Bessere Performance
  - Mehr Ressourcen
  - Priority Support

## 🚀 Deploy-Zeit: ~3-5 Minuten

Railway baut und deployt automatisch. Watch the logs:

```bash
railway logs --follow
```

---

**Ready? Los geht's!** 🚂 https://railway.app/new

