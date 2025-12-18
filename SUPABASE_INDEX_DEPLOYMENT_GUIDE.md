# 🚀 Supabase Index Deployment Guide

**Problem**: `CREATE INDEX CONCURRENTLY` funktioniert nicht in Supabase Migrations (Transaction-Block-Konflikt)

**Lösung**: Indizes **einzeln** im SQL-Editor ausführen (außerhalb von Migrations)

---

## 🎯 Option 1: DEV/STAGING (Schnell, mit kurzen Locks)

Für **Entwicklung & Staging** kannst du die Migration **ohne CONCURRENTLY** verwenden:

```bash
# Diese Datei verwenden:
supabase/migrations/20251206_performance_optimization_phase1_indexes_NO_CONCURRENT.sql

# In Supabase Dashboard → SQL Editor → Paste & Execute
```

**⚠️ ACHTUNG**: Locks die Tabellen für ~5-30 Sekunden (abhängig von Größe)

---

## ✅ Option 2: PRODUCTION (Kein Downtime, empfohlen)

Für **Production** führe jeden Index **einzeln** im SQL-Editor aus:

### **Schritt 1: Öffne Supabase SQL Editor**

1. Gehe zu: https://supabase.com/dashboard
2. Wähle dein Projekt
3. Klicke links auf **SQL Editor**
4. Klicke **New Query**

---

### **Schritt 2: Führe Indizes einzeln aus**

Kopiere **jeden Index einzeln** und klicke **RUN**:

---

#### **🔥 INDEX 1: Message Events - User + Status + Created**

```sql
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_message_events_user_status_created
  ON public.message_events (user_id, autopilot_status, created_at DESC);
```

**⏱️ Dauer**: ~1-5 Minuten  
**✅ Wenn fertig**: "Success. No rows returned"

---

#### **🔥 INDEX 2: Message Events - Pending mit Kanal (Partial)**

```sql
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_message_events_user_channel_status
  ON public.message_events (user_id, channel, autopilot_status, created_at ASC)
  WHERE autopilot_status = 'pending';
```

**⏱️ Dauer**: ~30s-2 Minuten (Partial Index = kleiner)

---

#### **🔥 INDEX 3: Message Events - Contact-spezifisch**

```sql
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_message_events_user_contact_created
  ON public.message_events (user_id, contact_id, created_at DESC)
  WHERE contact_id IS NOT NULL;
```

**⏱️ Dauer**: ~30s-2 Minuten

---

#### **🔥 INDEX 4: Message Events - Covering Index (mit INCLUDE)**

```sql
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_message_events_user_created_direction
  ON public.message_events (user_id, created_at DESC, direction)
  INCLUDE (channel, normalized_text);
```

**⏱️ Dauer**: ~1-5 Minuten (größer wegen INCLUDE)

---

#### **🎯 INDEX 5: Leads - P-Score + Scored-At**

```sql
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_leads_p_score_scored_at
  ON public.leads (p_score DESC NULLS LAST, last_scored_at DESC)
  WHERE p_score IS NOT NULL;
```

**⏱️ Dauer**: ~10-30 Sekunden

---

#### **🎯 INDEX 6: Leads - Next Follow-up**

```sql
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_leads_next_followup
  ON public.leads (next_follow_up)
  WHERE next_follow_up IS NOT NULL;
```

**⏱️ Dauer**: ~10-30 Sekunden

---

#### **🎯 INDEX 7: Leads - Status + Created**

```sql
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_leads_status_created
  ON public.leads (status, created_at DESC);
```

**⏱️ Dauer**: ~10-30 Sekunden

---

#### **📝 INDEX 8: CRM Notes - User + Contact + Created**

```sql
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_crm_notes_user_contact_created
  ON public.crm_notes (user_id, contact_id, created_at DESC)
  WHERE contact_id IS NOT NULL;
```

**⏱️ Dauer**: ~10-30 Sekunden

---

#### **📝 INDEX 9: CRM Notes - User + Lead + Created**

```sql
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_crm_notes_user_lead_created
  ON public.crm_notes (user_id, lead_id, created_at DESC)
  WHERE lead_id IS NOT NULL;
```

**⏱️ Dauer**: ~10-30 Sekunden

---

#### **📊 INDEX 10: RLHF Sessions - Created + Outcome (Covering)**

```sql
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_rlhf_sessions_created_outcome
  ON public.rlhf_feedback_sessions (created_at DESC, outcome)
  INCLUDE (composite_reward, user_id);
```

**⏱️ Dauer**: ~30s-2 Minuten

---

#### **📬 INDEX 11: DM Conversations - User + Status + Platform**

```sql
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_dm_conversations_user_status_platform
  ON public.dm_conversations (user_id, status, platform, last_message_at DESC);
```

**⏱️ Dauer**: ~10-30 Sekunden

---

#### **📬 INDEX 12: DM Conversations - User + Priority**

```sql
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_dm_conversations_user_priority
  ON public.dm_conversations (user_id, priority_score DESC, last_message_at DESC);
```

**⏱️ Dauer**: ~10-30 Sekunden

---

#### **✅ INDEX 13: Lead Verifications - V-Score + Duplicate**

```sql
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_lead_verifications_v_score_duplicate
  ON public.lead_verifications (v_score DESC, is_duplicate)
  WHERE v_score IS NOT NULL;
```

**⏱️ Dauer**: ~10-30 Sekunden

---

### **Schritt 3: Validiere alle Indizes**

Nach Ausführung aller Indizes, prüfe ob sie erstellt wurden:

```sql
SELECT 
    schemaname,
    tablename,
    indexname,
    pg_size_pretty(pg_relation_size(indexrelid)) AS index_size,
    idx_scan AS times_used
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
  AND (
    indexname LIKE 'idx_message_events%'
    OR indexname LIKE 'idx_leads%'
    OR indexname LIKE 'idx_crm_notes%'
    OR indexname LIKE 'idx_rlhf%'
    OR indexname LIKE 'idx_dm_conversations%'
    OR indexname LIKE 'idx_lead_verifications%'
  )
ORDER BY pg_relation_size(indexrelid) DESC;
```

**✅ Erwartetes Ergebnis**: 13 Indizes sollten aufgelistet werden

---

## 🔍 Fortschritt überwachen

Während ein Index erstellt wird (CONCURRENTLY läuft), kannst du den Fortschritt checken:

```sql
SELECT 
    pid,
    now() - pg_stat_activity.query_start AS duration,
    query
FROM pg_stat_activity
WHERE query LIKE '%CREATE INDEX%'
  AND state = 'active';
```

---

## ⚠️ Troubleshooting

### Problem: "Index already exists"

```sql
-- Prüfe ob Index existiert:
SELECT indexname 
FROM pg_indexes 
WHERE tablename = 'message_events' 
  AND indexname = 'idx_message_events_user_status_created';

-- Falls ja: Überspringe oder lösche vorher:
DROP INDEX IF EXISTS idx_message_events_user_status_created;
```

### Problem: "Timeout" oder Index dauert > 30 Minuten

**Ursache**: Tabelle zu groß oder zu viel Schreib-Last

**Lösung**: 
1. Führe Index außerhalb Peak-Hours aus (nachts)
2. Prüfe ob andere lange Queries laufen:
   ```sql
   SELECT * FROM pg_stat_activity WHERE state = 'active';
   ```

### Problem: "Permission denied"

**Ursache**: Supabase-User hat keine CREATE INDEX Rechte

**Lösung**: Nutze den **Service Role** Connection String (nicht den anon key)

---

## 📊 Performance-Check (Nach Index-Deployment)

Prüfe ob Indizes verwendet werden:

```sql
-- Top Queries mit Index-Usage
SELECT 
    schemaname,
    tablename,
    indexname,
    idx_scan AS index_scans,
    idx_tup_read AS rows_read,
    idx_tup_fetch AS rows_fetched
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
  AND indexname LIKE 'idx_%'
ORDER BY idx_scan DESC
LIMIT 20;
```

**✅ Gute Zeichen**:
- `idx_scan` > 0 (Index wird verwendet)
- Keine Errors in Supabase Logs

**❌ Schlechte Zeichen**:
- `idx_scan` = 0 nach 1 Stunde (Index wird nicht genutzt)
- Sequential Scans bleiben hoch

---

## 🚀 Nächste Schritte (Nach Indizes)

1. ✅ **Redis installieren** (siehe Quick-Start-Guide)
2. ✅ **Backend-Caching** implementieren
3. ✅ **Phase 2**: Materialized Views deployen

---

## 💡 Pro-Tipp: Index-Erstellung über Nacht

Für **sehr große Tabellen** (> 10M Rows):

```bash
# Erstelle ein Shell-Script (create_indexes.sh):
#!/bin/bash

psql $DATABASE_URL <<EOF
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_message_events_user_status_created
  ON public.message_events (user_id, autopilot_status, created_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_message_events_user_channel_status
  ON public.message_events (user_id, channel, autopilot_status, created_at ASC)
  WHERE autopilot_status = 'pending';

-- ... alle weiteren Indizes
EOF

# Ausführen:
chmod +x create_indexes.sh
nohup ./create_indexes.sh > index_creation.log 2>&1 &
```

---

**🎉 Fertig! Nach Index-Deployment solltest du 60-70% Performance-Verbesserung sehen!**

