# 🚀 Local Development Setup

Folge diesen Schritten, um **SalesFlow AI** lokal zu starten.

---

## Prerequisites

### Required

- **Node.js** >= 18.x
- **Python** >= 3.11
- **Git**
- **Supabase Account** (kostenlos)

### Optional

- **Docker** (für lokale Services)
- **PostgreSQL** (falls nicht Supabase nutzen)
- **Redis** (für Caching, optional)

---

## Installation

### 1. Repository klonen

```bash
git clone https://github.com/your-org/salesflow-ai.git
cd salesflow-ai
```

### 2. Frontend Setup

```bash
# In das Frontend-Verzeichnis wechseln
cd frontend  # Oder: cd . (wenn bereits im Root)

# Dependencies installieren
npm install

# Environment Variables erstellen
cp .env.example .env.local

# .env.local bearbeiten und API-URL eintragen
# VITE_API_BASE_URL=http://localhost:8000
```

### 3. Backend Setup

```bash
# In das Backend-Verzeichnis wechseln
cd backend

# Virtual Environment erstellen (empfohlen)
python -m venv venv

# Virtual Environment aktivieren
# Windows:
venv\Scripts\activate
# macOS/Linux:
source venv/bin/activate

# Dependencies installieren
pip install -r requirements.txt

# Environment Variables erstellen
cp .env.example .env

# .env bearbeiten und eintragen:
# SUPABASE_URL=https://xxxxx.supabase.co
# SUPABASE_SERVICE_ROLE_KEY=eyJ...
# JWT_SECRET_KEY=your-secret-key-here
# OPENAI_API_KEY=sk-...
```

### 4. Supabase Setup

1. Erstellen Sie ein Projekt auf [supabase.com](https://supabase.com)
2. Kopieren Sie die **Project URL** und **Service Role Key**
3. Führen Sie die Migrations aus:
   ```bash
   # Im Supabase SQL Editor:
   # 1. backend/migrations/20250105_create_users_table.sql
   # 2. supabase/migrations/20251205_create_message_events.sql
   # 3. backend/migrations/20250106_autopilot_v2_tables.sql (step3_autopilot_v2_tables_FIXED.sql)
   # 4. step4_extend_contacts.sql
   ```

---

## Running the App

### Frontend Development Server

```bash
# Im Frontend-Verzeichnis
npm run dev
```

Die App ist nun unter **http://localhost:5173** (oder 5174) erreichbar.

### Backend Development Server

```bash
# Im Backend-Verzeichnis
# Virtual Environment muss aktiviert sein
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Die API ist nun unter **http://localhost:8000** erreichbar.

**API Documentation:** http://localhost:8000/docs (Swagger UI)

---

## Running Tests

### Frontend Tests

Wir nutzen **Vitest** für Unit Tests und **Cypress** für E2E Tests.

```bash
# Unit Tests
npm run test

# E2E Tests (Headless)
npm run test:e2e

# E2E Tests (Interactive)
npm run test:e2e:open
```

### Backend Tests

Wir nutzen **pytest** für Backend Tests.

```bash
# Im Backend-Verzeichnis
# Virtual Environment muss aktiviert sein
pytest

# Mit Coverage
pytest --cov=app --cov-report=html

# Spezifische Tests
pytest tests/test_auth.py
```

---

## Development Workflow

### 1. Feature Branch erstellen

```bash
git checkout -b feature/your-feature-name
```

### 2. Änderungen machen

- Frontend: `src/` Verzeichnis
- Backend: `backend/app/` Verzeichnis

### 3. Tests ausführen

```bash
# Frontend
npm run test
npm run test:e2e

# Backend
pytest
```

### 4. Commit & Push

```bash
git add .
git commit -m "feat: your feature description"
git push origin feature/your-feature-name
```

### 5. Pull Request erstellen

- Erstellen Sie einen PR auf GitHub
- Stellen Sie sicher, dass alle Tests grün sind
- Warten Sie auf Code Review

---

## Project Structure

```
salesflow-ai/
├── frontend/                 # React Frontend
│   ├── src/
│   │   ├── components/      # React Components
│   │   ├── pages/           # Page Components
│   │   ├── services/         # API Services
│   │   ├── hooks/           # Custom Hooks
│   │   └── types/           # TypeScript Types
│   ├── public/              # Static Assets
│   └── package.json
│
├── backend/                  # FastAPI Backend
│   ├── app/
│   │   ├── routers/         # API Routers
│   │   ├── services/        # Business Logic
│   │   ├── schemas/         # Pydantic Schemas
│   │   ├── core/            # Core Utilities
│   │   └── main.py          # FastAPI App
│   ├── migrations/          # Database Migrations
│   ├── tests/               # Backend Tests
│   └── requirements.txt
│
├── docs/                     # Documentation
│   ├── developer/           # Developer Docs
│   └── user-guide/          # User Guides
│
└── README.md
```

---

## Environment Variables

### Frontend (.env.local)

```env
VITE_API_BASE_URL=http://localhost:8000
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
```

### Backend (.env)

```env
# Supabase
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# JWT
JWT_SECRET_KEY=your-secret-key-change-in-production
JWT_ALGORITHM=HS256

# AI Services
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...

# Optional
REDIS_URL=redis://localhost:6379
```

---

## Common Issues & Solutions

### Frontend: Port already in use

```bash
# Port ändern in vite.config.ts
export default defineConfig({
  server: {
    port: 5174  # Statt 5173
  }
})
```

### Backend: Module not found

```bash
# Virtual Environment aktivieren
source venv/bin/activate  # macOS/Linux
venv\Scripts\activate     # Windows

# Dependencies neu installieren
pip install -r requirements.txt
```

### Supabase: Connection refused

1. Prüfen Sie, ob das Supabase-Projekt **nicht pausiert** ist
2. Öffnen Sie [Supabase Dashboard](https://app.supabase.com)
3. Klicken Sie auf **"Restore project"** falls pausiert

### Database: Schema cache issue

```sql
-- Im Supabase SQL Editor ausführen:
NOTIFY pgrst, 'reload schema';
```

---

## Code Style

### Frontend

- **ESLint** für Linting
- **Prettier** für Formatting
- **TypeScript** strict mode

```bash
# Linting
npm run lint

# Formatting
npm run format
```

### Backend

- **Black** für Formatting
- **Flake8** für Linting
- **mypy** für Type Checking

```bash
# Formatting
black app/

# Linting
flake8 app/

# Type Checking
mypy app/
```

---

## Debugging

### Frontend

```bash
# Dev Tools öffnen
# Chrome: F12
# React DevTools installieren (Browser Extension)
```

### Backend

```bash
# Debug Mode
python -m uvicorn app.main:app --reload --log-level debug

# Oder mit Python Debugger
import pdb; pdb.set_trace()  # In Code einfügen
```

---

## Next Steps

- [ ] Add Docker setup guide
- [ ] Add CI/CD configuration
- [ ] Add deployment guides
- [ ] Add performance optimization tips

---

## Getting Help

- **Documentation:** `/docs`
- **Issues:** GitHub Issues
- **Discord:** [SalesFlow AI Community](https://discord.gg/salesflow-ai)

