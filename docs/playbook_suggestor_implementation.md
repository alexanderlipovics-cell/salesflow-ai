# Playbook-Suggestor Implementation

## Überblick

Der **Playbook-Suggestor** ist ein neues Feature auf der Einwände-Analytics-Seite, das Managern ermöglicht, KI-gestützte Template-Vorschläge für häufige Einwände zu generieren und als wiederverwendbare Templates zu speichern.

## Was wurde implementiert?

### 1. Supabase Schema (`salesflow-ai/backend/app/db/schema_objection_templates.sql`)

Neue Tabelle: `objection_templates`

**Felder:**
- `id` (uuid) - Primärschlüssel
- `key` (text) - Optional: Eindeutiger Schlüssel
- `title` (text) - Titel des Templates
- `vertical` (text) - Branche (z.B. network, real_estate, finance) oder NULL
- `objection_text` (text) - Der Einwand
- `template_message` (text) - Die wiederverwendbare Standard-Antwort
- `notes` (text) - Interne Notizen, KI-Reasoning
- `source` (text) - Herkunft (z.B. "analytics_play_suggestor", "manual")
- `status` (text) - Status: "draft", "active", "archived"
- `created_at` (timestamptz)
- `updated_at` (timestamptz)

**Nächster Schritt:** SQL in Supabase SQL-Editor ausführen!

### 2. Frontend Service (`salesflow-ai/src/services/objectionTemplatesService.ts`)

Service-Funktionen:
- `createObjectionTemplate()` - Erstellt ein neues Template in Supabase
- `listActiveTemplates()` - Holt alle aktiven Templates (optional nach Vertical gefiltert)

### 3. React Hook (`salesflow-ai/src/hooks/useObjectionPlaySuggestion.ts`)

Custom Hook für den Playbook-Suggestor-Workflow:

**API:**
- `runSuggestion(input)` - Generiert KI-Vorschlag via Objection Brain API
- `saveAsTemplate(opts)` - Speichert Vorschlag als Draft-Template
- `reset()` - Setzt Hook-State zurück

**State:**
- `loading` - KI generiert gerade Vorschlag
- `saving` - Template wird gespeichert
- `error` - Fehler-Nachricht
- `suggestion` - Aktueller KI-Vorschlag

### 4. UI auf ObjectionAnalyticsPage (`salesflow-ai/src/pages/ObjectionAnalyticsPage.tsx`)

**Neue Features:**
- ✅ "KI-Play vorschlagen" Button bei jedem Top-Einwand
- ✅ Playbook-Suggestor Panel (öffnet sich beim Klick)
- ✅ KI generiert Template-Vorschlag basierend auf Einwand
- ✅ Manager kann Titel anpassen
- ✅ "Nachricht kopieren" Button (Clipboard-Integration)
- ✅ "Als Draft speichern" Button (speichert in Supabase)
- ✅ Success/Error Feedback
- ✅ Dark Theme, Mobile-first Design

## Workflow

1. **Manager** öffnet Einwände-Analytics-Seite
2. Sieht **Top-Einwände** der letzten 7/30/90 Tage
3. Klickt bei einem Einwand auf **"KI-Play vorschlagen"**
4. Panel öffnet sich rechts/unten:
   - Einwand ist vorausgefüllt
   - KI generiert automatisch einen Template-Vorschlag
   - Titel ist editierbar
5. Manager hat zwei Optionen:
   - **"Nachricht kopieren"** → Text in Zwischenablage
   - **"Als Draft speichern"** → Template wird in Supabase gespeichert (Status: "draft")
6. Template kann später in einer Template-Bibliothek aktiviert werden

## Technische Details

### Integration mit bestehendem Code

✅ **Kein Breaking Change** - alle Änderungen sind additiv
✅ **Nutzt bestehenden Objection Brain Endpoint** - keine neue LLM-Integration nötig
✅ **Konsistentes Dark Theme** - passt zu bestehendem Design
✅ **Mobile-first** - funktioniert auf allen Geräten

### Error Handling

- Netzwerkfehler beim KI-Call werden abgefangen
- Supabase-Fehler beim Speichern werden angezeigt
- Clipboard-API-Fehler zeigen Fallback-Hinweis

### Performance

- Lazy Loading: Panel wird nur gerendert, wenn ein Einwand ausgewählt ist
- Keine zusätzlichen API-Calls beim Seitenaufruf
- KI-Call nur on-demand (Button-Click)

## Nächste Schritte

### 1. Supabase Setup (WICHTIG!)

```bash
# SQL ausführen in Supabase SQL-Editor:
cat salesflow-ai/backend/app/db/schema_objection_templates.sql
```

### 2. Optional: RLS Policies hinzufügen

Wenn Row Level Security aktiv ist, Policies für `objection_templates` definieren.

### 3. Testen

```bash
# Frontend starten
cd salesflow-ai
npm run dev

# Backend starten (in separatem Terminal)
cd backend
python -m uvicorn app.main:app --reload --port 8000
```

### 4. Feature-Erweiterungen (optional)

Mögliche zukünftige Features:
- Template-Bibliothek Seite (Liste aller gespeicherten Templates)
- Vertical-Filter beim Template-Generieren
- Template-Editing nach dem Speichern
- Template-Aktivierung (Draft → Active)
- Template-Analytics (Wie oft wurde ein Template verwendet?)

## Dateien

Neu erstellt:
- ✅ `salesflow-ai/backend/app/db/schema_objection_templates.sql`
- ✅ `salesflow-ai/src/services/objectionTemplatesService.ts`
- ✅ `salesflow-ai/src/hooks/useObjectionPlaySuggestion.ts`
- ✅ `docs/playbook_suggestor_implementation.md` (diese Datei)

Geändert:
- ✅ `salesflow-ai/src/pages/ObjectionAnalyticsPage.tsx` (erweitert um Playbook-Suggestor)

## Support

Bei Fragen oder Problemen:
1. Prüfe Browser-Console auf Fehler
2. Prüfe Backend-Logs (uvicorn)
3. Prüfe Supabase-Tabelle existiert: `select * from objection_templates limit 1;`
4. Prüfe Objection Brain API funktioniert: `/api/objection-brain/generate`

