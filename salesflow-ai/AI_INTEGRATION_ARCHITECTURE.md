# SalesFlow AI – AI Integration Architecture

## 1. Summary

- **Multi-Model Support**: GPT-4o (Primary), Claude 3.5 (Fallback), GPT-4o-mini (Cost-Optimized)
- **Smart Routing**: Task-basierte Modellauswahl mit automatischem Fallback
- **Error Handling**: Retry-Logik mit exponentieller Backoff und Fallback-Kaskaden
- **Prompt-Versionierung**: A/B-Testing-fähige Prompt-Struktur mit Few-Shot-Learning
- **Monitoring**: Token-Tracking, Cost-Tracking, Quality-Metriken pro Modell & Task-Typ

---

## 2. System Design

### 2.1 Aktueller Stand & Probleme

#### ✅ Stärken der aktuellen Struktur

1. **Zentrale Prompt-Verwaltung** (`app/core/ai_prompts.py`):
   - Klare Trennung zwischen `SALES_COACH_PROMPT` und `CHIEF_FOUNDER_PROMPT`
   - Action-basierte Prompt-Auswahl (`detect_action_from_text`)
   - Helper-Funktionen für Kontext-Integration

2. **Einfacher AI-Client** (`app/ai_client.py`):
   - Saubere Abstraktion über OpenAI API
   - Vendor-spezifische Details gekapselt

3. **Mock-Fallback**:
   - System funktioniert auch ohne API Keys (Development-freundlich)

#### ❌ Schwächen & Probleme

1. **Kein Multi-Model Support**:
   - Nur OpenAI, hardcoded `gpt-4o-mini`
   - Kein Claude 3.5 als Fallback
   - Keine Cost-Optimierung (Mini vs. 4o)

2. **Keine zentrale Routing-Logik**:
   - Jeder Router erstellt eigenen `AIClient`
   - Keine einheitliche Modellauswahl
   - Keine Task-basierte Policy

3. **Fehlende Error-Behandlung**:
   - Keine Retry-Logik bei Timeouts
   - Kein automatischer Fallback bei Rate Limits
   - Fehler werden nur geloggt, nicht behandelt

4. **Keine Metriken**:
   - Kein Token-Tracking
   - Keine Cost-Tracking
   - Keine Quality-Metriken (User-Feedback, Conversion)

5. **Keine Prompt-Versionierung**:
   - Statische Prompts, keine A/B-Testing-Infrastruktur
   - Keine Few-Shot-Integration aus Feedback

6. **Keine Context-Optimierung**:
   - Vollständiger Kontext wird immer gesendet
   - Keine Trunkierung/Ranking bei langen Histories

---

### 2.2 Domain-Modell & Kernstrukturen

#### 2.2.1 Enums & Typen

```python
# app/core/ai_types.py

from enum import Enum
from typing import Literal, TypedDict, Optional, Dict, Any, List
from datetime import datetime

class AIModelName(str, Enum):
    """Unterstützte AI-Modelle"""
    GPT_4O = "gpt-4o"
    GPT_4O_MINI = "gpt-4o-mini"
    CLAUDE_35_SONNET = "claude-3-5-sonnet-20241022"
    CLAUDE_35_HAIKU = "claude-3-5-haiku-20241022"

class AITaskType(str, Enum):
    """Task-Kategorien für Smart Routing"""
    SALES_COACH_CHAT = "sales_coach_chat"
    FOLLOWUP_GENERATION = "followup_generation"
    TEMPLATE_OPTIMIZATION = "template_optimization"
    SENTIMENT_ANALYSIS = "sentiment_analysis"
    CLASSIFICATION = "classification"
    OBJECTION_HANDLER = "objection_handler"
    LEAD_ANALYSIS = "lead_analysis"
    CLOSING_HELPER = "closing_helper"
    OFFER_CREATE = "offer_create"
    RESEARCH_PERSON = "research_person"
    CALL_SCRIPT = "call_script"
    DAILY_PLAN = "daily_plan"
    SUMMARY_COACHING = "summary_coaching"
    GENERATE_MESSAGE = "generate_message"

class ImportanceLevel(str, Enum):
    """Wichtigkeit für Modellauswahl"""
    LOW = "low"      # Mini reicht
    MEDIUM = "medium"  # 4o empfohlen
    HIGH = "high"    # 4o zwingend

class CostSensitivity(str, Enum):
    """Kostenbewusstsein"""
    LOW = "low"      # Qualität > Kosten
    MEDIUM = "medium"
    HIGH = "high"    # Kosten > Qualität

class AIRequestConfig(TypedDict, total=False):
    """Konfiguration für AI-Request"""
    model: Optional[AIModelName]  # Explizite Modellauswahl (überschreibt Routing)
    temperature: float  # Default: 0.35
    max_tokens: int  # Default: 600
    importance: ImportanceLevel  # Default: MEDIUM
    cost_sensitivity: CostSensitivity  # Default: MEDIUM
    timeout: float  # Default: 30.0
    retry_count: int  # Default: 3
    enable_fallback: bool  # Default: True
    context_max_tokens: Optional[int]  # Trunkierung bei langen Histories

class PromptDefinition(TypedDict, total=False):
    """Versionierte Prompt-Definition"""
    key: str  # z.B. "sales_coach_chat"
    version: str  # z.B. "v1", "v2"
    variant: str  # z.B. "A", "B" für A/B-Testing
    task_type: AITaskType
    default_model: AIModelName
    system_prompt: str
    few_shot_examples: List[Dict[str, str]]  # [{"input": "...", "output": "..."}]
    metadata: Dict[str, Any]  # Zusätzliche Metadaten

class AIRequestResult(TypedDict):
    """Ergebnis eines AI-Requests"""
    text: str
    model_used: AIModelName
    prompt_key: str
    prompt_version: str
    prompt_variant: str
    tokens_prompt: int
    tokens_completion: int
    cost_estimate: float  # USD
    latency_ms: float
    fallback_used: bool
    retry_count: int
    metadata: Dict[str, Any]
```

#### 2.2.2 Routing-Policies

```python
# app/core/ai_policies.py

from .ai_types import AIModelName, AITaskType, ImportanceLevel, CostSensitivity

# Task → Modell-Mapping (Default-Policy)
TASK_MODEL_MAPPING: Dict[AITaskType, AIModelName] = {
    # High-Quality Tasks → GPT-4o
    AITaskType.SALES_COACH_CHAT: AIModelName.GPT_4O,
    AITaskType.OBJECTION_HANDLER: AIModelName.GPT_4O,
    AITaskType.CLOSING_HELPER: AIModelName.GPT_4O,
    AITaskType.LEAD_ANALYSIS: AIModelName.GPT_4O,
    AITaskType.OFFER_CREATE: AIModelName.GPT_4O,
    
    # Medium Tasks → GPT-4o (kann auf Mini downgraden bei Cost Sensitivity)
    AITaskType.FOLLOWUP_GENERATION: AIModelName.GPT_4O,
    AITaskType.TEMPLATE_OPTIMIZATION: AIModelName.GPT_4O,
    AITaskType.RESEARCH_PERSON: AIModelName.GPT_4O,
    AITaskType.CALL_SCRIPT: AIModelName.GPT_4O,
    
    # Low-Complexity Tasks → Mini
    AITaskType.SENTIMENT_ANALYSIS: AIModelName.GPT_4O_MINI,
    AITaskType.CLASSIFICATION: AIModelName.GPT_4O_MINI,
    AITaskType.DAILY_PLAN: AIModelName.GPT_4O_MINI,
    AITaskType.GENERATE_MESSAGE: AIModelName.GPT_4O_MINI,
}

# Fallback-Kaskade
FALLBACK_CASCADE: Dict[AIModelName, List[AIModelName]] = {
    AIModelName.GPT_4O: [
        AIModelName.CLAUDE_35_SONNET,
        AIModelName.GPT_4O_MINI,
    ],
    AIModelName.GPT_4O_MINI: [
        AIModelName.CLAUDE_35_HAIKU,
    ],
    AIModelName.CLAUDE_35_SONNET: [
        AIModelName.GPT_4O_MINI,
    ],
    AIModelName.CLAUDE_35_HAIKU: [
        AIModelName.GPT_4O_MINI,
    ],
}

def select_model(
    task_type: AITaskType,
    importance: ImportanceLevel = ImportanceLevel.MEDIUM,
    cost_sensitivity: CostSensitivity = CostSensitivity.MEDIUM,
    explicit_model: Optional[AIModelName] = None,
) -> AIModelName:
    """
    Wählt Modell basierend auf Task, Importance und Cost Sensitivity.
    """
    if explicit_model:
        return explicit_model
    
    base_model = TASK_MODEL_MAPPING.get(task_type, AIModelName.GPT_4O)
    
    # Cost-Optimierung: Downgrade zu Mini wenn möglich
    if cost_sensitivity == CostSensitivity.HIGH and base_model == AIModelName.GPT_4O:
        # Nur bei LOW Importance downgraden
        if importance == ImportanceLevel.LOW:
            return AIModelName.GPT_4O_MINI
    
    # Quality-First: Upgrade zu 4o wenn HIGH Importance
    if importance == ImportanceLevel.HIGH and base_model == AIModelName.GPT_4O_MINI:
        return AIModelName.GPT_4O
    
    return base_model
```

---

### 2.3 Smart Routing & Modell-Policies

#### 2.3.1 AI Router Architektur

Der `AIRouter` ist die zentrale Komponente für alle AI-Requests:

```
┌─────────────────────────────────────────────────────────────┐
│                        AIRouter                               │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  1. Request empfangen                                        │
│     └─> Task Type, Payload, Config                           │
│                                                               │
│  2. Prompt-Definition laden                                   │
│     └─> get_prompt_definition(task_type, config)             │
│                                                               │
│  3. Modell auswählen                                         │
│     └─> select_model(task_type, importance, cost_sensitivity)│
│                                                               │
│  4. Request ausführen (mit Retry & Fallback)                 │
│     ├─> Primary Model versuchen                              │
│     ├─> Bei Fehler: Fallback Model                          │
│     └─> Bei erneutem Fehler: Graceful Degradation            │
│                                                               │
│  5. Metriken loggen                                          │
│     └─> Tokens, Cost, Latency, Quality                       │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

#### 2.3.2 Routing-Strategien

**Strategy 1: Cost-Optimized**
- Startet mit Mini, upgradet nur bei Unsicherheit
- Für: Bulk-Operations, Klassifikationen, einfache Tasks

**Strategy 2: Quality-First**
- Startet mit 4o, downgradet nur bei Rate Limits
- Für: Sales Coach Chat, Closing Helper, komplexe Reasoning

**Strategy 3: Balanced (Default)**
- Task-basierte Auswahl, Fallback bei Fehlern
- Für: Meiste Use Cases

---

### 2.4 Error Handling & Fallback-Strategien

#### 2.4.1 Fehler-Typen & Behandlung

| Fehler-Typ | Erkennung | Strategie |
|------------|-----------|-----------|
| **Timeout** | Request > timeout | Retry mit exponentiellem Backoff (1s, 2s, 4s) |
| **Rate Limit** | HTTP 429 | Queue + Retry nach `Retry-After` Header |
| **API Error (5xx)** | HTTP 500-599 | Sofortiger Fallback auf nächstes Modell |
| **Invalid Response** | Leere Antwort, JSON-Parse-Error | Retry mit vereinfachtem Prompt |
| **Off-Policy Content** | Content-Filter-Flag | Fallback auf anderes Modell |

#### 2.4.2 Fallback-Kaskade

```
Primary: GPT-4o
  ↓ (Timeout/Rate Limit)
Fallback 1: Claude 3.5 Sonnet
  ↓ (Fehler)
Fallback 2: GPT-4o-mini (mit vereinfachtem Prompt)
  ↓ (Fehler)
Graceful Degradation: Template-basierte Antwort
```

#### 2.4.3 Retry-Logik

```python
async def _execute_with_retry(
    model: AIModelName,
    prompt: str,
    messages: List[ChatMessage],
    config: AIRequestConfig,
    max_retries: int = 3,
) -> AIRequestResult:
    """
    Führt Request mit Retry-Logik aus.
    """
    for attempt in range(max_retries):
        try:
            result = await _call_model(model, prompt, messages, config)
            return result
        except TimeoutError:
            if attempt < max_retries - 1:
                wait_time = 2 ** attempt  # Exponentielles Backoff
                await asyncio.sleep(wait_time)
                continue
            raise
        except RateLimitError as e:
            if attempt < max_retries - 1:
                wait_time = e.retry_after or (2 ** attempt)
                await asyncio.sleep(wait_time)
                continue
            raise
        except APIError:
            # Sofortiger Fallback, kein Retry
            raise
```

---

### 2.5 Prompt-Optimierung & A/B Testing

#### 2.5.1 Prompt-Versionierung

**Struktur:**
```
prompt_key: "sales_coach_chat"
  ├─ version: "v1"
  │   ├─ variant: "A" (Original)
  │   └─ variant: "B" (Optimiert)
  └─ version: "v2"
      └─ variant: "A" (Neue Struktur)
```

**Datenbank-Schema (vereinfacht):**
```sql
CREATE TABLE prompt_definitions (
    id UUID PRIMARY KEY,
    key TEXT NOT NULL,
    version TEXT NOT NULL,
    variant TEXT NOT NULL,
    task_type TEXT NOT NULL,
    system_prompt TEXT NOT NULL,
    few_shot_examples JSONB DEFAULT '[]',
    default_model TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(key, version, variant)
);

CREATE TABLE prompt_performance (
    id UUID PRIMARY KEY,
    prompt_key TEXT NOT NULL,
    prompt_version TEXT NOT NULL,
    prompt_variant TEXT NOT NULL,
    model_used TEXT NOT NULL,
    task_type TEXT NOT NULL,
    user_rating INTEGER,  -- 1-5 Sterne
    conversion BOOLEAN,    -- Hat Request zu Conversion geführt?
    tokens_used INTEGER,
    cost_estimate FLOAT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### 2.5.2 Few-Shot-Learning

**Integration von User-Feedback:**
- Korrigierte Antworten werden als Few-Shot-Examples gespeichert
- Prompts werden dynamisch mit relevanten Examples erweitert
- Ranking: Beste Examples (hohe User-Ratings) werden bevorzugt

**Beispiel:**
```python
few_shot_examples = [
    {
        "input": "Kunde sagt: 'Zu teuer'",
        "output": "Verstehe ich total. Lass uns schauen, was für dich passt...",
        "rating": 5,
        "conversion": True,
    },
    # ...
]
```

---

### 2.6 Monitoring & Metriken

#### 2.6.1 Events

**Request-Events:**
- `ai_request_started`: Request gestartet (Task, Modell, Prompt-Version)
- `ai_request_succeeded`: Erfolgreich (Tokens, Cost, Latency)
- `ai_request_failed`: Fehlgeschlagen (Error-Type, Retry-Count)
- `ai_request_fallback_used`: Fallback aktiviert (Von → Zu)

**Quality-Events:**
- `ai_response_rated`: User-Rating (1-5 Sterne)
- `ai_response_converted`: Conversion (z.B. Lead → Deal)
- `ai_response_rejected`: User hat Antwort abgelehnt

#### 2.6.2 Metriken

**Token Usage:**
- Pro Modell (GPT-4o, Mini, Claude)
- Pro Task-Typ
- Pro User/Workspace
- Aggregiert: Tag/Woche/Monat

**Cost Tracking:**
- Geschätzte Kosten pro Request (basierend auf Token-Preisen)
- Cost per Feature (z.B. Followup-Generation)
- Cost per Customer
- Budget-Alerts bei Überschreitung

**Performance:**
- Latenz: p50, p95, p99 pro Modell & Task
- Error-Rate & Fallback-Rate
- Rate-Limit-Auslastung

**Quality:**
- Durchschnittliche User-Ratings pro Prompt-Version
- Conversion-Rate pro Variante (A/B-Testing)
- Rejection-Rate (User lehnt Antwort ab)

---

## 3. Python-Implementierung (Ausschnitte)

### 3.1 Typen & Enums (`ai_types.py`)

```python
# app/core/ai_types.py

from enum import Enum
from typing import Literal, TypedDict, Optional, Dict, Any, List
from datetime import datetime

class AIModelName(str, Enum):
    """Unterstützte AI-Modelle"""
    GPT_4O = "gpt-4o"
    GPT_4O_MINI = "gpt-4o-mini"
    CLAUDE_35_SONNET = "claude-3-5-sonnet-20241022"
    CLAUDE_35_HAIKU = "claude-3-5-haiku-20241022"

class AITaskType(str, Enum):
    """Task-Kategorien für Smart Routing"""
    SALES_COACH_CHAT = "sales_coach_chat"
    FOLLOWUP_GENERATION = "followup_generation"
    TEMPLATE_OPTIMIZATION = "template_optimization"
    SENTIMENT_ANALYSIS = "sentiment_analysis"
    CLASSIFICATION = "classification"
    OBJECTION_HANDLER = "objection_handler"
    LEAD_ANALYSIS = "lead_analysis"
    CLOSING_HELPER = "closing_helper"
    OFFER_CREATE = "offer_create"
    RESEARCH_PERSON = "research_person"
    CALL_SCRIPT = "call_script"
    DAILY_PLAN = "daily_plan"
    SUMMARY_COACHING = "summary_coaching"
    GENERATE_MESSAGE = "generate_message"

class ImportanceLevel(str, Enum):
    """Wichtigkeit für Modellauswahl"""
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"

class CostSensitivity(str, Enum):
    """Kostenbewusstsein"""
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"

class AIRequestConfig(TypedDict, total=False):
    """Konfiguration für AI-Request"""
    model: Optional[AIModelName]
    temperature: float
    max_tokens: int
    importance: ImportanceLevel
    cost_sensitivity: CostSensitivity
    timeout: float
    retry_count: int
    enable_fallback: bool
    context_max_tokens: Optional[int]

class PromptDefinition(TypedDict, total=False):
    """Versionierte Prompt-Definition"""
    key: str
    version: str
    variant: str
    task_type: AITaskType
    default_model: AIModelName
    system_prompt: str
    few_shot_examples: List[Dict[str, str]]
    metadata: Dict[str, Any]

class AIRequestResult(TypedDict):
    """Ergebnis eines AI-Requests"""
    text: str
    model_used: AIModelName
    prompt_key: str
    prompt_version: str
    prompt_variant: str
    tokens_prompt: int
    tokens_completion: int
    cost_estimate: float
    latency_ms: float
    fallback_used: bool
    retry_count: int
    metadata: Dict[str, Any]

__all__ = [
    "AIModelName",
    "AITaskType",
    "ImportanceLevel",
    "CostSensitivity",
    "AIRequestConfig",
    "PromptDefinition",
    "AIRequestResult",
]
```

### 3.2 AI Router (`ai_router.py`)

```python
# app/core/ai_router.py

import asyncio
import logging
import time
from typing import Any, Dict, Optional, List
from datetime import datetime

from .ai_types import (
    AIModelName,
    AITaskType,
    AIRequestConfig,
    AIRequestResult,
    ImportanceLevel,
    CostSensitivity,
)
from .ai_clients import OpenAIClient, AnthropicClient
from .ai_prompts import get_prompt_definition
from .ai_policies import select_model, FALLBACK_CASCADE
from .ai_metrics import AIMetrics
from ..schemas import ChatMessage

logger = logging.getLogger(__name__)


class AIRouter:
    """
    Zentrale Komponente für alle AI-Requests.
    
    Features:
    - Smart Routing (Task → Modell)
    - Automatischer Fallback
    - Retry-Logik
    - Metriken-Tracking
    """
    
    def __init__(
        self,
        openai_client: OpenAIClient,
        anthropic_client: Optional[AnthropicClient] = None,
        metrics: Optional[AIMetrics] = None,
    ):
        self.openai = openai_client
        self.anthropic = anthropic_client
        self.metrics = metrics or AIMetrics()
    
    async def generate(
        self,
        task_type: AITaskType,
        user_payload: Dict[str, Any],
        config: Optional[AIRequestConfig] = None,
        user_id: Optional[str] = None,
    ) -> AIRequestResult:
        """
        High-level entrypoint für alle AI-Requests.
        
        Args:
            task_type: Task-Kategorie (z.B. FOLLOWUP_GENERATION)
            user_payload: {
                "message": str,
                "history": List[ChatMessage],
                "context": Optional[str],
            }
            config: Optionale Request-Konfiguration
            user_id: User-ID für Metriken
        
        Returns:
            AIRequestResult mit Text, Metadaten, Metriken
        """
        start_time = time.time()
        config = config or {}
        
        # 1) Prompt-Definition holen
        prompt_def = get_prompt_definition(task_type=task_type, config=config)
        
        # 2) Modell auswählen
        primary_model = select_model(
            task_type=task_type,
            importance=config.get("importance", ImportanceLevel.MEDIUM),
            cost_sensitivity=config.get("cost_sensitivity", CostSensitivity.MEDIUM),
            explicit_model=config.get("model"),
        )
        
        # 3) Fallback-Modell bestimmen
        fallback_models = FALLBACK_CASCADE.get(primary_model, [])
        
        # 4) Request ausführen mit Retry/Fallback
        result = await self._execute_with_fallback(
            primary_model=primary_model,
            fallback_models=fallback_models,
            prompt_def=prompt_def,
            user_payload=user_payload,
            config=config,
            user_id=user_id,
        )
        
        # 5) Metriken loggen
        latency_ms = (time.time() - start_time) * 1000
        result["latency_ms"] = latency_ms
        
        self.metrics.record_request_success(
            task_type=task_type,
            model_used=result["model_used"],
            prompt_key=prompt_def["key"],
            prompt_version=prompt_def["version"],
            prompt_variant=prompt_def["variant"],
            tokens_prompt=result["tokens_prompt"],
            tokens_completion=result["tokens_completion"],
            cost_estimate=result["cost_estimate"],
            latency_ms=latency_ms,
            fallback_used=result["fallback_used"],
            user_id=user_id,
        )
        
        return result
    
    async def _execute_with_fallback(
        self,
        primary_model: AIModelName,
        fallback_models: List[AIModelName],
        prompt_def: Dict[str, Any],
        user_payload: Dict[str, Any],
        config: AIRequestConfig,
        user_id: Optional[str],
    ) -> AIRequestResult:
        """
        Führt Request aus mit automatischem Fallback bei Fehlern.
        """
        models_to_try = [primary_model] + fallback_models
        last_error = None
        
        for model in models_to_try:
            try:
                result = await self._execute_single_request(
                    model=model,
                    prompt_def=prompt_def,
                    user_payload=user_payload,
                    config=config,
                )
                result["fallback_used"] = (model != primary_model)
                return result
            except Exception as e:
                logger.warning(f"Request mit {model} fehlgeschlagen: {e}")
                last_error = e
                if model == models_to_try[-1]:
                    # Letztes Modell, kein weiterer Fallback
                    break
        
        # Alle Modelle fehlgeschlagen → Graceful Degradation
        logger.error(f"Alle Modelle fehlgeschlagen: {last_error}")
        return self._graceful_degradation(
            task_type=prompt_def["task_type"],
            user_payload=user_payload,
            error=last_error,
        )
    
    async def _execute_single_request(
        self,
        model: AIModelName,
        prompt_def: Dict[str, Any],
        user_payload: Dict[str, Any],
        config: AIRequestConfig,
    ) -> AIRequestResult:
        """
        Führt einen einzelnen Request aus (mit Retry-Logik).
        """
        max_retries = config.get("retry_count", 3)
        timeout = config.get("timeout", 30.0)
        
        for attempt in range(max_retries):
            try:
                # Client auswählen
                if model in [AIModelName.GPT_4O, AIModelName.GPT_4O_MINI]:
                    client = self.openai
                elif model in [AIModelName.CLAUDE_35_SONNET, AIModelName.CLAUDE_35_HAIKU]:
                    if not self.anthropic:
                        raise ValueError(f"Anthropic Client nicht verfügbar für {model}")
                    client = self.anthropic
                else:
                    raise ValueError(f"Unbekanntes Modell: {model}")
                
                # Prompt aufbauen
                system_prompt = prompt_def["system_prompt"]
                messages = self._build_messages(user_payload, prompt_def)
                
                # Request ausführen
                start_time = time.time()
                response = await asyncio.wait_for(
                    client.generate(
                        model=model.value,
                        system_prompt=system_prompt,
                        messages=messages,
                        temperature=config.get("temperature", 0.35),
                        max_tokens=config.get("max_tokens", 600),
                    ),
                    timeout=timeout,
                )
                latency_ms = (time.time() - start_time) * 1000
                
                # Token-Usage extrahieren (falls verfügbar)
                tokens_prompt = getattr(response, "usage", {}).get("prompt_tokens", 0)
                tokens_completion = getattr(response, "usage", {}).get("completion_tokens", 0)
                
                # Cost schätzen
                cost_estimate = self._estimate_cost(
                    model=model,
                    tokens_prompt=tokens_prompt,
                    tokens_completion=tokens_completion,
                )
                
                return {
                    "text": response.text,
                    "model_used": model,
                    "prompt_key": prompt_def["key"],
                    "prompt_version": prompt_def["version"],
                    "prompt_variant": prompt_def["variant"],
                    "tokens_prompt": tokens_prompt,
                    "tokens_completion": tokens_completion,
                    "cost_estimate": cost_estimate,
                    "latency_ms": latency_ms,
                    "fallback_used": False,
                    "retry_count": attempt,
                    "metadata": {},
                }
            
            except asyncio.TimeoutError:
                if attempt < max_retries - 1:
                    wait_time = 2 ** attempt
                    await asyncio.sleep(wait_time)
                    continue
                raise
            
            except Exception as e:
                if attempt < max_retries - 1:
                    wait_time = 2 ** attempt
                    await asyncio.sleep(wait_time)
                    continue
                raise
        
        raise Exception("Max retries erreicht")
    
    def _build_messages(
        self,
        user_payload: Dict[str, Any],
        prompt_def: Dict[str, Any],
    ) -> List[ChatMessage]:
        """
        Baut Message-Liste mit Few-Shot-Examples.
        """
        messages = []
        
        # Few-Shot-Examples hinzufügen (falls vorhanden)
        for example in prompt_def.get("few_shot_examples", []):
            messages.append(ChatMessage(role="user", content=example["input"]))
            messages.append(ChatMessage(role="assistant", content=example["output"]))
        
        # History hinzufügen
        history = user_payload.get("history", [])
        messages.extend(history)
        
        # Aktuelle Nachricht
        messages.append(ChatMessage(role="user", content=user_payload["message"]))
        
        return messages
    
    def _estimate_cost(
        self,
        model: AIModelName,
        tokens_prompt: int,
        tokens_completion: int,
    ) -> float:
        """
        Schätzt Kosten basierend auf Token-Preisen (USD).
        """
        # Preise pro 1M Tokens (Stand: 2024)
        PRICING = {
            AIModelName.GPT_4O: {"prompt": 2.50, "completion": 10.00},
            AIModelName.GPT_4O_MINI: {"prompt": 0.15, "completion": 0.60},
            AIModelName.CLAUDE_35_SONNET: {"prompt": 3.00, "completion": 15.00},
            AIModelName.CLAUDE_35_HAIKU: {"prompt": 0.80, "completion": 4.00},
        }
        
        pricing = PRICING.get(model, {"prompt": 0, "completion": 0})
        cost = (
            (tokens_prompt / 1_000_000) * pricing["prompt"] +
            (tokens_completion / 1_000_000) * pricing["completion"]
        )
        return round(cost, 6)
    
    def _graceful_degradation(
        self,
        task_type: AITaskType,
        user_payload: Dict[str, Any],
        error: Exception,
    ) -> AIRequestResult:
        """
        Fallback auf Template-basierte Antwort wenn alle Modelle fehlschlagen.
        """
        # Template-basierte Antworten (vereinfacht)
        templates = {
            AITaskType.FOLLOWUP_GENERATION: "Hi! Wollte kurz nachhaken - hast du dir das schon anschauen können?",
            AITaskType.OBJECTION_HANDLER: "Verstehe ich total! Lass uns schauen, was für dich passt...",
            # ...
        }
        
        fallback_text = templates.get(
            task_type,
            "Entschuldigung, ich konnte gerade keine Antwort generieren. Bitte versuche es später erneut."
        )
        
        return {
            "text": fallback_text,
            "model_used": AIModelName.GPT_4O_MINI,  # Placeholder
            "prompt_key": "fallback",
            "prompt_version": "v1",
            "prompt_variant": "A",
            "tokens_prompt": 0,
            "tokens_completion": 0,
            "cost_estimate": 0.0,
            "latency_ms": 0.0,
            "fallback_used": True,
            "retry_count": 0,
            "metadata": {"error": str(error)},
        }


__all__ = ["AIRouter"]
```

### 3.3 Prompt-Definition & Versionierung (`ai_prompts.py` Erweiterung)

```python
# app/core/ai_prompts.py (Erweiterung)

from typing import Dict, Optional, List
from .ai_types import AITaskType, AIRequestConfig, PromptDefinition, AIModelName

# Bestehende Prompts bleiben erhalten
# ...

# Neue Funktionen für Versionierung

_PROMPT_REGISTRY: Dict[str, Dict[str, Dict[str, PromptDefinition]]] = {}

def register_prompt(definition: PromptDefinition) -> None:
    """
    Registriert eine Prompt-Definition.
    """
    key = definition["key"]
    version = definition["version"]
    variant = definition["variant"]
    
    if key not in _PROMPT_REGISTRY:
        _PROMPT_REGISTRY[key] = {}
    if version not in _PROMPT_REGISTRY[key]:
        _PROMPT_REGISTRY[key][version] = {}
    
    _PROMPT_REGISTRY[key][version][variant] = definition

def get_prompt_definition(
    task_type: AITaskType,
    config: Optional[AIRequestConfig] = None,
    version: Optional[str] = None,
    variant: Optional[str] = None,
) -> PromptDefinition:
    """
    Lädt Prompt-Definition für Task-Typ.
    
    Falls version/variant nicht angegeben, wird die neueste Version verwendet.
    """
    # Mapping: Task Type → Prompt Key
    TASK_TO_PROMPT_KEY = {
        AITaskType.SALES_COACH_CHAT: "sales_coach_chat",
        AITaskType.FOLLOWUP_GENERATION: "followup_generation",
        AITaskType.OBJECTION_HANDLER: "objection_handler",
        # ...
    }
    
    prompt_key = TASK_TO_PROMPT_KEY.get(task_type, "sales_coach_chat")
    
    # Falls nicht in Registry, erstelle aus bestehenden Prompts
    if prompt_key not in _PROMPT_REGISTRY:
        return _create_prompt_from_legacy(task_type, prompt_key)
    
    # Version auswählen
    versions = _PROMPT_REGISTRY[prompt_key]
    if version:
        target_version = version
    else:
        # Neueste Version (alphabetisch sortiert)
        target_version = max(versions.keys())
    
    # Variante auswählen
    variants = versions[target_version]
    if variant:
        target_variant = variant
    else:
        # Default: "A"
        target_variant = "A" if "A" in variants else list(variants.keys())[0]
    
    return variants[target_variant]

def _create_prompt_from_legacy(
    task_type: AITaskType,
    prompt_key: str,
) -> PromptDefinition:
    """
    Erstellt Prompt-Definition aus bestehenden Legacy-Prompts.
    """
    # Mapping zu bestehenden Prompts
    if task_type == AITaskType.SALES_COACH_CHAT:
        system_prompt = SALES_COACH_PROMPT
    elif task_type == AITaskType.OBJECTION_HANDLER:
        system_prompt = OBJECTION_BRAIN_SYSTEM_PROMPT  # Falls vorhanden
    else:
        system_prompt = SALES_COACH_PROMPT
    
    return {
        "key": prompt_key,
        "version": "v1",
        "variant": "A",
        "task_type": task_type,
        "default_model": AIModelName.GPT_4O,
        "system_prompt": system_prompt,
        "few_shot_examples": [],
        "metadata": {},
    }

# Initialisierung: Registriere bestehende Prompts
def _initialize_prompts():
    """Registriert alle Standard-Prompts."""
    # Beispiel
    register_prompt({
        "key": "sales_coach_chat",
        "version": "v1",
        "variant": "A",
        "task_type": AITaskType.SALES_COACH_CHAT,
        "default_model": AIModelName.GPT_4O,
        "system_prompt": SALES_COACH_PROMPT,
        "few_shot_examples": [],
        "metadata": {},
    })

_initialize_prompts()
```

### 3.4 Metrics & Logging (`ai_metrics.py`)

```python
# app/core/ai_metrics.py

import logging
from typing import Optional
from datetime import datetime
from .ai_types import AIModelName, AITaskType

logger = logging.getLogger(__name__)


class AIMetrics:
    """
    Zentrale Metriken-Komponente für AI-Requests.
    
    TODO: Integration mit Supabase/PostgreSQL für persistente Metriken.
    """
    
    def __init__(self):
        self._request_count = 0
        self._total_tokens = 0
        self._total_cost = 0.0
    
    def record_request_start(
        self,
        task_type: AITaskType,
        model: AIModelName,
        prompt_key: str,
        user_id: Optional[str] = None,
    ) -> None:
        """Loggt Start eines AI-Requests."""
        logger.info(
            f"AI Request started: task={task_type.value}, model={model.value}, "
            f"prompt={prompt_key}, user={user_id}"
        )
    
    def record_request_success(
        self,
        task_type: AITaskType,
        model_used: AIModelName,
        prompt_key: str,
        prompt_version: str,
        prompt_variant: str,
        tokens_prompt: int,
        tokens_completion: int,
        cost_estimate: float,
        latency_ms: float,
        fallback_used: bool,
        user_id: Optional[str] = None,
    ) -> None:
        """Loggt erfolgreichen AI-Request."""
        self._request_count += 1
        self._total_tokens += tokens_prompt + tokens_completion
        self._total_cost += cost_estimate
        
        logger.info(
            f"AI Request succeeded: task={task_type.value}, model={model_used.value}, "
            f"tokens={tokens_prompt + tokens_completion}, cost=${cost_estimate:.4f}, "
            f"latency={latency_ms:.0f}ms, fallback={fallback_used}"
        )
        
        # TODO: Persistiere in Datenbank
        # await self._save_to_db(...)
    
    def record_request_failure(
        self,
        task_type: AITaskType,
        model: AIModelName,
        error_type: str,
        retry_count: int,
        user_id: Optional[str] = None,
    ) -> None:
        """Loggt fehlgeschlagenen AI-Request."""
        logger.error(
            f"AI Request failed: task={task_type.value}, model={model.value}, "
            f"error={error_type}, retries={retry_count}"
        )
    
    def record_tokens(
        self,
        model: AIModelName,
        tokens_prompt: int,
        tokens_completion: int,
    ) -> None:
        """Loggt Token-Usage."""
        self._total_tokens += tokens_prompt + tokens_completion
    
    def get_stats(self) -> dict:
        """Gibt aktuelle Statistiken zurück."""
        return {
            "request_count": self._request_count,
            "total_tokens": self._total_tokens,
            "total_cost": self._total_cost,
        }


__all__ = ["AIMetrics"]
```

---

## 4. Monitoring Dashboard Spec

### 4.1 KPIs & Charts

#### Sektion 1: AI Usage & Cost

**Chart 1: Token Usage Over Time**
- X-Achse: Zeit (Tag/Woche/Monat)
- Y-Achse: Tokens (Mio.)
- Serien: GPT-4o, GPT-4o-mini, Claude 3.5 Sonnet, Claude 3.5 Haiku

**Chart 2: Cost Breakdown**
- Pie Chart: Kosten pro Modell (%)
- Bar Chart: Kosten pro Task-Typ (USD)

**Chart 3: Requests per Task Type**
- Bar Chart: Anzahl Requests pro Task-Typ
- Tooltip: Durchschnittliche Latenz, Cost per Request

#### Sektion 2: AI Performance

**Chart 4: Latency Distribution**
- Box Plot: p50, p95, p99 Latenz pro Modell
- Heatmap: Latenz pro Modell × Task-Typ

**Chart 5: Error Rate & Fallback Rate**
- Line Chart: Error-Rate über Zeit (%)
- Stacked Bar: Fallback-Rate pro Modell (Wie oft wurde Fallback verwendet?)

**Chart 6: Rate Limit Usage**
- Gauge: Aktuelle Rate-Limit-Auslastung (%)
- Timeline: Rate-Limit-Events (Wann wurden Limits erreicht?)

#### Sektion 3: AI Quality

**Chart 7: User Ratings**
- Bar Chart: Durchschnittliche Ratings pro Prompt-Version/Variante
- Trend: Rating-Entwicklung über Zeit

**Chart 8: A/B Test Performance**
- Comparison Table: Variante A vs. B
  - Metriken: Conversion-Rate, Avg. Rating, Cost per Request
  - Statistische Signifikanz (p-value)

**Chart 9: Conversion Rate**
- Funnel: Request → Response → User Rating → Conversion
- Conversion-Rate pro Task-Typ

### 4.2 Datenquellen & Events

#### Datenbank-Tabellen

```sql
-- AI Request Logs
CREATE TABLE ai_request_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id),
    task_type TEXT NOT NULL,
    model_used TEXT NOT NULL,
    prompt_key TEXT NOT NULL,
    prompt_version TEXT NOT NULL,
    prompt_variant TEXT NOT NULL,
    tokens_prompt INTEGER NOT NULL,
    tokens_completion INTEGER NOT NULL,
    cost_estimate FLOAT NOT NULL,
    latency_ms FLOAT NOT NULL,
    fallback_used BOOLEAN DEFAULT FALSE,
    retry_count INTEGER DEFAULT 0,
    error_type TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- AI Quality Metrics
CREATE TABLE ai_quality_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    request_log_id UUID REFERENCES ai_request_logs(id),
    user_rating INTEGER,  -- 1-5
    conversion BOOLEAN,
    rejection BOOLEAN,
    feedback_text TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Materialized Views für Dashboards
CREATE MATERIALIZED VIEW ai_usage_daily AS
SELECT
    DATE(created_at) AS date,
    model_used,
    task_type,
    COUNT(*) AS request_count,
    SUM(tokens_prompt + tokens_completion) AS total_tokens,
    SUM(cost_estimate) AS total_cost,
    AVG(latency_ms) AS avg_latency,
    PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY latency_ms) AS p95_latency
FROM ai_request_logs
GROUP BY DATE(created_at), model_used, task_type;

-- Refresh täglich
CREATE INDEX idx_ai_usage_daily_date ON ai_usage_daily(date);
```

#### Event-Streams

**Real-time Events (WebSocket/SSE):**
- `ai_request_started`: Live-Request-Counter
- `ai_request_completed`: Live-Latenz-Updates
- `rate_limit_warning`: Alert bei hoher Auslastung

---

## 5. Annahmen & Trade-offs

### 5.1 Annahmen

1. **API-Keys vorhanden:**
   - OpenAI API Key (für GPT-4o, GPT-4o-mini)
   - Anthropic API Key (für Claude 3.5) - Optional, aber empfohlen

2. **Token-Preise:**
   - Preise basieren auf Stand 2024
   - Müssen regelmäßig aktualisiert werden

3. **Supabase Integration:**
   - Metriken werden in Supabase gespeichert
   - Materialized Views für Performance

4. **Backward Compatibility:**
   - Bestehende Router können weiterhin `AIClient` direkt nutzen
   - Migration zu `AIRouter` ist optional, aber empfohlen

### 5.2 Trade-offs

| Entscheidung | Pro | Contra |
|--------------|-----|--------|
| **Zentrale Router-Komponente** | Einheitliche Logik, einfache Wartung | Zusätzliche Abstraktionsebene |
| **Automatischer Fallback** | Hohe Verfügbarkeit | Höhere Kosten (Fallback-Modelle) |
| **Prompt-Versionierung in DB** | Flexibel, A/B-Testing | Zusätzliche Komplexität |
| **Token-Tracking in DB** | Detaillierte Metriken | Performance-Overhead |

### 5.3 Erweiterungspunkte

1. **Caching:**
   - Cache für häufige Requests (z.B. gleiche Nachricht)
   - Redis-Integration

2. **Streaming:**
   - Support für Streaming-Responses (Token-by-Token)
   - Bessere UX bei langen Antworten

3. **Fine-Tuning:**
   - Integration von Fine-Tuned Modellen
   - Custom Model-Endpoints

4. **Multi-Language:**
   - Automatische Sprach-Erkennung
   - Sprach-spezifische Prompts

5. **Cost Budgets:**
   - Budget-Limits pro User/Workspace
   - Automatische Alerts bei Überschreitung

---

## 6. Migration Path

### Phase 1: Foundation (Woche 1)
- ✅ `ai_types.py` erstellen
- ✅ `ai_policies.py` erstellen
- ✅ `ai_metrics.py` erstellen
- ✅ `AIRouter` implementieren

### Phase 2: Clients (Woche 1-2)
- ✅ `OpenAIClient` erweitern (Token-Tracking)
- ✅ `AnthropicClient` implementieren
- ✅ Integration testen

### Phase 3: Prompt-Versionierung (Woche 2)
- ✅ `ai_prompts.py` erweitern
- ✅ Datenbank-Schema für Prompts
- ✅ Migration bestehender Prompts

### Phase 4: Router-Integration (Woche 2-3)
- ✅ Ein Router migrieren (z.B. `chat.py`)
- ✅ Testing & Monitoring
- ✅ Weitere Router migrieren

### Phase 5: Dashboard (Woche 3-4)
- ✅ Datenbank-Views erstellen
- ✅ Frontend-Dashboard implementieren
- ✅ Alerts & Budgets

---

**ENDE DES DOKUMENTS**

