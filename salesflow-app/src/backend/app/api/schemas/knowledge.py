# backend/app/api/schemas/knowledge.py
"""
╔════════════════════════════════════════════════════════════════════════════╗
║  KNOWLEDGE SCHEMAS                                                         ║
║  Evidence Hub & Company Knowledge                                          ║
╚════════════════════════════════════════════════════════════════════════════╝

Schemas für:
- Knowledge Items (Studien, Produkte, Compliance, etc.)
- Knowledge Search (Semantic + Keyword)
- Bulk Import
- CHIEF Integration
"""

from datetime import datetime, date
from enum import Enum
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field
from uuid import UUID


# ═══════════════════════════════════════════════════════════════════════════
# ENUMS
# ═══════════════════════════════════════════════════════════════════════════

class KnowledgeDomain(str, Enum):
    """Domain/Bereich des Wissens."""
    evidence = "evidence"      # Wissenschaftliche Studien, Health Claims
    company = "company"        # Firmen-spezifisch (Produkte, Compliance)
    vertical = "vertical"      # Branchen-spezifisch (MLM allgemein)
    generic = "generic"        # Allgemeines Sales-Wissen


class KnowledgeType(str, Enum):
    """Typ des Knowledge Items."""
    # Evidence
    study_summary = "study_summary"
    meta_analysis = "meta_analysis"
    health_claim = "health_claim"
    guideline = "guideline"
    
    # Company
    company_overview = "company_overview"
    product_line = "product_line"
    product_detail = "product_detail"
    compensation_plan = "compensation_plan"
    compliance_rule = "compliance_rule"
    faq = "faq"
    
    # Vertical
    objection_handler = "objection_handler"
    sales_script = "sales_script"
    best_practice = "best_practice"
    
    # Generic
    psychology = "psychology"
    communication = "communication"
    template_helper = "template_helper"


class EvidenceStrength(str, Enum):
    """Stärke der wissenschaftlichen Evidenz."""
    high = "high"              # RCT, große Meta-Analysen
    moderate = "moderate"      # Kohortenstudien, kleinere RCTs
    limited = "limited"        # Beobachtungsstudien, Fallberichte
    expert_opinion = "expert_opinion"  # Expertenmeinung, Leitlinien


class ComplianceLevel(str, Enum):
    """Compliance-Level für Content."""
    strict = "strict"          # Exakte Formulierungen erforderlich
    normal = "normal"          # Normale Vorsicht
    low = "low"                # Geringe Einschränkungen


# ═══════════════════════════════════════════════════════════════════════════
# COMPANY SCHEMAS
# ═══════════════════════════════════════════════════════════════════════════

class CompanyBase(BaseModel):
    """Basis-Schema für Company."""
    slug: str = Field(..., min_length=2, max_length=50)
    name: str = Field(..., min_length=1, max_length=200)
    vertical_id: str = Field(default="network_marketing")
    country_origin: Optional[str] = None
    website_url: Optional[str] = None
    logo_url: Optional[str] = None
    business_model: str = Field(default="mlm")
    comp_plan_type: Optional[str] = None
    has_evidence_hub: bool = False
    has_health_pro_module: bool = False


class CompanyCreate(CompanyBase):
    """Request zum Erstellen einer Company."""
    pass


class CompanyResponse(CompanyBase):
    """Response für eine Company."""
    id: str
    is_active: bool = True
    is_verified: bool = False
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# ═══════════════════════════════════════════════════════════════════════════
# KNOWLEDGE ITEM SCHEMAS
# ═══════════════════════════════════════════════════════════════════════════

class KnowledgeItemCreate(BaseModel):
    """Request zum Erstellen eines Knowledge Items."""
    # Zuordnung
    company_id: Optional[str] = None
    vertical_id: Optional[str] = None
    
    # Lokalisierung
    language: str = Field(default="de", max_length=10)
    region: Optional[str] = Field(None, max_length=20)  # 'DACH', 'EU', 'global'
    
    # Klassifikation
    domain: KnowledgeDomain
    type: KnowledgeType
    
    # Thema
    topic: str = Field(..., min_length=1, max_length=100)
    subtopic: Optional[str] = Field(None, max_length=100)
    
    # Inhalt
    title: str = Field(..., min_length=1, max_length=500)
    content: str = Field(..., min_length=1, max_length=50000)
    content_short: Optional[str] = Field(None, max_length=1000)
    
    # Study Fields
    study_year: Optional[int] = Field(None, ge=1900, le=2100)
    study_authors: Optional[List[str]] = None
    study_population: Optional[str] = None
    study_type: Optional[str] = None  # 'rct', 'cohort', 'meta_analysis'
    study_intervention: Optional[str] = None
    study_outcomes: Optional[str] = None
    nutrients_or_factors: Optional[List[str]] = None
    health_outcome_areas: Optional[List[str]] = None
    evidence_level: Optional[EvidenceStrength] = None
    
    # Quellen
    source_type: Optional[str] = None  # 'official_website', 'peer_reviewed', 'guideline'
    source_url: Optional[str] = None
    source_reference: Optional[str] = None  # DOI, PubMed ID
    
    # Qualität & Compliance
    quality_score: Optional[float] = Field(None, ge=0.0, le=1.0)
    compliance_level: ComplianceLevel = ComplianceLevel.normal
    requires_disclaimer: bool = False
    disclaimer_text: Optional[str] = None
    
    # AI Hints
    usage_notes_for_ai: Optional[str] = None
    keywords: Optional[List[str]] = None
    
    # Meta
    metadata: Optional[Dict[str, Any]] = None


class KnowledgeItemUpdate(BaseModel):
    """Request zum Updaten eines Knowledge Items."""
    title: Optional[str] = Field(None, min_length=1, max_length=500)
    content: Optional[str] = Field(None, min_length=1, max_length=50000)
    content_short: Optional[str] = Field(None, max_length=1000)
    
    quality_score: Optional[float] = Field(None, ge=0.0, le=1.0)
    compliance_level: Optional[ComplianceLevel] = None
    requires_disclaimer: Optional[bool] = None
    disclaimer_text: Optional[str] = None
    
    usage_notes_for_ai: Optional[str] = None
    keywords: Optional[List[str]] = None
    
    is_active: Optional[bool] = None
    is_verified: Optional[bool] = None
    
    metadata: Optional[Dict[str, Any]] = None


class KnowledgeItemResponse(BaseModel):
    """Response für ein Knowledge Item."""
    id: str
    company_id: Optional[str] = None
    vertical_id: Optional[str] = None
    
    language: str
    region: Optional[str] = None
    
    domain: str
    type: str
    
    topic: str
    subtopic: Optional[str] = None
    
    title: str
    content: str
    content_short: Optional[str] = None
    
    # Study fields (wenn relevant)
    study_year: Optional[int] = None
    study_authors: Optional[List[str]] = None
    study_type: Optional[str] = None
    study_outcomes: Optional[str] = None
    nutrients_or_factors: Optional[List[str]] = None
    health_outcome_areas: Optional[List[str]] = None
    evidence_level: Optional[str] = None
    
    # Source
    source_type: Optional[str] = None
    source_url: Optional[str] = None
    source_reference: Optional[str] = None
    
    # Compliance
    compliance_level: str
    requires_disclaimer: bool
    disclaimer_text: Optional[str] = None
    
    # Quality & Usage
    quality_score: Optional[float] = None
    usage_count: int = 0
    last_used_at: Optional[datetime] = None
    
    # Status
    is_verified: bool
    version: int
    is_active: bool = True
    
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# ═══════════════════════════════════════════════════════════════════════════
# SEARCH SCHEMAS
# ═══════════════════════════════════════════════════════════════════════════

class KnowledgeSearchQuery(BaseModel):
    """Query für Knowledge Search."""
    query: str = Field(..., min_length=2, max_length=500)
    
    # Filter
    company_id: Optional[str] = None
    company_slug: Optional[str] = None
    vertical_id: Optional[str] = None
    
    domains: Optional[List[KnowledgeDomain]] = None
    types: Optional[List[KnowledgeType]] = None
    topics: Optional[List[str]] = None
    
    # Quality Filter
    language: str = "de"
    min_quality_score: Optional[float] = Field(None, ge=0.0, le=1.0)
    evidence_levels: Optional[List[EvidenceStrength]] = None
    
    # Options
    limit: int = Field(default=10, ge=1, le=50)
    include_embeddings: bool = False
    use_semantic_search: bool = True
    use_keyword_search: bool = True


class KnowledgeSearchResult(BaseModel):
    """Ein einzelnes Suchergebnis."""
    item: KnowledgeItemResponse
    relevance_score: float = Field(ge=0.0, le=1.0)
    match_type: str  # 'semantic', 'keyword', 'hybrid'


class KnowledgeSearchResponse(BaseModel):
    """Response für Knowledge Search."""
    query: str
    results: List[KnowledgeSearchResult]
    total_found: int
    search_time_ms: int
    search_method: str = "hybrid"


# ═══════════════════════════════════════════════════════════════════════════
# BULK IMPORT SCHEMAS
# ═══════════════════════════════════════════════════════════════════════════

class BulkImportRequest(BaseModel):
    """Request für Bulk-Import von Knowledge Items."""
    company_slug: Optional[str] = None
    items: List[KnowledgeItemCreate]
    skip_duplicates: bool = True
    auto_generate_embeddings: bool = True


class BulkImportResponse(BaseModel):
    """Response für Bulk-Import."""
    success: bool
    imported_count: int
    skipped_count: int
    error_count: int
    errors: List[str] = Field(default_factory=list)
    embedding_status: str = "pending"  # 'pending', 'processing', 'completed'


# ═══════════════════════════════════════════════════════════════════════════
# CHIEF INTEGRATION SCHEMAS
# ═══════════════════════════════════════════════════════════════════════════

class KnowledgeContextItem(BaseModel):
    """Ein Knowledge Item formatiert für CHIEF Context."""
    id: str
    title: str
    content: str
    source: Optional[str] = None
    type: str
    domain: str
    compliance_level: str
    requires_disclaimer: bool
    disclaimer: Optional[str] = None
    evidence_level: Optional[str] = None
    relevance: float


class KnowledgeContextRequest(BaseModel):
    """Request für Knowledge Context (CHIEF)."""
    query: str = Field(..., min_length=2, max_length=500)
    company_slug: str
    vertical_id: str = "network_marketing"
    max_items: int = Field(default=5, ge=1, le=10)
    max_tokens: int = Field(default=2000, ge=500, le=5000)


class KnowledgeContextResponse(BaseModel):
    """Response für Knowledge Context (CHIEF)."""
    items: List[KnowledgeContextItem]
    total_tokens_estimate: int
    has_evidence: bool = False
    has_company_knowledge: bool = False
    compliance_warnings: List[str] = Field(default_factory=list)


# ═══════════════════════════════════════════════════════════════════════════
# HEALTH PRO SCHEMAS
# ═══════════════════════════════════════════════════════════════════════════

class HealthProProfileCreate(BaseModel):
    """Request zum Erstellen eines Health Pro Profiles."""
    profession: str = Field(..., min_length=1, max_length=100)
    specialization: Optional[str] = None
    license_number: Optional[str] = None
    company_id: Optional[str] = None


class HealthProProfileResponse(BaseModel):
    """Response für ein Health Pro Profile."""
    id: str
    user_id: str
    company_id: Optional[str] = None
    profession: str
    specialization: Optional[str] = None
    is_verified: bool = False
    verified_at: Optional[datetime] = None
    can_view_lab_results: bool = False
    can_interpret_results: bool = False
    created_at: datetime

    class Config:
        from_attributes = True


class LabResultCreate(BaseModel):
    """Request zum Erstellen eines Lab Results."""
    company_id: str
    lead_id: Optional[str] = None
    test_type: str
    test_date: Optional[date] = None
    lab_provider: Optional[str] = None
    results: Dict[str, Any]
    consent_given: bool = False


class LabResultResponse(BaseModel):
    """Response für ein Lab Result."""
    id: str
    company_id: str
    lead_id: Optional[str] = None
    health_pro_id: Optional[str] = None
    test_type: str
    test_date: Optional[date] = None
    results: Dict[str, Any]
    interpretation_summary: Optional[str] = None
    recommendations: Optional[List[str]] = None
    created_at: datetime

    class Config:
        from_attributes = True


# ═══════════════════════════════════════════════════════════════════════════
# ANALYTICS SCHEMAS
# ═══════════════════════════════════════════════════════════════════════════

class KnowledgeUsageStats(BaseModel):
    """Usage-Statistiken für Knowledge Items."""
    total_items: int
    total_searches: int
    avg_relevance_score: float
    top_topics: List[Dict[str, Any]]
    top_items: List[Dict[str, Any]]
    search_trends: List[Dict[str, Any]]


class KnowledgeHealthCheck(BaseModel):
    """Health Check für das Knowledge System."""
    total_items: int
    items_by_domain: Dict[str, int]
    items_by_type: Dict[str, int]
    items_with_embeddings: int
    items_verified: int
    last_import_at: Optional[datetime] = None
    embedding_coverage: float

