# Gemini Scripts Import - Anleitung

## Übersicht

Dieses Script importiert 50 Scripts von Gemini in die Supabase `mlm_scripts` Tabelle.

## Voraussetzungen

1. **Supabase Service Role Key**
   - Gehe zu: https://ydnlxqjblvtoemqbjcai.supabase.co/project/default/settings/api
   - Kopiere den `service_role` Key (NICHT den `anon` Key!)

2. **Python Dependencies**
   ```bash
   pip install supabase
   ```

3. **JSON-Datei vorbereiten**
   - Öffne `backend/data/scripts_gemini_50.json`
   - Füge die 50 Scripts von Gemini ein (siehe Beispiel-Struktur)

## JSON-Struktur

Jedes Script sollte folgende Struktur haben:

```json
{
  "id": "script_001",
  "title": "Script Titel",
  "content": "Der Script-Text mit [Variablen]",
  "category": "opener|followup|closing|objection|general",
  "industry": ["network_marketing"],
  "tags": ["tag1", "tag2"],
  "tone": "freundlich|professionell|persönlich",
  "variables": {
    "Variable1": "string",
    "Variable2": "string"
  }
}
```

**Kategorien:**
- `opener` - Erste Kontaktaufnahme
- `followup` - Nachfass-Nachrichten
- `closing` - Abschluss-Scripts
- `objection` - Einwandbehandlung
- `general` - Allgemeine Scripts

## Verwendung

### 1. Dry-Run (nur Validierung)

```bash
cd backend
python scripts/import_gemini_scripts.py --dry-run
```

Prüft die JSON-Datei auf Fehler, importiert aber nichts.

### 2. Echter Import

```bash
# Mit Environment Variable (empfohlen)
export SUPABASE_SERVICE_ROLE_KEY=dein_service_role_key
python scripts/import_gemini_scripts.py

# Oder direkt im Script setzen (nur für Tests)
# Bearbeite backend/scripts/import_gemini_scripts.py
# Setze: SUPABASE_KEY = "dein_key_hier"
```

### 3. Mit alternativer JSON-Datei

```bash
python scripts/import_gemini_scripts.py --file data/meine_scripts.json
```

## Was passiert beim Import?

1. ✅ **Validierung**: Prüft alle Scripts auf korrekte Struktur
2. 🔍 **Duplikat-Check**: Überspringt bereits vorhandene Scripts (basierend auf `script_id`)
3. 📥 **Import**: Fügt neue Scripts in `mlm_scripts` Tabelle ein
4. 📊 **Zusammenfassung**: Zeigt Anzahl importierter/übersprungener Scripts

## Tabellenstruktur

Die Scripts werden in folgende Felder importiert:

- `script_id` - Eindeutige ID (aus JSON `id`)
- `title` - Script-Titel
- `content` - Script-Text
- `category` - Kategorie (opener, followup, etc.)
- `company` - Erste Industry aus JSON oder 'GENERAL'
- `tags` - Array von Tags
- `tone` - Ton (freundlich, professionell, etc.)
- `variables` - JSON-Objekt mit Variablen
- `copied_count` - Startet bei 0
- `is_active` - Wird auf `true` gesetzt

## Fehlerbehebung

### "SUPABASE_SERVICE_ROLE_KEY nicht gesetzt"
- Setze die Environment Variable: `export SUPABASE_SERVICE_ROLE_KEY=dein_key`
- Oder bearbeite das Script direkt (nur für Tests)

### "JSON-Parse-Fehler"
- Prüfe die JSON-Syntax (z.B. mit https://jsonlint.com)
- Stelle sicher, dass alle Strings in Anführungszeichen sind

### "Fehlendes Feld: X"
- Stelle sicher, dass jedes Script die Pflichtfelder hat: `id`, `title`, `content`, `category`

### "Ungültige Kategorie"
- Erlaubte Kategorien: `opener`, `followup`, `closing`, `objection`, `general`

## Beispiel-Output

```
╔════════════════════════════════════════════════════════════════════════════╗
║  🚀 GEMINI SCRIPTS IMPORT                                    ║
╚════════════════════════════════════════════════════════════════════════════╝

📂 Datei: backend/data/scripts_gemini_50.json
🔧 Modus: IMPORT

📚 Gefunden: 50 Scripts

🔍 Validiere Scripts...
  ✅ Gültig: 50
  ❌ Ungültig: 0

🔌 Verbinde mit Supabase...
  ✅ Verbunden

📥 Importiere Scripts...

  ✅ #1: Cold Outreach Opener - Value First
  ✅ #2: Follow-up nach Erstkontakt
  ...
  ✅ #50: Preis-Einwand Behandlung

============================================================
✅ Erfolgreich importiert: 50
⏭️  Übersprungen: 0
❌ Fehler: 0
============================================================

🎉 Import abgeschlossen!
```

