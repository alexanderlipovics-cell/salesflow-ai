# 🤖 AI Model Inventory - SalesFlow AI

## 📋 Übersicht

Dieses Dokument listet alle konfigurierten AI-Modelle, API Keys und Routing-Strategien im SalesFlow AI System.

---

## 🔑 1. API Keys (Konfiguriert)

### OpenAI
- **Key Name:** `OPENAI_API_KEY`
- **Verwendung:** Haupt-Provider für Sales Agent, Chat, Voice
- **Dateien:** `backend/app/ai/agent.py`, `backend/app/core/config.py`
- **Status:** ✅ Aktiv

### Anthropic (Claude)
- **Key Name:** `ANTHROPIC_API_KEY`
- **Verwendung:** Vision (Screenshots), Receipt Scanning, Smart Import, Objections, Stakeholder Analysis
- **Dateien:** `backend/app/routers/vision.py`, `backend/app/routers/finance.py`, `backend/app/routers/smart_import.py`
- **Status:** ✅ Aktiv

### Groq
- **Key Name:** `GROQ_API_KEY`
- **Verwendung:** Collective Intelligence Engine (Self-Hosted LLM Alternative)
- **Dateien:** `backend/app/services/collective_intelligence_engine.py`
- **Modelle:** `llama-3.1-8b-instant`, `llama-3.3-70b-versatile`, `mixtral-8x7b-32768`
- **Status:** ⚠️ Optional (für Collective Intelligence)

### Ollama
- **Key Name:** `OLLAMA_BASE_URL` (kein Key, nur URL)
- **Verwendung:** Lokales Self-Hosted LLM
- **Default URL:** `http://localhost:11434`
- **Status:** ⚠️ Optional (für lokale Entwicklung)

### Weitere API Keys
- **BRAVE_SEARCH_API_KEY:** Web Search (`backend/app/ai/tools/web_search.py`)
- **GOOGLE_PLACES_API_KEY:** Places Search (`backend/app/ai/tool_executor.py`)
- **RESEND_API_KEY:** Email Sending (`backend/app/routers/auth.py`)

---

## 🎯 2. Modelle im Code referenziert

### OpenAI Models

#### GPT-4o
- **Code-Name:** `gpt-4o`
- **Tier:** `ModelTier.STANDARD`
- **Kosten:** $2.50/1M input, $10.00/1M output
- **Verwendung:** 
  - Komplexe Content-Generierung
  - Nachrichten schreiben
  - Einwandbehandlung
  - Lead-Analyse
  - Vision (Screenshot-Analyse in `ai_chat.py`)

#### GPT-4o-mini
- **Code-Name:** `gpt-4o-mini`
- **Tier:** `ModelTier.MINI`
- **Kosten:** $0.15/1M input, $0.60/1M output
- **Verwendung:**
  - Default für die meisten Requests
  - Intent Detection
  - Simple Queries
  - DB Operations
  - Follow-up Generation
  - Voice Transcription (Whisper)
  - Fallback bei Rate Limits

#### GPT-4-turbo-preview
- **Code-Name:** `gpt-4-turbo-preview`
- **Status:** ⚠️ Legacy (in Config als Default, aber nicht aktiv verwendet)
- **Verwendung:** Nur in alten Config-Dateien

#### GPT-4
- **Code-Name:** `gpt-4`
- **Status:** ⚠️ Legacy
- **Verwendung:** `closing_coach.py`, `performance_insights.py`, `cold_call_assistant.py`

### Anthropic (Claude) Models

#### Claude 3.5 Sonnet
- **Code-Name:** `claude-3-5-sonnet-20241022`
- **Kosten:** $3.00/1M input, $15.00/1M output
- **Verwendung:**
  - Vision Tasks (Screenshot-Analyse)
  - Receipt Scanning
  - Smart Import (Kontaktlisten parsen)
  - Stakeholder Analysis
  - Objection Handling

#### Claude Haiku 4.5
- **Code-Name:** `claude-haiku-4-5-20251001`
- **Kosten:** $0.25/1M input, $1.25/1M output
- **Verwendung:**
  - Simple Tasks (Extraction, Categorization)
  - Intent Detection (Alternative)
  - Fallback für einfache Tasks

#### Claude Sonnet 4
- **Code-Name:** `claude-sonnet-4-20250514`
- **Status:** ⚠️ Referenziert in `ai_router.py`, aber nicht aktiv verwendet

### Groq Models (Self-Hosted Alternative)

#### Llama 3.1 8B Instant
- **Code-Name:** `llama-3.1-8b-instant`
- **Provider:** Groq
- **Kosten:** ~$0.001/1M tokens (sehr günstig)
- **Verwendung:** Collective Intelligence Engine

#### Llama 3.3 70B Versatile
- **Code-Name:** `llama-3.3-70b-versatile`
- **Provider:** Groq
- **Verwendung:** Collective Intelligence Engine (für komplexere Tasks)
- **Hinweis:** Ersetzt deprecated `llama-3.1-70b-versatile`

#### Mixtral 8x7B
- **Code-Name:** `mixtral-8x7b-32768`
- **Provider:** Groq
- **Verwendung:** Collective Intelligence Engine

### Future Models (Kommentiert)

#### Llama 3 70B
- **Code-Name:** `llama-3-70b`
- **Status:** 🔮 Geplant für Background Jobs
- **Kosten:** $0.001/1M input, $0.002/1M output (fast kostenlos)
- **Verwendung:** Zukünftig für nicht-kritische Background-Tasks

---

## 🔄 3. Model Routing (Intent → Model Mapping)

### Aktuelles Routing (nach Performance-Optimierung)

#### Intent-basiert (`model_router.py`)
```
COMPLEX → gpt-4o (STANDARD)
CONTENT → gpt-4o-mini (MINI) ⚡ NEU
SIMPLE → gpt-4o-mini (MINI)
QUERY → gpt-4o-mini (MINI)
ACTION → gpt-4o-mini (MINI)
```

#### Tool-basiert
**COMPLEX_TOOLS → gpt-4o:**
- `generate_script`
- `handle_objection`
- `write_message`
- `analyze_lead`
- `get_coaching_tip`
- `generate_sequence`
- `create_content`
- `content_generation`

**SIMPLE_TOOLS → gpt-4o-mini:**
- `query_leads`
- `get_lead_details`
- `create_task`
- `update_lead_status`
- `log_interaction`
- `get_daily_briefing`
- `search_leads`
- `get_performance_stats`
- `get_commission_status`
- `get_churn_risks`
- `get_objection_scripts`
- `get_calendar_events`
- `web_search`
- `search_nearby_places`

#### Keyword-basiert
**COMPLEX_KEYWORDS → gpt-4o:**
- "schreib", "schreiben", "formulier", "nachricht", "script", "text", "inhalt", "content", "generier", "erstelle", "create", "design", "hilf", "help", "einwand", "objection", "coaching", "beratung", "analyse", "analysis"

**SIMPLE_KEYWORDS → gpt-4o-mini:**
- "zeig", "show", "liste", "list", "finde", "find", "suche", "search", "gib", "get", "hole", "fetch", "wie viele", "how many", "wann", "when", "wer", "who", "was", "what", "wo", "where", "status", "überblick"

#### Länge-basiert
- **> 50 Wörter** → gpt-4o
- **≤ 50 Wörter** → gpt-4o-mini (Default)

### Task-basiert (`ai_policies.py`)

**High-Quality Tasks → GPT-4o:**
- `SALES_COACH_CHAT`
- `OBJECTION_HANDLER`
- `CLOSING_HELPER`
- `LEAD_ANALYSIS`
- `OFFER_CREATE`

**Medium Tasks → GPT-4o:**
- `FOLLOWUP_GENERATION`
- `TEMPLATE_OPTIMIZATION`
- `RESEARCH_PERSON`
- `CALL_SCRIPT`

**Low-Complexity Tasks → GPT-4o-mini:**
- `SENTIMENT_ANALYSIS`
- `CLASSIFICATION`
- `DAILY_PLAN`
- `GENERATE_MESSAGE`
- `SUMMARY_COACHING`

### Vision Tasks (`ai_router.py`)

**Vision Tasks → Claude 3.5 Sonnet:**
- `vision_extraction`
- `receipt_vision`
- Model: `claude-3-5-sonnet-20241022`

**Simple Tasks → Claude Haiku:**
- `extract_name`
- `detect_intent`
- `categorize_objection`
- `parse_contact_list`
- `sentiment_analysis`
- `extract_phone`
- `extract_email`
- `language_detection`
- Model: `claude-haiku-4-5-20251001`

**Complex Tasks → Claude Sonnet:**
- `analyze_conversation`
- `generate_response`
- `meeting_prep`
- `proposal_intro`
- `stakeholder_inference`
- `personality_analysis`
- Model: `claude-sonnet-4-20250514`

---

## 🏗️ 4. Initialisierte Clients

### OpenAI Client
- **Datei:** `backend/app/ai/agent.py`
- **Funktion:** `get_client()`
- **Typ:** `AsyncOpenAI`
- **Initialisierung:** Singleton Pattern
- **API Key:** `OPENAI_API_KEY` (Environment Variable)
- **Fallback:** Automatisch zu `gpt-4o-mini` bei Rate Limits

### Anthropic Client
- **Dateien:** 
  - `backend/app/routers/vision.py`
  - `backend/app/routers/finance.py`
  - `backend/app/routers/smart_import.py`
  - `backend/app/routers/objections.py`
  - `backend/app/routers/stakeholder.py`
- **Typ:** `Anthropic`
- **Initialisierung:** Pro Request (kein Singleton)
- **API Key:** `ANTHROPIC_API_KEY` (Environment Variable)

### Groq Client (Self-Hosted LLM)
- **Datei:** `backend/app/services/collective_intelligence_engine.py`
- **Klasse:** `SelfHostedLLMClient`
- **Provider:** `LLMProvider.GROQ`
- **Base URL:** `https://api.groq.com/openai/v1`
- **API Key:** `GROQ_API_KEY` (Environment Variable)
- **Status:** Optional (für Collective Intelligence Engine)

### Ollama Client
- **Datei:** `backend/app/services/collective_intelligence_engine.py`
- **Klasse:** `SelfHostedLLMClient`
- **Provider:** `LLMProvider.OLLAMA`
- **Base URL:** `OLLAMA_BASE_URL` (Default: `http://localhost:11434`)
- **Status:** Optional (für lokale Entwicklung)

### AIClientManager
- **Datei:** `backend/app/core/ai_clients.py`
- **Klasse:** `AIClientManager`
- **Unterstützte Provider:**
  - `OpenAIClient` (GPT-4o, GPT-4o-mini)
  - `AnthropicClient` (Claude 3.5 Sonnet, Claude 3.5 Haiku)
- **Verwendung:** Zentraler Router für Multi-Provider-Support

---

## 📊 5. Kostenübersicht (pro 1M Tokens)

### OpenAI
| Modell | Input | Output |
|--------|-------|--------|
| gpt-4o | $2.50 | $10.00 |
| gpt-4o-mini | $0.15 | $0.60 |

### Anthropic
| Modell | Input | Output |
|--------|-------|--------|
| claude-3-5-sonnet | $3.00 | $15.00 |
| claude-3-5-haiku | $0.25 | $1.25 |

### Groq (Self-Hosted)
| Modell | Input | Output |
|--------|-------|--------|
| llama-3.1-8b-instant | ~$0.001 | ~$0.001 |
| llama-3.3-70b-versatile | ~$0.001 | ~$0.001 |

### Future
| Modell | Input | Output |
|--------|-------|--------|
| llama-3-70b | $0.001 | $0.002 |

---

## 🔄 6. Fallback-Strategien

### OpenAI Fallback (`agent.py`)
```python
Fallback-Kaskade:
gpt-4o → gpt-4o-mini (bei Rate Limit)
gpt-4-turbo → gpt-4o-mini
gpt-4 → gpt-4o-mini
```

### Multi-Provider Fallback (`ai_policies.py`)
```python
FALLBACK_CASCADE = {
    GPT_4O: [CLAUDE_35_SONNET, GPT_4O_MINI],
    GPT_4O_MINI: [CLAUDE_35_HAIKU],
    CLAUDE_35_SONNET: [GPT_4O_MINI],
    CLAUDE_35_HAIKU: [GPT_4O_MINI],
}
```

### Retry-Logic
- **Max Retries:** 3
- **Backoff:** Exponential (10s, 20s, 30s)
- **Final Fallback:** Immer `gpt-4o-mini`

---

## 📦 7. Installierte Packages

### AI/ML Packages (`requirements.txt`)
```python
openai>=1.12.0,<2.0.0      # OpenAI API Client
anthropic==0.34.2          # Anthropic Claude API
langchain==0.1.6           # LangChain (optional)
tiktoken==0.6.0            # Token Counting
```

---

## 🎯 8. Aktuelle Konfiguration

### Default Model
- **Environment:** `OPENAI_MODEL` (Default: `gpt-4o-mini`)
- **Config:** `openai_model` in `config.py` (Default: `gpt-4-turbo-preview` - Legacy)

### Context Window
- **History Limit:** Letzte 5 Messages (Performance-Optimierung)
- **Max Tokens:** 2000 (Config), 600 (Default in Router)

### Temperature
- **Default:** 0.7 (Config), 0.35 (Router)
- **Intent Detection:** 0.1 (für konsistente Klassifizierung)

---

## 📝 9. Zusammenfassung

### Aktiv verwendete Modelle:
1. **gpt-4o-mini** - Hauptmodell (90% der Requests)
2. **gpt-4o** - Für komplexe Content-Generierung
3. **claude-3-5-sonnet** - Vision & Receipt Scanning
4. **claude-haiku-4-5** - Simple Extraction Tasks

### Optional/Experimental:
- **Groq (Llama 3.1)** - Collective Intelligence Engine
- **Ollama** - Lokale Entwicklung

### Performance-Optimierungen:
- ✅ Default auf gpt-4o-mini (16x günstiger)
- ✅ History auf 5 Messages begrenzt
- ✅ Automatisches Fallback bei Rate Limits
- ✅ Intent-basiertes Routing

---

**Letzte Aktualisierung:** 2025-01-XX
**Version:** 1.0

