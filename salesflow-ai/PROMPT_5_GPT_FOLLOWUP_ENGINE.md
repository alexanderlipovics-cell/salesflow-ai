# PROMPT 5 – GPT-5.1 THINKING
## Intelligentes Follow-Up System & Team-Duplikation

---

## KONTEXT

SalesFlow AI fokussiert jetzt **100% auf Network Marketer im DACH-Raum**.

**Das #1 Problem von Networkern:**
> "Ich habe 200 Kontakte, aber vergesse 80% davon nachzufassen."

**Das #2 Problem:**
> "Mein Team macht nicht das Gleiche wie ich."

**Was bereits existiert:**
- `ChatImportService` - Extrahiert Leads aus Chats
- `DailyFlowWidget` - Zeigt tägliche Tasks
- Compensation Plans für 5 DACH-Firmen
- AI Router mit Multi-Model Support

---

## DEINE AUFGABE

Baue das **intelligenteste Follow-Up System** der Branche + Team-Duplikation.

---

## DELIVERABLES

### 1. SMART FOLLOW-UP ENGINE (Python Backend)

```python
# backend/app/services/smart_followup_engine.py

from datetime import datetime, timedelta
from typing import Optional, List
from uuid import UUID
from enum import Enum
from pydantic import BaseModel

class FollowUpPriority(str, Enum):
    URGENT = "urgent"      # Heute noch!
    HIGH = "high"          # In 24h
    NORMAL = "normal"      # In 2-3 Tagen
    LOW = "low"            # Diese Woche
    SCHEDULED = "scheduled" # Geplanter Termin

class FollowUpReason(str, Enum):
    NO_RESPONSE = "no_response"
    SHOWED_INTEREST = "showed_interest"
    WATCHED_VIDEO = "watched_video"
    OBJECTION_HANDLED = "objection_handled"
    CALL_SCHEDULED = "call_scheduled"
    PERIODIC_CHECKIN = "periodic_checkin"
    REACTIVATION = "reactivation"

class FollowUpSuggestion(BaseModel):
    lead_id: UUID
    priority: FollowUpPriority
    reason: FollowUpReason
    suggested_time: datetime
    suggested_channel: str  # whatsapp, email, call
    message_template_id: Optional[str]
    ai_message_suggestion: Optional[str]
    confidence_score: float  # 0-1

class SmartFollowUpEngine:
    """
    Intelligente Follow-Up Engine die entscheidet:
    - WANN: Optimale Zeit basierend auf Lead-Verhalten
    - WAS: Welche Nachricht/Template
    - WIE DRINGEND: Priorität basierend auf Lead Score
    - OB ÜBERHAUPT: Opt-out Detection
    """
    
    def __init__(self, db, ai_router):
        self.db = db
        self.ai_router = ai_router
    
    async def get_next_followups(
        self,
        user_id: UUID,
        limit: int = 20,
        include_suggestions: bool = True
    ) -> List[FollowUpSuggestion]:
        """
        Holt die nächsten Follow-ups für einen User.
        
        Sortiert nach:
        1. Priorität (Urgent first)
        2. Lead Score (Hot first)
        3. Zeit seit letzter Interaktion
        """
        pass
    
    async def calculate_optimal_time(
        self,
        lead_id: UUID
    ) -> datetime:
        """
        Berechnet die optimale Follow-up Zeit basierend auf:
        - Historische Antwortzeiten des Leads
        - Timezone des Leads
        - Wochentag-Muster
        - Tageszeit-Muster
        """
        pass
    
    async def suggest_channel(
        self,
        lead_id: UUID
    ) -> str:
        """
        Schlägt den besten Kanal vor basierend auf:
        - Wo hat der Lead zuletzt geantwortet?
        - Welcher Kanal hat beste Response Rate?
        - Verfügbarkeit (z.B. WhatsApp Nummer vorhanden?)
        """
        pass
    
    async def generate_message(
        self,
        lead_id: UUID,
        reason: FollowUpReason,
        context: Optional[str] = None
    ) -> str:
        """
        Generiert personalisierte Follow-up Nachricht mit AI.
        
        Berücksichtigt:
        - Vorherige Konversation
        - Lead-Eigenschaften
        - Einwände die behandelt wurden
        - Firmen-spezifische Compliance
        """
        pass
    
    async def should_followup(
        self,
        lead_id: UUID
    ) -> tuple[bool, Optional[str]]:
        """
        Prüft ob Follow-up sinnvoll ist.
        
        Returns:
            (True, None) - Follow-up empfohlen
            (False, "reason") - Nicht empfohlen mit Grund
        
        Gründe für NICHT Follow-up:
        - Lead hat "nicht mehr kontaktieren" gesagt
        - Zu viele unbeantworte Nachrichten (>5)
        - Lead als "lost" markiert
        - Kürzlich kontaktiert (<24h)
        """
        pass
```

### 2. FOLLOW-UP SEQUENZEN (YAML-basiert)

```yaml
# backend/data/followup_sequences.yaml

sequences:
  # ==========================================
  # SEQUENZ 1: Erst-Kontakt → Partner
  # ==========================================
  first_contact_to_partner:
    name: "Erst-Kontakt zu Partner"
    description: "Für neue Leads die Interesse gezeigt haben"
    target_outcome: "partner_signup"
    max_duration_days: 30
    
    steps:
      - day: 0
        name: "Interesse bestätigen"
        action: "send_message"
        template: "confirm_interest"
        channel: "auto"  # Bester Kanal
        conditions:
          - "lead.sentiment in ['hot', 'warm']"
        on_response:
          positive: "next_step"
          negative: "move_to_nurture"
          no_response: "wait"
          
      - day: 2
        name: "Video/Info senden"
        action: "send_message"
        template: "send_video"
        channel: "whatsapp"
        conditions:
          - "not lead.watched_video"
        fallback_template: "value_proposition"
        
      - day: 5
        name: "Soft Follow-up"
        action: "send_message"
        template: "gentle_followup"
        conditions:
          - "no_response_since > 48h"
          
      - day: 8
        name: "Call anbieten"
        action: "send_message"
        template: "offer_call"
        on_response:
          positive: "schedule_call"
          
      - day: 14
        name: "3-Way Call anbieten"
        action: "send_message"
        template: "offer_3way_call"
        conditions:
          - "lead.has_objections"
          
      - day: 21
        name: "Letzte Chance"
        action: "send_message"
        template: "final_attempt"
        on_no_response: "move_to_nurture"
        
      - day: 30
        name: "Sequenz beenden"
        action: "end_sequence"
        next_sequence: "long_term_nurture"

  # ==========================================
  # SEQUENZ 2: Ghost → Reaktivierung
  # ==========================================
  ghost_reactivation:
    name: "Ghost Reaktivierung"
    description: "Für Leads die nicht mehr antworten"
    trigger: "no_response_days >= 7"
    max_attempts: 3
    
    steps:
      - day: 0
        name: "Pattern Interrupt"
        action: "send_message"
        template: "phoenix_reactivation"
        variants:
          - "curiosity_hook"
          - "value_reminder"
          - "casual_checkin"
          
      - day: 7
        name: "Neuer Ansatz"
        action: "send_message"
        template: "different_angle"
        conditions:
          - "previous_template != 'different_angle'"
          
      - day: 14
        name: "Finale Nachricht"
        action: "send_message"
        template: "final_goodbye"
        on_no_response: "archive_lead"

  # ==========================================
  # SEQUENZ 3: Kunde → Upgrade zu Partner
  # ==========================================
  customer_to_partner:
    name: "Kunde zu Partner"
    description: "Für zufriedene Kunden"
    trigger: "lead.is_customer AND lead.satisfaction_score >= 8"
    
    steps:
      - day: 30
        name: "Zufriedenheit checken"
        action: "send_message"
        template: "satisfaction_check"
        
      - day: 45
        name: "Business Opportunity erwähnen"
        action: "send_message"
        template: "soft_opportunity_mention"
        conditions:
          - "lead.response_positive"
          
      - day: 60
        name: "Direkte Einladung"
        action: "send_message"
        template: "partner_invitation"
```

### 3. TEAM-DUPLIKATIONS-SYSTEM

```python
# backend/app/services/team_duplication_service.py

class TeamTemplate(BaseModel):
    """
    Ein Team-Template das dupliziert werden kann.
    
    Team Leader erstellt es, Team Members klonen es.
    """
    id: UUID
    name: str
    description: str
    created_by: UUID  # Team Leader
    company_id: str   # z.B. "zinzino"
    
    # Was wird dupliziert?
    followup_sequences: List[str]  # Sequence IDs
    message_templates: List[str]   # Template IDs
    daily_flow_config: DailyFlowConfig
    objection_handlers: List[str]  # Objection IDs
    
    # Sharing Settings
    is_public: bool = False  # Für alle in der Firma?
    shared_with: List[UUID] = []  # Explizit geteilte User
    
    # Versioning
    version: int = 1
    updated_at: datetime
    
    # Stats
    times_cloned: int = 0
    avg_success_rate: float = 0.0


class TeamDuplicationService:
    """
    Service für Team-Duplikation.
    
    Features:
    - Team Leader erstellt Template
    - Team Members klonen mit 1 Tap
    - Änderungen werden automatisch gepusht
    - Performance-Tracking pro Template
    """
    
    async def create_template(
        self,
        leader_id: UUID,
        name: str,
        config: dict
    ) -> TeamTemplate:
        """
        Team Leader erstellt ein neues Template.
        """
        pass
    
    async def clone_template(
        self,
        member_id: UUID,
        template_id: UUID
    ) -> bool:
        """
        Team Member klont ein Template.
        
        - Kopiert alle Sequenzen
        - Kopiert alle Templates
        - Übernimmt Daily Flow Config
        - Trackt Ursprung für Analytics
        """
        pass
    
    async def push_updates(
        self,
        template_id: UUID,
        changes: dict
    ) -> List[UUID]:
        """
        Leader pusht Änderungen an alle Klone.
        
        Returns: Liste der aktualisierten User IDs
        """
        pass
    
    async def get_template_performance(
        self,
        template_id: UUID
    ) -> TemplatePerformance:
        """
        Holt Performance-Metriken für ein Template.
        
        - Wie viele haben es geklont?
        - Durchschnittliche Response Rate
        - Conversion zu Partner
        - Best/Worst Performer
        """
        pass
```

### 4. "NIE WIEDER VERGESSEN" FEATURES

```python
# backend/app/services/reminder_service.py

class SmartReminderService:
    """
    Intelligente Erinnerungen die nicht nerven.
    """
    
    async def schedule_smart_reminder(
        self,
        user_id: UUID,
        lead_id: UUID,
        action_type: str
    ) -> Reminder:
        """
        Plant eine Erinnerung zur optimalen Zeit.
        
        Berücksichtigt:
        - User's aktive Stunden
        - Nicht zu viele Erinnerungen gleichzeitig
        - Priorität der Aktion
        """
        pass
    
    async def snooze_with_intelligence(
        self,
        reminder_id: UUID,
        snooze_reason: Optional[str] = None
    ) -> Reminder:
        """
        Verschiebt Erinnerung intelligent.
        
        - Lernt aus Snooze-Patterns
        - Schlägt bessere Zeit vor
        - Warnt bei zu viel Snooze
        """
        pass
    
    async def escalate_to_leader(
        self,
        user_id: UUID,
        lead_id: UUID,
        reason: str
    ):
        """
        Eskaliert an Team Leader wenn Ghost-Lead.
        
        Leader bekommt Notification:
        "Max hat Lisa seit 7 Tagen nicht erreicht. Hilfe nötig?"
        """
        pass
```

### 5. DATABASE MIGRATIONS

```sql
-- migrations/20241206_smart_followups.sql

-- Follow-up Sequenz Tracking
CREATE TABLE followup_sequence_runs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lead_id UUID NOT NULL REFERENCES leads(id),
    sequence_id TEXT NOT NULL,
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    current_step INT NOT NULL DEFAULT 0,
    status TEXT CHECK (status IN ('active', 'paused', 'completed', 'cancelled')) DEFAULT 'active',
    outcome TEXT,
    completed_at TIMESTAMPTZ,
    metadata JSONB DEFAULT '{}'
);

-- Team Templates
CREATE TABLE team_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    created_by UUID NOT NULL REFERENCES auth.users(id),
    company_id TEXT NOT NULL,
    config JSONB NOT NULL,
    is_public BOOLEAN DEFAULT false,
    version INT DEFAULT 1,
    times_cloned INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Template Clones (wer hat was geklont)
CREATE TABLE template_clones (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    template_id UUID NOT NULL REFERENCES team_templates(id),
    user_id UUID NOT NULL REFERENCES auth.users(id),
    cloned_at TIMESTAMPTZ DEFAULT NOW(),
    is_synced BOOLEAN DEFAULT true,
    UNIQUE(template_id, user_id)
);

-- Smart Reminders
CREATE TABLE smart_reminders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id),
    lead_id UUID REFERENCES leads(id),
    action_type TEXT NOT NULL,
    scheduled_for TIMESTAMPTZ NOT NULL,
    priority TEXT DEFAULT 'normal',
    snooze_count INT DEFAULT 0,
    completed_at TIMESTAMPTZ,
    dismissed_at TIMESTAMPTZ,
    metadata JSONB DEFAULT '{}'
);

-- Indexes
CREATE INDEX idx_sequence_runs_lead ON followup_sequence_runs(lead_id);
CREATE INDEX idx_sequence_runs_status ON followup_sequence_runs(status);
CREATE INDEX idx_templates_company ON team_templates(company_id);
CREATE INDEX idx_reminders_user_scheduled ON smart_reminders(user_id, scheduled_for);
```

### 6. API ENDPOINTS

```python
# backend/app/routers/followups.py (erweitert)

@router.get("/smart-suggestions")
async def get_smart_followup_suggestions(
    limit: int = 20,
    priority: Optional[FollowUpPriority] = None,
    service: SmartFollowUpEngine = Depends(get_followup_engine)
):
    """
    Holt intelligente Follow-up Vorschläge.
    """
    pass

@router.post("/batch-send")
async def batch_send_followups(
    lead_ids: List[UUID],
    template_id: Optional[str] = None,
    use_ai: bool = True
):
    """
    Sendet Follow-ups an mehrere Leads gleichzeitig.
    
    - AI personalisiert jede Nachricht
    - Respektiert Rate Limits
    - Trackt alles
    """
    pass

@router.post("/sequence/start")
async def start_followup_sequence(
    lead_id: UUID,
    sequence_id: str
):
    """
    Startet eine Follow-up Sequenz für einen Lead.
    """
    pass

# Team Duplikation
@router.post("/team/templates")
async def create_team_template(
    template: TeamTemplateCreate
):
    """
    Team Leader erstellt ein Template.
    """
    pass

@router.post("/team/templates/{template_id}/clone")
async def clone_team_template(
    template_id: UUID
):
    """
    Team Member klont ein Template.
    """
    pass
```

---

## OUTPUT FORMAT

Liefere:
1. **Python Backend Services** (vollständig)
2. **Pydantic Schemas**
3. **SQL Migrations**
4. **YAML Sequenz-Definitionen**
5. **FastAPI Router Endpoints**
6. **TypeScript API Client**

---

## WICHTIG

- **Nie nerven**: Intelligente Timing, nicht zu viele Notifications
- **Compliance**: DSGVO-konform, Opt-out respektieren
- **Performance**: <100ms Response Time
- **Duplikation**: 1-Tap Clone für Team Members

