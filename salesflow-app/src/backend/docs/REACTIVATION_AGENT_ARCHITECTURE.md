# 🔄 Reactivation Agent - Backend Architektur

## Übersicht

Der **Reactivation Agent** ist ein autonomer LangGraph-basierter Agent, der dormante Leads (>90 Tage ohne Kontakt) intelligent reaktiviert. Er kombiniert:

- **LangGraph State Machine** für Multi-Step-Reasoning
- **RAG (Retrieval Augmented Generation)** für kontextuelle Personalisierung  
- **Signal Detection** für trigger-basierte Reaktivierung
- **Human-in-the-Loop** für Qualitätskontrolle

---

## 🏗️ Architektur-Diagramm

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         REACTIVATION AGENT SYSTEM                           │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────┐    ┌──────────────────┐    ┌─────────────────────┐    │
│  │  SIGNAL SOURCES │    │   LANGGRAPH      │    │   HUMAN-IN-LOOP     │    │
│  │                 │───▶│   STATE MACHINE  │───▶│   REVIEW QUEUE      │    │
│  │  • Google News  │    │                  │    │                     │    │
│  │  • LinkedIn API │    │  ┌────────────┐  │    │  • Draft Messages   │    │
│  │  • Website Δ    │    │  │ PERCEPTION │  │    │  • Approval UI      │    │
│  │  • CRM Events   │    │  └─────┬──────┘  │    │  • Feedback Loop    │    │
│  │  • Intent Pixel │    │        ▼         │    │                     │    │
│  └─────────────────┘    │  ┌────────────┐  │    └─────────────────────┘    │
│                         │  │ REASONING  │  │              │                │
│  ┌─────────────────┐    │  └─────┬──────┘  │              ▼                │
│  │   MEMORY ENGINE │    │        ▼         │    ┌─────────────────────┐    │
│  │   (RAG/Vector)  │◀──▶│  ┌────────────┐  │    │   LEARNING ENGINE   │    │
│  │                 │    │  │   ACTION   │  │    │                     │    │
│  │  • Embeddings   │    │  └────────────┘  │    │  • Few-Shot Learning│    │
│  │  • pgvector     │    │                  │    │  • Pattern Detection│    │
│  │  • Interaction  │    └──────────────────┘    │  • Model Refinement │    │
│  │    History      │                            │                     │    │
│  └─────────────────┘                            └─────────────────────┘    │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 📁 Verzeichnisstruktur

```
src/backend/app/
├── agents/                              # 🤖 LangGraph Agent Definitionen
│   ├── __init__.py
│   ├── reactivation/                    # Reactivation Agent Modul
│   │   ├── __init__.py
│   │   ├── graph.py                     # LangGraph State Machine Definition
│   │   ├── nodes/                       # Graph Nodes (Schritte)
│   │   │   ├── __init__.py
│   │   │   ├── perception.py            # Signal-Wahrnehmung & Lead-Analyse
│   │   │   ├── memory_retrieval.py      # RAG: Kontext aus Vector DB holen
│   │   │   ├── signal_detection.py      # Externe Signal-Erkennung
│   │   │   ├── reasoning.py             # Entscheidungslogik
│   │   │   ├── message_generation.py    # Personalisierte Nachricht erstellen
│   │   │   ├── compliance_check.py      # DSGVO/Liability Check
│   │   │   └── human_handoff.py         # Human-in-the-Loop Übergabe
│   │   ├── state.py                     # TypedDict State Definition
│   │   ├── edges.py                     # Conditional Edge Logic
│   │   ├── prompts/                     # Agent-spezifische Prompts
│   │   │   ├── __init__.py
│   │   │   ├── signal_analysis.py       # Signal-Analyse Prompts
│   │   │   ├── message_templates.py     # Nachrichtenvorlagen (DE/CH/AT)
│   │   │   └── compliance_rules.py      # DSGVO Compliance Rules
│   │   └── tools/                       # LangGraph Tools
│   │       ├── __init__.py
│   │       ├── news_search.py           # Google News API Tool
│   │       ├── linkedin_lookup.py       # LinkedIn Profile Tool
│   │       ├── website_monitor.py       # Website Change Detection
│   │       └── crm_lookup.py            # CRM Data Tool
│   │
│   └── shared/                          # Geteilte Agent-Komponenten
│       ├── __init__.py
│       ├── base_graph.py                # Base Graph Klasse
│       ├── checkpointer.py              # State Persistence (PostgreSQL)
│       └── callbacks.py                 # Logging & Monitoring Callbacks
│
├── api/
│   ├── routes/
│   │   ├── reactivation.py              # REST API Endpoints
│   │   └── review_queue.py              # Human Review Queue API
│   │
│   └── schemas/
│       ├── reactivation.py              # Pydantic Request/Response Models
│       └── review_queue.py              # Review Queue Schemas
│
├── services/
│   ├── reactivation/                    # Business Logic Layer
│   │   ├── __init__.py
│   │   ├── orchestrator.py              # Hauptsteuerung: Wann wird Agent gestartet
│   │   ├── scheduler.py                 # Cron-basierte Dormant-Lead-Erkennung
│   │   ├── signal_service.py            # Signal Detection Service
│   │   ├── draft_service.py             # Draft Management
│   │   └── feedback_service.py          # User Feedback Processing
│   │
│   ├── memory/                          # RAG/Memory Engine
│   │   ├── __init__.py
│   │   ├── vector_store.py              # pgvector Wrapper
│   │   ├── embeddings.py                # OpenAI Embeddings Service
│   │   ├── retrieval.py                 # Semantic Search & Retrieval
│   │   ├── indexer.py                   # Interaction Indexing Pipeline
│   │   └── context_builder.py           # Kontext-Aggregation für LLM
│   │
│   └── signals/                         # Signal Detection Services
│       ├── __init__.py
│       ├── google_news.py               # Google News API Integration
│       ├── linkedin.py                  # LinkedIn Data API
│       ├── website_monitor.py           # Website Change Detection
│       ├── intent_tracker.py            # Pricing Page Visit Tracking
│       └── signal_aggregator.py         # Signal Kombination & Scoring
│
├── db/
│   ├── models/                          # SQLAlchemy Models (Optional)
│   │   ├── __init__.py
│   │   ├── reactivation_run.py          # Agent Run History
│   │   ├── draft_message.py             # Draft Messages for Review
│   │   ├── signal_event.py              # Detected Signals
│   │   └── feedback_event.py            # User Feedback
│   │
│   └── repositories/                    # Data Access Layer
│       ├── __init__.py
│       ├── lead_repository.py           # Lead Data Access
│       ├── interaction_repository.py    # Interaction History
│       ├── draft_repository.py          # Draft CRUD
│       └── signal_repository.py         # Signal Storage
│
├── jobs/                                # Background Jobs (Celery/APScheduler)
│   ├── __init__.py
│   ├── dormant_scan.py                  # Täglicher Scan nach dormanten Leads
│   ├── signal_collection.py             # Periodische Signal-Sammlung
│   └── draft_expiry.py                  # Alte Drafts bereinigen
│
└── migrations/
    ├── 20241203_reactivation_tables.sql       # Basis-Tabellen
    ├── 20241203_vector_interactions.sql       # pgvector für Interaktionen
    ├── 20241203_signal_events.sql             # Signal Event Storage
    └── 20241203_review_queue.sql              # Review Queue Tabellen
```

---

## 🔄 LangGraph State Machine

### State Definition (`agents/reactivation/state.py`)

```python
from typing import TypedDict, Literal, Optional, List
from datetime import datetime

class ReactivationSignal(TypedDict):
    """Ein erkanntes Reaktivierungssignal."""
    type: Literal["job_change", "funding", "news", "website_change", "intent"]
    source: str
    title: str
    summary: str
    url: Optional[str]
    relevance_score: float  # 0-1
    detected_at: datetime

class LeadContext(TypedDict):
    """Angereicherte Lead-Informationen aus RAG."""
    lead_id: str
    name: str
    company: str
    last_interaction_summary: str
    interaction_count: int
    days_dormant: int
    persona_type: Literal["corporate", "startup", "solopreneur"]
    preferred_formality: Literal["Sie", "Du"]
    top_pain_points: List[str]
    previous_objections: List[str]

class ReactivationState(TypedDict):
    """LangGraph State für Reactivation Agent."""
    # Input
    lead_id: str
    user_id: str
    
    # Perception Phase
    lead_context: Optional[LeadContext]
    retrieved_interactions: List[dict]
    
    # Signal Detection Phase
    signals: List[ReactivationSignal]
    primary_signal: Optional[ReactivationSignal]
    
    # Reasoning Phase
    should_reactivate: bool
    reactivation_strategy: Optional[str]
    confidence_score: float  # 0-1
    
    # Action Phase
    draft_message: Optional[str]
    suggested_channel: Literal["linkedin", "email"]
    
    # Compliance
    compliance_passed: bool
    compliance_issues: List[str]
    
    # Human-in-the-Loop
    requires_review: bool
    review_reason: Optional[str]
    
    # Metadata
    run_id: str
    started_at: datetime
    completed_at: Optional[datetime]
    error: Optional[str]
```

### Graph Definition (`agents/reactivation/graph.py`)

```python
from langgraph.graph import StateGraph, END
from langgraph.checkpoint.postgres import PostgresSaver

from .state import ReactivationState
from .nodes import (
    perception,
    memory_retrieval,
    signal_detection,
    reasoning,
    message_generation,
    compliance_check,
    human_handoff,
)
from .edges import (
    should_continue_after_signals,
    route_after_reasoning,
    route_after_compliance,
)

def create_reactivation_graph(db_connection_string: str) -> StateGraph:
    """
    Erstellt den LangGraph für den Reactivation Agent.
    
    Flow:
    1. perception → Lade Lead-Basisdaten
    2. memory_retrieval → RAG: Hole Interaktionshistorie
    3. signal_detection → Prüfe externe Signale
    4. reasoning → Entscheide ob Reaktivierung sinnvoll
    5. message_generation → Erstelle personalisierte Nachricht
    6. compliance_check → DSGVO/Liability Prüfung
    7. human_handoff → Übergabe an Review Queue
    """
    
    # Checkpointer für State Persistence
    checkpointer = PostgresSaver.from_conn_string(db_connection_string)
    
    # Graph erstellen
    workflow = StateGraph(ReactivationState)
    
    # ═══════════════════════════════════════════════════════════════
    # NODES
    # ═══════════════════════════════════════════════════════════════
    
    workflow.add_node("perception", perception.run)
    workflow.add_node("memory_retrieval", memory_retrieval.run)
    workflow.add_node("signal_detection", signal_detection.run)
    workflow.add_node("reasoning", reasoning.run)
    workflow.add_node("message_generation", message_generation.run)
    workflow.add_node("compliance_check", compliance_check.run)
    workflow.add_node("human_handoff", human_handoff.run)
    
    # ═══════════════════════════════════════════════════════════════
    # EDGES
    # ═══════════════════════════════════════════════════════════════
    
    # Entry Point
    workflow.set_entry_point("perception")
    
    # Linear Flow: perception → memory → signals
    workflow.add_edge("perception", "memory_retrieval")
    workflow.add_edge("memory_retrieval", "signal_detection")
    
    # Conditional: Nach Signal Detection
    workflow.add_conditional_edges(
        "signal_detection",
        should_continue_after_signals,
        {
            "continue": "reasoning",
            "skip": END,  # Keine Signale → Abbruch
        }
    )
    
    # Conditional: Nach Reasoning
    workflow.add_conditional_edges(
        "reasoning",
        route_after_reasoning,
        {
            "generate_message": "message_generation",
            "skip": END,  # Keine Reaktivierung empfohlen
        }
    )
    
    # Nach Message Generation → Compliance
    workflow.add_edge("message_generation", "compliance_check")
    
    # Conditional: Nach Compliance
    workflow.add_conditional_edges(
        "compliance_check",
        route_after_compliance,
        {
            "human_review": "human_handoff",
            "auto_send": END,  # Hohe Confidence → Direkt senden
            "reject": END,  # Compliance Verstoß
        }
    )
    
    # Human Handoff → Ende
    workflow.add_edge("human_handoff", END)
    
    # Kompilieren mit Checkpointer
    return workflow.compile(checkpointer=checkpointer)
```

---

## 🧠 RAG Memory Engine

### Architektur

```
┌─────────────────────────────────────────────────────────────────┐
│                      MEMORY ENGINE (RAG)                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│   ┌─────────────┐    ┌─────────────────┐    ┌──────────────┐   │
│   │  INDEXER    │    │   VECTOR STORE   │    │  RETRIEVER   │   │
│   │             │    │   (pgvector)     │    │              │   │
│   │ • Emails    │───▶│                  │◀───│ • Semantic   │   │
│   │ • LinkedIn  │    │  ┌─────────────┐ │    │   Search     │   │
│   │ • Calls     │    │  │ Embeddings  │ │    │ • MMR        │   │
│   │ • Notes     │    │  │ (1536 dim)  │ │    │ • Hybrid     │   │
│   │ • WhatsApp  │    │  └─────────────┘ │    │              │   │
│   └─────────────┘    └─────────────────┘    └──────────────┘   │
│                                                                 │
│   ┌─────────────────────────────────────────────────────────┐   │
│   │                   CONTEXT BUILDER                        │   │
│   │                                                          │   │
│   │  Retrieved Chunks + Lead Profile + Signals → LLM Context │   │
│   │                                                          │   │
│   └─────────────────────────────────────────────────────────┘   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Vector Store Schema (PostgreSQL + pgvector)

```sql
-- Migration: 20241203_vector_interactions.sql

-- Extension aktivieren
CREATE EXTENSION IF NOT EXISTS vector;

-- Interaktions-Embeddings Tabelle
CREATE TABLE lead_interactions_embeddings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id),
    
    -- Original Content
    interaction_type VARCHAR(50) NOT NULL, -- email, linkedin, call, note, whatsapp
    content TEXT NOT NULL,
    summary TEXT, -- LLM-generierte Zusammenfassung
    
    -- Vector Embedding
    embedding vector(1536) NOT NULL, -- OpenAI ada-002
    
    -- Metadata für Filtering
    channel VARCHAR(50),
    sentiment VARCHAR(20), -- positive, neutral, negative
    topics TEXT[], -- Extrahierte Themen
    
    -- Timestamps
    interaction_date TIMESTAMPTZ NOT NULL,
    indexed_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- RLS
    CONSTRAINT fk_user FOREIGN KEY (user_id) REFERENCES auth.users(id)
);

-- Vector Index (IVFFlat für Performance)
CREATE INDEX idx_interactions_embedding 
ON lead_interactions_embeddings 
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);

-- Index für Lead-Filter
CREATE INDEX idx_interactions_lead ON lead_interactions_embeddings(lead_id);
CREATE INDEX idx_interactions_user ON lead_interactions_embeddings(user_id);

-- RLS Policy
ALTER TABLE lead_interactions_embeddings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can only see their own interactions"
ON lead_interactions_embeddings FOR ALL
USING (auth.uid() = user_id);
```

### Retrieval Service (`services/memory/retrieval.py`)

```python
from typing import List, Optional
from dataclasses import dataclass
from datetime import datetime

from openai import AsyncOpenAI
from supabase import AsyncClient

@dataclass
class RetrievedInteraction:
    """Ein aus dem Vector Store abgerufenes Dokument."""
    id: str
    content: str
    summary: str
    interaction_type: str
    interaction_date: datetime
    similarity_score: float
    sentiment: Optional[str]
    topics: List[str]

class MemoryRetriever:
    """
    Semantic Retrieval für Lead-Interaktionen.
    
    Verwendet:
    - OpenAI Embeddings (text-embedding-ada-002)
    - pgvector für Similarity Search
    - MMR (Maximal Marginal Relevance) für Diversität
    """
    
    def __init__(
        self,
        supabase: AsyncClient,
        openai_client: AsyncOpenAI,
        embedding_model: str = "text-embedding-ada-002"
    ):
        self.supabase = supabase
        self.openai = openai_client
        self.embedding_model = embedding_model
    
    async def retrieve_context(
        self,
        lead_id: str,
        query: str,
        top_k: int = 5,
        min_similarity: float = 0.7,
        use_mmr: bool = True,
        mmr_lambda: float = 0.5
    ) -> List[RetrievedInteraction]:
        """
        Holt die relevantesten Interaktionen für einen Lead.
        
        Args:
            lead_id: Lead ID für Filterung
            query: Suchanfrage (wird embedded)
            top_k: Anzahl der Ergebnisse
            min_similarity: Minimum Cosine Similarity
            use_mmr: Maximal Marginal Relevance für Diversität
            mmr_lambda: Balance zwischen Relevanz und Diversität
        
        Returns:
            Liste der relevantesten Interaktionen
        """
        # 1. Query embedden
        query_embedding = await self._embed_text(query)
        
        # 2. Vector Search via pgvector
        if use_mmr:
            results = await self._mmr_search(
                lead_id=lead_id,
                query_embedding=query_embedding,
                top_k=top_k,
                min_similarity=min_similarity,
                lambda_param=mmr_lambda
            )
        else:
            results = await self._similarity_search(
                lead_id=lead_id,
                query_embedding=query_embedding,
                top_k=top_k,
                min_similarity=min_similarity
            )
        
        return results
    
    async def _embed_text(self, text: str) -> List[float]:
        """Erstellt Embedding für Text."""
        response = await self.openai.embeddings.create(
            model=self.embedding_model,
            input=text
        )
        return response.data[0].embedding
    
    async def _similarity_search(
        self,
        lead_id: str,
        query_embedding: List[float],
        top_k: int,
        min_similarity: float
    ) -> List[RetrievedInteraction]:
        """Standard Cosine Similarity Search."""
        
        # pgvector RPC Call
        response = await self.supabase.rpc(
            "match_lead_interactions",
            {
                "query_embedding": query_embedding,
                "match_lead_id": lead_id,
                "match_count": top_k,
                "match_threshold": min_similarity
            }
        ).execute()
        
        return [
            RetrievedInteraction(
                id=row["id"],
                content=row["content"],
                summary=row["summary"],
                interaction_type=row["interaction_type"],
                interaction_date=row["interaction_date"],
                similarity_score=row["similarity"],
                sentiment=row.get("sentiment"),
                topics=row.get("topics", [])
            )
            for row in response.data
        ]
    
    async def get_lead_summary(
        self,
        lead_id: str,
        include_last_n: int = 5
    ) -> str:
        """
        Generiert eine Zusammenfassung der letzten Interaktionen.
        
        Wird als Kontext für den Reactivation Agent verwendet.
        """
        # Hole die letzten N Interaktionen (chronologisch)
        response = await self.supabase.from_("lead_interactions_embeddings")\
            .select("summary, interaction_type, interaction_date")\
            .eq("lead_id", lead_id)\
            .order("interaction_date", desc=True)\
            .limit(include_last_n)\
            .execute()
        
        if not response.data:
            return "Keine vorherigen Interaktionen gefunden."
        
        # Formatieren für LLM
        summaries = []
        for row in reversed(response.data):  # Chronologisch
            date = row["interaction_date"][:10]
            summaries.append(
                f"[{date}] {row['interaction_type'].upper()}: {row['summary']}"
            )
        
        return "\n".join(summaries)
```

---

## 📡 Signal Detection

### Signal Types

| Signal | Quelle | Priorität | DSGVO Hinweis |
|--------|--------|-----------|---------------|
| **Job Change** | LinkedIn API | 🔴 Hoch | Öffentliche Daten |
| **Funding** | Google News, Crunchbase | 🔴 Hoch | Öffentliche Daten |
| **Company News** | Google News | 🟡 Mittel | Öffentliche Daten |
| **Website Δ** | Change Detection | 🟡 Mittel | Öffentliche Daten |
| **Intent** | Tracking Pixel | 🔴 Hoch | ⚠️ Consent erforderlich |

### Signal Aggregator (`services/signals/signal_aggregator.py`)

```python
from typing import List, Optional
from datetime import datetime, timedelta
from dataclasses import dataclass
import asyncio

from .google_news import GoogleNewsService
from .linkedin import LinkedInService
from .website_monitor import WebsiteMonitor
from .intent_tracker import IntentTracker

@dataclass
class AggregatedSignal:
    """Aggregiertes Signal mit Score."""
    type: str
    source: str
    title: str
    summary: str
    url: Optional[str]
    relevance_score: float
    detected_at: datetime
    raw_data: dict

class SignalAggregator:
    """
    Kombiniert Signale aus verschiedenen Quellen.
    
    Implementiert:
    - Parallele API-Calls
    - Relevanz-Scoring
    - Deduplizierung
    - Rate Limit Handling
    """
    
    def __init__(
        self,
        google_news: GoogleNewsService,
        linkedin: LinkedInService,
        website_monitor: WebsiteMonitor,
        intent_tracker: IntentTracker
    ):
        self.google_news = google_news
        self.linkedin = linkedin
        self.website_monitor = website_monitor
        self.intent_tracker = intent_tracker
    
    async def collect_signals(
        self,
        lead_id: str,
        company_name: str,
        person_name: str,
        company_domain: Optional[str] = None,
        linkedin_url: Optional[str] = None,
        lookback_days: int = 30
    ) -> List[AggregatedSignal]:
        """
        Sammelt Signale aus allen Quellen parallel.
        
        Returns:
            Liste von Signalen, sortiert nach Relevanz
        """
        since = datetime.utcnow() - timedelta(days=lookback_days)
        
        # Parallele API-Calls
        results = await asyncio.gather(
            self._collect_news_signals(company_name, since),
            self._collect_linkedin_signals(linkedin_url) if linkedin_url else [],
            self._collect_website_signals(company_domain) if company_domain else [],
            self._collect_intent_signals(lead_id, since),
            return_exceptions=True
        )
        
        # Fehler filtern und loggen
        signals = []
        for result in results:
            if isinstance(result, Exception):
                # Log aber nicht abbrechen
                continue
            signals.extend(result)
        
        # Score berechnen und sortieren
        scored_signals = self._score_signals(signals, company_name, person_name)
        
        # Deduplizieren
        unique_signals = self._deduplicate(scored_signals)
        
        # Nach Relevanz sortieren
        return sorted(unique_signals, key=lambda s: s.relevance_score, reverse=True)
    
    async def _collect_news_signals(
        self,
        company_name: str,
        since: datetime
    ) -> List[AggregatedSignal]:
        """Sammelt Signale aus Google News."""
        
        # Keywords für verschiedene Signal-Typen
        queries = [
            (f'"{company_name}" Finanzierung OR Funding OR Investment', "funding"),
            (f'"{company_name}" Expansion OR Wachstum OR Übernahme', "news"),
            (f'"{company_name}" neuer CEO OR Geschäftsführer', "job_change"),
        ]
        
        signals = []
        for query, signal_type in queries:
            try:
                articles = await self.google_news.search(
                    query=query,
                    since=since,
                    max_results=5
                )
                
                for article in articles:
                    signals.append(AggregatedSignal(
                        type=signal_type,
                        source="google_news",
                        title=article.title,
                        summary=article.snippet,
                        url=article.url,
                        relevance_score=0.0,  # Wird später berechnet
                        detected_at=article.published_at,
                        raw_data=article.to_dict()
                    ))
            except Exception:
                continue
        
        return signals
    
    def _score_signals(
        self,
        signals: List[AggregatedSignal],
        company_name: str,
        person_name: str
    ) -> List[AggregatedSignal]:
        """
        Berechnet Relevanz-Score für jedes Signal.
        
        Faktoren:
        - Typ (Intent > Funding > Job Change > News)
        - Aktualität (Decay über Zeit)
        - Keyword Match
        """
        type_weights = {
            "intent": 1.0,
            "funding": 0.9,
            "job_change": 0.85,
            "website_change": 0.7,
            "news": 0.6
        }
        
        for signal in signals:
            base_score = type_weights.get(signal.type, 0.5)
            
            # Aktualitäts-Decay (exp. Decay über 30 Tage)
            days_old = (datetime.utcnow() - signal.detected_at).days
            recency_factor = max(0.3, 1 - (days_old / 30))
            
            # Keyword Match Boost
            text = f"{signal.title} {signal.summary}".lower()
            keyword_boost = 0
            if company_name.lower() in text:
                keyword_boost += 0.1
            if person_name.lower() in text:
                keyword_boost += 0.15
            
            signal.relevance_score = min(1.0, base_score * recency_factor + keyword_boost)
        
        return signals
    
    def _deduplicate(
        self,
        signals: List[AggregatedSignal]
    ) -> List[AggregatedSignal]:
        """Entfernt doppelte Signale basierend auf URL/Titel."""
        seen = set()
        unique = []
        
        for signal in signals:
            key = signal.url or signal.title
            if key not in seen:
                seen.add(key)
                unique.append(signal)
        
        return unique
```

---

## 👤 Human-in-the-Loop

### Review Queue Schema

```sql
-- Migration: 20241203_review_queue.sql

CREATE TABLE reactivation_drafts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id),
    lead_id UUID NOT NULL REFERENCES leads(id),
    
    -- Agent Run Reference
    run_id UUID NOT NULL,
    
    -- Draft Content
    draft_message TEXT NOT NULL,
    suggested_channel VARCHAR(50) NOT NULL,
    
    -- Context for Reviewer
    signals JSONB NOT NULL DEFAULT '[]',
    lead_context JSONB NOT NULL,
    confidence_score DECIMAL(3,2) NOT NULL,
    
    -- Review Status
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    -- pending, approved, rejected, edited, expired
    
    -- Reviewer Actions
    reviewed_at TIMESTAMPTZ,
    reviewer_notes TEXT,
    edited_message TEXT, -- Falls bearbeitet
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL,
    
    -- RLS
    CONSTRAINT fk_user FOREIGN KEY (user_id) REFERENCES auth.users(id)
);

-- Indexes
CREATE INDEX idx_drafts_user_status ON reactivation_drafts(user_id, status);
CREATE INDEX idx_drafts_expires ON reactivation_drafts(expires_at) WHERE status = 'pending';

-- RLS
ALTER TABLE reactivation_drafts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can only see their own drafts"
ON reactivation_drafts FOR ALL
USING (auth.uid() = user_id);
```

### Feedback Learning (`services/reactivation/feedback_service.py`)

```python
from typing import Optional
from dataclasses import dataclass
from datetime import datetime

from supabase import AsyncClient

@dataclass
class FeedbackEvent:
    """User Feedback für Few-Shot Learning."""
    draft_id: str
    action: str  # approved, rejected, edited
    original_message: str
    edited_message: Optional[str]
    user_notes: Optional[str]
    lead_context: dict
    signals: list

class FeedbackService:
    """
    Verarbeitet User-Feedback für kontinuierliches Lernen.
    
    Feedback wird gespeichert für:
    - Few-Shot Learning bei Message Generation
    - Pattern Detection (was funktioniert?)
    - Model Fine-Tuning (später)
    """
    
    def __init__(self, supabase: AsyncClient):
        self.supabase = supabase
    
    async def process_feedback(
        self,
        draft_id: str,
        action: str,
        edited_message: Optional[str] = None,
        user_notes: Optional[str] = None
    ) -> None:
        """
        Verarbeitet Feedback und speichert für Learning.
        """
        # 1. Draft laden
        draft = await self._get_draft(draft_id)
        
        # 2. Learning Event erstellen
        learning_event = {
            "user_id": draft["user_id"],
            "event_type": "reactivation_feedback",
            "action": action,
            "original_message": draft["draft_message"],
            "edited_message": edited_message,
            "user_notes": user_notes,
            "lead_context": draft["lead_context"],
            "signals": draft["signals"],
            "confidence_score": draft["confidence_score"],
            "created_at": datetime.utcnow().isoformat()
        }
        
        # 3. In learning_events speichern
        await self.supabase.from_("learning_events").insert(learning_event).execute()
        
        # 4. Draft Status updaten
        await self.supabase.from_("reactivation_drafts").update({
            "status": action,
            "reviewed_at": datetime.utcnow().isoformat(),
            "reviewer_notes": user_notes,
            "edited_message": edited_message
        }).eq("id", draft_id).execute()
    
    async def get_few_shot_examples(
        self,
        user_id: str,
        signal_type: str,
        limit: int = 3
    ) -> list:
        """
        Holt erfolgreiche Beispiele für Few-Shot Learning.
        
        Fokus auf:
        - Approved oder edited (nicht rejected)
        - Gleiches Signal-Type
        - Höchste Confidence Scores
        """
        response = await self.supabase.from_("learning_events")\
            .select("original_message, edited_message, lead_context, signals")\
            .eq("user_id", user_id)\
            .eq("event_type", "reactivation_feedback")\
            .in_("action", ["approved", "edited"])\
            .order("created_at", desc=True)\
            .limit(limit * 2)\
            .execute()
        
        # Filter nach Signal-Type
        examples = []
        for event in response.data:
            if any(s.get("type") == signal_type for s in event.get("signals", [])):
                # Nutze editierte Nachricht wenn vorhanden
                message = event.get("edited_message") or event.get("original_message")
                examples.append({
                    "message": message,
                    "context": event.get("lead_context"),
                    "signals": event.get("signals")
                })
            
            if len(examples) >= limit:
                break
        
        return examples
```

---

## 📊 Datenbank Schema (Migrations)

### Basis-Tabellen (`20241203_reactivation_tables.sql`)

```sql
-- ═══════════════════════════════════════════════════════════════════════════
-- REACTIVATION AGENT - BASIS TABELLEN
-- ═══════════════════════════════════════════════════════════════════════════

-- Lead Status Enum
DO $$ BEGIN
    CREATE TYPE lead_status AS ENUM (
        'new', 'contacted', 'qualified', 'proposal', 
        'negotiation', 'won', 'lost', 'dormant'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Reactivation Run History
CREATE TABLE reactivation_runs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id),
    lead_id UUID NOT NULL REFERENCES leads(id),
    
    -- State Tracking
    status VARCHAR(20) NOT NULL DEFAULT 'started',
    -- started, completed, failed, skipped
    
    -- Ergebnisse
    signals_found INTEGER DEFAULT 0,
    primary_signal JSONB,
    confidence_score DECIMAL(3,2),
    action_taken VARCHAR(50),
    -- draft_created, auto_sent, skipped, failed
    
    -- Execution Details
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    error_message TEXT,
    execution_time_ms INTEGER,
    
    -- LangGraph State (für Debugging)
    final_state JSONB,
    
    -- RLS
    CONSTRAINT fk_user FOREIGN KEY (user_id) REFERENCES auth.users(id)
);

-- Indexes
CREATE INDEX idx_runs_user ON reactivation_runs(user_id);
CREATE INDEX idx_runs_lead ON reactivation_runs(lead_id);
CREATE INDEX idx_runs_status ON reactivation_runs(status);
CREATE INDEX idx_runs_started ON reactivation_runs(started_at);

-- RLS
ALTER TABLE reactivation_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can only see their own runs"
ON reactivation_runs FOR ALL
USING (auth.uid() = user_id);

-- ═══════════════════════════════════════════════════════════════════════════
-- DORMANT LEAD TRACKING
-- ═══════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE VIEW dormant_leads AS
SELECT 
    l.id,
    l.user_id,
    l.name,
    l.company,
    l.email,
    l.linkedin_url,
    l.status,
    l.last_contact_at,
    EXTRACT(DAY FROM (NOW() - l.last_contact_at)) AS days_dormant,
    (
        SELECT MAX(r.started_at) 
        FROM reactivation_runs r 
        WHERE r.lead_id = l.id
    ) AS last_reactivation_attempt
FROM leads l
WHERE 
    l.status = 'dormant'
    OR (
        l.last_contact_at < NOW() - INTERVAL '90 days'
        AND l.status NOT IN ('won', 'lost')
    );

-- ═══════════════════════════════════════════════════════════════════════════
-- SIGNAL EVENTS
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE signal_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lead_id UUID NOT NULL REFERENCES leads(id),
    user_id UUID NOT NULL REFERENCES auth.users(id),
    
    -- Signal Details
    signal_type VARCHAR(50) NOT NULL,
    -- job_change, funding, news, website_change, intent
    source VARCHAR(50) NOT NULL,
    title TEXT NOT NULL,
    summary TEXT,
    url TEXT,
    
    -- Scoring
    relevance_score DECIMAL(3,2) NOT NULL,
    
    -- Status
    processed BOOLEAN DEFAULT FALSE,
    processed_at TIMESTAMPTZ,
    run_id UUID REFERENCES reactivation_runs(id),
    
    -- Metadata
    raw_data JSONB,
    detected_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- RLS
    CONSTRAINT fk_user FOREIGN KEY (user_id) REFERENCES auth.users(id)
);

-- Indexes
CREATE INDEX idx_signals_lead ON signal_events(lead_id);
CREATE INDEX idx_signals_type ON signal_events(signal_type);
CREATE INDEX idx_signals_unprocessed ON signal_events(lead_id, processed) WHERE processed = FALSE;

-- RLS
ALTER TABLE signal_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can only see their own signals"
ON signal_events FOR ALL
USING (auth.uid() = user_id);
```

---

## 🔐 DSGVO Compliance

### Compliance Check Node (`agents/reactivation/nodes/compliance_check.py`)

```python
from typing import List
import re

from ..state import ReactivationState

# Verbotene Muster (DACH-spezifisch)
LIABILITY_PATTERNS = [
    (r"garantier(e|t|en)", "Garantie-Versprechen"),
    (r"100\s*%", "Absolute Zusicherung"),
    (r"(heilt?|heilung)", "Heilversprechen"),
    (r"(reich werden|schnell geld)", "Unrealistische Versprechen"),
    (r"(kündigen sie|wechseln sie sofort)", "Aggressive Aufforderung"),
]

# Formality Check (Sie vs Du)
INFORMAL_MARKERS = ["du ", " dir ", " dein", " dich "]
FORMAL_MARKERS = ["Sie ", " Ihnen ", " Ihr"]

class ComplianceChecker:
    """
    DSGVO und Liability Compliance Prüfung.
    
    Prüft:
    1. Keine verbotenen Aussagen (Garantien, Heilversprechen)
    2. Korrekte Anrede (Sie vs Du basierend auf Persona)
    3. Unsubscribe-Hinweis bei Email
    4. Keine sensiblen Daten exponiert
    """
    
    def check(self, state: ReactivationState) -> tuple[bool, List[str]]:
        """
        Führt alle Compliance-Checks durch.
        
        Returns:
            (passed: bool, issues: List[str])
        """
        issues = []
        message = state.get("draft_message", "")
        
        # 1. Liability Check
        issues.extend(self._check_liability(message))
        
        # 2. Formality Check
        formality_issue = self._check_formality(
            message=message,
            expected=state.get("lead_context", {}).get("preferred_formality", "Sie")
        )
        if formality_issue:
            issues.append(formality_issue)
        
        # 3. Unsubscribe Check (nur Email)
        if state.get("suggested_channel") == "email":
            if not self._has_unsubscribe(message):
                issues.append("Fehlender Abmelde-Hinweis für Email")
        
        # 4. Sensitive Data Check
        issues.extend(self._check_sensitive_data(message))
        
        passed = len(issues) == 0
        return passed, issues
    
    def _check_liability(self, message: str) -> List[str]:
        """Prüft auf verbotene Aussagen."""
        issues = []
        message_lower = message.lower()
        
        for pattern, description in LIABILITY_PATTERNS:
            if re.search(pattern, message_lower):
                issues.append(f"Liability Risk: {description}")
        
        return issues
    
    def _check_formality(self, message: str, expected: str) -> str | None:
        """Prüft korrekte Anrede."""
        message_lower = message.lower()
        
        has_informal = any(marker in message_lower for marker in INFORMAL_MARKERS)
        has_formal = any(marker in message_lower for marker in FORMAL_MARKERS)
        
        if expected == "Sie" and has_informal and not has_formal:
            return "Falsche Anrede: 'Du' statt 'Sie'"
        elif expected == "Du" and has_formal and not has_informal:
            return "Falsche Anrede: 'Sie' statt 'Du'"
        
        return None
    
    def _has_unsubscribe(self, message: str) -> bool:
        """Prüft auf Abmelde-Hinweis."""
        unsubscribe_patterns = [
            r"abmeld",
            r"abbestell",
            r"newsletter.*beenden",
            r"nicht mehr.*kontaktieren",
        ]
        
        message_lower = message.lower()
        return any(re.search(p, message_lower) for p in unsubscribe_patterns)
    
    def _check_sensitive_data(self, message: str) -> List[str]:
        """Prüft auf exponierte sensible Daten."""
        issues = []
        
        # Email in Klartext
        if re.search(r"api[-_]?key|password|token|secret", message.lower()):
            issues.append("Potenzielle Credential-Exposition")
        
        return issues

# Node für LangGraph
async def run(state: ReactivationState) -> dict:
    """Compliance Check Node."""
    checker = ComplianceChecker()
    passed, issues = checker.check(state)
    
    return {
        "compliance_passed": passed,
        "compliance_issues": issues,
        "requires_review": not passed or state.get("confidence_score", 0) < 0.9
    }
```

---

## 🚀 API Endpoints

### Reactivation Router (`api/routes/reactivation.py`)

```python
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from typing import List, Optional
from datetime import datetime

from ...core.security import get_current_user
from ...services.reactivation.orchestrator import ReactivationOrchestrator
from ...api.schemas.reactivation import (
    StartReactivationRequest,
    ReactivationRunResponse,
    DormantLeadResponse,
)

router = APIRouter(prefix="/reactivation", tags=["Reactivation Agent"])

@router.get("/dormant-leads", response_model=List[DormantLeadResponse])
async def get_dormant_leads(
    min_days: int = 90,
    limit: int = 50,
    current_user: dict = Depends(get_current_user)
):
    """
    Listet alle dormanten Leads für den aktuellen User.
    
    Dormant = Kein Kontakt seit X Tagen.
    """
    orchestrator = ReactivationOrchestrator()
    return await orchestrator.get_dormant_leads(
        user_id=current_user["id"],
        min_days=min_days,
        limit=limit
    )

@router.post("/start", response_model=ReactivationRunResponse)
async def start_reactivation(
    request: StartReactivationRequest,
    background_tasks: BackgroundTasks,
    current_user: dict = Depends(get_current_user)
):
    """
    Startet den Reactivation Agent für einen spezifischen Lead.
    
    Der Agent läuft asynchron im Hintergrund.
    """
    orchestrator = ReactivationOrchestrator()
    
    # Validierung
    lead = await orchestrator.validate_lead(
        lead_id=request.lead_id,
        user_id=current_user["id"]
    )
    
    if not lead:
        raise HTTPException(status_code=404, detail="Lead nicht gefunden")
    
    # Agent im Hintergrund starten
    run_id = await orchestrator.create_run(
        lead_id=request.lead_id,
        user_id=current_user["id"]
    )
    
    background_tasks.add_task(
        orchestrator.execute_agent,
        run_id=run_id,
        lead_id=request.lead_id,
        user_id=current_user["id"]
    )
    
    return ReactivationRunResponse(
        run_id=run_id,
        status="started",
        message="Reactivation Agent gestartet"
    )

@router.get("/runs", response_model=List[ReactivationRunResponse])
async def get_runs(
    lead_id: Optional[str] = None,
    status: Optional[str] = None,
    limit: int = 20,
    current_user: dict = Depends(get_current_user)
):
    """
    Listet Reactivation Runs für den aktuellen User.
    """
    orchestrator = ReactivationOrchestrator()
    return await orchestrator.get_runs(
        user_id=current_user["id"],
        lead_id=lead_id,
        status=status,
        limit=limit
    )

@router.post("/batch", response_model=dict)
async def start_batch_reactivation(
    background_tasks: BackgroundTasks,
    min_days: int = 90,
    max_leads: int = 10,
    current_user: dict = Depends(get_current_user)
):
    """
    Startet Batch-Reactivation für alle dormanten Leads.
    
    ⚠️ Rate-Limited: Max 10 Leads pro Batch.
    """
    orchestrator = ReactivationOrchestrator()
    
    # Dormante Leads holen
    leads = await orchestrator.get_dormant_leads(
        user_id=current_user["id"],
        min_days=min_days,
        limit=max_leads
    )
    
    if not leads:
        return {"message": "Keine dormanten Leads gefunden", "count": 0}
    
    # Batch starten
    batch_id = await orchestrator.start_batch(
        user_id=current_user["id"],
        lead_ids=[l["id"] for l in leads]
    )
    
    return {
        "batch_id": batch_id,
        "message": f"Batch-Reactivation für {len(leads)} Leads gestartet",
        "count": len(leads)
    }
```

---

## 📋 Zusammenfassung

### Kernkomponenten

| Komponente | Technologie | Zweck |
|------------|-------------|-------|
| **State Machine** | LangGraph | Multi-Step Reasoning |
| **Memory Engine** | pgvector + RAG | Kontextuelle Personalisierung |
| **Signal Detection** | APIs + Aggregation | Trigger-basierte Reaktivierung |
| **Compliance** | Rule Engine | DSGVO/Liability Schutz |
| **Human-in-the-Loop** | Review Queue | Qualitätskontrolle |
| **Learning** | Few-Shot | Kontinuierliche Verbesserung |

### Nächste Schritte

1. **Phase 1**: Basis-Setup (LangGraph Graph, pgvector Schema)
2. **Phase 2**: Memory Engine (Indexer, Retrieval)
3. **Phase 3**: Signal Detection (Google News, LinkedIn Integration)
4. **Phase 4**: Human-in-the-Loop (Review Queue UI)
5. **Phase 5**: Learning Loop (Feedback Processing)

---

*Erstellt für SALES FLOW AI - DACH Market Focus*

