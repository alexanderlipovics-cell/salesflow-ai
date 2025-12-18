# 📋 Migrations-Status Übersicht

## ✅ Bereits migriert (bestätigt)

### Backend Migrations
- ✅ `20250105_create_users_table.sql` - **AUSGEFÜHRT**
  - Erstellt: `users`, `token_blacklist` Tabellen
  - Status: ✅ Migriert (aber Schema-Cache hatte Probleme)

---

## ❌ Noch NICHT migriert

### 🔴 Backend Migrations (KRITISCH)

#### 1. `20250106_autopilot_v2_tables.sql` ⚠️ **WICHTIG**
**Datei:** `backend/migrations/20250106_autopilot_v2_tables.sql`

**Erstellt:**
- `autopilot_jobs` - Geplante Nachrichten
- `rate_limit_counters` - Rate Limiting
- `ab_test_experiments` - A/B Tests
- `ab_test_results` - A/B Test Metriken
- `channel_credentials` - API Keys für Kanäle

**Abhängigkeiten:**
- Benötigt `message_events` Tabelle (aus Supabase Migration)

**Status:** ❌ **NICHT MIGRIERT**

---

#### 2. `20250106_autopilot_v2_schema.sql` ⚠️ **WICHTIG**
**Datei:** `backend/migrations/20250106_autopilot_v2_schema.sql`

**Erstellt/Erweitert:**
- Erweitert `contacts` Tabelle (timezone, best_contact_time, etc.)
- `autopilot_jobs` Tabelle
- `autopilot_logs` Tabelle (Audit Trail)
- `ab_test_experiments` Tabelle
- `ab_test_results` Tabelle
- `rate_limit_counters` Tabelle
- `channel_credentials` Tabelle

**Hinweis:** Überschneidet sich teilweise mit `20250106_autopilot_v2_tables.sql`

**Status:** ❌ **NICHT MIGRIERT**

---

#### 3. `20250105_force_schema_reload.sql` ℹ️ **INFO**
**Datei:** `backend/migrations/20250105_force_schema_reload.sql`

**Inhalt:** Nur `NOTIFY pgrst, 'reload schema';` Befehl

**Status:** ⚠️ **Optional** (wurde manuell ausgeführt)

---

### 🟡 Supabase Migrations (Prüfung empfohlen)

#### Performance Optimierungen
- `20251206_performance_optimization_phase1_indexes.sql` - Indizes
- `20251206_performance_optimization_phase1_indexes_NO_CONCURRENT.sql` - Indizes (ohne CONCURRENT)
- `20251206_performance_optimization_phase2_materialized_views.sql` - Materialized Views
- `20251206_performance_optimization_phase3_functions.sql` - Funktionen

#### Autopilot & Message Events
- `20251205_create_autopilot_settings.sql` - Autopilot Einstellungen
- `20251205_create_message_events.sql` - Message Events Tabelle ⚠️ **WICHTIG für Autopilot V2**
- `20251205_alter_message_events_add_suggested_reply.sql` - Erweitert message_events
- `20251206_alter_message_events_add_experiment_fields.sql` - Erweitert message_events

#### Lead Generation (Non Plus Ultra)
- `20251205_NON_PLUS_ULTRA_lead_generation.sql` - Lead Generation System
- `20251206_alter_leads_add_pscore.sql` - P-Score zu Leads

#### Collective Intelligence
- `20251205_NON_PLUS_ULTRA_collective_intelligence.sql` - Collective Intelligence

#### IDPS (Intelligent DM Persistence System)
- `20251206_IDPS_dm_persistence_system.sql` - IDPS System
- `20251206_oauth_webhooks_realtime.sql` - OAuth & Webhooks

#### CRM & Follow-up
- `20251205_create_crm_notes.sql` - CRM Notizen
- `20251129_create_followup_tasks_table.sql` - Follow-up Tasks
- `20251129_add_next_action_at_to_leads.sql` - Next Action Feld
- `20251128_add_followup_fields.sql` - Follow-up Felder
- `20251128_add_import_columns.sql` - Import Spalten

#### Sales Content & Templates
- `20251130_create_sales_content_waterfall.sql` - Sales Content
- `20251129_create_template_performance.sql` - Template Performance
- `20251129_create_sales_scenarios_table.sql` - Sales Szenarien

#### Dashboard & Analytics
- `20251201_dashboard_need_help_reps.sql` - Dashboard Reps

#### RLS & Security
- `20251129_disable_rls_leads.sql` - RLS für Leads deaktiviert

---

## 🎯 Migrations-Reihenfolge (Empfohlen)

### Phase 1: Autopilot V2 (KRITISCH)
```sql
-- 1. Zuerst: Message Events (wenn noch nicht vorhanden)
supabase/migrations/20251205_create_message_events.sql

-- 2. Dann: Autopilot V2 Tabellen
backend/migrations/20250106_autopilot_v2_tables.sql
-- ODER
backend/migrations/20250106_autopilot_v2_schema.sql
-- (Nur EINE davon ausführen - sie überschneiden sich!)

-- 3. Erweiterungen für Message Events
supabase/migrations/20251205_alter_message_events_add_suggested_reply.sql
supabase/migrations/20251206_alter_message_events_add_experiment_fields.sql
```

### Phase 2: Performance Optimierungen
```sql
supabase/migrations/20251206_performance_optimization_phase1_indexes.sql
supabase/migrations/20251206_performance_optimization_phase2_materialized_views.sql
supabase/migrations/20251206_performance_optimization_phase3_functions.sql
```

### Phase 3: Weitere Features
```sql
-- Lead Generation
supabase/migrations/20251205_NON_PLUS_ULTRA_lead_generation.sql
supabase/migrations/20251206_alter_leads_add_pscore.sql

-- Collective Intelligence
supabase/migrations/20251205_NON_PLUS_ULTRA_collective_intelligence.sql

-- IDPS
supabase/migrations/20251206_IDPS_dm_persistence_system.sql
supabase/migrations/20251206_oauth_webhooks_realtime.sql
```

---

## 🔍 Wie prüfen, welche bereits migriert wurden?

### Option 1: Supabase Dashboard
1. Öffnen Sie [Supabase Dashboard](https://app.supabase.com)
2. Gehen Sie zu **Database → Tables**
3. Prüfen Sie, welche Tabellen existieren

### Option 2: SQL Query in Supabase SQL Editor
```sql
-- Alle Tabellen auflisten
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;

-- Prüfen ob spezifische Tabellen existieren
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN (
    'users',
    'autopilot_jobs',
    'rate_limit_counters',
    'ab_test_experiments',
    'ab_test_results',
    'channel_credentials',
    'message_events',
    'autopilot_settings'
  );
```

### Option 3: Backend-Logs prüfen
Wenn der Backend-Code versucht, auf eine Tabelle zuzugreifen, die nicht existiert, gibt es Fehler wie:
- `relation "autopilot_jobs" does not exist`
- `column "timezone" does not exist in table "contacts"`

---

## ⚠️ WICHTIGE HINWEISE

1. **Autopilot V2 Migrations:**
   - `20250106_autopilot_v2_tables.sql` und `20250106_autopilot_v2_schema.sql` überschneiden sich
   - **Nur EINE davon ausführen!**
   - Empfehlung: `20250106_autopilot_v2_tables.sql` (neuer, vollständiger)

2. **Abhängigkeiten:**
   - Autopilot V2 benötigt `message_events` Tabelle
   - Führen Sie zuerst `20251205_create_message_events.sql` aus

3. **RLS Policies:**
   - Viele Migrations aktivieren RLS
   - Stellen Sie sicher, dass Policies korrekt sind

4. **Performance Migrations:**
   - `phase1_indexes.sql` kann bei großen Tabellen lange dauern
   - Verwenden Sie `NO_CONCURRENT` Version wenn nötig

---

## 📝 Nächste Schritte

1. ✅ Prüfen Sie, welche Tabellen bereits existieren (SQL Query oben)
2. 🔴 Führen Sie die **kritischen** Migrations aus (Autopilot V2)
3. 🟡 Führen Sie die **Performance-Optimierungen** aus
4. 🟢 Führen Sie die **weiteren Features** nach Bedarf aus

---

**Letzte Aktualisierung:** 2025-01-06

