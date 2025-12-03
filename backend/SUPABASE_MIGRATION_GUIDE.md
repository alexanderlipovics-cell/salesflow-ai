# 🗄️ Supabase Migration Guide - Sales Flow AI

## 📋 ÜBERSICHT

Diese Anleitung führt dich Schritt-für-Schritt durch die komplette Datenbank-Migration.

**Geschätzte Zeit:** 15-20 Minuten  
**Schwierigkeit:** Mittel  
**Voraussetzung:** Supabase Account mit aktivem Projekt

---

## 🎯 MIGRATIONS-REIHENFOLGE (WICHTIG!)

Die SQL-Dateien **MÜSSEN** in dieser Reihenfolge ausgeführt werden:

```
1. schema_objections.sql         (Grundtabellen)
2. schema_message_templates.sql  (Templates)
3. schema_playbooks.sql          (Playbooks)
4. schema_ab_testing.sql         (A/B Tests)
5. sequences_schema.sql          (Sequenzen)
6. revenue_schema.sql            (Revenue Tracking)
7. schema_rls_security.sql       (Security - LETZTE!)
```

**❗ WICHTIG:** RLS Security Schema muss **ZULETZT** ausgeführt werden, nachdem alle Tabellen existieren!

---

## 🚀 SCHRITT-FÜR-SCHRITT ANLEITUNG

### **SCHRITT 1: Supabase SQL Editor öffnen**

1. Gehe zu https://supabase.com
2. Wähle dein Projekt
3. Sidebar: **SQL Editor** klicken
4. **New Query** klicken

---

### **SCHRITT 2: Schema 1 - Objections ausführen**

**Datei:** `backend/db/schema_objections.sql`

1. Öffne die Datei in deinem Editor
2. Kopiere den **kompletten Inhalt**
3. Füge in Supabase SQL Editor ein
4. Klicke **RUN** (oder Ctrl+Enter)
5. Warte auf ✅ **"Success"** Message

**Erwartetes Ergebnis:**
```
✅ Table "objections" created
✅ Table "objection_responses" created
✅ Indexes created
```

---

### **SCHRITT 3: Schema 2 - Message Templates ausführen**

**Datei:** `backend/db/schema_message_templates.sql`

1. **New Query** in Supabase
2. Kopiere Datei-Inhalt
3. Einfügen & **RUN**
4. Warte auf Success

**Erwartetes Ergebnis:**
```
✅ Table "message_templates" created
✅ Table "template_variables" created (optional)
✅ Indexes created
```

---

### **SCHRITT 4: Schema 3 - Playbooks ausführen**

**Datei:** `backend/db/schema_playbooks.sql`

1. **New Query**
2. Kopiere & Einfügen
3. **RUN**

**Erwartetes Ergebnis:**
```
✅ Table "playbooks" created
✅ Table "playbook_steps" created
✅ Table "best_practices" created
✅ Table "playbook_runs" created
✅ Table "playbook_run_steps" created
```

---

### **SCHRITT 5: Schema 4 - A/B Testing ausführen**

**Datei:** `backend/db/schema_ab_testing.sql`

1. **New Query**
2. Kopiere & Einfügen
3. **RUN**

**Erwartetes Ergebnis:**
```
✅ Table "ab_tests" created
✅ Table "ab_test_variants" created
✅ Table "ab_test_events" created
✅ Materialized view "ab_test_results_summary" created
```

---

### **SCHRITT 6: Schema 5 - Sequences ausführen**

**Datei:** `backend/database/sequences_schema.sql`

1. **New Query**
2. Kopiere & Einfügen
3. **RUN**

**Erwartetes Ergebnis:**
```
✅ Table "message_sequences" created
✅ Table "sequence_steps" created
✅ Table "sequence_enrollments" created
```

---

### **SCHRITT 7: Schema 6 - Revenue ausführen**

**Datei:** `backend/database/revenue_schema.sql`

1. **New Query**
2. Kopiere & Einfügen
3. **RUN**

**Erwartetes Ergebnis:**
```
✅ Table "revenue_metrics" created
✅ Table "revenue_goals" created
✅ Revenue tracking functions created
```

---

### **SCHRITT 8: Schema 7 - RLS Security ausführen (WICHTIG!)**

**Datei:** `backend/db/schema_rls_security.sql`

**⚠️ ACHTUNG:** Dies ist das **wichtigste** Schema für Production!

1. **New Query**
2. Kopiere kompletten Inhalt
3. **RUN**

**Erwartetes Ergebnis:**
```
✅ Added owner_id to leads
✅ Added owner_id to message_templates
✅ Added owner_id to playbooks
✅ Added owner_id to objections
✅ RLS enabled for all tables
✅ Policies created
🔒 Security Level: PRODUCTION READY!
```

---

## ✅ SCHRITT 9: Verifizierung

Führe diese Query aus um zu prüfen ob alles funktioniert:

```sql
-- Check if all tables exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;
```

**Erwartete Tabellen:**
- ab_test_events
- ab_test_variants
- ab_tests
- best_practices
- leads
- message_sequences
- message_templates
- objection_responses
- objections
- playbook_run_steps
- playbook_runs
- playbook_steps
- playbooks
- revenue_goals
- revenue_metrics
- sequence_enrollments
- sequence_steps

**Sollte mindestens 17 Tabellen anzeigen!**

---

## 🎉 SCHRITT 10: Migration abgeschlossen!

Wenn alle Schemas erfolgreich gelaufen sind:

✅ Datenbank-Struktur erstellt  
✅ Tabellen existieren  
✅ Indexes für Performance  
✅ RLS Security aktiviert  

---

## 🚨 TROUBLESHOOTING

### Problem: "relation already exists"
**Lösung:** Schema wurde bereits ausgeführt. Überspringen oder alte Tabelle löschen.

### Problem: "permission denied"
**Lösung:** Prüfe ob du als Supabase Admin eingeloggt bist.

### Problem: "foreign key constraint fails"
**Lösung:** Schemas wurden in falscher Reihenfolge ausgeführt. Beginne von vorne.

### Problem: "function does not exist"
**Lösung:** PostgreSQL Extensions fehlen. Führe aus:
```sql
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
```

---

## 📊 NÄCHSTE SCHRITTE

Nach erfolgreicher Migration:

1. ✅ **Daten importieren:** 
   ```bash
   cd backend
   python scripts/master_import.py
   ```

2. ✅ **Backend starten:**
   ```bash
   uvicorn app.main:app --reload --port 8000
   ```

3. ✅ **API testen:**
   - http://localhost:8000/docs
   - Health Check: http://localhost:8000/health

---

## 🔒 SECURITY NOTES

**WICHTIG für Production:**

1. **SERVICE_ROLE Key verwenden:**
   - Backend muss `SUPABASE_SERVICE_KEY` nutzen
   - Nie ANON_KEY für Admin-Operationen!

2. **RLS Policies testen:**
   - Erstelle Test-User in Supabase Auth
   - Prüfe ob Daten-Isolation funktioniert

3. **owner_id setzen:**
   - Backend muss bei jedem INSERT owner_id setzen
   - Beispiel: `owner_id = auth.uid()` in App

---

## 📞 HILFE BENÖTIGT?

Bei Problemen:
1. Prüfe Terminal Output auf Fehler
2. Checke Supabase Logs (Dashboard → Logs)
3. Verifiziere .env Konfiguration
4. Review dieser Guide nochmal

---

**Migration abgeschlossen? Weiter zu:**
→ `backend/README.md` für Backend-Setup
→ `backend/scripts/` für Daten-Import

**Viel Erfolg! 🚀**

