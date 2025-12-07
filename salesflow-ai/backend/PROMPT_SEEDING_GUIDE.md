# 📝 SalesFlow AI - Prompt Templates Seeding Guide

## ✅ **PROMPT SEEDING VORBEREITET!**

Ich habe zwei Methoden erstellt, um die initialen Prompt Templates in die DB einzufügen.

---

## 🚀 **METHODE 1: SQL direkt in Supabase (Schnellste)**

### **Schritte:**

1. Öffne Supabase Dashboard → SQL Editor
2. Öffne Datei: `backend/scripts/seed_prompts_sql.sql`
3. Kopiere den gesamten Inhalt
4. Führe in Supabase SQL Editor aus
5. Prüfe Ergebnis: Es sollten 3 Templates erstellt werden

**Vorteil:** Funktioniert sofort, keine Python-Dependencies nötig

---

## 🐍 **METHODE 2: Python Script (Für Automatisierung)**

### **Voraussetzungen:**

```bash
# Environment Variables setzen
DATABASE_URL=postgresql://...
# ODER
SUPABASE_URL=https://<project>.supabase.co
SUPABASE_DB_PASSWORD=<password>
```

### **Ausführung:**

```bash
cd backend
python -m scripts.seed_prompts
```

**Vorteil:** Kann in CI/CD integriert werden, prüft auf Duplikate

---

## 📋 **WELCHE PROMPTS WERDEN ERSTELLT?**

### **1. FOLLOWUP_SHORT_WHATSAPP**
- **Zweck:** Kurze Follow-Up Nachrichten für WhatsApp
- **Max Tokens:** 150
- **Temperature:** 0.7
- **Sprache:** Deutsch

### **2. OBJECTION_PRICE_ANALYSIS**
- **Zweck:** Preiseinwände analysieren und beantworten
- **Max Tokens:** 500
- **Temperature:** 0.6
- **Sprache:** Deutsch

### **3. LEAD_EXTRACTION_GENERIC**
- **Zweck:** Lead-Daten aus unstrukturierten Quellen extrahieren
- **Max Tokens:** 500
- **Temperature:** 0.3 (niedrig für präzise Extraktion)
- **Output:** JSON
- **Sprache:** Deutsch

---

## ✅ **ERFOLG PRÜFEN**

Nach dem Seeding, prüfe in Supabase:

```sql
SELECT 
    scenario_id,
    version,
    is_active,
    created_at
FROM public.ai_prompt_templates
WHERE tenant_id IS NULL
ORDER BY scenario_id, version;
```

Sollte 3 Zeilen zurückgeben.

---

## 🔧 **TENANT-SPEZIFISCHE PROMPTS**

Falls du später tenant-spezifische Prompts brauchst:

```sql
INSERT INTO public.ai_prompt_templates (
    tenant_id,
    scenario_id,
    version,
    is_active,
    system_prompt,
    user_template,
    metadata
) VALUES (
    '<tenant-uuid>'::uuid,
    'FOLLOWUP_SHORT_WHATSAPP',
    1,
    true,
    '...',
    '...',
    '{}'::jsonb
);
```

**Hinweis:** Tenant-spezifische Prompts haben Vorrang vor globalen.

---

## 📝 **PROMPTS ANPASSEN**

Falls du die Prompts später anpassen willst:

1. **Neue Version erstellen:**
   ```sql
   INSERT INTO public.ai_prompt_templates (...)
   VALUES (..., version = 2, ...);
   ```

2. **Alte Version deaktivieren:**
   ```sql
   UPDATE public.ai_prompt_templates
   SET is_active = false
   WHERE scenario_id = 'FOLLOWUP_SHORT_WHATSAPP' AND version = 1;
   ```

---

**Die Prompt Templates sind jetzt bereit zum Seeden!** 🚀📝

