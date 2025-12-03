# 🔧 BACKEND SETUP - TITANIUM EDITION

Vollständige Anleitung zum Setup des FastAPI Backends.

---

## 📦 WAS IST TITANIUM EDITION?

**Titanium = Industriequalität für skalierbare KI-Agenten**

Eigenschaften:
- 🔒 **Maximum Safety** (venv, .env checks)
- 🔄 **Self-Healing** (funktioniert auch ohne JSON-Dateien)
- ♻️ **Vollständig Idempotent** (100x ausführbar, immer sicher)
- 🎯 **One-Click Setup** (alles automatisiert)
- 🏭 **Production-Ready** (für 1000+ KI-Agents)

---

## ⚡ QUICK SETUP (3 Schritte, 5 Minuten)

### STEP 1: Database Schema (1 Min)

1. Öffne: https://supabase.com/dashboard/project/lncwvbhcafkdorypnpnz/sql
2. Gehe zu: SQL Editor
3. Kopiere & Einfügen: `backend/db/fix_schema_titanium.sql`
4. Klicke: **Run**
5. Erwarte: ✅ Success + NOTICE messages

**Erwartete Ausgabe:**
```sql
NOTICE: Added frequency_score column to objections
NOTICE: Added psychology_tags column to objections
NOTICE: Created index on frequency_score

✅ TITANIUM SCHEMA FIX COMPLETED SUCCESSFULLY!
```

---

### STEP 2: Titanium Setup Ausführen (2 Min)

```powershell
cd backend
.\setup.ps1
```

**Was passiert:**
1. ✅ Prüft `.env` Datei
2. ✅ Prüft Python Installation
3. ✅ Erstellt Virtual Environment
4. ✅ Installiert Dependencies
5. ✅ Fragt nach Schema-Bestätigung
6. ✅ Führt Titanium Import aus

**Erwartete Ausgabe:**
```
🤖 SALES FLOW AI - TITANIUM SETUP
==================================

✅ .env file found
✅ Python found: Python 3.11.x
✅ Virtual environment created
✅ Dependencies installed successfully

🚀 Starting Titanium Import Engine...

╔══════════════════════════════════════════════════╗
║         TITANIUM IMPORT ENGINE v1.0              ║
╚══════════════════════════════════════════════════╝

📖 Loading objections from: data/objections_import.json
📊 Found 20 objections to import

✅ [1/20] Imported: Das ist zu teuer für mich...
✅ [2/20] Imported: Ich habe keine Zeit...
...

📊 IMPORT COMPLETE
═══════════════════════════════════════════════════
   ✅ New:      20
   ⏭️  Skipped:  0 (already existed)
   ❌ Errors:   0
   📊 Total:    20
═══════════════════════════════════════════════════

🎉 ALL IMPORTS COMPLETED SUCCESSFULLY!
```

---

### STEP 3: Backend Starten (1 Min)

```bash
# Aus dem backend/ Verzeichnis:
uvicorn app.main:app --reload --port 8000
```

**Test:**
- Browser öffnen: http://localhost:8000
- Sollte zeigen: `{"status": "online", "service": "Sales Flow AI Backend"}`

**API Docs:**
- Browser öffnen: http://localhost:8000/docs
- Sollte zeigen: FastAPI Swagger UI

---

## 📁 FILE STRUKTUR

```
backend/
├── setup.ps1                       # Titanium Launcher
├── .env                            # Deine Credentials (WICHTIG!)
│
├── app/
│   ├── main.py                     # FastAPI Application
│   ├── routers/                    # API Endpoints
│   │   ├── objections.py
│   │   ├── templates.py
│   │   ├── playbooks.py
│   │   ├── revenue.py
│   │   ├── sequences.py
│   │   └── ...
│   └── services/                   # Business Logic
│
├── db/
│   └── fix_schema_titanium.sql     # Database Schema
│
├── data/
│   ├── objections_import.json      # 20 Objections
│   ├── message_templates_chatgpt.json
│   └── playbooks_chatgpt.json
│
├── scripts/
│   └── titanium_import.py          # Import Engine
│
└── requirements.txt                # Python Dependencies
```

---

## ⚙️ CONFIGURATION

### `.env` Datei (ERFORDERLICH)

Erstelle: `backend/.env`

```env
# Supabase Credentials
SUPABASE_URL=https://lncwvbhcafkdorypnpnz.supabase.co
SUPABASE_KEY=your-anon-key-here
SUPABASE_SERVICE_KEY=your-service-key-here

# OpenAI (Optional für MVP)
OPENAI_API_KEY=sk-your-key-here

# Environment
ENVIRONMENT=development
DEBUG=True
BACKEND_PORT=8000
```

**Credentials holen:**
https://supabase.com/dashboard/project/lncwvbhcafkdorypnpnz/settings/api

---

## 🧪 TESTING

### Health Check
```bash
curl http://localhost:8000/health
```

Erwarte:
```json
{
  "status": "online",
  "timestamp": "2025-11-30T...",
  "environment": "development",
  "database": "connected"
}
```

### Objections Endpoint
```bash
curl http://localhost:8000/api/objections
```

Sollte: Liste von 20 Objections zurückgeben

### Interactive Docs
http://localhost:8000/docs

Teste alle Endpoints direkt im Browser!

---

## 🔄 RE-RUN SETUP (Idempotent!)

**Ist es sicher, mehrmals auszuführen?** JA! 100% SICHER!

```powershell
.\setup.ps1
```

**Was passiert:**
```
Run 1: ✅ objections: 20 new, 0 skipped
Run 2: ✅ objections: 0 new, 20 skipped (already exist)
Run 3: ✅ objections: 0 new, 20 skipped (already exist)
```

**Keine Duplikate JEMALS!**

---

## 🐛 TROUBLESHOOTING

### Error: "No .env file found"
**Lösung:** Erstelle `backend/.env` mit Supabase Credentials

### Error: "Python not found"
**Lösung:** Installiere Python 3.10 oder 3.11
- Download: https://www.python.org/downloads/
- Wichtig: "Add Python to PATH" ankreuzen

### Error: "PowerShell Execution Policy"
```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

### Error: "Could not find the 'frequency_score' column"
**Lösung:** SQL Schema noch nicht ausgeführt!
- Step 1 wiederholen: `fix_schema_titanium.sql` in Supabase

### Error: "Failed to insert objection"
**Mögliche Ursachen:**
1. Schema not deployed → Run `fix_schema_titanium.sql`
2. Wrong credentials → Check `.env` file
3. Network issue → Check internet connection

---

## 📊 WAS WIRD IMPORTIERT?

### Objections (20 Items)
- **Kategorien:** preis, zeit, konkurrenz, vertrauen, risiko, etc.
- **Psychology Tags:** Loss Aversion, Status Quo Bias, etc.
- **Industries:** network_marketing, real_estate, finance
- **Scores:** frequency_score (0-100), severity (1-10)

### Objection Responses (40-60 Items)
- **Techniques:** ROI Reframe, Social Proof, Risk Reversal, etc.
- **Scripts:** Ready-to-use response templates
- **Success Rates:** low, medium, high
- **Tones:** empathetic, consultative, confident

### Message Templates (30+ Items)
- **Kanäle:** email, linkedin, whatsapp
- **Kategorien:** first_contact, followup, objection, closing
- **Sprachen:** DE & EN

### Playbooks (10+ Items)
- **Verticals:** Solar, Real Estate, Finance, SaaS
- **Triggers:** Lead created, Objection detected, Meeting scheduled
- **Actions:** Send template, Create task, Update status

---

## 🚀 PRODUCTION CHECKLIST

Vor dem Live-Gang:

- [ ] Row Level Security (RLS) in Supabase aktivieren
- [ ] API Rate Limiting konfigurieren
- [ ] CORS Origins auf Production-Domains beschränken
- [ ] Environment Variables sichern (keine Secrets im Code!)
- [ ] Backup-Strategie implementieren
- [ ] Monitoring/Logging aktivieren (Sentry, LogRocket)
- [ ] Health Checks für Uptime-Monitoring
- [ ] SSL/HTTPS für alle Verbindungen

---

## 🎯 NÄCHSTE SCHRITTE

Nach Backend Setup:

1. **Frontend Integration** → siehe `docs/02_FRONTEND_INTEGRATION.md`
2. **API Testing** → Postman Collection erstellen
3. **Deployment** → Railway, Render, oder Fly.io

---

## 📞 SUPPORT

Bei Problemen:
1. Check Troubleshooting Section oben
2. Review Supabase Logs im Dashboard
3. Check Backend Logs in Terminal
4. Browser Console für Frontend-Fehler

**Häufigste Fehler:**
- `.env` Datei fehlt
- Falsches Supabase Project
- PowerShell ExecutionPolicy
- Python nicht im PATH

**Alle lösbar in < 5 Minuten!**

---

**Backend Ready! 💎 Weiter mit Frontend Integration →**

