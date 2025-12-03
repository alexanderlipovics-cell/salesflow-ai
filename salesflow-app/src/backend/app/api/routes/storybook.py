"""
Storybook API Routes
Brand Storybook System - Import, Query, Compliance
"""

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, BackgroundTasks
from sqlalchemy.orm import Session
from sqlalchemy import text
from typing import List, Optional
from uuid import UUID
from pydantic import BaseModel

from app.db.deps import get_db
from app.services.storybook.service import StorybookService


router = APIRouter(prefix="/storybook", tags=["storybook"])


# =============================================================================
# SCHEMAS
# =============================================================================

class ComplianceCheckRequest(BaseModel):
    text: str
    company_id: Optional[UUID] = None
    vertical: Optional[str] = None


class ComplianceCheckResponse(BaseModel):
    compliant: bool
    violations: List[dict]
    violation_count: int
    has_blockers: bool


class StoryResponse(BaseModel):
    id: UUID
    title: str
    story_type: str
    audience: str
    content_30s: Optional[str] = None
    content_1min: Optional[str] = None
    content_2min: Optional[str] = None
    content_full: Optional[str] = None
    use_case: Optional[str] = None
    tags: Optional[List[str]] = None


class ProductResponse(BaseModel):
    id: UUID
    name: str
    slug: str
    category: Optional[str] = None
    tagline: Optional[str] = None
    description_short: Optional[str] = None
    description_full: Optional[str] = None
    key_benefits: Optional[List[str]] = None
    price_hint: Optional[str] = None


class ImportSeedRequest(BaseModel):
    seed_type: str  # 'zinzino', etc.


class ImportResult(BaseModel):
    success: bool
    imported: Optional[dict] = None
    error: Optional[str] = None


# =============================================================================
# IMPORT ENDPOINTS
# =============================================================================

@router.post("/import/{company_id}", response_model=ImportResult)
async def import_storybook(
    company_id: UUID,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
):
    """
    Importiert ein Brand-Storybook (PDF/DOCX)
    Extrahiert Stories, Produkte und Guardrails automatisch
    """
    
    # Read file content
    content = await file.read()
    
    # Extract text based on file type
    if file.filename and file.filename.endswith('.pdf'):
        from app.utils.pdf import extract_text_from_pdf
        text_content = extract_text_from_pdf(content)
    elif file.filename and file.filename.endswith('.docx'):
        from app.utils.docx import extract_text_from_docx
        text_content = extract_text_from_docx(content)
    else:
        raise HTTPException(400, "Unsupported file type. Use PDF or DOCX.")
    
    # Process
    service = StorybookService(db)
    result = service.process_storybook(
        company_id=company_id,
        content=text_content,
        file_name=file.filename or "unknown",
    )
    
    if result.get("success"):
        return ImportResult(
            success=True,
            imported={
                "stories": result.get("stories_extracted", 0),
                "products": result.get("products_extracted", 0),
                "guardrails": result.get("guardrails_extracted", 0),
            }
        )
    else:
        return ImportResult(success=False, error=result.get("error"))


@router.get("/seeds/available")
def get_available_seeds():
    """
    Gibt Liste verfügbarer Seed-Typen zurück
    """
    from app.seeds import get_available_seeds as get_seeds
    return {
        "seeds": get_seeds(),
        "description": {
            "zinzino": "Zinzino - Omega-3 & Tests (Skandinavien)",
            "herbalife": "Herbalife - Nutrition & Weight Management (USA)",
            "lr": "LR Health & Beauty - Aloe Vera & Kosmetik (Deutschland)",
            "pm_international": "PM-International / FitLine - Sports Nutrition (Deutschland)",
            "doterra": "doTERRA - Ätherische Öle (USA)",
        }
    }


@router.post("/import/{company_id}/seed", response_model=ImportResult)
def import_seed_data(
    company_id: UUID,
    request: ImportSeedRequest,
    db: Session = Depends(get_db),
):
    """
    Importiert vordefinierte Seed-Daten
    
    Verfügbare Seed-Typen:
    - zinzino
    - herbalife
    - lr
    - pm_international (alias: pm, fitline)
    - doterra
    """
    
    seed_type = request.seed_type
    
    try:
        from app.seeds import get_seed_data
        seed_data = get_seed_data(seed_type)
    except ValueError as e:
        raise HTTPException(400, str(e))
    
    try:
        # Save stories
        stories_saved = 0
        for story in seed_data["stories"]:
            result = db.execute(
                text("""
                    INSERT INTO company_stories (
                        company_id, story_type, audience, title,
                        content_30s, content_1min, content_2min,
                        use_case, tags, source_document
                    ) VALUES (
                        :company_id, :story_type::story_type, :audience::story_audience, :title,
                        :c30, :c1min, :c2min, :use_case, :tags, :source
                    )
                    ON CONFLICT DO NOTHING
                    RETURNING id
                """),
                {
                    "company_id": str(company_id),
                    "story_type": story.get("story_type"),
                    "audience": story.get("audience", "consumer"),
                    "title": story.get("title"),
                    "c30": story.get("content_30s"),
                    "c1min": story.get("content_1min"),
                    "c2min": story.get("content_2min"),
                    "use_case": story.get("use_case"),
                    "tags": story.get("tags", []),
                    "source": story.get("source_document"),
                }
            )
            if result.fetchone():
                stories_saved += 1
        
        # Save products
        products_saved = 0
        for i, product in enumerate(seed_data["products"]):
            result = db.execute(
                text("""
                    INSERT INTO company_products (
                        company_id, name, slug, category,
                        tagline, description_short, description_full,
                        key_benefits, science_summary,
                        how_to_explain, common_objections, sort_order
                    ) VALUES (
                        :company_id, :name, :slug, :category,
                        :tagline, :desc_short, :desc_full,
                        :benefits, :science,
                        :how_to, :objections, :sort
                    )
                    ON CONFLICT (company_id, slug) DO UPDATE SET
                        description_full = EXCLUDED.description_full,
                        key_benefits = EXCLUDED.key_benefits
                    RETURNING id
                """),
                {
                    "company_id": str(company_id),
                    "name": product["name"],
                    "slug": product["slug"],
                    "category": product.get("category"),
                    "tagline": product.get("tagline"),
                    "desc_short": product.get("description_short"),
                    "desc_full": product.get("description_full"),
                    "benefits": product.get("key_benefits", []),
                    "science": product.get("science_summary"),
                    "how_to": product.get("how_to_explain"),
                    "objections": product.get("common_objections", []),
                    "sort": i,
                }
            )
            if result.fetchone():
                products_saved += 1
        
        # Save guardrails
        guardrails_saved = 0
        for guardrail in seed_data["guardrails"]:
            result = db.execute(
                text("""
                    INSERT INTO company_guardrails (
                        company_id, rule_name, rule_description, severity,
                        trigger_patterns, example_bad, example_good,
                        applies_to, legal_reference
                    ) VALUES (
                        :company_id, :name, :desc, :severity::guardrail_severity,
                        :patterns, :bad, :good, :applies, :legal
                    )
                    ON CONFLICT DO NOTHING
                    RETURNING id
                """),
                {
                    "company_id": str(company_id),
                    "name": guardrail["rule_name"],
                    "desc": guardrail["rule_description"],
                    "severity": guardrail["severity"],
                    "patterns": guardrail.get("trigger_patterns", []),
                    "bad": guardrail.get("example_bad"),
                    "good": guardrail.get("example_good"),
                    "applies": guardrail.get("applies_to", ["all"]),
                    "legal": guardrail.get("legal_reference"),
                }
            )
            if result.fetchone():
                guardrails_saved += 1
        
        # Update company storybook status
        db.execute(
            text("""
                UPDATE companies SET 
                    storybook_imported = true,
                    storybook_imported_at = NOW()
                WHERE id = :company_id
            """),
            {"company_id": str(company_id)}
        )
        
        db.commit()
        
        return ImportResult(
            success=True,
            imported={
                "stories": stories_saved,
                "products": products_saved,
                "guardrails": guardrails_saved,
            }
        )
        
    except Exception as e:
        db.rollback()
        return ImportResult(success=False, error=str(e))


# =============================================================================
# QUERY ENDPOINTS
# =============================================================================

@router.get("/stories/{company_id}")
def get_stories(
    company_id: UUID,
    story_type: Optional[str] = None,
    audience: Optional[str] = None,
    db: Session = Depends(get_db),
):
    """Holt Stories für eine Company"""
    service = StorybookService(db)
    return service.get_stories(company_id, story_type, audience)


@router.get("/stories/{company_id}/for-context")
def get_story_for_context(
    company_id: UUID,
    context_type: str,  # 'intro', 'objection', 'why', 'product', etc.
    audience: Optional[str] = None,
    db: Session = Depends(get_db),
):
    """
    Findet die beste Story für einen bestimmten Kontext
    """
    service = StorybookService(db)
    story = service.get_story_for_context(company_id, context_type, audience)
    
    if not story:
        raise HTTPException(404, f"No story found for context: {context_type}")
    
    return story


@router.get("/products/{company_id}")
def get_products(
    company_id: UUID,
    category: Optional[str] = None,
    db: Session = Depends(get_db),
):
    """Holt Produkte für eine Company"""
    service = StorybookService(db)
    return service.get_products(company_id, category)


@router.get("/products/{company_id}/{product_slug}")
def get_product_by_slug(
    company_id: UUID,
    product_slug: str,
    db: Session = Depends(get_db),
):
    """Holt ein spezifisches Produkt"""
    service = StorybookService(db)
    product = service.get_product_info(company_id, product_slug=product_slug)
    
    if not product:
        raise HTTPException(404, f"Product not found: {product_slug}")
    
    return product


@router.get("/guardrails/{company_id}")
def get_guardrails(
    company_id: UUID,
    db: Session = Depends(get_db),
):
    """Holt Guardrails für eine Company"""
    service = StorybookService(db)
    return service.get_guardrails(company_id)


@router.get("/context/{company_id}")
def get_company_context(
    company_id: UUID,
    db: Session = Depends(get_db),
):
    """
    Holt kompletten Company-Kontext für CHIEF
    Inkl. Stories, Products, Guardrails
    """
    service = StorybookService(db)
    return service.get_company_context_for_chief(company_id)


# =============================================================================
# COMPLIANCE CHECK
# =============================================================================

@router.post("/compliance/check", response_model=ComplianceCheckResponse)
def check_compliance(
    request: ComplianceCheckRequest,
    db: Session = Depends(get_db),
):
    """
    Prüft Text auf Compliance-Verstöße
    Kann vor dem Senden einer Nachricht verwendet werden
    """
    service = StorybookService(db)
    violations = service.check_compliance(
        text_to_check=request.text,
        company_id=request.company_id,
        vertical=request.vertical,
    )
    
    return ComplianceCheckResponse(
        compliant=len(violations) == 0,
        violations=violations,
        violation_count=len(violations),
        has_blockers=any(v["severity"] == "block" for v in violations),
    )


@router.post("/compliance/suggest")
def suggest_compliant_version(
    request: ComplianceCheckRequest,
    db: Session = Depends(get_db),
):
    """
    Prüft Text und schlägt compliance-konforme Alternative vor
    """
    service = StorybookService(db)
    violations = service.check_compliance(
        text_to_check=request.text,
        company_id=request.company_id,
        vertical=request.vertical,
    )
    
    if not violations:
        return {
            "compliant": True,
            "original_text": request.text,
            "suggested_text": request.text,
            "changes": [],
        }
    
    # Collect suggestions
    suggestions = []
    for v in violations:
        if v.get("example_good"):
            suggestions.append({
                "rule": v["rule_name"],
                "severity": v["severity"],
                "suggestion": v["example_good"],
            })
    
    return {
        "compliant": False,
        "original_text": request.text,
        "violations": violations,
        "suggestions": suggestions,
        "message": "Bitte überarbeite den Text basierend auf den Vorschlägen.",
    }


# =============================================================================
# IMPORT STATUS
# =============================================================================

@router.get("/imports/{company_id}")
def get_import_history(
    company_id: UUID,
    db: Session = Depends(get_db),
):
    """
    Holt Import-Historie für eine Company
    """
    result = db.execute(
        text("""
            SELECT * FROM storybook_imports
            WHERE company_id = :company_id
            ORDER BY created_at DESC
            LIMIT 20
        """),
        {"company_id": str(company_id)}
    ).fetchall()
    
    return [dict(row._mapping) for row in result]


@router.get("/imports/{company_id}/status")
def get_import_status(
    company_id: UUID,
    db: Session = Depends(get_db),
):
    """
    Prüft ob Storybook importiert wurde
    """
    result = db.execute(
        text("""
            SELECT 
                storybook_imported,
                storybook_imported_at,
                (SELECT COUNT(*) FROM company_stories WHERE company_id = c.id) as story_count,
                (SELECT COUNT(*) FROM company_products WHERE company_id = c.id) as product_count,
                (SELECT COUNT(*) FROM company_guardrails WHERE company_id = c.id) as guardrail_count
            FROM companies c
            WHERE c.id = :company_id
        """),
        {"company_id": str(company_id)}
    ).fetchone()
    
    if not result:
        raise HTTPException(404, "Company not found")
    
    row = dict(result._mapping)
    
    return {
        "imported": row.get("storybook_imported", False),
        "imported_at": row.get("storybook_imported_at"),
        "counts": {
            "stories": row.get("story_count", 0),
            "products": row.get("product_count", 0),
            "guardrails": row.get("guardrail_count", 0),
        }
    }

