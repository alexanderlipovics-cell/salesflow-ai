# 🗄️ Sales Flow AI - Supabase Database Migrations

## Übersicht

Dieses Verzeichnis enthält alle Supabase SQL Migrations für die Dashboard Analytics Engine.

## 📁 Dateien

### 001_dashboard_rpc_functions.sql
**8 RPC (Remote Procedure Call) Functions für Dashboard Analytics:**

1. `dashboard_today_overview` - Heute Overview (Tasks, Leads, Signups, Revenue)
2. `dashboard_today_tasks` - Liste heute fälliger Tasks
3. `dashboard_week_overview` - Woche Overview
4. `dashboard_week_timeseries` - Zeitreihe (7 Tage)
5. `dashboard_top_templates` - Top Templates nach Conversion
6. `dashboard_funnel_stats` - Funnel Statistiken (Ø Zeit bis Signup)
7. `dashboard_top_networkers` - Top Performer
8. `dashboard_needs_help` - Reps die Support brauchen

### 002_dashboard_indexes.sql
**Performance Indexes für optimale Query Performance:**

- Events Table: workspace + event_type + time
- Tasks Table: workspace + status + due_at
- Contacts Table: workspace + lead_score
- Templates Table: workspace + status
- Workspace Users: workspace + status

### 003_test_queries.sql
**Test & Verification Queries:**

- Funktions-Tests
- Performance Tests (EXPLAIN ANALYZE)
- Index Usage Verification
- Data Integrity Checks
- Benchmark Queries

## 🚀 Deployment

### Quick Start

1. **Supabase Dashboard öffnen**
   - Navigiere zu: https://supabase.com/dashboard
   - Wähle dein Projekt

2. **SQL Editor öffnen**
   - Linkes Menü → SQL Editor
   - New Query

3. **Migrations ausführen (in dieser Reihenfolge):**

```sql
-- 1. RPC Functions
-- Copy-Paste Inhalt von 001_dashboard_rpc_functions.sql
-- → RUN

-- 2. Indexes
-- Copy-Paste Inhalt von 002_dashboard_indexes.sql
-- → RUN

-- 3. Testen
-- Copy-Paste Inhalt von 003_test_queries.sql
-- Ersetze 'YOUR_WORKSPACE_ID' mit tatsächlicher UUID
-- → RUN
```

## 🧪 Testing

### Schnelltest nach Deployment

```sql
-- 1. Verifiziere Functions
SELECT routine_name 
FROM information_schema.routines 
WHERE routine_schema = 'public' 
  AND routine_name LIKE 'dashboard_%';

-- 2. Test Today Overview
SELECT * FROM dashboard_today_overview('YOUR_WORKSPACE_ID');

-- 3. Check Performance
EXPLAIN ANALYZE
SELECT * FROM dashboard_today_overview('YOUR_WORKSPACE_ID');
```

**Erwartete Execution Time: < 100ms**

## 📊 RPC Functions Details

### 1. dashboard_today_overview(workspace_id)
```sql
SELECT * FROM dashboard_today_overview('uuid-hier');
```

**Returns:**
- `tasks_due_today` (integer)
- `tasks_done_today` (integer)
- `leads_created_today` (integer)
- `first_messages_today` (integer)
- `signups_today` (integer)
- `revenue_today` (numeric)

---

### 2. dashboard_today_tasks(workspace_id, limit)
```sql
SELECT * FROM dashboard_today_tasks('uuid-hier', 100);
```

**Returns:** Liste von Tasks mit:
- `task_id`, `contact_id`, `contact_name`
- `task_type`, `task_due_at`, `priority`
- `contact_lead_score`

---

### 3. dashboard_week_overview(workspace_id)
```sql
SELECT * FROM dashboard_week_overview('uuid-hier');
```

**Returns:**
- `leads_this_week`
- `first_messages_this_week`
- `signups_this_week`
- `revenue_this_week`

---

### 4. dashboard_week_timeseries(workspace_id)
```sql
SELECT * FROM dashboard_week_timeseries('uuid-hier');
```

**Returns:** 7 Zeilen (eine pro Tag):
- `day` (date)
- `leads`, `signups`, `first_messages`

---

### 5. dashboard_top_templates(workspace_id, days_back, limit)
```sql
SELECT * FROM dashboard_top_templates('uuid-hier', 30, 10);
```

**Returns:** Top Templates sortiert nach Conversion Rate:
- `template_id`, `title`, `purpose`, `channel`
- `contacts_contacted`, `contacts_signed`
- `conversion_rate_percent`

---

### 6. dashboard_funnel_stats(workspace_id)
```sql
SELECT * FROM dashboard_funnel_stats('uuid-hier');
```

**Returns:**
- `avg_days_to_signup` (Durchschnitt)
- `median_days_to_signup` (Median)
- `min_days_to_signup`, `max_days_to_signup`
- `contacts_with_signup`

---

### 7. dashboard_top_networkers(workspace_id, days_back, limit)
```sql
SELECT * FROM dashboard_top_networkers('uuid-hier', 30, 5);
```

**Returns:** Top Performer:
- `user_id`, `email`, `name`
- `contacts_contacted`, `contacts_signed`
- `conversion_rate_percent`
- `active_days`, `current_streak`

---

### 8. dashboard_needs_help(workspace_id, days_back, min_contacts, limit)
```sql
SELECT * FROM dashboard_needs_help('uuid-hier', 30, 10, 5);
```

**Returns:** Reps mit niedriger Conversion aber hoher Aktivität:
- `user_id`, `email`, `name`
- `contacts_contacted`, `contacts_signed`
- `conversion_rate_percent`
- `active_days`

---

## 🔒 Security

Alle Functions sind mit `SECURITY DEFINER` deklariert:
- Functions laufen mit Creator Permissions
- Erfordert korrekte Row Level Security (RLS) Policies auf den Tabellen
- User kann nur Daten seines Workspace sehen

**Empfohlene RLS Policy:**
```sql
CREATE POLICY "Users can only see own workspace data"
ON public.events
FOR SELECT
USING (
  workspace_id IN (
    SELECT workspace_id 
    FROM workspace_users 
    WHERE user_id = auth.uid()
  )
);
```

## 📈 Performance Optimization

### Erwartete Query Times
- `dashboard_today_overview`: < 100ms
- `dashboard_today_tasks`: < 150ms
- `dashboard_week_timeseries`: < 200ms
- `dashboard_top_templates`: < 250ms
- Alle zusammen (Complete Dashboard): < 500ms

### Wenn Queries langsam sind:

1. **Index Usage prüfen:**
```sql
SELECT tablename, indexname, idx_scan
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
ORDER BY idx_scan DESC;
```

2. **Query Plan analysieren:**
```sql
EXPLAIN (ANALYZE, BUFFERS)
SELECT * FROM dashboard_today_overview('YOUR_WORKSPACE_ID');
```

3. **Vacuum & Analyze:**
```sql
VACUUM ANALYZE public.events;
VACUUM ANALYZE public.tasks;
```

## 🛠️ Troubleshooting

### Function existiert nicht
```sql
-- Lösung: Migration 001 erneut ausführen
\i 001_dashboard_rpc_functions.sql
```

### Keine Daten zurückgegeben
```sql
-- Prüfe ob Daten vorhanden sind
SELECT count(*) FROM events WHERE workspace_id = 'YOUR_ID';
SELECT count(*) FROM tasks WHERE workspace_id = 'YOUR_ID';
```

### Permission Denied
```sql
-- Prüfe RLS Policies
SELECT * FROM pg_policies WHERE tablename IN ('events', 'tasks');
```

## 📚 Weitere Docs

- [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md) - Vollständiger Deployment Guide
- [Supabase Docs](https://supabase.com/docs/guides/database/functions)
- [PostgreSQL Performance Tips](https://wiki.postgresql.org/wiki/Performance_Optimization)

