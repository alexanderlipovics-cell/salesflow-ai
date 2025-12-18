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
from app.services.base import (
    BaseService,
    ServiceContext,
    ServiceResult,
    audit_log,
    require_permission,
    AuditAction
)

logger = logging.getLogger(__name__)


# Deal Stage Enum (inline to avoid circular imports)
class DealStage:
    DISCOVERY = "discovery"
    QUALIFICATION = "qualification"
    PROPOSAL = "proposal"
    NEGOTIATION = "negotiation"
    CLOSED_WON = "closed_won"
    CLOSED_LOST = "closed_lost"


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
    ) -> dict:
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
        
        return deal
    
    @require_permission("deals", "read")
    async def list_deals(
        self,
        ctx: ServiceContext,
        lead_id: Optional[UUID] = None,
        stage: Optional[list[str]] = None,
        min_value: Optional[float] = None,
        max_value: Optional[float] = None,
        page: int = 1,
        page_size: int = 20
    ) -> dict:
        """List deals with filtering."""
        # Build filters
        filters = {}
        if lead_id:
            filters["lead_id"] = str(lead_id)
        if stage:
            filters["stage"] = stage
        if min_value is not None:
            filters["min_value"] = float(min_value)
        if max_value is not None:
            filters["max_value"] = float(max_value)
        
        # Non-admins only see their deals
        if ctx.user_role not in ["admin", "manager"]:
            filters["assigned_to"] = str(ctx.user_id)
        
        result = await self.repo.search(
            filters=filters,
            page=page,
            page_size=page_size
        )
        
        return result
    
    @require_permission("deals", "read")
    async def get_deals_for_lead(
        self,
        ctx: ServiceContext,
        lead_id: UUID
    ) -> list[dict]:
        """Get all deals for a lead."""
        await self._check_lead_access(ctx, lead_id, "read")
        
        deals = await self.repo.get_by_lead(lead_id)
        return deals
    
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
    ) -> dict:
        """Get deal analytics."""
        user_filter = None if ctx.user_role in ["admin", "manager"] else str(ctx.user_id)
        
        stats = await self.repo.get_statistics(
            assigned_to=user_filter,
            start_date=start_date,
            end_date=end_date
        )
        
        return stats
    
    # ============= Create Operations =============
    
    @audit_log(AuditAction.CREATE, "deals")
    @require_permission("deals", "create")
    async def create_deal(
        self,
        ctx: ServiceContext,
        data: dict
    ) -> dict:
        """Create a new deal."""
        lead_id = data.get("lead_id")
        
        # Verify lead exists and user has access
        await self._check_lead_access(ctx, lead_id, "update")
        
        # Prepare deal data
        deal_data = {**data}
        deal_data["lead_id"] = str(lead_id)
        if "value" in deal_data:
            deal_data["value"] = float(deal_data["value"])
        
        stage = deal_data.get("stage", DealStage.DISCOVERY)
        deal_data["probability"] = deal_data.get("probability") or STAGE_PROBABILITY.get(stage, 0)
        deal_data["assigned_to"] = str(ctx.user_id)
        deal_data["created_by"] = str(ctx.user_id)
        
        # Create deal
        deal = await self.repo.create(deal_data)
        
        # Update lead if this is first deal
        if self._lead_repo:
            lead = await self._lead_repo.get_by_id(lead_id)
            if lead and not lead.get("estimated_value"):
                await self._lead_repo.update(lead_id, {
                    "estimated_value": float(data.get("value", 0))
                })
        
        # Publish event
        await self._publish_event("deal.created", {
            "deal_id": deal["id"],
            "lead_id": str(lead_id),
            "value": deal_data.get("value"),
            "created_by": str(ctx.user_id)
        })
        
        return deal
    
    # ============= Update Operations =============
    
    @audit_log(AuditAction.UPDATE, "deals")
    @require_permission("deals", "update")
    async def update_deal(
        self,
        ctx: ServiceContext,
        deal_id: UUID,
        data: dict
    ) -> dict:
        """Update deal fields."""
        deal = await self._get_deal_with_access(ctx, deal_id, "update")
        
        # Prepare update data
        update_data = {**data}
        if not update_data:
            return deal
        
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
        
        return updated
    
    @audit_log(AuditAction.STATUS_CHANGE, "deals")
    @require_permission("deals", "update")
    async def change_stage(
        self,
        ctx: ServiceContext,
        deal_id: UUID,
        new_stage: str,
        reason: str = None
    ) -> dict:
        """Change deal stage with validation."""
        deal = await self._get_deal_with_access(ctx, deal_id, "update")
        current_stage = deal.get("stage", DealStage.DISCOVERY)
        
        # Validate transition
        allowed = STAGE_TRANSITIONS.get(current_stage, [])
        if new_stage not in allowed:
            raise InvalidStateError(
                message=f"Cannot transition from {current_stage} to {new_stage}",
                current_state=current_stage,
                allowed_states=allowed
            )
        
        # Prepare update
        update_data = {
            "stage": new_stage,
            "probability": STAGE_PROBABILITY.get(new_stage, deal.get("probability", 0))
        }
        
        # Handle closed stages
        if new_stage == DealStage.CLOSED_WON:
            update_data["closed_at"] = datetime.utcnow().isoformat()
            update_data["close_reason"] = reason or "Won"
        elif new_stage == DealStage.CLOSED_LOST:
            update_data["closed_at"] = datetime.utcnow().isoformat()
            update_data["close_reason"] = reason or "Lost"
        elif current_stage in [DealStage.CLOSED_WON, DealStage.CLOSED_LOST]:
            # Reopening
            update_data["closed_at"] = None
            update_data["close_reason"] = None
        
        updated = await self.repo.update(deal_id, update_data)
        
        # Publish event
        await self._publish_event("deal.stage_changed", {
            "deal_id": str(deal_id),
            "from_stage": current_stage,
            "to_stage": new_stage,
            "changed_by": str(ctx.user_id),
            "reason": reason
        })
        
        return updated
    
    @audit_log(AuditAction.UPDATE, "deals")
    @require_permission("deals", "close")
    async def close_deal(
        self,
        ctx: ServiceContext,
        deal_id: UUID,
        won: bool,
        reason: str = None,
        actual_value: float = None
    ) -> dict:
        """Close deal as won or lost."""
        deal = await self._get_deal_with_access(ctx, deal_id, "close")
        current_stage = deal.get("stage", DealStage.DISCOVERY)
        
        # Must be in negotiation to close (unless already closed)
        if current_stage not in [DealStage.NEGOTIATION, DealStage.CLOSED_WON, DealStage.CLOSED_LOST]:
            raise InvalidStateError(
                message="Deal must be in negotiation stage to close",
                current_state=current_stage,
                allowed_states=[DealStage.NEGOTIATION]
            )
        
        new_stage = DealStage.CLOSED_WON if won else DealStage.CLOSED_LOST
        
        update_data = {
            "stage": new_stage,
            "probability": 100 if won else 0,
            "closed_at": datetime.utcnow().isoformat(),
            "close_reason": reason
        }
        
        # Update value if provided
        if actual_value is not None:
            update_data["value"] = float(actual_value)
        
        updated = await self.repo.update(deal_id, update_data)
        
        # Update lead status if won
        if won and self._lead_repo:
            await self._lead_repo.update(deal["lead_id"], {
                "status": "won",
                "converted_at": datetime.utcnow().isoformat()
            })
        
        # Publish event
        await self._publish_event("deal.closed", {
            "deal_id": str(deal_id),
            "won": won,
            "value": updated.get("value"),
            "closed_by": str(ctx.user_id),
            "reason": reason
        })
        
        return updated
    
    @audit_log(AuditAction.UPDATE, "deals")
    @require_permission("deals", "update")
    async def reopen_deal(
        self,
        ctx: ServiceContext,
        deal_id: UUID
    ) -> dict:
        """Reopen a closed deal."""
        deal = await self._get_deal_with_access(ctx, deal_id, "update")
        current_stage = deal.get("stage", DealStage.DISCOVERY)
        
        if current_stage not in [DealStage.CLOSED_WON, DealStage.CLOSED_LOST]:
            raise InvalidStateError(
                message="Can only reopen closed deals",
                current_state=current_stage,
                allowed_states=[DealStage.CLOSED_WON, DealStage.CLOSED_LOST]
            )
        
        update_data = {
            "stage": DealStage.DISCOVERY,
            "probability": STAGE_PROBABILITY[DealStage.DISCOVERY],
            "closed_at": None,
            "close_reason": None
        }
        
        updated = await self.repo.update(deal_id, update_data)
        
        # Publish event
        await self._publish_event("deal.reopened", {
            "deal_id": str(deal_id),
            "previous_stage": current_stage,
            "reopened_by": str(ctx.user_id)
        })
        
        return updated
    
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


__all__ = ["DealService", "DealStage", "STAGE_TRANSITIONS", "STAGE_PROBABILITY"]

