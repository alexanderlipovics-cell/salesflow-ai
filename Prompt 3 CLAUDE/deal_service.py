"""
Deal Service for SalesFlow AI.

Handles deal/opportunity management including:
- Deal lifecycle management
- Stage transitions
- Pipeline calculations
- Win/loss tracking
"""
from datetime import datetime
from decimal import Decimal
from typing import Optional
from uuid import UUID
import logging

from app.core.exceptions import (
    NotFoundError,
    PermissionError,
    ValidationError,
    InvalidStateError,
    ConflictError,
    BusinessRuleViolation
)
from app.schemas import (
    DealCreate,
    DealUpdate,
    DealResponse,
    DealListResponse,
    DealStage,
    DealStageUpdate,
    DealClose,
    PaginationParams,
    DealAnalytics
)
from app.services.base import (
    BaseService,
    ServiceContext,
    ServiceResult,
    audit_log,
    require_permission,
    AuditAction
)

logger = logging.getLogger(__name__)


# Valid stage transitions
STAGE_TRANSITIONS = {
    DealStage.DISCOVERY: [DealStage.QUALIFICATION, DealStage.CLOSED_LOST],
    DealStage.QUALIFICATION: [DealStage.PROPOSAL, DealStage.CLOSED_LOST],
    DealStage.PROPOSAL: [DealStage.NEGOTIATION, DealStage.CLOSED_LOST],
    DealStage.NEGOTIATION: [DealStage.CLOSED_WON, DealStage.CLOSED_LOST],
    DealStage.CLOSED_WON: [],  # Terminal state
    DealStage.CLOSED_LOST: [DealStage.DISCOVERY]  # Can reopen
}

# Default probability by stage
STAGE_PROBABILITY = {
    DealStage.DISCOVERY: 10,
    DealStage.QUALIFICATION: 25,
    DealStage.PROPOSAL: 50,
    DealStage.NEGOTIATION: 75,
    DealStage.CLOSED_WON: 100,
    DealStage.CLOSED_LOST: 0
}


class DealService(BaseService):
    """Service for deal management business logic."""
    
    def __init__(self, deal_repo, lead_repo=None, event_publisher=None):
        super().__init__(deal_repo)
        self._lead_repo = lead_repo
        self._event_publisher = event_publisher
    
    # ============= Read Operations =============
    
    @audit_log(AuditAction.READ, "deals")
    @require_permission("deals", "read")
    async def get_deal(
        self,
        ctx: ServiceContext,
        deal_id: UUID
    ) -> DealResponse:
        """Get deal by ID."""
        deal = await self.repo.get_by_id(deal_id)
        if not deal:
            raise NotFoundError(
                message=f"Deal {deal_id} not found",
                resource_type="deal",
                resource_id=str(deal_id)
            )
        
        await self._ensure_resource_access(
            ctx, deal.get("assigned_to"), "deals", "read"
        )
        
        return DealResponse(**deal)
    
    @require_permission("deals", "read")
    async def list_deals(
        self,
        ctx: ServiceContext,
        lead_id: Optional[UUID] = None,
        stage: Optional[list[DealStage]] = None,
        min_value: Optional[Decimal] = None,
        max_value: Optional[Decimal] = None,
        pagination: PaginationParams = None
    ) -> DealListResponse:
        """List deals with filtering."""
        pagination = pagination or PaginationParams()
        
        # Build filters
        filters = {}
        if lead_id:
            filters["lead_id"] = str(lead_id)
        if stage:
            filters["stage"] = [s.value for s in stage]
        if min_value is not None:
            filters["min_value"] = float(min_value)
        if max_value is not None:
            filters["max_value"] = float(max_value)
        
        # Non-admins only see their deals
        if ctx.user_role not in ["admin", "manager"]:
            filters["assigned_to"] = str(ctx.user_id)
        
        result = await self.repo.search(
            filters=filters,
            page=pagination.page,
            page_size=pagination.page_size
        )
        
        return DealListResponse(
            items=[DealResponse(**d) for d in result["items"]],
            total=result["total"],
            page=result["page"],
            page_size=result["page_size"],
            total_pages=result["total_pages"],
            has_next=result["has_next"],
            has_previous=result["has_previous"]
        )
    
    @require_permission("deals", "read")
    async def get_deals_for_lead(
        self,
        ctx: ServiceContext,
        lead_id: UUID
    ) -> list[DealResponse]:
        """Get all deals for a lead."""
        await self._check_lead_access(ctx, lead_id, "read")
        
        deals = await self.repo.get_by_lead(lead_id)
        return [DealResponse(**d) for d in deals]
    
    @require_permission("deals", "read")
    async def get_pipeline(
        self,
        ctx: ServiceContext
    ) -> dict:
        """Get pipeline overview with deals by stage."""
        # Apply user filter for non-admins
        user_filter = None if ctx.user_role in ["admin", "manager"] else str(ctx.user_id)
        
        return await self.repo.get_pipeline_summary(assigned_to=user_filter)
    
    @require_permission("deals", "read")
    async def get_analytics(
        self,
        ctx: ServiceContext,
        start_date: datetime = None,
        end_date: datetime = None
    ) -> DealAnalytics:
        """Get deal analytics."""
        user_filter = None if ctx.user_role in ["admin", "manager"] else str(ctx.user_id)
        
        stats = await self.repo.get_statistics(
            assigned_to=user_filter,
            start_date=start_date,
            end_date=end_date
        )
        
        return DealAnalytics(**stats)
    
    # ============= Create Operations =============
    
    @audit_log(AuditAction.CREATE, "deals")
    @require_permission("deals", "create")
    async def create_deal(
        self,
        ctx: ServiceContext,
        data: DealCreate
    ) -> DealResponse:
        """Create a new deal."""
        # Verify lead exists and user has access
        await self._check_lead_access(ctx, data.lead_id, "update")
        
        # Prepare deal data
        deal_data = data.model_dump()
        deal_data["lead_id"] = str(data.lead_id)
        deal_data["value"] = float(data.value)
        deal_data["stage"] = data.stage.value
        deal_data["probability"] = data.probability or STAGE_PROBABILITY.get(data.stage, 0)
        deal_data["assigned_to"] = str(ctx.user_id)
        deal_data["created_by"] = str(ctx.user_id)
        
        # Create deal
        deal = await self.repo.create(deal_data)
        
        # Update lead if this is first deal
        if self._lead_repo:
            lead = await self._lead_repo.get_by_id(data.lead_id)
            if lead and not lead.get("estimated_value"):
                await self._lead_repo.update(data.lead_id, {
                    "estimated_value": float(data.value)
                })
        
        # Publish event
        await self._publish_event("deal.created", {
            "deal_id": deal["id"],
            "lead_id": str(data.lead_id),
            "value": float(data.value),
            "created_by": str(ctx.user_id)
        })
        
        return DealResponse(**deal)
    
    # ============= Update Operations =============
    
    @audit_log(AuditAction.UPDATE, "deals")
    @require_permission("deals", "update")
    async def update_deal(
        self,
        ctx: ServiceContext,
        deal_id: UUID,
        data: DealUpdate
    ) -> DealResponse:
        """Update deal fields."""
        deal = await self._get_deal_with_access(ctx, deal_id, "update")
        
        # Prepare update data
        update_data = data.model_dump(exclude_unset=True)
        if not update_data:
            return DealResponse(**deal)
        
        # Convert types
        if "value" in update_data:
            update_data["value"] = float(update_data["value"])
        if "stage" in update_data:
            # Use change_stage for proper validation
            raise ValidationError(
                "Use change_stage endpoint to update deal stage"
            )
        
        updated = await self.repo.update(deal_id, update_data)
        
        # Publish event
        await self._publish_event("deal.updated", {
            "deal_id": str(deal_id),
            "updated_by": str(ctx.user_id),
            "fields": list(update_data.keys())
        })
        
        return DealResponse(**updated)
    
    @audit_log(AuditAction.STATUS_CHANGE, "deals")
    @require_permission("deals", "update")
    async def change_stage(
        self,
        ctx: ServiceContext,
        deal_id: UUID,
        stage_update: DealStageUpdate
    ) -> DealResponse:
        """Change deal stage with validation."""
        deal = await self._get_deal_with_access(ctx, deal_id, "update")
        current_stage = DealStage(deal["stage"])
        new_stage = stage_update.stage
        
        # Validate transition
        allowed = STAGE_TRANSITIONS.get(current_stage, [])
        if new_stage not in allowed:
            raise InvalidStateError(
                message=f"Cannot transition from {current_stage.value} to {new_stage.value}",
                current_state=current_stage.value,
                allowed_states=[s.value for s in allowed]
            )
        
        # Prepare update
        update_data = {
            "stage": new_stage.value,
            "probability": STAGE_PROBABILITY.get(new_stage, deal.get("probability", 0))
        }
        
        # Handle closed stages
        if new_stage == DealStage.CLOSED_WON:
            update_data["closed_at"] = datetime.utcnow().isoformat()
            update_data["close_reason"] = stage_update.reason or "Won"
        elif new_stage == DealStage.CLOSED_LOST:
            update_data["closed_at"] = datetime.utcnow().isoformat()
            update_data["close_reason"] = stage_update.reason or "Lost"
        elif current_stage in [DealStage.CLOSED_WON, DealStage.CLOSED_LOST]:
            # Reopening
            update_data["closed_at"] = None
            update_data["close_reason"] = None
        
        updated = await self.repo.update(deal_id, update_data)
        
        # Publish event
        await self._publish_event("deal.stage_changed", {
            "deal_id": str(deal_id),
            "from_stage": current_stage.value,
            "to_stage": new_stage.value,
            "changed_by": str(ctx.user_id),
            "reason": stage_update.reason
        })
        
        return DealResponse(**updated)
    
    @audit_log(AuditAction.UPDATE, "deals")
    @require_permission("deals", "close")
    async def close_deal(
        self,
        ctx: ServiceContext,
        deal_id: UUID,
        close_data: DealClose
    ) -> DealResponse:
        """Close deal as won or lost."""
        deal = await self._get_deal_with_access(ctx, deal_id, "close")
        current_stage = DealStage(deal["stage"])
        
        # Must be in negotiation to close (unless already closed)
        if current_stage not in [DealStage.NEGOTIATION, DealStage.CLOSED_WON, DealStage.CLOSED_LOST]:
            raise InvalidStateError(
                message="Deal must be in negotiation stage to close",
                current_state=current_stage.value,
                allowed_states=[DealStage.NEGOTIATION.value]
            )
        
        new_stage = DealStage.CLOSED_WON if close_data.won else DealStage.CLOSED_LOST
        
        update_data = {
            "stage": new_stage.value,
            "probability": 100 if close_data.won else 0,
            "closed_at": datetime.utcnow().isoformat(),
            "close_reason": close_data.reason
        }
        
        # Update value if provided
        if close_data.actual_value is not None:
            update_data["value"] = float(close_data.actual_value)
        
        updated = await self.repo.update(deal_id, update_data)
        
        # Update lead status if won
        if close_data.won and self._lead_repo:
            await self._lead_repo.update(deal["lead_id"], {
                "status": "won",
                "converted_at": datetime.utcnow().isoformat()
            })
        
        # Publish event
        await self._publish_event("deal.closed", {
            "deal_id": str(deal_id),
            "won": close_data.won,
            "value": updated.get("value"),
            "closed_by": str(ctx.user_id),
            "reason": close_data.reason
        })
        
        return DealResponse(**updated)
    
    @audit_log(AuditAction.UPDATE, "deals")
    @require_permission("deals", "update")
    async def reopen_deal(
        self,
        ctx: ServiceContext,
        deal_id: UUID
    ) -> DealResponse:
        """Reopen a closed deal."""
        deal = await self._get_deal_with_access(ctx, deal_id, "update")
        current_stage = DealStage(deal["stage"])
        
        if current_stage not in [DealStage.CLOSED_WON, DealStage.CLOSED_LOST]:
            raise InvalidStateError(
                message="Can only reopen closed deals",
                current_state=current_stage.value,
                allowed_states=[DealStage.CLOSED_WON.value, DealStage.CLOSED_LOST.value]
            )
        
        update_data = {
            "stage": DealStage.DISCOVERY.value,
            "probability": STAGE_PROBABILITY[DealStage.DISCOVERY],
            "closed_at": None,
            "close_reason": None
        }
        
        updated = await self.repo.update(deal_id, update_data)
        
        # Publish event
        await self._publish_event("deal.reopened", {
            "deal_id": str(deal_id),
            "previous_stage": current_stage.value,
            "reopened_by": str(ctx.user_id)
        })
        
        return DealResponse(**updated)
    
    # ============= Delete Operations =============
    
    @audit_log(AuditAction.DELETE, "deals")
    @require_permission("deals", "delete")
    async def delete_deal(
        self,
        ctx: ServiceContext,
        deal_id: UUID
    ) -> bool:
        """Delete deal."""
        deal = await self._get_deal_with_access(ctx, deal_id, "delete")
        
        await self.repo.delete(deal_id)
        
        # Publish event
        await self._publish_event("deal.deleted", {
            "deal_id": str(deal_id),
            "lead_id": deal["lead_id"],
            "deleted_by": str(ctx.user_id)
        })
        
        return True
    
    # ============= Helper Methods =============
    
    async def _check_lead_access(
        self,
        ctx: ServiceContext,
        lead_id: UUID,
        action: str
    ) -> None:
        """Verify user can access the lead."""
        if not self._lead_repo:
            return
        
        lead = await self._lead_repo.get_by_id(lead_id)
        if not lead:
            raise NotFoundError(
                message=f"Lead {lead_id} not found",
                resource_type="lead",
                resource_id=str(lead_id)
            )
        
        await self._ensure_resource_access(
            ctx, lead.get("assigned_to"), "leads", action
        )
    
    async def _get_deal_with_access(
        self,
        ctx: ServiceContext,
        deal_id: UUID,
        action: str
    ) -> dict:
        """Get deal and verify access permission."""
        deal = await self.repo.get_by_id(deal_id)
        if not deal:
            raise NotFoundError(
                message=f"Deal {deal_id} not found",
                resource_type="deal",
                resource_id=str(deal_id)
            )
        
        await self._ensure_resource_access(
            ctx, deal.get("assigned_to"), "deals", action
        )
        
        return deal
    
    async def _publish_event(self, event_type: str, data: dict) -> None:
        """Publish domain event if publisher is configured."""
        if self._event_publisher:
            try:
                await self._event_publisher.publish(event_type, data)
            except Exception as e:
                logger.warning(f"Failed to publish event {event_type}: {e}")
