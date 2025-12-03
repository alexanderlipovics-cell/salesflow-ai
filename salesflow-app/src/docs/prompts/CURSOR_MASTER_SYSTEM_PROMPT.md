# 🔧 Sales Flow AI – Cursor Master System Prompt

> **Version:** 1.1 (verbessert)  
> **Stand:** Dezember 2024  
> **Zweck:** System-Prompt für Cursor AI Agent (Coding Focus)

---

## 1. Projekt-Kontext

Du arbeitest am **Sales Flow AI** Projekt – einem KI-Vertriebs-Copilot.

### Repository-Struktur
```
salesflow-app/src/
├── backend/                    # FastAPI Backend (Python 3.11+)
│   ├── app/
│   │   ├── api/                # Endpoints (ai.py, leads.py, etc.)
│   │   ├── services/           # Business Logic
│   │   │   ├── chief_context.py    # CHIEF Kontext-Builder
│   │   │   ├── knowledge.py        # RAG Service
│   │   │   ├── learning_service.py # Learning Layer
│   │   │   └── analytics/          # Insights, Top Templates
│   │   ├── domain/             # Domain Models (Pydantic)
│   │   └── config/             # Settings, OpenAI Config
│   ├── data/                   # JSON Knowledge Bases
│   │   ├── EVIDENCE_HUB_COMPLETE.json
│   │   └── MARKETING_INTELLIGENCE.json
│   └── migrations/             # SQL Migrations
│       └── DEPLOY_LEARNING_KNOWLEDGE.sql  # Haupt-Migration
├── screens/                    # React Native Screens
│   └── main/
│       ├── DailyFlowScreen.js  # ~1094 Zeilen
│       ├── ChatScreen.js       # ~790 Zeilen (CHIEF)
│       └── ObjectionBrainScreen.js
├── components/                 # UI Components
│   ├── daily-flow/             # Daily Flow Components
│   ├── goal-wizard/            # Goal Wizard Components
│   └── chat-import/            # Chat Import Modal
├── services/                   # Frontend Services
│   ├── chiefService.js         # CHIEF API Client
│   ├── dailyFlowService.js     # Daily Flow API
│   └── goalEngineService.ts    # Goal Engine (TypeScript)
├── hooks/                      # React Hooks
│   ├── useChiefChat.js         # CHIEF Chat Hook
│   ├── useChiefDailyFlowContext.js
│   ├── useDailyFlow.js
│   └── useGoalEngine.ts
├── prompts/                    # AI Prompt Templates
│   ├── chief-prompt.js         # CHIEF System Prompt (WICHTIG!)
│   └── objection-vertical-prompts.js
├── config/
│   ├── verticals/              # Vertical Definitions
│   └── compensation/           # Compensation Plans
├── types/                      # TypeScript Types
└── docs/                       # Dokumentation (20+ Dateien)
```

---

## 2. Tech Stack

### Backend
```python
# Python 3.11+ | backend/requirements.txt
fastapi==0.109+
pydantic==2.x
openai==1.x
supabase==2.x
redis==5.x
uvicorn==0.27+
python-jose[cryptography]  # JWT
```

### Frontend
```javascript
// React Native + Expo | package.json
"react-native": "0.73+",
"expo": "50+",
"@supabase/supabase-js": "2.x",
"@react-navigation/native": "6.x"
```

### Database
```sql
-- PostgreSQL 15+ via Supabase
-- Extensions:
CREATE EXTENSION IF NOT EXISTS vector;      -- pgvector für Embeddings
CREATE EXTENSION IF NOT EXISTS "uuid-ossp"; -- UUID Generation

-- RLS ist IMMER aktiviert für User-Daten
```

---

## 3. Wichtige Enums & Types

### Knowledge Domain (SQL)
```sql
CREATE TYPE knowledge_domain AS ENUM (
    'evidence',   -- Wissenschaftliche Studien
    'company',    -- Firmen-spezifisch
    'vertical',   -- Branchen-spezifisch
    'generic'     -- Allgemeines Sales-Wissen
);
```

### Knowledge Type (SQL)
```sql
CREATE TYPE knowledge_type AS ENUM (
    'study_summary', 'meta_analysis', 'health_claim', 'guideline',
    'company_overview', 'product_line', 'product_detail',
    'compensation_plan', 'compliance_rule', 'faq',
    'objection_handler', 'sales_script', 'best_practice',
    'psychology', 'communication', 'template_helper'
);
```

### Template Category (SQL)
```sql
CREATE TYPE template_category AS ENUM (
    'first_contact', 'follow_up', 'reactivation',
    'objection', 'closing', 'referral', 'other'
);
```

### Evidence Strength (SQL)
```sql
CREATE TYPE evidence_strength AS ENUM (
    'high', 'moderate', 'limited', 'expert_opinion'
);
```

---

## 4. Coding Standards

### Python (Backend)

```python
# Imports: Standard → Third-Party → Local
from typing import Optional, List, Any
from datetime import datetime
from pydantic import BaseModel
from supabase import Client

from app.core.config import settings
from app.services.knowledge import KnowledgeService

# Type Hints: IMMER verwenden
async def get_lead(lead_id: str, user_id: str) -> Optional[Lead]:
    """Holt einen Lead für den authentifizierten User.
    
    Args:
        lead_id: Die Lead-ID
        user_id: Die authentifizierte User-ID
        
    Returns:
        Lead oder None wenn nicht gefunden
    """
    ...

# Dataclasses für interne Strukturen
@dataclass
class DailyFlowStatus:
    date: str
    new_contacts: dict[str, Any]
    followups: dict[str, Any]
    overall_percent: float
    is_on_track: bool

# Error Handling: Specific Exceptions
from fastapi import HTTPException, status

if not lead:
    raise HTTPException(
        status_code=status.HTTP_404_NOT_FOUND,
        detail="Lead nicht gefunden"
    )
```

### JavaScript/React Native (Frontend)

```javascript
// Functional Components mit Hooks
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { View, Text, TouchableOpacity, FlatList } from 'react-native';

// Named Exports für Components
export const LeadCard = ({ lead, onPress }) => {
  const [isLoading, setIsLoading] = useState(false);
  
  const handlePress = useCallback(() => {
    setIsLoading(true);
    onPress(lead.id);
  }, [lead.id, onPress]);

  // Memoized Werte für Performance
  const priorityColor = useMemo(() => {
    return lead.priority === 'high' ? '#FF6B6B' : '#4ECDC4';
  }, [lead.priority]);

  return (
    <TouchableOpacity onPress={handlePress}>
      <View style={{ borderColor: priorityColor }}>
        <Text>{lead.name}</Text>
      </View>
    </TouchableOpacity>
  );
};

// Custom Hooks mit "use" Prefix
export const useLeadData = (leadId) => {
  const [lead, setLead] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  useEffect(() => {
    let isMounted = true;
    
    fetchLead(leadId)
      .then(data => isMounted && setLead(data))
      .catch(err => isMounted && setError(err))
      .finally(() => isMounted && setLoading(false));
    
    return () => { isMounted = false; };
  }, [leadId]);
  
  return { lead, loading, error };
};
```

### SQL (Migrations)

```sql
-- Dateiname: XXX_beschreibung.sql (fortlaufende Nummer)
-- Beispiel: 015_knowledge_system.sql

-- IMMER idempotent schreiben!
CREATE TABLE IF NOT EXISTS lead_activities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lead_id UUID REFERENCES leads(id) ON DELETE CASCADE,
    activity_type TEXT NOT NULL,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    user_id UUID REFERENCES auth.users(id) NOT NULL
);

-- RLS Policies: IMMER für User-Daten
ALTER TABLE lead_activities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own activities"
    ON lead_activities FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own activities"
    ON lead_activities FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Indexes: Für häufige Queries
CREATE INDEX IF NOT EXISTS idx_activities_lead 
    ON lead_activities(lead_id);
CREATE INDEX IF NOT EXISTS idx_activities_user_date 
    ON lead_activities(user_id, created_at DESC);

-- Enums: Mit Exception Handler
DO $$ BEGIN
    CREATE TYPE activity_type AS ENUM ('call', 'message', 'meeting', 'note');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Progress Notices
DO $$ BEGIN RAISE NOTICE '✅ Activities Table erstellt'; END $$;
```

---

## 5. Key Patterns

### CHIEF Context Building

```python
# backend/app/services/chief_context.py
async def build_chief_context(
    db: Client,
    user_id: str,
    company_id: str,
    user_name: str = "User",
    include_leads: bool = True,
    max_leads: int = 5,
    query: Optional[str] = None,
    include_knowledge: bool = True,
    include_templates: bool = True,
) -> dict[str, Any]:
    """Baut den vollständigen Kontext für CHIEF."""
    
    context = {
        "user_profile": await get_user_profile(db, user_id),
        "daily_flow_status": await get_daily_flow_status(db, user_id),
        "vertical_profile": await get_vertical_profile(db, user_id),
    }
    
    if include_leads:
        context["suggested_leads"] = await get_suggested_leads(
            db, user_id, max_leads
        )
    
    if include_knowledge and query:
        context["knowledge_context"] = await knowledge_service.search(
            query, company_id
        )
    
    if include_templates:
        context["top_templates"] = await get_top_templates(company_id)
    
    return context
```

### RAG Knowledge Search

```python
# backend/app/services/knowledge.py
async def search_knowledge_semantic(
    query_embedding: list[float],  # 1536 dimensions
    company_id: Optional[str] = None,
    vertical_id: Optional[str] = None,
    domains: Optional[list[str]] = None,
    limit: int = 10
) -> list[KnowledgeItem]:
    """Semantische Suche im Knowledge System."""
    
    result = await db.rpc('search_knowledge_semantic', {
        'query_embedding': query_embedding,
        'p_company_id': company_id,
        'p_vertical_id': vertical_id,
        'p_domains': domains,
        'p_limit': limit
    }).execute()
    
    return [KnowledgeItem(**item) for item in result.data]
```

### Learning Events Tracking

```python
# backend/app/services/learning_service.py
async def track_learning_event(
    db: Client,
    event_type: str,  # message_sent, message_edited, response_received, converted
    user_id: str,
    company_id: str,
    template_id: Optional[str] = None,
    lead_id: Optional[str] = None,
    metadata: Optional[dict] = None
):
    """Trackt ein Learning Event für die Template-Optimierung."""
    
    await db.table('learning_events').insert({
        'event_type': event_type,
        'user_id': user_id,
        'company_id': company_id,
        'template_id': template_id,
        'lead_id': lead_id,
        'metadata': metadata or {},
        'created_at': datetime.utcnow().isoformat()
    }).execute()
```

### CHIEF Action Tags (Frontend)

```javascript
// prompts/chief-prompt.js
export function extractActionTags(response) {
  const actionRegex = /\[\[ACTION:(\w+)(?::([^\]]+))?\]\]/g;
  const actions = [];
  let match;

  while ((match = actionRegex.exec(response)) !== null) {
    actions.push({
      action: match[1],
      params: match[2] ? match[2].split(',').map(p => p.trim()) : [],
    });
  }

  return actions;
}

// Verwendung in ChatScreen.js
const handleChiefResponse = (response) => {
  const actions = extractActionTags(response);
  const cleanResponse = stripActionTags(response);
  
  actions.forEach(({ action, params }) => {
    switch (action) {
      case 'FOLLOWUP_LEADS':
        navigation.navigate('FollowUps', { leadIds: params });
        break;
      case 'COMPOSE_MESSAGE':
        navigation.navigate('MessageComposer', { leadId: params[0] });
        break;
      // ... weitere Actions
    }
  });
  
  return cleanResponse;
};
```

---

## 6. Wichtige Dateien Quick Reference

### Backend Core
| Datei | Zweck | Zeilen |
|-------|-------|--------|
| `app/services/chief_context.py` | CHIEF Kontext-Builder | ~1000 |
| `app/services/knowledge.py` | RAG Knowledge Service | ~300 |
| `app/services/learning_service.py` | Learning Layer | ~200 |
| `app/api/ai.py` | CHIEF Chat Endpoints | ~150 |
| `migrations/DEPLOY_LEARNING_KNOWLEDGE.sql` | Haupt-Migration | ~827 |

### Frontend Core
| Datei | Zweck | Zeilen |
|-------|-------|--------|
| `screens/main/DailyFlowScreen.js` | Power Hour UI | ~1094 |
| `screens/main/ChatScreen.js` | CHIEF Chat UI | ~790 |
| `prompts/chief-prompt.js` | CHIEF System Prompt | ~410 |
| `hooks/useChiefChat.js` | Chat State Management | ~150 |
| `services/chiefService.js` | CHIEF API Client | ~200 |

### Config
| Datei | Zweck |
|-------|-------|
| `config/verticals/definitions.ts` | Vertical Definitionen |
| `config/compensation/*.plan.ts` | Compensation Plans |
| `backend/app/config/settings.py` | Environment Settings |

---

## 7. RLS Patterns

```sql
-- Standard User-Policy
CREATE POLICY "Users own data"
    ON table_name FOR ALL
    USING (auth.uid() = user_id);

-- Company-basierte Policy (mit user_profiles Join)
CREATE POLICY "Company members can view"
    ON table_name FOR SELECT
    USING (
        company_id IN (
            SELECT company_id FROM user_profiles 
            WHERE user_id = auth.uid()
        )
    );

-- Shared + Own Policy
CREATE POLICY "View shared or own"
    ON templates FOR SELECT
    USING (
        is_shared = true 
        OR created_by = auth.uid()
        OR company_id IN (
            SELECT company_id FROM user_profiles 
            WHERE user_id = auth.uid()
        )
    );
```

---

## 8. Compliance Levels im Code

```python
from enum import Enum

class ComplianceLevel(Enum):
    STRICT = "strict"        # EFSA-Claims → Kein Disclaimer
    NORMAL = "normal"        # Mit Disclaimer verwenden
    SENSITIVE = "sensitive"  # Review nötig

# Im Response-Building:
def build_knowledge_response(item: KnowledgeItem) -> str:
    response = item.content
    
    if item.compliance_level == ComplianceLevel.NORMAL:
        response += f"\n\n⚠️ {item.disclaimer_text}"
    
    if item.compliance_level == ComplianceLevel.SENSITIVE:
        response += "\n\n⚠️ Diese Information ersetzt keine medizinische Beratung."
    
    return response
```

---

## 9. Migration Checklist

Neue SQL-Migration erstellen:

- [ ] Dateiname: `XXX_beschreibung.sql` (fortlaufende Nummer)
- [ ] `IF NOT EXISTS` für idempotente Ausführung
- [ ] Enum-Typen mit `EXCEPTION WHEN duplicate_object THEN null`
- [ ] RLS Policies für alle User-Daten
- [ ] Indexes für häufige Queries
- [ ] Trigger für Auto-Updates (falls nötig)
- [ ] `RAISE NOTICE` für Progress-Tracking
- [ ] Test in lokaler Supabase

---

## 10. Quick Commands

```bash
# Backend starten (development)
cd backend
uvicorn app.main:app --reload --port 8000

# Frontend starten
npx expo start

# Supabase lokal
supabase start
supabase db reset  # Reset mit Migrations

# Migration ausführen
supabase db push

# Tests
cd backend && pytest tests/ -v
npm test

# Logs
supabase functions logs ai-chat --tail
```

---

## 11. Wichtige Regeln

### Security
1. **Nie API Keys commiten** – `.env` Files sind gitignored
2. **RLS IMMER aktivieren** – Für alle User-Daten
3. **JWT validieren** – In jedem geschützten Endpoint
4. **Prepared Statements** – Nie raw SQL mit User-Input

### Code Quality
1. **Type Hints** – Python und TypeScript
2. **Docstrings** – Für alle öffentlichen Funktionen
3. **Error Handling** – Specific Exceptions, nicht generic
4. **Logging** – Structured Logging für Debugging

### Sprache
1. **Deutsch** – Für User-facing Texte (UI, Fehlermeldungen)
2. **Englisch** – Für Code, Logs, Variablennamen

### Performance
1. **Indexes** – Für alle häufigen Queries
2. **Pagination** – Für Listen-Endpoints
3. **Caching** – Redis für häufige Requests
4. **Lazy Loading** – Für große Komponenten

---

## 12. Debugging Tipps

```python
# Backend Logging
import logging
logger = logging.getLogger(__name__)

logger.info(f"Building context for user {user_id}")
logger.debug(f"Context: {context}")
logger.error(f"Failed to fetch leads: {e}")

# Supabase Query Debugging
result = await db.table('leads').select('*').execute()
print(f"Query returned {len(result.data)} rows")
print(f"Raw response: {result}")
```

```javascript
// Frontend Debugging
console.log('[CHIEF] Sending message:', message);
console.log('[CHIEF] Context:', context);
console.log('[CHIEF] Response:', response);

// React Native Debugger
// Cmd+D (iOS) oder Cmd+M (Android) → Debug
```

---

*Sales Flow AI | Cursor Master System Prompt v1.1 | Dezember 2024*
