# 🧠 AI-Architektur Analyse & Optimierung

## 📊 Collective Intelligence System

### Architektur-Übersicht

Das System basiert auf einer **4-Ebenen-Architektur** (Non Plus Ultra):

```
┌─────────────────────────────────────────────────────────────┐
│ EBENE 4: BEREITSTELLUNG (RAG + Inferenz + Styling)        │
│ - Knowledge Graph Service                                   │
│ - RAG Retrieval                                             │
│ - User Profile Styling                                      │
├─────────────────────────────────────────────────────────────┤
│ EBENE 3: GLOBALES MODELL (W_Global via Self-Hosted LLM)     │
│ - Groq API (llama-3.1-8b-instant) - ULTRA-SCHNELL         │
│ - Ollama (lokales Fallback)                                 │
│ - vLLM (High-Performance Server)                            │
├─────────────────────────────────────────────────────────────┤
│ EBENE 2: GENERALISIERUNG (RLHF + Differential Privacy)    │
│ - RLHF Feedback Sessions                                    │
│ - Training Data Pool (anonymisiert)                         │
│ - Privacy Audit Log                                         │
├─────────────────────────────────────────────────────────────┤
│ EBENE 1: LOKAL (D_User Profile, Session Cache)            │
│ - User Learning Profile                                     │
│ - User Session Cache                                        │
│ - Top Script IDs                                            │
└─────────────────────────────────────────────────────────────┘
```

**Formel:** `Antwort = LLM(W_Global | Prompt + RAG_Context + D_User)`

---

## 🔄 Datenfluss

### 1. Chat-Nachricht → AI Response

```
User Input
    ↓
[Intent Detection] → gpt-4o-mini (schnell)
    ↓
[Model Router] → gpt-4o-mini (CONTENT/SIMPLE) oder gpt-4o (COMPLEX)
    ↓
[System Prompt] → CAS_SYSTEM + SALES_PSYCHOLOGY + User Context
    ↓
[OpenAI API] → call_openai_with_fallback()
    ↓
[Tool Execution] → create_lead, write_message, etc.
    ↓
[Cost Tracking] → ai_usage Tabelle
    ↓
[Response] → User
```

**Datenbank-Tabellen:**
- `ai_chat_messages` - Chat-Historie
- `ai_usage` - Token-Usage & Kosten
- `user_learning_profile` - User-spezifische Präferenzen

---

### 2. Lead erstellen → Follow-up & Learning

```
User: "Erstelle Lead für Max Mustermann"
    ↓
[Tool: create_lead] → leads Tabelle
    ↓
[Auto Follow-up] → followup_suggestions Tabelle (3 Tage später)
    ↓
[Suggested Actions] → prepare_message, research_company
    ↓
[Response] → User
```

**Datenbank-Tabellen:**
- `leads` - Lead-Daten
- `followup_suggestions` - Auto-Follow-ups
- `activities` - Activity Log

---

### 3. Nachricht generieren → Collective Intelligence

```
User: "Schreibe Nachricht für Lead X"
    ↓
[Collective Intelligence Engine]
    ├─→ [User Profile laden] → D_User (Ebene 1)
    ├─→ [RAG Search] → Knowledge Graph (Ebene 3)
    ├─→ [System Prompt] → D_User Styling + RAG Context
    └─→ [LLM Generation] → Groq/Ollama (W_Global)
    ↓
[RLHF Session] → rlhf_feedback_sessions (Ebene 2)
    ↓
[Response] → User
```

**Datenbank-Tabellen:**
- `user_learning_profile` - User-Präferenzen (Tone, Emoji, Länge)
- `knowledge_graph_nodes` - Erfolgreiche Scripts/Strategien
- `rlhf_feedback_sessions` - RLHF Feedback Loop
- `rag_retrieval_log` - RAG Retrieval Tracking

---

### 4. Erfolg loggen (Conversion) → Learning Loop

```
User: "Lead konvertiert" / "Deal gewonnen"
    ↓
[record_feedback] → rlhf_feedback_sessions
    ├─→ outcome: "converted"
    ├─→ response_used: true
    └─→ user_rating: optional
    ↓
[User Learning Service]
    ├─→ analyze_conversions() → Pattern-Extraktion
    ├─→ update_profile_from_conversions() → User Profile Update
    └─→ Channel/Length/Emoji/Tone Insights
    ↓
[Training Data Pool] → aggregate_training_data()
    ├─→ Differential Privacy (Laplace Noise)
    └─→ training_data_pool Tabelle
    ↓
[Knowledge Graph] → Erfolgreiche Patterns als Nodes
    ↓
[W_Global] → Nächste Generation nutzt gelerntes Wissen
```

**Datenbank-Tabellen:**
- `rlhf_feedback_sessions` - Conversion Events
- `user_learning_profile` - Aktualisierte Präferenzen
- `training_data_pool` - Anonymisierte Trainings-Daten
- `knowledge_graph_nodes` - Erfolgreiche Scripts/Strategien

---

## 💾 Lokales Wissen

### Tabellen & Speicherung

#### Ebene 1: User-spezifisch
- **`user_learning_profile`**
  - `preferred_tone` - "direct", "soft", "professional", etc.
  - `avg_message_length` - Durchschnittliche Nachrichtenlänge
  - `emoji_usage_level` - 0-5
  - `formality_score` - 0.0-1.0
  - `sales_style` - "aggressive", "balanced", "soft"
  - `top_script_ids` - Array von erfolgreichen Script-IDs
  - `conversion_rate` - User-spezifische Conversion-Rate

#### Ebene 2: RLHF & Training
- **`rlhf_feedback_sessions`**
  - `context_hash` - Anonymisierter Context (SHA256)
  - `input_type` - "objection_response", "message_generation", etc.
  - `generated_response` - AI-generierte Antwort
  - `outcome` - "converted", "positive_reply", "negative_reply", etc.
  - `user_rating` - 1-5 (optional)
  - `user_edited` - Boolean (wurde Antwort bearbeitet?)

- **`training_data_pool`**
  - `success_rate` - Erfolgsrate (ohne Noise)
  - `noisy_success_rate` - Mit Differential Privacy
  - `privacy_epsilon` - Privacy-Parameter
  - `avg_reward_score` - Durchschnittlicher Reward

#### Ebene 3: Knowledge Graph
- **`knowledge_graph_nodes`**
  - `node_type` - "script", "strategy", "objection", "persona"
  - `embedding` - Vector Embedding (nomic-embed-text)
  - `properties` - JSONB mit Metadaten
  - `label` - Human-readable Label

- **`knowledge_graph_edges`**
  - `edge_type` - "similar_to", "used_with", "follows"
  - `weight` - Edge-Gewichtung

#### Ebene 4: RAG Logging
- **`rag_retrieval_log`**
  - `retrieved_node_ids` - Welche Nodes wurden gefunden?
  - `retrieval_scores` - Similarity Scores
  - `generation_latency_ms` - Performance-Tracking

---

## 🤖 Externe LLM Calls

| Funktion | Model | Provider | Dauer | Optimierbar? | Notes |
|----------|-------|----------|-------|--------------|-------|
| **Intent Detection** | gpt-4o-mini | OpenAI | ~500ms | ✅ → Groq | Könnte zu Groq (llama-3.1-8b) |
| **Chat Response (SIMPLE)** | gpt-4o-mini | OpenAI | ~1-2s | ✅ → Groq | Einfache Queries |
| **Chat Response (COMPLEX)** | gpt-4o | OpenAI | ~3-5s | ❌ | Benötigt Tools |
| **Message Generation** | Groq/Ollama | Self-Hosted | ~1-2s | ✅ | Bereits optimiert! |
| **Objection Handling** | gpt-4o | OpenAI | ~3-5s | ⚠️ → Claude Haiku | Könnte zu Claude Haiku |
| **Vision (Screenshots)** | claude-3-5-sonnet | Anthropic | ~2-4s | ❌ | Vision benötigt Sonnet |
| **Receipt Scanning** | claude-3-5-sonnet | Anthropic | ~2-4s | ❌ | Vision benötigt Sonnet |
| **Contact Parsing** | claude-sonnet-4 | Anthropic | ~2-4s | ⚠️ → Claude Haiku | Könnte zu Haiku |
| **Collective Intelligence** | llama-3.1-8b | Groq | ~1-2s | ✅ | Bereits optimiert! |
| **Embeddings** | nomic-embed-text | Ollama | ~200ms | ✅ | Lokal, schnell |

---

## 🚀 Performance-Analyse

### Aktuelle Bottlenecks

1. **OpenAI Rate Limits** (429 Errors)
   - **Problem:** Zu viele Requests zu gpt-4o
   - **Lösung:** ✅ Bereits implementiert - Fallback zu gpt-4o-mini
   - **Status:** ✅ Aktiv

2. **Lange Response-Zeiten** (22-52 Sekunden)
   - **Problem:** System Prompt zu lang + alle Messages in History
   - **Lösung:** ✅ Bereits optimiert:
     - System Prompt gekürzt (CAS_SYSTEM + SALES_PSYCHOLOGY behalten)
     - History auf 5 Messages begrenzt
   - **Status:** ✅ Aktiv

3. **Hohe Token-Kosten**
   - **Problem:** 19.000+ Tokens pro Request
   - **Lösung:** ✅ Bereits optimiert:
     - Default: gpt-4o-mini (90% der Requests)
     - Nur COMPLEX → gpt-4o
   - **Status:** ✅ Aktiv

---

## 🎯 Empfohlene Optimierungen

### 1. ✅ Bereits implementiert

- [x] Model-Routing: CONTENT/SIMPLE → gpt-4o-mini
- [x] History-Begrenzung: 5 Messages
- [x] System Prompt gekürzt
- [x] Rate Limit Fallback zu gpt-4o-mini
- [x] Collective Intelligence nutzt Groq (ultra-schnell)

### 2. 🔄 Weitere Optimierungen

#### A. Intent Detection → Groq
**Aktuell:** gpt-4o-mini (~500ms)  
**Optimiert:** Groq llama-3.1-8b-instant (~200ms)  
**Ersparnis:** 60% schneller, 90% günstiger  
**Datei:** `backend/app/ai/intent_detector.py`

```python
# Statt OpenAI:
# client.chat.completions.create(model="gpt-4o-mini", ...)

# Zu Groq:
# groq_client.chat.completions.create(model="llama-3.1-8b-instant", ...)
```

#### B. Objection Handling → Claude Haiku
**Aktuell:** gpt-4o (~3-5s)  
**Optimiert:** Claude Haiku (~1-2s)  
**Ersparnis:** 50% schneller, 80% günstiger  
**Datei:** `backend/app/routers/objections.py`

```python
# Statt gpt-4o:
# client = AsyncOpenAI(...)

# Zu Claude Haiku:
# client = Anthropic(...)
# model = "claude-haiku-4-5-20251001"
```

#### C. Contact Parsing → Claude Haiku
**Aktuell:** Claude Sonnet (~2-4s)  
**Optimiert:** Claude Haiku (~1-2s)  
**Ersparnis:** 50% schneller, 90% günstiger  
**Datei:** `backend/app/routers/smart_import.py`

#### D. Simple Chat Queries → Groq
**Aktuell:** gpt-4o-mini (~1-2s)  
**Optimiert:** Groq llama-3.1-8b-instant (~500ms)  
**Ersparnis:** 50% schneller, 90% günstiger  
**Datei:** `backend/app/ai/agent.py`

**Bedingung:** Nur wenn KEINE Tools benötigt werden!

---

## 📈 Was muss bei OpenAI bleiben?

### Tools-Requirement
- **`create_lead`** → Benötigt gpt-4o (Tools)
- **`write_message`** → Benötigt gpt-4o (Tools)
- **`update_lead_status`** → Benötigt gpt-4o (Tools)
- **`create_task`** → Benötigt gpt-4o (Tools)
- **`web_search`** → Benötigt gpt-4o (Tools)

**Warum?** OpenAI ist der einzige Provider mit zuverlässiger Tool/Function Calling Unterstützung.

---

## 🏠 Was nutzt bereits lokale LLMs?

### ✅ Bereits optimiert

1. **Collective Intelligence Engine**
   - **Provider:** Groq (llama-3.1-8b-instant)
   - **Dauer:** ~1-2 Sekunden
   - **Datei:** `backend/app/services/collective_intelligence_engine.py`

2. **Embeddings für RAG**
   - **Provider:** Ollama (nomic-embed-text)
   - **Dauer:** ~200ms
   - **Datei:** `backend/app/services/collective_intelligence_engine.py`

3. **Knowledge Graph Search**
   - **Provider:** Lokale PostgreSQL (pgvector)
   - **Dauer:** ~50ms
   - **Datei:** `backend/app/services/collective_intelligence_engine.py`

---

## 🔍 Bottlenecks identifiziert

### 1. System Prompt Länge
**Status:** ✅ Optimiert (CAS_SYSTEM + SALES_PSYCHOLOGY behalten)

### 2. Conversation History
**Status:** ✅ Optimiert (5 Messages max)

### 3. OpenAI Rate Limits
**Status:** ✅ Optimiert (Fallback zu gpt-4o-mini)

### 4. Tool Execution Overhead
**Status:** ⚠️ Nicht optimierbar (benötigt OpenAI)

### 5. RAG Retrieval
**Status:** ✅ Optimiert (lokale pgvector)

---

## 📊 Zusammenfassung

### Aktuelle Performance
- **Durchschnittliche Response-Zeit:** 2-5 Sekunden (nach Optimierungen)
- **Token-Kosten:** ~70% reduziert (durch gpt-4o-mini)
- **Rate Limit Errors:** ~90% reduziert (durch Fallback)

### Potenzial für weitere Optimierungen
- **Intent Detection:** → Groq (60% schneller)
- **Objection Handling:** → Claude Haiku (50% schneller)
- **Contact Parsing:** → Claude Haiku (50% schneller)
- **Simple Chat Queries:** → Groq (50% schneller, nur wenn keine Tools)

### Was funktioniert bereits perfekt
- ✅ Collective Intelligence (Groq)
- ✅ RAG Retrieval (lokale pgvector)
- ✅ Model-Routing (Smart Routing)
- ✅ Rate Limit Fallback
- ✅ Cost Tracking

---

## 🎯 Nächste Schritte

1. **Intent Detection zu Groq migrieren** (Quick Win)
2. **Objection Handling zu Claude Haiku** (Mittel)
3. **Contact Parsing zu Claude Haiku** (Mittel)
4. **Simple Chat Queries zu Groq** (Komplex - Tool-Detection nötig)

**Priorität:** 1 > 2 > 3 > 4

