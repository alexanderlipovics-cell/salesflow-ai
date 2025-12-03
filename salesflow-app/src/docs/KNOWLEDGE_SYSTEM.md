# Knowledge System & Evidence Hub

## Übersicht

Das Knowledge System ist das zentrale Wissensmanagementsystem für Sales Flow AI. Es ermöglicht:

1. **Evidence Hub** - Wissenschaftliche Studien und Health Claims
2. **Company Knowledge** - Firmenspezifisches Wissen (Produkte, Compliance, Comp Plans)
3. **RAG-Integration** - Knowledge-basierte Antworten für CHIEF
4. **Health Pro Modul** - Laborergebnis-Interpretation für Therapeuten

---

## Architektur

```
┌─────────────────────────────────────────────────────────────────┐
│                        CHIEF (KI-Coach)                         │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Knowledge Context Builder                     │
│  - Query-basierte Suche                                         │
│  - Company-aware Filtering                                      │
│  - Token-Limit Management                                       │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Knowledge Service                           │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐              │
│  │  Semantic   │  │   Keyword   │  │   Hybrid    │              │
│  │   Search    │  │   Search    │  │   Merge     │              │
│  └─────────────┘  └─────────────┘  └─────────────┘              │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                        PostgreSQL + pgvector                     │
│  ┌──────────────────┐  ┌──────────────────┐                     │
│  │ knowledge_items  │  │knowledge_embeddings│                   │
│  └──────────────────┘  └──────────────────┘                     │
└─────────────────────────────────────────────────────────────────┘
```

---

## Datenmodell

### Companies

```sql
companies (
  id UUID PRIMARY KEY,
  slug TEXT UNIQUE,           -- 'zinzino', 'herbalife'
  name TEXT,
  vertical_id TEXT,           -- 'network_marketing'
  has_evidence_hub BOOLEAN,
  has_health_pro_module BOOLEAN
)
```

### Knowledge Items

```sql
knowledge_items (
  id UUID PRIMARY KEY,
  company_id UUID,            -- NULL = generic
  vertical_id TEXT,
  
  -- Klassifikation
  domain knowledge_domain,    -- 'evidence', 'company', 'vertical', 'generic'
  type knowledge_type,        -- 'study_summary', 'product_line', etc.
  
  -- Content
  topic TEXT,                 -- 'omega3', 'compensation_plan'
  title TEXT,
  content TEXT,
  content_short TEXT,
  
  -- Evidence (für Studien)
  evidence_level evidence_strength,
  study_year INTEGER,
  source_reference TEXT,
  
  -- Compliance
  compliance_level TEXT,      -- 'strict', 'normal', 'low'
  requires_disclaimer BOOLEAN,
  disclaimer_text TEXT,
  
  -- Usage
  usage_count INTEGER,
  quality_score NUMERIC(3,2)
)
```

### Knowledge Embeddings

```sql
knowledge_embeddings (
  id UUID PRIMARY KEY,
  knowledge_item_id UUID,
  embedding vector(1536),     -- OpenAI ada-002
  chunk_text TEXT
)
```

---

## API Endpoints

### Search

```bash
# Hybrid Search (POST)
POST /api/v1/knowledge/search
{
  "query": "Omega-3 Herzgesundheit",
  "company_slug": "zinzino",
  "domains": ["evidence", "company"],
  "limit": 10
}

# Quick Search (GET)
GET /api/v1/knowledge/search?q=omega3&company_slug=zinzino
```

### CHIEF Context

```bash
# Get Knowledge Context for CHIEF
GET /api/v1/knowledge/companies/zinzino/context?query=Warum%20ist%20Omega-3%20wichtig
```

### CRUD

```bash
# Create Item
POST /api/v1/knowledge/items
{
  "domain": "evidence",
  "type": "study_summary",
  "topic": "omega3",
  "title": "Meta-Analyse 2020",
  "content": "...",
  "evidence_level": "high"
}

# Bulk Import
POST /api/v1/knowledge/bulk-import
{
  "company_slug": "zinzino",
  "items": [...],
  "auto_generate_embeddings": true
}
```

---

## CHIEF Integration

### Knowledge Context in Prompts

```python
# In chief_context.py
async def build_chief_context(
    db,
    user_id,
    company_id,
    query="Warum ist Omega-3 wichtig?",  # User-Frage
    include_knowledge=True,
):
    # ... other context ...
    
    if include_knowledge and query:
        context["knowledge_context"] = await _get_knowledge_context(
            db, company_id, query
        )
```

### Knowledge Prompt Template

```python
# Aus chief_knowledge.py
CHIEF_KNOWLEDGE_SYSTEM_PROMPT = """
[KNOWLEDGE CONTEXT – DEIN WISSENSSCHATZ]

1. NUTZE DAS WISSEN INTELLIGENT
   - Verwende Fakten aus knowledge_context
   - Zitiere bei wichtigen Aussagen die Quelle

2. COMPLIANCE BEACHTEN
   - Bei compliance_level = 'strict': Exakt an die Formulierung halten
   - Bei requires_disclaimer = true: Disclaimer einbauen

3. EVIDENCE-LEVEL KOMMUNIZIEREN
   - Bei high: "Studien zeigen klar..."
   - Bei moderate: "Studien deuten darauf hin..."
"""
```

---

## Search Logik

### 1. Semantic Search (pgvector)

```sql
SELECT ki.*, 1 - (ke.embedding <=> query_embedding) as similarity
FROM knowledge_embeddings ke
JOIN knowledge_items ki ON ki.id = ke.knowledge_item_id
WHERE ki.is_active = true
ORDER BY 
  CASE WHEN ki.company_id = :company_id THEN 3 ELSE 0 END DESC,
  similarity DESC
LIMIT 10;
```

### 2. Keyword Search (Fallback)

```sql
SELECT *, 
  CASE 
    WHEN title ILIKE '%query%' THEN 1.0
    WHEN content ILIKE '%query%' THEN 0.8
    ELSE 0.5
  END as relevance
FROM knowledge_items
WHERE title ILIKE '%query%' OR content ILIKE '%query%'
ORDER BY relevance DESC;
```

### 3. Hybrid Merge

- Semantic + Keyword Ergebnisse werden gemerged
- Duplikate entfernt
- Hybrid-Matches (in beiden gefunden) erhalten Boost
- Finale Sortierung nach kombiniertem Score

---

## Bulk Import Workflow

### 1. Gemini Research ausführen

```bash
# Verwende die Prompts aus docs/prompts/
# - GEMINI_EVIDENCE_RESEARCH.md
# - GEMINI_COMPANY_IMPORT.md
```

### 2. JSON Output speichern

```json
[
  {
    "domain": "evidence",
    "type": "study_summary",
    "topic": "omega3",
    "title": "...",
    "content": "...",
    ...
  }
]
```

### 3. API Bulk Import

```bash
curl -X POST http://localhost:8000/api/v1/knowledge/bulk-import \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "company_slug": "zinzino",
    "items": [...],
    "auto_generate_embeddings": true
  }'
```

---

## Compliance System

### Compliance Levels

| Level | Beschreibung | Beispiel |
|-------|--------------|----------|
| `strict` | Exakte Formulierungen verwenden | EFSA Health Claims |
| `normal` | Normale Vorsicht | Produktbeschreibungen |
| `low` | Geringe Einschränkungen | Allgemeine Tipps |

### Disclaimer Handling

```python
# In CHIEF Response:
if item.requires_disclaimer and item.disclaimer_text:
    response += f"\n\n[Hinweis: {item.disclaimer_text}]"
```

---

## Health Pro Modul (Phase 2)

### Für Therapeuten/Ärzte

- Laborergebnis-Import (BalanceTest, Blutbild)
- Strukturierte Interpretation
- Referenzwerte-Vergleich
- Follow-up Planung

### Verifizierung

```sql
health_pro_profiles (
  user_id UUID,
  profession TEXT,      -- 'arzt', 'heilpraktiker'
  is_verified BOOLEAN,
  can_view_lab_results BOOLEAN,
  can_interpret_results BOOLEAN
)
```

---

## Setup

### 1. Migration ausführen

```bash
# In Supabase SQL Editor
# Datei: backend/migrations/015_knowledge_system.sql
```

### 2. pgvector aktivieren

```sql
CREATE EXTENSION IF NOT EXISTS vector;
```

### 3. Environment Variables

```env
OPENAI_API_KEY=sk-...          # Für Embeddings
EMBEDDING_MODEL=text-embedding-3-small
```

### 4. Erste Company anlegen

```sql
INSERT INTO companies (slug, name, vertical_id, has_evidence_hub)
VALUES ('zinzino', 'Zinzino', 'network_marketing', true);
```

---

## Monitoring

### Health Check

```bash
GET /api/v1/knowledge/health

Response:
{
  "total_items": 150,
  "items_by_domain": {"evidence": 50, "company": 80, "generic": 20},
  "items_with_embeddings": 145,
  "embedding_coverage": 96.7
}
```

### Usage Analytics

- `usage_count` pro Item
- `last_used_at` Timestamp
- `effectiveness_score` (geplant)

---

## Nächste Schritte

1. **Gemini Research** - Evidence + Zinzino Wissen sammeln
2. **Bulk Import** - Alles in DB laden
3. **Embeddings** - Vector Search aktivieren
4. **CHIEF Integration** - Knowledge in Prompts nutzen
5. **Health Pro** - Therapeuten-Modul (Phase 2)

