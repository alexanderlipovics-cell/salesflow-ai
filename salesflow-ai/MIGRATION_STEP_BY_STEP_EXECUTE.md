# 🚀 Schritt-für-Schritt Migration - AUSFÜHRUNG

## ⚠️ WICHTIG: Lesen Sie zuerst die Ergebnisse von `check_critical_tables.sql`

Führen Sie zuerst `check_critical_tables.sql` aus und teilen Sie mir die Ergebnisse mit!

---

## Schritt 2: Message Events Tabelle (wenn fehlt)

**Prüfung:**
```sql
SELECT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' 
      AND table_name = 'message_events'
);
```

**Wenn `false` (Tabelle fehlt):**

1. Öffnen Sie: `supabase/migrations/20251205_create_message_events.sql`
2. ⚠️ **WICHTIG:** Diese Migration droppt die Tabelle, wenn sie existiert!
3. Wenn die Tabelle bereits existiert und Daten enthält, **überspringen Sie diesen Schritt**
4. Wenn die Tabelle fehlt, kopieren Sie den Inhalt und führen Sie aus
5. Nach der Migration:
```sql
NOTIFY pgrst, 'reload schema';
```

---

## Schritt 3: Autopilot V2 Tabellen

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

1. Öffnen Sie: `backend/migrations/20250106_autopilot_v2_tables.sql`
2. Kopieren Sie den **gesamten Inhalt**
3. Fügen Sie ihn in den **Supabase SQL Editor** ein
4. Klicken Sie auf **Run**
5. Warten Sie auf Erfolgsmeldung

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

**Erwartete Ausgabe:** 5 Tabellen sollten aufgelistet werden

---

## Schritt 4: Contacts Tabelle erweitern

**Prüfung:**
```sql
SELECT column_name 
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'contacts'
  AND column_name IN ('timezone', 'best_contact_time', 'preferred_channel');
```

**Wenn Felder fehlen:**

Führen Sie diese SQL-Befehle aus:

```sql
-- Autopilot V2 Felder zu contacts hinzufügen
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS timezone VARCHAR(50) DEFAULT 'UTC';
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS best_contact_time TIME;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS preferred_channel VARCHAR(50) DEFAULT 'email';
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS opt_out_channels TEXT[] DEFAULT '{}';
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS linkedin_id VARCHAR(200);
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS instagram_id VARCHAR(200);
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS whatsapp_number VARCHAR(50);

-- Schema Cache neu laden
NOTIFY pgrst, 'reload schema';
```

**Prüfung nach Migration:**
```sql
SELECT column_name, data_type 
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'contacts'
  AND column_name IN ('timezone', 'best_contact_time', 'preferred_channel', 'opt_out_channels');
```

---

## Schritt 5: Message Events Erweiterungen

### 5a: Suggested Reply Feld

**Prüfung:**
```sql
SELECT column_name 
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'message_events'
  AND column_name = 'suggested_reply';
```

**Wenn Spalte fehlt:**
1. Öffnen Sie: `supabase/migrations/20251205_alter_message_events_add_suggested_reply.sql`
2. Kopieren und ausführen

---

### 5b: Experiment Fields

**Prüfung:**
```sql
SELECT column_name 
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'message_events'
  AND column_name IN ('experiment_id', 'variant_id');
```

**Wenn Spalten fehlen:**
1. Öffnen Sie: `supabase/migrations/20251206_alter_message_events_add_experiment_fields.sql`
2. Kopieren und ausführen

---

## Schritt 6: Finale Prüfung

Führen Sie erneut aus:
```sql
-- check_critical_tables.sql
```

**Alle kritischen Tabellen sollten jetzt ✅ Existiert zeigen!**

---

## Nach allen Migrations

### Backend neu starten:
```bash
cd backend
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### Frontend testen:
- Öffnen Sie `http://localhost:5174`
- Testen Sie die Signup/Login Funktionalität

---

## 🆘 Bei Fehlern

### Fehler: "relation already exists"
→ Tabelle existiert bereits. Überspringen Sie diesen Schritt.

### Fehler: "column already exists"  
→ Spalte existiert bereits. Überspringen Sie diesen Schritt.

### Fehler: "permission denied"
→ Stellen Sie sicher, dass Sie als Projekt-Admin eingeloggt sind.

### Fehler: "foreign key constraint"
→ Prüfen Sie, ob die referenzierte Tabelle existiert (z.B. `message_events` für `autopilot_jobs`)

---

**Bereit? Beginnen Sie mit `check_critical_tables.sql`! 🚀**

