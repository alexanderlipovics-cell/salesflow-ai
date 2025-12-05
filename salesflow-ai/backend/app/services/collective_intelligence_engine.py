"""
╔════════════════════════════════════════════════════════════════════════════════╗
║  COLLECTIVE INTELLIGENCE ENGINE                                                ║
║  Non Plus Ultra: 4-Ebenen-Architektur für kollektives Lernen                  ║
╚════════════════════════════════════════════════════════════════════════════════╝

Architektur:
┌─────────────────────────────────────────────────────────────────────────────┐
│ Ebene 4: BEREITSTELLUNG (RAG + Inferenz + Styling mit D_User)              │
├─────────────────────────────────────────────────────────────────────────────┤
│ Ebene 3: GLOBALES MODELL (W_Global via Self-Hosted LLM)                    │
├─────────────────────────────────────────────────────────────────────────────┤
│ Ebene 2: GENERALISIERUNG (Differential Privacy, RLHF Feedback)             │
├─────────────────────────────────────────────────────────────────────────────┤
│ Ebene 1: LOKAL (D_User Profile, Session Cache)                             │
└─────────────────────────────────────────────────────────────────────────────┘

Formel für Antwort-Generierung:
Antwort = LLM(W_Global | Prompt + RAG_Context + D_User)
"""

from __future__ import annotations

import hashlib
import logging
import os
from dataclasses import dataclass, field
from enum import Enum
from typing import Any, Dict, List, Optional, Tuple

import httpx
from supabase import Client

logger = logging.getLogger(__name__)


# ═══════════════════════════════════════════════════════════════════════════════
# ENUMS & DATA CLASSES
# ═══════════════════════════════════════════════════════════════════════════════


class LLMProvider(Enum):
    """Unterstützte LLM-Provider"""
    OLLAMA = "ollama"           # Lokales Self-Hosted LLM
    VLLM = "vllm"               # High-Performance Inference Server
    GROQ = "groq"               # Ultra-Fast Cloud Inference (empfohlen!)
    OPENAI = "openai"           # Fallback (externe API)
    ANTHROPIC = "anthropic"     # Fallback (externe API)


class InputType(Enum):
    """Typen von KI-Anfragen für RLHF"""
    OBJECTION_RESPONSE = "objection_response"
    MESSAGE_GENERATION = "message_generation"
    FOLLOW_UP = "follow_up"
    CLOSING_SCRIPT = "closing_script"


class Outcome(Enum):
    """Mögliche Outcomes für RLHF Feedback"""
    CONVERTED = "converted"
    POSITIVE_REPLY = "positive_reply"
    NEGATIVE_REPLY = "negative_reply"
    NO_REPLY = "no_reply"
    UNKNOWN = "unknown"


@dataclass
class UserProfile:
    """Ebene 1: D_User - Lokale User-Daten"""
    user_id: str
    preferred_tone: str = "professional"
    avg_message_length: int = 150
    emoji_usage_level: int = 2
    formality_score: float = 0.5
    sales_style: str = "balanced"
    objection_handling_strength: float = 0.5
    closing_aggressiveness: float = 0.5
    top_script_ids: List[str] = field(default_factory=list)
    contribute_to_global_learning: bool = True
    excluded_contact_ids: List[str] = field(default_factory=list)


@dataclass
class RLHFContext:
    """Ebene 2: Kontext für RLHF Feedback Session"""
    input_type: InputType
    vertical: str = "network_marketing"
    channel: Optional[str] = None
    objection_category: Optional[str] = None
    lead_disg_type: Optional[str] = None
    conversation_turn: int = 1


@dataclass
class RAGResult:
    """Ebene 4: Ergebnis einer RAG-Retrieval-Anfrage"""
    node_ids: List[str]
    contents: List[str]
    similarities: List[float]
    metadata: List[Dict[str, Any]]


@dataclass
class GenerationResult:
    """Ebene 4: Ergebnis der Antwort-Generierung"""
    response: str
    model_used: str
    latency_ms: int
    rag_context_used: bool
    user_profile_applied: bool
    rlhf_session_id: Optional[str] = None


# ═══════════════════════════════════════════════════════════════════════════════
# EBENE 1: LOKALE USER-DATEN (D_User)
# ═══════════════════════════════════════════════════════════════════════════════


class UserProfileService:
    """Service für User-spezifische Lernprofile (Ebene 1)"""
    
    def __init__(self, db: Client):
        self.db = db
    
    async def get_user_profile(self, user_id: str) -> UserProfile:
        """Lädt oder erstellt User Learning Profile (graceful fallback)"""
        # Immer Default-Profil zurückgeben wenn DB nicht verfügbar
        # Das Non Plus Ultra System funktioniert auch ohne persistente Profile
        default_profile = UserProfile(user_id=user_id)
        
        try:
            # Versuche Profil aus DB zu laden
            result = self.db.table("user_learning_profile").select("*").eq("user_id", user_id).maybe_single().execute()
            
            if result.data:
                data = result.data
                return UserProfile(
                    user_id=user_id,
                    preferred_tone=data.get("preferred_tone", "professional"),
                    avg_message_length=data.get("avg_message_length", 150),
                    emoji_usage_level=data.get("emoji_usage_level", 2),
                    formality_score=data.get("formality_score", 0.5),
                    sales_style=data.get("sales_style", "balanced"),
                    objection_handling_strength=data.get("objection_handling_strength", 0.5),
                    closing_aggressiveness=data.get("closing_aggressiveness", 0.5),
                    top_script_ids=data.get("top_script_ids", []) or [],
                    contribute_to_global_learning=data.get("contribute_to_global_learning", True),
                    excluded_contact_ids=data.get("excluded_contact_ids", []) or [],
                )
            
            return default_profile
            
        except Exception as e:
            # Graceful fallback - System funktioniert auch ohne DB
            logger.info(f"Using default profile (DB not available): {type(e).__name__}")
            return default_profile
    
    async def update_user_profile(self, user_id: str, updates: Dict[str, Any]) -> None:
        """Aktualisiert User Learning Profile (graceful)"""
        try:
            self.db.table("user_learning_profile").update(updates).eq("user_id", user_id).execute()
        except Exception as e:
            logger.warning(f"Could not update user profile: {type(e).__name__}")
    
    async def set_opt_out(self, user_id: str, opt_out: bool, contact_ids: Optional[List[str]] = None) -> None:
        """Setzt Opt-Out für kollektives Lernen (Governance)"""
        updates = {"contribute_to_global_learning": not opt_out}
        if contact_ids:
            updates["excluded_contact_ids"] = contact_ids
        
        await self.update_user_profile(user_id, updates)
        
        # Audit Log (graceful)
        try:
            self.db.table("learning_opt_out_requests").insert({
                "user_id": user_id,
                "opt_out_type": "full" if opt_out else "contact_specific",
                "target_id": contact_ids[0] if contact_ids else None,
            }).execute()
        except Exception as e:
            logger.warning(f"Could not log opt-out request: {type(e).__name__}")


# ═══════════════════════════════════════════════════════════════════════════════
# EBENE 2: GENERALISIERUNG (RLHF + Differential Privacy)
# ═══════════════════════════════════════════════════════════════════════════════


class RLHFService:
    """Service für RLHF Feedback (Ebene 2)"""
    
    def __init__(self, db: Client):
        self.db = db
    
    def _create_context_hash(self, context: RLHFContext) -> str:
        """Erstellt anonymisierten Context-Hash für RLHF"""
        hash_input = f"{context.input_type.value}|{context.vertical}|{context.channel or ''}|{context.objection_category or ''}"
        return hashlib.sha256(hash_input.encode()).hexdigest()
    
    async def create_feedback_session(
        self,
        user_id: str,
        context: RLHFContext,
        generated_response: str,
        model_used: str,
    ) -> Optional[str]:
        """Erstellt neue RLHF Feedback Session"""
        try:
            context_hash = self._create_context_hash(context)
            
            # PII-Check (vereinfacht - in Production: NLP-basiert)
            contains_pii = self._detect_pii(generated_response)
            
            result = self.db.table("rlhf_feedback_sessions").insert({
                "user_id": user_id,
                "context_hash": context_hash,
                "input_type": context.input_type.value,
                "input_context": {
                    "vertical": context.vertical,
                    "channel": context.channel,
                    "objection_category": context.objection_category,
                    "lead_disg_type": context.lead_disg_type,
                    "conversation_turn": context.conversation_turn,
                },
                "generated_response": generated_response,
                "generation_model": model_used,
                "feedback_type": "implicit",
                "contains_pii": contains_pii,
                "eligible_for_training": not contains_pii,
            }).execute()
            
            return result.data[0]["id"] if result.data else None
        except Exception as e:
            logger.warning(f"Could not create RLHF session (table may not exist): {e}")
            return None
    
    def _detect_pii(self, text: str) -> bool:
        """Einfache PII-Erkennung (in Production: spaCy NER oder ähnlich)"""
        import re
        
        # E-Mail Pattern
        if re.search(r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b', text):
            return True
        
        # Telefonnummer Pattern (DE)
        if re.search(r'\b(\+49|0)\s?[\d\s]{8,15}\b', text):
            return True
        
        # IBAN Pattern
        if re.search(r'\b[A-Z]{2}\d{2}[A-Z0-9]{4,}\b', text):
            return True
        
        return False
    
    async def record_outcome(
        self,
        session_id: str,
        outcome: Outcome,
        user_rating: Optional[int] = None,
        response_used: bool = False,
        edited_response: Optional[str] = None,
    ) -> None:
        """Zeichnet Outcome für RLHF Session auf"""
        updates = {
            "outcome": outcome.value,
            "outcome_recorded_at": "now()",
            "response_used": response_used,
        }
        
        if user_rating is not None:
            updates["user_rating"] = user_rating
            updates["feedback_type"] = "explicit"
        
        if edited_response:
            updates["user_edited"] = True
            updates["edited_response"] = edited_response
        
        self.db.table("rlhf_feedback_sessions").update(updates).eq("id", session_id).execute()
    
    async def aggregate_training_data(
        self,
        training_category: str,
        vertical: str = "general",
        min_sample_size: int = 30,
        privacy_epsilon: float = 1.0,
    ) -> int:
        """Aggregiert RLHF Feedback zu Training Data mit Differential Privacy"""
        result = self.db.rpc("aggregate_training_data", {
            "p_training_category": training_category,
            "p_vertical": vertical,
            "p_min_sample_size": min_sample_size,
            "p_privacy_epsilon": privacy_epsilon,
        }).execute()
        
        return result.data if result.data else 0


# ═══════════════════════════════════════════════════════════════════════════════
# EBENE 3: GLOBALES MODELL (Self-Hosted LLM)
# ═══════════════════════════════════════════════════════════════════════════════


class SelfHostedLLMClient:
    """
    Client für LLM Inference (Ollama/vLLM/Groq)
    
    Das ist das Herzstück von W_Global - das Modell das von allen lernt.
    
    Groq bietet ultra-schnelle Inference (~1-2 Sekunden) mit kostenloser Stufe.
    """
    
    def __init__(
        self,
        provider: LLMProvider = LLMProvider.GROQ,
        base_url: Optional[str] = None,
        model_name: str = "llama-3.1-8b-instant",
        timeout: float = 60.0,
        api_key: Optional[str] = None,
    ):
        self.provider = provider
        self.model_name = model_name
        self.timeout = timeout
        self.api_key = api_key or os.getenv("GROQ_API_KEY")
        
        # Default URLs und Modelle
        if provider == LLMProvider.GROQ:
            self.base_url = "https://api.groq.com/openai/v1"
            # Groq Modelle: llama-3.1-8b-instant, llama-3.1-70b-versatile, mixtral-8x7b-32768
            if model_name == "llama3.1:8b":
                self.model_name = "llama-3.1-8b-instant"
        elif base_url:
            self.base_url = base_url
        elif provider == LLMProvider.OLLAMA:
            self.base_url = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
        elif provider == LLMProvider.VLLM:
            self.base_url = os.getenv("VLLM_BASE_URL", "http://localhost:8000")
        else:
            self.base_url = None
        
        self._client = httpx.AsyncClient(timeout=timeout)
    
    async def generate(
        self,
        prompt: str,
        system_prompt: Optional[str] = None,
        temperature: float = 0.35,
        max_tokens: int = 600,
    ) -> Tuple[str, int]:
        """
        Generiert Antwort mit LLM (Groq/Ollama/vLLM)
        
        Returns:
            Tuple[str, int]: (response_text, latency_ms)
        """
        import time
        start_time = time.time()
        
        if self.provider == LLMProvider.GROQ:
            response = await self._generate_groq(prompt, system_prompt, temperature, max_tokens)
        elif self.provider == LLMProvider.OLLAMA:
            response = await self._generate_ollama(prompt, system_prompt, temperature, max_tokens)
        elif self.provider == LLMProvider.VLLM:
            response = await self._generate_vllm(prompt, system_prompt, temperature, max_tokens)
        else:
            raise ValueError(f"Unsupported provider: {self.provider}")
        
        latency_ms = int((time.time() - start_time) * 1000)
        return response, latency_ms
    
    async def _generate_groq(
        self,
        prompt: str,
        system_prompt: Optional[str],
        temperature: float,
        max_tokens: int,
    ) -> str:
        """Groq API Call - Ultra-schnelle Inference"""
        if not self.api_key:
            raise ValueError("GROQ_API_KEY nicht gesetzt. Hole dir einen kostenlosen Key auf https://console.groq.com")
        
        messages = []
        if system_prompt:
            messages.append({"role": "system", "content": system_prompt})
        messages.append({"role": "user", "content": prompt})
        
        payload = {
            "model": self.model_name,
            "messages": messages,
            "temperature": temperature,
            "max_tokens": max_tokens,
        }
        
        response = await self._client.post(
            f"{self.base_url}/chat/completions",
            json=payload,
            headers={
                "Authorization": f"Bearer {self.api_key}",
                "Content-Type": "application/json",
            }
        )
        response.raise_for_status()
        
        data = response.json()
        return data["choices"][0]["message"]["content"]
    
    async def _generate_ollama(
        self,
        prompt: str,
        system_prompt: Optional[str],
        temperature: float,
        max_tokens: int,
    ) -> str:
        """Ollama API Call"""
        messages = []
        if system_prompt:
            messages.append({"role": "system", "content": system_prompt})
        messages.append({"role": "user", "content": prompt})
        
        payload = {
            "model": self.model_name,
            "messages": messages,
            "stream": False,
            "options": {
                "temperature": temperature,
                "num_predict": max_tokens,
            }
        }
        
        response = await self._client.post(
            f"{self.base_url}/api/chat",
            json=payload,
        )
        response.raise_for_status()
        
        data = response.json()
        return data.get("message", {}).get("content", "")
    
    async def _generate_vllm(
        self,
        prompt: str,
        system_prompt: Optional[str],
        temperature: float,
        max_tokens: int,
    ) -> str:
        """vLLM OpenAI-compatible API Call"""
        messages = []
        if system_prompt:
            messages.append({"role": "system", "content": system_prompt})
        messages.append({"role": "user", "content": prompt})
        
        payload = {
            "model": self.model_name,
            "messages": messages,
            "temperature": temperature,
            "max_tokens": max_tokens,
        }
        
        response = await self._client.post(
            f"{self.base_url}/v1/chat/completions",
            json=payload,
        )
        response.raise_for_status()
        
        data = response.json()
        return data["choices"][0]["message"]["content"]
    
    async def create_embedding(self, text: str) -> List[float]:
        """Erstellt Embedding für RAG"""
        if self.provider == LLMProvider.OLLAMA:
            response = await self._client.post(
                f"{self.base_url}/api/embeddings",
                json={"model": "nomic-embed-text", "prompt": text}
            )
            response.raise_for_status()
            return response.json().get("embedding", [])
        else:
            raise NotImplementedError("Embedding only supported with Ollama currently")
    
    async def close(self):
        """Schließt HTTP Client"""
        await self._client.aclose()


# ═══════════════════════════════════════════════════════════════════════════════
# EBENE 3: KNOWLEDGE GRAPH & RAG
# ═══════════════════════════════════════════════════════════════════════════════


class KnowledgeGraphService:
    """Service für Knowledge Graph und RAG (Ebene 3)"""
    
    def __init__(self, db: Client, llm_client: SelfHostedLLMClient):
        self.db = db
        self.llm = llm_client
    
    async def add_node(
        self,
        node_type: str,
        node_key: str,
        label: str,
        properties: Dict[str, Any],
        description: Optional[str] = None,
        company_id: Optional[str] = None,
    ) -> str:
        """Fügt Node zum Knowledge Graph hinzu"""
        # Embedding erstellen
        embed_text = f"{label}. {description or ''}"
        embedding = await self.llm.create_embedding(embed_text)
        
        result = self.db.table("knowledge_graph_nodes").insert({
            "node_type": node_type,
            "node_key": node_key,
            "label": label,
            "description": description,
            "properties": properties,
            "embedding": embedding,
            "embedding_model": "nomic-embed-text",
            "embedding_updated_at": "now()",
            "company_id": company_id,
        }).execute()
        
        return result.data[0]["id"] if result.data else None
    
    async def add_edge(
        self,
        source_node_id: str,
        target_node_id: str,
        edge_type: str,
        weight: float = 1.0,
        properties: Optional[Dict[str, Any]] = None,
    ) -> str:
        """Fügt Edge zwischen Nodes hinzu"""
        result = self.db.table("knowledge_graph_edges").insert({
            "source_node_id": source_node_id,
            "target_node_id": target_node_id,
            "edge_type": edge_type,
            "weight": weight,
            "properties": properties or {},
        }).execute()
        
        return result.data[0]["id"] if result.data else None
    
    async def semantic_search(
        self,
        query: str,
        node_types: Optional[List[str]] = None,
        company_id: Optional[str] = None,
        limit: int = 10,
        min_similarity: float = 0.7,
    ) -> RAGResult:
        """Semantische Suche im Knowledge Graph"""
        # Query Embedding erstellen
        query_embedding = await self.llm.create_embedding(query)
        
        # RPC Call für Semantic Search
        result = self.db.rpc("search_knowledge_graph", {
            "p_query_embedding": query_embedding,
            "p_node_types": node_types,
            "p_company_id": company_id,
            "p_limit": limit,
            "p_min_similarity": min_similarity,
        }).execute()
        
        if not result.data:
            return RAGResult(node_ids=[], contents=[], similarities=[], metadata=[])
        
        return RAGResult(
            node_ids=[r["node_id"] for r in result.data],
            contents=[f"{r['label']}: {r.get('properties', {})}" for r in result.data],
            similarities=[r["similarity"] for r in result.data],
            metadata=[r["properties"] for r in result.data],
        )


# ═══════════════════════════════════════════════════════════════════════════════
# EBENE 4: BEREITSTELLUNG (RAG + Inferenz + Styling)
# ═══════════════════════════════════════════════════════════════════════════════


class CollectiveIntelligenceEngine:
    """
    Haupt-Engine für Collaborative Intelligence
    
    Implementiert die Formel:
    Antwort = LLM(W_Global | Prompt + RAG_Context + D_User)
    """
    
    def __init__(
        self,
        db: Client,
        llm_provider: LLMProvider = LLMProvider.OLLAMA,
        llm_model: str = "llama3.1:8b",
        fallback_to_openai: bool = True,
    ):
        self.db = db
        self.fallback_to_openai = fallback_to_openai
        
        # Services initialisieren
        self.user_profile_service = UserProfileService(db)
        self.rlhf_service = RLHFService(db)
        
        # Self-Hosted LLM
        try:
            self.llm = SelfHostedLLMClient(
                provider=llm_provider,
                model_name=llm_model,
            )
            self.llm_available = True
        except Exception as e:
            logger.warning(f"Self-hosted LLM nicht verfügbar: {e}")
            self.llm = None
            self.llm_available = False
        
        # Knowledge Graph
        if self.llm:
            self.knowledge_graph = KnowledgeGraphService(db, self.llm)
        else:
            self.knowledge_graph = None
    
    async def generate_response(
        self,
        user_id: str,
        prompt: str,
        input_type: InputType,
        context: Optional[Dict[str, Any]] = None,
        use_rag: bool = True,
        record_for_rlhf: bool = True,
    ) -> GenerationResult:
        """
        Generiert personalisierte Antwort mit kollektivem Wissen
        
        Implementiert: Antwort = LLM(W_Global | Prompt + RAG_Context + D_User)
        """
        context = context or {}
        
        # ═══════════════════════════════════════════════════════════════════
        # STEP 1: User Profile laden (D_User)
        # ═══════════════════════════════════════════════════════════════════
        user_profile = await self.user_profile_service.get_user_profile(user_id)
        
        # ═══════════════════════════════════════════════════════════════════
        # STEP 2: RAG Context abrufen (Knowledge Graph)
        # ═══════════════════════════════════════════════════════════════════
        rag_result = None
        rag_context_text = ""
        
        if use_rag and self.knowledge_graph:
            rag_result = await self.knowledge_graph.semantic_search(
                query=prompt,
                node_types=self._get_relevant_node_types(input_type),
                limit=5,
            )
            
            if rag_result.contents:
                rag_context_text = "\n".join([
                    f"[Relevanz {rag_result.similarities[i]:.2f}] {content}"
                    for i, content in enumerate(rag_result.contents)
                ])
        
        # ═══════════════════════════════════════════════════════════════════
        # STEP 3: System Prompt mit D_User Styling erstellen
        # ═══════════════════════════════════════════════════════════════════
        system_prompt = self._build_system_prompt(
            input_type=input_type,
            user_profile=user_profile,
            rag_context=rag_context_text,
            context=context,
        )
        
        # ═══════════════════════════════════════════════════════════════════
        # STEP 4: LLM Generation (W_Global)
        # ═══════════════════════════════════════════════════════════════════
        if self.llm_available and self.llm:
            try:
                response_text, latency_ms = await self.llm.generate(
                    prompt=prompt,
                    system_prompt=system_prompt,
                    temperature=0.35,
                )
                model_used = f"self-hosted:{self.llm.model_name}"
            except Exception as e:
                logger.error(f"Self-hosted LLM Fehler: {e}")
                if self.fallback_to_openai:
                    response_text, latency_ms, model_used = await self._fallback_openai(
                        prompt, system_prompt
                    )
                else:
                    raise
        else:
            # Fallback zu OpenAI
            response_text, latency_ms, model_used = await self._fallback_openai(
                prompt, system_prompt
            )
        
        # ═══════════════════════════════════════════════════════════════════
        # STEP 5: RLHF Session erstellen (Ebene 2)
        # ═══════════════════════════════════════════════════════════════════
        rlhf_session_id = None
        
        if record_for_rlhf and user_profile.contribute_to_global_learning:
            rlhf_context = RLHFContext(
                input_type=input_type,
                vertical=context.get("vertical", "network_marketing"),
                channel=context.get("channel"),
                objection_category=context.get("objection_category"),
                lead_disg_type=context.get("disg_type"),
            )
            
            rlhf_session_id = await self.rlhf_service.create_feedback_session(
                user_id=user_id,
                context=rlhf_context,
                generated_response=response_text,
                model_used=model_used,
            )
        
        # ═══════════════════════════════════════════════════════════════════
        # STEP 6: RAG Retrieval Log (Ebene 4)
        # ═══════════════════════════════════════════════════════════════════
        if rag_result and rag_result.node_ids:
            self.db.table("rag_retrieval_log").insert({
                "user_id": user_id,
                "query_text": prompt,
                "query_type": input_type.value.split("_")[0],
                "retrieved_node_ids": rag_result.node_ids,
                "retrieval_scores": rag_result.similarities,
                "retrieval_method": "semantic",
                "model_used": model_used,
                "generated_response": response_text,
                "generation_latency_ms": latency_ms,
            }).execute()
        
        return GenerationResult(
            response=response_text,
            model_used=model_used,
            latency_ms=latency_ms,
            rag_context_used=bool(rag_context_text),
            user_profile_applied=True,
            rlhf_session_id=rlhf_session_id,
        )
    
    def _get_relevant_node_types(self, input_type: InputType) -> List[str]:
        """Bestimmt relevante Node-Typen für RAG basierend auf Input-Typ"""
        mapping = {
            InputType.OBJECTION_RESPONSE: ["objection", "strategy", "script"],
            InputType.MESSAGE_GENERATION: ["script", "template", "persona"],
            InputType.FOLLOW_UP: ["script", "strategy", "concept"],
            InputType.CLOSING_SCRIPT: ["script", "strategy", "persona"],
        }
        return mapping.get(input_type, ["script", "strategy"])
    
    def _build_system_prompt(
        self,
        input_type: InputType,
        user_profile: UserProfile,
        rag_context: str,
        context: Dict[str, Any],
    ) -> str:
        """Baut System Prompt mit D_User Styling und RAG Context"""
        
        # Base Prompt nach Input-Typ
        base_prompts = {
            InputType.OBJECTION_RESPONSE: (
                "Du bist ein erfahrener Sales-Coach spezialisiert auf Einwandbehandlung im Network Marketing. "
                "Generiere eine überzeugende, authentische Antwort auf den Einwand."
            ),
            InputType.MESSAGE_GENERATION: (
                "Du bist ein Experte für Sales-Kommunikation im Network Marketing. "
                "Generiere eine personalisierte, ansprechende Nachricht."
            ),
            InputType.FOLLOW_UP: (
                "Du bist ein Follow-Up Spezialist im Network Marketing. "
                "Generiere eine natürliche Follow-Up Nachricht die das Gespräch weiterführt."
            ),
            InputType.CLOSING_SCRIPT: (
                "Du bist ein Closing-Experte im Network Marketing. "
                "Generiere einen überzeugenden Closing-Text der zum Abschluss führt."
            ),
        }
        
        base_prompt = base_prompts.get(input_type, base_prompts[InputType.MESSAGE_GENERATION])
        
        # ═══════════════════════════════════════════════════════════════════
        # D_User Styling hinzufügen
        # ═══════════════════════════════════════════════════════════════════
        tone_instructions = {
            "direct": "Antworte direkt und auf den Punkt. Keine Umschweife.",
            "soft": "Antworte sanft und einfühlsam. Zeige Verständnis.",
            "enthusiastic": "Antworte mit Begeisterung und positiver Energie!",
            "professional": "Antworte professionell und sachlich.",
            "casual": "Antworte locker und freundlich wie ein guter Bekannter.",
            "formal": "Antworte in formellem Geschäftsdeutsch.",
        }
        
        tone_instruction = tone_instructions.get(
            user_profile.preferred_tone,
            tone_instructions["professional"]
        )
        
        emoji_instruction = ""
        if user_profile.emoji_usage_level >= 3:
            emoji_instruction = "Nutze passende Emojis um die Nachricht aufzulockern. "
        elif user_profile.emoji_usage_level == 0:
            emoji_instruction = "Verwende KEINE Emojis. "
        
        length_instruction = f"Halte die Antwort bei ca. {user_profile.avg_message_length} Zeichen. "
        
        # ═══════════════════════════════════════════════════════════════════
        # RAG Context hinzufügen
        # ═══════════════════════════════════════════════════════════════════
        rag_section = ""
        if rag_context:
            rag_section = f"""

═══════════════════════════════════════════════════════════════
RELEVANTES WISSEN (nutze diese Informationen):
═══════════════════════════════════════════════════════════════
{rag_context}
═══════════════════════════════════════════════════════════════
"""
        
        # ═══════════════════════════════════════════════════════════════════
        # Lead-Kontext hinzufügen
        # ═══════════════════════════════════════════════════════════════════
        lead_context = ""
        if context.get("disg_type"):
            disg_instructions = {
                "D": "Der Lead ist ein DISG-Typ D (Dominant): Sei direkt, fokussiere auf Ergebnisse, keine Zeitverschwendung.",
                "I": "Der Lead ist ein DISG-Typ I (Initiativ): Sei begeisternd, nutze Geschichten, zeige Visionen.",
                "S": "Der Lead ist ein DISG-Typ S (Stetig): Sei geduldig, baue Vertrauen auf, keine Drängerei.",
                "G": "Der Lead ist ein DISG-Typ G (Gewissenhaft): Sei präzise, nutze Fakten und Daten, detailliert.",
            }
            lead_context = f"\n{disg_instructions.get(context['disg_type'], '')}"
        
        # ═══════════════════════════════════════════════════════════════════
        # Finaler Prompt zusammenbauen
        # ═══════════════════════════════════════════════════════════════════
        return f"""{base_prompt}

═══════════════════════════════════════════════════════════════
STIL-ANWEISUNGEN:
═══════════════════════════════════════════════════════════════
{tone_instruction}
{emoji_instruction}
{length_instruction}
{lead_context}
{rag_section}
═══════════════════════════════════════════════════════════════
WICHTIG:
- Die Antwort muss COPY-PASTE ready sein (keine Präfixe wie "Hier ist ein Script:")
- Keine erfundenen Zahlen, Preise oder Behauptungen
- Bleibe authentisch und glaubwürdig
═══════════════════════════════════════════════════════════════"""
    
    async def _fallback_openai(
        self,
        prompt: str,
        system_prompt: str,
    ) -> Tuple[str, int, str]:
        """Fallback zu OpenAI wenn Self-Hosted nicht verfügbar"""
        import time
        from ..ai_client import AIClient
        from ..config import get_settings
        from ..schemas import ChatMessage
        
        settings = get_settings()
        
        if not settings.openai_api_key:
            raise RuntimeError("Weder Self-Hosted LLM noch OpenAI API verfügbar")
        
        start_time = time.time()
        
        ai_client = AIClient(
            api_key=settings.openai_api_key,
            model=settings.openai_model,
        )
        
        messages = [ChatMessage(role="user", content=prompt)]
        response_text = ai_client.generate(system_prompt, messages)
        
        latency_ms = int((time.time() - start_time) * 1000)
        
        return response_text, latency_ms, f"openai:{settings.openai_model}"
    
    async def record_feedback(
        self,
        rlhf_session_id: str,
        outcome: Outcome,
        user_rating: Optional[int] = None,
        response_used: bool = False,
        edited_response: Optional[str] = None,
    ) -> None:
        """Zeichnet Feedback für RLHF auf"""
        await self.rlhf_service.record_outcome(
            session_id=rlhf_session_id,
            outcome=outcome,
            user_rating=user_rating,
            response_used=response_used,
            edited_response=edited_response,
        )
    
    async def close(self):
        """Cleanup"""
        if self.llm:
            await self.llm.close()


# ═══════════════════════════════════════════════════════════════════════════════
# FACTORY FUNCTION
# ═══════════════════════════════════════════════════════════════════════════════


def create_collective_intelligence_engine(
    db: Client,
    prefer_groq: bool = True,
) -> CollectiveIntelligenceEngine:
    """
    Factory für Collective Intelligence Engine
    
    Args:
        db: Supabase Client
        prefer_groq: Ob Groq (ultra-schnell) bevorzugt werden soll
    
    Returns:
        Konfigurierte CollectiveIntelligenceEngine
    """
    # Prüfen welcher Provider verfügbar ist
    groq_key = os.getenv("GROQ_API_KEY")
    ollama_url = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
    vllm_url = os.getenv("VLLM_BASE_URL")
    
    if prefer_groq and groq_key:
        # Groq ist am schnellsten (~1-2 Sekunden)
        provider = LLMProvider.GROQ
        model = os.getenv("GROQ_MODEL", "llama-3.1-8b-instant")
        logger.info("Using Groq API for ultra-fast inference")
    elif vllm_url:
        provider = LLMProvider.VLLM
        model = os.getenv("VLLM_MODEL", "meta-llama/Llama-3.1-8B-Instruct")
    else:
        # Fallback zu Ollama (lokal)
        provider = LLMProvider.OLLAMA
        model = os.getenv("OLLAMA_MODEL", "llama3.1:8b")
        logger.info("Using Ollama for local inference")
    
    return CollectiveIntelligenceEngine(
        db=db,
        llm_provider=provider,
        llm_model=model,
        fallback_to_openai=True,
    )


__all__ = [
    "CollectiveIntelligenceEngine",
    "create_collective_intelligence_engine",
    "UserProfileService",
    "RLHFService",
    "KnowledgeGraphService",
    "SelfHostedLLMClient",
    "LLMProvider",
    "InputType",
    "Outcome",
    "UserProfile",
    "RLHFContext",
    "RAGResult",
    "GenerationResult",
]

