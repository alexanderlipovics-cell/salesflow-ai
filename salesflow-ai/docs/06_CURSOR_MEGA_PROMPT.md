# 🔧 CURSOR MEGA-PROMPT: NetworkerOS Transformation

## Rolle & Kontext

Du bist ein Senior Staff Engineer & Product-Architect für **NetworkerOS** – eine KI-Sales-App speziell für Network Marketing.

**Ziel:** Die App zur #1 KI-Lösung für Networker & kleine Sales-Teams (5-10 Leute) transformieren.

**Tech Stack:**
- Frontend: React Native + Expo
- Backend: FastAPI (Python 3.11)
- Datenbank: Supabase (PostgreSQL mit RLS)
- AI: OpenAI GPT-4
- Cache: Redis

---

## PHASE 1: ARCHITEKTUR-FOUNDATION (Woche 1-2)

### 1.1 Event-/Job-Layer (Background Worker)

**Warum:** Sequences, Follow-ups, Autopilot sind zeitbasiert. Das muss async laufen.

**Tasks:**

1. Erstelle Worker-Struktur mit Redis Queue (RQ):

```python
# backend/workers/job_processor.py
from rq import Queue
from redis import Redis
from datetime import datetime

redis_conn = Redis(host='localhost', port=6379)
job_queue = Queue('networker_jobs', connection=redis_conn)

def schedule_job(job_type: str, payload: dict, run_at: datetime, user_id: str, company_id: str):
    """Schedule a background job"""
    pass
```

2. Erstelle Datenbank-Tabelle `scheduled_jobs`:

```sql
CREATE TABLE scheduled_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id),
    user_id UUID NOT NULL REFERENCES auth.users(id),
    job_type TEXT NOT NULL, -- 'send_followup', 'send_sequence_step', 'ghostbuster_check'
    payload JSONB NOT NULL,
    run_at TIMESTAMPTZ NOT NULL,
    status TEXT DEFAULT 'pending', -- 'pending', 'running', 'done', 'failed'
    last_error TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ
);

-- RLS Policy
ALTER TABLE scheduled_jobs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can only see own company jobs" ON scheduled_jobs
    FOR ALL USING (company_id = (SELECT company_id FROM user_profiles WHERE user_id = auth.uid()));
```

3. Migriere bestehende Features auf Job-System:
   - Follow-Up Reminder → `job_type: 'send_followup_reminder'`
   - Sequence Steps → `job_type: 'send_sequence_step'`
   - Autopilot → `job_type: 'autopilot_action'`
   - GhostBuster Checks → `job_type: 'ghostbuster_scan'`

---

### 1.2 AI-Eval & Logging-Layer

**Warum:** Data Flywheel = Jede Interaktion macht das System besser. Ohne Logging fährst du blind.

**Tasks:**

1. Erstelle Tabelle `ai_interactions`:

```sql
CREATE TABLE ai_interactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL,
    user_id UUID NOT NULL,
    contact_id UUID, -- optional, wenn auf Prospect bezogen
    
    -- Skill & Model Info
    skill_name TEXT NOT NULL, -- 'analyze_objection', 'generate_followup', 'mentor_chat', 'disg_analyze'
    prompt_version TEXT NOT NULL, -- 'v1.0', 'v1.1', etc.
    model TEXT NOT NULL, -- 'gpt-4-turbo', 'gpt-4o', etc.
    
    -- Request/Response (gekürzt für Storage)
    request_summary JSONB, -- wichtigste Input-Felder
    response_summary JSONB, -- wichtigste Output-Felder
    
    -- Performance
    latency_ms INTEGER,
    tokens_in INTEGER,
    tokens_out INTEGER,
    
    -- Outcome Tracking (wird später aktualisiert)
    was_used BOOLEAN DEFAULT FALSE, -- hat User die Antwort übernommen?
    outcome_status TEXT, -- 'ignored', 'sent_to_contact', 'contact_replied', 'meeting_booked', 'sale'
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indices für schnelle Queries
CREATE INDEX idx_ai_interactions_skill ON ai_interactions(skill_name);
CREATE INDEX idx_ai_interactions_outcome ON ai_interactions(outcome_status);
CREATE INDEX idx_ai_interactions_user ON ai_interactions(user_id);
```

2. Erstelle AI Wrapper Service:

```python
# backend/services/ai_service.py
from typing import Optional
import openai
import time
from uuid import UUID

class AIService:
    def __init__(self, db):
        self.db = db
    
    async def call_skill(
        self,
        skill_name: str,
        prompt: str,
        user_id: UUID,
        company_id: UUID,
        contact_id: Optional[UUID] = None,
        prompt_version: str = "v1.0",
        model: str = "gpt-4-turbo-preview"
    ) -> dict:
        """
        Unified AI call with automatic logging
        """
        start_time = time.time()
        
        # Call OpenAI
        response = await openai.ChatCompletion.acreate(
            model=model,
            messages=[{"role": "user", "content": prompt}],
            temperature=0.7
        )
        
        latency_ms = int((time.time() - start_time) * 1000)
        
        # Log interaction
        await self.db.table('ai_interactions').insert({
            "company_id": str(company_id),
            "user_id": str(user_id),
            "contact_id": str(contact_id) if contact_id else None,
            "skill_name": skill_name,
            "prompt_version": prompt_version,
            "model": model,
            "request_summary": {"prompt_length": len(prompt)},
            "response_summary": {"response_length": len(response.choices[0].message.content)},
            "latency_ms": latency_ms,
            "tokens_in": response.usage.prompt_tokens,
            "tokens_out": response.usage.completion_tokens
        }).execute()
        
        return {
            "content": response.choices[0].message.content,
            "interaction_id": interaction_id  # für späteres Outcome-Tracking
        }
```

3. Outcome-Tracking Endpoint:

```python
@router.post("/ai/interactions/{interaction_id}/outcome")
async def track_ai_outcome(interaction_id: UUID, outcome: str, was_used: bool):
    """Track what happened after AI suggestion"""
    await db.table('ai_interactions').update({
        "was_used": was_used,
        "outcome_status": outcome
    }).eq("id", str(interaction_id)).execute()
```

---

### 1.3 Skill-Orchestrator (statt Prompt-Zoo)

**Warum:** Zentrale Skill-Definition = einfacher erweiterbar, testbar, loggbar.

**Tasks:**

1. Erstelle Skills-Registry:

```python
# backend/ai/skills/__init__.py

SKILLS = {
    "mentor_chat": {
        "prompt_template": "prompts/mentor_v2.txt",
        "model": "gpt-4-turbo-preview",
        "version": "v2.0",
        "max_tokens": 1000,
        "temperature": 0.7
    },
    "analyze_objection": {
        "prompt_template": "prompts/objection_analyzer.txt",
        "model": "gpt-4-turbo-preview",
        "version": "v1.0",
        "max_tokens": 500,
        "temperature": 0.5
    },
    "disg_analyze": {
        "prompt_template": "prompts/disg_analyzer.txt",
        "model": "gpt-4-turbo-preview",
        "version": "v1.0",
        "max_tokens": 300,
        "temperature": 0.3
    },
    "generate_script": {
        "prompt_template": "prompts/script_generator.txt",
        "model": "gpt-4-turbo-preview",
        "version": "v1.0",
        "max_tokens": 500,
        "temperature": 0.7
    },
    "deal_health": {
        "prompt_template": "prompts/deal_health.txt",
        "model": "gpt-4-turbo-preview",
        "version": "v1.0",
        "max_tokens": 400,
        "temperature": 0.4
    },
    "ghostbuster": {
        "prompt_template": "prompts/ghostbuster.txt",
        "model": "gpt-4-turbo-preview",
        "version": "v1.0",
        "max_tokens": 300,
        "temperature": 0.5
    }
}
```

2. Erstelle unified Skill-Endpoint:

```python
# backend/routes/ai_skills.py
from fastapi import APIRouter, Depends
from ..ai.skills import SKILLS
from ..services.ai_service import AIService

router = APIRouter(prefix="/api/v2/ai/skills", tags=["ai-skills"])

@router.post("/{skill_name}")
async def execute_skill(
    skill_name: str,
    request: SkillRequest,
    user = Depends(get_current_user),
    ai_service: AIService = Depends()
):
    if skill_name not in SKILLS:
        raise HTTPException(404, f"Skill '{skill_name}' not found")
    
    skill_config = SKILLS[skill_name]
    
    # Load prompt template
    prompt = load_and_fill_template(
        skill_config["prompt_template"],
        request.context
    )
    
    # Execute with logging
    result = await ai_service.call_skill(
        skill_name=skill_name,
        prompt=prompt,
        user_id=user.id,
        company_id=user.company_id,
        contact_id=request.contact_id,
        prompt_version=skill_config["version"],
        model=skill_config["model"]
    )
    
    return result
```

3. Migriere alte Endpoints als Wrapper:

```python
# Alte Route bleibt bestehen, nutzt aber intern den Skill-Layer
@router.post("/v31/analyze-objection")
async def legacy_analyze_objection(request: ObjectionRequest):
    """Legacy endpoint - internally uses skill layer"""
    return await execute_skill("analyze_objection", request)
```

---

## PHASE 2: NETWORK MARKETING FOKUS (Woche 3-4)

### 2.1 Rename & Terminology

**Tasks:**

1. Globale Renames durchführen:

```
ALTE BEGRIFFE          →    NEUE BEGRIFFE (Network Marketing)
─────────────────────────────────────────────────────────────
CHIEF                  →    MENTOR
Daily Flow             →    DMO (Daily Method of Operation)
Leads                  →    Prospects / Kontakte
Follow-Ups             →    Check-ins
Outreach               →    Prospecting
Deal                   →    Opportunity
Close                  →    Abschluss
Pipeline Stages:
  - New                →    Kalt
  - Contacted          →    Warm
  - Qualified          →    Heiß
  - Closed             →    Kunde / Partner
```

2. Update alle UI-Texte in i18n:

```typescript
// i18n/de.json
{
  "navigation": {
    "home": "Home",
    "dmo": "DMO",
    "contacts": "Kontakte",
    "mentor": "MENTOR",
    "team": "Mein Team"
  },
  "dmo": {
    "title": "Dein DMO",
    "subtitle": "Daily Method of Operation",
    "new_contacts": "Neue Kontakte",
    "followups": "Check-ins",
    "presentations": "Präsentationen",
    "social_posts": "Social Posts"
  }
}
```

### 2.2 Andere Verticals verstecken

**Tasks:**

1. Feature Flag für Verticals:

```python
# backend/config/verticals.py
ACTIVE_VERTICALS = ["network_marketing"]  # Nur Network Marketing aktiv

# Später erweiterbar:
# ACTIVE_VERTICALS = ["network_marketing", "real_estate", "coaching"]
```

2. Im Frontend Vertical-Check:

```typescript
// utils/verticals.ts
const ACTIVE_VERTICALS = ['network_marketing'];

export const isVerticalActive = (vertical: string): boolean => {
  return ACTIVE_VERTICALS.includes(vertical);
};

// In Navigation/Screens verwenden um andere Verticals auszublenden
```

### 2.3 Script Library laden

**Tasks:**

1. Erstelle Tabelle `scripts`:

```sql
CREATE TABLE scripts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category TEXT NOT NULL, -- 'erstkontakt', 'followup', 'einwand', 'closing', 'onboarding', 'reaktivierung', 'social'
    subcategory TEXT, -- 'warm_market', 'keine_zeit', 'partner', etc.
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    disg_optimized TEXT, -- 'D', 'I', 'S', 'G' oder NULL für universal
    language TEXT DEFAULT 'de',
    tags TEXT[],
    usage_count INTEGER DEFAULT 0,
    success_count INTEGER DEFAULT 0, -- wenn Outcome positiv war
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

2. Seed die 52 Scripts aus meiner Script Library:

```python
# backend/scripts/seed_scripts.py
SCRIPTS_DATA = [
    {
        "category": "erstkontakt",
        "subcategory": "warm_market",
        "title": "Der ehrliche Ansatz",
        "content": """Hey [Name]! 👋

Ich weiß, das kommt jetzt vielleicht überraschend, aber ich hab 
vor kurzem etwas Spannendes angefangen und du bist eine der 
ersten Personen, an die ich gedacht habe.

Es geht um [Produkt/Thema] - und bevor du jetzt denkst "Oh nein, 
will der mir was verkaufen" 😅 - ich würde dir einfach gerne 
kurz zeigen, worum es geht. 

Wenn's nichts für dich ist, völlig okay. Aber ich würde mich 
über deine ehrliche Meinung freuen.

Hättest du diese Woche 15 Minuten Zeit für einen kurzen Call?""",
        "tags": ["proven", "classic", "warm"]
    },
    # ... alle 52 Scripts aus 01_SCRIPT_LIBRARY.md
]
```

### 2.4 MENTOR AI System Prompt integrieren

**Tasks:**

1. Lade den kompletten System Prompt aus `02_MENTOR_AI_SYSTEM_PROMPT.md`

2. Erstelle Prompt-Datei:

```
backend/ai/prompts/mentor_v2.txt
```

3. Integriere Action Tag Parser:

```python
# backend/services/mentor_service.py
import re
from typing import List, Dict

def parse_action_tags(response: str) -> List[Dict]:
    """Extract [[ACTION:TYPE:PARAMS]] tags from response"""
    pattern = r'\[\[ACTION:([A-Z_]+):?([^\]]*)\]\]'
    matches = re.findall(pattern, response)
    
    actions = []
    for match in matches:
        action_type = match[0]
        params = match[1].split(':') if match[1] else []
        actions.append({
            "type": action_type,
            "params": params
        })
    
    return actions

def remove_action_tags(response: str) -> str:
    """Remove action tags from visible response"""
    return re.sub(r'\[\[ACTION:[^\]]+\]\]', '', response).strip()
```

---

## PHASE 3: GUIDED MODE UX (Woche 5-6)

### 3.1 "Heute erledigen" Screen (Guided Daily Flow)

**Warum:** Ein Screen der den User durch den Tag zieht = maximale Adoption.

**Tasks:**

1. Erstelle neuen Screen `GuidedDailyFlow`:

```typescript
// screens/GuidedDailyFlowScreen.tsx

interface DailyFlowSection {
  id: string;
  title: string;
  emoji: string;
  items: FlowItem[];
  priority: number;
}

const GuidedDailyFlowScreen: React.FC = () => {
  const [sections, setSections] = useState<DailyFlowSection[]>([]);
  
  useEffect(() => {
    loadDailyFlow();
  }, []);
  
  const loadDailyFlow = async () => {
    // Hole alles in EINEM API-Call
    const response = await api.get('/api/v2/daily-flow/guided');
    
    setSections([
      {
        id: 'followups',
        title: 'Fällige Check-ins',
        emoji: '🔄',
        items: response.data.followups,
        priority: 1
      },
      {
        id: 'ghostbuster',
        title: 'Reaktivieren',
        emoji: '👻',
        items: response.data.ghostbuster_suggestions,
        priority: 2
      },
      {
        id: 'new_contacts',
        title: 'Heute kontaktieren',
        emoji: '👋',
        items: response.data.suggested_contacts,
        priority: 3
      },
      {
        id: 'dmo_progress',
        title: 'DMO Fortschritt',
        emoji: '📊',
        items: response.data.dmo_status,
        priority: 4
      }
    ]);
  };
  
  return (
    <ScrollView>
      <Header title="Heute erledigen" subtitle={getTodayDate()} />
      
      {sections.map(section => (
        <FlowSection 
          key={section.id}
          section={section}
          onItemComplete={handleItemComplete}
          onItemAction={handleItemAction}
        />
      ))}
      
      <MotivationBanner quote={dailyQuote} />
    </ScrollView>
  );
};
```

2. Backend Endpoint für Guided Flow:

```python
@router.get("/api/v2/daily-flow/guided")
async def get_guided_daily_flow(user = Depends(get_current_user)):
    """
    Returns everything needed for the Guided Daily Flow in ONE call
    """
    today = date.today()
    
    # 1. Fällige Follow-ups
    followups = await get_due_followups(user.id, today)
    
    # 2. GhostBuster Vorschläge (Kontakte ohne Antwort seit X Tagen)
    ghostbuster = await get_ghostbuster_suggestions(user.id, days=7)
    
    # 3. Vorgeschlagene neue Kontakte
    suggested = await get_contact_suggestions(user.id, limit=5)
    
    # 4. DMO Status
    dmo = await get_dmo_status(user.id, today)
    
    # 5. Motivations-Quote
    quote = get_daily_quote()
    
    return {
        "date": today.isoformat(),
        "followups": followups,
        "ghostbuster_suggestions": ghostbuster,
        "suggested_contacts": suggested,
        "dmo_status": dmo,
        "daily_quote": quote
    }
```

### 3.2 Navigation vereinfachen

**Tasks:**

1. Reduziere auf 5 Haupt-Tabs:

```typescript
// navigation/TabNavigator.tsx
const TABS = [
  { name: 'Home', icon: 'home', screen: GuidedDailyFlowScreen },
  { name: 'DMO', icon: 'check-circle', screen: DMOTrackerScreen },
  { name: 'Kontakte', icon: 'users', screen: ContactsScreen },
  { name: 'MENTOR', icon: 'message-circle', screen: MentorChatScreen },
  { name: 'Team', icon: 'people', screen: TeamDashboardScreen },
];
```

2. Alle anderen Screens als Sub-Screens (nicht Tabs):
   - Playbooks → unter MENTOR
   - Finance → unter Team
   - Sequences → unter Kontakte
   - Settings, Billing, etc. → Settings-Stack

---

## PHASE 4: TEAM FEATURES (Woche 7-8)

### 4.1 Team Dashboard

**Tasks:**

1. Erstelle `team_members` Tabelle:

```sql
CREATE TABLE team_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL,
    user_id UUID NOT NULL,
    upline_id UUID REFERENCES team_members(id),
    level INTEGER DEFAULT 1,
    
    -- Status & Activity
    status TEXT DEFAULT 'active', -- 'active', 'inactive', 'at_risk'
    last_activity TIMESTAMPTZ,
    
    -- Performance Metrics
    dmo_completion_rate DECIMAL(5,2) DEFAULT 0,
    contacts_this_week INTEGER DEFAULT 0,
    presentations_this_week INTEGER DEFAULT 0,
    
    -- Risk Assessment
    dropout_risk_score INTEGER DEFAULT 0, -- 0-100
    days_inactive INTEGER DEFAULT 0,
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

2. Dropout Prediction Job:

```python
# backend/jobs/dropout_prediction.py

async def calculate_dropout_risk(member_id: UUID) -> int:
    """
    Calculate dropout risk score (0-100) based on:
    - Days since last activity
    - DMO completion trend
    - Contact activity trend
    """
    member = await get_member(member_id)
    
    risk_score = 0
    
    # Factor 1: Inactivity (max 40 points)
    if member.days_inactive > 14:
        risk_score += 40
    elif member.days_inactive > 7:
        risk_score += 25
    elif member.days_inactive > 3:
        risk_score += 10
    
    # Factor 2: DMO Completion declining (max 30 points)
    if member.dmo_completion_rate < 20:
        risk_score += 30
    elif member.dmo_completion_rate < 50:
        risk_score += 15
    
    # Factor 3: Contact activity (max 30 points)
    if member.contacts_this_week == 0:
        risk_score += 30
    elif member.contacts_this_week < 5:
        risk_score += 15
    
    return min(100, risk_score)
```

3. Team Alerts System:

```python
# backend/services/team_alerts.py

async def check_team_alerts(leader_id: UUID) -> List[TeamAlert]:
    """Generate alerts for team members needing attention"""
    
    members = await get_team_members(leader_id)
    alerts = []
    
    for member in members:
        if member.dropout_risk_score >= 70:
            alerts.append(TeamAlert(
                member_id=member.id,
                member_name=member.name,
                type="dropout_risk",
                severity="high",
                message=f"Keine Aktivität seit {member.days_inactive} Tagen",
                suggested_action="Persönlicher Check-in Call"
            ))
        elif member.dropout_risk_score >= 40:
            alerts.append(TeamAlert(
                member_id=member.id,
                member_name=member.name,
                type="needs_coaching",
                severity="medium",
                message=f"DMO nur zu {member.dmo_completion_rate}% erledigt",
                suggested_action="Motivations-Nachricht senden"
            ))
    
    return alerts
```

---

## PHASE 5: DATA FLYWHEEL (Woche 9-10)

### 5.1 Script Success Tracking

**Tasks:**

1. Tracke welche Scripts wirklich funktionieren:

```python
@router.post("/api/v2/scripts/{script_id}/use")
async def track_script_usage(
    script_id: UUID,
    contact_id: UUID,
    outcome: str  # 'sent', 'replied', 'meeting', 'sale'
):
    """Track script usage and outcome"""
    
    # Increment usage count
    await db.table('scripts').update({
        "usage_count": scripts.usage_count + 1
    }).eq("id", str(script_id)).execute()
    
    # If positive outcome, increment success
    if outcome in ['replied', 'meeting', 'sale']:
        await db.table('scripts').update({
            "success_count": scripts.success_count + 1
        }).eq("id", str(script_id)).execute()
    
    # Log for AI training
    await log_script_outcome(script_id, contact_id, outcome)
```

2. Zeige Success Rate im UI:

```typescript
// components/ScriptCard.tsx
<View style={styles.scriptMeta}>
  <Text>Genutzt: {script.usage_count}x</Text>
  <Text>Erfolgsrate: {Math.round(script.success_count / script.usage_count * 100)}%</Text>
</View>
```

### 5.2 MENTOR lernt aus Erfolgen

**Tasks:**

1. Füge erfolgreiche Interaktionen zum Training hinzu:

```python
async def get_successful_examples(skill_name: str, limit: int = 5) -> List[dict]:
    """Get examples where AI suggestions led to positive outcomes"""
    
    return await db.table('ai_interactions')\
        .select('request_summary, response_summary')\
        .eq('skill_name', skill_name)\
        .eq('outcome_status', 'contact_replied')\
        .order('created_at', desc=True)\
        .limit(limit)\
        .execute()
```

2. Nutze Erfolgsbeispiele im Prompt:

```python
async def build_skill_prompt(skill_name: str, context: dict) -> str:
    """Build prompt with successful examples"""
    
    base_prompt = load_template(skill_name)
    
    # Add successful examples
    examples = await get_successful_examples(skill_name)
    if examples:
        examples_text = "\n\n".join([
            f"ERFOLGSBEISPIEL:\nInput: {ex['request_summary']}\nOutput: {ex['response_summary']}"
            for ex in examples
        ])
        base_prompt += f"\n\nHier sind Beispiele die funktioniert haben:\n{examples_text}"
    
    return base_prompt.format(**context)
```

---

## PHASE 6: GO-TO-MARKET PREP (Woche 11-12)

### 6.1 Team Packs Pricing implementieren

**Tasks:**

1. Plans & Pricing Config:

```python
# backend/config/pricing.py

PRICING_PLANS = {
    "starter": {
        "name": "Starter",
        "price_monthly": 0,
        "contacts_limit": 50,
        "mentor_messages_daily": 10,
        "team_members": 0,
        "features": ["basic_dmo", "basic_scripts"]
    },
    "pro": {
        "name": "Pro",
        "price_monthly": 999,  # 9.99€
        "contacts_limit": -1,  # unlimited
        "mentor_messages_daily": -1,
        "team_members": 0,
        "features": ["full_dmo", "full_scripts", "mentor_unlimited", "disg", "deal_health"]
    },
    "team_5": {
        "name": "Team 5",
        "price_monthly": 2499,  # 24.99€
        "contacts_limit": -1,
        "mentor_messages_daily": -1,
        "team_members": 5,
        "features": ["all_pro", "team_dashboard", "dropout_alerts", "team_playbooks"]
    },
    "team_10": {
        "name": "Team 10",
        "price_monthly": 3999,  # 39.99€
        "contacts_limit": -1,
        "mentor_messages_daily": -1,
        "team_members": 10,
        "features": ["all_team_5", "priority_support", "custom_playbooks"]
    }
}
```

2. Feature Gates:

```python
# backend/services/feature_gate.py

async def check_feature_access(user_id: UUID, feature: str) -> bool:
    """Check if user has access to feature based on plan"""
    
    subscription = await get_user_subscription(user_id)
    plan = PRICING_PLANS.get(subscription.plan)
    
    if not plan:
        return False
    
    return feature in plan["features"]
```

### 6.2 Onboarding Flow für Network Marketing

**Tasks:**

1. Erstelle Onboarding Screens:

```typescript
// screens/Onboarding/
// - WelcomeScreen.tsx
// - CompanySelectScreen.tsx (welche MLM-Firma?)
// - GoalsScreen.tsx (was willst du erreichen?)
// - FirstContactsImportScreen.tsx (WhatsApp-Import)
// - DMOSetupScreen.tsx (Ziele setzen)
// - MentorIntroScreen.tsx (MENTOR kennenlernen)
```

2. Network Marketing Companies Dropdown:

```typescript
const MLM_COMPANIES = [
  { id: 'pm_international', name: 'PM International' },
  { id: 'lr_health', name: 'LR Health & Beauty' },
  { id: 'forever_living', name: 'Forever Living' },
  { id: 'juice_plus', name: 'Juice Plus' },
  { id: 'ringana', name: 'Ringana' },
  { id: 'doterra', name: 'doTERRA' },
  { id: 'herbalife', name: 'Herbalife' },
  { id: 'amway', name: 'Amway' },
  { id: 'other', name: 'Andere' }
];
```

---

## QUALITÄTS-RICHTLINIEN

1. **Keine Breaking Changes** - Migriere schrittweise
2. **RLS überall** - Jede neue Tabelle mit Row Level Security
3. **TypeScript strict** - Keine `any` Types
4. **Logging** - Jede wichtige Aktion loggen
5. **Error Handling** - User-freundliche Fehlermeldungen

---

## DATEI-REFERENZEN

Nutze diese Dateien als Referenz für Content:

- **Scripts:** Lade alle 52 Scripts aus `/docs/01_SCRIPT_LIBRARY.md`
- **System Prompt:** Nutze den MENTOR AI Prompt aus `/docs/02_MENTOR_AI_SYSTEM_PROMPT.md`
- **API Spec:** Folge der Struktur aus `/docs/05_API_SPECIFICATION.md`

---

## COMMIT STRATEGIE

```
Phase 1: feat: add event-job-layer and ai-logging
Phase 2: feat: network-marketing-focus and scripts
Phase 3: feat: guided-daily-flow-ux
Phase 4: feat: team-dashboard-and-alerts
Phase 5: feat: data-flywheel-tracking
Phase 6: feat: pricing-and-onboarding
```

---

**START MIT PHASE 1.1 (Event-/Job-Layer)**
