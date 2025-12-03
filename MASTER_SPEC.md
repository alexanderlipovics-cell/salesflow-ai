# 📋 SALES FLOW AI – MASTER FEATURE SPECIFICATION

**Version:** 2.0  
**Last Updated:** November 30, 2025  
**Status:** Production-Ready Design

---

## 📖 DOCUMENT PURPOSE

Dieses Dokument ist die **vollständige technische Spezifikation** für alle 18+ Features von Sales Flow AI.

**Zielgruppe:**
- Entwickler (Implementation Guide)
- Product Manager (Feature Scope)
- Stakeholder (Was wird gebaut?)

**Struktur:**
- Jedes Feature hat: Problem, Solution, Tech Stack, Database Schema, API Endpoints, UI/UX, Example
- Cluster-basiert (6 Clusters)
- Priorisierung: Must-Have vs. Nice-to-Have

---

## 🎯 FEATURE PRIORIZATION

### **Phase 1: MVP (Weeks 1-4)**
**Must-Have für Launch:**
- ✅ LIABILITY-SHIELD (Protection)
- ✅ SPEED-HUNTER LOOP (Workflow)
- ✅ EINWAND-KILLER (Psychology)
- ✅ GHOSTBUSTER (Workflow)
- ✅ AUTO-MEMORY (Workflow)

### **Phase 2: Core Features (Weeks 5-8)**
**Erweitert MVP:**
- ✅ SCREENSHOT-REACTIVATOR (Acquisition)
- ✅ PORTFOLIO-SCANNER (Workflow)
- ✅ NEURO-PROFILER (Psychology)
- ✅ CRM-FORMATTER (Workflow)
- ✅ SQUAD-CHALLENGES (Team)

### **Phase 3: Advanced (Weeks 9-12)**
**Nice-to-Have / Differentiator:**
- ✅ OPPORTUNITY RADAR (Acquisition)
- ✅ VISION INTERFACE (Acquisition)
- ✅ BATTLE-CARD (Psychology)
- ✅ DEAL-MEDIC (Psychology)
- ✅ VERHANDLUNGS-JUDO (Psychology)
- ✅ EMPFEHLUNGS-MASCHINE (Workflow)
- ✅ FEUERLÖSCHER (Protection)
- ✅ CLIENT INTAKE (Acquisition)
- ✅ SOCIAL-LINK-GENERATOR (Acquisition)
- ✅ TEMPLATE INTELLIGENCE (Analytics)

---

## 🛡️ CLUSTER 1: PROTECTION (Foundation)

### FEATURE 1: LIABILITY-SHIELD

**Priority:** 🔴 **CRITICAL** (MVP)

#### Problem Statement
Network Marketer machen unbewusst Heilversprechen oder Income Claims, die gegen HWG (Heilmittelwerbegesetz) oder UWG (Gesetz gegen unlauteren Wettbewerb) verstoßen.

**Beispiele:**
- "Mit unserem Produkt wirst du garantiert abnehmen!"
- "Du kannst 5.000€/Monat verdienen!"
- "100% Erfolgsgarantie!"

#### Solution
Real-time Compliance Scanner, der:
1. **VOR Versand** alle Texte scannt
2. **Verstöße erkennt** (HWG, UWG, Income Claims)
3. **Alternativtexte vorschlägt** (compliant)
4. **Loggt** alle Violations für Audit

#### Tech Stack
- **AI:** OpenAI Moderation API
- **Regex:** Custom Patterns für HWG/UWG
- **Database:** PostgreSQL (Supabase)
- **Backend:** FastAPI (Python)

#### Database Schema

```sql
-- Compliance Rules (Pre-defined)
CREATE TABLE compliance_rules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  rule_name TEXT NOT NULL,
  rule_type TEXT NOT NULL, -- 'hwg', 'uwg', 'income_claim', 'custom'
  pattern TEXT, -- Regex pattern
  severity TEXT DEFAULT 'warning', -- 'warning', 'error', 'block'
  description TEXT,
  example_violation TEXT,
  example_fix TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Compliance Violations (Log)
CREATE TABLE compliance_violations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id),
  lead_id UUID REFERENCES leads(id),
  rule_id UUID REFERENCES compliance_rules(id),
  original_text TEXT NOT NULL,
  suggested_fix TEXT,
  severity TEXT,
  status TEXT DEFAULT 'pending', -- 'pending', 'fixed', 'ignored'
  detected_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  resolved_at TIMESTAMP WITH TIME ZONE
);

-- Asset Permissions (What can be sent?)
CREATE TABLE asset_permissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id),
  asset_type TEXT NOT NULL, -- 'message', 'post', 'email', 'whatsapp'
  content_hash TEXT, -- Hash of content for deduplication
  compliance_status TEXT, -- 'approved', 'rejected', 'pending'
  approved_by UUID REFERENCES auth.users(id),
  approved_at TIMESTAMP WITH TIME ZONE,
  expires_at TIMESTAMP WITH TIME ZONE
);
```

#### API Endpoints

```python
# POST /api/compliance/check
# Input: { "text": "Mit unserem Produkt wirst du garantiert abnehmen!" }
# Output: {
#   "is_compliant": false,
#   "violations": [
#     {
#       "rule_id": "...",
#       "rule_name": "HWG Heilversprechen",
#       "severity": "error",
#       "original_text": "garantiert abnehmen",
#       "suggested_fix": "Viele Nutzer berichten von positiven Erfahrungen..."
#     }
#   ],
#   "suggested_text": "..."
# }

# GET /api/compliance/violations
# Returns: List of user's violations

# POST /api/compliance/approve
# Input: { "violation_id": "...", "action": "fix" | "ignore" }
```

#### UI/UX

**Message Composer:**
```
[User types message]
┌─────────────────────────────────────┐
│ Hallo Lisa, mit unserem Produkt...  │
└─────────────────────────────────────┘
         ↓
🛑 COMPLIANCE CHECK
┌─────────────────────────────────────┐
│ ⚠️  HWG Verstoß erkannt              │
│                                      │
│ Original: "garantiert abnehmen"     │
│                                      │
│ Vorschlag:                          │
│ "Viele Nutzer berichten von         │
│  positiven Erfahrungen..."          │
│                                      │
│ [Fix übernehmen] [Ignorieren]       │
└─────────────────────────────────────┘
```

#### Example Flow

```
1. User schreibt: "Mit unserem Produkt wirst du garantiert abnehmen!"
2. System scannt → HWG Verstoß erkannt
3. UI zeigt Warning + Suggested Fix
4. User klickt "Fix übernehmen"
5. Text wird automatisch ersetzt
6. Violation wird geloggt (für Audit)
7. Message kann versendet werden
```

#### Success Metrics
- **Compliance Violations prevented:** > 95%
- **False Positives:** < 5%
- **User Adoption:** > 80% nutzen Fix-Vorschläge

---

### FEATURE 12: FEUERLÖSCHER

**Priority:** 🟡 **IMPORTANT** (Phase 3)

#### Problem Statement
Wütende Leads/Kunden eskalieren. Network Marketer wissen nicht, wie sie professionell de-eskalieren sollen.

#### Solution
L.E.A.F. De-Escalation-Protokoll:
- **L**isten – Verstehe das Problem
- **E**mpathize – Zeige Verständnis
- **A**ddress – Lösungsvorschlag
- **F**ollow-up – Nachfassen

#### Tech Stack
- **Sentiment Analysis:** OpenAI Moderation
- **Response Generation:** GPT-4 mit L.E.A.F. Prompt
- **Database:** PostgreSQL

#### Database Schema

```sql
CREATE TABLE deescalation_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id),
  lead_id UUID REFERENCES leads(id),
  original_message TEXT NOT NULL,
  sentiment_score DECIMAL(3,2), -- -1.0 to 1.0
  sentiment_label TEXT, -- 'angry', 'frustrated', 'neutral', 'positive'
  leaf_stage TEXT, -- 'listen', 'empathize', 'address', 'follow_up'
  suggested_response TEXT,
  user_response TEXT, -- What user actually sent
  outcome TEXT, -- 'resolved', 'escalated', 'pending'
  resolved_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### API Endpoints

```python
# POST /api/deescalation/analyze
# Input: { "message": "Das ist eine Katastrophe!" }
# Output: {
#   "sentiment": "angry",
#   "score": -0.85,
#   "suggested_response": "...",
#   "leaf_stage": "empathize"
# }

# POST /api/deescalation/log
# Logs the interaction
```

#### UI/UX

```
[Lead sends angry message]
┌─────────────────────────────────────┐
│ 🔥 ESKALATION ERKANNT                │
│                                      │
│ Sentiment: Wütend (-0.85)           │
│                                      │
│ L.E.A.F. Protokoll:                 │
│ ✅ Listen (done)                     │
│ ⏳ Empathize (current)               │
│                                      │
│ Vorschlag:                          │
│ "Ich verstehe deine Frustration..."  │
│                                      │
│ [Response senden] [Manuell]         │
└─────────────────────────────────────┘
```

---

## 🎯 CLUSTER 2: ACQUISITION (Pipeline)

### FEATURE 2: SCREENSHOT-REACTIVATOR

**Priority:** 🟢 **HIGH** (Phase 2)

#### Problem Statement
Alte WhatsApp/Instagram Screenshots = verlorene Leads. User hat 50+ Screenshots, aber keine strukturierten Daten.

#### Solution
OCR extrahiert:
- Namen
- Telefonnummern
- Letzten Stand (aus Chat-Verlauf)
- → Strukturierte Leads + Suggested Next Actions

#### Tech Stack
- **OCR:** OpenAI Vision API
- **NER:** Named Entity Recognition (OpenAI)
- **Database:** PostgreSQL

#### Database Schema

```sql
CREATE TABLE screenshot_imports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id),
  image_url TEXT NOT NULL,
  ocr_text TEXT, -- Raw OCR output
  extracted_leads JSONB, -- Array of {name, phone, last_message, ...}
  status TEXT DEFAULT 'processing', -- 'processing', 'completed', 'failed'
  leads_created INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE
);
```

#### API Endpoints

```python
# POST /api/screenshots/upload
# Input: FormData with image file
# Output: {
#   "import_id": "...",
#   "status": "processing",
#   "estimated_time": 30
# }

# GET /api/screenshots/{import_id}/status
# Returns: {
#   "status": "completed",
#   "leads_extracted": 10,
#   "leads": [...]
# }

# POST /api/screenshots/{import_id}/create-leads
# Creates leads from extracted data
```

#### UI/UX

```
[Screenshot Upload]
┌─────────────────────────────────────┐
│ 📸 Screenshot hochladen              │
│                                      │
│ [Drag & Drop or Click]              │
│                                      │
│ Processing... ⏳                     │
│                                      │
│ ✅ 10 Kontakte gefunden              │
│                                      │
│ [Preview] [Alle importieren]        │
└─────────────────────────────────────┘
```

#### Example Flow

```
1. User uploads WhatsApp screenshot
2. OCR extracts text
3. NER identifies: names, phone numbers, dates
4. System suggests: "Last contact: 14 days ago"
5. User reviews extracted leads
6. Clicks "Import all"
7. 10 new leads created in CRM
```

---

### FEATURE 3: OPPORTUNITY RADAR

**Priority:** 🟡 **MEDIUM** (Phase 3)

#### Problem Statement
"Ich bin in München – wen kenne ich hier?"

#### Solution
Geo-based Lead Search + Local Prospect Finder.

#### Tech Stack
- **Geo:** PostGIS (PostgreSQL Extension)
- **Search:** Web-Suche (Google Places API)
- **Database:** PostgreSQL

#### Database Schema

```sql
-- Extend leads table
ALTER TABLE leads ADD COLUMN IF NOT EXISTS location POINT;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS city TEXT;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS country TEXT;

CREATE INDEX idx_leads_location ON leads USING GIST(location);

CREATE TABLE geo_search_cache (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id),
  search_query TEXT NOT NULL,
  location POINT,
  radius_km INTEGER DEFAULT 50,
  results JSONB,
  cached_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() + INTERVAL '24 hours'
);
```

#### API Endpoints

```python
# GET /api/geo/search?lat=48.1351&lon=11.5820&radius=50
# Returns: Leads within radius

# POST /api/geo/find-prospects
# Input: { "city": "München", "industry": "network_marketing" }
# Returns: Local prospects (from web search)
```

---

### FEATURE 5: SOCIAL-LINK-GENERATOR

**Priority:** 🟡 **MEDIUM** (Phase 3)

#### Problem Statement
Copy-Paste Links nerven und sind fehleranfällig.

#### Solution
1-Click WhatsApp/Instagram Links mit pre-filled Text & Tracking.

#### Database Schema

```sql
CREATE TABLE generated_links (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id),
  lead_id UUID REFERENCES leads(id),
  link_type TEXT NOT NULL, -- 'whatsapp', 'instagram', 'telegram'
  phone_number TEXT, -- For WhatsApp
  username TEXT, -- For Instagram
  pre_filled_text TEXT,
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  click_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### API Endpoints

```python
# POST /api/links/generate
# Input: {
#   "type": "whatsapp",
#   "phone": "+49123456789",
#   "text": "Hallo {{name}}..."
# }
# Output: {
#   "url": "https://wa.me/49123456789?text=...",
#   "short_url": "https://sfa.ai/l/abc123"
# }
```

---

### FEATURE 16: CLIENT INTAKE

**Priority:** 🟡 **MEDIUM** (Phase 3)

#### Problem Statement
Unstrukturierte Notizen & Voice-Memos.

#### Solution
AI wandelt Voice/Text in strukturierte Profile & Fragebögen.

#### Database Schema

```sql
CREATE TABLE intake_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  vertical TEXT, -- 'network', 'real_estate', 'finance'
  questions JSONB, -- Array of questions
  is_active BOOLEAN DEFAULT true
);

CREATE TABLE intake_responses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id),
  lead_id UUID REFERENCES leads(id),
  template_id UUID REFERENCES intake_templates(id),
  raw_input TEXT, -- Voice transcript or text
  structured_data JSONB, -- Extracted fields
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

---

### FEATURE 17: VISION INTERFACE

**Priority:** 🟡 **MEDIUM** (Phase 3)

#### Problem Statement
Lead schickt Foto (z.B. Konkurrenzprodukt).

#### Solution
AI analysiert Bild, erkennt Inhalte, vergleicht, schlägt Antwort vor.

#### Database Schema

```sql
CREATE TABLE image_analyses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id),
  lead_id UUID REFERENCES leads(id),
  image_url TEXT NOT NULL,
  analysis_type TEXT, -- 'product_comparison', 'document', 'general'
  detected_objects JSONB,
  comparison_result JSONB,
  suggested_response TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

---

## 🧠 CLUSTER 3: PSYCHOLOGY (Brain)

### FEATURE 7: EINWAND-KILLER

**Priority:** 🔴 **CRITICAL** (MVP)

#### Problem Statement
"Keine Zeit", "Zu teuer", "MLM ist unseriös".

#### Solution
3 Response-Strategien (Logisch, Emotional, Provokativ), optional typgerecht (DISC).

#### Database Schema

```sql
-- Extend sales_content table
ALTER TABLE sales_content ADD COLUMN IF NOT EXISTS objection_type TEXT;
ALTER TABLE sales_content ADD COLUMN IF NOT EXISTS response_strategy TEXT; -- 'logical', 'emotional', 'provocative'
ALTER TABLE sales_content ADD COLUMN IF NOT EXISTS disc_type TEXT; -- 'D', 'I', 'S', 'C'

CREATE TABLE objection_responses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  objection_text TEXT NOT NULL,
  category TEXT, -- 'price', 'time', 'trust', 'competitor'
  response_logical TEXT,
  response_emotional TEXT,
  response_provocative TEXT,
  disc_adaptation JSONB, -- How to adapt per DISC type
  success_rate DECIMAL(5,2), -- Tracked performance
  times_used INTEGER DEFAULT 0
);
```

#### API Endpoints

```python
# POST /api/objections/handle
# Input: {
#   "objection": "Ich habe keine Zeit",
#   "lead_disc_type": "D",  # Optional
#   "strategy": "logical"  # Optional, defaults to all
# }
# Output: {
#   "responses": {
#     "logical": "...",
#     "emotional": "...",
#     "provocative": "..."
#   },
#   "recommended": "logical"  # Based on DISC type
# }
```

---

### FEATURE 8: BATTLE-CARD

**Priority:** 🟡 **MEDIUM** (Phase 3)

#### Problem Statement
"Ich bin schon bei [Konkurrenz]".

#### Solution
Instant Competitor Comparison mit fairen Talking Points.

#### Database Schema

```sql
CREATE TABLE competitor_battle_cards (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  competitor_name TEXT NOT NULL,
  industry TEXT,
  strengths JSONB,
  weaknesses JSONB,
  talking_points JSONB, -- Fair comparison points
  our_advantages JSONB,
  is_active BOOLEAN DEFAULT true
);
```

---

### FEATURE 9: NEURO-PROFILER

**Priority:** 🟢 **HIGH** (Phase 2)

#### Problem Statement
One-size-fits-all Messaging.

#### Solution
DISC-inspirierte Typ-Erkennung aus Text → passende Ansprache.

#### Database Schema

```sql
CREATE TABLE disc_analyses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lead_id UUID REFERENCES leads(id),
  analyzed_text TEXT, -- Source text
  disc_type TEXT, -- 'D', 'I', 'S', 'C'
  confidence_score DECIMAL(3,2), -- 0.0 to 1.0
  traits JSONB, -- Detailed traits
  recommended_approach TEXT,
  analyzed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE leads ADD COLUMN IF NOT EXISTS disc_type TEXT;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS disc_confidence DECIMAL(3,2);
```

#### API Endpoints

```python
# POST /api/disc/analyze
# Input: { "text": "Lead's message history" }
# Output: {
#   "disc_type": "D",
#   "confidence": 0.85,
#   "traits": {...},
#   "recommended_approach": "..."
# }
```

---

### FEATURE 11: DEAL-MEDIC (B.A.N.T.)

**Priority:** 🟡 **MEDIUM** (Phase 3)

#### Problem Statement
Deal stockt – aber warum?

#### Solution
Diagnose, ob Budget, Authority, Need oder Timing fehlt.

#### Database Schema

```sql
CREATE TABLE deal_health_checks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lead_id UUID REFERENCES leads(id),
  bant_score JSONB, -- {budget: 0.8, authority: 0.6, need: 0.9, timing: 0.4}
  overall_score DECIMAL(3,2),
  missing_factors TEXT[], -- ['authority', 'timing']
  recommendations TEXT[],
  checked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

---

### FEATURE 15: VERHANDLUNGS-JUDO

**Priority:** 🟡 **MEDIUM** (Phase 3)

#### Problem Statement
"Zu teuer!"

#### Solution
Preis-Reframing, Value-Stack, Cost-of-Inaction.

#### Database Schema

```sql
CREATE TABLE price_objection_responses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  objection_text TEXT NOT NULL,
  value_stack JSONB, -- What they get
  cost_of_inaction TEXT,
  reframing_approach TEXT,
  payment_options JSONB, -- Installments, etc.
  success_rate DECIMAL(5,2)
);
```

---

## ⚙️ CLUSTER 4: WORKFLOW (Engine)

### FEATURE 4: SPEED-HUNTER LOOP

**Priority:** 🔴 **CRITICAL** (MVP)

#### Problem Statement
User verliert sich in CRM-Listen.

#### Solution
"Tinder-Modus" – immer nur der eine nächste Kontakt, kein Scroll-Overload.

#### Database Schema

```sql
CREATE TABLE speed_hunter_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id),
  target_count INTEGER DEFAULT 20, -- Daily goal
  completed_count INTEGER DEFAULT 0,
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE
);

CREATE TABLE speed_hunter_actions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID REFERENCES speed_hunter_sessions(id),
  lead_id UUID REFERENCES leads(id),
  action_type TEXT NOT NULL, -- 'call', 'message', 'snooze', 'done'
  template_used UUID REFERENCES message_templates(id),
  outcome TEXT, -- 'positive', 'neutral', 'negative', 'no_answer'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### API Endpoints

```python
# POST /api/speed-hunter/start
# Creates new session, returns next lead

# GET /api/speed-hunter/next
# Returns: {
#   "lead": {...},
#   "suggested_template": {...},
#   "progress": "12/20"
# }

# POST /api/speed-hunter/action
# Input: { "action": "call" | "message" | "snooze" | "done" }
```

---

### FEATURE 6: PORTFOLIO-SCANNER

**Priority:** 🟢 **HIGH** (Phase 2)

#### Problem Statement
500 Leads – wen zuerst kontaktieren?

#### Solution
Batch Scoring → priorisierte Action List.

#### Database Schema

```sql
CREATE TABLE portfolio_scans (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id),
  scan_type TEXT DEFAULT 'full', -- 'full', 'quick', 'custom'
  criteria JSONB, -- Scoring criteria
  results JSONB, -- Prioritized leads
  total_leads INTEGER,
  urgent_count INTEGER,
  this_week_count INTEGER,
  nurture_count INTEGER,
  scanned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

---

### FEATURE 10: CRM-FORMATTER

**Priority:** 🟢 **HIGH** (Phase 2)

#### Problem Statement
"Hatte ein Call mit Lisa, sie ist interessiert..."

#### Solution
Voice/Text → strukturierter CRM-Entry + Next Step.

#### Database Schema

```sql
CREATE TABLE crm_auto_reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id),
  lead_id UUID REFERENCES leads(id),
  raw_input TEXT, -- Voice transcript or text
  structured_data JSONB, -- Extracted: date, outcome, next_step, etc.
  confidence_score DECIMAL(3,2),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

---

### FEATURE 13: EMPFEHLUNGS-MASCHINE

**Priority:** 🟡 **MEDIUM** (Phase 3)

#### Problem Statement
Wann & wie nach Referrals fragen?

#### Solution
Trigger Detection + ideale Referral-Scripts.

#### Database Schema

```sql
CREATE TABLE referral_moments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lead_id UUID REFERENCES leads(id),
  conversation_text TEXT,
  sentiment_score DECIMAL(3,2),
  trigger_phrases TEXT[], -- ['super', 'toll', 'begeistert']
  confidence DECIMAL(3,2),
  suggested_script TEXT,
  used_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

---

### FEATURE 14: GHOSTBUSTER

**Priority:** 🔴 **CRITICAL** (MVP)

#### Problem Statement
Lead antwortet nicht mehr.

#### Solution
Re-Engagement-Sequenzen (z.B. Day 14 / Day 21 / Day 30).

#### Database Schema

```sql
CREATE TABLE ghostbuster_campaigns (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id),
  lead_id UUID REFERENCES leads(id),
  sequence_type TEXT DEFAULT 'standard', -- 'standard', 'aggressive', 'soft'
  current_step INTEGER DEFAULT 0,
  next_action_at TIMESTAMP WITH TIME ZONE,
  last_contact_date DATE,
  days_since_last_contact INTEGER,
  status TEXT DEFAULT 'active', -- 'active', 're_engaged', 'paused'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

---

### FEATURE 18: AUTO-MEMORY

**Priority:** 🔴 **CRITICAL** (MVP)

#### Problem Statement
"Wie war nochmal der Name ihrer Tochter?"

#### Solution
Kontext-Awareness: AI erkennt & speichert wichtige Hinweise.

#### Database Schema

```sql
CREATE TABLE lead_memory (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lead_id UUID REFERENCES leads(id),
  memory_type TEXT, -- 'personal', 'preference', 'pain_point', 'goal'
  memory_text TEXT NOT NULL,
  embedding VECTOR(1536), -- OpenAI embedding
  importance_score DECIMAL(3,2) DEFAULT 0.5,
  mentioned_count INTEGER DEFAULT 1,
  first_mentioned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_mentioned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Vector index for similarity search
CREATE INDEX idx_lead_memory_embedding ON lead_memory 
USING ivfflat (embedding vector_cosine_ops);
```

#### API Endpoints

```python
# POST /api/memory/add
# Input: { "lead_id": "...", "text": "Lead mentioned daughter's wedding in June" }
# AI extracts: memory_type, importance, etc.

# GET /api/memory/{lead_id}
# Returns: All memories for lead, sorted by importance

# POST /api/memory/search
# Input: { "query": "daughter wedding" }
# Returns: Similar memories (vector search)
```

---

## 👥 CLUSTER 5: TEAM & GAMIFICATION

### SQUAD-CHALLENGES

**Priority:** 🟢 **HIGH** (Phase 2)

#### Database Schema

```sql
CREATE TABLE squads (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  leader_id UUID REFERENCES auth.users(id),
  company_id UUID REFERENCES mlm_companies(id),
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE squad_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  squad_id UUID REFERENCES squads(id),
  user_id UUID REFERENCES auth.users(id),
  role TEXT DEFAULT 'member', -- 'leader', 'member'
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(squad_id, user_id)
);

CREATE TABLE squad_challenges (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  squad_id UUID REFERENCES squads(id),
  name TEXT NOT NULL,
  description TEXT,
  challenge_type TEXT, -- 'new_partners', 'revenue', 'activity', 'custom'
  target_value INTEGER,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  status TEXT DEFAULT 'active', -- 'active', 'completed', 'cancelled'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE squad_scores (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  challenge_id UUID REFERENCES squad_challenges(id),
  user_id UUID REFERENCES auth.users(id),
  metric_type TEXT, -- 'new_partners', 'revenue', 'points'
  current_value INTEGER DEFAULT 0,
  target_value INTEGER,
  last_updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(challenge_id, user_id, metric_type)
);
```

---

## 📊 CLUSTER 6: TEMPLATE INTELLIGENCE

### TEMPLATE PERFORMANCE TRACKING

**Priority:** 🟡 **MEDIUM** (Phase 3)

#### Database Schema

```sql
CREATE TABLE template_performance (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  template_id UUID REFERENCES message_templates(id),
  user_id UUID REFERENCES auth.users(id),
  times_used INTEGER DEFAULT 0,
  times_sent INTEGER DEFAULT 0,
  times_delivered INTEGER DEFAULT 0,
  times_opened INTEGER DEFAULT 0,
  times_clicked INTEGER DEFAULT 0,
  times_replied INTEGER DEFAULT 0,
  times_positive_reply INTEGER DEFAULT 0,
  times_converted INTEGER DEFAULT 0,
  delivery_rate DECIMAL(5,2),
  open_rate DECIMAL(5,2),
  response_rate DECIMAL(5,2),
  conversion_rate DECIMAL(5,2),
  performance_score DECIMAL(5,2), -- Weighted by funnel stage
  last_updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

---

## 🎯 IMPLEMENTATION NOTES

### Database Migrations
- Alle Schemas sind **idempotent** (IF NOT EXISTS)
- Migration Order: Core Tables → Feature Tables → Indexes → Views
- RLS Policies müssen nach Schema-Deploy aktiviert werden

### API Design
- RESTful Endpoints
- Consistent Error Handling
- Rate Limiting (100 req/min per user)
- Authentication: Supabase JWT

### Performance
- Indexes auf allen Foreign Keys
- Partial Indexes für häufige Queries
- Caching: Redis (optional, für Phase 3)

---

## 📚 RELATED DOCUMENTS

- **README.md** – Product Overview
- **IMPLEMENTATION_ROADMAP.md** – 12-Week Plan
- **DATABASE_SCHEMA.sql** – Complete SQL Schema

---

**Last Updated:** November 30, 2025  
**Version:** 2.0  
**Status:** Production-Ready Design

