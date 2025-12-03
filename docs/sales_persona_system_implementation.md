# Sales Persona System - Implementation

## Überblick

Das **Sales Persona System** ermöglicht es jedem User, seinen bevorzugten **Sales-Modus** zu wählen, der bestimmt, wie die KI für ihn spricht und priorisiert:

- **Speed**: Kurz, direkt, max Output. Fokus auf Tempo und Aktivität.
- **Balanced**: Standard. Ausgewogene Mischung aus Effizienz und Beziehung.
- **Relationship**: Wärmer, mehr Kontext. Fokus auf Beziehungsebene und Qualität.

## Was wurde implementiert?

### 1. Supabase Schema (`backend/app/db/schema_user_personas.sql`)

Neue Tabelle: `sales_agent_personas`

**Felder:**
- `user_id` (uuid) - Primary Key, Referenz auf `auth.users`
- `persona_key` (text) - "speed" | "balanced" | "relationship"
- `notes` (text) - Optionale Notizen
- `created_at` (timestamptz)
- `updated_at` (timestamptz)

**Constraint:** `persona_key` muss einer der drei Werte sein

**Nächster Schritt:** SQL in Supabase SQL-Editor ausführen!

### 2. Frontend Service (`salesflow-ai/src/services/salesPersonaService.ts`)

**Funktionen:**
- `getCurrentUserPersona()` - Holt Persona des eingeloggten Users (Fallback: "balanced")
- `updateCurrentUserPersona(persona, notes?)` - Setzt/aktualisiert Persona (Upsert)

**Type:** `PersonaKey = "speed" | "balanced" | "relationship"`

### 3. Frontend Hook (`salesflow-ai/src/hooks/useSalesPersona.ts`)

**API:**

```typescript
const { loading, error, persona, setPersona } = useSalesPersona();

// persona: PersonaKey ("speed" | "balanced" | "relationship")
// setPersona: (p: PersonaKey) => Promise<void>
```

**Verhalten:**
- Lädt Persona beim Mount
- Fallback immer auf "balanced" bei Fehler
- Error wird nicht geworfen, nur geloggt + State gesetzt

### 4. Einstellungs-Page (`salesflow-ai/src/pages/SalesAiSettingsPage.tsx`)

**UI-Features:**
- ✅ 3 große Karten für Speed / Balanced / Relationship
- ✅ Icons: Zap (Speed), Scale (Balanced), Heart (Relationship)
- ✅ Aktiver Modus wird hervorgehoben (grüner Border + Badge)
- ✅ Click → Persona wird sofort gespeichert
- ✅ Erklärung, wie Persona wirkt (3 Punkte)
- ✅ Dark Theme, mobile-first

**Route:** `/settings/ai`

### 5. Objection Brain Integration

#### Backend (`backend/app/routers/objection_brain.py`)

**Erweitert:**
- `ObjectionGenerateRequest` um `persona_key` (Optional)
- System Prompt um Persona-Instruktionen:
  - **Speed**: "Halte Antworten besonders kurz (1-2 Sätze)"
  - **Relationship**: "Etwas mehr Wärme und Kontext"
  - **Balanced**: "Mittelweg zwischen Effizienz und Beziehung"

#### Frontend

**Service (`objectionBrainService.ts`):**
```typescript
generateObjectionBrainResult(input, personaKey?) // persona_key im body
```

**Hook (`useObjectionBrain.ts`):**
```typescript
run(input, personaKey?) // personaKey an Service weitergeben
```

**Page (`ObjectionBrainPage.tsx`):**
```typescript
const { persona } = useSalesPersona();
run({ objection, vertical, channel, context }, persona);
```

### 6. Next Best Actions Integration

#### Backend (`backend/app/routers/next_best_actions.py`)

**Erweitert:**
- `NextBestActionsRequest` um `persona_key` (Optional)
- System Prompt um Persona-Instruktionen:
  - **Speed**: "Bevorzuge höhere Aktivität, Tempo, Overdue-Tasks"
  - **Relationship**: "Bevorzuge warme Leads, hohe Deal-Wahrscheinlichkeit, Qualität"
  - **Balanced**: "Mischung aus Dringlichkeit und Potenzial"

#### Frontend

**Service (`nextBestActionsService.ts`):**
```typescript
fetchNextBestActions(tasks, userId?, personaKey?) // persona_key im body
```

**Hook (`useNextBestActions.ts`):**
```typescript
const { persona } = useSalesPersona();
const nbActions = await fetchNextBestActions(taskInputs, currentUserId, persona);
```

### 7. Routing & Navigation

**Route registriert:** `/settings/ai`

**Sidebar-Einträge:**
- `AppShell.jsx`: "EINSTELLUNGEN" Sektion → "KI-Einstellungen" (Sparkles Icon)
- `AppShell.tsx`: "EINSTELLUNGEN" Kategorie → "KI-Einstellungen" (Settings Icon)

## Technische Details

### Persona-Logik

**Speed-Modus:**
- **Objection Brain**: Kürzere Antworten (1-2 Sätze), direkter Ton
- **Next Best Actions**: Höhere Scores für überfällige Tasks, mehr Fokus auf Aktivität

**Balanced-Modus:**
- **Objection Brain**: Standard (max 3 Sätze), ausgewogen
- **Next Best Actions**: Gleichgewichtige Bewertung aller Faktoren

**Relationship-Modus:**
- **Objection Brain**: Etwas länger, wärmer, empathischer Ton
- **Next Best Actions**: Höhere Scores für warme Leads und High-Value-Deals

### Fallback-Strategie

**Überall:**
- Wenn Persona nicht geladen werden kann → "balanced"
- Wenn User nicht eingeloggt → "balanced"
- Wenn DB-Fehler → "balanced" (mit Console-Warning)

**Kein Silent Fail:**
- Fehler werden in Console geloggt
- Error-State wird im Hook gesetzt
- UI zeigt Fehler-Banner an

### Performance

**Lazy Loading:**
- Persona wird nur geladen, wenn Hook verwendet wird
- Kein globaler Context (vermeidet unnötige Re-Renders)

**Caching:**
- Persona wird in Hook-State gecached
- Neu laden nur bei Änderung oder Page-Reload

## Testing

### 1. Supabase Setup (WICHTIG!)

```bash
# SQL ausführen in Supabase SQL-Editor:
cat backend/app/db/schema_user_personas.sql
```

### 2. Frontend testen

```bash
# Frontend starten
cd salesflow-ai
npm run dev

# Öffnen:
# http://localhost:5173/settings/ai
```

**Test-Szenarien:**

1. **Persona wählen:**
   - Öffne `/settings/ai`
   - Klicke auf "Speed-Modus"
   - Verifiziere: Grüner Border + "✓ Aktiv" Badge

2. **Objection Brain mit Persona:**
   - Öffne `/objections`
   - Gib Einwand ein: "Das ist zu teuer"
   - Verifiziere:
     - Speed: Sehr kurze Antworten (1-2 Sätze)
     - Relationship: Etwas länger, wärmer

3. **Next Best Actions mit Persona:**
   - Erstelle einige Tasks in Supabase
   - Setze Persona auf "Speed"
   - Öffne `/next-best-actions`
   - Verifiziere: Überfällige Tasks haben höhere Scores
   - Wechsle auf "Relationship"
   - Neu berechnen
   - Verifiziere: Warme Leads/High-Value haben höhere Scores

### 3. Backend testen

```bash
# Backend starten
cd backend
python -m uvicorn app.main:app --reload --port 8000

# API Docs öffnen
# http://localhost:8000/docs
```

**Test-Payloads:**

**Objection Brain mit Persona:**
```json
{
  "objection": "Das ist zu teuer",
  "vertical": "network",
  "channel": "whatsapp",
  "persona_key": "speed"
}
```

**Next Best Actions mit Persona:**
```json
{
  "tasks": [
    {
      "id": "test-1",
      "task_type": "follow_up",
      "status": "open",
      "due_at": "2025-11-28T10:00:00Z",
      "lead_name": "Max",
      "lead_status": "warm"
    }
  ],
  "persona_key": "relationship"
}
```

## Dateien

### Neu erstellt

- ✅ `backend/app/db/schema_user_personas.sql` (67 Zeilen)
- ✅ `salesflow-ai/src/services/salesPersonaService.ts` (104 Zeilen)
- ✅ `salesflow-ai/src/hooks/useSalesPersona.ts` (76 Zeilen)
- ✅ `salesflow-ai/src/pages/SalesAiSettingsPage.tsx` (198 Zeilen)
- ✅ `docs/sales_persona_system_implementation.md` (diese Datei)

### Geändert

**Backend:**
- ✅ `backend/app/routers/objection_brain.py` (+30 Zeilen Persona-Logik)
- ✅ `backend/app/routers/next_best_actions.py` (+30 Zeilen Persona-Logik)

**Frontend:**
- ✅ `salesflow-ai/src/services/objectionBrainService.ts` (+2 Parameter)
- ✅ `salesflow-ai/src/services/nextBestActionsService.ts` (+2 Parameter)
- ✅ `salesflow-ai/src/hooks/useObjectionBrain.ts` (+2 Parameter)
- ✅ `salesflow-ai/src/hooks/useNextBestActions.ts` (+useSalesPersona Import)
- ✅ `salesflow-ai/src/pages/ObjectionBrainPage.tsx` (+useSalesPersona Nutzung)
- ✅ `salesflow-ai/src/App.jsx` (Route hinzugefügt)
- ✅ `salesflow-ai/src/layout/AppShell.jsx` + `.tsx` (Navigation)

## Erweiterungsideen

### Kurzfristig

1. **Playbook-Suggestor Integration:**
   - useObjectionPlaySuggestion erweitern
   - Persona in Template-Vorschläge einfließen lassen

2. **Chat-Integration:**
   - ChatPage erweitern
   - System Prompt dynamisch anpassen

### Langfristig

1. **Lern-Algorithmus:**
   - Tracken, welche Antworten der User tatsächlich nutzt
   - Persona automatisch anpassen ("Du nutzt oft kurze Antworten → Speed empfohlen")

2. **Team-Personas:**
   - Manager kann Team-Default setzen
   - User können individuell davon abweichen

3. **Erweiterte Modi:**
   - "Consultative" (noch mehr Beziehung, für Enterprise Sales)
   - "Hunter" (aggressiver als Speed, für Cold Outreach)

## FAQ

**Q: Was passiert, wenn ich die Persona ändere?**
A: Alle zukünftigen KI-Calls (Objection Brain, Next Best Actions, etc.) nutzen die neue Persona. Bereits generierte Inhalte ändern sich nicht.

**Q: Kann ich die Persona temporär überschreiben?**
A: Aktuell nicht. Die Persona ist User-weit und gilt für alle Features.

**Q: Was ist der Standard, wenn ich nichts wähle?**
A: "Balanced" ist der Default und wird immer verwendet, wenn keine Persona gesetzt ist.

**Q: Funktioniert es auch ohne Supabase-Tabelle?**
A: Ja, aber die Persona wird dann nicht gespeichert. Hook gibt immer "balanced" zurück.

**Q: Beeinflusst die Persona auch Follow-up-Templates?**
A: Aktuell nicht direkt. Follow-up-Templates nutzen DB-Overrides oder Standard-Config. Die Persona könnte in Zukunft beim Template-Refinement eingebaut werden.

## Abschluss

Das Sales Persona System ist vollständig implementiert und einsatzbereit! 🎭

- ✅ User kann seinen Verkaufsstil wählen
- ✅ KI passt Antworten und Priorisierung an
- ✅ Fallback auf "balanced" immer gewährleistet
- ✅ Keine Breaking Changes
- ✅ Dark Theme, mobile-first
- ✅ Keine Linter-Fehler

**Ready to test:**
```bash
# 1. Supabase SQL ausführen
# (schema_user_personas.sql in SQL-Editor)

# 2. Backend starten
cd backend && python -m uvicorn app.main:app --reload --port 8000

# 3. Frontend öffnen
# http://localhost:5173/settings/ai
```

