"""
Leads Router for SalesFlow AI.

HTTP layer - handles request/response, delegates to service layer.
"""
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status

from app.core.exceptions import (
    NotFoundError,
    PermissionError,
    ValidationError,
    InvalidStateError,
    ConflictError,
    SalesFlowException
)
from app.schemas import (
    LeadCreate,
    LeadUpdate,
    LeadResponse,
    LeadListResponse,
    LeadSearchParams,
    LeadStatus,
    LeadSource,
    LeadPriority,
    LeadStatusUpdate,
    LeadAssignment,
    LeadBulkAction,
    PaginationParams,
    SortOrder
)
from app.services import (
    get_lead_service,
    get_service_context,
    LeadService,
    ServiceContext
)

router = APIRouter(prefix="/leads", tags=["Leads"])


def handle_exception(e: Exception) -> None:
    """Convert service exceptions to HTTP exceptions."""
    if isinstance(e, SalesFlowException):
        raise HTTPException(
            status_code=e.get_status_code(),
            detail=e.to_dict()
        )
    raise HTTPException(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        detail={"error": "INTERNAL_ERROR", "message": str(e)}
    )


# ============= Read Endpoints =============

@router.get("", response_model=LeadListResponse)
async def list_leads(
    # Filters
    status: Optional[list[LeadStatus]] = Query(None),
    source: Optional[list[LeadSource]] = Query(None),
    priority: Optional[list[LeadPriority]] = Query(None),
    assigned_to: Optional[UUID] = None,
    unassigned_only: bool = False,
    min_score: Optional[int] = Query(None, ge=0, le=100),
    max_score: Optional[int] = Query(None, ge=0, le=100),
    tags: Optional[list[str]] = Query(None),
    search_query: Optional[str] = None,
    needs_follow_up: bool = False,
    # Sorting
    sort_by: str = "created_at",
    sort_order: SortOrder = SortOrder.DESC,
    # Pagination
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    # Dependencies
    service: LeadService = Depends(get_lead_service),
    ctx: ServiceContext = Depends(get_service_context)
):
    """
    List leads with filtering, sorting, and pagination.
    
    Non-admin users only see leads assigned to them.
    """
    try:
        search_params = LeadSearchParams(
            status=status,
            source=source,
            priority=priority,
            assigned_to=assigned_to,
            unassigned_only=unassigned_only,
            min_score=min_score,
            max_score=max_score,
            tags=tags,
            search_query=search_query,
            needs_follow_up=needs_follow_up,
            sort_by=sort_by,
            sort_order=sort_order
        )
        pagination = PaginationParams(page=page, page_size=page_size)
        
        return await service.list_leads(ctx, search_params, pagination)
    except Exception as e:
        handle_exception(e)


@router.get("/statistics")
async def get_statistics(
    service: LeadService = Depends(get_lead_service),
    ctx: ServiceContext = Depends(get_service_context)
):
    """Get lead statistics for dashboard."""
    try:
        return await service.get_lead_statistics(ctx)
    except Exception as e:
        handle_exception(e)


@router.get("/{lead_id}", response_model=LeadResponse)
async def get_lead(
    lead_id: UUID,
    service: LeadService = Depends(get_lead_service),
    ctx: ServiceContext = Depends(get_service_context)
):
    """Get lead by ID."""
    try:
        return await service.get_lead(ctx, lead_id)
    except Exception as e:
        handle_exception(e)


# ============= Create Endpoints =============

@router.post("", response_model=LeadResponse, status_code=status.HTTP_201_CREATED)
async def create_lead(
    data: LeadCreate,
    service: LeadService = Depends(get_lead_service),
    ctx: ServiceContext = Depends(get_service_context)
):
    """Create a new lead."""
    try:
        return await service.create_lead(ctx, data)
    except Exception as e:
        handle_exception(e)


@router.post("/bulk", status_code=status.HTTP_201_CREATED)
async def bulk_create_leads(
    leads: list[LeadCreate],
    service: LeadService = Depends(get_lead_service),
    ctx: ServiceContext = Depends(get_service_context)
):
    """Bulk create leads (import)."""
    try:
        result = await service.bulk_create_leads(ctx, leads)
        return result.model_dump()
    except Exception as e:
        handle_exception(e)


# ============= Update Endpoints =============

@router.patch("/{lead_id}", response_model=LeadResponse)
async def update_lead(
    lead_id: UUID,
    data: LeadUpdate,
    service: LeadService = Depends(get_lead_service),
    ctx: ServiceContext = Depends(get_service_context)
):
    """Update lead fields."""
    try:
        return await service.update_lead(ctx, lead_id, data)
    except Exception as e:
        handle_exception(e)


@router.put("/{lead_id}/status", response_model=LeadResponse)
async def change_status(
    lead_id: UUID,
    status_update: LeadStatusUpdate,
    service: LeadService = Depends(get_lead_service),
    ctx: ServiceContext = Depends(get_service_context)
):
    """Change lead status."""
    try:
        return await service.change_status(ctx, lead_id, status_update)
    except Exception as e:
        handle_exception(e)


@router.put("/{lead_id}/score", response_model=LeadResponse)
async def update_score(
    lead_id: UUID,
    score: int = Query(..., ge=0, le=100),
    reason: Optional[str] = None,
    service: LeadService = Depends(get_lead_service),
    ctx: ServiceContext = Depends(get_service_context)
):
    """Update lead score."""
    try:
        return await service.update_score(ctx, lead_id, score, reason)
    except Exception as e:
        handle_exception(e)


@router.put("/{lead_id}/assign", response_model=LeadResponse)
async def assign_lead(
    lead_id: UUID,
    assignment: LeadAssignment,
    service: LeadService = Depends(get_lead_service),
    ctx: ServiceContext = Depends(get_service_context)
):
    """Assign lead to a user."""
    try:
        return await service.assign_lead(ctx, lead_id, assignment)
    except Exception as e:
        handle_exception(e)


@router.delete("/{lead_id}/assign", response_model=LeadResponse)
async def unassign_lead(
    lead_id: UUID,
    service: LeadService = Depends(get_lead_service),
    ctx: ServiceContext = Depends(get_service_context)
):
    """Remove lead assignment."""
    try:
        return await service.unassign_lead(ctx, lead_id)
    except Exception as e:
        handle_exception(e)


# ============= Delete Endpoints =============

@router.delete("/{lead_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_lead(
    lead_id: UUID,
    hard_delete: bool = False,
    service: LeadService = Depends(get_lead_service),
    ctx: ServiceContext = Depends(get_service_context)
):
    """Delete lead (soft delete by default)."""
    try:
        await service.delete_lead(ctx, lead_id, hard_delete)
    except Exception as e:
        handle_exception(e)


@router.post("/{lead_id}/restore", response_model=LeadResponse)
async def restore_lead(
    lead_id: UUID,
    service: LeadService = Depends(get_lead_service),
    ctx: ServiceContext = Depends(get_service_context)
):
    """Restore a soft-deleted lead."""
    try:
        return await service.restore_lead(ctx, lead_id)
    except Exception as e:
        handle_exception(e)


# ============= Bulk Endpoints =============

@router.post("/bulk/action")
async def bulk_action(
    action: LeadBulkAction,
    service: LeadService = Depends(get_lead_service),
    ctx: ServiceContext = Depends(get_service_context)
):
    """Execute bulk action on multiple leads."""
    try:
        result = await service.bulk_action(ctx, action)
        return result.model_dump()
    except Exception as e:
        handle_exception(e)
