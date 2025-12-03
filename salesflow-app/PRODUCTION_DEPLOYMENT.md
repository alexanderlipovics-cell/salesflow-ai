# 🚀 SALES FLOW AI - PRODUCTION DEPLOYMENT

## Quick-Start (5 Minuten)

### 1. Backend API Key setzen

```bash
# In src/backend/ die Datei ENV_TEMPLATE.txt nach .env umbenennen
# Dann deinen Anthropic API Key eintragen:

ANTHROPIC_API_KEY=sk-ant-api03-DEIN_ECHTER_KEY
```

### 2. Datenbank Migration (Supabase)

1. Öffne [Supabase Dashboard](https://supabase.com/dashboard) → SQL Editor
2. Kopiere den Inhalt von `src/backend/migrations/DEPLOY_PRODUCTION.sql`
3. Ausführen → Fertig!

### 3. Backend deployen (Render.com)

1. Gehe zu [render.com](https://render.com) → New Web Service
2. Verbinde dein GitHub Repository
3. Setze Root Directory: `src/backend`
4. Environment Variables setzen:
   - `ANTHROPIC_API_KEY` = dein Key
   - `SUPABASE_URL` = https://lncwvbhcafkdorypnpnz.supabase.co
   - `SUPABASE_ANON_KEY` = (aus ENV_TEMPLATE.txt)

### 4. App bauen (Expo EAS)

```bash
# Login bei Expo
npx eas login

# Preview Build (für interne Tests)
npx eas build --platform all --profile preview

# Production Build (für App Stores)
npx eas build --platform all --profile production
```

---

## 📋 Vollständige Checkliste

### ✅ Backend Setup

| Schritt | Status | Befehl/Aktion |
|---------|--------|---------------|
| .env erstellen | ⬜ | `ENV_TEMPLATE.txt` → `.env` umbenennen |
| API Key eintragen | ⬜ | ANTHROPIC_API_KEY setzen |
| Lokal testen | ⬜ | `cd src/backend && uvicorn app.main:app --reload` |
| Health Check | ⬜ | http://localhost:8000/health |

### ✅ Datenbank (Supabase)

| Schritt | Status | SQL Datei |
|---------|--------|-----------|
| Core Tables | ⬜ | `DEPLOY_PRODUCTION.sql` ausführen |
| Prüfen | ⬜ | Tabellen in Supabase sichtbar? |

### ✅ Hosting (Render.com)

| Schritt | Status | Details |
|---------|--------|---------|
| Account erstellen | ⬜ | [render.com](https://render.com) |
| GitHub verbinden | ⬜ | Repository auswählen |
| Web Service | ⬜ | Python, Root: `src/backend` |
| Env Vars setzen | ⬜ | ANTHROPIC_API_KEY, SUPABASE_* |
| Deploy | ⬜ | Auto-Deploy bei Push |

### ✅ Frontend (Expo)

| Schritt | Status | Befehl |
|---------|--------|--------|
| EAS CLI installieren | ⬜ | `npm install -g eas-cli` |
| Login | ⬜ | `npx eas login` |
| API URL aktualisieren | ⬜ | In `eas.json` Production URL setzen |
| Preview Build | ⬜ | `npx eas build --profile preview` |
| Testen | ⬜ | APK/IPA auf Testgeräten |
| Production Build | ⬜ | `npx eas build --profile production` |

---

## 📁 Erstellte Deployment-Dateien

```
salesflow-app/
├── eas.json                    # Expo Build Konfiguration
├── PRODUCTION_DEPLOYMENT.md    # Diese Anleitung
│
└── src/backend/
    ├── ENV_TEMPLATE.txt        # → Umbenennen zu .env
    ├── requirements.txt        # Python Dependencies
    ├── Procfile               # Für Heroku/Render
    ├── render.yaml            # Render.com Blueprint
    │
    └── migrations/
        └── DEPLOY_PRODUCTION.sql  # Alle DB Migrations
```

---

## 🔧 Wichtige URLs

| Service | URL |
|---------|-----|
| **Backend API** | https://salesflow-api.onrender.com |
| **API Docs** | https://salesflow-api.onrender.com/docs |
| **Supabase** | https://supabase.com/dashboard |
| **Expo Dashboard** | https://expo.dev |

---

## ⚡ Schnellbefehle

```bash
# Backend lokal starten
cd src/backend
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000

# Frontend lokal starten
npx expo start --web --port 8084

# Preview Build erstellen
npx eas build --platform android --profile preview

# Logs auf Render anzeigen
# → Dashboard → Service → Logs Tab
```

---

## 🆘 Troubleshooting

### "ANTHROPIC_API_KEY not configured"
→ .env Datei erstellt? API Key korrekt eingetragen?

### "Supabase connection failed"
→ SUPABASE_URL und SUPABASE_ANON_KEY prüfen

### "Build failed" (EAS)
→ `npx expo doctor` ausführen, Dependencies prüfen

### API antwortet nicht
→ Render Dashboard → Logs prüfen

---

## 🎉 Nach erfolgreichem Deployment

1. ✅ API Health Check: `curl https://your-api.onrender.com/health`
2. ✅ App installieren und testen
3. ✅ Ein Follow-up anlegen und CHIEF Vorschlag testen
4. ✅ Daily Flow einrichten

**Du bist LIVE! 🚀**

