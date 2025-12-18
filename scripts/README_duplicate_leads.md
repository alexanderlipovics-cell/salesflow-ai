# Duplicate Leads Remover

Scripts zum Finden und Löschen doppelter Leads.

## Problem

Doppelte Leads entstehen wenn:
- Leads mehrfach importiert werden
- API-Calls mehrfach ausgeführt werden
- Manuelle Eingaben doppelt erfasst werden

## Lösung

Die Scripts finden Leads mit:
- Gleichem `user_id`
- Gleichem `name` (case-insensitive, trimmed)
- Gleichem `instagram_username` (case-insensitive, trimmed)

**Behält:** Den ältesten Lead (nach `created_at`)
**Löscht:** Alle neueren Duplikate

## Verwendung

### Option 1: SQL Script (Empfohlen für Supabase)

```bash
# 1. Öffne Supabase SQL Editor
# 2. Führe scripts/remove_duplicate_leads.sql aus
# 3. Führe die SELECT-Statements aus um zu sehen was gelöscht wird
# 4. Prüfe die Ergebnisse
# 5. Erstelle Backup (STEP 4)
# 6. Führe DELETE aus (STEP 5) - nur wenn sicher!
```

**Schritte:**
1. **STEP 1**: Zeige alle Duplikate
2. **STEP 2**: Zusammenfassung (wie viele werden gelöscht?)
3. **STEP 3**: Detaillierte Übersicht gruppiert
4. **STEP 4**: Backup erstellen
5. **STEP 5**: DELETE (⚠️ VORSICHT!)
6. **STEP 6**: Verifikation

### Option 2: Python Script

```bash
# Nur anzeigen (Standard)
python scripts/remove_duplicate_leads.py --dry-run

# Mit Backup
python scripts/remove_duplicate_leads.py --dry-run --backup

# Wirklich löschen (VORSICHT!)
python scripts/remove_duplicate_leads.py --execute --backup
```

**Umgebungsvariablen:**
```bash
export SUPABASE_URL="https://your-project.supabase.co"
export SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"
```

## Sicherheit

### ⚠️ WICHTIG:

1. **Backup erstellen** bevor du löschst!
2. **SELECT-Statements prüfen** - sieh dir an was gelöscht wird
3. **Teste zuerst** mit `--dry-run` oder SELECT
4. **Prüfe die Ergebnisse** nach dem Löschen

### Was wird gelöscht?

- Nur Leads die **echte Duplikate** sind (gleicher user_id + name/instagram)
- **Nur die neueren** Duplikate (ältester bleibt)
- Leads ohne Name UND ohne Instagram werden **nicht** berücksichtigt

### Was bleibt erhalten?

- Der **älteste Lead** jeder Duplikat-Gruppe
- Alle Leads die **keine Duplikate** sind
- Leads mit unterschiedlichen Namen/Instagram (auch wenn ähnlich)

## Beispiel

**Vorher:**
```
Lead 1: user_id=123, name="Max Mustermann", created_at="2024-01-01"
Lead 2: user_id=123, name="Max Mustermann", created_at="2024-01-15"  ← Duplikat
Lead 3: user_id=123, name="Max Mustermann", created_at="2024-02-01"  ← Duplikat
```

**Nachher:**
```
Lead 1: user_id=123, name="Max Mustermann", created_at="2024-01-01"  ✅ BEHALTEN
```

## Troubleshooting

### "Keine Duplikate gefunden"
- Prüfe ob Leads wirklich doppelt sind (gleicher Name/Instagram)
- Prüfe ob `user_id` übereinstimmt
- Prüfe ob Name/Instagram nicht leer sind

### "Fehler beim Löschen"
- Prüfe Supabase Permissions (Service Role Key)
- Prüfe ob Leads in anderen Tabellen referenziert werden (Foreign Keys)
- Prüfe RLS (Row Level Security) Policies

### "Backup fehlgeschlagen"
- Erstelle Backup-Tabelle manuell in Supabase Dashboard
- Oder verwende SQL Script STEP 4

## Verwandte Tabellen

Falls Leads in anderen Tabellen referenziert werden, musst du diese auch bereinigen:

- `follow_ups` (lead_id)
- `tasks` (lead_id)
- `deals` (lead_id)
- `activities` (lead_id)
- `crm_notes` (lead_id)

**Empfehlung:** Prüfe Foreign Keys bevor du löschst!

