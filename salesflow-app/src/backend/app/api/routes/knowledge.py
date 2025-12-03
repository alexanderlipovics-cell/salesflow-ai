# backend/app/api/routes/knowledge.py
"""
╔════════════════════════════════════════════════════════════════════════════╗
║  KNOWLEDGE API ROUTES                                                      ║
║  Evidence Hub & Company Knowledge Endpoints                                ║
╚════════════════════════════════════════════════════════════════════════════╝

Endpoints:
- POST   /knowledge/items           - Erstellt ein Knowledge Item
- GET    /knowledge/items/{id}      - Holt ein einzelnes Item
- PATCH  /knowledge/items/{id}      - Aktualisiert ein Item
- DELETE /knowledge/items/{id}      - Löscht ein Item (soft-delete)
- GET    /knowledge/items           - Listet Items mit Filtern
- POST   /knowledge/search          - Hybrid-Suche (Semantic + Keyword)
- GET    /knowledge/search          - Quick Search (GET)
- POST   /knowledge/bulk-import     - Bulk-Import
- GET    /knowledge/companies/{slug}/context - CHIEF Context
"""

from fastapi import APIRouter, Depends, HTTPException, Query, BackgroundTasks, UploadFile, File
from typing import List, Optional

from app.db.deps import get_db, get_current_user, CurrentUser
from app.api.schemas.knowledge import (
    KnowledgeItemCreate,
    KnowledgeItemUpdate,
    KnowledgeItemResponse,
    KnowledgeSearchQuery,
    KnowledgeSearchResponse,
    KnowledgeContextRequest,
    KnowledgeContextResponse,
    KnowledgeContextItem,
    BulkImportRequest,
    BulkImportResponse,
    KnowledgeDomain,
    KnowledgeType,
    CompanyResponse,
    KnowledgeHealthCheck,
)
from app.services.knowledge import KnowledgeService, EmbeddingService


router = APIRouter(prefix="/knowledge", tags=["knowledge"])


# ═══════════════════════════════════════════════════════════════════════════
# CRUD ENDPOINTS
# ═══════════════════════════════════════════════════════════════════════════

@router.post("/items", response_model=KnowledgeItemResponse)
async def create_knowledge_item(
    item: KnowledgeItemCreate,
    background_tasks: BackgroundTasks,
    db = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    """
    Erstellt ein neues Knowledge Item.
    
    Erfordert Admin-Rolle.
    """
    if current_user.role not in ["admin", "super_admin"]:
        raise HTTPException(403, "Admin privileges required")
    
    service = KnowledgeService(db)
    result = service.create_item(item)
    
    if not result:
        raise HTTPException(500, "Failed to create knowledge item")
    
    # Generate embedding in background
    embedding_service = EmbeddingService(db)
    background_tasks.add_task(
        embedding_service.generate_and_store,
        result.id,
        item.content,
    )
    
    return result


@router.get("/items/{item_id}", response_model=KnowledgeItemResponse)
async def get_knowledge_item(
    item_id: str,
    db = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    """Holt ein einzelnes Knowledge Item."""
    service = KnowledgeService(db)
    item = service.get_item(item_id)
    
    if not item:
        raise HTTPException(404, "Knowledge item not found")
    
    return item


@router.patch("/items/{item_id}", response_model=KnowledgeItemResponse)
async def update_knowledge_item(
    item_id: str,
    update: KnowledgeItemUpdate,
    db = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    """Aktualisiert ein Knowledge Item."""
    if current_user.role not in ["admin", "super_admin"]:
        raise HTTPException(403, "Admin privileges required")
    
    service = KnowledgeService(db)
    result = service.update_item(item_id, update)
    
    if not result:
        raise HTTPException(404, "Knowledge item not found or update failed")
    
    return result


@router.delete("/items/{item_id}")
async def delete_knowledge_item(
    item_id: str,
    db = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    """Soft-Delete eines Knowledge Items."""
    if current_user.role not in ["admin", "super_admin"]:
        raise HTTPException(403, "Admin privileges required")
    
    service = KnowledgeService(db)
    success = service.delete_item(item_id)
    
    if not success:
        raise HTTPException(404, "Knowledge item not found")
    
    return {"success": True, "message": "Item deleted"}


@router.get("/items", response_model=List[KnowledgeItemResponse])
async def list_knowledge_items(
    company_id: Optional[str] = None,
    domain: Optional[str] = None,
    type: Optional[str] = Query(None, alias="type"),
    topic: Optional[str] = None,
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    db = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    """Listet Knowledge Items mit Filtern."""
    service = KnowledgeService(db)
    return service.list_items(
        company_id=company_id,
        domain=domain,
        type_filter=type,
        topic=topic,
        limit=limit,
        offset=offset,
    )


# ═══════════════════════════════════════════════════════════════════════════
# SEARCH ENDPOINTS
# ═══════════════════════════════════════════════════════════════════════════

@router.post("/search", response_model=KnowledgeSearchResponse)
async def search_knowledge(
    query: KnowledgeSearchQuery,
    db = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    """
    Sucht in der Knowledge Base (Hybrid: Semantic + Keyword).
    
    Features:
    - Semantic Search via pgvector (wenn Embeddings vorhanden)
    - Keyword Search als Fallback
    - Company-aware Filtering mit Fallback zu generischem Wissen
    - Evidence-Level und Quality-Score Filtering
    """
    service = KnowledgeService(db)
    return service.search(query)


@router.get("/search", response_model=KnowledgeSearchResponse)
async def search_knowledge_get(
    q: str = Query(..., min_length=2, description="Suchbegriff"),
    company_slug: Optional[str] = Query(None, description="Company Slug"),
    vertical_id: Optional[str] = Query(None, description="Vertical ID"),
    domains: Optional[str] = Query(None, description="Domains (comma-separated)"),
    types: Optional[str] = Query(None, description="Types (comma-separated)"),
    limit: int = Query(10, ge=1, le=50),
    db = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    """
    Sucht in der Knowledge Base (GET für einfache Queries).
    
    Beispiel: /knowledge/search?q=omega3&company_slug=zinzino
    """
    domain_list = None
    if domains:
        domain_list = [KnowledgeDomain(d.strip()) for d in domains.split(",")]
    
    type_list = None
    if types:
        type_list = [KnowledgeType(t.strip()) for t in types.split(",")]
    
    query = KnowledgeSearchQuery(
        query=q,
        company_slug=company_slug,
        vertical_id=vertical_id,
        domains=domain_list,
        types=type_list,
        limit=limit,
    )
    
    service = KnowledgeService(db)
    return service.search(query)


# ═══════════════════════════════════════════════════════════════════════════
# CHIEF INTEGRATION
# ═══════════════════════════════════════════════════════════════════════════

@router.get("/companies/{company_slug}/context", response_model=KnowledgeContextResponse)
async def get_company_context(
    company_slug: str,
    query: str = Query(..., min_length=2, description="User-Frage"),
    max_items: int = Query(5, ge=1, le=10),
    max_tokens: int = Query(2000, ge=500, le=5000),
    db = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    """
    Holt Knowledge-Context für CHIEF (optimiert für LLM-Prompts).
    
    Returns:
        Knowledge Items mit Compliance-Informationen für den CHIEF-Prompt
    """
    service = KnowledgeService(db)
    
    items = service.get_context_for_chief(
        query=query,
        company_slug=company_slug,
        max_items=max_items,
        max_tokens=max_tokens,
    )
    
    # Calculate total tokens estimate
    total_tokens = sum(len(item.content) // 4 for item in items)
    
    # Gather compliance warnings
    compliance_warnings = []
    for item in items:
        if item.requires_disclaimer and item.disclaimer:
            compliance_warnings.append(item.disclaimer)
    
    return KnowledgeContextResponse(
        items=items,
        total_tokens_estimate=total_tokens,
        has_evidence=any(item.domain == "evidence" for item in items),
        has_company_knowledge=any(item.domain == "company" for item in items),
        compliance_warnings=list(set(compliance_warnings)),
    )


@router.post("/context", response_model=KnowledgeContextResponse)
async def get_context_for_chief(
    request: KnowledgeContextRequest,
    db = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    """
    Holt Knowledge-Context für CHIEF (POST-Version mit mehr Optionen).
    """
    service = KnowledgeService(db)
    
    items = service.get_context_for_chief(
        query=request.query,
        company_slug=request.company_slug,
        vertical_id=request.vertical_id,
        max_items=request.max_items,
        max_tokens=request.max_tokens,
    )
    
    total_tokens = sum(len(item.content) // 4 for item in items)
    
    compliance_warnings = []
    for item in items:
        if item.requires_disclaimer and item.disclaimer:
            compliance_warnings.append(item.disclaimer)
    
    return KnowledgeContextResponse(
        items=items,
        total_tokens_estimate=total_tokens,
        has_evidence=any(item.domain == "evidence" for item in items),
        has_company_knowledge=any(item.domain == "company" for item in items),
        compliance_warnings=list(set(compliance_warnings)),
    )


# ═══════════════════════════════════════════════════════════════════════════
# BULK OPERATIONS
# ═══════════════════════════════════════════════════════════════════════════

@router.post("/bulk-import", response_model=BulkImportResponse)
async def bulk_import_knowledge(
    request: BulkImportRequest,
    background_tasks: BackgroundTasks,
    db = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    """
    Bulk-Import von Knowledge Items (z.B. aus Gemini-Output).
    
    Features:
    - Automatische Duplikat-Erkennung
    - Automatische Embedding-Generierung (im Hintergrund)
    - Company-Zuordnung via Slug
    """
    if current_user.role not in ["admin", "super_admin"]:
        raise HTTPException(403, "Admin privileges required")
    
    service = KnowledgeService(db)
    result = await service.bulk_import(request, current_user.id)
    
    return result


# ═══════════════════════════════════════════════════════════════════════════
# ADMIN & HEALTH
# ═══════════════════════════════════════════════════════════════════════════

@router.get("/health", response_model=KnowledgeHealthCheck)
async def knowledge_health_check(
    db = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    """
    Health Check für das Knowledge System.
    
    Zeigt Statistiken über verfügbare Knowledge Items.
    """
    try:
        # Total items
        total_result = db.table("knowledge_items").select(
            "id", count="exact"
        ).eq("is_active", True).execute()
        total_items = total_result.count or 0
        
        # Items by domain
        domains_result = db.table("knowledge_items").select(
            "domain"
        ).eq("is_active", True).execute()
        
        items_by_domain = {}
        for row in (domains_result.data or []):
            domain = row.get("domain", "unknown")
            items_by_domain[domain] = items_by_domain.get(domain, 0) + 1
        
        # Items by type
        types_result = db.table("knowledge_items").select(
            "type"
        ).eq("is_active", True).execute()
        
        items_by_type = {}
        for row in (types_result.data or []):
            type_val = row.get("type", "unknown")
            items_by_type[type_val] = items_by_type.get(type_val, 0) + 1
        
        # Items with embeddings
        embeddings_result = db.table("knowledge_embeddings").select(
            "knowledge_item_id", count="exact"
        ).execute()
        items_with_embeddings = embeddings_result.count or 0
        
        # Verified items
        verified_result = db.table("knowledge_items").select(
            "id", count="exact"
        ).eq("is_active", True).eq("is_verified", True).execute()
        items_verified = verified_result.count or 0
        
        # Last import
        last_import_result = db.table("knowledge_items").select(
            "created_at"
        ).eq("is_active", True).order("created_at", desc=True).limit(1).execute()
        
        last_import_at = None
        if last_import_result.data:
            last_import_at = last_import_result.data[0].get("created_at")
        
        # Embedding coverage
        embedding_coverage = (items_with_embeddings / total_items * 100) if total_items > 0 else 0
        
        return KnowledgeHealthCheck(
            total_items=total_items,
            items_by_domain=items_by_domain,
            items_by_type=items_by_type,
            items_with_embeddings=items_with_embeddings,
            items_verified=items_verified,
            last_import_at=last_import_at,
            embedding_coverage=round(embedding_coverage, 1),
        )
        
    except Exception as e:
        raise HTTPException(500, f"Health check failed: {str(e)}")


@router.post("/embeddings/regenerate")
async def regenerate_embeddings(
    background_tasks: BackgroundTasks,
    company_slug: Optional[str] = None,
    force: bool = False,
    db = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    """
    Regeneriert Embeddings für alle Items (oder gefiltert nach Company).
    
    Args:
        company_slug: Optional, nur für diese Company
        force: Wenn True, überschreibt existierende Embeddings
    """
    if current_user.role not in ["admin", "super_admin"]:
        raise HTTPException(403, "Admin privileges required")
    
    # Start background task
    async def regenerate_task():
        service = KnowledgeService(db)
        embedding_service = EmbeddingService(db)
        
        # Get items
        query = db.table("knowledge_items").select("id, content").eq("is_active", True)
        
        if company_slug:
            company = service.get_company_by_slug(company_slug)
            if company:
                query = query.eq("company_id", company["id"])
        
        result = query.execute()
        
        for item in (result.data or []):
            if force or not embedding_service.has_embedding(item["id"]):
                await embedding_service.generate_and_store(item["id"], item["content"])
    
    background_tasks.add_task(regenerate_task)
    
    return {
        "success": True,
        "message": "Embedding regeneration started in background",
    }


# ═══════════════════════════════════════════════════════════════════════════
# IMPORT ENDPOINTS
# ═══════════════════════════════════════════════════════════════════════════

@router.post("/import/json")
async def import_knowledge_json(
    file: UploadFile = File(...),
    company_slug: Optional[str] = None,
    dry_run: bool = False,
    db = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    """
    Importiert Knowledge Items aus hochgeladener JSON-Datei.
    
    Nur für Admins.
    
    Args:
        file: Die JSON-Datei mit Knowledge Items
        company_slug: Optional - Company für Zuordnung
        dry_run: Nur validieren, nicht importieren
    """
    if current_user.role not in ["admin", "super_admin"]:
        raise HTTPException(403, "Admin privileges required")
    
    from app.services.knowledge.import_service import KnowledgeImportService
    
    try:
        content = await file.read()
        json_string = content.decode('utf-8')
    except Exception as e:
        raise HTTPException(400, f"Datei konnte nicht gelesen werden: {str(e)}")
    
    # Get company_id from slug
    company_id = None
    if company_slug:
        company_result = db.table("companies").select("id").eq(
            "slug", company_slug
        ).eq("is_active", True).single().execute()
        if company_result.data:
            company_id = company_result.data.get("id")
    
    service = KnowledgeImportService(db)
    result = service.import_from_json_string(json_string, company_id, dry_run)
    
    return result


@router.post("/import/evidence-hub")
async def import_evidence_hub(
    dry_run: bool = False,
    company_slug: Optional[str] = None,
    generate_embeddings: bool = False,
    background_tasks: BackgroundTasks = None,
    db = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    """
    Importiert den Standard Evidence Hub aus der internen data/EVIDENCE_HUB_COMPLETE.json.
    
    Nur für Admins.
    
    Args:
        dry_run: Nur validieren, nicht importieren
        company_slug: Optional - Company für Zuordnung
        generate_embeddings: Nach Import Embeddings generieren
    """
    if current_user.role not in ["admin", "super_admin"]:
        raise HTTPException(403, "Admin privileges required")
    
    from app.services.knowledge.import_service import KnowledgeImportService
    import os
    
    # Pfad zur Evidence Hub Datei
    base_path = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(__file__))))
    file_path = os.path.join(base_path, 'data', 'EVIDENCE_HUB_COMPLETE.json')
    
    if not os.path.exists(file_path):
        raise HTTPException(404, f"Evidence Hub Datei nicht gefunden: {file_path}")
    
    # Get company_id
    company_id = None
    if company_slug:
        company_result = db.table("companies").select("id").eq(
            "slug", company_slug
        ).eq("is_active", True).single().execute()
        if company_result.data:
            company_id = company_result.data.get("id")
    
    service = KnowledgeImportService(db)
    result = service.import_from_json_file(file_path, company_id, dry_run)
    
    # Generate embeddings in background if requested
    if generate_embeddings and not dry_run and result.get('imported_ids'):
        async def generate_embeddings_task():
            embedding_service = EmbeddingService(db)
            for item_id in result.get('imported_ids', []):
                item_result = db.table("knowledge_items").select("content").eq(
                    "id", item_id
                ).single().execute()
                if item_result.data:
                    await embedding_service.generate_and_store(
                        item_id,
                        item_result.data.get('content', ''),
                    )
        
        if background_tasks:
            background_tasks.add_task(generate_embeddings_task)
            result['embedding_status'] = 'generating'
    
    return result


@router.post("/import/marketing-intelligence")
async def import_marketing_intelligence(
    dry_run: bool = False,
    generate_embeddings: bool = False,
    background_tasks: BackgroundTasks = None,
    db = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    """
    Importiert die Marketing Intelligence aus data/MARKETING_INTELLIGENCE.json.
    
    Nur für Admins.
    """
    if current_user.role not in ["admin", "super_admin"]:
        raise HTTPException(403, "Admin privileges required")
    
    from app.services.knowledge.import_service import KnowledgeImportService
    import os
    
    base_path = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(__file__))))
    file_path = os.path.join(base_path, 'data', 'MARKETING_INTELLIGENCE.json')
    
    if not os.path.exists(file_path):
        raise HTTPException(404, f"Marketing Intelligence Datei nicht gefunden: {file_path}")
    
    service = KnowledgeImportService(db)
    result = service.import_from_json_file(file_path, None, dry_run)
    
    # Generate embeddings in background if requested
    if generate_embeddings and not dry_run and result.get('imported_ids'):
        async def generate_embeddings_task():
            embedding_service = EmbeddingService(db)
            for item_id in result.get('imported_ids', []):
                item_result = db.table("knowledge_items").select("content").eq(
                    "id", item_id
                ).single().execute()
                if item_result.data:
                    await embedding_service.generate_and_store(
                        item_id,
                        item_result.data.get('content', ''),
                    )
        
        if background_tasks:
            background_tasks.add_task(generate_embeddings_task)
            result['embedding_status'] = 'generating'
    
    return result


# ═══════════════════════════════════════════════════════════════════════════
# COMPANY ENDPOINTS
# ═══════════════════════════════════════════════════════════════════════════

@router.get("/companies", response_model=List[CompanyResponse])
async def list_companies(
    vertical_id: Optional[str] = None,
    db = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    """Listet alle aktiven Companies."""
    query = db.table("companies").select("*").eq("is_active", True)
    
    if vertical_id:
        query = query.eq("vertical_id", vertical_id)
    
    result = query.order("name").execute()
    
    return result.data or []


@router.get("/companies/{slug}", response_model=CompanyResponse)
async def get_company(
    slug: str,
    db = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    """Holt eine Company by Slug."""
    service = KnowledgeService(db)
    company = service.get_company_by_slug(slug)
    
    if not company:
        raise HTTPException(404, "Company not found")
    
    return company

