"""
Storybook API Schemas
Pydantic Models für Brand Storybook System
"""

from typing import List, Optional
from uuid import UUID
from datetime import datetime
from pydantic import BaseModel, Field


# =============================================================================
# STORY SCHEMAS
# =============================================================================

class StoryBase(BaseModel):
    """Base Schema für Stories"""
    title: str
    story_type: str = Field(..., description="elevator_pitch, short_story, founder_story, etc.")
    audience: str = Field(default="consumer", description="consumer, business_partner, health_professional, skeptic")
    content_30s: Optional[str] = None
    content_1min: Optional[str] = None
    content_2min: Optional[str] = None
    content_full: Optional[str] = None
    use_case: Optional[str] = None
    channel_hints: Optional[List[str]] = None
    tags: Optional[List[str]] = None


class StoryCreate(StoryBase):
    """Schema für Story-Erstellung"""
    company_id: UUID


class StoryResponse(StoryBase):
    """Schema für Story-Response"""
    id: UUID
    company_id: UUID
    times_used: int = 0
    effectiveness_score: Optional[float] = None
    source_document: Optional[str] = None
    source_page: Optional[str] = None
    is_active: bool = True
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class StoryListResponse(BaseModel):
    """Liste von Stories"""
    stories: List[StoryResponse]
    total: int


# =============================================================================
# PRODUCT SCHEMAS
# =============================================================================

class ProductBase(BaseModel):
    """Base Schema für Produkte"""
    name: str
    slug: str
    category: Optional[str] = None
    tagline: Optional[str] = None
    description_short: Optional[str] = None
    description_full: Optional[str] = None
    key_benefits: Optional[List[str]] = None
    science_summary: Optional[str] = None
    studies_referenced: Optional[List[str]] = None
    price_hint: Optional[str] = None
    subscription_available: bool = False
    how_to_explain: Optional[str] = None
    common_objections: Optional[List[str]] = None


class ProductCreate(ProductBase):
    """Schema für Produkt-Erstellung"""
    company_id: UUID


class ProductResponse(ProductBase):
    """Schema für Produkt-Response"""
    id: UUID
    company_id: UUID
    image_url: Optional[str] = None
    product_url: Optional[str] = None
    is_active: bool = True
    sort_order: int = 0
    created_at: datetime

    class Config:
        from_attributes = True


class ProductListResponse(BaseModel):
    """Liste von Produkten"""
    products: List[ProductResponse]
    total: int


# =============================================================================
# GUARDRAIL SCHEMAS
# =============================================================================

class GuardrailBase(BaseModel):
    """Base Schema für Guardrails"""
    rule_name: str
    rule_description: str
    severity: str = Field(default="warn", description="block, warn, suggest")
    trigger_patterns: Optional[List[str]] = None
    replacement_suggestion: Optional[str] = None
    example_bad: Optional[str] = None
    example_good: Optional[str] = None
    applies_to: Optional[List[str]] = None
    legal_reference: Optional[str] = None


class GuardrailCreate(GuardrailBase):
    """Schema für Guardrail-Erstellung"""
    company_id: Optional[UUID] = None
    vertical: Optional[str] = None


class GuardrailResponse(GuardrailBase):
    """Schema für Guardrail-Response"""
    id: UUID
    company_id: Optional[UUID] = None
    vertical: Optional[str] = None
    is_active: bool = True
    created_at: datetime

    class Config:
        from_attributes = True


class GuardrailListResponse(BaseModel):
    """Liste von Guardrails"""
    guardrails: List[GuardrailResponse]
    total: int


# =============================================================================
# COMPLIANCE SCHEMAS
# =============================================================================

class ComplianceCheckRequest(BaseModel):
    """Request für Compliance-Check"""
    text: str = Field(..., description="Text der geprüft werden soll")
    company_id: Optional[UUID] = None
    vertical: Optional[str] = None


class ComplianceViolation(BaseModel):
    """Einzelner Compliance-Verstoß"""
    rule_name: str
    severity: str
    description: str
    example_bad: Optional[str] = None
    example_good: Optional[str] = None
    matched_pattern: Optional[str] = None


class ComplianceCheckResponse(BaseModel):
    """Response für Compliance-Check"""
    compliant: bool
    violations: List[ComplianceViolation]
    violation_count: int
    has_blockers: bool
    can_send: bool = True


class ComplianceSuggestionResponse(BaseModel):
    """Response mit Verbesserungsvorschlägen"""
    compliant: bool
    original_text: str
    suggested_text: Optional[str] = None
    violations: Optional[List[ComplianceViolation]] = None
    suggestions: Optional[List[dict]] = None
    message: Optional[str] = None


# =============================================================================
# IMPORT SCHEMAS
# =============================================================================

class ImportSeedRequest(BaseModel):
    """Request für Seed-Import"""
    seed_type: str = Field(..., description="z.B. 'zinzino', 'herbalife'")


class ImportResult(BaseModel):
    """Ergebnis eines Imports"""
    success: bool
    import_id: Optional[str] = None
    imported: Optional[dict] = None
    error: Optional[str] = None


class ImportStatus(BaseModel):
    """Import-Status einer Company"""
    imported: bool
    imported_at: Optional[datetime] = None
    counts: dict


class ImportHistoryItem(BaseModel):
    """Einzelner Import-Eintrag"""
    id: UUID
    company_id: UUID
    file_name: str
    file_type: Optional[str] = None
    status: str
    extracted_stories: int = 0
    extracted_products: int = 0
    extracted_guardrails: int = 0
    error_message: Optional[str] = None
    created_at: datetime
    completed_at: Optional[datetime] = None


# =============================================================================
# COMPANY CONTEXT SCHEMAS
# =============================================================================

class CompanyBrandConfig(BaseModel):
    """Brand-Konfiguration einer Company"""
    primary_color: Optional[str] = None
    secondary_color: Optional[str] = None
    logo_url: Optional[str] = None
    country: Optional[str] = None
    founded_year: Optional[int] = None
    headquarters: Optional[str] = None
    business_model: Optional[str] = None
    product_focus: Optional[List[str]] = None
    key_differentiator: Optional[str] = None
    tagline: Optional[str] = None


class CompanyContextResponse(BaseModel):
    """Vollständiger Company-Kontext für CHIEF"""
    company: dict
    stories: List[dict]
    products: List[dict]
    guardrails: List[dict]


class StoryForContextRequest(BaseModel):
    """Request für kontextbasierte Story-Suche"""
    context_type: str = Field(..., description="intro, objection, why, product, founder, science, success")
    audience: Optional[str] = None

