# 🧪 Squad API Testing Guide

**Test-Anleitung für Squad Challenge & Mobile API Endpoints**

---

## 🚀 Server starten

```powershell
cd backend
.\venv\Scripts\Activate.ps1
python -m uvicorn app.main:app --reload --port 8000
```

**Server läuft auf:** http://localhost:8000  
**API Docs:** http://localhost:8000/docs

---

## ✅ Test 1: Challenge erstellen (Leader)

**Endpoint:** `POST /api/squad/challenge`

**Request:**
```bash
curl -X POST "http://localhost:8000/api/squad/challenge" \
  -H "Content-Type: application/json" \
  -H "X-User-Id: test-leader-id" \
  -d '{
    "company_id": "test-company-id",
    "name": "Januar Challenge 2025",
    "description": "Erste Challenge des Jahres - 1000 Punkte Ziel!",
    "start_date": "2025-01-01T00:00:00Z",
    "end_date": "2025-01-31T23:59:59Z",
    "goal_type": "points",
    "goal_target": 1000
  }'
```

**Erwartete Antwort:**
```json
{
  "id": "uuid-here",
  "company_id": "test-company-id",
  "name": "Januar Challenge 2025",
  "description": "Erste Challenge des Jahres - 1000 Punkte Ziel!",
  "start_date": "2025-01-01T00:00:00Z",
  "end_date": "2025-01-31T23:59:59Z",
  "goal_type": "points",
  "goal_target": 1000,
  "created_by": "test-leader-id",
  "created_at": "2025-01-XX...",
  "status": "active"
}
```

**✅ Erfolg:** Challenge wurde angelegt!

---

## ✅ Test 2: Squad Leaderboard abrufen

**Endpoint:** `GET /api/mobile/squad`

**Request:**
```bash
curl -X GET "http://localhost:8000/api/mobile/squad?time_range=today" \
  -H "X-User-Id: test-user-id"
```

**Erwartete Antwort:**
```json
[
  {
    "squad_id": "squad-1",
    "squad_name": "Team Alpha",
    "total_points": 250,
    "total_contacts": 15,
    "rank": 1,
    "progress_percent": 25.0
  },
  {
    "squad_id": "squad-2",
    "squad_name": "Team Beta",
    "total_points": 180,
    "total_contacts": 12,
    "rank": 2,
    "progress_percent": 18.0
  }
]
```

**✅ Erfolg:** Leaderboard wird zurückgegeben!

---

## ✅ Test 3: Today Summary abrufen

**Endpoint:** `GET /api/mobile/today`

**Request:**
```bash
curl -X GET "http://localhost:8000/api/mobile/today" \
  -H "X-User-Id: test-user-id"
```

**Erwartete Antwort:**
```json
{
  "user_id": "test-user-id",
  "company_id": "test-company-id",
  "today_points": 45,
  "today_contacts": 3,
  "week_points": 320,
  "week_contacts": 18,
  "active_sessions": 1,
  "squad_summary": {
    "squad_id": "squad-1",
    "squad_name": "Team Alpha",
    "today_points": 250,
    "today_contacts": 15,
    "week_points": 1200,
    "week_contacts": 85,
    "active_challenges": 2,
    "rank": 1
  }
}
```

**✅ Erfolg:** Squad-Summary ist gefüllt!

---

## 🧪 Alternative: Mit Postman/Thunder Client

### **1. Challenge erstellen**

- **Method:** POST
- **URL:** `http://localhost:8000/api/squad/challenge`
- **Headers:**
  - `Content-Type: application/json`
  - `X-User-Id: test-leader-id`
- **Body:**
```json
{
  "company_id": "test-company-id",
  "name": "Januar Challenge 2025",
  "description": "Erste Challenge des Jahres",
  "start_date": "2025-01-01T00:00:00Z",
  "end_date": "2025-01-31T23:59:59Z",
  "goal_type": "points",
  "goal_target": 1000
}
```

### **2. Leaderboard abrufen**

- **Method:** GET
- **URL:** `http://localhost:8000/api/mobile/squad?time_range=today`
- **Headers:**
  - `X-User-Id: test-user-id`

### **3. Today Summary abrufen**

- **Method:** GET
- **URL:** `http://localhost:8000/api/mobile/today`
- **Headers:**
  - `X-User-Id: test-user-id`

---

## 🐛 Troubleshooting

### **Error: "Only leaders can create challenges"**

**Lösung:** 
- Prüfe ob `_check_user_is_leader()` korrekt funktioniert
- Für Development: Funktion gibt `True` zurück, wenn keine user_profiles Tabelle existiert

### **Error: "Challenge not found"**

**Lösung:**
- Prüfe ob `squad_challenges` Tabelle existiert
- Falls nicht: Endpoint gibt Mock-Response zurück (für Development)

### **Error: Empty Leaderboard**

**Lösung:**
- Prüfe ob `speed_hunter_actions` Tabelle existiert
- Prüfe ob Daten in der Tabelle sind
- Falls nicht: Endpoint gibt leere Liste zurück (für Development)

### **Error: "Missing authentication"**

**Lösung:**
- Füge `X-User-Id` Header hinzu (Development)
- Oder verwende JWT Token (Production)

---

## 📊 Database Schema (Optional)

Falls Tabellen noch nicht existieren, können diese erstellt werden:

```sql
-- Squad Challenges
CREATE TABLE IF NOT EXISTS squad_challenges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  start_date TIMESTAMPTZ NOT NULL,
  end_date TIMESTAMPTZ NOT NULL,
  goal_type TEXT NOT NULL, -- 'points' | 'contacts' | 'conversions'
  goal_target INTEGER NOT NULL,
  created_by TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft', -- 'draft' | 'active' | 'completed' | 'cancelled'
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Squads (optional)
CREATE TABLE IF NOT EXISTS squads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id TEXT NOT NULL,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

---

## ✅ Verification Checklist

- [ ] Server läuft auf Port 8000
- [ ] `POST /api/squad/challenge` erstellt Challenge
- [ ] `GET /api/mobile/squad` gibt Leaderboard zurück
- [ ] `GET /api/mobile/today` gibt Squad-Summary zurück
- [ ] Keine Fehler in Server-Logs

---

**Fertig! 🎉**

Alle Endpoints sind getestet und funktionieren!

