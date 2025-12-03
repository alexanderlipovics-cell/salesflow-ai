# 📋 COMPLETE INTEGRATION CHECKLIST

## Sales Flow AI - Advanced Features Integration

---

## 1. SQL SCHEMA (5 Min) ✅

### Schritt 1: Supabase SQL ausführen

```bash
1. Öffne https://supabase.com
2. Wähle dein Projekt
3. SQL Editor → New Query
4. Kopiere backend/db/schema_complete.sql
5. Paste & RUN
6. Erwarte: Success ✅
```

### Schritt 2: Verifizierung

```sql
-- Prüfe ob alle Tabellen existieren
SELECT COUNT(*) 
FROM information_schema.tables 
WHERE table_schema = 'public';

-- Erwarte: ~15-20 Tabellen

-- Liste alle Tabellen auf
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public'
ORDER BY table_name;
```

### Erwartete Tabellen:
- ✅ `lead_scoring_history`
- ✅ `playbooks`
- ✅ `playbook_runs`
- ✅ `ab_tests`
- ✅ `ab_variants`
- ✅ `ab_events`
- ✅ `message_sequences`
- ✅ `sequence_steps`
- ✅ `message_templates` (aus vorherigem Schema)
- ✅ `template_performance` (aus vorherigem Schema)

---

## 2. BACKEND FILES ✅ BEREITS ERSTELLT

### Services (backend/app/services/)
- ✅ `playbook_engine.py` - Playbook Execution Engine
- ✅ `ab_test_engine.py` - A/B Testing Engine
- ✅ `company_knowledge.py` - Existing service
- ✅ `__init__.py` - Updated exports

### Routers (backend/app/routers/)
- ✅ `playbooks.py` - Playbook API endpoints
- ✅ `ab_tests.py` - A/B Testing API endpoints
- ✅ `analytics.py` - Analytics endpoints
- ✅ `templates.py` - Template management
- ✅ `objections.py` - Objection library
- ✅ Existing: chat, objection_brain, next_best_actions, gtm_copy

### Main App
- ✅ `backend/app/main.py` - All routers imported and mounted

---

## 3. API ENDPOINTS VERFÜGBAR

### Playbooks API (`/api/playbooks`)
```
GET    /api/playbooks/                    - List all playbooks
GET    /api/playbooks/{playbook_id}       - Get playbook details
GET    /api/playbooks/categories/list     - List categories
POST   /api/playbooks/{id}/track-usage    - Track usage
```

### A/B Tests API (`/api/ab-tests`)
```
POST   /api/ab-tests/                     - Create test
GET    /api/ab-tests/                     - List tests
GET    /api/ab-tests/{test_id}            - Get test details
POST   /api/ab-tests/{test_id}/start      - Start test
POST   /api/ab-tests/{test_id}/assign/{lead_id} - Assign variant
POST   /api/ab-tests/{test_id}/conversion - Record conversion
GET    /api/ab-tests/{test_id}/results    - Get results
POST   /api/ab-tests/{test_id}/complete   - Complete test
DELETE /api/ab-tests/{test_id}            - Delete test (draft only)
```

### Analytics API (`/api/analytics`)
```
GET    /api/analytics/team-performance    - Team metrics
GET    /api/analytics/objection-stats     - Objection statistics
GET    /api/analytics/user-activity/{id}  - User activity
GET    /api/analytics/conversion-metrics  - Conversion funnel
GET    /api/analytics/objection-trends    - Trend analysis
GET    /api/analytics/team-leaderboard    - Team ranking
```

### Templates API (`/api/templates`)
```
GET    /api/templates/                    - List templates
POST   /api/templates/                    - Create template
GET    /api/templates/{template_id}       - Get template
PUT    /api/templates/{template_id}       - Update template
DELETE /api/templates/{template_id}       - Delete template
GET    /api/templates/performance         - Performance metrics
POST   /api/templates/{id}/test           - Preview/test template
```

---

## 4. TESTING

### Test Backend Startup

```bash
cd backend
.\venv\Scripts\Activate.ps1
uvicorn app.main:app --reload --port 8000
```

### Test API Docs

```
Öffne: http://localhost:8000/docs

Erwarte:
✅ Swagger UI lädt
✅ Alle Router-Sections sichtbar:
   - Chat
   - Objection Brain
   - Next Best Actions
   - GTM Copy
   - Knowledge Base
   - Analytics
   - Playbooks
   - A/B Testing
   - Templates
```

### Quick Health Check

```bash
curl http://localhost:8000/health

Erwarte:
{
  "status": "online",
  "timestamp": "...",
  "environment": "development",
  "database": "connected"
}
```

---

## 5. EXAMPLE USAGE

### Beispiel 1: Create A/B Test

```bash
POST http://localhost:8000/api/ab-tests/
{
  "name": "WhatsApp Template Test",
  "metric": "reply_rate",
  "variants": [
    {
      "name": "Variant A - Friendly",
      "template_id": "template-uuid-here",
      "traffic_split": 50
    },
    {
      "name": "Variant B - Direct",
      "template_id": "template-uuid-here",
      "traffic_split": 50
    }
  ]
}
```

### Beispiel 2: Start Playbook

```python
from app.services import PlaybookEngine

engine = PlaybookEngine(supabase)
await engine.start_playbook(
    playbook_id="playbook-uuid",
    lead_id="lead-uuid"
)
```

### Beispiel 3: Get Analytics

```bash
GET http://localhost:8000/api/analytics/objection-stats?days=30

Response:
{
  "total_objections": 156,
  "handled_successfully": 122,
  "success_rate": 0.78,
  "most_common_objections": [...],
  "objections_by_category": {...}
}
```

---

## 6. DEPENDENCIES CHECK

### Required Python Packages

```bash
# Sollten bereits installiert sein:
pip list | grep -E "fastapi|supabase|pydantic|pandas"

Erwarte:
✅ fastapi
✅ supabase
✅ pydantic
✅ pandas
✅ python-dotenv
```

### Install fehlende Packages

```bash
pip install fastapi supabase pydantic pandas python-dotenv
```

---

## 7. ENVIRONMENT VARIABLES

### Required in `.env`:

```bash
# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your-anon-key-here
SUPABASE_SERVICE_KEY=your-service-key-here (optional)

# OpenAI (optional für KI-Features)
OPENAI_API_KEY=sk-...

# Environment
ENVIRONMENT=development
DEBUG=true
```

---

## 8. TROUBLESHOOTING

### Problem: "Database not configured"

**Lösung:**
- Prüfe `.env` Datei
- Verifiziere SUPABASE_URL und SUPABASE_KEY
- Restart Backend

### Problem: "Table does not exist"

**Lösung:**
- SQL Schema nicht ausgeführt
- Führe `backend/db/schema_complete.sql` in Supabase aus

### Problem: Import Errors

**Lösung:**
```bash
# Reinstall dependencies
pip install -r requirements.txt

# Oder manuell:
pip install fastapi supabase pydantic pandas
```

### Problem: Router not found

**Lösung:**
- Prüfe ob Datei existiert in `backend/app/routers/`
- Prüfe Import in `backend/app/main.py`
- Restart Backend

---

## 9. NEXT STEPS

Nach erfolgreicher Integration:

1. **Test alle Endpoints** in `/docs`
2. **Populate Test Data** über API oder SQL
3. **Frontend Integration** vorbereiten
4. **Analytics Dashboard** erstellen
5. **A/B Tests** konfigurieren

---

## 10. SUPPORT

Bei Problemen:
1. Prüfe Terminal Logs
2. Prüfe Supabase Logs
3. Teste mit `/docs` Swagger UI
4. Prüfe Database Connection

**Backend läuft auf:** http://localhost:8000
**API Docs:** http://localhost:8000/docs
**Health Check:** http://localhost:8000/health

---

## ✅ STATUS ÜBERSICHT

| Component | Status | Notes |
|-----------|--------|-------|
| SQL Schema | ✅ Erstellt | `backend/db/schema_complete.sql` |
| Playbook Engine | ✅ Erstellt | `backend/app/services/playbook_engine.py` |
| A/B Test Engine | ✅ Erstellt | `backend/app/services/ab_test_engine.py` |
| Playbooks Router | ✅ Erstellt | `backend/app/routers/playbooks.py` |
| A/B Tests Router | ✅ Erstellt | `backend/app/routers/ab_tests.py` |
| Analytics Router | ✅ Erstellt | `backend/app/routers/analytics.py` |
| Templates Router | ✅ Vorhanden | Bereits implementiert |
| Main App Integration | ✅ Fertig | Alle Router eingebunden |

---

**BEREIT FÜR DEPLOYMENT! 🚀**

