"""
Lead Service for SalesFlow AI.

Handles all lead-related business logic including:
- CRUD operations with permission checks
- Status transitions
- Lead scoring
- Assignment management
- Bulk operations
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
    LeadCreate,
    LeadUpdate,
    LeadResponse,
    LeadListResponse,
    LeadSearchParams,
    LeadStatus,
    LeadStatusUpdate,
    LeadAssignment,
    LeadBulkAction,
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
    LeadStatus.NEW: [LeadStatus.CONTACTED, LeadStatus.LOST],
    LeadStatus.CONTACTED: [LeadStatus.QUALIFIED, LeadStatus.LOST],
    LeadStatus.QUALIFIED: [LeadStatus.PROPOSAL, LeadStatus.LOST],
    LeadStatus.PROPOSAL: [LeadStatus.NEGOTIATION, LeadStatus.LOST],
    LeadStatus.NEGOTIATION: [LeadStatus.WON, LeadStatus.LOST],
    LeadStatus.WON: [],  # Terminal state
    LeadStatus.LOST: [LeadStatus.NEW]  # Can reopen
}


class LeadService(BaseService):
    """Service for lead management business logic."""
    
    def __init__(self, lead_repo, contact_repo=None, event_publisher=None):
        super().__init__(lead_repo)
        self._contact_repo = contact_repo
        self._event_publisher = event_publisher
    
    # ============= Read Operations =============
    
    @audit_log(AuditAction.READ, "leads")
    @require_permission("leads", "read")
    async def get_lead(self, ctx: ServiceContext, lead_id: UUID) -> LeadResponse:
        """Get lead by ID with permission check."""
        lead = await self.repo.get_by_id(lead_id)
        if not lead:
            raise NotFoundError(
                message=f"Lead {lead_id} not found",
                resource_type="lead",
                resource_id=str(lead_id)
            )
        
        # Check resource-level access
        await self._ensure_resource_access(
            ctx, lead.get("assigned_to"), "leads", "read"
        )
        
        return LeadResponse(**lead)
    
    @require_permission("leads", "read")
    async def list_leads(
        self,
        ctx: ServiceContext,
        params: LeadSearchParams,
        pagination: PaginationParams
    ) -> LeadListResponse:
        """List leads with filtering and pagination."""
        # Non-admins/managers only see their own leads
        if ctx.user_role not in ["admin", "manager"]:
            params.assigned_to = ctx.user_id
        
        result = await self.repo.search(
            params=params,
            page=pagination.page,
            page_size=pagination.page_size
        )
        
        return LeadListResponse(
            items=[LeadResponse(**item) for item in result["items"]],
            total=result["total"],
            page=result["page"],
            page_size=result["page_size"],
            total_pages=result["total_pages"],
            has_next=result["has_next"],
            has_previous=result["has_previous"]
        )
    
    @require_permission("leads", "read")
    async def get_lead_statistics(self, ctx: ServiceContext) -> dict:
        """Get lead statistics for dashboard."""
        # Apply user filter for non-admins
        user_filter = None if ctx.user_role in ["admin", "manager"] else ctx.user_id
        
        return await self.repo.get_statistics(assigned_to=user_filter)
    
    # ============= Create Operations =============
    
    @audit_log(AuditAction.CREATE, "leads")
    @require_permission("leads", "create")
    async def create_lead(
        self,
        ctx: ServiceContext,
        data: LeadCreate
    ) -> LeadResponse:
        """Create a new lead."""
        # Check for duplicate email
        existing = await self.repo.get_by_email(data.email)
        if existing:
            raise ConflictError(
                message=f"Lead with email {data.email} already exists",
                conflicting_field="email"
            )
        
        # Prepare lead data
        lead_data = data.model_dump()
        lead_data.update({
            "status": LeadStatus.NEW.value,
            "score": 0,
            "created_by": str(ctx.user_id),
            "assigned_to": str(ctx.user_id)  # Auto-assign to creator
        })
        
        # Create lead
        lead = await self.repo.create(lead_data)
        
        # Publish event
        await self._publish_event("lead.created", {
            "lead_id": lead["id"],
            "created_by": str(ctx.user_id)
        })
        
        return LeadResponse(**lead)
    
    @audit_log(AuditAction.CREATE, "leads")
    @require_permission("leads", "import")
    async def bulk_create_leads(
        self,
        ctx: ServiceContext,
        leads_data: list[LeadCreate]
    ) -> ServiceResult:
        """Bulk create leads (import)."""
        if len(leads_data) > 1000:
            raise ValidationError("Maximum 1000 leads per import")
        
        created = []
        errors = []
        
        for idx, data in enumerate(leads_data):
            try:
                lead = await self.create_lead(ctx, data)
                created.append(lead)
            except Exception as e:
                errors.append(f"Row {idx + 1}: {str(e)}")
        
        return ServiceResult.ok(
            data={"created": len(created), "leads": created},
            message=f"Created {len(created)} leads",
            metadata={"errors": errors} if errors else None
        )
    
    # ============= Update Operations =============
    
    @audit_log(AuditAction.UPDATE, "leads")
    @require_permission("leads", "update")
    async def update_lead(
        self,
        ctx: ServiceContext,
        lead_id: UUID,
        data: LeadUpdate
    ) -> LeadResponse:
        """Update lead fields."""
        lead = await self._get_lead_with_access(ctx, lead_id, "update")
        
        # Check email uniqueness if changing
        if data.email and data.email != lead["email"]:
            existing = await self.repo.get_by_email(data.email)
            if existing and existing["id"] != str(lead_id):
                raise ConflictError(
                    message=f"Email {data.email} already in use",
                    conflicting_field="email"
                )
        
        # Update only provided fields
        update_data = data.model_dump(exclude_unset=True)
        if not update_data:
            return LeadResponse(**lead)
        
        updated = await self.repo.update(lead_id, update_data)
        
        # Publish event
        await self._publish_event("lead.updated", {
            "lead_id": str(lead_id),
            "updated_by": str(ctx.user_id),
            "fields": list(update_data.keys())
        })
        
        return LeadResponse(**updated)
    
    @audit_log(AuditAction.STATUS_CHANGE, "leads")
    @require_permission("leads", "update")
    async def change_status(
        self,
        ctx: ServiceContext,
        lead_id: UUID,
        status_update: LeadStatusUpdate
    ) -> LeadResponse:
        """Change lead status with validation."""
        lead = await self._get_lead_with_access(ctx, lead_id, "update")
        current_status = LeadStatus(lead["status"])
        new_status = status_update.status
        
        # Validate transition
        if new_status not in STATUS_TRANSITIONS.get(current_status, []):
            allowed = STATUS_TRANSITIONS.get(current_status, [])
            raise InvalidStateError(
                message=f"Cannot transition from {current_status.value} to {new_status.value}",
                current_state=current_status.value,
                allowed_states=[s.value for s in allowed]
            )
        
        # Update status
        update_data = {"status": new_status.value}
        
        # Track status-specific timestamps
        if new_status == LeadStatus.CONTACTED:
            update_data["last_contacted_at"] = datetime.utcnow().isoformat()
        elif new_status == LeadStatus.WON:
            update_data["converted_at"] = datetime.utcnow().isoformat()
        elif new_status == LeadStatus.LOST:
            update_data["lost_at"] = datetime.utcnow().isoformat()
            update_data["lost_reason"] = status_update.reason
        
        updated = await self.repo.update(lead_id, update_data)
        
        # Publish event
        await self._publish_event("lead.status_changed", {
            "lead_id": str(lead_id),
            "from_status": current_status.value,
            "to_status": new_status.value,
            "changed_by": str(ctx.user_id),
            "reason": status_update.reason
        })
        
        return LeadResponse(**updated)
    
    @audit_log(AuditAction.UPDATE, "leads")
    @require_permission("leads", "update")
    async def update_score(
        self,
        ctx: ServiceContext,
        lead_id: UUID,
        score: int,
        reason: str = None
    ) -> LeadResponse:
        """Update lead score."""
        if not 0 <= score <= 100:
            raise ValidationError("Score must be between 0 and 100")
        
        lead = await self._get_lead_with_access(ctx, lead_id, "update")
        old_score = lead.get("score", 0)
        
        updated = await self.repo.update(lead_id, {"score": score})
        
        # Publish event for significant score changes
        if abs(score - old_score) >= 10:
            await self._publish_event("lead.score_changed", {
                "lead_id": str(lead_id),
                "old_score": old_score,
                "new_score": score,
                "reason": reason
            })
        
        return LeadResponse(**updated)
    
    @audit_log(AuditAction.ASSIGN, "leads")
    @require_permission("leads", "assign")
    async def assign_lead(
        self,
        ctx: ServiceContext,
        lead_id: UUID,
        assignment: LeadAssignment
    ) -> LeadResponse:
        """Assign lead to user."""
        lead = await self._get_lead_with_access(ctx, lead_id, "assign")
        previous_owner = lead.get("assigned_to")
        
        updated = await self.repo.update(lead_id, {
            "assigned_to": str(assignment.assigned_to)
        })
        
        # Publish event
        await self._publish_event("lead.assigned", {
            "lead_id": str(lead_id),
            "assigned_to": str(assignment.assigned_to),
            "assigned_by": str(ctx.user_id),
            "previous_owner": previous_owner,
            "notify": assignment.notify
        })
        
        return LeadResponse(**updated)
    
    @audit_log(AuditAction.UNASSIGN, "leads")
    @require_permission("leads", "assign")
    async def unassign_lead(
        self,
        ctx: ServiceContext,
        lead_id: UUID
    ) -> LeadResponse:
        """Remove lead assignment."""
        lead = await self._get_lead_with_access(ctx, lead_id, "assign")
        previous_owner = lead.get("assigned_to")
        
        updated = await self.repo.update(lead_id, {"assigned_to": None})
        
        # Publish event
        await self._publish_event("lead.unassigned", {
            "lead_id": str(lead_id),
            "previous_owner": previous_owner,
            "unassigned_by": str(ctx.user_id)
        })
        
        return LeadResponse(**updated)
    
    # ============= Delete Operations =============
    
    @audit_log(AuditAction.DELETE, "leads")
    @require_permission("leads", "delete")
    async def delete_lead(
        self,
        ctx: ServiceContext,
        lead_id: UUID,
        hard_delete: bool = False
    ) -> bool:
        """Delete lead (soft delete by default)."""
        lead = await self._get_lead_with_access(ctx, lead_id, "delete")
        
        if hard_delete and ctx.user_role != "admin":
            raise PermissionError("Only admins can hard delete leads")
        
        if hard_delete:
            await self.repo.hard_delete(lead_id)
        else:
            await self.repo.delete(lead_id)  # Soft delete
        
        # Publish event
        await self._publish_event("lead.deleted", {
            "lead_id": str(lead_id),
            "deleted_by": str(ctx.user_id),
            "hard_delete": hard_delete
        })
        
        return True
    
    @audit_log(AuditAction.UPDATE, "leads")
    @require_permission("leads", "delete")
    async def restore_lead(
        self,
        ctx: ServiceContext,
        lead_id: UUID
    ) -> LeadResponse:
        """Restore soft-deleted lead."""
        restored = await self.repo.restore(lead_id)
        if not restored:
            raise NotFoundError(
                message=f"Lead {lead_id} not found or not deleted",
                resource_type="lead",
                resource_id=str(lead_id)
            )
        
        return LeadResponse(**restored)
    
    # ============= Bulk Operations =============
    
    @audit_log(AuditAction.UPDATE, "leads")
    @require_permission("leads", "update")
    async def bulk_action(
        self,
        ctx: ServiceContext,
        bulk_action: LeadBulkAction
    ) -> ServiceResult:
        """Execute bulk action on multiple leads."""
        action = bulk_action.action
        params = bulk_action.params or {}
        
        results = {"success": [], "failed": []}
        
        for lead_id in bulk_action.lead_ids:
            try:
                if action == "delete":
                    await self.delete_lead(ctx, lead_id)
                elif action == "assign":
                    assignment = LeadAssignment(
                        assigned_to=params.get("assigned_to"),
                        notify=params.get("notify", True)
                    )
                    await self.assign_lead(ctx, lead_id, assignment)
                elif action == "change_status":
                    status_update = LeadStatusUpdate(
                        status=LeadStatus(params.get("status")),
                        reason=params.get("reason")
                    )
                    await self.change_status(ctx, lead_id, status_update)
                elif action == "add_tags":
                    await self._add_tags(ctx, lead_id, params.get("tags", []))
                elif action == "remove_tags":
                    await self._remove_tags(ctx, lead_id, params.get("tags", []))
                else:
                    raise ValidationError(f"Unknown action: {action}")
                
                results["success"].append(str(lead_id))
            except Exception as e:
                results["failed"].append({
                    "lead_id": str(lead_id),
                    "error": str(e)
                })
        
        return ServiceResult.ok(
            data=results,
            message=f"Processed {len(results['success'])} leads successfully"
        )
    
    # ============= Tag Operations =============
    
    async def _add_tags(
        self,
        ctx: ServiceContext,
        lead_id: UUID,
        tags: list[str]
    ) -> LeadResponse:
        """Add tags to lead."""
        lead = await self._get_lead_with_access(ctx, lead_id, "update")
        current_tags = set(lead.get("tags", []))
        new_tags = list(current_tags | set(tags))
        
        updated = await self.repo.update(lead_id, {"tags": new_tags})
        return LeadResponse(**updated)
    
    async def _remove_tags(
        self,
        ctx: ServiceContext,
        lead_id: UUID,
        tags: list[str]
    ) -> LeadResponse:
        """Remove tags from lead."""
        lead = await self._get_lead_with_access(ctx, lead_id, "update")
        current_tags = set(lead.get("tags", []))
        new_tags = list(current_tags - set(tags))
        
        updated = await self.repo.update(lead_id, {"tags": new_tags})
        return LeadResponse(**updated)
    
    # ============= Helper Methods =============
    
    async def _get_lead_with_access(
        self,
        ctx: ServiceContext,
        lead_id: UUID,
        action: str
    ) -> dict:
        """Get lead and verify access permission."""
        lead = await self.repo.get_by_id(lead_id)
        if not lead:
            raise NotFoundError(
                message=f"Lead {lead_id} not found",
                resource_type="lead",
                resource_id=str(lead_id)
            )
        
        await self._ensure_resource_access(
            ctx, lead.get("assigned_to"), "leads", action
        )
        
        return lead
    
    async def _publish_event(self, event_type: str, data: dict) -> None:
        """Publish domain event if publisher is configured."""
        if self._event_publisher:
            try:
                await self._event_publisher.publish(event_type, data)
            except Exception as e:
                logger.warning(f"Failed to publish event {event_type}: {e}")
