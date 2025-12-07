# 🔧 Alembic Setup & Migration Ausführung

## ✅ **ALEMBIC KONFIGURIERT!**

Ich habe die fehlenden Alembic-Dateien erstellt:
- ✅ `backend/alembic.ini` - Alembic Konfiguration
- ✅ `backend/alembic/env.py` - Environment Setup
- ✅ `backend/alembic/script.py.mako` - Migration Template

---

## 🚀 **MIGRATION AUSFÜHREN**

### **1. Environment Variable setzen**

Falls du Supabase nutzt, setze in deiner `.env`:

```bash
# Option 1: Direkte DATABASE_URL
DATABASE_URL=postgresql://postgres.<project_ref>:<password>@db.<project_ref>.supabase.co:5432/postgres

# Option 2: Supabase Settings (env.py baut URL automatisch)
SUPABASE_URL=https://<project_ref>.supabase.co
SUPABASE_DB_PASSWORD=<dein_db_password>
```

### **2. Migration ausführen**

```bash
cd backend

# Migration ausführen
alembic upgrade head
```

---

## ⚠️ **FALLS FEHLER AUFTRETEN**

### **Fehler: "No module named 'app.db.base'"**

Das bedeutet, dass Python das `app` Modul nicht findet. Lösungen:

**Option A: Von Projekt-Root ausführen**
```bash
# Von salesflow-ai/ aus (nicht backend/)
cd backend
python -m alembic upgrade head
```

**Option B: PYTHONPATH setzen**
```bash
cd backend
set PYTHONPATH=%CD%
alembic upgrade head
```

**Option C: Direkt SQL ausführen (Schnellste Lösung)**
```bash
# Kopiere Inhalt von backend/alembic/versions/001_events_ai_domain.sql
# Führe in Supabase SQL Editor aus
```

---

## 📋 **MIGRATION PRÜFEN**

```bash
# Aktuelle Migration anzeigen
alembic current

# Migration History
alembic history

# Nächste Migration anzeigen
alembic show head
```

---

## 🔄 **ROLLBACK (Falls nötig)**

```bash
# Eine Migration zurück
alembic downgrade -1

# Zurück zu bestimmter Revision
alembic downgrade 20251206_223629
```

---

## ✅ **ERFOLG PRÜFEN**

Nach erfolgreicher Migration sollten diese Tabellen existieren:

```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN (
    'events',
    'ai_prompt_templates',
    'ai_call_logs',
    'ai_token_budgets',
    'lead_review_tasks',
    'channel_identities',
    'conversation_summaries'
);
```

---

**Die Alembic-Konfiguration ist jetzt vollständig!** 🚀

