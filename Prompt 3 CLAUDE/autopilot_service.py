"""
Autopilot Service for SalesFlow AI.

Handles automated campaign management including:
- Campaign lifecycle (draft, active, paused, completed)
- Automated message scheduling
- A/B testing
- Campaign analytics
"""
from datetime import datetime, timedelta
from typing import Optional
from uuid import UUID
import logging

from app.core.exceptions import (
    NotFoundError,
    PermissionError,
    ValidationError,
    InvalidStateError,
    BusinessRuleViolation
)
from app.schemas import (
    CampaignCreate,
    CampaignUpdate,
    CampaignResponse,
    CampaignListResponse,
    CampaignStatus,
    CampaignStepCreate,
    CampaignStepResponse,
    CampaignMetrics,
    LeadSearchParams,
    PaginationParams
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


# Valid status transitions
STATUS_TRANSITIONS = {
    CampaignStatus.DRAFT: [CampaignStatus.SCHEDULED, CampaignStatus.CANCELLED],
    CampaignStatus.SCHEDULED: [CampaignStatus.ACTIVE, CampaignStatus.PAUSED, CampaignStatus.CANCELLED],
    CampaignStatus.ACTIVE: [CampaignStatus.PAUSED, CampaignStatus.COMPLETED, CampaignStatus.CANCELLED],
    CampaignStatus.PAUSED: [CampaignStatus.ACTIVE, CampaignStatus.CANCELLED],
    CampaignStatus.COMPLETED: [],  # Terminal
    CampaignStatus.CANCELLED: []   # Terminal
}


class AutopilotService(BaseService):
    """Service for automated campaign management."""
    
    def __init__(
        self,
        campaign_repo,
        step_repo=None,
        lead_repo=None,
        message_repo=None,
        event_publisher=None
    ):
        super().__init__(campaign_repo)
        self._step_repo = step_repo
        self._lead_repo = lead_repo
        self._message_repo = message_repo
        self._event_publisher = event_publisher
    
    # ============= Campaign CRUD =============
    
    @audit_log(AuditAction.READ, "campaigns")
    @require_permission("campaigns", "read")
    async def get_campaign(
        self,
        ctx: ServiceContext,
        campaign_id: UUID
    ) -> CampaignResponse:
        """Get campaign by ID."""
        campaign = await self.repo.get_by_id(campaign_id)
        if not campaign:
            raise NotFoundError(
                message=f"Campaign {campaign_id} not found",
                resource_type="campaign",
                resource_id=str(campaign_id)
            )
        
        return CampaignResponse(**campaign)
    
    @require_permission("campaigns", "read")
    async def list_campaigns(
        self,
        ctx: ServiceContext,
        status: Optional[list[CampaignStatus]] = None,
        pagination: PaginationParams = None
    ) -> CampaignListResponse:
        """List campaigns with filtering."""
        pagination = pagination or PaginationParams()
        
        filters = {}
        if status:
            filters["status"] = [s.value for s in status]
        
        # Non-admins only see campaigns they created
        if ctx.user_role not in ["admin", "manager"]:
            filters["created_by"] = str(ctx.user_id)
        
        result = await self.repo.search(
            filters=filters,
            page=pagination.page,
            page_size=pagination.page_size
        )
        
        return CampaignListResponse(
            items=[CampaignResponse(**c) for c in result["items"]],
            total=result["total"],
            page=result["page"],
            page_size=result["page_size"],
            total_pages=result["total_pages"],
            has_next=result["has_next"],
            has_previous=result["has_previous"]
        )
    
    @audit_log(AuditAction.CREATE, "campaigns")
    @require_permission("campaigns", "create")
    async def create_campaign(
        self,
        ctx: ServiceContext,
        data: CampaignCreate
    ) -> CampaignResponse:
        """Create a new campaign."""
        # Validate schedule
        if data.schedule_start and data.schedule_end:
            if data.schedule_end <= data.schedule_start:
                raise ValidationError(
                    "Schedule end must be after schedule start",
                    field_errors={"schedule_end": ["Must be after schedule_start"]}
                )
        
        # Prepare campaign data
        campaign_data = data.model_dump()
        campaign_data["status"] = CampaignStatus.DRAFT.value
        campaign_data["created_by"] = str(ctx.user_id)
        
        # Convert filter to dict if present
        if data.target_lead_filter:
            campaign_data["target_lead_filter"] = data.target_lead_filter.model_dump()
        
        # Initialize counters
        campaign_data.update({
            "total_leads": 0,
            "leads_processed": 0,
            "messages_sent": 0,
            "messages_delivered": 0,
            "messages_opened": 0,
            "messages_clicked": 0,
            "replies_received": 0
        })
        
        campaign = await self.repo.create(campaign_data)
        
        # Publish event
        await self._publish_event("campaign.created", {
            "campaign_id": campaign["id"],
            "created_by": str(ctx.user_id)
        })
        
        return CampaignResponse(**campaign)
    
    @audit_log(AuditAction.UPDATE, "campaigns")
    @require_permission("campaigns", "update")
    async def update_campaign(
        self,
        ctx: ServiceContext,
        campaign_id: UUID,
        data: CampaignUpdate
    ) -> CampaignResponse:
        """Update campaign (only in DRAFT or PAUSED status)."""
        campaign = await self._get_campaign(campaign_id)
        
        # Can only update draft or paused campaigns
        status = CampaignStatus(campaign["status"])
        if status not in [CampaignStatus.DRAFT, CampaignStatus.PAUSED]:
            raise InvalidStateError(
                message="Can only update draft or paused campaigns",
                current_state=status.value,
                allowed_states=[CampaignStatus.DRAFT.value, CampaignStatus.PAUSED.value]
            )
        
        # Prepare update data
        update_data = data.model_dump(exclude_unset=True)
        if not update_data:
            return CampaignResponse(**campaign)
        
        # Convert filter to dict if present
        if "target_lead_filter" in update_data and update_data["target_lead_filter"]:
            update_data["target_lead_filter"] = update_data["target_lead_filter"].model_dump()
        
        updated = await self.repo.update(campaign_id, update_data)
        
        return CampaignResponse(**updated)
    
    @audit_log(AuditAction.DELETE, "campaigns")
    @require_permission("campaigns", "delete")
    async def delete_campaign(
        self,
        ctx: ServiceContext,
        campaign_id: UUID
    ) -> bool:
        """Delete campaign (only if not active)."""
        campaign = await self._get_campaign(campaign_id)
        
        status = CampaignStatus(campaign["status"])
        if status == CampaignStatus.ACTIVE:
            raise InvalidStateError(
                message="Cannot delete active campaign. Pause or cancel first.",
                current_state=status.value
            )
        
        await self.repo.delete(campaign_id)
        
        return True
    
    # ============= Campaign Lifecycle =============
    
    @audit_log(AuditAction.STATUS_CHANGE, "campaigns")
    @require_permission("campaigns", "activate")
    async def activate_campaign(
        self,
        ctx: ServiceContext,
        campaign_id: UUID
    ) -> CampaignResponse:
        """Activate a campaign to start sending."""
        campaign = await self._get_campaign(campaign_id)
        current_status = CampaignStatus(campaign["status"])
        
        # Validate transition
        if CampaignStatus.ACTIVE not in STATUS_TRANSITIONS.get(current_status, []):
            raise InvalidStateError(
                message=f"Cannot activate campaign in {current_status.value} status",
                current_state=current_status.value,
                allowed_states=[s.value for s in STATUS_TRANSITIONS.get(current_status, [])]
            )
        
        # Validate campaign has steps
        if self._step_repo:
            steps = await self._step_repo.get_by_campaign(campaign_id)
            if not steps:
                raise BusinessRuleViolation(
                    message="Campaign must have at least one step before activation",
                    rule="campaign_requires_steps"
                )
        
        # Calculate target leads
        total_leads = 0
        if self._lead_repo and campaign.get("target_lead_filter"):
            filter_params = LeadSearchParams(**campaign["target_lead_filter"])
            result = await self._lead_repo.search(filter_params, page=1, page_size=1)
            total_leads = result.get("total", 0)
        
        update_data = {
            "status": CampaignStatus.ACTIVE.value,
            "total_leads": total_leads,
            "activated_at": datetime.utcnow().isoformat()
        }
        
        updated = await self.repo.update(campaign_id, update_data)
        
        # Publish event
        await self._publish_event("campaign.activated", {
            "campaign_id": str(campaign_id),
            "total_leads": total_leads,
            "activated_by": str(ctx.user_id)
        })
        
        return CampaignResponse(**updated)
    
    @audit_log(AuditAction.STATUS_CHANGE, "campaigns")
    @require_permission("campaigns", "pause")
    async def pause_campaign(
        self,
        ctx: ServiceContext,
        campaign_id: UUID
    ) -> CampaignResponse:
        """Pause an active campaign."""
        campaign = await self._get_campaign(campaign_id)
        current_status = CampaignStatus(campaign["status"])
        
        if current_status != CampaignStatus.ACTIVE:
            raise InvalidStateError(
                message="Can only pause active campaigns",
                current_state=current_status.value,
                allowed_states=[CampaignStatus.ACTIVE.value]
            )
        
        update_data = {
            "status": CampaignStatus.PAUSED.value,
            "paused_at": datetime.utcnow().isoformat()
        }
        
        updated = await self.repo.update(campaign_id, update_data)
        
        # Publish event
        await self._publish_event("campaign.paused", {
            "campaign_id": str(campaign_id),
            "paused_by": str(ctx.user_id)
        })
        
        return CampaignResponse(**updated)
    
    @audit_log(AuditAction.STATUS_CHANGE, "campaigns")
    @require_permission("campaigns", "pause")
    async def resume_campaign(
        self,
        ctx: ServiceContext,
        campaign_id: UUID
    ) -> CampaignResponse:
        """Resume a paused campaign."""
        campaign = await self._get_campaign(campaign_id)
        current_status = CampaignStatus(campaign["status"])
        
        if current_status != CampaignStatus.PAUSED:
            raise InvalidStateError(
                message="Can only resume paused campaigns",
                current_state=current_status.value,
                allowed_states=[CampaignStatus.PAUSED.value]
            )
        
        update_data = {
            "status": CampaignStatus.ACTIVE.value,
            "resumed_at": datetime.utcnow().isoformat()
        }
        
        updated = await self.repo.update(campaign_id, update_data)
        
        # Publish event
        await self._publish_event("campaign.resumed", {
            "campaign_id": str(campaign_id),
            "resumed_by": str(ctx.user_id)
        })
        
        return CampaignResponse(**updated)
    
    @audit_log(AuditAction.STATUS_CHANGE, "campaigns")
    @require_permission("campaigns", "delete")
    async def cancel_campaign(
        self,
        ctx: ServiceContext,
        campaign_id: UUID,
        reason: str = None
    ) -> CampaignResponse:
        """Cancel a campaign."""
        campaign = await self._get_campaign(campaign_id)
        current_status = CampaignStatus(campaign["status"])
        
        if current_status in [CampaignStatus.COMPLETED, CampaignStatus.CANCELLED]:
            raise InvalidStateError(
                message="Campaign is already in terminal state",
                current_state=current_status.value
            )
        
        update_data = {
            "status": CampaignStatus.CANCELLED.value,
            "cancelled_at": datetime.utcnow().isoformat(),
            "cancel_reason": reason
        }
        
        updated = await self.repo.update(campaign_id, update_data)
        
        # Publish event
        await self._publish_event("campaign.cancelled", {
            "campaign_id": str(campaign_id),
            "cancelled_by": str(ctx.user_id),
            "reason": reason
        })
        
        return CampaignResponse(**updated)
    
    # ============= Campaign Steps =============
    
    @require_permission("campaigns", "update")
    async def add_step(
        self,
        ctx: ServiceContext,
        campaign_id: UUID,
        step_data: CampaignStepCreate
    ) -> CampaignStepResponse:
        """Add a step to a campaign."""
        campaign = await self._get_campaign(campaign_id)
        
        # Can only add steps to draft campaigns
        status = CampaignStatus(campaign["status"])
        if status != CampaignStatus.DRAFT:
            raise InvalidStateError(
                message="Can only add steps to draft campaigns",
                current_state=status.value,
                allowed_states=[CampaignStatus.DRAFT.value]
            )
        
        if not self._step_repo:
            raise BusinessRuleViolation("Step repository not configured")
        
        # Create step
        step = await self._step_repo.create({
            "campaign_id": str(campaign_id),
            **step_data.model_dump()
        })
        
        return CampaignStepResponse(**step)
    
    @require_permission("campaigns", "read")
    async def get_steps(
        self,
        ctx: ServiceContext,
        campaign_id: UUID
    ) -> list[CampaignStepResponse]:
        """Get all steps for a campaign."""
        await self._get_campaign(campaign_id)  # Verify exists
        
        if not self._step_repo:
            return []
        
        steps = await self._step_repo.get_by_campaign(campaign_id)
        return [CampaignStepResponse(**s) for s in steps]
    
    @require_permission("campaigns", "update")
    async def remove_step(
        self,
        ctx: ServiceContext,
        campaign_id: UUID,
        step_id: UUID
    ) -> bool:
        """Remove a step from a campaign."""
        campaign = await self._get_campaign(campaign_id)
        
        status = CampaignStatus(campaign["status"])
        if status != CampaignStatus.DRAFT:
            raise InvalidStateError(
                message="Can only remove steps from draft campaigns",
                current_state=status.value
            )
        
        if not self._step_repo:
            raise BusinessRuleViolation("Step repository not configured")
        
        await self._step_repo.delete(step_id)
        return True
    
    # ============= Campaign Metrics =============
    
    @require_permission("campaigns", "read")
    async def get_metrics(
        self,
        ctx: ServiceContext,
        campaign_id: UUID
    ) -> CampaignMetrics:
        """Get campaign performance metrics."""
        campaign = await self._get_campaign(campaign_id)
        
        # Calculate rates
        sent = campaign.get("messages_sent", 0) or 1
        delivered = campaign.get("messages_delivered", 0)
        opened = campaign.get("messages_opened", 0)
        clicked = campaign.get("messages_clicked", 0)
        replied = campaign.get("replies_received", 0)
        
        return CampaignMetrics(
            total_leads=campaign.get("total_leads", 0),
            leads_active=campaign.get("leads_processed", 0),
            leads_completed=0,  # Would need separate tracking
            leads_unsubscribed=0,  # Would need separate tracking
            messages_sent=sent,
            delivery_rate=delivered / sent if sent > 0 else 0,
            open_rate=opened / delivered if delivered > 0 else 0,
            click_rate=clicked / opened if opened > 0 else 0,
            reply_rate=replied / sent if sent > 0 else 0,
            unsubscribe_rate=0  # Would need separate tracking
        )
    
    # ============= Helper Methods =============
    
    async def _get_campaign(self, campaign_id: UUID) -> dict:
        """Get campaign or raise NotFoundError."""
        campaign = await self.repo.get_by_id(campaign_id)
        if not campaign:
            raise NotFoundError(
                message=f"Campaign {campaign_id} not found",
                resource_type="campaign",
                resource_id=str(campaign_id)
            )
        return campaign
    
    async def _publish_event(self, event_type: str, data: dict) -> None:
        """Publish domain event if publisher is configured."""
        if self._event_publisher:
            try:
                await self._event_publisher.publish(event_type, data)
            except Exception as e:
                logger.warning(f"Failed to publish event {event_type}: {e}")
