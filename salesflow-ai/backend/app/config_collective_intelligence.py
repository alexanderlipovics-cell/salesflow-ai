"""
╔════════════════════════════════════════════════════════════════════════════════╗
║  COLLECTIVE INTELLIGENCE - KONFIGURATION                                       ║
║  Environment Variables und Settings für das Non Plus Ultra System              ║
╚════════════════════════════════════════════════════════════════════════════════╝
"""

from typing import Optional
from pydantic import Field
from pydantic_settings import BaseSettings


class CollectiveIntelligenceSettings(BaseSettings):
    """
    Einstellungen für das Collective Intelligence System
    
    Alle Werte können über Environment Variables überschrieben werden.
    """
    
    # ═══════════════════════════════════════════════════════════════════════════
    # GROQ API (ULTRA-SCHNELL - EMPFOHLEN!)
    # ═══════════════════════════════════════════════════════════════════════════
    
    groq_api_key: Optional[str] = Field(
        default=None,
        description="Groq API Key - Hole dir einen kostenlosen auf https://console.groq.com"
    )
    groq_model: str = Field(
        default="llama-3.1-8b-instant",
        description="Groq Modell: llama-3.1-8b-instant (schnell), llama-3.1-70b-versatile (besser), mixtral-8x7b-32768"
    )
    
    # ═══════════════════════════════════════════════════════════════════════════
    # OLLAMA (LOKAL - FALLBACK)
    # ═══════════════════════════════════════════════════════════════════════════
    
    ollama_base_url: str = Field(
        default="http://localhost:11434",
        description="Base URL für Ollama API"
    )
    ollama_model: str = Field(
        default="llama3.1:8b",
        description="Ollama Modell Name (llama3.1:8b, llama3.1:70b, mistral:7b)"
    )
    ollama_embedding_model: str = Field(
        default="nomic-embed-text",
        description="Ollama Embedding Modell für RAG"
    )
    
    # vLLM Settings (High-Performance Production mit GPU)
    vllm_base_url: Optional[str] = Field(
        default=None,
        description="Base URL für vLLM API (wenn gesetzt, wird vLLM bevorzugt)"
    )
    vllm_model: str = Field(
        default="meta-llama/Llama-3.1-8B-Instruct",
        description="vLLM Modell (HuggingFace Model ID)"
    )
    
    # ═══════════════════════════════════════════════════════════════════════════
    # FALLBACK (EXTERNE API)
    # ═══════════════════════════════════════════════════════════════════════════
    
    fallback_to_openai: bool = Field(
        default=True,
        description="Fallback zu OpenAI wenn Self-Hosted nicht verfügbar"
    )
    openai_model_fallback: str = Field(
        default="gpt-4o-mini",
        description="OpenAI Modell für Fallback"
    )
    
    # ═══════════════════════════════════════════════════════════════════════════
    # RAG SETTINGS (EBENE 4)
    # ═══════════════════════════════════════════════════════════════════════════
    
    rag_enabled: bool = Field(
        default=True,
        description="RAG für Antwort-Generierung aktivieren"
    )
    rag_top_k: int = Field(
        default=5,
        description="Anzahl der Top-K Dokumente für RAG"
    )
    rag_min_similarity: float = Field(
        default=0.7,
        description="Minimale Similarity für RAG Results (0.0 - 1.0)"
    )
    
    # ═══════════════════════════════════════════════════════════════════════════
    # RLHF SETTINGS (EBENE 2)
    # ═══════════════════════════════════════════════════════════════════════════
    
    rlhf_enabled: bool = Field(
        default=True,
        description="RLHF Feedback Collection aktivieren"
    )
    rlhf_min_sample_size: int = Field(
        default=30,
        description="Minimale Sample-Größe für Training Data Aggregation"
    )
    
    # ═══════════════════════════════════════════════════════════════════════════
    # DIFFERENTIAL PRIVACY (EBENE 2)
    # ═══════════════════════════════════════════════════════════════════════════
    
    privacy_epsilon: float = Field(
        default=1.0,
        description="Privacy Budget (ε) für Differential Privacy. Niedrigere Werte = mehr Privatsphäre"
    )
    privacy_delta: float = Field(
        default=1e-5,
        description="Privacy Parameter (δ) für (ε,δ)-Differential Privacy"
    )
    
    # ═══════════════════════════════════════════════════════════════════════════
    # GENERATION SETTINGS
    # ═══════════════════════════════════════════════════════════════════════════
    
    default_temperature: float = Field(
        default=0.35,
        description="Default Temperature für LLM Generation"
    )
    default_max_tokens: int = Field(
        default=600,
        description="Default Max Tokens für LLM Generation"
    )
    generation_timeout_seconds: float = Field(
        default=60.0,
        description="Timeout für LLM Generation in Sekunden"
    )
    
    # ═══════════════════════════════════════════════════════════════════════════
    # GOVERNANCE
    # ═══════════════════════════════════════════════════════════════════════════
    
    audit_logging_enabled: bool = Field(
        default=True,
        description="Privacy Audit Logging aktivieren"
    )
    bias_detection_enabled: bool = Field(
        default=True,
        description="Bias Detection für generierte Antworten"
    )
    pii_detection_enabled: bool = Field(
        default=True,
        description="PII Detection in Trainings-Daten"
    )
    
    model_config = {
        "env_prefix": "CI_",  # Environment Variable Prefix: CI_OLLAMA_BASE_URL, etc.
        "env_file": ".env",
        "env_file_encoding": "utf-8",
        "extra": "ignore",
    }


# Singleton Instance
_ci_settings: Optional[CollectiveIntelligenceSettings] = None


def get_ci_settings() -> CollectiveIntelligenceSettings:
    """Liefert gecachte CollectiveIntelligenceSettings Instanz"""
    global _ci_settings
    if _ci_settings is None:
        _ci_settings = CollectiveIntelligenceSettings()
    return _ci_settings


def clear_ci_settings_cache() -> None:
    """Löscht Settings-Cache (für Tests)"""
    global _ci_settings
    _ci_settings = None


# ═══════════════════════════════════════════════════════════════════════════════
# BEISPIEL .env KONFIGURATION
# ═══════════════════════════════════════════════════════════════════════════════
"""
# ═══════════════════════════════════════════════════════════════════════════════
# COLLECTIVE INTELLIGENCE SETTINGS
# ═══════════════════════════════════════════════════════════════════════════════

# Self-Hosted LLM (Ollama)
CI_OLLAMA_BASE_URL=http://localhost:11434
CI_OLLAMA_MODEL=llama3.1:8b
CI_OLLAMA_EMBEDDING_MODEL=nomic-embed-text

# Alternative: vLLM (Production)
# CI_VLLM_BASE_URL=http://your-vllm-server:8000
# CI_VLLM_MODEL=meta-llama/Llama-3.1-70B-Instruct

# Fallback (wenn Self-Hosted nicht verfügbar)
CI_FALLBACK_TO_OPENAI=true
CI_OPENAI_MODEL_FALLBACK=gpt-4o-mini

# RAG Settings
CI_RAG_ENABLED=true
CI_RAG_TOP_K=5
CI_RAG_MIN_SIMILARITY=0.7

# RLHF Settings
CI_RLHF_ENABLED=true
CI_RLHF_MIN_SAMPLE_SIZE=30

# Differential Privacy
CI_PRIVACY_EPSILON=1.0
CI_PRIVACY_DELTA=0.00001

# Generation
CI_DEFAULT_TEMPERATURE=0.35
CI_DEFAULT_MAX_TOKENS=600
CI_GENERATION_TIMEOUT_SECONDS=60.0

# Governance
CI_AUDIT_LOGGING_ENABLED=true
CI_BIAS_DETECTION_ENABLED=true
CI_PII_DETECTION_ENABLED=true
"""


__all__ = [
    "CollectiveIntelligenceSettings",
    "get_ci_settings",
    "clear_ci_settings_cache",
]

