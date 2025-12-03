# Sales Flow AI – CHIEF Coaching Backend ⚙️

Produktionsreifes FastAPI-Backend für das CHIEF Coaching System (Squad Coach). Features:

- Async FastAPI + OpenAI GPT-4 (JSON Mode)
- Pydantic v2 Validation & typed responses
- Redis Caching + SlowAPI Rate Limiting
- Structured Logging (JSON) + observability hooks
- Docker-ready & vollständige Tests (pytest + httpx)

---

## 🚀 Quickstart

```bash
cd backend
python -m venv .venv
.\.venv\Scripts\activate      # Windows
source .venv/bin/activate     # macOS/Linux
pip install -r requirements.txt
cp env.template .env
# trage deinen OPENAI_API_KEY etc. ein
uvicorn app.main:app --reload
```

### Env Variablen
`env.template` enthält alle erforderlichen Variablen (APP_NAME, ALLOWED_ORIGINS, OpenAI, Redis, Rate Limits, Logging). Kopiere nach `.env` und passe Werte an.

---

## 🧠 Kernendpunkte

| Endpoint | Beschreibung |
|----------|--------------|
| `GET /health` | Readiness/Liveness |
| `POST /api/v1/coaching/squad` | Generiert Coaching Output (dry_run-Flag verfügbar) |

Alle Antworten sind strikt JSON-validiert (`CoachingOutput`). Rate Limits: 10/min + 100/h (konfigurierbar).

---

## 🧪 Testing

```bash
pytest
pytest --cov=app
```

Tests decken:
- Endpoint Dry-Run + Validation Errors
- Health Check
- OpenAI-Service (Mocked JSON-Mode Response)

---

## 🐳 Docker & Compose

```bash
docker build -t chief-coaching .
docker run -p 8000:8000 --env-file .env chief-coaching

# oder mit Redis
docker-compose up --build
```

Compose startet API + Redis (persistente Volume `redis_data`).

---

## 📝 Observability & Sicherheit

- **Logging:** JSON Logs (timestamp, level, module, custom fields)
- **Rate Limiting:** SlowAPI + optional Workspace-Key
- **Caching:** Redis TTL (default 1h)
- **CORS:** Konfigurierbar per `ALLOWED_ORIGINS`
- **Error Handling:** 429 bei Rate-Limit, strukturierte 5xx Responses, globaler Catch-All

---

## 📦 Deployment Checklist

1. `pip install -r requirements.txt`
2. `.env` mit realen Keys (OpenAI, Redis, Origins)
3. `docker-compose up -d` oder Uvicorn/Gunicorn Deployment
4. Monitoring anbinden (Log shipper, Sentry/Datadog optional)
5. Tests & Health-Checks ausführen

---

Made with ❤️ for Sales Flow AI – Squad Coach Teams.

