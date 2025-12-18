# 🔧 Migration Fix: tenant_id Problem

## ❌ **PROBLEM**

Die RLS Policies versuchen auf `leads.tenant_id` zuzugreifen, aber diese Spalte existiert nicht in deiner `leads` Tabelle.

**Fehler:**
```
ERROR: 42703: column "tenant_id" does not exist
```

---

## ✅ **LÖSUNG**

Ich habe die Migration angepasst, sodass sie:

1. **Prüft, ob `tenant_id` in `leads` existiert**
2. **Falls JA:** Erstellt tenant-basierte RLS Policies
3. **Falls NEIN:** Erstellt Policies, die Zugriff erlauben (kann später angepasst werden)

---

## 🚀 **AUSFÜHRUNG**

### **Option 1: SQL direkt in Supabase**

1. Öffne Supabase Dashboard → SQL Editor
2. Kopiere den **korrigierten** Inhalt von `backend/alembic/versions/001_events_ai_domain.sql`
3. Führe aus

### **Option 2: tenant_id zur leads Tabelle hinzufügen (Empfohlen)**

Falls du Multi-Tenancy brauchst, füge `tenant_id` zur `leads` Tabelle hinzu:

```sql
-- Prüfe ob Spalte existiert, dann füge hinzu
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'leads' 
        AND column_name = 'tenant_id'
    ) THEN
        ALTER TABLE public.leads
            ADD COLUMN tenant_id uuid;
        
        -- Index für Performance
        CREATE INDEX IF NOT EXISTS idx_leads_tenant_id 
            ON public.leads(tenant_id);
    END IF;
END $$;
```

**Dann** führe die Migration erneut aus.

---

## 📝 **Was wurde geändert?**

- ✅ RLS Policies prüfen jetzt, ob `tenant_id` existiert
- ✅ Fallback: Policies erlauben Zugriff, wenn `tenant_id` fehlt
- ✅ Migration funktioniert jetzt auch ohne `tenant_id`

---

**Die Migration sollte jetzt funktionieren!** 🚀

