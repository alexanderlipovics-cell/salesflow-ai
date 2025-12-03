# 🚀 Sales Flow AI - Dashboard Analytics Deployment Guide

## Übersicht

Dieser Guide führt dich Schritt für Schritt durch das Deployment der Dashboard Analytics Engine.

## 📋 Voraussetzungen

- [x] Supabase Projekt ist erstellt
- [x] PostgreSQL Database ist aktiv
- [x] Tabellen existieren: `events`, `tasks`, `contacts`, `message_templates`, `workspace_users`
- [x] Zugriff auf Supabase SQL Editor

---

## 🗄️ TEIL 1: Database Setup (Supabase SQL Editor)

### Schritt 1: RPC Functions erstellen

1. Öffne Supabase Dashboard → SQL Editor
2. Öffne `backend/supabase/migrations/001_dashboard_rpc_functions.sql`
3. Kopiere den gesamten Inhalt
4. Füge ihn in den SQL Editor ein
5. Klicke auf **RUN**

✅ **Verifizierung:**
```sql
-- Liste alle erstellten Functions
SELECT 
  routine_name,
  routine_type
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name LIKE 'dashboard_%';
```

Du solltest 8 Functions sehen:
- `dashboard_today_overview`
- `dashboard_today_tasks`
- `dashboard_week_overview`
- `dashboard_week_timeseries`
- `dashboard_top_templates`
- `dashboard_funnel_stats`
- `dashboard_top_networkers`
- `dashboard_needs_help`

---

### Schritt 2: Performance Indexes erstellen

1. Öffne Supabase Dashboard → SQL Editor
2. Öffne `backend/supabase/migrations/002_dashboard_indexes.sql`
3. Kopiere den gesamten Inhalt
4. Füge ihn in den SQL Editor ein
5. Klicke auf **RUN**

✅ **Verifizierung:**
```sql
-- Liste alle Dashboard Indexes
SELECT 
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND (indexname LIKE '%workspace%' OR indexname LIKE '%time%')
ORDER BY tablename, indexname;
```

---

### Schritt 3: Test Queries ausführen

1. Öffne `backend/supabase/migrations/003_test_queries.sql`
2. Ersetze `'YOUR_WORKSPACE_ID'` mit einer tatsächlichen UUID:
   ```sql
   -- Finde eine Workspace ID:
   SELECT DISTINCT workspace_id FROM public.events LIMIT 1;
   ```
3. Führe die Test Queries nacheinander aus
4. Verifiziere, dass alle Daten korrekt zurückgegeben werden

✅ **Beispiel Test:**
```sql
-- Test Today Overview
SELECT * FROM dashboard_today_overview('deine-workspace-uuid-hier');
```

---

## 🎨 TEIL 2: Frontend Setup (React/Next.js)

### Schritt 1: Environment Variables setzen

Erstelle/aktualisiere `.env.local`:

```bash
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://dein-projekt.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=dein-anon-key-hier

# Oder für Create React App:
REACT_APP_SUPABASE_URL=https://dein-projekt.supabase.co
REACT_APP_SUPABASE_ANON_KEY=dein-anon-key-hier
```

---

### Schritt 2: Dependencies installieren

```bash
cd sales-flow-ai
npm install @supabase/supabase-js
```

---

### Schritt 3: Types & Hooks sind bereit

Die Dateien sind bereits erstellt:
- ✅ `sales-flow-ai/types/dashboard.ts`
- ✅ `sales-flow-ai/hooks/useDashboardData.ts`

---

### Schritt 4: Dashboard Component implementieren

Beispiel siehe: `sales-flow-ai/components/dashboard/DashboardPage.tsx`

---

## 🐍 TEIL 3: Backend API Setup (FastAPI) [Optional]

Falls du REST API Endpoints zusätzlich zu direkten Supabase RPC Calls möchtest:

### Schritt 1: Dependencies installieren

```bash
cd backend
pip install fastapi supabase pydantic python-dotenv
```

### Schritt 2: Environment Variables

Erstelle `backend/.env`:

```bash
SUPABASE_URL=https://dein-projekt.supabase.co
SUPABASE_SERVICE_KEY=dein-service-role-key-hier
```

### Schritt 3: API Router registrieren

In `backend/app/main.py`:

```python
from app.api.analytics_dashboard import router as dashboard_router

app.include_router(dashboard_router)
```

---

## 🧪 TEIL 4: Testing & Verification

### Performance Tests

```sql
-- Run im Supabase SQL Editor
EXPLAIN ANALYZE
SELECT * FROM dashboard_today_overview('YOUR_WORKSPACE_ID');
```

**Zielwerte:**
- Execution Time: < 100ms
- Planning Time: < 10ms

### Load Tests

```sql
-- Benchmark Complete Dashboard Load
\timing on
SELECT * FROM dashboard_today_overview('YOUR_WORKSPACE_ID');
SELECT * FROM dashboard_week_overview('YOUR_WORKSPACE_ID');
SELECT * FROM dashboard_top_templates('YOUR_WORKSPACE_ID', 30, 20);
\timing off
```

**Gesamtzeit sollte < 500ms sein**

---

## 📊 TEIL 5: Monitoring & Optimization

### Index Usage prüfen

```sql
SELECT 
  schemaname,
  tablename,
  indexname,
  idx_scan as scans,
  idx_tup_read as tuples_read
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
  AND tablename IN ('events', 'tasks', 'contacts')
ORDER BY idx_scan DESC;
```

### Query Performance tracken

Im Supabase Dashboard:
1. Gehe zu **Database** → **Query Performance**
2. Überwache die 8 Dashboard RPC Functions
3. Achte auf Slow Queries (> 500ms)

---

## ✅ DEPLOYMENT CHECKLIST

### Database (Supabase)
- [ ] 8 RPC Functions erstellt und getestet
- [ ] Performance Indexes erstellt
- [ ] Test Queries erfolgreich ausgeführt
- [ ] Row Level Security (RLS) Policies geprüft

### Frontend
- [ ] Environment Variables gesetzt
- [ ] Supabase Client konfiguriert
- [ ] Types importiert
- [ ] Hooks implementiert
- [ ] Dashboard Component erstellt
- [ ] Error Handling implementiert
- [ ] Loading States implementiert

### Backend API (Optional)
- [ ] FastAPI Endpoints erstellt
- [ ] Auth Middleware konfiguriert
- [ ] API Router registriert
- [ ] API Tests geschrieben

### Testing
- [ ] Alle RPC Functions getestet
- [ ] Performance < 500ms
- [ ] Error Cases getestet
- [ ] Frontend Integration getestet

### Monitoring
- [ ] Query Performance Monitoring aktiv
- [ ] Index Usage überwacht
- [ ] Error Logging eingerichtet

---

## 🚨 Troubleshooting

### Problem: "Function does not exist"

**Lösung:**
```sql
-- Verifiziere dass Function existiert
SELECT routine_name 
FROM information_schema.routines 
WHERE routine_name = 'dashboard_today_overview';

-- Falls nicht, Migration erneut ausführen
```

---

### Problem: "Slow Query Performance"

**Lösung:**
```sql
-- Check ob Indexes verwendet werden
EXPLAIN ANALYZE
SELECT * FROM dashboard_today_overview('YOUR_WORKSPACE_ID');

-- Falls Sequential Scan: Index neu erstellen
```

---

### Problem: "No data returned"

**Lösung:**
```sql
-- Prüfe ob Daten in Tables existieren
SELECT count(*) FROM public.events WHERE workspace_id = 'YOUR_WORKSPACE_ID';
SELECT count(*) FROM public.tasks WHERE workspace_id = 'YOUR_WORKSPACE_ID';
```

---

## 📚 Nächste Schritte

1. **Caching implementieren** (Redis/Vercel Cache)
2. **Materialized Views erstellen** für historische Daten
3. **Real-time Updates** mit Supabase Realtime
4. **Export Funktionen** (PDF/Excel Reports)
5. **Advanced Analytics** (Cohort Analysis, Predictive Models)

---

## 🆘 Support

Bei Fragen oder Problemen:
- Supabase Docs: https://supabase.com/docs
- GitHub Issues: [Dein Repo]
- Team Chat: [Slack/Discord]

