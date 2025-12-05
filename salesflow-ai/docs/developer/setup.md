# 🚀 Local Development Setup

Diese Anleitung führt dich durch die Installation und Konfiguration von SalesFlow AI.

---

## Prerequisites

| Tool | Version | Check |
|------|---------|-------|
| Node.js | >= 18.x | `node --version` |
| Python | >= 3.10 | `python --version` |
| Git | >= 2.x | `git --version` |

---

## 1. Clone Repository

```bash
git clone https://github.com/your-org/salesflow-ai.git
cd salesflow-ai
```

---

## 2. Backend Setup

### 2.1 Virtual Environment

```bash
cd backend
python -m venv venv

# Windows
.\venv\Scripts\activate

# macOS/Linux
source venv/bin/activate
```

### 2.2 Install Dependencies

```bash
pip install -r requirements.txt
```

### 2.3 Environment Variables

Erstelle `backend/.env`:

```bash
# === Supabase ===
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# === AI Providers ===
OPENAI_API_KEY=sk-your-openai-key
ANTHROPIC_API_KEY=sk-ant-your-anthropic-key

# === Security ===
JWT_SECRET_KEY=your-super-secret-jwt-key-min-32-chars
JWT_REFRESH_SECRET_KEY=your-refresh-secret-key-min-32-chars
ENCRYPTION_KEY=your-32-byte-base64-encryption-key

# === App Settings ===
ENVIRONMENT=development
DEBUG=true
RATE_LIMIT_ENABLED=true
```

### 2.4 Start Backend

```bash
cd backend
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Backend läuft auf: `http://localhost:8000`

API Docs: `http://localhost:8000/docs`

---

## 3. Frontend Setup

### 3.1 Install Dependencies

```bash
# Im Projekt-Root
npm install
```

### 3.2 Environment Variables

Erstelle `.env.local`:

```bash
VITE_API_BASE_URL=http://localhost:8000/api
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

### 3.3 Start Frontend

```bash
npm run dev
```

Frontend läuft auf: `http://localhost:5173`

---

## 4. Database Setup (Supabase)

### 4.1 Tabellen erstellen

Führe die Migrationen im Supabase SQL Editor aus:

1. `backend/migrations/20250105_create_users_table.sql`
2. `backend/migrations/20250106_autopilot_v2_tables.sql`
3. `step4_extend_contacts.sql`

### 4.2 Schema Cache neu laden

Nach jeder Migration:

```sql
NOTIFY pgrst, 'reload schema';
```

---

## 5. Verify Installation

### Backend Health Check

```bash
curl http://localhost:8000/health
# Expected: {"status":"healthy"}
```

### Frontend Check

Öffne `http://localhost:5173` - Login-Page sollte erscheinen.

---

## 6. Running Tests

### Backend Tests

```bash
cd backend
pytest -v
```

### Frontend Tests (Cypress)

```bash
# Headless
npm run cy:run

# Interactive
npm run cy:open
```

---

## 7. Common Issues

### "Module not found" Errors

```bash
# Backend
pip install -r requirements.txt --force-reinstall

# Frontend
rm -rf node_modules package-lock.json
npm install
```

### Supabase Connection Error

1. Prüfe ob Projekt nicht pausiert ist (Free Tier pausiert nach 7 Tagen Inaktivität)
2. Prüfe `SUPABASE_URL` und `SUPABASE_SERVICE_ROLE_KEY`
3. Stelle sicher, dass du die Service Role Key verwendest (nicht Anon Key für Backend)

### JWT Errors

- Stelle sicher, dass `JWT_SECRET_KEY` mindestens 32 Zeichen hat
- Prüfe ob Frontend und Backend die gleiche `JWT_SECRET_KEY` verwenden

---

## 8. IDE Setup (VS Code)

### Empfohlene Extensions

```json
{
  "recommendations": [
    "ms-python.python",
    "ms-python.vscode-pylance",
    "dbaeumer.vscode-eslint",
    "esbenp.prettier-vscode",
    "bradlc.vscode-tailwindcss"
  ]
}
```

### Settings

```json
{
  "python.defaultInterpreterPath": "./backend/venv/Scripts/python.exe",
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "[python]": {
    "editor.defaultFormatter": "ms-python.black-formatter"
  }
}
```

---

## Next Steps

- [Architecture](./architecture.md)
- [Database Schema](./database-schema.md)
- [Contributing Guide](./contributing.md)
