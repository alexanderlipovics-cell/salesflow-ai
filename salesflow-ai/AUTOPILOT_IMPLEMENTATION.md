# 🤖 Autopilot Cockpit - Implementation Summary

## ✅ Was wurde implementiert?

### 🎯 ZIEL 1: Autopilot Cockpit (Web UI)

#### Neue Route & Navigation
- **Route:** `/autopilot`
- **Menü:** Neue Kategorie "AI & AUTOMATION" in der Sidebar
- **Icon:** ✨ Sparkles (Emerald-Grün)

#### Features der Autopilot Page

**1. Globale Autopilot Settings (AutopilotSettingsCard)**
- ✅ Mode-Auswahl mit 4 Optionen:
  - ⏸️ **Off**: Autopilot deaktiviert
  - 💡 **Assist**: KI macht Vorschläge, User entscheidet
  - 👆 **One-Click**: Vorschläge mit einem Klick senden
  - 🤖 **Auto**: Vollautomatisch (V1: noch in Entwicklung)
- ✅ Multi-Channel-Auswahl: Email, WhatsApp, Instagram, LinkedIn, Facebook, Internal
- ✅ Max Auto-Replies Slider (1-100 pro Tag)
- ✅ is_active Toggle
- ✅ Inline-Bearbeitung & Speichern

**2. Message Events Übersicht (MessageEventsTable)**
- ✅ Tabellen-Ansicht aller Events
- ✅ Filter-Tabs: Alle / Pending / Suggested / Approved / Sent / Skipped
- ✅ Relative Zeitangaben ("vor 5 Min")
- ✅ Status-Badges mit Farben
- ✅ Direction-Icons (Inbound/Outbound)
- ✅ Detected Actions als Chips

**3. Autopilot Engine Control (AutopilotEngineControl)**
- ✅ "Jetzt ausführen" Button
- ✅ Summary-Anzeige nach Run:
  - Verarbeitet (processed)
  - Vorgeschlagen (suggested)
  - Übersprungen (skipped)
  - Fehler (errors)
- ✅ Loading State mit Animation

---

### 🎯 ZIEL 2: Autopilot Suggestions UI (Review/Approve)

**SuggestionsReview Component**
- ✅ Zeigt alle Events mit Status "suggested"
- ✅ Original-Nachricht + KI-Vorschlag nebeneinander
- ✅ Action-Badge (z.B. "Einwand behandeln", "Follow-up")
- ✅ Buttons:
  - ✅ **Übernehmen & Senden**: Setzt Status auf "approved"
  - ⏭️ **Überspringen**: Setzt Status auf "skipped"
- ✅ Meta-Info: Model, Mode, Template-Version

**Status Update Flow (V1)**
```
1. Event kommt rein → Status: pending
2. Autopilot Engine läuft → Status: suggested (+ suggested_reply)
3. User Approve → Status: approved
4. User Skip → Status: skipped
```

**Hinweis V1:** In dieser Version wird noch NICHT wirklich via E-Mail/WhatsApp gesendet. Der Status "sent" ist für spätere Channel-Integration vorbereitet.

---

### 🎯 ZIEL 3: Zero-Input CRM Button im Lead-Detail

**Status:** ✅ Bereits implementiert in `LeadDetailPage.tsx`

Der Button war schon vorhanden:
- Button: "🤖 Zusammenfassung erstellen"
- Hook: `useZeroInputCRM()` aus `hooks/useLeads.ts`
- API: `POST /api/crm/zero-input/summarize`
- Anzeige: Summary wird in grüner Box gezeigt

**Response-Felder:**
- `summary`: Zusammenfassung als Text
- `next_step`: Vorgeschlagener nächster Schritt
- `note_id`: ID der gespeicherten CRM Note
- `task_id`: ID des erstellten Tasks (falls `create_task: true`)

---

## 📁 Neue Dateien

### Services & Hooks
```
src/services/autopilotService.ts    → API-Calls für Autopilot
src/hooks/useAutopilot.ts           → React Hooks für Autopilot
```

### Components
```
src/components/autopilot/
  ├── AutopilotSettingsCard.tsx     → Settings anzeigen & bearbeiten
  ├── MessageEventsTable.tsx        → Events-Tabelle mit Filtern
  ├── SuggestionsReview.tsx         → Vorschläge reviewen & approve/skip
  ├── AutopilotEngineControl.tsx    → Engine triggern & Summary
  └── index.ts                       → Barrel Export
```

### Pages
```
src/pages/AutopilotPage.tsx         → Hauptseite (kombiniert alle Components)
```

### Utils
```
src/utils/autopilotTestHelper.ts    → Test-Messages für Development
```

### Routing & Navigation
- ✅ `src/App.jsx`: Route `/autopilot` hinzugefügt
- ✅ `src/layout/AppShell.tsx`: Menü-Eintrag in neuer Kategorie "AI & AUTOMATION"

---

## 🔌 Backend Endpoints (bereits vorhanden)

### Autopilot Settings
```http
GET  /api/autopilot/settings?contact_id={optional}
POST /api/autopilot/settings
```

**Request Body (POST):**
```json
{
  "mode": "assist",
  "channels": ["email", "internal"],
  "max_auto_replies_per_day": 10,
  "is_active": true,
  "contact_id": null
}
```

### Message Events
```http
GET   /api/autopilot/message-events?status={optional}&channel={optional}&limit={optional}
POST  /api/autopilot/message-event
PATCH /api/autopilot/message-event/{event_id}
```

**Create Event (POST /message-event):**
```json
{
  "contact_id": "optional-uuid",
  "channel": "internal",
  "direction": "inbound",
  "text": "Hey, interessiert mich!",
  "raw_payload": {}
}
```

**Update Status (PATCH /message-event/{id}):**
```json
{
  "autopilot_status": "approved"
}
```

### Autopilot Engine
```http
POST /api/autopilot/run-once?limit=20
```

**Response:**
```json
{
  "success": true,
  "summary": {
    "processed": 5,
    "suggested": 3,
    "skipped": 2,
    "errors": 0
  }
}
```

### Zero-Input CRM
```http
POST /api/crm/zero-input/summarize
```

**Request:**
```json
{
  "lead_id": "uuid",
  "message_limit": 20,
  "create_task": true
}
```

**Response:**
```json
{
  "success": true,
  "note_id": "uuid",
  "task_id": "uuid",
  "summary": "...",
  "next_step": "...",
  "sentiment": "positive",
  "metadata": {}
}
```

---

## 🧪 Test-Checkliste für Alex

### 1. Setup & Zugriff
- [ ] Backend läuft auf `http://localhost:8000` (oder deine LIVE_API_BASE_URL)
- [ ] Frontend läuft auf `http://localhost:5173` (oder dev server)
- [ ] Eingeloggt als User
- [ ] Navigiere zu `/autopilot` über Sidebar → "AI & AUTOMATION" → "Autopilot Cockpit"

### 2. Settings testen
- [ ] Klicke "Bearbeiten"
- [ ] Wähle Mode: **Assist**
- [ ] Aktiviere Channels: **Internal** + **WhatsApp**
- [ ] Setze Max Replies: **50**
- [ ] Toggle: **Aktiv** (grün)
- [ ] Klicke "Speichern"
- [ ] Prüfe: Settings wurden gespeichert (Toast oder Reload)

### 3. Message Events erstellen
Da noch keine echten Nachrichten reinkommen, manuell erstellen:

**Option A: Browser Console**
```javascript
// In Browser Console auf /autopilot Seite:
fetch('http://localhost:8000/api/autopilot/message-event', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer YOUR_TOKEN_HERE'
  },
  body: JSON.stringify({
    channel: 'internal',
    direction: 'inbound',
    text: 'Hey Alex, was kostet das Produkt?',
    raw_payload: {}
  })
});
```

**Option B: Backend direkt**
```bash
curl -X POST http://localhost:8000/api/autopilot/message-event \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "channel": "internal",
    "direction": "inbound",
    "text": "Interessiert mich! Aber zu teuer.",
    "raw_payload": {}
  }'
```

**Test-Messages (Beispiele):**
1. "Was kostet das Produkt?" → erwarte Action: offer_create
2. "Zu teuer, kein Budget" → erwarte Action: objection_handler
3. "Können wir einen Termin machen?" → erwarte Action: follow_up
4. "Danke für die Info!" → erwarte Action: generate_message

### 4. Autopilot Engine triggern
- [ ] Klicke auf "Jetzt ausführen" (im "Autopilot Engine" Bereich)
- [ ] Warte 2-5 Sekunden (je nach OPENAI_API_KEY)
- [ ] Prüfe Summary:
  - **Verarbeitet**: Anzahl der pending Events
  - **Vorgeschlagen**: Anzahl der suggested Events
  - **Übersprungen**: Wenn mode=off oder is_active=false
  - **Fehler**: Sollte 0 sein

### 5. Vorschläge reviewen
- [ ] Scrolle zu "Vorgeschlagene Antworten"
- [ ] Solltest du jetzt 1-X Vorschläge sehen
- [ ] Jeder Vorschlag zeigt:
  - Original-Nachricht (grau)
  - KI-Vorschlag (grün)
  - Action-Badge (z.B. "Einwand behandeln")
- [ ] Klicke "Übernehmen & Senden" bei einem Vorschlag
  - Confirm → Event Status wird auf "approved" gesetzt
  - Event verschwindet aus "Vorgeschlagene Antworten"
  - Erscheint in Events-Tabelle mit Status "approved"
- [ ] Klicke "Überspringen" bei einem anderen
  - Confirm → Event Status wird auf "skipped" gesetzt

### 6. Message Events Tabelle
- [ ] Scrolle zu "Message Events"
- [ ] Teste Filter-Tabs:
  - **Alle**: Zeigt alle Events
  - **Pending**: Nur neue, unverarbeitete
  - **Suggested**: KI-Vorschläge (sollten weniger werden nach Approve/Skip)
  - **Approved**: Von dir genehmigte
  - **Sent**: Gesendete (V1: noch leer, später mit Channel-Integration)
  - **Skipped**: Übersprungene
- [ ] Prüfe Counter in den Tabs (z.B. "Alle (5)")
- [ ] Prüfe relative Zeitangaben ("vor 2 Min", "vor 1 Stunde")

### 7. Zero-Input CRM (Lead-Detail)
- [ ] Navigiere zu `/crm/leads`
- [ ] Wähle einen Lead (oder erstelle einen neuen)
- [ ] In Lead-Detail → Scrolle zu "Zero-Input CRM"
- [ ] Klicke "🤖 Zusammenfassung erstellen"
- [ ] Warte 3-5 Sekunden
- [ ] Prüfe: Grüne Box mit Summary erscheint
- [ ] Text sollte eine Zusammenfassung der letzten Messages sein

### 8. Auto-Refresh
- [ ] Bleibe auf `/autopilot` Seite
- [ ] Warte 30 Sekunden
- [ ] Events sollten automatisch neu geladen werden (Footer zeigt "Letzte Aktualisierung: ...")
- [ ] Falls neue Events erstellt wurden, erscheinen sie automatisch

---

## 🚀 Feature-Flow (End-to-End)

### Beispiel: Einwand-Behandlung

1. **Inbound Message erstellen**
   ```
   POST /api/autopilot/message-event
   { "channel": "internal", "direction": "inbound", "text": "Zu teuer!" }
   ```
   → Event in DB, Status: `pending`

2. **Autopilot Engine triggern**
   ```
   POST /api/autopilot/run-once
   ```
   → Backend:
   - Lädt pending Events
   - Erkennt Action: "objection_handler"
   - Generiert KI-Antwort via OpenAI
   - Speichert in `suggested_reply`
   - Setzt Status auf `suggested`

3. **Frontend zeigt Vorschlag**
   - User sieht in "Vorgeschlagene Antworten":
     - Original: "Zu teuer!"
     - Vorschlag: "Verstehe ich total! 🤔 Lass mich kurz nachfragen: Was wäre denn der ideale Preis für dich?"
     - Action: "Einwand behandeln"

4. **User entscheidet**
   - **Option A**: Klickt "Übernehmen & Senden"
     ```
     PATCH /api/autopilot/message-event/{id}
     { "autopilot_status": "approved" }
     ```
     → Status: `approved`
     → (V2: Würde jetzt via Channel gesendet werden)
   
   - **Option B**: Klickt "Überspringen"
     ```
     PATCH /api/autopilot/message-event/{id}
     { "autopilot_status": "skipped" }
     ```
     → Status: `skipped`

---

## 🔧 Troubleshooting

### Problem: Settings werden nicht gespeichert
- Prüfe Backend-Logs: `python backend/main.py` (oder dein Start-Command)
- Prüfe Browser Console: Fehler beim POST Request?
- Checke Token: Authorization Header korrekt?
- Migrationen gelaufen? `20251205_create_autopilot_settings.sql`

### Problem: Keine Events sichtbar
- Wurden Events erstellt? Prüfe DB: `SELECT * FROM message_events;`
- User-ID korrekt? Events werden pro User gefiltert
- Filter-Tab: Evtl. auf "Pending" gefiltert, aber alle Events sind "suggested"?

### Problem: Engine läuft, aber keine Vorschläge
- Settings: `mode` auf "assist" oder höher? `is_active` = true?
- Events: Direction = "inbound"? (Outbound werden ignoriert)
- OPENAI_API_KEY gesetzt? Falls nicht, nutzt Backend Mock-Antworten
- Backend-Logs checken: Fehler in autopilot_engine.py?

### Problem: Zero-Input CRM zeigt keine Zusammenfassung
- Lead hat überhaupt Messages? (`message_events` Tabelle)
- API-Response im Network Tab: 200 OK?
- Prüfe Response-Body: Enthält `summary` Feld?
- Falls Backend-Error: Logs checken, Migration `crm_notes` Tabelle vorhanden?

### Problem: Linter-Fehler oder Build-Fehler
- `date-fns` installieren (falls nicht vorhanden):
  ```bash
  npm install date-fns
  ```
- TypeScript-Fehler wegen `@/`:
  - Prüfe `tsconfig.json`: `"@/*": ["./src/*"]` in `compilerOptions.paths`
- Missing Imports:
  - Alle Components haben korrekte Imports von `@/services`, `@/hooks`, `@/lib/utils`

---

## 📊 Datenbank-Schema (Referenz)

### autopilot_settings
```sql
id UUID PRIMARY KEY
user_id UUID NOT NULL
contact_id UUID NULL  -- NULL = globale Settings
mode TEXT NOT NULL  -- 'off' | 'assist' | 'one_click' | 'auto'
channels TEXT[] NOT NULL
max_auto_replies_per_day INT NOT NULL
is_active BOOLEAN NOT NULL
created_at TIMESTAMPTZ
updated_at TIMESTAMPTZ
```

### message_events
```sql
id UUID PRIMARY KEY
user_id UUID NOT NULL
contact_id UUID NULL
channel TEXT NOT NULL
direction TEXT NOT NULL  -- 'inbound' | 'outbound'
text TEXT NOT NULL
normalized_text TEXT NOT NULL
raw_payload JSONB NULL
suggested_reply JSONB NULL  -- KI-Vorschlag
autopilot_status TEXT NOT NULL  -- 'pending' | 'suggested' | 'approved' | 'sent' | 'skipped'
template_version TEXT NULL  -- für A/B Testing
persona_variant TEXT NULL   -- für A/B Testing
created_at TIMESTAMPTZ
```

### crm_notes
```sql
id UUID PRIMARY KEY
user_id UUID NOT NULL
lead_id UUID NULL
contact_id UUID NULL
deal_id UUID NULL
content TEXT NOT NULL
note_type TEXT NOT NULL  -- 'zero_input' | 'manual' | etc.
source TEXT NOT NULL     -- 'ai' | 'user'
metadata JSONB NULL
created_at TIMESTAMPTZ
updated_at TIMESTAMPTZ
```

---

## 🎨 UI/UX Highlights

### Design-System
- **Farben:**
  - Primary: `salesflow-accent` (Emerald/Grün)
  - Backgrounds: `bg-black/30`, `bg-white/5` (Glassmorphism)
  - Borders: `border-white/5`, `border-white/10`
  - Status-Colors: Yellow (pending), Blue (suggested), Green (approved), Gray (skipped)

- **Components:**
  - Rounded Corners: `rounded-3xl` für Cards, `rounded-2xl` für Sub-Cards, `rounded-xl` für Buttons
  - Transitions: `transition-all` für Hover-States
  - Icons: Lucide React (Zap, Sparkles, Check, X, etc.)
  - Loading: Spinner + "Läuft..." Text

- **Responsive:**
  - Grid Layout: `lg:grid-cols-2`, `md:grid-cols-3`
  - Mobile: Flex-Wrap, Stack-Layout
  - Sidebar: Sticky, Auto-Collapse auf Mobile

### Animations
- Auto-Refresh: Footer zeigt Timestamp
- Engine Run: Button mit Loader2 Spinner
- Status Updates: Optimistic UI (sofort aus Liste entfernen)

---

## 🔮 V2 Roadmap (Ideen für später)

### Channel-Integration
- [ ] WhatsApp API: Echtes Senden via Twilio/Meta
- [ ] E-Mail: SMTP oder SendGrid Integration
- [ ] LinkedIn: API-Integration (falls verfügbar)

### Autopilot Modes erweitern
- [ ] `one_click` Mode: Vorschlag + "Send" Button kombiniert
- [ ] `auto` Mode: Confidence-Threshold, automatisches Senden bei > 90%
- [ ] Per-Contact Settings: Override für wichtige Kontakte

### Analytics & Insights
- [ ] Dashboard: Erfolgsrate der KI-Vorschläge (Approved vs. Skipped)
- [ ] A/B Testing: Template-Versionen vergleichen
- [ ] Response-Time Tracking: Wie schnell antwortet der Autopilot?

### Smart Features
- [ ] Multi-Message Context: Ganze Konversations-History berücksichtigen
- [ ] Follow-up Scheduling: "Sende in 2 Tagen automatisch nach"
- [ ] Sentiment Detection: Warnung bei negativen Messages

---

## 📞 Support & Fragen

Bei Fragen oder Problemen:
1. Check Backend-Logs: `backend/logs/` oder Terminal Output
2. Browser Console: Network Tab für API-Requests
3. DB Query: `SELECT * FROM message_events ORDER BY created_at DESC LIMIT 20;`
4. Migrations: Alle SQL-Files in `backend/migrations/` ausgeführt?

---

## ✅ Implementation Checklist (für dich, Alex)

- [x] Services & Hooks erstellt
- [x] Components erstellt (Settings, Events, Suggestions, Engine)
- [x] Autopilot Page erstellt
- [x] Route & Navigation hinzugefügt
- [x] Zero-Input CRM geprüft (bereits vorhanden)
- [x] Linter-Fehler behoben
- [x] Dokumentation geschrieben

**Status:** 🎉 **Produktionsreif für V1 (Internal Channel)**

---

Viel Erfolg beim Testen! 🚀
Wenn du Fragen hast oder etwas nicht funktioniert, melde dich einfach.

**Happy Automating!** 🤖✨

