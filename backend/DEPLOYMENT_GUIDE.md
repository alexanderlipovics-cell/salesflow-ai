# 🚀 SALES FLOW AI - PRODUCTION DEPLOYMENT GUIDE

## 📋 Übersicht

Dieses Guide führt dich durch die komplette Deployment-Prozedur für:
1. **Sales Optimization Database Schema** (Interactions, Conversions, Stats)
2. **Sales Content Schema** (Waterfall Content System)
3. **EINWAND-KILLER Edge Function** (Objection Solver)
4. **React Components** (bereits implementiert)

---

## ✅ VORAUSSETZUNGEN

- ✅ Supabase Projekt erstellt
- ✅ Supabase CLI installiert (`npm install -g supabase`)
- ✅ OpenAI API Key vorhanden
- ✅ Backend läuft lokal

---

## 📦 SCHRITT 1: DATABASE SCHEMAS DEPLOYEN

### 1.1 Sales Optimization Schema

**Datei:** `backend/db/schema_sales_optimization.sql`

1. Öffne Supabase Dashboard → SQL Editor
2. Kopiere den **gesamten Inhalt** der Datei
3. Füge in SQL Editor ein
4. Klicke **"RUN"**
5. Warte auf ✅ Success

**Erwartete Tabellen:**
- `lead_interactions`
- `lead_stage_history`
- `conversion_events`
- `user_daily_stats`

**Erwartete Materialized Views:**
- `mv_user_response_stats`
- `mv_conversion_funnel`
- `mv_user_leaderboard_30d`

### 1.2 Sales Content Schema

**Datei:** `backend/db/schema_sales_content.sql`

1. Öffne Supabase Dashboard → SQL Editor
2. Kopiere den **gesamten Inhalt** der Datei
3. Füge in SQL Editor ein
4. Klicke **"RUN"**
5. Warte auf ✅ Success

**Erwartete Tabelle:**
- `sales_content`

**Erwartete Funktion:**
- `get_optimized_content(p_category, p_language, p_region)`

### 1.3 Verifikation

Führe diese Query aus, um zu prüfen ob alles erstellt wurde:

```sql
-- Check tables
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN (
  'lead_interactions',
  'lead_stage_history',
  'conversion_events',
  'user_daily_stats',
  'sales_content'
)
ORDER BY table_name;

-- Check functions
SELECT routine_name 
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name IN (
  'get_optimized_content',
  'get_user_stats',
  'get_conversion_rate',
  'refresh_analytics_views'
)
ORDER BY routine_name;
```

---

## 🔧 SCHRITT 2: EDGE FUNCTION DEPLOYEN

### 2.1 Supabase CLI Setup

```bash
# Login to Supabase
supabase login

# Link to your project
supabase link --project-ref YOUR_PROJECT_REF
```

### 2.2 Edge Function Deployen

```bash
# Navigate to functions directory
cd supabase/functions

# Deploy solve-objection function
supabase functions deploy solve-objection
```

### 2.3 Environment Variables Setzen

In Supabase Dashboard → Edge Functions → solve-objection → Settings:

```
OPENAI_API_KEY=sk-...
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

### 2.4 Test Edge Function

```bash
# Test locally
supabase functions serve solve-objection

# Test via curl
curl -X POST http://localhost:54321/functions/v1/solve-objection \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "objection_key": "pyramid_scheme",
    "lead_id": "lead-uuid",
    "user_id": "user-uuid"
  }'
```

---

## 📊 SCHRITT 3: SEED DATA (OPTIONAL)

### 3.1 Sales Content Seed

Füge Beispiel-Content in `sales_content` ein:

```sql
-- Global fallback content
INSERT INTO sales_content (company_id, language_code, category, key_identifier, payload)
VALUES (
  NULL,  -- Global
  'de',
  'objection',
  'pyramid_scheme',
  '{
    "title": "Pyramiden-System Einwand",
    "script": "Ich verstehe die Sorge. Pyramiden-Systeme sind illegal und haben kein echtes Produkt. Wir sind ein seriöses Unternehmen mit echten Produkten und einem nachhaltigen Geschäftsmodell.",
    "ai_hints": ["Legales Geschäftsmodell", "Echte Produkte", "Nachhaltigkeit"],
    "tone": "professional"
  }'::JSONB
);

-- Company-specific override (example)
INSERT INTO sales_content (company_id, language_code, category, key_identifier, payload)
VALUES (
  'your-company-uuid',
  'de',
  'objection',
  'pyramid_scheme',
  '{
    "title": "Pyramiden-System Einwand - [Company Name]",
    "script": "[Company-specific response with actual facts]",
    "ai_hints": ["Company-specific points"],
    "tone": "professional"
  }'::JSONB
);
```

---

## 🧪 SCHRITT 4: TESTING

### 4.1 Test Database Functions

```sql
-- Test get_optimized_content
SELECT * FROM get_optimized_content('objection', 'de', NULL);

-- Test get_user_stats
SELECT * FROM get_user_stats(
  'user-uuid',
  CURRENT_DATE - INTERVAL '30 days',
  CURRENT_DATE
);

-- Test conversion rate
SELECT get_conversion_rate(
  'company-uuid',
  'contacted',
  'customer'
);
```

### 4.2 Test Edge Function

1. Öffne Frontend
2. Navigiere zu Chat Interface
3. Klicke "Handle Objection" Button
4. Wähle eine Kategorie (z.B. "Pyramidenschema")
5. Prüfe ob 3 Antworten generiert werden

### 4.3 Test Auto-Aggregation

```sql
-- Insert test interaction
INSERT INTO lead_interactions (
  lead_id, user_id, company_id, channel, interaction_type, sent_at
) VALUES (
  'lead-uuid',
  'user-uuid',
  'company-uuid',
  'whatsapp',
  'outbound_message',
  NOW()
);

-- Check if daily stats updated
SELECT * FROM user_daily_stats 
WHERE user_id = 'user-uuid' 
AND date = CURRENT_DATE;
```

---

## ⚙️ SCHRITT 5: CRON JOBS (OPTIONAL)

Für automatische Refreshs und Cleanups:

```sql
-- Enable pg_cron extension (if available)
CREATE EXTENSION IF NOT EXISTS "pg_cron";

-- Schedule analytics refresh (hourly)
SELECT cron.schedule(
  'refresh-analytics',
  '0 * * * *',
  'SELECT refresh_analytics_views()'
);

-- Schedule archive (monthly, 1st of month)
SELECT cron.schedule(
  'archive-interactions',
  '0 0 1 * *',
  'SELECT archive_old_interactions()'
);

-- Schedule cleanup (monthly, 1st of month)
SELECT cron.schedule(
  'cleanup-soft-deleted',
  '0 0 1 * *',
  'SELECT cleanup_soft_deleted()'
);
```

---

## 🔍 SCHRITT 6: MONITORING

### 6.1 Check Table Sizes

```sql
SELECT 
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN (
  'lead_interactions',
  'lead_stage_history',
  'conversion_events',
  'user_daily_stats',
  'sales_content'
)
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

### 6.2 Check Index Usage

```sql
SELECT 
  schemaname,
  tablename,
  indexname,
  idx_scan as index_scans
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
ORDER BY idx_scan DESC;
```

### 6.3 Check Slow Queries

```sql
-- Enable pg_stat_statements (if available)
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements";

-- View slow queries
SELECT 
  query,
  calls,
  mean_exec_time,
  max_exec_time
FROM pg_stat_statements
ORDER BY mean_exec_time DESC
LIMIT 10;
```

---

## 🐛 TROUBLESHOOTING

### Problem: RLS blocking inserts

**Lösung:** Prüfe ob Service Key verwendet wird oder RLS Policies korrekt sind.

```sql
-- Check RLS status
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('lead_interactions', 'sales_content');

-- Temporarily disable RLS for testing (NOT for production!)
ALTER TABLE lead_interactions DISABLE ROW LEVEL SECURITY;
```

### Problem: Edge Function returns 401

**Lösung:** Prüfe Authorization Header und Service Role Key.

### Problem: Materialized Views not refreshing

**Lösung:** Manuell refresh:

```sql
SELECT refresh_analytics_views();
```

### Problem: Triggers not firing

**Lösung:** Prüfe ob Trigger existiert:

```sql
SELECT 
  trigger_name,
  event_manipulation,
  event_object_table
FROM information_schema.triggers
WHERE trigger_schema = 'public'
ORDER BY event_object_table;
```

---

## ✅ DEPLOYMENT CHECKLIST

- [ ] Sales Optimization Schema deployed
- [ ] Sales Content Schema deployed
- [ ] Edge Function deployed
- [ ] Environment Variables gesetzt
- [ ] Seed Data eingefügt (optional)
- [ ] RLS Policies getestet
- [ ] Triggers funktionieren
- [ ] Materialized Views refresh funktioniert
- [ ] Edge Function antwortet korrekt
- [ ] Frontend Component funktioniert
- [ ] Cron Jobs eingerichtet (optional)
- [ ] Monitoring aktiviert

---

## 📚 NÄCHSTE SCHRITTE

1. **Seed mehr Content:** Füge weitere Objection-Keys in `sales_content` ein
2. **Analytics Dashboard:** Nutze Materialized Views für Dashboards
3. **Performance Tuning:** Überwache Query-Performance und optimiere Indexes
4. **Partitioning:** Bei >10M Interactions, aktiviere Partitioning
5. **Backup Strategy:** Richte automatische Backups ein

---

## 🎉 FERTIG!

Dein Sales Flow AI System ist jetzt production-ready! 🚀

Bei Fragen oder Problemen, checke die Troubleshooting-Section oder die SQL-Kommentare in den Schema-Files.

