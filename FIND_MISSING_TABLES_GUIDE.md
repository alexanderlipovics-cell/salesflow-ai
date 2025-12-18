# 🔍 Anleitung: Fehlende Tabellen finden und erstellen

## Schritt 1: Prüfen welche Tabellen fehlen

### Option A: Im Supabase SQL Editor (Empfohlen)

1. Öffne **Supabase Dashboard** → Dein Projekt → **SQL Editor**
2. Kopiere und führe aus:

```sql
-- Schnelle Prüfung: Welche HIGH-Priority Tabellen fehlen?
SELECT 
    table_name,
    '❌ FEHLT' as status
FROM (VALUES
    ('leads'),
    ('message_events'),
    ('followup_tasks'),
    ('autopilot_jobs'),
    ('autopilot_settings'),
    ('rate_limit_counters'),
    ('crm_notes'),
    ('dm_conversations'),
    ('lead_verifications'),
    ('consent_records')
) AS expected(table_name)
WHERE NOT EXISTS (
    SELECT 1 
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
      AND table_name = expected.table_name
)
ORDER BY table_name;
```

### Option B: Mit dem Prüfskript

Führe `check_missing_tables_quick.sql` im Supabase SQL Editor aus.

---

## Schritt 2: Migration-Datei für fehlende Tabelle finden

### Übersicht: Welche Migration erstellt welche Tabelle

| Fehlende Tabelle | Migration-Datei | Pfad |
|------------------|-----------------|------|
| `message_events` | `20251205_create_message_events.sql` | `supabase/migrations/` |
| `followup_tasks` | `20251129_create_followup_tasks_table.sql` | `supabase/migrations/` |
| `autopilot_jobs` | `step3_autopilot_v2_tables.sql` | `backend/migrations/` oder `sql/` |
| `autopilot_settings` | `20251205_create_autopilot_settings.sql` | `supabase/migrations/` |
| `rate_limit_counters` | `step3_autopilot_v2_tables.sql` | `backend/migrations/` oder `sql/` |
| `crm_notes` | `20251205_create_crm_notes.sql` | `supabase/migrations/` |
| `dm_conversations` | `20251206_IDPS_dm_persistence_system.sql` | `supabase/migrations/` |
| `lead_verifications` | `20251205_NON_PLUS_ULTRA_lead_generation.sql` | `supabase/migrations/` |
| `consent_records` | `20251206_create_consent_tables.sql` | `supabase/migrations/` |
| `leads` | Basis-Tabelle (sollte bereits existieren) | Initial Setup |

### Automatisch finden (im Projekt)

1. **Im VS Code / Cursor:**
   - Drücke `Ctrl+Shift+F` (Windows) oder `Cmd+Shift+F` (Mac)
   - Suche nach: `CREATE TABLE.*tabellenname`
   - Beispiel: Suche `CREATE TABLE.*message_events`

2. **Mit grep (Terminal):**
```bash
# Im Projekt-Root
grep -r "CREATE TABLE.*message_events" supabase/migrations/
```

3. **Dateien durchsuchen:**
   - Öffne `supabase/migrations/` Ordner
   - Suche nach Dateinamen, die den Tabellennamen enthalten
   - Beispiel: `*message_events*.sql` oder `*followup*.sql`

---

## Schritt 3: Migration ausführen

### Methode 1: Supabase SQL Editor (Empfohlen)

1. Öffne die Migration-Datei (z.B. `supabase/migrations/20251205_create_message_events.sql`)
2. Kopiere den gesamten Inhalt
3. Gehe zu **Supabase Dashboard** → **SQL Editor**
4. Füge den SQL-Code ein
5. Klicke **Run** oder drücke `Ctrl+Enter`

### Methode 2: Supabase CLI (für Entwickler)

```bash
# Im Projekt-Root
cd supabase
supabase db reset  # Setzt DB zurück und führt alle Migrations aus
# ODER
supabase migration up  # Führt nur neue Migrations aus
```

### Methode 3: Manuell (für einzelne Tabellen)

1. Öffne die Migration-Datei
2. Kopiere nur den `CREATE TABLE` Teil
3. Führe im Supabase SQL Editor aus

---

## Schritt 4: Prüfen ob Tabelle erstellt wurde

Nach dem Ausführen der Migration:

```sql
-- Prüfe ob Tabelle existiert
SELECT EXISTS (
    SELECT 1 
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
      AND table_name = 'message_events'  -- Ersetze mit deiner Tabelle
) as tabelle_existiert;

-- Oder zeige Struktur
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'message_events'  -- Ersetze mit deiner Tabelle
ORDER BY ordinal_position;
```

---

## Häufige Probleme & Lösungen

### Problem: "relation already exists"
**Lösung:** Die Tabelle existiert bereits. Prüfe mit:
```sql
SELECT * FROM information_schema.tables 
WHERE table_schema = 'public' AND table_name = 'deine_tabelle';
```

### Problem: "permission denied"
**Lösung:** Stelle sicher, dass du als Admin/Service Role eingeloggt bist.

### Problem: "foreign key constraint"
**Lösung:** Führe zuerst die Migrationen für abhängige Tabellen aus (z.B. `leads` vor `message_events`).

---

## Checkliste: Alle wichtigen Tabellen prüfen

Führe dieses Skript aus, um alle wichtigen Tabellen auf einmal zu prüfen:

```sql
SELECT 
    table_name,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.tables 
            WHERE table_schema = 'public' AND table_name = t.table_name
        ) THEN '✅'
        ELSE '❌ FEHLT'
    END as status
FROM (VALUES 
    ('leads'),
    ('message_events'),
    ('followup_tasks'),
    ('autopilot_jobs'),
    ('autopilot_settings'),
    ('rate_limit_counters'),
    ('crm_notes'),
    ('dm_conversations'),
    ('lead_verifications'),
    ('consent_records')
) AS t(table_name)
ORDER BY status, table_name;
```

---

## Schnellzugriff: Migration-Dateien

### Im Projekt finden:

```
salesflow-ai/
├── supabase/
│   └── migrations/
│       ├── 20251129_create_followup_tasks_table.sql
│       ├── 20251205_create_message_events.sql
│       ├── 20251205_create_autopilot_settings.sql
│       ├── 20251205_create_crm_notes.sql
│       ├── 20251205_NON_PLUS_ULTRA_lead_generation.sql
│       ├── 20251206_IDPS_dm_persistence_system.sql
│       └── 20251206_create_consent_tables.sql
└── sql/
    └── step3_autopilot_v2_tables.sql  (für autopilot_jobs, rate_limit_counters)
```

---

## Tipp: Automatisches Mapping

Erstelle eine Datei `table_to_migration.md` mit allen Zuordnungen:

```markdown
| Tabelle | Migration | Priorität |
|---------|-----------|-----------|
| message_events | 20251205_create_message_events.sql | HIGH |
| followup_tasks | 20251129_create_followup_tasks_table.sql | HIGH |
| autopilot_jobs | step3_autopilot_v2_tables.sql | HIGH |
```

