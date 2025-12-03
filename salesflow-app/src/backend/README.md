# 🚀 Sales Flow AI - Backend

> FastAPI Backend für den KI-Vertriebs-Copilot

## 📦 Tech Stack

- **Framework:** FastAPI + Python 3.11
- **Database:** Supabase (PostgreSQL)
- **AI:** Claude API (Anthropic), OpenAI Embeddings
- **Voice:** Whisper (STT), ElevenLabs (TTS)

## 🚀 Quick Start

```bash
# 1. Abhängigkeiten installieren
cd backend
pip install -r requirements.txt

# 2. Environment Variables setzen
cp .env.example .env
# Dann SUPABASE_URL, SUPABASE_KEY, ANTHROPIC_API_KEY eintragen

# 3. Server starten
python -m uvicorn app.main:app --reload --port 8000

# 4. API Docs öffnen
# http://localhost:8000/docs
```

## 📁 Projektstruktur

```
backend/
├── app/
│   ├── api/
│   │   ├── routes/
│   │   │   ├── analytics.py      # Template Analytics & Learning Events
│   │   │   ├── chat_import.py    # Chat Import (Instagram, WhatsApp, etc.)
│   │   │   ├── knowledge.py      # Evidence Hub & Knowledge Search
│   │   │   ├── learning.py       # Learning Events & Aggregates
│   │   │   └── voice.py          # Voice In/Out (STT/TTS)
│   │   └── schemas/              # Pydantic Models
│   ├── config/
│   │   └── prompts/              # CHIEF AI Prompts
│   │       ├── chief_prompt.py
│   │       ├── chief_knowledge.py
│   │       └── chief_template_insights.py
│   ├── domain/
│   │   ├── goals/                # Goal Calculation Engine
│   │   └── verticals/            # Vertical Adapters
│   ├── jobs/
│   │   └── aggregate_learning.py # Cronjob für Aggregation
│   ├── services/
│   │   ├── analytics/            # Analytics Service
│   │   ├── knowledge/            # Knowledge & Embedding Service
│   │   ├── learning/             # Learning Service
│   │   └── ...
│   └── main.py                   # FastAPI App Entry
├── data/
│   ├── EVIDENCE_HUB_COMPLETE.json
│   └── MARKETING_INTELLIGENCE.json
├── migrations/                   # SQL Migrations
├── scripts/                      # CLI Tools
│   ├── import_knowledge.py
│   └── generate_embeddings.py
└── requirements.txt
```

## 🔧 API Endpoints

### Analytics
```
GET  /api/v1/analytics/dashboard       # Dashboard mit KPIs
GET  /api/v1/analytics/templates       # Top Templates
GET  /api/v1/analytics/templates/{id}  # Template Details
GET  /api/v1/analytics/channels        # Channel Performance
GET  /api/v1/analytics/timeseries      # Trend-Daten
```

### Learning Events
```
POST /api/v1/analytics/events          # Event tracken
GET  /api/v1/analytics/events          # Events abrufen
POST /api/v1/analytics/track/template-used
POST /api/v1/analytics/track/response
POST /api/v1/analytics/track/outcome
```

### Knowledge System
```
GET  /api/v1/knowledge/items           # Items auflisten
POST /api/v1/knowledge/items           # Item erstellen
GET  /api/v1/knowledge/items/{id}      # Item abrufen
POST /api/v1/knowledge/search          # Hybrid Search
POST /api/v1/knowledge/import          # Bulk Import
```

### Chat Import
```
POST /api/v1/leads/import-from-chat    # Chat analysieren
POST /api/v1/leads/import-from-chat/save  # Lead speichern
```

### Voice
```
POST /api/v1/voice/transcribe          # Audio → Text
POST /api/v1/voice/synthesize          # Text → Audio
```

## 🔨 CLI Scripts

### Knowledge Import
```bash
# Dry-Run (nur Validierung)
python -m scripts.import_knowledge --file data/EVIDENCE_HUB_COMPLETE.json --dry-run

# Echter Import
python -m scripts.import_knowledge --file data/EVIDENCE_HUB_COMPLETE.json

# Mit Company
python -m scripts.import_knowledge --file data/zinzino.json --company zinzino
```

### Embedding Generation
```bash
# Alle fehlenden Embeddings generieren
python -m scripts.generate_embeddings

# Mit Limit
python -m scripts.generate_embeddings --limit 100
```

## 🗃️ Database Migrations

```bash
# Alle Migrations auf Supabase ausführen
supabase db push

# Oder einzeln:
psql -h <SUPABASE_HOST> -U postgres -d postgres -f migrations/014_learning_system.sql
psql -h <SUPABASE_HOST> -U postgres -d postgres -f migrations/015_knowledge_system.sql
```

## 🔐 Environment Variables

```env
# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your-anon-key
SUPABASE_SERVICE_KEY=your-service-key

# AI APIs
ANTHROPIC_API_KEY=sk-ant-...
OPENAI_API_KEY=sk-...

# Voice (optional)
ELEVENLABS_API_KEY=...

# Embedding Model
EMBEDDING_MODEL=text-embedding-3-small
```

## 📊 Cronjobs

### Learning Aggregation (täglich)
```bash
# Crontab hinzufügen
0 2 * * * cd /path/to/backend && python -m app.jobs.aggregate_learning
```

## 🧪 Testing

```bash
# Tests ausführen
pytest tests/

# Mit Coverage
pytest --cov=app tests/
```

## 📚 Dokumentation

- **Swagger UI:** http://localhost:8000/docs
- **ReDoc:** http://localhost:8000/redoc
- **API Schema:** http://localhost:8000/openapi.json

## 🏗️ Feature Status

| Feature | Status | Notes |
|---------|--------|-------|
| Goal Calculation | ✅ | Multi-Vertical |
| CHIEF Chat | ✅ | Claude API |
| Analytics API | ✅ | Full CRUD |
| Learning Events | ✅ | Template Tracking |
| Knowledge System | ✅ | Hybrid Search |
| Chat Import | ✅ | KI-Analyse |
| Voice In/Out | ✅ | Whisper + ElevenLabs |
| Vertical Adapters | ✅ | NM, Real Estate, Coaching |

---

**Built with ❤️ for Sales Teams**


