# Follow-Up System Dokumentation - Sales Flow AI

## Übersicht

Das Follow-Up System ist ein intelligentes, mehrschichtiges System zur automatisierten Nachverfolgung von Leads. Es besteht aus mehreren parallelen Implementierungen und wird kontinuierlich weiterentwickelt.

## Architektur-Übersicht

Das System besteht aus drei Hauptkomponenten:
1. **Backend API** (FastAPI/Python) - Intelligente Follow-up Engine
2. **Frontend Hook** (React/TypeScript) - `useFollowUpEngine` Hook
3. **Datenbank** (Supabase/PostgreSQL) - Persistenz & Status-Tracking

---

## 1. Datenbank-Struktur

### Tabellen

#### `followup_suggestions` (Haupttabelle für Vorschläge)
```sql
- id: UUID (Primary Key)
- user_id: UUID
- lead_id: UUID
- flow: TEXT (z.B. 'COLD_NO_REPLY', 'INTERESTED_LATER')
- stage: INTEGER (0-4, aktuelle Stage im Flow)
- template_key: TEXT
- channel: TEXT ('whatsapp', 'email', 'instagram_dm', etc.)
- suggested_message: TEXT (AI-generierte Nachricht)
- reason: TEXT (Begründung für das Follow-up)
- due_at: TIMESTAMPTZ (Fälligkeitsdatum)
- status: TEXT ('pending', 'sent', 'skipped', 'snoozed', 'completed')
- sent_at: TIMESTAMPTZ
- snoozed_until: TIMESTAMPTZ
- created_at, updated_at: TIMESTAMPTZ
```

#### `lead_follow_up_status` (Status-Tracking pro Lead)
```sql
- id: UUID (Primary Key)
- lead_id: UUID
- current_step_code: TEXT ('initial_contact', 'fu_1_bump', 'fu_2_value', etc.)
- status: TEXT ('active', 'paused', 'replied', 'converted', 'lost')
- next_follow_up_at: TIMESTAMPTZ
- last_contacted_at: TIMESTAMPTZ
- contact_count: INTEGER
- reply_count: INTEGER
- preferred_channel: TEXT
- notes: TEXT
- paused_until: TIMESTAMPTZ
```

#### `follow_up_history` (Historie aller Aktionen)
```sql
- id: UUID
- lead_id: UUID
- follow_up_status_id: UUID
- step_code: TEXT
- channel: TEXT
- outcome: TEXT ('sent', 'no_answer', 'replied', 'interested', 'not_interested', etc.)
- message_sent: TEXT
- response_received: TEXT
- notes: TEXT
- executed_at: TIMESTAMPTZ
```

#### `follow_up_templates` (Sequenz-Definitionen)
```sql
- id: UUID
- step_code: TEXT ('initial_contact', 'fu_1_bump', etc.)
- phase: TEXT ('followup', 'reactivation', 'loop')
- step_order: INTEGER
- days_after_previous: INTEGER
- default_channel: TEXT
- message_template: TEXT
- subject_template: TEXT (für Email)
- is_active: BOOLEAN
```

#### `followup_rules` (Flow-Konfigurationen)
```sql
- id: UUID
- flow: TEXT ('COLD_NO_REPLY', etc.)
- stage: INTEGER
- wait_days: INTEGER (Tage bis zum nächsten Step)
- next_stage: INTEGER
- next_status: TEXT
- template_key: TEXT
- description: TEXT
```

---

## 2. Follow-Up Sequenz-Phasen

Das System arbeitet mit drei Hauptphasen:

### Phase A: Aktives Follow-up (Tag 0-14)
- **initial_contact** (Tag 0) - Erster Kontakt
- **fu_1_bump** (Tag 3) - Erste Nachfrage
- **fu_2_value** (Tag 7) - Mehrwert anbieten
- **fu_3_decision** (Tag 10) - Entscheidung pushen
- **fu_4_last_touch** (Tag 14) - Letzter Versuch

### Phase B: Reaktivierung (Tag 60-300)
- **rx_1_update** (Tag 60) - Update Check-in
- **rx_2_value_asset** (Tag 120) - Value Asset teilen
- **rx_3_yearly_checkin** (Tag 300) - Jahres-Check

### Phase C: Endlos-Loop (alle 180 Tage)
- **rx_loop_checkin** - Regelmäßiger Check-in

### Timing-Logik
```typescript
const daysMap = {
  initial_contact: 3,      // -> fu_1_bump nach 3 Tagen
  fu_1_bump: 4,            // -> fu_2_value nach 4 Tagen (Tag 7)
  fu_2_value: 3,           // -> fu_3_decision nach 3 Tagen (Tag 10)
  fu_3_decision: 4,        // -> fu_4_last_touch nach 4 Tagen (Tag 14)
  fu_4_last_touch: 46,     // -> rx_1_update nach 46 Tagen (Tag 60)
  rx_1_update: 60,         // -> rx_2_value_asset nach 60 Tagen (Tag 120)
  rx_2_value_asset: 180,   // -> rx_3_yearly_checkin nach 180 Tagen (Tag 300)
  rx_3_yearly_checkin: 180,// -> rx_loop_checkin
  rx_loop_checkin: 180,    // Alle 180 Tage wiederholen
};
```

---

## 3. Backend-Architektur

### FollowUpEngine (`backend/app/services/followup_engine.py`)

Zentrale Engine-Klasse, die entscheidet:
- **OB** ein Follow-up fällig ist
- **WELCHER** Channel verwendet werden soll
- **WANN** der optimale Zeitpunkt ist
- **WIE** dringend (Priorität/Score)
- **WELCHE** Sequenz/Stufe der Lead gerade hat

#### Hauptmethoden:

```python
async def get_next_follow_up(lead_id: UUID) -> Optional[FollowUpSuggestion]
```
- Lädt Lead-Kontext
- Prüft aktiven Sequenz-State
- Bestimmt nächsten Step
- Prüft Conditions (z.B. NO_REPLY)
- Berechnet Zeitpunkt & Priorität

```python
async def generate_message(lead_id: UUID, context: Dict) -> Optional[AIMessage]
```
- Holt Follow-up Suggestion
- Baut AI-Prompt Payload
- Ruft AI-Router für Text-Generierung auf
- Erstellt AIMessage-Objekt

```python
async def get_today_followups(user_id: UUID) -> List[FollowUpSuggestion]
```
- Lädt alle Leads
- Filtert auf heute fällige Follow-ups
- Sortiert nach Priorität

### API Router (`backend/app/routers/followups.py`)

#### Haupt-Endpoints:

**GET `/follow-ups/today`**
- Gibt alle heute fälligen Follow-ups zurück
- Sortiert nach Priorität (CRITICAL > HIGH > MEDIUM > LOW)
- Response enthält Zählungen pro Prioritätsstufe

**POST `/follow-ups/{lead_id}/generate`**
- Generiert personalisierte AI-Nachricht
- Berücksichtigt Lead-Daten, Sequenz, Interaktionen
- Nachricht kann vor dem Senden editiert werden

**POST `/follow-ups/{lead_id}/snooze`**
- Verschiebt Follow-up
- Presets: '1h', 'evening', 'tomorrow', 'next_monday'
- Oder custom_time für exakten Zeitpunkt

**POST `/follow-ups/batch/generate`**
- Batch-Mode: Mehrere Nachrichten auf einmal generieren
- Max 10 Leads gleichzeitig

**V2 Endpoints (Supabase-backed):**

**GET `/followups/pending`**
- Alle fälligen Follow-ups (nächste 7 Tage)

**GET `/followups/today`**
- Nur heute fällige (für Dashboard Widget)

**POST `/followups/suggestions/{id}/action`**
- Aktionen: 'send', 'skip', 'snooze'

**POST `/followups/start-flow`**
- Startet Flow für Lead (z.B. 'COLD_NO_REPLY')

**POST `/followups/generate`**
- Background Task: Generiert Vorschläge für fällige Leads

### CHIEF Integration (`backend/app/ai/tool_executor.py`)

CHIEF (AI-Agent) kann über Tools mit dem Follow-up System interagieren:

#### Tools:

**`create_follow_up` / `create_followup`**
- Erstellt einzelnes Follow-up
- Automatisch 3 Tage später (Standard)

**`bulk_create_followups`**
- Erstellt Follow-ups für ALLE Leads
- Optional: Status-Filter

**`get_followup_suggestions`**
- Holt fällige Follow-ups (nächste 7 Tage)

**`start_followup_flow`**
- Startet Flow für Lead
- Setzt `follow_up_stage` und `next_follow_up_at`

**`query_follow_ups`**
- Query mit Filtern: timeframe, priority

**`get_followup_stats`**
- Statistiken (pending, sent_this_week, etc.)

---

## 4. Frontend-Architektur

### useFollowUpEngine Hook (`src/hooks/useFollowUpEngine.ts`)

React Hook für das gesamte Follow-up System:

#### Features:
- Lädt heute fällige Tasks aus `today_follow_ups` View
- Task-Completion mit automatischer Berechnung des nächsten Steps
- Skip, Reply, Convert, Lost Aktionen
- Statistiken
- Message-Personalisierung

#### Hauptfunktionen:

```typescript
fetchTodayTasks(): Promise<TodayFollowUpTask[]>
```
- Lädt Tasks aus `today_follow_ups` View
- Fallback: Manueller Query falls View nicht existiert
- Sortiert nach Urgency (overdue > today > upcoming)

```typescript
completeTask(params: CompleteTaskParams): Promise<void>
```
- Loggt Aktion in `follow_up_history`
- Bestimmt nächsten Step
- Aktualisiert `lead_follow_up_status`
- Bei Reply → Status auf "replied"
- Bei Not Interested → Status auf "lost"
- Sonst → nächster Step mit neuem `next_follow_up_at`

```typescript
skipTask(leadId: string): Promise<void>
```
- Verschiebt Follow-up auf morgen

```typescript
markReplied(leadId: string, notes?: string): Promise<void>
```
- Markiert als geantwortet
- Setzt Status auf "replied"
- Setzt `reply_count++`

```typescript
markConverted(leadId: string, notes?: string): Promise<void>
```
- Markiert als konvertiert
- Setzt Status auf "converted"

```typescript
markLost(leadId: string, reason?: string): Promise<void>
```
- Markiert als verloren
- Setzt Status auf "lost"

```typescript
pauseLead(leadId: string, pauseUntil: Date): Promise<void>
```
- Pausiert Lead bis bestimmtes Datum

```typescript
resumeLead(leadId: string): Promise<void>
```
- Reaktiviert Lead

```typescript
generateMessage(params: GenerateMessageParams): string
```
- Personalisiert Template mit Lead-Daten
- Ersetzt Platzhalter: `{{name}}`, `{{vorname}}`, `{{company}}`, etc.

### Follow-Up Service (`src/services/followUpService.ts`)

API-Client für Backend-Kommunikation:

```typescript
getTodayFollowUps(): Promise<TodayFollowUpResponse>
getNextFollowUp(leadId: string): Promise<FollowUpSuggestion | null>
generateFollowUpMessage(leadId: string, context?: Record): Promise<AIMessage>
snoozeFollowUp(leadId: string, preset?: string, customTime?: string): Promise<SnoozeResponse>
batchGenerateFollowUps(leadIds: string[]): Promise<{generated: number, messages: AIMessage[]}>
```

---

## 5. Automatisierung & Workflows

### Auto-Reminder System (`src/services/autoReminderService.js`)

Automatisches Erstellen von Follow-ups basierend auf Lead-Status:

```javascript
AUTO_REMINDER_CONFIG = {
  proposal_sent: {
    enabled: true,
    daysUntilFollowUp: 3,  // 3 Tage nach Angebot nachfassen
    priority: 'high',
    action: 'follow_up',
    descriptionTemplate: (leadName) => 
      `Nachfassen: Angebot an ${leadName} - Entscheidung erfragen`,
  }
};
```

### Sequenz-Start

Beim Erstellen eines neuen Leads:
- Automatisch Follow-up in 3 Tagen erstellen
- User wird informiert: "✅ Lead erstellt + Follow-up in 3 Tagen geplant."
- Keine Frage ob Follow-up gewünscht ist (automatisch)

### Flow-Management

Flows werden über `followup_rules` definiert:
- Jeder Flow hat Stages (0, 1, 2, 3, 4)
- Jede Stage hat `wait_days` bis zum nächsten Step
- Nach Ausführung wird automatisch `next_stage` gesetzt

Beispiel Flow 'COLD_NO_REPLY':
- Stage 0 → Stage 1 nach 2 Tagen
- Stage 1 → Stage 2 nach 3 Tagen
- etc.

---

## 6. Prioritäts-Berechnung

Die Priorität wird basierend auf folgenden Faktoren berechnet:

```python
def _compute_priority(lead, state, step) -> FollowUpPriority:
    score = lead.lead_score or 0.0
    days_since_contact = (now - last_contact).days
    
    if score >= 80 and days_since_contact >= 7:
        return FollowUpPriority.CRITICAL
    if score >= 50 and days_since_contact >= 3:
        return FollowUpPriority.HIGH
    if days_since_contact >= 7:
        return FollowUpPriority.HIGH
    
    return FollowUpPriority.MEDIUM
```

**Prioritätsstufen:**
- **CRITICAL**: Hoher Lead Score + lange Funkstille
- **HIGH**: Mittlerer Score + paar Tage seit Kontakt
- **MEDIUM**: Standard-Follow-ups
- **LOW**: Weniger dringend

---

## 7. Message-Generierung

### AI-Integration

Die Follow-up Engine nutzt einen AI-Router für Text-Generierung:

1. **Payload-Erstellung:**
   - Lead-Daten
   - Suggestion-Metadaten (Sequenz, Step, Template)
   - User-Context

2. **AI-Aufruf:**
   - Task-Type: 'FOLLOWUP_GENERATION'
   - Config: `importance: "high"`, `cost_sensitivity: "medium"`

3. **Response-Verarbeitung:**
   - Content wird extrahiert
   - AIMessage-Objekt erstellt
   - Template-Key, Model, Tokens werden gespeichert

### Template-Personalisierung

Templates enthalten Platzhalter:
- `{{name}}` → Lead-Name
- `{{vorname}}` → Vorname
- `{{company}}` → Firmenname
- `{{vertical}}` → Branche

Frontend ersetzt diese dynamisch vor dem Senden.

---

## 8. Status-Management

### Lead-Status im Follow-up System:

- **active**: Follow-up läuft
- **paused**: Pausiert bis `paused_until`
- **replied**: Lead hat geantwortet
- **converted**: Lead konvertiert (Sale/Termin)
- **lost**: Lead verloren

### Follow-up Suggestion Status:

- **pending**: Fällig, wartet auf Bearbeitung
- **sent**: Nachricht gesendet
- **skipped**: Übersprungen
- **snoozed**: Verschoben
- **completed**: Abgeschlossen

---

## 9. Statistiken & Reporting

Das System trackt folgende Metriken:

```typescript
interface FollowUpStats {
  total_active: number;           // Aktive Follow-ups
  overdue_count: number;          // Überfällige
  today_count: number;            // Heute fällige
  upcoming_count: number;         // Demnächst fällige
  paused_count: number;           // Pausierte
  replied_count: number;          // Geantwortete Leads
  converted_count: number;        // Konvertierte
  lost_count: number;             // Verlorene
  reply_rate: number;             // Antwortrate (%)
  conversion_rate: number;        // Konversionsrate (%)
  avg_touches_to_reply: number;   // Durchschn. Kontakte bis Antwort
}
```

---

## 10. Best Practices & Design-Entscheidungen

### Design-Prinzipien:

1. **Null-Lead-Verlust-Toleranz**: Jeder Lead bekommt automatisch Follow-ups
2. **Ewige Sequenz**: Loop-System sorgt für kontinuierliche Ansprache
3. **AI-First**: Automatische Message-Generierung mit Personalisierung
4. **Flexible Flows**: Verschiedene Flows für verschiedene Szenarien
5. **Prioritätsbasiert**: Dringendste Follow-ups zuerst

### Workflow:

1. **Lead-Erstellung** → Automatisch Follow-up in 3 Tagen
2. **Fälligkeit** → Erscheint in `/today` Endpoint
3. **User öffnet Follow-up** → Nachricht wird generiert
4. **User sendet/überspringt** → Status aktualisiert
5. **Automatisch nächster Step** → Nächstes Follow-up geplant

---

## 11. Integration mit anderen Systemen

### CHIEF AI-Agent
- Kann Follow-ups über Tools erstellen/abfragen
- Automatische Follow-up-Erstellung bei Lead-Erstellung

### Lead Management
- Follow-ups werden beim Lead-Status-Update automatisch erstellt
- Proposal gesendet → Auto-Reminder in 3 Tagen

### Activity Logger
- Alle Follow-up-Aktionen werden geloggt
- Für Audit-Trail und Analytics

---

## 12. Technische Details

### Timezone-Handling
- `DefaultTimezoneService` berechnet optimale Kontaktzeiten
- Berücksichtigt Lead-Timezone
- Beste Tageszeit für Follow-ups

### Dringlichkeit-Berechnung
```typescript
function calculateUrgency(nextFollowUpAt: string): TaskUrgency {
  const diffDays = (today - dueDate) / (1000 * 60 * 60 * 24);
  
  if (diffDays > 0) return "overdue";
  if (diffDays === 0) return "today";
  return "upcoming";
}
```

### View: `today_follow_ups`
Materialisierte View die folgende Daten joined:
- `lead_follow_up_status`
- `leads` (Lead-Daten)
- `follow_up_templates` (Template-Info)

Berechnet:
- Urgency
- Days overdue
- Phase (followup/reactivation/loop)

---

## 13. Offene Fragen & Verbesserungspotenzial

1. **Parallele Systeme**: Es gibt mehrere Follow-up-Implementierungen (V1, V2, Eternal Engine). Konsolidierung wäre sinnvoll.

2. **View-Kompatibilität**: Frontend nutzt `today_follow_ups` View, aber es gibt Fallback-Logik falls View nicht existiert.

3. **Batch-Processing**: Background Tasks für Follow-up-Generierung könnten optimiert werden.

4. **Multi-Tenancy**: User-ID-Extraktion ist an mehreren Stellen unterschiedlich implementiert.

5. **Testing**: Mock-Repository (`InMemoryFollowUpRepository`) wird verwendet, aber echte Supabase-Tests fehlen.

---

## Zusammenfassung

Das Follow-up System ist ein komplexes, mehrschichtiges System mit:
- **Intelligenter Sequenz-Logik** (3 Phasen, 9 Steps)
- **AI-gestützter Message-Generierung**
- **Prioritätsbasierter Sortierung**
- **Automatisierter Workflow-Orchestrierung**
- **Umfassendem Status-Tracking**
- **Statistiken & Reporting**

Es ist darauf ausgelegt, **null Leads zu verlieren** durch kontinuierliche, intelligente Nachverfolgung.

