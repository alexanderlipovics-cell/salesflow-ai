# 🚀 Schritt-für-Schritt Migrations-Anleitung

## Vorbereitung

### Schritt 0: Supabase-Verbindung prüfen
1. Öffnen Sie [Supabase Dashboard](https://app.supabase.com)
2. Wählen Sie Ihr Projekt aus
3. Gehen Sie zu **SQL Editor**
4. Stellen Sie sicher, dass das Projekt **nicht pausiert** ist

---

## Phase 1: Status prüfen

### Schritt 1: Migration Status prüfen
1. Öffnen Sie die Datei `check_migration_status.sql`
2. Kopieren Sie den gesamten Inhalt
3. Fügen Sie ihn in den **Supabase SQL Editor** ein
4. Klicken Sie auf **Run** (oder F5)
5. Notieren Sie sich, welche Tabellen **❌ FEHLT** markiert sind

**Erwartete Ausgabe:**
- Liste aller existierenden Tabellen
- Liste der kritischen Tabellen mit Status
- Prüfung der `contacts` Tabelle Felder
- Liste der Indizes
- Liste der Funktionen

---

## Phase 2: Kritische Migrations (Autopilot V2)

### Schritt 2: Message Events Tabelle (wenn fehlt)
**Datei:** `supabase/migrations/20251205_create_message_events.sql`

**Prüfung:**
```sql
SELECT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' 
      AND table_name = 'message_events'
);
```

**Wenn `false` (Tabelle fehlt):**
1. Öffnen Sie `supabase/migrations/20251205_create_message_events.sql`
2. Kopieren Sie den gesamten Inhalt
3. Fügen Sie ihn in den **Supabase SQL Editor** ein
4. Klicken Sie auf **Run**
5. Warten Sie auf "Success. No rows returned" oder ähnliche Erfolgsmeldung

**Nach der Migration:**
```sql
-- Schema Cache neu laden
NOTIFY pgrst, 'reload schema';
```

---

### Schritt 3: Autopilot V2 Tabellen
**Datei:** `backend/migrations/20250106_autopilot_v2_tables.sql`

**Prüfung:**
```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN (
    'autopilot_jobs',
    'rate_limit_counters',
    'ab_test_experiments',
    'ab_test_results',
    'channel_credentials'
  );
```

**Wenn Tabellen fehlen:**
1. Öffnen Sie `backend/migrations/20250106_autopilot_v2_tables.sql`
2. Kopieren Sie den gesamten Inhalt
3. Fügen Sie ihn in den **Supabase SQL Editor** ein
4. Klicken Sie auf **Run**
5. Warten Sie auf Erfolgsmeldung

**⚠️ WICHTIG:** 
- Falls `ab_test_experiments` bereits existiert, kann es zu einem Fehler kommen
- In diesem Fall: Überspringen Sie diesen Schritt oder kommentieren Sie die CREATE TABLE Zeilen aus

**Nach der Migration:**
```sql
-- Schema Cache neu laden
NOTIFY pgrst, 'reload schema';

-- Prüfen ob Tabellen erstellt wurden
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN (
    'autopilot_jobs',
    'rate_limit_counters',
    'ab_test_experiments',
    'ab_test_results',
    'channel_credentials'
  );
```

---

### Schritt 4: Contacts Tabelle erweitern (wenn nötig)
**Datei:** `backend/migrations/20250106_autopilot_v2_schema.sql` (nur die ALTER TABLE Teile)

**Prüfung:**
```sql
SELECT column_name 
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'contacts'
  AND column_name IN ('timezone', 'best_contact_time', 'preferred_channel');
```

**Wenn Felder fehlen:**
1. Öffnen Sie `backend/migrations/20250106_autopilot_v2_schema.sql`
2. Suchen Sie nach den `ALTER TABLE contacts ADD COLUMN` Zeilen (ca. Zeile 22-28)
3. Kopieren Sie nur diese Zeilen:
```sql
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS timezone VARCHAR(50) DEFAULT 'UTC';
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS best_contact_time TIME;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS preferred_channel VARCHAR(50) DEFAULT 'email';
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS opt_out_channels TEXT[] DEFAULT '{}';
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS linkedin_id VARCHAR(200);
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS instagram_id VARCHAR(200);
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS whatsapp_number VARCHAR(50);
```
4. Fügen Sie sie in den **Supabase SQL Editor** ein
5. Klicken Sie auf **Run**

**Nach der Migration:**
```sql
-- Prüfen ob Felder hinzugefügt wurden
SELECT column_name, data_type 
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'contacts'
  AND column_name IN ('timezone', 'best_contact_time', 'preferred_channel');
```

---

## Phase 3: Message Events Erweiterungen

### Schritt 5: Message Events - Suggested Reply
**Datei:** `supabase/migrations/20251205_alter_message_events_add_suggested_reply.sql`

**Prüfung:**
```sql
SELECT column_name 
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'message_events'
  AND column_name = 'suggested_reply';
```

**Wenn Spalte fehlt:**
1. Öffnen Sie `supabase/migrations/20251205_alter_message_events_add_suggested_reply.sql`
2. Kopieren Sie den gesamten Inhalt
3. Führen Sie aus im **Supabase SQL Editor**

---

### Schritt 6: Message Events - Experiment Fields
**Datei:** `supabase/migrations/20251206_alter_message_events_add_experiment_fields.sql`

**Prüfung:**
```sql
SELECT column_name 
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'message_events'
  AND column_name IN ('experiment_id', 'variant_id');
```

**Wenn Spalten fehlen:**
1. Öffnen Sie `supabase/migrations/20251206_alter_message_events_add_experiment_fields.sql`
2. Kopieren Sie den gesamten Inhalt
3. Führen Sie aus im **Supabase SQL Editor**

---

## Phase 4: Performance Optimierungen (Optional, aber empfohlen)

### Schritt 7: Performance Indizes
**Datei:** `supabase/migrations/20251206_performance_optimization_phase1_indexes.sql`

**⚠️ WICHTIG:** Diese Migration kann bei großen Tabellen **lange dauern** (5-30 Minuten)

**Prüfung:**
```sql
-- Prüfen ob bereits viele Indizes existieren
SELECT COUNT(*) as index_count
FROM pg_indexes
WHERE schemaname = 'public'
  AND indexname LIKE 'idx_%';
```

**Wenn Sie fortfahren möchten:**
1. Öffnen Sie `supabase/migrations/20251206_performance_optimization_phase1_indexes.sql`
2. **Lesen Sie die Datei** - sie enthält viele `CREATE INDEX CONCURRENTLY` Befehle
3. Kopieren Sie den gesamten Inhalt
4. Führen Sie aus im **Supabase SQL Editor**
5. **Warten Sie geduldig** - dies kann lange dauern!

**Alternative (wenn CONCURRENT Probleme macht):**
- Verwenden Sie `20251206_performance_optimization_phase1_indexes_NO_CONCURRENT.sql` stattdessen

---

## Phase 5: Weitere Features (Optional)

### Schritt 8: Autopilot Settings
**Datei:** `supabase/migrations/20251205_create_autopilot_settings.sql`

**Prüfung:**
```sql
SELECT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' 
      AND table_name = 'autopilot_settings'
);
```

**Wenn Tabelle fehlt:**
1. Öffnen Sie `supabase/migrations/20251205_create_autopilot_settings.sql`
2. Kopieren und ausführen

---

## Nach jeder Migration

### Schema Cache neu laden
```sql
NOTIFY pgrst, 'reload schema';
```

### Backend neu starten (falls nötig)
```bash
cd backend
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

---

## Fehlerbehebung

### Fehler: "relation already exists"
**Lösung:** Die Tabelle existiert bereits. Überspringen Sie diesen Schritt.

### Fehler: "column already exists"
**Lösung:** Die Spalte existiert bereits. Überspringen Sie diesen Schritt.

### Fehler: "permission denied"
**Lösung:** Stellen Sie sicher, dass Sie als Projekt-Admin eingeloggt sind.

### Fehler: "timeout"
**Lösung:** Bei großen Tabellen kann die Migration länger dauern. Versuchen Sie es erneut oder verwenden Sie die NO_CONCURRENT Version.

---

## Finale Prüfung

Nach allen Migrations, führen Sie erneut aus:
```sql
-- check_migration_status.sql
```

Alle kritischen Tabellen sollten jetzt **✅ Existiert** zeigen.

---

**Viel Erfolg! 🚀**

