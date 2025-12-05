# 🏆 NON PLUS ULTRA: Collective Intelligence Implementation Guide

## Übersicht

Dieses Dokument beschreibt die vollständige Implementierung des "Non Plus Ultra" Konzepts für SalesFlow - ein System das von allen Nutzern lernt, diese Daten aber strikt intern und nur für eigene User verwendet.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ Ebene 4: BEREITSTELLUNG (RAG + Inferenz + Styling mit D_User)              │
│ → response_styling_templates, rag_retrieval_log                            │
├─────────────────────────────────────────────────────────────────────────────┤
│ Ebene 3: GLOBALES MODELL (W_Global via Self-Hosted LLM)                    │
│ → global_model_registry, knowledge_graph_nodes, knowledge_graph_edges      │
├─────────────────────────────────────────────────────────────────────────────┤
│ Ebene 2: GENERALISIERUNG (Differential Privacy, RLHF Feedback)             │
│ → rlhf_feedback_sessions, training_data_pool, privacy_audit_log            │
├─────────────────────────────────────────────────────────────────────────────┤
│ Ebene 1: LOKAL (D_User Profile, Session Cache)                             │
│ → user_learning_profile, user_session_cache                                │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 📋 Inhaltsverzeichnis

1. [Voraussetzungen](#1-voraussetzungen)
2. [Installation](#2-installation)
3. [Architektur-Details](#3-architektur-details)
4. [Self-Hosted LLM Setup](#4-self-hosted-llm-setup)
5. [Datenbank-Schema](#5-datenbank-schema)
6. [API-Nutzung](#6-api-nutzung)
7. [RLHF Training Pipeline](#7-rlhf-training-pipeline)
8. [Differential Privacy](#8-differential-privacy)
9. [Governance & Compliance](#9-governance--compliance)
10. [Monitoring & Metriken](#10-monitoring--metriken)

---

## 1. Voraussetzungen

### Hardware (für Self-Hosted LLM)

| Modell | Min. VRAM | Empfohlen | Inference Speed |
|--------|-----------|-----------|-----------------|
| Llama 3.1 8B | 8 GB | 16 GB | ~30 tok/s |
| Llama 3.1 70B | 40 GB | 80 GB | ~10 tok/s |
| Mistral 7B | 8 GB | 16 GB | ~40 tok/s |

### Software

- **Python 3.11+**
- **PostgreSQL 15+** mit `pgvector` Extension
- **Ollama** (für lokale LLM Inference) oder **vLLM** (Production)
- **Supabase** (bereits im Projekt)

---

## 2. Installation

### 2.1 Datenbank-Migration ausführen

```bash
# In Supabase Dashboard oder via CLI
psql -h your-supabase-host -d postgres -f supabase/migrations/20251205_NON_PLUS_ULTRA_collective_intelligence.sql
```

### 2.2 Ollama installieren und konfigurieren

```bash
# Windows
winget install Ollama.Ollama

# Oder Download von https://ollama.com/download

# Modell herunterladen
ollama pull llama3.1:8b
ollama pull nomic-embed-text

# Server starten (läuft standardmäßig auf Port 11434)
ollama serve
```

### 2.3 Environment Variables setzen

Füge zu deiner `.env` hinzu:

```env
# ═══════════════════════════════════════════════════════════════
# COLLECTIVE INTELLIGENCE SETTINGS
# ═══════════════════════════════════════════════════════════════

# Self-Hosted LLM (Ollama)
CI_OLLAMA_BASE_URL=http://localhost:11434
CI_OLLAMA_MODEL=llama3.1:8b
CI_OLLAMA_EMBEDDING_MODEL=nomic-embed-text

# RAG Settings
CI_RAG_ENABLED=true
CI_RAG_TOP_K=5
CI_RAG_MIN_SIMILARITY=0.7

# RLHF Settings
CI_RLHF_ENABLED=true
CI_RLHF_MIN_SAMPLE_SIZE=30

# Differential Privacy
CI_PRIVACY_EPSILON=1.0

# Governance
CI_AUDIT_LOGGING_ENABLED=true
CI_PII_DETECTION_ENABLED=true
```

### 2.4 Python Dependencies installieren

```bash
pip install httpx pydantic-settings
```

---

## 3. Architektur-Details

### 3.1 Ebene 1: Lokale User-Daten (D_User)

**Zweck:** Hyper-Personalisierung der KI-Antworten

**Tabellen:**
- `user_learning_profile`: Kommunikationsmuster, Tonalität, Erfolgsmetriken
- `user_session_cache`: Kurzzeit-Kontext für Sessions

**Daten die gespeichert werden:**
```python
UserProfile:
    - preferred_tone: "professional" | "casual" | "enthusiastic" | ...
    - emoji_usage_level: 0-5
    - formality_score: 0.0-1.0
    - sales_style: "challenger" | "relationship" | "solution" | ...
    - top_script_ids: [UUID, ...]
    - contribute_to_global_learning: bool  # OPT-OUT Control
```

### 3.2 Ebene 2: Generalisierung (Datenschutz-Filter)

**Zweck:** Anonymisierung und Aggregation für kollektives Lernen

**Tabellen:**
- `rlhf_feedback_sessions`: Strukturiertes RLHF Feedback
- `training_data_pool`: Anonymisierte Trainings-Datensätze
- `privacy_audit_log`: Audit-Trail für alle Privacy-Operationen

**RLHF Feedback Flow:**
```
User Interaktion → Outcome Recording → Composite Reward Berechnung
                                            ↓
                                    Aggregation mit Differential Privacy
                                            ↓
                                    training_data_pool (anonymisiert)
```

**Composite Reward Formel:**
```
composite_reward = 
    (user_rating/5 * 0.3) +
    (response_used ? 0.2 : 0) +
    (outcome == 'converted' ? 0.5 : 
     outcome == 'positive_reply' ? 0.3 : 
     outcome == 'negative_reply' ? -0.2 : 0)
```

### 3.3 Ebene 3: Globales Modell (W_Global)

**Zweck:** Kollektives Wissen in den Modell-Gewichten

**Komponenten:**
- **Self-Hosted LLM:** Llama 3.1 via Ollama/vLLM
- **Knowledge Graph:** Strukturiertes Wissen mit Embeddings
- **Global Insights:** Aggregierte Erkenntnisse

**Knowledge Graph Struktur:**
```
[Objection] --handles--> [Strategy]
[Strategy] --effective_for--> [Persona]
[Script] --belongs_to--> [Company]
[Concept] --similar_to--> [Concept]
```

### 3.4 Ebene 4: Bereitstellung (RAG + Inferenz)

**Zweck:** Kombination von kollektivem Wissen mit individueller Präzision

**Formel:**
```
Antwort = LLM(W_Global | Prompt + RAG_Context + D_User)
```

**RAG Pipeline:**
1. Query Embedding erstellen
2. Semantic Search im Knowledge Graph (pgvector)
3. Top-K relevante Nodes abrufen
4. Context in Prompt einfügen
5. LLM Generation mit User-Styling

---

## 4. Self-Hosted LLM Setup

### 4.1 Ollama (Empfohlen für Entwicklung)

```bash
# Installation prüfen
ollama --version

# Verfügbare Modelle anzeigen
ollama list

# Modell herunterladen (8B für Standard-Hardware)
ollama pull llama3.1:8b

# Oder 70B für High-End Hardware
ollama pull llama3.1:70b

# Embedding Modell
ollama pull nomic-embed-text

# Server Status prüfen
curl http://localhost:11434/api/tags
```

### 4.2 vLLM (Empfohlen für Production)

```bash
# Installation
pip install vllm

# Server starten
python -m vllm.entrypoints.openai.api_server \
    --model meta-llama/Llama-3.1-8B-Instruct \
    --port 8000 \
    --tensor-parallel-size 1

# Oder mit Docker
docker run --runtime nvidia --gpus all \
    -v ~/.cache/huggingface:/root/.cache/huggingface \
    -p 8000:8000 \
    vllm/vllm-openai:latest \
    --model meta-llama/Llama-3.1-8B-Instruct
```

### 4.3 GPU Memory Optimization

```bash
# Für begrenzte VRAM: Quantisierung nutzen
ollama pull llama3.1:8b-q4_0  # 4-bit quantisiert, ~4GB VRAM

# vLLM mit AWQ Quantisierung
python -m vllm.entrypoints.openai.api_server \
    --model TheBloke/Llama-2-7B-Chat-AWQ \
    --quantization awq
```

---

## 5. Datenbank-Schema

### 5.1 Wichtigste Tabellen

| Tabelle | Ebene | Zweck |
|---------|-------|-------|
| `user_learning_profile` | 1 | User-spezifische Lernprofile |
| `user_session_cache` | 1 | Kurzzeit-Kontext |
| `rlhf_feedback_sessions` | 2 | RLHF Feedback |
| `training_data_pool` | 2 | Anonymisierte Trainings-Daten |
| `privacy_audit_log` | 2 | Privacy Audit Trail |
| `global_model_registry` | 3 | Modell-Versionen |
| `knowledge_graph_nodes` | 3 | Knowledge Graph Knoten |
| `knowledge_graph_edges` | 3 | Knowledge Graph Kanten |
| `global_insights` | 3 | Kollektive Erkenntnisse |
| `rag_retrieval_log` | 4 | RAG Logging |
| `response_styling_templates` | 4 | Styling Templates |

### 5.2 pgvector Index für Semantic Search

```sql
-- HNSW Index für schnelle Similarity Search
CREATE INDEX idx_kgn_embedding ON knowledge_graph_nodes 
    USING hnsw (embedding vector_cosine_ops);

-- Semantic Search Function
SELECT * FROM search_knowledge_graph(
    p_query_embedding := '[0.1, 0.2, ...]'::vector(1536),
    p_node_types := ARRAY['objection', 'strategy'],
    p_limit := 10,
    p_min_similarity := 0.7
);
```

---

## 6. API-Nutzung

### 6.1 Python Backend

```python
from app.services.collective_intelligence_engine import (
    create_collective_intelligence_engine,
    InputType,
    Outcome,
)
from app.supabase_client import get_supabase_client

# Engine initialisieren
db = get_supabase_client()
engine = create_collective_intelligence_engine(db, prefer_self_hosted=True)

# Antwort generieren
result = await engine.generate_response(
    user_id="user-uuid",
    prompt="Der Lead sagt 'Das ist mir zu teuer'. Wie antworte ich?",
    input_type=InputType.OBJECTION_RESPONSE,
    context={
        "vertical": "network_marketing",
        "channel": "whatsapp",
        "objection_category": "price",
        "disg_type": "D",
    },
    use_rag=True,
    record_for_rlhf=True,
)

print(f"Antwort: {result.response}")
print(f"Modell: {result.model_used}")
print(f"Latenz: {result.latency_ms}ms")
print(f"RLHF Session: {result.rlhf_session_id}")

# Feedback aufzeichnen (nach User-Interaktion)
await engine.record_feedback(
    rlhf_session_id=result.rlhf_session_id,
    outcome=Outcome.POSITIVE_REPLY,
    user_rating=4,
    response_used=True,
)
```

### 6.2 REST API Endpoint (FastAPI)

```python
from fastapi import APIRouter, Depends
from pydantic import BaseModel

router = APIRouter(prefix="/api/v2/collective-intelligence")

class GenerateRequest(BaseModel):
    prompt: str
    input_type: str
    context: dict = {}
    use_rag: bool = True

class GenerateResponse(BaseModel):
    response: str
    model_used: str
    latency_ms: int
    rlhf_session_id: str | None

@router.post("/generate", response_model=GenerateResponse)
async def generate(
    request: GenerateRequest,
    user_id: str = Depends(get_current_user_id),
    engine = Depends(get_ci_engine),
):
    result = await engine.generate_response(
        user_id=user_id,
        prompt=request.prompt,
        input_type=InputType(request.input_type),
        context=request.context,
        use_rag=request.use_rag,
    )
    return GenerateResponse(
        response=result.response,
        model_used=result.model_used,
        latency_ms=result.latency_ms,
        rlhf_session_id=result.rlhf_session_id,
    )
```

---

## 7. RLHF Training Pipeline

### 7.1 Feedback Collection

```sql
-- Feedback wird automatisch gesammelt via trigger_calculate_rlhf_reward

-- Manuelle Aggregation (z.B. täglich als Cron Job)
SELECT aggregate_training_data(
    p_training_category := 'objection_response',
    p_vertical := 'network_marketing',
    p_min_sample_size := 30,
    p_privacy_epsilon := 1.0
);
```

### 7.2 Training Data Export für Fine-Tuning

```sql
-- Export Training Data für Fine-Tuning
SELECT 
    training_category,
    prompt_template,
    ideal_response,
    context_features,
    noisy_success_rate as success_rate,
    avg_reward_score
FROM training_data_pool
WHERE 
    min_sample_size_reached = true
    AND noisy_success_rate >= 0.6
ORDER BY avg_reward_score DESC;
```

### 7.3 Fine-Tuning mit LoRA (Beispiel)

```python
# Beispiel: Fine-Tuning mit Hugging Face + LoRA
from peft import LoraConfig, get_peft_model
from transformers import AutoModelForCausalLM, AutoTokenizer

# Base Model laden
model = AutoModelForCausalLM.from_pretrained("meta-llama/Llama-3.1-8B-Instruct")
tokenizer = AutoTokenizer.from_pretrained("meta-llama/Llama-3.1-8B-Instruct")

# LoRA Config
lora_config = LoraConfig(
    r=16,
    lora_alpha=32,
    target_modules=["q_proj", "v_proj"],
    lora_dropout=0.05,
    task_type="CAUSAL_LM"
)

# PEFT Model
peft_model = get_peft_model(model, lora_config)

# Training mit aggregierten Daten aus training_data_pool
# ...
```

---

## 8. Differential Privacy

### 8.1 Laplace Noise Mechanismus

```sql
-- Laplace Noise wird automatisch hinzugefügt
SELECT add_laplace_noise(
    true_value := 0.75,      -- Echte Success Rate
    sensitivity := 1.0,       -- Sensitivität der Query
    epsilon := 1.0            -- Privacy Budget
);
-- Gibt z.B. 0.73 oder 0.78 zurück (mit Rauschen)
```

### 8.2 Privacy Budget Management

```python
# Privacy Budget pro Aggregation
PRIVACY_EPSILON = 1.0  # Niedrigere Werte = mehr Privatsphäre

# Bei ε = 1.0: ~63% Wahrscheinlichkeit dass Output ≤ 1 von echtem Wert abweicht
# Bei ε = 0.1: ~10% Wahrscheinlichkeit (viel mehr Rauschen)
```

### 8.3 Privacy Audit Trail

```sql
-- Alle Privacy-relevanten Operationen werden geloggt
SELECT * FROM privacy_audit_log
WHERE action_type = 'data_aggregation'
ORDER BY performed_at DESC
LIMIT 10;
```

---

## 9. Governance & Compliance

### 9.1 User Opt-Out

```python
# User kann Beitrag zu kollektivem Lernen deaktivieren
await engine.user_profile_service.set_opt_out(
    user_id="user-uuid",
    opt_out=True,  # Vollständiger Opt-Out
    # Oder spezifisch für Kontakte:
    contact_ids=["contact-1", "contact-2"]
)
```

### 9.2 PII Detection

```python
# Automatische PII-Erkennung in RLHF Sessions
# Erkannte Patterns: E-Mail, Telefon, IBAN

# Sessions mit PII werden markiert:
# contains_pii = true
# eligible_for_training = false
```

### 9.3 Bias Mitigation

```sql
-- Bias Detection Log
INSERT INTO bias_mitigation_log (
    detection_type,
    detected_pattern,
    severity,
    mitigation_action
) VALUES (
    'tone_bias',
    'Zu aggressive Antworten bei DISG-Typ S',
    'medium',
    'Tone Score Calibration in System Prompt'
);
```

### 9.4 Model Performance Tracking

```sql
-- Tägliches Performance Tracking
SELECT * FROM v_model_performance_comparison
WHERE status = 'production';

-- Vergleich mit Baseline
SELECT 
    tracking_date,
    avg_conversion_rate,
    baseline_conversion_rate,
    conversion_lift
FROM model_performance_tracking
WHERE model_version_id = 'current-model-uuid'
ORDER BY tracking_date DESC;
```

---

## 10. Monitoring & Metriken

### 10.1 Global Learning Dashboard

```sql
-- Dashboard View
SELECT * FROM v_global_learning_dashboard;

-- Ergebnis:
-- date       | total_sessions | conversions | positive_replies | avg_reward | active_users
-- 2024-12-05 | 1523           | 234         | 456              | 0.67       | 89
```

### 10.2 Training Data Quality

```sql
SELECT * FROM v_training_data_quality;

-- Ergebnis:
-- training_category   | vertical          | dataset_count | total_samples | avg_success_rate | ready_for_training
-- objection_response  | network_marketing | 15            | 2340          | 0.68             | 12
```

### 10.3 Key Performance Indicators

| KPI | Beschreibung | Zielwert |
|-----|--------------|----------|
| **Conversion Lift** | Verbesserung vs. Baseline | > 10% |
| **Avg Response Rating** | User-Bewertung (1-5) | > 4.0 |
| **RLHF Sample Size** | Sessions pro Kategorie | > 30 |
| **Privacy Epsilon** | Privacy Budget | ≤ 1.0 |
| **Model Latency** | Antwortzeit | < 2000ms |

---

## 🚀 Nächste Schritte

1. **Migration ausführen:** `20251205_NON_PLUS_ULTRA_collective_intelligence.sql`
2. **Ollama installieren und Modell herunterladen**
3. **Environment Variables konfigurieren**
4. **Knowledge Graph mit initialen Daten befüllen**
5. **RLHF Feedback in bestehende Flows integrieren**
6. **Monitoring Dashboard aufsetzen**

---

## 📚 Weiterführende Dokumentation

- [Ollama Documentation](https://ollama.com/docs)
- [vLLM Documentation](https://docs.vllm.ai/)
- [pgvector Documentation](https://github.com/pgvector/pgvector)
- [Differential Privacy Guide](https://www.microsoft.com/en-us/research/publication/differential-privacy/)
- [RLHF Best Practices](https://huggingface.co/blog/rlhf)

