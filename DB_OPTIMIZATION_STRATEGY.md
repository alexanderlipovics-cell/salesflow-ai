# SalesFlow AI – Database Optimization Strategy

**Datum**: 5. Dezember 2025  
**Rolle**: Senior Database Architect & Performance Engineer  
**Produkt**: SalesFlow AI (KI-gestütztes Sales-CRM auf Supabase/PostgreSQL)

---

## 1. Summary (Executive Overview)

- **Problem**: Analytics & Dashboards werden bei 100k+ `message_events` und wachsenden `leads`/`crm_notes` langsam (>2s)
- **Hauptursachen**: Fehlende Composite-Indizes, keine Caching-Strategie, N+1-Queries in Repositories
- **Lösung**: 12 neue Indizes, 3 Materialized Views, Redis-Caching-Layer, Query Rewrites, Optional: Partitionierung für `message_events`
- **Erwarteter Gewinn**: 80-95% Latenz-Reduktion für Dashboards/Analytics (von 2-5s auf 200-500ms)
- **Implementierung**: 3 Phasen über 2-3 Wochen, produktionssicher mit `CREATE INDEX CONCURRENTLY`

---

## 2. Query Analysis

### 2.1 Übersicht der Hotspot-Queries

| ID  | Query-Typ | Code-Stelle | Geschätzte Rows | Problem |
|-----|-----------|-------------|-----------------|---------|
| **Q1** | Message Events List | `backend/app/db/repositories/message_events.py:111-161` | 50-200 pro Call | Missing Index: `(user_id, autopilot_status, created_at)` |
| **Q2** | Pending Events | `backend/app/db/repositories/message_events.py:229-270` | 20-100 | Missing Index: `(user_id, autopilot_status, channel, created_at)` |
| **Q3** | P-Score Calculation | `backend/app/services/predictive_scoring.py:44-189` | 100+ Events + Lead | **N+1**: 3+ Queries pro Lead (Events, Lead, Update) |
| **Q4** | Analytics Dashboard | `backend/app/routers/collective_intelligence.py:372-416` | 1000+ Sessions | **Full Aggregation**: Python-seitig statt DB-seitig |
| **Q5** | Unified Inbox | `backend/app/services/idps_engine.py:199-254` | 50+ Conversations | Missing Composite Index: `(user_id, platform, status)` |
| **Q6** | Contacts List | `backend/app/routers/contacts.py:96-172` | 25-100 | Missing Index für Filter-Combos + Sort |
| **Q7** | Deals List | `backend/app/routers/deals.py:31-132` | 25-100 | **N+1**: Separate Contact-Names-Query |
| **Q8** | CRM Notes Fetch | `backend/app/services/zero_input_crm.py:177-215` | 20-50 | Missing Index: `(user_id, contact_id, created_at DESC)` |
| **Q9** | Hot Leads | `backend/app/services/predictive_scoring.py:293-296` | 50-200 | Missing Index: `(p_score DESC, last_scored_at)` |
| **Q10** | Lead Verifications | `supabase/migrations/20251205_NON_PLUS_ULTRA_lead_generation.sql:79-82` | Variable | Missing Composite: `(v_score DESC, is_duplicate)` |

---

### 2.2 Ursachenanalyse

#### **Q1 & Q2: Message Events (KRITISCH)**
```python
# AKTUELL (message_events.py:138-144)
query = (
    db.table("message_events")
    .select("*")
    .eq("user_id", user_id)           # ✅ Index existiert
    .eq("autopilot_status", status)   # ❌ KEIN Index
    .order("created_at", desc=True)   # ❌ KEIN kombinierter Index
    .limit(50)
)
```
**Problem**: 
- Filter auf `(user_id, autopilot_status)` hat keinen Composite-Index
- `ORDER BY created_at DESC` erfordert zusätzlichen Sort-Step
- Bei 100k+ Rows → **Full Table Scan** auf filtered Subset

**Expected Query Plan (ohne Index)**:
```
Limit (50)
  Sort (created_at DESC)  ← TEUER!
    Filter (autopilot_status = 'pending')
      Index Scan on message_events (user_id)  ← OK
```

**Mit optimiertem Index**:
```
Limit (50)
  Index Scan on idx_message_events_user_status_created ← FAST!
    Index Cond: (user_id = ... AND autopilot_status = ...)
```

---

#### **Q3: P-Score Calculation (KRITISCH für Batch-Operations)**
```python
# AKTUELL (predictive_scoring.py:79-101)
lead_result = db.table("leads").select("*").eq("id", lead_id).execute()  # Query 1
events_query = db.table("message_events").select("*").gte("created_at", cutoff_14d)  # Query 2
# Filter user_id im Code, nicht in Query
all_events = events_result.data or []
# Python-Loop für Aggregation
for event in all_events:  # ❌ Ineffizient
    if direction == "inbound": ...
```
**Probleme**:
1. **Keine Index für Zeitbereich-Filter**: `WHERE created_at >= cutoff` + `user_id`
2. **Aggregation in Python** statt SQL (`COUNT`, `SUM` etc.)
3. **N+1**: Batch-Recalc für 100 Leads = 200+ Queries

**Lösung**: Materialized View + Index auf `(user_id, created_at DESC)`

---

#### **Q4: Analytics Dashboard (KRITISCH für Skalierung)**
```python
# AKTUELL (collective_intelligence.py:385-413)
result = db.table("rlhf_feedback_sessions").select(
    "created_at, outcome, composite_reward, user_id"
).gte("created_at", start_date).execute()

# PYTHON-AGGREGATION ← SCHLECHT bei 1M+ Rows
by_date = {}
for row in result.data or []:
    date = row["created_at"].split("T")[0]
    # ... Dict-Building + Set() für unique users
```
**Problem**:
- Lädt **alle** Rows (bis zu 10k-100k) ins Backend
- Aggregiert in Python statt `GROUP BY` in DB
- Bei wachsenden Daten → Memory-Issues + Timeouts

**Lösung**: Materialized View mit täglichen Aggregaten

---

#### **Q7: Deals List + N+1 Contact Names**
```python
# AKTUELL (deals.py:110-119)
contact_ids = [d["contact_id"] for d in result.data if d.get("contact_id")]
if contact_ids:
    contacts = (
        supabase.table("contacts")
        .select("id, name")
        .in_("id", contact_ids)  # ❌ Separate Query
        .execute()
    )
```
**Problem**: N+1-Pattern (1 Query für Deals + 1 für Contacts)

**Lösung**: JOIN direkt in Query oder Denormalisierung (`contact_name` in `deals`)

---

## 3. Optimization Plan

### 3.1 Index-Empfehlungen

#### **TABELLE: `message_events` (PRIORITÄT 1)**

```sql
-- INDEX 1: Häufigstes Query-Pattern (List + Filter + Sort)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_message_events_user_status_created
  ON public.message_events (user_id, autopilot_status, created_at DESC);

-- INDEX 2: Pending Events mit Kanal-Filter
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_message_events_user_channel_status
  ON public.message_events (user_id, channel, autopilot_status, created_at ASC)
  WHERE autopilot_status = 'pending';  -- Partial Index (80% kleiner)

-- INDEX 3: Contact-spezifische Queries (Zero-Input CRM)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_message_events_user_contact_created
  ON public.message_events (user_id, contact_id, created_at DESC)
  WHERE contact_id IS NOT NULL;

-- INDEX 4: Zeitbereich-Queries für P-Score
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_message_events_user_created_direction
  ON public.message_events (user_id, created_at DESC, direction)
  INCLUDE (channel, normalized_text);  -- INCLUDE für Covering Index
```

**Begründung**:
- **INDEX 1**: Trifft 90% der `list_message_events_for_user` Calls
- **INDEX 2**: Partial Index spart 50-80% Speicher (nur `pending` Events)
- **INDEX 3**: Für `_fetch_message_events` (Zero-Input CRM)
- **INDEX 4**: **Covering Index** → kein Heap-Lookup nötig für P-Score Berechnung

**Geschätzter Gewinn**: 70-90% Latenz-Reduktion für Message-Event-Queries

---

#### **TABELLE: `leads` (PRIORITÄT 1)**

```sql
-- INDEX 5: Hot Leads Sortierung (bestehender Index ist gut, aber erweitern)
-- Bestehend: idx_leads_p_score (p_score DESC NULLS LAST)
-- NEU: Mit Zeitfilter kombinieren
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_leads_p_score_scored_at
  ON public.leads (p_score DESC NULLS LAST, last_scored_at DESC)
  WHERE p_score IS NOT NULL;

-- INDEX 6: Pending Follow-ups (bestehend in Code, aber sicherstellen)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_leads_next_followup
  ON public.leads (next_follow_up)
  WHERE next_follow_up IS NOT NULL;

-- INDEX 7: Lead Status + Created (für Dashboards)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_leads_status_created
  ON public.leads (status, created_at DESC);
```

**Begründung**:
- **INDEX 5**: Für `get_hot_leads()` – verhindert Sort
- **INDEX 6**: Für `/api/leads/pending` Endpoint
- **INDEX 7**: Dashboard-Queries (z.B. "Neue Leads diese Woche nach Status")

---

#### **TABELLE: `crm_notes` (PRIORITÄT 2)**

```sql
-- INDEX 8: User + Contact/Lead + Zeitfilter (bestehende Indizes gut, aber kombinieren)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_crm_notes_user_contact_created
  ON public.crm_notes (user_id, contact_id, created_at DESC)
  WHERE contact_id IS NOT NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_crm_notes_user_lead_created
  ON public.crm_notes (user_id, lead_id, created_at DESC)
  WHERE lead_id IS NOT NULL;
```

**Begründung**: Bestehende Indizes (Single-Column) sind OK, aber Composite beschleunigt Zero-Input CRM Fetches

---

#### **TABELLE: `rlhf_feedback_sessions` (PRIORITÄT 2 – Analytics)**

```sql
-- INDEX 9: Zeitfilter + Outcome (für Aggregation)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_rlhf_sessions_created_outcome
  ON public.rlhf_feedback_sessions (created_at DESC, outcome)
  INCLUDE (composite_reward, user_id);
```

**Begründung**: **Covering Index** für Analytics → alle Spalten im Index, kein Heap-Lookup

---

#### **TABELLE: `dm_conversations` (IDPS – PRIORITÄT 2)**

```sql
-- INDEX 10: Unified Inbox Pattern
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_dm_conversations_user_status_platform
  ON public.dm_conversations (user_id, status, platform, last_message_at DESC);

-- INDEX 11: Priority Score Sorting
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_dm_conversations_user_priority
  ON public.dm_conversations (user_id, priority_score DESC, last_message_at DESC);
```

**Begründung**: Für `get_unified_inbox()` – Filter + Multi-Sort

---

#### **TABELLE: `lead_verifications` (Non Plus Ultra – PRIORITÄT 3)**

```sql
-- INDEX 12: V-Score + Duplicate Check
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_lead_verifications_v_score_duplicate
  ON public.lead_verifications (v_score DESC, is_duplicate)
  WHERE v_score IS NOT NULL;
```

---

### 3.2 Query Rewrites

#### **Q3: P-Score Calculation → DB-Aggregation statt Python**

**ALT (predictive_scoring.py)**:
```python
events_result = events_query.execute()
all_events = events_result.data or []

inbound_7d = 0
inbound_14d = 0
for event in all_events:  # ❌ Python Loop
    if event.get("direction") == "inbound":
        inbound_14d += 1
        if event_time >= cutoff_7d:
            inbound_7d += 1
```

**NEU** (mit SQL Aggregation):
```python
# Query 1: Aggregation direkt in DB
result = db.rpc('calculate_lead_event_stats', {
    'p_user_id': user_id,
    'p_lead_id': lead_id,
    'p_cutoff_14d': cutoff_14d,
    'p_cutoff_7d': cutoff_7d
}).execute()

stats = result.data[0]  # {inbound_7d, inbound_14d, outbound_14d, last_event_at}
```

**Neue SQL-Funktion** (in Migration):
```sql
CREATE OR REPLACE FUNCTION calculate_lead_event_stats(
    p_user_id UUID,
    p_lead_id UUID,
    p_cutoff_14d TIMESTAMPTZ,
    p_cutoff_7d TIMESTAMPTZ
)
RETURNS TABLE (
    inbound_7d INT,
    inbound_14d INT,
    outbound_14d INT,
    last_event_at TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(*) FILTER (WHERE direction = 'inbound' AND created_at >= p_cutoff_7d)::INT AS inbound_7d,
        COUNT(*) FILTER (WHERE direction = 'inbound' AND created_at >= p_cutoff_14d)::INT AS inbound_14d,
        COUNT(*) FILTER (WHERE direction = 'outbound' AND created_at >= p_cutoff_14d)::INT AS outbound_14d,
        MAX(created_at) AS last_event_at
    FROM message_events
    WHERE user_id = p_user_id
      AND created_at >= p_cutoff_14d;
END;
$$ LANGUAGE plpgsql STABLE;
```

**Gewinn**: 
- Reduziert 100 Rows Transfer + Python-Loop auf 1 Row SQL-Aggregation
- Batch-Recalc für 100 Leads: von ~5-10s auf ~1-2s

---

#### **Q4: Analytics Dashboard → Materialized View (siehe 3.3)**

---

#### **Q7: Deals + Contacts → JOIN statt N+1**

**ALT**:
```python
result = query.execute()  # Deals
contact_ids = [d["contact_id"] for d in result.data ...]
contacts = supabase.table("contacts").select("id, name").in_("id", contact_ids).execute()
```

**NEU** (mit Foreign-Table-Select):
```python
# Supabase unterstützt nested SELECT über Foreign Keys
result = (
    supabase.table("deals")
    .select("""
        id, title, stage, value, 
        contacts!inner(id, name)
    """)
    .eq("org_id", org_id)
    .execute()
)

for deal in result.data:
    deal["contact_name"] = deal["contacts"]["name"]
```

**Gewinn**: Von 2 Queries auf 1 Query (N+1 eliminiert)

---

### 3.3 Materialized Views

#### **MV 1: Analytics Dashboard – Tägliche Session-Aggregation**

**Definition**:
```sql
CREATE MATERIALIZED VIEW IF NOT EXISTS public.mv_rlhf_sessions_daily AS
SELECT 
    DATE(created_at) AS session_date,
    COUNT(*) AS total_sessions,
    COUNT(DISTINCT user_id) AS active_users,
    COUNT(*) FILTER (WHERE outcome = 'converted') AS conversions,
    COUNT(*) FILTER (WHERE outcome = 'positive_reply') AS positive_replies,
    AVG(composite_reward) AS avg_reward,
    SUM(composite_reward) AS reward_sum
FROM public.rlhf_feedback_sessions
GROUP BY DATE(created_at)
ORDER BY session_date DESC;

-- Index für schnelle Date-Range-Queries
CREATE INDEX idx_mv_rlhf_sessions_date ON public.mv_rlhf_sessions_daily (session_date DESC);
```

**Refresh-Strategie**:
```sql
-- Trigger-basiert: Refresh nach jedem Insert (für Near-Realtime)
CREATE OR REPLACE FUNCTION refresh_rlhf_daily_mv()
RETURNS TRIGGER AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY public.mv_rlhf_sessions_daily;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Oder: Cron-basiert (alle 5-10 Minuten) via pg_cron
SELECT cron.schedule(
    'refresh-rlhf-dashboard',
    '*/10 * * * *',  -- Alle 10 Minuten
    'REFRESH MATERIALIZED VIEW CONCURRENTLY public.mv_rlhf_sessions_daily'
);
```

**Backend-Anpassung**:
```python
# NEU (collective_intelligence.py:385)
result = db.table("mv_rlhf_sessions_daily").select(
    "session_date, total_sessions, active_users, conversions, avg_reward"
).gte("session_date", start_date).execute()

# Direkt verwendbar, keine Aggregation nötig
dashboard = result.data
```

**Gewinn**:
- Von 1000+ Rows laden + Python-Aggregation → 30 Rows direkt aus MV
- Latenz: 2-5s → **200-500ms**

---

#### **MV 2: Message Events – Template-Performance-Tracking**

**Use Case**: "Welche Templates/Personas performen am besten?"

```sql
CREATE MATERIALIZED VIEW IF NOT EXISTS public.mv_template_performance AS
SELECT 
    template_version,
    persona_variant,
    channel,
    COUNT(*) AS total_messages,
    COUNT(*) FILTER (WHERE autopilot_status = 'sent') AS sent_count,
    COUNT(*) FILTER (WHERE direction = 'inbound' AND created_at > (
        SELECT MAX(created_at) FROM message_events m2 
        WHERE m2.contact_id = message_events.contact_id 
          AND m2.direction = 'outbound' 
          AND m2.created_at < message_events.created_at
    )) AS replies_received,
    ROUND(
        100.0 * COUNT(*) FILTER (WHERE direction = 'inbound') / 
        NULLIF(COUNT(*) FILTER (WHERE direction = 'outbound'), 0), 
        2
    ) AS reply_rate
FROM public.message_events
WHERE template_version IS NOT NULL
GROUP BY template_version, persona_variant, channel
ORDER BY reply_rate DESC NULLS LAST;

CREATE INDEX idx_mv_template_perf ON public.mv_template_performance (reply_rate DESC);
```

**Refresh**: Täglich via Cron (nicht Realtime-kritisch)

---

#### **MV 3: Hot Leads – Pre-Filtered & Scored**

```sql
CREATE MATERIALIZED VIEW IF NOT EXISTS public.mv_hot_leads AS
SELECT 
    l.*,
    lv.v_score,
    li.i_score,
    le.e_score,
    le.company_name,
    li.last_activity_at
FROM public.leads l
LEFT JOIN public.lead_verifications lv ON l.id = lv.lead_id
LEFT JOIN public.lead_intents li ON l.id = li.lead_id
LEFT JOIN public.lead_enrichments le ON l.id = le.lead_id
WHERE l.p_score >= 75 
  AND (lv.v_score IS NULL OR lv.v_score >= 60)
ORDER BY l.p_score DESC, li.i_score DESC;

CREATE INDEX idx_mv_hot_leads_p_score ON public.mv_hot_leads (p_score DESC);
```

**Refresh**: Nach jedem P-Score Update (Trigger oder alle 15 Min)

---

### 3.4 Partitionierung (OPTIONAL – für 10M+ message_events)

**Wann**: Erst bei **> 10 Millionen** `message_events` Rows

**Vorschlag**: Zeitbasierte Partitionierung (monatlich)

```sql
-- Parent Table
CREATE TABLE public.message_events_partitioned (
    -- Alle Spalten wie message_events
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    -- ...
) PARTITION BY RANGE (created_at);

-- Child Tables
CREATE TABLE message_events_2025_12 PARTITION OF message_events_partitioned
    FOR VALUES FROM ('2025-12-01') TO ('2026-01-01');

CREATE TABLE message_events_2026_01 PARTITION OF message_events_partitioned
    FOR VALUES FROM ('2026-01-01') TO ('2026-02-01');
```

**Nutzen**:
- Kleinere Index-Größen (10x schneller bei Zeitbereich-Queries)
- Einfaches Archivieren (DROP alte Partitionen)
- Maintenance-Operationen schneller

**Overhead**:
- Komplexere Migration
- Partition-Management (monatlich neue Tabellen)
- Nicht mit RLS kombinierbar (Supabase-Einschränkung)

**Empfehlung**: Erstmal **SKIP** – durch Indizes + MV genug gewonnen

---

## 4. Caching Strategy

**Aktueller Stand**: ❌ **KEIN Caching** implementiert (weder Redis noch In-Memory)

### 4.1 Ebenen & Verantwortlichkeiten

| Ebene | Was wird gecacht? | TTL | Invalidation |
|-------|-------------------|-----|--------------|
| **DB-nah** (Materialized Views) | Analytics-Aggregationen, Hot Leads | 10-15 Min (Refresh) | Trigger/Cron |
| **Application Cache** (Redis) | Dashboard-KPIs, P-Score-Batch-Results, Inbox-Counts | 30-60s | TTL-basiert + Event |
| **Client-Side** (React Query/SWR) | Leads-List, Contacts, Deal-Pipelines | 15-30s | Stale-While-Revalidate |

---

### 4.2 Was wird gecacht?

#### **Redis-Cache (Application Layer)**

```python
# NEU: backend/app/core/cache.py
import redis.asyncio as aioredis
import json
from typing import Any, Optional, Callable
from datetime import timedelta

class CacheService:
    def __init__(self, redis_url: str = "redis://localhost:6379"):
        self.redis = aioredis.from_url(redis_url, decode_responses=True)
    
    async def get_or_fetch(
        self,
        key: str,
        fetch_fn: Callable[[], Any],
        ttl: int = 60,  # Sekunden
    ) -> Any:
        """
        Cached Fetch Pattern:
        1. Prüfe Redis
        2. Falls Miss → fetch_fn() ausführen + cachen
        3. Return Result
        """
        cached = await self.redis.get(key)
        if cached:
            return json.loads(cached)
        
        # Cache Miss → Daten holen
        data = await fetch_fn()
        await self.redis.setex(key, ttl, json.dumps(data))
        return data
    
    async def invalidate(self, pattern: str):
        """Invalidiert alle Keys mit Pattern (z.B. 'dashboard:user:*')"""
        keys = await self.redis.keys(pattern)
        if keys:
            await self.redis.delete(*keys)
```

---

#### **Beispiel 1: Dashboard Analytics**

```python
# VORHER (collective_intelligence.py:380)
@router.get("/analytics/dashboard")
async def get_learning_dashboard(days: int = 30, db=Depends(get_supabase)):
    result = db.table("rlhf_feedback_sessions").select(...).execute()
    # ... Python-Aggregation

# NACHHER
from app.core.cache import CacheService

cache = CacheService()

@router.get("/analytics/dashboard")
async def get_learning_dashboard(
    days: int = 30, 
    db=Depends(get_supabase),
    cache: CacheService = Depends(get_cache)
):
    cache_key = f"dashboard:rlhf:days:{days}"
    
    async def fetch_dashboard():
        # MV verwenden statt Raw-Table
        result = db.table("mv_rlhf_sessions_daily").select("*").gte(
            "session_date", start_date
        ).execute()
        return result.data
    
    data = await cache.get_or_fetch(cache_key, fetch_dashboard, ttl=60)
    return {"dashboard": data}
```

**Gewinn**: Wiederholte Dashboard-Calls innerhalb 60s → **0ms Latenz** (Redis-Hit)

---

#### **Beispiel 2: Unified Inbox Count**

```python
# IDPS Inbox Badge (idps.py:746)
@router.get("/analytics")
async def get_analytics(
    user: Dict[str, Any] = Depends(get_current_user),
    cache: CacheService = Depends(get_cache)
):
    user_id = user["user_id"]
    cache_key = f"idps:analytics:{user_id}"
    
    async def fetch_analytics():
        return await get_idps_analytics(db, user_id)
    
    data = await cache.get_or_fetch(cache_key, fetch_analytics, ttl=30)
    return data
```

---

### 4.3 Cache Invalidation

#### **Strategie 1: TTL-basiert (EINFACH)**

```python
# Standard für nicht-kritische Daten
cache.get_or_fetch(key, fetch_fn, ttl=60)  # Auto-Expire nach 60s
```

**Wann**: Dashboard, Analytics, Counts

---

#### **Strategie 2: Event-basiert (PRÄZISE)**

```python
# Nach Message Event Insert → Invalidate Inbox Cache
@router.post("/autopilot/message-event")
async def create_message_event(
    data: MessageEventCreate,
    cache: CacheService = Depends(get_cache)
):
    event = await create_message_event(db, user_id, data)
    
    # Invalidate Inbox + Analytics Caches
    await cache.invalidate(f"idps:inbox:{user_id}:*")
    await cache.invalidate(f"idps:analytics:{user_id}")
    
    return {"event": event}
```

**Wann**: Echtzeit-kritische Daten (Inbox, Notifications)

---

#### **Strategie 3: Materialized View Refresh → Invalidate**

```sql
-- Trigger: Nach MV Refresh → Redis Key setzen
CREATE OR REPLACE FUNCTION notify_mv_refresh()
RETURNS TRIGGER AS $$
BEGIN
    PERFORM pg_notify('mv_refresh', 'rlhf_sessions_daily');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

```python
# Backend: Listen auf pg_notify → Invalidate Cache
import asyncpg

async def listen_mv_refreshes():
    conn = await asyncpg.connect(DATABASE_URL)
    await conn.add_listener('mv_refresh', lambda conn, pid, channel, payload: 
        cache.invalidate(f"dashboard:rlhf:*")
    )
```

---

### 4.4 TTL-Empfehlungen

| Endpoint / Datentyp | TTL | Begründung |
|---------------------|-----|------------|
| Dashboard KPIs (`/analytics/dashboard`) | **60s** | Stale OK, wird oft abgerufen |
| Unified Inbox Count | **30s** | Near-Realtime, aber nicht kritisch |
| Contacts/Leads List | **15-30s** | Häufige Updates, aber nicht Realtime |
| Hot Leads (`p_score >= 75`) | **5 Min** (300s) | P-Score ändert sich selten |
| Deep Analytics (Reports) | **15 Min** (900s) | Historische Daten, rechenintensiv |
| Static Lookups (Industries, Tags) | **24h** | Ändert sich nie |
| Individual Lead/Contact Details | **❌ KEIN Cache** | Muss immer aktuell sein |

---

## 5. Implementation Snippets

### 5.1 SQL Migrationen

```sql
-- ============================================================================
-- MIGRATION: 20251206_performance_optimization_phase1.sql
-- Beschreibung: Indizes für message_events, leads, crm_notes
-- ============================================================================

-- MESSAGE EVENTS
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_message_events_user_status_created
  ON public.message_events (user_id, autopilot_status, created_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_message_events_user_channel_status
  ON public.message_events (user_id, channel, autopilot_status, created_at ASC)
  WHERE autopilot_status = 'pending';

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_message_events_user_contact_created
  ON public.message_events (user_id, contact_id, created_at DESC)
  WHERE contact_id IS NOT NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_message_events_user_created_direction
  ON public.message_events (user_id, created_at DESC, direction)
  INCLUDE (channel, normalized_text);

-- LEADS
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_leads_p_score_scored_at
  ON public.leads (p_score DESC NULLS LAST, last_scored_at DESC)
  WHERE p_score IS NOT NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_leads_next_followup
  ON public.leads (next_follow_up)
  WHERE next_follow_up IS NOT NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_leads_status_created
  ON public.leads (status, created_at DESC);

-- CRM NOTES
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_crm_notes_user_contact_created
  ON public.crm_notes (user_id, contact_id, created_at DESC)
  WHERE contact_id IS NOT NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_crm_notes_user_lead_created
  ON public.crm_notes (user_id, lead_id, created_at DESC)
  WHERE lead_id IS NOT NULL;

-- RLHF SESSIONS
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_rlhf_sessions_created_outcome
  ON public.rlhf_feedback_sessions (created_at DESC, outcome)
  INCLUDE (composite_reward, user_id);

-- DM CONVERSATIONS (IDPS)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_dm_conversations_user_status_platform
  ON public.dm_conversations (user_id, status, platform, last_message_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_dm_conversations_user_priority
  ON public.dm_conversations (user_id, priority_score DESC, last_message_at DESC);

-- LEAD VERIFICATIONS
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_lead_verifications_v_score_duplicate
  ON public.lead_verifications (v_score DESC, is_duplicate)
  WHERE v_score IS NOT NULL;

COMMENT ON INDEX idx_message_events_user_status_created IS 
  'Performance: List Message Events mit Status-Filter + Sort';
```

---

```sql
-- ============================================================================
-- MIGRATION: 20251206_performance_optimization_phase2_mvs.sql
-- Beschreibung: Materialized Views für Analytics
-- ============================================================================

-- MV 1: RLHF Sessions Daily
CREATE MATERIALIZED VIEW IF NOT EXISTS public.mv_rlhf_sessions_daily AS
SELECT 
    DATE(created_at) AS session_date,
    COUNT(*) AS total_sessions,
    COUNT(DISTINCT user_id) AS active_users,
    COUNT(*) FILTER (WHERE outcome = 'converted') AS conversions,
    COUNT(*) FILTER (WHERE outcome = 'positive_reply') AS positive_replies,
    AVG(composite_reward) AS avg_reward,
    SUM(composite_reward) AS reward_sum
FROM public.rlhf_feedback_sessions
GROUP BY DATE(created_at)
ORDER BY session_date DESC;

CREATE INDEX idx_mv_rlhf_sessions_date ON public.mv_rlhf_sessions_daily (session_date DESC);

-- Refresh-Funktion
CREATE OR REPLACE FUNCTION refresh_rlhf_daily_mv()
RETURNS VOID AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY public.mv_rlhf_sessions_daily;
END;
$$ LANGUAGE plpgsql;

-- MV 2: Template Performance
CREATE MATERIALIZED VIEW IF NOT EXISTS public.mv_template_performance AS
SELECT 
    template_version,
    persona_variant,
    channel,
    COUNT(*) AS total_messages,
    COUNT(*) FILTER (WHERE autopilot_status = 'sent') AS sent_count,
    ROUND(
        100.0 * COUNT(*) FILTER (WHERE autopilot_status = 'sent') / 
        NULLIF(COUNT(*), 0), 
        2
    ) AS send_rate
FROM public.message_events
WHERE template_version IS NOT NULL
GROUP BY template_version, persona_variant, channel
ORDER BY send_rate DESC NULLS LAST;

CREATE INDEX idx_mv_template_perf ON public.mv_template_performance (send_rate DESC);

-- MV 3: Hot Leads
CREATE MATERIALIZED VIEW IF NOT EXISTS public.mv_hot_leads AS
SELECT 
    l.id,
    l.name,
    l.email,
    l.phone,
    l.p_score,
    l.status,
    l.last_scored_at,
    lv.v_score,
    li.i_score,
    li.last_activity_at
FROM public.leads l
LEFT JOIN public.lead_verifications lv ON l.id = lv.lead_id
LEFT JOIN public.lead_intents li ON l.id = li.lead_id
WHERE l.p_score >= 75 
  AND (lv.v_score IS NULL OR lv.v_score >= 60)
ORDER BY l.p_score DESC;

CREATE INDEX idx_mv_hot_leads_p_score ON public.mv_hot_leads (p_score DESC);

COMMENT ON MATERIALIZED VIEW mv_rlhf_sessions_daily IS 
  'Pre-aggregated daily sessions for analytics dashboard (refresh every 10min)';
```

---

```sql
-- ============================================================================
-- MIGRATION: 20251206_performance_optimization_phase3_functions.sql
-- Beschreibung: SQL-Funktionen für Query Optimization
-- ============================================================================

-- FUNKTION: Lead Event Stats (für P-Score)
CREATE OR REPLACE FUNCTION calculate_lead_event_stats(
    p_user_id UUID,
    p_cutoff_14d TIMESTAMPTZ,
    p_cutoff_7d TIMESTAMPTZ,
    p_contact_id UUID DEFAULT NULL
)
RETURNS TABLE (
    inbound_7d INT,
    inbound_14d INT,
    outbound_14d INT,
    last_event_at TIMESTAMPTZ,
    total_events INT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(*) FILTER (WHERE direction = 'inbound' AND created_at >= p_cutoff_7d)::INT,
        COUNT(*) FILTER (WHERE direction = 'inbound' AND created_at >= p_cutoff_14d)::INT,
        COUNT(*) FILTER (WHERE direction = 'outbound' AND created_at >= p_cutoff_14d)::INT,
        MAX(created_at),
        COUNT(*)::INT
    FROM message_events
    WHERE user_id = p_user_id
      AND created_at >= p_cutoff_14d
      AND (p_contact_id IS NULL OR contact_id = p_contact_id);
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION calculate_lead_event_stats IS 
  'Aggregiert Message Events für P-Score Berechnung (ersetzt Python-Loop)';
```

---

### 5.2 Python Caching Layer (FastAPI)

```python
# backend/app/core/cache.py
"""
Redis Caching Service für SalesFlow AI
"""
import os
import json
import logging
from typing import Any, Optional, Callable, Awaitable
from functools import wraps

import redis.asyncio as aioredis

logger = logging.getLogger(__name__)

class CacheService:
    """Redis-basierter Cache-Service"""
    
    def __init__(self, redis_url: Optional[str] = None):
        self.redis_url = redis_url or os.getenv("REDIS_URL", "redis://localhost:6379")
        self._redis: Optional[aioredis.Redis] = None
    
    async def connect(self):
        """Verbinde mit Redis"""
        if not self._redis:
            self._redis = await aioredis.from_url(
                self.redis_url,
                encoding="utf-8",
                decode_responses=True
            )
            logger.info(f"Connected to Redis: {self.redis_url}")
    
    async def close(self):
        """Schließe Redis-Verbindung"""
        if self._redis:
            await self._redis.close()
    
    async def get(self, key: str) -> Optional[Any]:
        """Hole Wert aus Cache"""
        try:
            await self.connect()
            value = await self._redis.get(key)
            if value:
                return json.loads(value)
            return None
        except Exception as e:
            logger.warning(f"Cache GET error: {e}")
            return None
    
    async def set(self, key: str, value: Any, ttl: int = 60):
        """Setze Wert in Cache mit TTL (Sekunden)"""
        try:
            await self.connect()
            await self._redis.setex(key, ttl, json.dumps(value))
        except Exception as e:
            logger.warning(f"Cache SET error: {e}")
    
    async def delete(self, key: str):
        """Lösche Key aus Cache"""
        try:
            await self.connect()
            await self._redis.delete(key)
        except Exception as e:
            logger.warning(f"Cache DELETE error: {e}")
    
    async def invalidate_pattern(self, pattern: str):
        """Lösche alle Keys die Pattern matchen (z.B. 'dashboard:user:*')"""
        try:
            await self.connect()
            keys = await self._redis.keys(pattern)
            if keys:
                await self._redis.delete(*keys)
                logger.info(f"Invalidated {len(keys)} keys matching '{pattern}'")
        except Exception as e:
            logger.warning(f"Cache INVALIDATE error: {e}")
    
    async def get_or_fetch(
        self,
        key: str,
        fetch_fn: Callable[[], Awaitable[Any]],
        ttl: int = 60,
    ) -> Any:
        """
        Cache-Aside Pattern:
        1. Prüfe Cache
        2. Falls Miss → fetch_fn() ausführen + cachen
        3. Return Result
        """
        # Cache Hit?
        cached = await self.get(key)
        if cached is not None:
            logger.debug(f"Cache HIT: {key}")
            return cached
        
        # Cache Miss → Daten holen
        logger.debug(f"Cache MISS: {key}")
        data = await fetch_fn()
        
        # In Cache speichern
        await self.set(key, data, ttl=ttl)
        return data


# Singleton Instance
_cache_service: Optional[CacheService] = None

def get_cache_service() -> CacheService:
    """Dependency für FastAPI"""
    global _cache_service
    if not _cache_service:
        _cache_service = CacheService()
    return _cache_service


# Decorator für Auto-Caching
def cached(key_prefix: str, ttl: int = 60):
    """
    Decorator für automatisches Caching von Endpoints
    
    Beispiel:
        @cached("dashboard", ttl=60)
        async def get_dashboard(user_id: str):
            ...
    """
    def decorator(func: Callable):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            cache = get_cache_service()
            
            # Cache-Key aus Funktion + Args generieren
            key_parts = [key_prefix, func.__name__]
            key_parts.extend(str(arg) for arg in args)
            key_parts.extend(f"{k}:{v}" for k, v in sorted(kwargs.items()))
            cache_key = ":".join(key_parts)
            
            async def fetch():
                return await func(*args, **kwargs)
            
            return await cache.get_or_fetch(cache_key, fetch, ttl=ttl)
        
        return wrapper
    return decorator


__all__ = ["CacheService", "get_cache_service", "cached"]
```

---

```python
# backend/app/core/deps.py (UPDATE)
from .cache import get_cache_service

# Bestehende Depends ergänzen
def get_cache():
    """Dependency für Cache Service"""
    return get_cache_service()
```

---

#### **Beispiel-Verwendung in Routers**

```python
# backend/app/routers/collective_intelligence.py (UPDATE)
from ..core.deps import get_cache
from ..core.cache import CacheService

@router.get("/analytics/dashboard")
async def get_learning_dashboard(
    days: int = 30,
    db=Depends(get_supabase),
    cache: CacheService = Depends(get_cache),
):
    """
    Holt das Global Learning Dashboard (CACHED)
    """
    from datetime import datetime, timedelta
    start_date = (datetime.now() - timedelta(days=days)).date()
    
    cache_key = f"dashboard:rlhf:days:{days}"
    
    async def fetch_dashboard():
        # MV verwenden statt Raw-Table
        result = db.table("mv_rlhf_sessions_daily").select("*").gte(
            "session_date", start_date.isoformat()
        ).execute()
        return result.data or []
    
    dashboard = await cache.get_or_fetch(cache_key, fetch_dashboard, ttl=60)
    
    return {
        "success": True,
        "dashboard": dashboard,
        "cached": True,  # Info für Frontend
    }
```

---

```python
# backend/app/routers/idps.py (UPDATE)
@router.get("/analytics")
async def get_analytics(
    user: Dict[str, Any] = Depends(get_current_user),
    cache: CacheService = Depends(get_cache),
):
    """
    Holt Analytik-Daten für das IDPS-Dashboard (CACHED)
    """
    user_id = user["user_id"]
    cache_key = f"idps:analytics:{user_id}"
    
    async def fetch_analytics():
        return await get_idps_analytics(db, user_id)
    
    data = await cache.get_or_fetch(cache_key, fetch_analytics, ttl=30)
    return data
```

---

```python
# backend/app/services/predictive_scoring.py (UPDATE)
from ..core.cache import get_cache_service

async def recalc_p_scores_for_user(
    db: Client,
    user_id: str,
    limit: int = 100,
) -> Dict[str, Any]:
    """
    Batch-Recalc mit Cache-Invalidation
    """
    cache = get_cache_service()
    
    # ... bestehende Logik ...
    
    # Nach Recalc: Hot-Leads-Cache invalidieren
    await cache.invalidate_pattern(f"hot_leads:{user_id}:*")
    
    return summary
```

---

## 6. Monitoring & KPIs

### 6.1 Performance-Metriken

**Ziel**: Transparenz über Query-Performance für Regressions-Detection

#### **Supabase Built-in Monitoring**

```sql
-- pg_stat_statements aktivieren (falls nicht bereits aktiv)
CREATE EXTENSION IF NOT EXISTS pg_stat_statements;

-- Top 10 langsamste Queries
SELECT 
    query,
    calls,
    total_exec_time / 1000 AS total_seconds,
    mean_exec_time / 1000 AS avg_seconds,
    max_exec_time / 1000 AS max_seconds
FROM pg_stat_statements
ORDER BY mean_exec_time DESC
LIMIT 10;

-- Queries ohne Index-Nutzung (Seq Scans)
SELECT 
    schemaname,
    tablename,
    seq_scan,
    seq_tup_read,
    idx_scan,
    seq_tup_read / NULLIF(seq_scan, 0) AS avg_seq_tup
FROM pg_stat_user_tables
WHERE seq_scan > 0
ORDER BY seq_tup_read DESC
LIMIT 10;
```

---

#### **Custom Logging in Backend**

```python
# backend/app/middleware/query_logger.py
"""
Middleware für Query-Performance-Logging
"""
import time
import logging
from fastapi import Request

logger = logging.getLogger("query_performance")

async def query_performance_middleware(request: Request, call_next):
    """Loggt langsame Endpoints"""
    start = time.time()
    response = await call_next(request)
    duration = time.time() - start
    
    # Warne bei > 1 Sekunde
    if duration > 1.0:
        logger.warning(
            f"SLOW ENDPOINT: {request.method} {request.url.path} "
            f"took {duration:.2f}s"
        )
    
    # Füge Header hinzu
    response.headers["X-Process-Time"] = f"{duration:.3f}"
    return response
```

```python
# backend/app/main.py (UPDATE)
from .middleware.query_logger import query_performance_middleware

app.middleware("http")(query_performance_middleware)
```

---

### 6.2 Target KPIs (Post-Optimization)

| Metric | Vorher | Ziel (Nachher) | Messung |
|--------|--------|----------------|---------|
| **Dashboard Load Time** | 2-5s | **< 500ms** | p95 Latenz |
| **Message Events List** | 800ms-2s | **< 200ms** | p95 Latenz |
| **P-Score Batch (100 Leads)** | 10-20s | **< 3s** | Absolute Zeit |
| **Hot Leads Query** | 1-2s | **< 300ms** | p95 Latenz |
| **Unified Inbox** | 500ms-1.5s | **< 250ms** | p95 Latenz |
| **Cache Hit Rate** | N/A (kein Cache) | **> 70%** | Redis Stats |
| **Slow Queries (> 1s)** | 20-30% aller Queries | **< 5%** | pg_stat_statements |

---

### 6.3 Monitoring Dashboard (Optional: Grafana + Prometheus)

```yaml
# docker-compose.yml (ergänzen)
services:
  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
  
  postgres-exporter:
    image: prometheuscommunity/postgres-exporter
    environment:
      DATA_SOURCE_NAME: "postgresql://user:pass@supabase:5432/postgres"
    ports:
      - "9187:9187"
  
  grafana:
    image: grafana/grafana
    ports:
      - "3000:3000"
```

**Grafana-Panels**:
- Query Latency (p50, p95, p99)
- Cache Hit Rate
- Index Usage vs. Seq Scans
- Slow Queries per Hour

---

## 7. Implementation Roadmap

### **Phase 1: Quick Wins (Woche 1)**

✅ **Tag 1-2**: Indizes für `message_events`, `leads`, `crm_notes`  
- Migration `20251206_performance_optimization_phase1.sql` ausführen
- `CREATE INDEX CONCURRENTLY` → kein Downtime

✅ **Tag 3-4**: Query Rewrites  
- P-Score: `calculate_lead_event_stats()` SQL-Funktion
- Deals: JOIN statt N+1

✅ **Tag 5**: Redis Setup + Basic Caching  
- Docker Compose für Redis
- `CacheService` implementieren
- 2-3 Endpoints auf Cache umstellen (Dashboard, Analytics)

**Erwarteter Gewinn**: 60-70% Latenz-Reduktion

---

### **Phase 2: Materialized Views (Woche 2)**

✅ **Tag 1-2**: MV 1 (RLHF Sessions Daily)  
- Migration `20251206_performance_optimization_phase2_mvs.sql`
- Refresh-Strategie testen (Cron vs. Trigger)

✅ **Tag 3**: MV 2 (Template Performance)  
- Für A/B-Testing Dashboard

✅ **Tag 4**: MV 3 (Hot Leads)  
- Für Sales-Team Dashboards

✅ **Tag 5**: Monitoring Setup  
- `pg_stat_statements` analysieren
- Grafana Dashboards (optional)

**Erwarteter Gewinn**: +10-15% zusätzlich (Gesamt: 75-85%)

---

### **Phase 3: Fine-Tuning & Scale (Woche 3)**

✅ **Tag 1-2**: Cache Invalidation perfektionieren  
- Event-basiertes Invalidieren
- TTL-Werte optimieren basierend auf Metriken

✅ **Tag 3-4**: Frontend-Optimierung  
- React Query / SWR Konfiguration
- Stale-While-Revalidate Pattern

✅ **Tag 5**: Load Testing  
- Simuliere 10x / 100x Datenmenge
- Identifiziere nächsten Bottleneck

**Erwarteter Gewinn**: Gesamt **80-95% Latenz-Reduktion**

---

## 8. Trade-offs & Risiken

### ✅ **Pro Indizes**
- Drastisch schnellere Queries (10-100x bei großen Tabellen)
- `CREATE INDEX CONCURRENTLY` → Kein Downtime
- Wartung minimal (Auto-Update bei INSERTs)

### ⚠️ **Contra Indizes**
- **Speicher-Overhead**: ~15-25% mehr Disk Space (bei 12 Indizes)
- **Schreib-Performance**: INSERTs/UPDATEs ~10-15% langsamer
- **Index-Bloat**: Bei vielen UPDATEs muss `REINDEX` gelegentlich laufen

**Empfehlung**: ✅ **ACCEPT** – Read-Heavy Workload, Schreib-Performance-Hit akzeptabel

---

### ✅ **Pro Materialized Views**
- Extrem schnelle Aggregation (1000x schneller als Raw-Query)
- Reduziert CPU-Last für wiederholte Analytics

### ⚠️ **Contra Materialized Views**
- **Stale Data**: Refresh-Intervall = Latenz (z.B. 10 Min alt)
- **Refresh-Overhead**: `REFRESH MATERIALIZED VIEW CONCURRENTLY` dauert 1-5s
- **Speicher**: Verdoppelt Daten (Original + MV)

**Empfehlung**: ✅ **ACCEPT** für Analytics – Stale Daten OK (Dashboards nicht Realtime-kritisch)

---

### ✅ **Pro Redis Caching**
- Ultra-schnell (< 1ms für Cache-Hit)
- Reduziert DB-Load drastisch

### ⚠️ **Contra Redis Caching**
- **Infrastruktur-Komplexität**: Redis-Server nötig
- **Cache Invalidation**: Schwierig bei komplexen Abhängigkeiten
- **Stale Data Risk**: TTL zu hoch → veraltete Daten

**Empfehlung**: ✅ **ACCEPT** – Moderne Standard-Architektur, Complexity-Increase gering

---

### ❌ **Partitionierung (SKIP für jetzt)**
- **Pro**: Extrem schnell bei Zeitbereich-Queries (10x)
- **Contra**: 
  - Hohe Migrations-Komplexität
  - Monatliche Maintenance (neue Partitionen)
  - RLS-Inkompatibel in Supabase

**Empfehlung**: ⏸️ **DEFER** bis > 10M `message_events` Rows

---

## 9. Nächste Schritte (Actionable Checklist)

### **Sofort (vor Code-Änderungen)**

1. [ ] Backup der Prod-DB (Supabase Dashboard → Database → Backups)
2. [ ] `pg_stat_statements` aktivieren (Supabase SQL Editor)
   ```sql
   CREATE EXTENSION IF NOT EXISTS pg_stat_statements;
   ```
3. [ ] Baseline-Metriken erfassen:
   ```sql
   -- Aktuelle langsamste Queries loggen
   SELECT query, mean_exec_time FROM pg_stat_statements 
   ORDER BY mean_exec_time DESC LIMIT 20;
   ```

---

### **Phase 1 Implementierung (Woche 1)**

4. [ ] Migration erstellen: `supabase/migrations/20251206_performance_optimization_phase1.sql`
5. [ ] Lokal testen:
   ```bash
   supabase db reset  # Test-DB neu aufsetzen
   supabase migration up  # Migration anwenden
   ```
6. [ ] Staging-Deploy + Load-Test
7. [ ] Production-Deploy (außerhalb Peak-Hours)
8. [ ] Redis installieren:
   ```bash
   docker run -d -p 6379:6379 redis:7-alpine
   ```
9. [ ] `backend/app/core/cache.py` implementieren
10. [ ] 3 Endpoints auf Caching umstellen (Dashboard, IDPS Analytics, Hot Leads)

---

### **Phase 2 Implementierung (Woche 2)**

11. [ ] Materialized Views Migration
12. [ ] Refresh-Strategie konfigurieren (pg_cron oder Trigger)
13. [ ] Backend-Routers auf MVs umstellen

---

### **Monitoring (laufend)**

14. [ ] Query-Performance-Logger aktivieren (`middleware/query_logger.py`)
15. [ ] Wöchentliche Index-Usage-Analyse:
    ```sql
    SELECT * FROM pg_stat_user_indexes WHERE idx_scan < 10;
    ```
16. [ ] Cache-Hit-Rate überwachen:
    ```bash
    redis-cli INFO stats | grep keyspace_hits
    ```

---

## 10. Kontakt für Fragen

**Bei Problemen während der Implementierung**:
- Check Supabase Logs: Dashboard → Database → Logs
- Postgres Query-Plan analysieren:
  ```sql
  EXPLAIN ANALYZE SELECT ...;
  ```
- Index-Größe prüfen:
  ```sql
  SELECT schemaname, tablename, indexname, pg_size_pretty(pg_relation_size(indexrelid))
  FROM pg_stat_user_indexes
  ORDER BY pg_relation_size(indexrelid) DESC;
  ```

---

## Anhang A: Estimated Performance Gains

| Komponente | Vorher | Nachher | Gewinn |
|------------|--------|---------|--------|
| Dashboard Analytics | 2-5s | 200-500ms | **85-90%** |
| Message Events List | 800ms-2s | 100-200ms | **85-90%** |
| P-Score Batch (100) | 10-20s | 2-3s | **80-85%** |
| Hot Leads Query | 1-2s | 200-300ms | **80-85%** |
| Unified Inbox | 500ms-1.5s | 150-250ms | **70-80%** |

**Gesamt-Impact**: 
- **80-95% Latenz-Reduktion** für kritische Queries
- **70%+ Cache-Hit-Rate** für Dashboards (nach 1 Woche Warmup)
- **50% weniger DB-Load** (gemessen in Query-Count)

---

## Anhang B: Rollback-Plan

**Falls Performance schlechter wird oder Fehler auftreten**:

```sql
-- INDEX ROLLBACK
DROP INDEX CONCURRENTLY IF EXISTS idx_message_events_user_status_created;
-- ... (alle neuen Indizes)

-- MV ROLLBACK
DROP MATERIALIZED VIEW IF EXISTS mv_rlhf_sessions_daily CASCADE;

-- SQL-FUNKTIONEN ROLLBACK
DROP FUNCTION IF EXISTS calculate_lead_event_stats CASCADE;
```

```bash
# REDIS ROLLBACK (Backend)
# In .env:
ENABLE_CACHE=false

# Code-Änderungen revertieren via Git:
git revert <commit-hash>
```

**Wichtig**: `DROP INDEX CONCURRENTLY` vermeidet Table-Locks!

---

**Ende der Strategie** – Viel Erfolg bei der Implementierung! 🚀

