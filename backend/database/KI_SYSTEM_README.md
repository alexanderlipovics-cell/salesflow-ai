# 🧠 Sales Flow AI - KI System Documentation

## 📋 Inhaltsverzeichnis

1. [Überblick](#überblick)
2. [Architektur](#architektur)
3. [Installation](#installation)
4. [Module](#module)
5. [API Endpoints](#api-endpoints)
6. [Best Practices](#best-practices)
7. [Troubleshooting](#troubleshooting)

---

## 🎯 Überblick

Das **Sales Flow AI KI System** ist eine vollständige Intelligence-Plattform für vertriebsorientierte KI-Features:

### Kernkomponenten:

- **DEAL-MEDIC** (BANT Assessment) → Deal-Qualifizierung
- **NEURO-PROFILER** (DISG) → Persönlichkeitsanalyse
- **AUTO-MEMORY** → Automatische Lead-Context-Summaries
- **AI RECOMMENDATIONS** → Next Best Actions
- **LIABILITY-SHIELD** → Compliance-Checking
- **ANALYTICS** → Performance Dashboards

---

## 🏗️ Architektur

### Database Layer (PostgreSQL + Supabase)

```
📊 10 Core Tables:
├─ bant_assessments          → BANT-Scores (Budget/Authority/Need/Timeline)
├─ personality_profiles       → DISG-Profile (D/I/S/C)
├─ lead_context_summaries     → Auto-Memory Context
├─ ai_recommendations         → Next Actions
├─ compliance_logs            → Liability-Shield Logs
├─ lead_embeddings            → Semantic Search (Vector)
├─ success_patterns           → Learning Engine
├─ playbook_executions        → Playbook Tracking
├─ ai_coaching_sessions       → GPT Chat Sessions
└─ channel_performance_metrics → Channel Intelligence

📈 4 Materialized Views:
├─ view_leads_scored          → Scored Leads (Health Score)
├─ view_followups_scored      → Priority Actions
├─ view_conversion_microsteps → Funnel Analytics
└─ view_personality_insights  → DISG Performance

🔧 7 RPC Functions:
├─ generate_disg_recommendations() → DISG-basierte Empfehlungen
├─ update_lead_memory()            → Context Update
├─ log_ai_output_compliance()      → Compliance Logging
├─ recommend_followup_actions()    → Next Best Actions
├─ get_best_contact_window()       → Channel Intelligence
├─ get_lead_intelligence()         → Complete Intelligence
└─ create_ai_recommendation()      → Create Recommendation

⚡ 7 Auto-Triggers:
├─ Auto-generate BANT recommendations
├─ Auto-suggest personality profiling
├─ Auto-update lead context on new messages
├─ Time-decay recommendations (14+ days no contact)
├─ Auto-expire old recommendations
├─ Compliance violation alerts
└─ Playbook completion recommendations
```

### Backend Layer (FastAPI + Python)

```
🐍 Services:
└─ KIIntelligenceService → Core KI Logic

🛣️ Routers:
└─ /api/ki/* → 30+ Endpoints

🧠 GPT-4 Integration:
├─ AI_COACH_SYSTEM_PROMPT
├─ DEAL_MEDIC_SYSTEM_PROMPT
├─ NEURO_PROFILER_SYSTEM_PROMPT
├─ FEUERLÖSCHER_SYSTEM_PROMPT
└─ COMPLIANCE_FILTER_PROMPT
```

---

## 🚀 Installation

### Voraussetzungen:

- PostgreSQL 14+ mit pgvector Extension
- Python 3.11+
- OpenAI API Key (GPT-4 Access)
- Supabase Project (optional, aber empfohlen)

### Schritt 1: Database Setup

```bash
# 1. Navigiere zum database Ordner
cd backend/database

# 2. BACKUP ERSTELLEN (wichtig!)
pg_dump -U your_user salesflow_db > backup_$(date +%Y%m%d).sql

# 3. Deploy KI System
psql -U your_user -d salesflow_db -f DEPLOY_KI_SYSTEM.sql

# Output sollte sein:
# ✓ Extensions enabled
# ✓ Core tables created (10)
# ✓ RPC functions created (7)
# ✓ Materialized views created (4)
# ✓ Triggers configured (7)
# ✅ DEPLOYMENT COMPLETE!
```

### Schritt 2: Backend Integration

```bash
# 1. Install Python Dependencies
cd backend
pip install openai asyncpg

# 2. Environment Variables (.env)
OPENAI_API_KEY=sk-...
SUPABASE_URL=https://...
SUPABASE_KEY=...

# 3. Add Router to main.py
```

**backend/app/main.py:**
```python
from app.routers import ki_intelligence

app.include_router(ki_intelligence.router)
```

### Schritt 3: Verify

```bash
# Test Backend
curl http://localhost:8000/api/ki/analytics/scored-leads?limit=10

# Test Database RPC
psql -U your_user -d salesflow_db -c "SELECT * FROM recommend_followup_actions('user-uuid', 5);"
```

---

## 📦 Module

### 1. DEAL-MEDIC (BANT Assessment)

**Zweck:** Qualifiziere Deals mit dem BANT-Framework

**Nutzung:**

```python
POST /api/ki/bant/assess
{
  "lead_id": "uuid",
  "budget_score": 75,
  "authority_score": 80,
  "need_score": 90,
  "timeline_score": 85,
  "budget_notes": "€10k Budget confirmed",
  "next_steps": "Schedule demo call"
}

Response:
{
  "total_score": 82,
  "traffic_light": "green",  # 🟢 Green, 🟡 Yellow, 🔴 Red
  "ai_recommendations": {...}
}
```

**Traffic Light System:**
- 🟢 **Green (75-100):** Deal ist qualifiziert → Push for close
- 🟡 **Yellow (50-74):** Arbeite an schwachen Bereichen
- 🔴 **Red (0-49):** Braucht signifikante Qualifizierung

### 2. NEURO-PROFILER (DISG)

**Zweck:** Analysiere Persönlichkeitstyp für personalisierte Ansprache

**Nutzung:**

```python
# Option A: Manuelle Bewertung
POST /api/ki/personality/profile
{
  "lead_id": "uuid",
  "dominance_score": 80,
  "influence_score": 60,
  "steadiness_score": 40,
  "conscientiousness_score": 50
}

# Option B: AI-Analyse aus Messages
POST /api/ki/personality/analyze/{lead_id}
# → Analysiert automatisch aus Message-History

Response:
{
  "primary_type": "D",  # Dominant
  "confidence_score": 0.85,
  "communication_tips": {
    "tone": "direct and results-focused",
    "key_phrases": ["bottom line", "ROI", "efficiency"],
    "avoid": ["small talk", "long explanations"]
  }
}
```

**Persönlichkeitstypen:**
- **D (Dominant):** Direkt, ergebnisorientiert → "Was ist der ROI?"
- **I (Influence):** Enthusiastisch, sozial → "Wer nutzt das noch?"
- **S (Steadiness):** Geduldig, stabilitätsorientiert → "Ist das sicher?"
- **C (Conscientiousness):** Analytisch, detailorientiert → "Zeig mir die Daten."

### 3. AUTO-MEMORY (Lead Context)

**Zweck:** Automatische Context-Summaries für GPT-optimierte Prompts

**Nutzung:**

```python
POST /api/ki/memory/update
{
  "lead_id": "uuid",
  "force_refresh": false
}

Response:
{
  "success": true,
  "context_length": 1524,
  "sources_count": 25,  # Messages + Activities
  "updated_at": "2024-12-01T10:30:00Z"
}

# Hole Intelligence
GET /api/ki/intelligence/{lead_id}

Response:
{
  "lead_id": "uuid",
  "name": "Max Mustermann",
  "bant": {"score": 75, "traffic_light": "green"},
  "personality": {"primary_type": "D", "confidence": 0.85},
  "context": {
    "short_summary": "Interessiert an Team-Lösung, Budget confirmed",
    "key_facts": ["CTO bei Startup", "Team von 15 Leuten"],
    "pain_points": ["Zu viel manueller Aufwand", "Kein CRM"],
    "objections_raised": ["Preis zu hoch"]
  },
  "intelligence_score": "high"
}
```

**Auto-Update Trigger:**
- Neue Message → Context wird automatisch aktualisiert
- Neue Activity → Context wird automatisch aktualisiert

### 4. AI RECOMMENDATIONS (Next Best Actions)

**Zweck:** Intelligente Follow-up-Empfehlungen

**Nutzung:**

```python
GET /api/ki/recommendations/followups?limit=5

Response:
{
  "total": 5,
  "recommendations": [
    {
      "lead_id": "uuid",
      "lead_name": "Max Mustermann",
      "recommended_action": "🟢 HOT LEAD - Closing-Gespräch planen",
      "priority": "urgent",
      "reasoning": "BANT Score: 82/100 (Green Light). Ready to close.",
      "confidence": 0.9,
      "days_since_contact": 2
    },
    {
      "lead_id": "uuid2",
      "lead_name": "Anna Schmidt",
      "recommended_action": "⏰ 15 Tage kein Kontakt - Re-Engagement nötig",
      "priority": "high",
      "reasoning": "Lead droht kalt zu werden. Statistisch sinkt CR um 50%.",
      "confidence": 0.85,
      "days_since_contact": 15
    }
  ]
}
```

**Recommendation Types:**
- `followup` → Kontakt-Aktion
- `playbook` → Playbook starten (DEAL-MEDIC, etc.)
- `message_draft` → Personalisierte Message
- `channel_switch` → Channel wechseln
- `assessment` → BANT/DISG durchführen

### 5. LIABILITY-SHIELD (Compliance)

**Zweck:** Prüfe Content auf rechtliche Risiken

**Nutzung:**

```python
POST /api/ki/compliance/check
{
  "content_type": "ai_message",
  "original_content": "Mit unserem Produkt verdienst du garantiert €10.000 im ersten Monat!",
  "related_lead_id": "uuid"
}

Response:
{
  "violation_detected": true,
  "violation_types": ["income_guarantee"],
  "severity": "critical",
  "action": "blocked",
  "filtered_content": "Mit unserem Produkt können top Performer potenziell signifikante Einnahmen erzielen. Ergebnisse variieren.",
  "disclaimer_added": "Individuelle Ergebnisse können abweichen."
}
```

**Severity Levels:**
- **critical:** Health Claims, Income Guarantees → BLOCK
- **high:** Übertreibungen → FILTER
- **medium:** Unklare Disclaimers → ADD DISCLAIMER
- **low:** Minor Wording → ALLOW mit Hinweis

### 6. SCRIPT GENERATION

**Zweck:** Generiere personalisierte Scripts

**Nutzung:**

```python
POST /api/ki/scripts/generate/{lead_id}?script_type=follow-up

Response:
{
  "lead_id": "uuid",
  "script_type": "follow-up",
  "script": "Hi Max, ich folge up zu unserem Gespräch von letzter Woche. Du hattest Interesse an der Team-Lösung gezeigt. Basierend auf deinem Budget von €10k können wir direkt das Enterprise-Paket umsetzen. Hast du 20 Min. diese Woche für ein Quick-Demo? 🚀",
  "compliance_checked": true
}
```

**Script Types:**
- `follow-up` → Standard Follow-up
- `opening` → Erstkontakt
- `closing` → Abschluss-Pitch
- `objection` → Einwand-Behandlung

---

## 🔌 API Endpoints

### BANT

| Endpoint | Method | Beschreibung |
|----------|--------|--------------|
| `/api/ki/bant/assess` | POST | Erstelle BANT-Assessment |
| `/api/ki/bant/{lead_id}` | GET | Hole BANT-Assessment |

### Personality

| Endpoint | Method | Beschreibung |
|----------|--------|--------------|
| `/api/ki/personality/profile` | POST | Erstelle DISG-Profil (manuell) |
| `/api/ki/personality/analyze/{lead_id}` | POST | AI-Analyse aus Messages |
| `/api/ki/personality/{lead_id}/recommendations` | GET | DISG-Empfehlungen |

### Intelligence

| Endpoint | Method | Beschreibung |
|----------|--------|--------------|
| `/api/ki/intelligence/{lead_id}` | GET | Complete Lead Intelligence |
| `/api/ki/memory/update` | POST | Update Lead Context |

### Recommendations

| Endpoint | Method | Beschreibung |
|----------|--------|--------------|
| `/api/ki/recommendations` | GET | Pending Recommendations |
| `/api/ki/recommendations/followups` | GET | Next Best Actions |
| `/api/ki/recommendations` | POST | Create Recommendation |
| `/api/ki/recommendations/{id}` | PATCH | Update Status |

### Compliance

| Endpoint | Method | Beschreibung |
|----------|--------|--------------|
| `/api/ki/compliance/check` | POST | Check Content |

### Scripts

| Endpoint | Method | Beschreibung |
|----------|--------|--------------|
| `/api/ki/scripts/generate/{lead_id}` | POST | Generate Script |

### Analytics

| Endpoint | Method | Beschreibung |
|----------|--------|--------------|
| `/api/ki/analytics/scored-leads` | GET | Scored Leads |
| `/api/ki/analytics/conversion-funnel` | GET | Funnel Analytics |
| `/api/ki/analytics/personality-insights` | GET | DISG Performance |
| `/api/ki/analytics/refresh-views` | POST | Refresh Views |

---

## ✅ Best Practices

### 1. Context Updates

```python
# Update Context nach jedem wichtigen Event:
- Neue Message → Auto-triggered
- Neue Activity → Auto-triggered
- Manual Refresh bei BANT/DISG-Update:
  POST /api/ki/memory/update {"lead_id": "uuid"}
```

### 2. Recommendation Workflow

```python
# 1. Hole Recommendations
GET /api/ki/recommendations/followups?limit=5

# 2. User akzeptiert Recommendation
PATCH /api/ki/recommendations/{id}
{"status": "accepted"}

# 3. Action ausführen (z.B. Call, Message)
# ...

# 4. Mark als completed
PATCH /api/ki/recommendations/{id}
{"status": "completed"}
```

### 3. BANT + DISG Workflow

```python
# Idealer Flow für neuen Lead:

# Step 1: Erste Interaktionen (5+ Messages)
# → AUTO-MEMORY läuft im Hintergrund

# Step 2: NEURO-PROFILER (nach 5+ Messages)
POST /api/ki/personality/analyze/{lead_id}
# → Ergibt DISG-Typ

# Step 3: DEAL-MEDIC (wenn Lead qualifiziert scheint)
POST /api/ki/bant/assess
# → Ergibt Traffic Light

# Step 4: Intelligentes Follow-up
POST /api/ki/scripts/generate/{lead_id}
# → Nutzt BANT + DISG für personalisierten Script
```

### 4. View Refresh

```python
# Materialized Views: Refresh bei Bedarf
# Option A: Manual
POST /api/ki/analytics/refresh-views

# Option B: Scheduled (via Cron)
# Add to crontab:
# 0 */6 * * * psql -d salesflow_db -c "SELECT refresh_all_ki_views();"
```

---

## 🐛 Troubleshooting

### Problem: "RPC function not found"

**Lösung:**
```sql
-- Check if functions exist
SELECT proname FROM pg_proc WHERE proname LIKE '%disg%';

-- Re-run RPC deployment
\i backend/database/ki_rpc_functions.sql
```

### Problem: "Materialized view is empty"

**Lösung:**
```sql
-- Refresh views manually
REFRESH MATERIALIZED VIEW CONCURRENTLY view_leads_scored;
REFRESH MATERIALIZED VIEW CONCURRENTLY view_followups_scored;
```

### Problem: "GPT API Error"

**Lösung:**
```python
# Check API Key
echo $OPENAI_API_KEY

# Test OpenAI directly
curl https://api.openai.com/v1/models \
  -H "Authorization: Bearer $OPENAI_API_KEY"
```

### Problem: "Slow Analytics Queries"

**Lösung:**
```sql
-- Check index usage
SELECT * FROM pg_stat_user_indexes WHERE schemaname = 'public';

-- Analyze tables
ANALYZE bant_assessments;
ANALYZE personality_profiles;
ANALYZE lead_context_summaries;
```

---

## 📞 Support

Bei Fragen oder Problemen:

1. Check Logs: `SELECT * FROM compliance_logs ORDER BY checked_at DESC LIMIT 50;`
2. Check Triggers: `SELECT * FROM pg_trigger;`
3. Check View Status: `SELECT * FROM pg_matviews;`

---

## 🚀 Roadmap

**Geplante Features:**

- [ ] **Embeddings-basierte Semantic Search** (Lead Similarity)
- [ ] **Success Pattern Learning** (Auto-optimize Sequences)
- [ ] **Predictive Lead Scoring** (ML-based Win Probability)
- [ ] **Multi-language Support** (EN, DE, FR, ES)
- [ ] **Voice-to-DISG** (Analyze Call Recordings)

---

**Version:** 1.0.0  
**Last Updated:** 2024-12-01  
**Maintainer:** Sales Flow AI Team

