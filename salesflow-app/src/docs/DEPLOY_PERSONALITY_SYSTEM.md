# 🚀 DEPLOY ANLEITUNG: DISG & No-Lead-Left-Behind System

## Übersicht

Diese Anleitung beschreibt die Deployment-Schritte für das neue Persönlichkeits- und Kontaktplan-System.

---

## 1️⃣ SQL Migration deployen

### Schritt 1: Supabase Dashboard öffnen

1. Gehe zu [Supabase Dashboard](https://app.supabase.io)
2. Wähle dein Sales Flow Projekt
3. Klicke auf **SQL Editor** im linken Menü

### Schritt 2: Migration ausführen

1. Klicke auf **+ New Query**
2. Kopiere den **gesamten Inhalt** von:
   ```
   src/backend/migrations/010_personality_contact_plans.sql
   ```
3. Klicke **Run** (oder drücke F5)
4. Prüfe die Ausgabe auf Erfolg:
   ```
   ✅ Migration 010_personality_contact_plans.sql erfolgreich!
   ```

### Schritt 3: Verifizieren

Führe diese Queries aus um zu prüfen ob alles korrekt ist:

```sql
-- 1. Prüfe ob Tabellen erstellt wurden
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('lead_personality_profiles', 'contact_plans');

-- 2. Prüfe ob decision_state Spalte auf contacts existiert
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'contacts' 
AND column_name = 'decision_state';

-- 3. Prüfe ob View existiert
SELECT * FROM view_leads_full_context LIMIT 1;

-- 4. Prüfe ob RPCs existiert
SELECT routine_name 
FROM information_schema.routines 
WHERE routine_schema = 'public'
AND routine_name IN (
  'upsert_personality_profile',
  'upsert_contact_plan',
  'get_leads_without_plan',
  'get_reactivation_candidates',
  'get_todays_contact_plans'
);
```

---

## 2️⃣ Was wurde erstellt?

### Neue Tabellen

| Tabelle | Beschreibung |
|---------|-------------|
| `lead_personality_profiles` | DISG-Profile mit D/I/S/G Scores |
| `contact_plans` | Garantierter nächster Schritt pro Lead |

### Neue Spalte

| Tabelle | Spalte | Typ |
|---------|--------|-----|
| `contacts` | `decision_state` | ENUM: no_decision, thinking, committed, not_now, rejected |

### Neue Funktionen (RPCs)

| Funktion | Beschreibung |
|----------|-------------|
| `upsert_personality_profile()` | DISG-Profil erstellen/aktualisieren |
| `upsert_contact_plan()` | Kontaktplan erstellen/aktualisieren |
| `mark_contact_plan_executed()` | Plan als erledigt markieren |
| `get_leads_without_plan()` | Leads ohne Plan finden |
| `get_reactivation_candidates()` | Inaktive Leads finden |
| `get_todays_contact_plans()` | Heutige Pläne für Daily Flow |

### Neue Views

| View | Beschreibung |
|------|-------------|
| `view_leads_full_context` | Lead + DISG + Plan in einem Query |
| `view_contact_plan_stats` | Statistiken pro Workspace |

---

## 3️⃣ Typische Probleme & Lösungen

### Problem: "relation already exists"
**Lösung:** Die Tabelle existiert bereits. Das ist OK - die Migration nutzt `IF NOT EXISTS`.

### Problem: "permission denied"
**Lösung:** Prüfe ob du als `postgres` User eingeloggt bist (nicht als `anon`).

### Problem: "foreign key constraint"
**Lösung:** Stelle sicher, dass die `contacts` und `workspaces` Tabellen existieren.

---

## 4️⃣ Rollback (falls nötig)

Falls du die Migration rückgängig machen musst:

```sql
-- ⚠️ VORSICHT: Löscht alle Daten!

-- 1. Views droppen
DROP VIEW IF EXISTS view_leads_full_context;
DROP VIEW IF EXISTS view_contact_plan_stats;

-- 2. Tabellen droppen
DROP TABLE IF EXISTS contact_plans;
DROP TABLE IF EXISTS lead_personality_profiles;

-- 3. Spalte entfernen
ALTER TABLE contacts DROP COLUMN IF EXISTS decision_state;

-- 4. ENUMs droppen
DROP TYPE IF EXISTS contact_plan_type;
DROP TYPE IF EXISTS disc_style;
DROP TYPE IF EXISTS decision_state;
```

---

## 5️⃣ Nächste Schritte nach Deployment

1. **App neu starten** um die neuen Types zu laden
2. **NextStepWidget testen** - auf einem Lead die "Nächster Schritt" Funktion nutzen
3. **Daily Flow prüfen** - sollte jetzt Contact Plans anzeigen

---

## 📊 Monitoring

Nach dem Deployment kannst du diese Queries nutzen um das System zu monitoren:

```sql
-- Leads ohne Kontaktplan (sollten repariert werden)
SELECT * FROM get_leads_without_plan('DEIN-WORKSPACE-ID', 50);

-- Reaktivierungs-Kandidaten
SELECT * FROM get_reactivation_candidates('DEIN-WORKSPACE-ID', 30, 50);

-- Statistiken
SELECT * FROM view_contact_plan_stats;

-- DISG-Verteilung
SELECT dominant_style, COUNT(*) 
FROM lead_personality_profiles 
GROUP BY dominant_style;
```

---

**Bei Fragen:** Prüfe die Supabase Logs unter **Database → Logs**.

