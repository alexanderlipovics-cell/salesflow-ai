# 🗄️ SalesFlow AI - Migration Guide

## ✅ **MIGRATION ERSTELLT!**

Die Alembic-Migration wurde erstellt: `backend/alembic/versions/20250107_events_ai_domain.py`

---

## 🚀 **MIGRATION AUSFÜHREN**

### **Option 1: Alembic (Empfohlen)**

```bash
cd backend

# Migration ausführen
alembic upgrade head
```

### **Option 2: Direkt SQL (Falls Alembic nicht konfiguriert)**

Falls Alembic nicht funktioniert, kannst du die SQL-Datei direkt ausführen:

```bash
# Via Supabase Dashboard:
# 1. Gehe zu SQL Editor
# 2. Kopiere Inhalt von backend/alembic/versions/001_events_ai_domain.sql
# 3. Führe aus

# Oder via psql:
psql -h <host> -U <user> -d <database> -f backend/alembic/versions/001_events_ai_domain.sql
```

---

## 📋 **WAS WIRD ERSTELLT?**

### **Tabellen:**
1. ✅ `events` - Event Backbone
2. ✅ `ai_prompt_templates` - Prompt Versionierung
3. ✅ `ai_call_logs` - AI Cost Tracking
4. ✅ `ai_token_budgets` - Token Budgets
5. ✅ `lead_review_tasks` - Human Review Queue
6. ✅ `channel_identities` - Omni-Channel Stitching
7. ✅ `conversation_summaries` - Conversation Memory

### **Spalten (leads Tabelle):**
- ✅ `raw_context` (JSONB)
- ✅ `is_confirmed` (Boolean)

### **RLS Policies:**
- ✅ Tenant-Isolation für alle Tabellen

---

## ⚠️ **WICHTIG**

1. **Backup erstellen** vor Migration
2. **RLS Policies** setzen `app.tenant_id` pro Request
3. **Indexes** werden automatisch erstellt

---

## 🔍 **MIGRATION PRÜFEN**

```sql
-- Prüfe ob Tabellen existieren
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

-- Prüfe ob Spalten existieren
SELECT column_name 
FROM information_schema.columns 
WHERE table_name = 'leads' 
AND column_name IN ('raw_context', 'is_confirmed');
```

---

## 🔄 **ROLLBACK (Falls nötig)**

```bash
# Alembic Rollback
alembic downgrade -1
```

---

**Die Migration ist bereit zur Ausführung!** 🚀

