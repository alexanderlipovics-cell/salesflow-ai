# Next Best Actions - Implementation

## Überblick

Das **Next Best Actions** Modul ist ein KI-gesteuertes Priorisierungssystem, das alle offenen Tasks (Follow-ups, Hunter, Field Ops) intelligent bewertet und sortiert. Die KI analysiert Dringlichkeit, Potenzial und Momentum, um die 5-15 wichtigsten Aufgaben zu identifizieren.

## Was wurde implementiert?

### 1. Backend: FastAPI Router (`backend/app/routers/next_best_actions.py`)

**Endpoint:** `POST /api/next-best-actions/suggest`

**Features:**
- ✅ Empfängt Liste von Tasks als JSON
- ✅ Ruft OpenAI GPT-4 auf (falls API Key vorhanden)
- ✅ Fallback auf intelligente Demo-Priorisierung (ohne API Key)
- ✅ Gibt priorisierte Liste mit Score + Begründung zurück

**KI-Prompt-Strategie:**

```python
System Prompt:
- Du bist erfahrener Vertriebsleiter
- Bewerte Tasks nach Score 0-100
- Score = Dringlichkeit + Potenzial + Momentum
- Kurze, konkrete Begründungen (1-2 Sätze)
- Optional: Empfohlene Zeitspanne

User Prompt:
- Kompakte Task-Liste als JSON
- Max 30 Tasks an KI senden (Performance)
```

**Demo-Modus (ohne OpenAI Key):**
- Berechnet Score basierend auf:
  - Überfällige Tasks: +5 Punkte pro Tag (max +30)
  - Vertical != generic: +5 Punkte
  - Lead Status warm/hot: +10 Punkte
  - Potential Value > 1000: +15 Punkte

**Response-Format:**

```json
{
  "actions": [
    {
      "task_id": "uuid",
      "score": 87,
      "label": "Warmes Follow-up mit hohem Potenzial",
      "reason": "Der Lead ist warm, der Termin liegt kurz zurück...",
      "recommended_timeframe": "heute"
    }
  ]
}
```

### 2. Backend: Router-Registration (`backend/app/main.py`)

```python
from app.routers import next_best_actions
app.include_router(next_best_actions.router, prefix="/api/next-best-actions", tags=["Next Best Actions"])
```

### 3. Frontend: Service (`salesflow-ai/src/services/nextBestActionsService.ts`)

**Funktion:** `fetchNextBestActions(tasks, userId?)`

- Sendet Tasks an Backend-Endpoint
- Parst Response
- Error Handling mit aussagekräftigen Meldungen

### 4. Frontend: Hook (`salesflow-ai/src/hooks/useNextBestActions.ts`)

**Workflow:**

1. **Load Tasks:**
   - Holt alle offenen Tasks aus Supabase (`lead_tasks`)
   - Joined mit `leads` für Kontext (name, vertical, status)
   - Filter: nur Tasks mit Lead-Daten

2. **Build Input:**
   - Konvertiert zu `NextBestTaskInput[]`
   - Vertical-Mapping: "network", "real_estate", "finance", "generic"

3. **Call KI:**
   - Ruft `fetchNextBestActions()` auf
   - Sendet max 30 Tasks (Frontend-seitig keine Limitierung)

4. **Enrich & Sort:**
   - Merged KI-Response mit Task-Kontext
   - Sortiert nach Score (höchster zuerst)
   - Gibt `NextBestActionWithContext[]` zurück

**API:**

```typescript
const { loading, error, actions, refetch } = useNextBestActions();

// actions: NextBestActionWithContext[] (mit lead_id, lead_name, task_type, due_at, vertical)
```

### 5. Frontend: Page (`salesflow-ai/src/pages/NextBestActionsPage.tsx`)

**UI-Features:**

- ✅ Header mit "Nächste beste Aktionen" Titel
- ✅ "Neu berechnen" Button (refetch)
- ✅ Info-Banner: KI-Priorisierung erklärt
- ✅ Loading State: "KI bewertet gerade deine offenen Tasks …"
- ✅ Error State: Roter Banner mit Fehlermeldung
- ✅ Empty State: "Aktuell keine offenen Aufgaben" mit Icon
- ✅ Actions List: Karten mit Ranking, Score, Begründung

**Action Card Layout:**

```
┌────────────────────────────────────────────────┐
│ [#1] [FOLLOW-UP] Lead Name           Score: 87 │
│      Fällig: 29.11.2025 14:30                  │
│      Empfehlung: heute                         │
│                                                │
│      Label: Warmes Follow-up mit hohem...     │
│      Reason: Der Lead ist warm, der Termin... │
│                                                │
│      [Aktion öffnen →]                        │
└────────────────────────────────────────────────┘
```

**Color Coding:**
- Score ≥ 80: Rot (highest priority)
- Score 60-79: Amber (medium priority)
- Score < 60: Emerald (normal priority)

**Navigation:**
- Follow-up Tasks → `/follow-ups`
- Hunter Tasks → `/hunter`
- Andere → `/daily-command`

### 6. Routing & Navigation

**Route registriert:** `/next-best-actions`

**Sidebar-Einträge:**
- `AppShell.jsx`: "HEUTE" Sektion → "Nächste beste Aktionen" (Target Icon)
- `AppShell.tsx`: "OPERATIONS" Kategorie → "Nächste beste Aktionen" (Target Icon)

## Technische Details

### KI-Bewertungskriterien

**Dringlichkeit (30-40 Punkte):**
- Überfällig: Hoher Boost
- Heute fällig: Mittlerer Boost
- Demnächst: Niedriger Boost

**Potenzial (20-30 Punkte):**
- Hohes Ticket (potential_value)
- Warmer/heißer Lead (lead_status)
- Wichtiger Vertical

**Momentum (20-30 Punkte):**
- Follow-up-Stufe (fu_3 = höher als fu_1)
- Letzter Kontakt (je länger zurück, desto wichtiger)
- Task-Typ (Hunter vs Follow-up)

### Performance-Optimierungen

**Frontend:**
- Lädt nur offene Tasks (`status = 'open'`)
- Sortiert Tasks vor KI-Call nach `due_at`
- Hook cached Results bis zu refetch()

**Backend:**
- Limitiert auf max 30 Tasks an OpenAI (Token-Limit)
- Limitiert Response auf max 15 Actions
- Demo-Modus ist instant (kein API-Call)

### Error Handling

**Backend:**
- OpenAI API Fehler → Fallback auf Demo-Modus
- JSON Parse Fehler → HTTPException 500
- Validierung: Nur Tasks aus Input werden zurückgegeben

**Frontend:**
- Supabase Query Fehler → Error anzeigen
- API Fehler → Error anzeigen
- Empty State bei 0 Tasks

## Testing

### 1. Backend testen

```bash
# Backend starten
cd backend
python -m uvicorn app.main:app --reload --port 8000

# API Docs öffnen
# http://localhost:8000/docs
# → POST /api/next-best-actions/suggest testen
```

**Test-Payload:**

```json
{
  "user_id": null,
  "tasks": [
    {
      "id": "test-1",
      "task_type": "follow_up",
      "status": "open",
      "due_at": "2025-11-28T10:00:00Z",
      "vertical": "network",
      "lead_name": "Max Mustermann",
      "lead_status": "warm",
      "potential_value": 5000,
      "notes": "Follow-up 2 - Mehrwert"
    }
  ]
}
```

### 2. Frontend testen

```bash
# Frontend starten
cd salesflow-ai
npm run dev

# Öffnen:
# http://localhost:5173/next-best-actions
```

**Test-Szenarien:**

1. **Mit offenen Tasks:**
   - Erstelle einige Follow-up Tasks in Supabase
   - Öffne `/next-best-actions`
   - Verifiziere: Tasks werden priorisiert angezeigt

2. **Ohne Tasks:**
   - Lösche/markiere alle Tasks als done
   - Öffne `/next-best-actions`
   - Verifiziere: Empty State wird angezeigt

3. **Refetch:**
   - Klicke "Neu berechnen"
   - Verifiziere: Loading State → neue Priorisierung

4. **Navigation:**
   - Klicke "Aktion öffnen" bei Follow-up Task
   - Verifiziere: Navigiert zu `/follow-ups`

### 3. Demo-Modus vs Production

**Demo-Modus aktivieren:**
```bash
# OPENAI_API_KEY nicht setzen oder leer lassen
unset OPENAI_API_KEY
```

**Production-Modus:**
```bash
# .env in backend/ erstellen
OPENAI_API_KEY=sk-...
```

## Dateien

### Neu erstellt

- ✅ `backend/app/routers/next_best_actions.py` (227 Zeilen)
- ✅ `salesflow-ai/src/services/nextBestActionsService.ts` (68 Zeilen)
- ✅ `salesflow-ai/src/hooks/useNextBestActions.ts` (152 Zeilen)
- ✅ `salesflow-ai/src/pages/NextBestActionsPage.tsx` (281 Zeilen)
- ✅ `docs/next_best_actions_implementation.md` (diese Datei)

### Geändert

- ✅ `backend/app/main.py` (Import + Router-Registration)
- ✅ `salesflow-ai/src/App.jsx` (Route hinzugefügt)
- ✅ `salesflow-ai/src/layout/AppShell.jsx` (Menü-Eintrag)
- ✅ `salesflow-ai/src/layout/AppShell.tsx` (Menü-Eintrag)

## Erweiterungsideen

### Kurzfristig

1. **Daily Command Integration:**
   - Top 3 Actions als Widget auf Dashboard
   - "Alle ansehen" Button → `/next-best-actions`

2. **Filter & Sorting:**
   - Filter nach Task-Typ (Follow-up, Hunter, etc.)
   - Sortierung: Score, Due Date, Lead Name

3. **Task Actions:**
   - "Erledigt" Button direkt auf Action Card
   - "Später" Button (Task verschieben)

### Langfristig

1. **Historische Analytics:**
   - "Welche priorisierten Tasks wurden erledigt?"
   - "Conversion Rate nach Priorität"

2. **Personalisierung:**
   - User-spezifische Gewichtung (Dringlichkeit vs Potenzial)
   - "Lerne aus meinem Verhalten"

3. **Team-View:**
   - Manager sieht priorisierte Tasks für alle Team-Mitglieder
   - Zuweisung von High-Priority Tasks

## FAQ

**Q: Wie oft wird die KI-Priorisierung neu berechnet?**
A: Bei jedem Aufruf von `/next-best-actions` oder bei Klick auf "Neu berechnen".

**Q: Kann ich die Priorisierung manuell anpassen?**
A: Aktuell nicht. Die KI entscheidet basierend auf den Daten.

**Q: Was passiert, wenn OpenAI API down ist?**
A: Fallback auf Demo-Modus (intelligente Score-Berechnung).

**Q: Wie viele Tasks werden maximal angezeigt?**
A: Max 15 Actions (Backend-seitig limitiert für fokussierte To-do-Liste).

**Q: Werden Tasks automatisch als "erledigt" markiert?**
A: Nein, das muss manuell auf der Follow-ups/Hunter Page gemacht werden.

## Abschluss

Das Next Best Actions Modul ist vollständig implementiert und einsatzbereit! 🎯

- ✅ Backend mit OpenAI GPT-4 Integration
- ✅ Demo-Modus für Testing ohne API Key
- ✅ Frontend Hook lädt Tasks automatisch
- ✅ UI zeigt priorisierte Liste mit Score + Begründung
- ✅ Navigation integriert
- ✅ Keine Linter-Fehler
- ✅ Dark Theme, mobile-first

**Ready to test:**
```bash
# 1. Backend starten
cd backend && python -m uvicorn app.main:app --reload --port 8000

# 2. Frontend öffnen
# http://localhost:5173/next-best-actions
```

