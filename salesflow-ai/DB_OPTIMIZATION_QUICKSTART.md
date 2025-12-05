# 🚀 SalesFlow AI – DB Optimization Quick Start

**Ziel**: 80-95% Latenz-Reduktion für Dashboards & Analytics  
**Dauer**: 3 Phasen über 2-3 Wochen  
**Status**: ✅ Ready to Deploy

---

## 📊 Was bringt es?

| Komponente | Vorher | Nachher | Gewinn |
|------------|--------|---------|--------|
| 📈 **Dashboard Analytics** | 2-5 Sekunden | 200-500ms | **85-90%** |
| 📧 **Message Events List** | 800ms-2s | 100-200ms | **85-90%** |
| 🎯 **P-Score Batch (100 Leads)** | 10-20s | 2-3s | **80-85%** |
| 🔥 **Hot Leads Query** | 1-2s | 200-300ms | **80-85%** |
| 📬 **Unified Inbox** | 500ms-1.5s | 150-250ms | **70-80%** |

---

## 🎯 Phase 1: Quick Wins (Woche 1) – **JETZT STARTEN**

### Schritt 1: Backup erstellen ⚠️

```bash
# Supabase Dashboard → Database → Backups → Create Backup
# ODER via CLI:
supabase db dump -f backup_$(date +%Y%m%d).sql
```

### Schritt 2: Baseline-Metriken erfassen

```sql
-- In Supabase SQL Editor ausführen:

-- 1. pg_stat_statements aktivieren
CREATE EXTENSION IF NOT EXISTS pg_stat_statements;

-- 2. Aktuelle langsamste Queries loggen
SELECT 
    LEFT(query, 100) AS query_preview,
    calls,
    ROUND(mean_exec_time::numeric, 2) AS avg_ms,
    ROUND(total_exec_time::numeric, 2) AS total_ms
FROM pg_stat_statements
WHERE query NOT LIKE '%pg_stat_statements%'
ORDER BY mean_exec_time DESC
LIMIT 20;

-- 3. Tabellen-Größen prüfen
SELECT 
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size,
    pg_total_relation_size(schemaname||'.'||tablename) AS size_bytes
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY size_bytes DESC;
```

### Schritt 3: Indizes deployen 🚀

```bash
# Option A: Supabase Dashboard
# 1. Öffne SQL Editor
# 2. Kopiere Inhalt von: supabase/migrations/20251206_performance_optimization_phase1_indexes.sql
# 3. Execute

# Option B: Supabase CLI
supabase db push
```

**⏱️ Dauer**: 5-20 Minuten (je nach Tabellen-Größe)  
**✅ Kein Downtime**: `CREATE INDEX CONCURRENTLY` erlaubt parallele Queries

### Schritt 4: Indizes validieren

```sql
-- Prüfe ob alle Indizes erstellt wurden
SELECT 
    schemaname,
    tablename,
    indexname,
    pg_size_pretty(pg_relation_size(indexrelid)) AS index_size
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
  AND indexname LIKE 'idx_message_events%'
   OR indexname LIKE 'idx_leads%'
   OR indexname LIKE 'idx_crm_notes%'
ORDER BY pg_relation_size(indexrelid) DESC;

-- Erwartete Indizes: 12 neue Indizes
-- Größe: 10-500 MB je nach Daten
```

### Schritt 5: Redis installieren (für Caching)

```bash
# Docker (Empfohlen)
docker run -d --name redis -p 6379:6379 redis:7-alpine

# ODER via Docker Compose (backend/docker-compose.yml):
# services:
#   redis:
#     image: redis:7-alpine
#     ports:
#       - "6379:6379"
#     volumes:
#       - redis_data:/data

# Test Redis
redis-cli ping
# Erwartet: PONG
```

### Schritt 6: Backend-Caching implementieren

```bash
# 1. Redis-Dependency installieren
cd backend
pip install redis[asyncio]

# 2. .env erweitern
echo "REDIS_URL=redis://localhost:6379" >> .env

# 3. Caching-Code deployen
# Kopiere: backend/app/core/cache.py (aus DB_OPTIMIZATION_STRATEGY.md)
# Update: backend/app/routers/collective_intelligence.py (siehe Strategie-Doc)
```

**Erwarteter Gewinn nach Phase 1**: **60-70% Latenz-Reduktion** 🎉

---

## 🔥 Phase 2: Materialized Views (Woche 2)

### Schritt 1: MV-Migration deployen

```bash
# Supabase Dashboard → SQL Editor:
# Datei: supabase/migrations/20251206_performance_optimization_phase2_materialized_views.sql
```

### Schritt 2: pg_cron aktivieren (für Auto-Refresh)

```sql
-- Supabase Dashboard → Database → Extensions
-- Suche: "pg_cron" → Enable

-- Cron-Jobs anlegen:
SELECT cron.schedule(
    'refresh-rlhf-dashboard',
    '*/10 * * * *',  -- Alle 10 Minuten
    'SELECT refresh_rlhf_daily_mv();'
);

SELECT cron.schedule(
    'refresh-hot-leads',
    '*/15 * * * *',  -- Alle 15 Minuten
    'SELECT refresh_hot_leads_mv();'
);

SELECT cron.schedule(
    'refresh-template-performance',
    '0 1 * * *',  -- Täglich um 01:00 Uhr
    'SELECT refresh_template_performance_mv();'
);
```

### Schritt 3: Backend auf MVs umstellen

```python
# backend/app/routers/collective_intelligence.py

# ALT:
result = db.table("rlhf_feedback_sessions").select(...).execute()

# NEU:
result = db.table("mv_rlhf_sessions_daily").select(...).execute()
```

**Erwarteter Gewinn nach Phase 2**: **+10-15%** (Gesamt: 75-85%) 📈

---

## ⚡ Phase 3: SQL Functions & Fine-Tuning (Woche 3)

### Schritt 1: SQL-Funktionen deployen

```bash
# Datei: supabase/migrations/20251206_performance_optimization_phase3_functions.sql
```

### Schritt 2: P-Score auf SQL-Funktion umstellen

```python
# backend/app/services/predictive_scoring.py

# ALT (Python-Loop):
events_result = events_query.execute()
for event in events_result.data:
    if event["direction"] == "inbound": ...

# NEU (SQL-Aggregation):
result = db.rpc('calculate_lead_event_stats', {
    'p_user_id': user_id,
    'p_cutoff_14d': cutoff_14d,
    'p_cutoff_7d': cutoff_7d
}).execute()
stats = result.data[0]
```

**Erwarteter Gewinn nach Phase 3**: **Gesamt 80-95%** 🚀

---

## 📊 Monitoring

### Performance-Check (täglich)

```sql
-- Slow Queries (> 1s)
SELECT 
    LEFT(query, 100) AS query,
    calls,
    ROUND(mean_exec_time::numeric, 2) AS avg_ms
FROM pg_stat_statements
WHERE mean_exec_time > 1000  -- > 1 Sekunde
  AND query NOT LIKE '%pg_%'
ORDER BY mean_exec_time DESC
LIMIT 10;

-- Index-Usage (Seq Scans = Schlecht)
SELECT 
    schemaname,
    tablename,
    seq_scan AS sequential_scans,
    idx_scan AS index_scans,
    ROUND(100.0 * idx_scan / NULLIF(seq_scan + idx_scan, 0), 2) AS index_usage_percent
FROM pg_stat_user_tables
WHERE schemaname = 'public'
ORDER BY seq_scan DESC
LIMIT 10;

-- Cache-Hit-Rate (Target: > 99%)
SELECT 
    ROUND(100.0 * sum(idx_blks_hit) / NULLIF(sum(idx_blks_hit + idx_blks_read), 0), 2) AS cache_hit_rate
FROM pg_statio_user_indexes;
```

### Redis-Monitoring

```bash
# Cache-Hit-Rate
redis-cli INFO stats | grep keyspace

# Memory-Usage
redis-cli INFO memory | grep used_memory_human

# Slow Keys
redis-cli --latency
```

---

## 🔧 Troubleshooting

### Problem: Index-Erstellung dauert > 30 Minuten

**Ursache**: Tabelle zu groß (> 10M Rows) oder hohe Schreib-Last  
**Lösung**: Index außerhalb Peak-Hours erstellen (nachts)

```sql
-- Progress checken:
SELECT 
    pid,
    now() - pg_stat_activity.query_start AS duration,
    query
FROM pg_stat_activity
WHERE query LIKE '%CREATE INDEX%';
```

### Problem: Redis-Connection-Errors

```python
# backend/app/core/cache.py
# Fehler-Handling ist bereits eingebaut:
try:
    await self.redis.get(key)
except Exception as e:
    logger.warning(f"Cache error: {e}")
    return None  # Fallback zu DB-Query
```

### Problem: Materialized View ist veraltet

```sql
-- Manueller Refresh:
REFRESH MATERIALIZED VIEW CONCURRENTLY public.mv_rlhf_sessions_daily;

-- Check Last-Refresh-Time:
SELECT 
    schemaname,
    matviewname,
    pg_stat_file('base/'||oid::text) AS last_refreshed
FROM pg_matviews;
```

### Problem: P-Score-Berechnung immer noch langsam

```sql
-- Prüfe Index-Usage:
EXPLAIN ANALYZE 
SELECT * FROM calculate_lead_event_stats(
    '<user-uuid>'::UUID,
    NOW() - INTERVAL '14 days',
    NOW() - INTERVAL '7 days'
);

-- Erwartete Execution Time: < 50ms
-- Falls > 200ms: Index fehlt oder DB unter Last
```

---

## 🎯 Target KPIs (Post-Optimization)

| Metric | Vorher | **ZIEL** | Messung |
|--------|--------|----------|---------|
| Dashboard Load | 2-5s | **< 500ms** | p95 Latenz |
| Message Events List | 800ms-2s | **< 200ms** | p95 Latenz |
| P-Score Batch (100) | 10-20s | **< 3s** | Absolute Zeit |
| Cache Hit Rate | 0% | **> 70%** | Redis Stats |
| Slow Queries (> 1s) | 20-30% | **< 5%** | pg_stat_statements |

---

## 🚨 Rollback-Plan

**Falls Performance schlechter wird**:

```sql
-- PHASE 1 ROLLBACK (Indizes)
DROP INDEX CONCURRENTLY IF EXISTS idx_message_events_user_status_created;
DROP INDEX CONCURRENTLY IF EXISTS idx_message_events_user_channel_status;
-- ... (siehe Migration-Datei für vollständige Liste)

-- PHASE 2 ROLLBACK (MVs)
DROP MATERIALIZED VIEW IF EXISTS mv_rlhf_sessions_daily CASCADE;
DROP MATERIALIZED VIEW IF EXISTS mv_template_performance CASCADE;
DROP MATERIALIZED VIEW IF EXISTS mv_hot_leads CASCADE;

-- PHASE 3 ROLLBACK (Funktionen)
DROP FUNCTION IF EXISTS calculate_lead_event_stats CASCADE;

-- Cron-Jobs entfernen
SELECT cron.unschedule('refresh-rlhf-dashboard');
SELECT cron.unschedule('refresh-hot-leads');
```

**Backend-Code-Rollback**:

```bash
# Git Revert
git log --oneline  # Finde Commit-Hash
git revert <commit-hash>

# Redis deaktivieren (temporär)
# In .env:
ENABLE_CACHE=false
```

---

## 📚 Weitere Ressourcen

- **Vollständige Strategie**: `DB_OPTIMIZATION_STRATEGY.md` (70+ Seiten)
- **SQL-Migrationen**: `supabase/migrations/20251206_performance_optimization_phase*.sql`
- **Caching-Code**: Siehe Strategie-Doc Kapitel 5.2
- **PostgreSQL Performance**: https://wiki.postgresql.org/wiki/Performance_Optimization
- **Supabase Docs**: https://supabase.com/docs/guides/database/postgres

---

## ✅ Checkliste

### Phase 1 (Woche 1)
- [ ] Backup erstellt
- [ ] Baseline-Metriken erfasst
- [ ] pg_stat_statements aktiviert
- [ ] Phase-1-Migration deployed (Indizes)
- [ ] Alle 12 Indizes validiert
- [ ] Redis installiert & getestet
- [ ] Backend-Caching implementiert (3 Endpoints)
- [ ] Performance-Verbesserung gemessen

### Phase 2 (Woche 2)
- [ ] pg_cron Extension aktiviert
- [ ] Phase-2-Migration deployed (MVs)
- [ ] Cron-Jobs konfiguriert
- [ ] Backend auf MVs umgestellt
- [ ] MV-Refresh-Zeiten überwacht

### Phase 3 (Woche 3)
- [ ] Phase-3-Migration deployed (Funktionen)
- [ ] P-Score auf SQL-Funktion umgestellt
- [ ] Cache-Invalidation perfektioniert
- [ ] Load-Testing durchgeführt
- [ ] Finale Metriken dokumentiert

---

**Viel Erfolg! Bei Fragen siehe Hauptstrategie-Dokument.** 🚀

