# ✅ Migration-Fix - Foreign Keys entfernt

## Problem gelöst! ✅

Die Migration hat versucht, Foreign Keys auf Tabellen zu erstellen, die noch nicht existieren (`deals`, `contacts`, `leads`).

**Lösung:** Alle `REFERENCES` Constraints wurden entfernt. Die Tabellen werden jetzt ohne Foreign Keys erstellt.

## Was wurde geändert?

- ✅ `commissions.deal_id` - Kein Foreign Key mehr
- ✅ `commissions.contact_id` - Kein Foreign Key mehr  
- ✅ `closing_insights.deal_id` - Kein Foreign Key mehr
- ✅ `closing_insights.contact_id` - Kein Foreign Key mehr
- ✅ `cold_call_sessions.contact_id` - Kein Foreign Key mehr
- ✅ `cold_call_sessions.lead_id` - Kein Foreign Key mehr

## Jetzt Migration ausführen:

1. **Gehe zu Supabase Dashboard → SQL Editor**
2. **Kopiere den Inhalt von:** `supabase/migrations/20250115_commission_tracker_and_features.sql`
3. **Führe aus** ✅

Die Migration sollte jetzt ohne Fehler laufen!

## Foreign Keys später hinzufügen (Optional)

Wenn die Tabellen `deals`, `contacts` und `leads` später existieren, kannst du die Foreign Keys manuell hinzufügen:

```sql
-- Beispiel für commissions Tabelle
ALTER TABLE public.commissions
ADD CONSTRAINT fk_commissions_deal 
FOREIGN KEY (deal_id) REFERENCES public.deals(id) ON DELETE SET NULL;

ALTER TABLE public.commissions
ADD CONSTRAINT fk_commissions_contact 
FOREIGN KEY (contact_id) REFERENCES public.contacts(id) ON DELETE SET NULL;
```

**Aber das ist optional!** Die Tabellen funktionieren auch ohne Foreign Keys.

