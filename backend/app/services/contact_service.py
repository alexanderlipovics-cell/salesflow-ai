"""
Contact Service for SalesFlow AI.

Handles contact management including:
- CRUD operations with lead association
- Primary contact management
- Contact merging
"""
from datetime import datetime
from typing import Optional
from uuid import UUID
import logging

from app.core.exceptions import (
    NotFoundError,
    PermissionError,
    ValidationError,
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


class ContactService(BaseService):
    """Service for contact management business logic."""
    
    def __init__(self, contact_repo, lead_repo=None, event_publisher=None):
        super().__init__(contact_repo)
        self._lead_repo = lead_repo
        self._event_publisher = event_publisher
    
    # ============= Read Operations =============
    
    @audit_log(AuditAction.READ, "contacts")
    @require_permission("contacts", "read")
    async def get_contact(
        self,
        ctx: ServiceContext,
        contact_id: UUID
    ) -> dict:
        """Get contact by ID."""
        contact = await self.repo.get_by_id(contact_id)
        if not contact:
            raise NotFoundError(
                message=f"Contact {contact_id} not found",
                resource_type="contact",
                resource_id=str(contact_id)
            )
        
        # Check access via lead ownership
        await self._check_lead_access(ctx, contact["lead_id"], "read")
        
        return contact
    
    @require_permission("contacts", "read")
    async def get_contacts_for_lead(
        self,
        ctx: ServiceContext,
        lead_id: UUID,
        page: int = 1,
        page_size: int = 20
    ) -> dict:
        """Get all contacts for a lead."""
        await self._check_lead_access(ctx, lead_id, "read")
        
        result = await self.repo.get_by_lead(
            lead_id=lead_id,
            page=page,
            page_size=page_size
        )
        
        return result
    
    @require_permission("contacts", "read")
    async def get_primary_contact(
        self,
        ctx: ServiceContext,
        lead_id: UUID
    ) -> Optional[dict]:
        """Get primary contact for a lead."""
        await self._check_lead_access(ctx, lead_id, "read")
        
        contact = await self.repo.get_primary_for_lead(lead_id)
        return contact
    
    @require_permission("contacts", "read")
    async def get_decision_makers(
        self,
        ctx: ServiceContext,
        lead_id: UUID
    ) -> list[dict]:
        """Get all decision maker contacts for a lead."""
        await self._check_lead_access(ctx, lead_id, "read")
        
        contacts = await self.repo.get_decision_makers(lead_id)
        return contacts
    
    # ============= Create Operations =============
    
    @audit_log(AuditAction.CREATE, "contacts")
    @require_permission("contacts", "create")
    async def create_contact(
        self,
        ctx: ServiceContext,
        data: dict
    ) -> dict:
        """Create a new contact."""
        lead_id = data.get("lead_id")
        
        # Verify lead exists and user has access
        await self._check_lead_access(ctx, lead_id, "update")
        
        # Check for duplicate email on this lead
        if "email" in data:
            existing = await self.repo.get_by_lead_and_email(
                lead_id, data["email"]
            )
            if existing:
                raise ConflictError(
                    message=f"Contact with email {data['email']} already exists for this lead",
                    conflicting_field="email"
                )
        
        # If setting as primary, unset other primaries
        if data.get("is_primary"):
            await self._unset_primary_contacts(lead_id)
        
        # Create contact
        contact_data = {**data}
        contact_data["lead_id"] = str(lead_id)
        
        contact = await self.repo.create(contact_data)
        
        # Publish event
        await self._publish_event("contact.created", {
            "contact_id": contact["id"],
            "lead_id": str(lead_id),
            "created_by": str(ctx.user_id)
        })
        
        return contact
    
    # ============= Update Operations =============
    
    @audit_log(AuditAction.UPDATE, "contacts")
    @require_permission("contacts", "update")
    async def update_contact(
        self,
        ctx: ServiceContext,
        contact_id: UUID,
        data: dict
    ) -> dict:
        """Update contact fields."""
        contact = await self._get_contact_with_access(ctx, contact_id, "update")
        
        # Check email uniqueness if changing
        if "email" in data and data["email"] != contact.get("email"):
            existing = await self.repo.get_by_lead_and_email(
                contact["lead_id"], data["email"]
            )
            if existing and existing["id"] != str(contact_id):
                raise ConflictError(
                    message=f"Email {data['email']} already exists for this lead",
                    conflicting_field="email"
                )
        
        # Handle primary flag change
        if data.get("is_primary") is True and not contact.get("is_primary"):
            await self._unset_primary_contacts(contact["lead_id"])
        
        # Update only provided fields
        if not data:
            return contact
        
        updated = await self.repo.update(contact_id, data)
        
        # Publish event
        await self._publish_event("contact.updated", {
            "contact_id": str(contact_id),
            "updated_by": str(ctx.user_id),
            "fields": list(data.keys())
        })
        
        return updated
    
    @audit_log(AuditAction.UPDATE, "contacts")
    @require_permission("contacts", "update")
    async def set_primary(
        self,
        ctx: ServiceContext,
        contact_id: UUID
    ) -> dict:
        """Set contact as primary for its lead."""
        contact = await self._get_contact_with_access(ctx, contact_id, "update")
        
        # Unset other primaries
        await self._unset_primary_contacts(contact["lead_id"])
        
        # Set this as primary
        updated = await self.repo.update(contact_id, {"is_primary": True})
        
        return updated
    
    # ============= Delete Operations =============
    
    @audit_log(AuditAction.DELETE, "contacts")
    @require_permission("contacts", "delete")
    async def delete_contact(
        self,
        ctx: ServiceContext,
        contact_id: UUID
    ) -> bool:
        """Delete contact."""
        contact = await self._get_contact_with_access(ctx, contact_id, "delete")
        
        # Warn if deleting primary contact
        if contact.get("is_primary"):
            logger.warning(
                f"Deleting primary contact {contact_id} for lead {contact['lead_id']}"
            )
        
        await self.repo.delete(contact_id)
        
        # Publish event
        await self._publish_event("contact.deleted", {
            "contact_id": str(contact_id),
            "lead_id": contact["lead_id"],
            "deleted_by": str(ctx.user_id)
        })
        
        return True
    
    # ============= Merge Operations =============
    
    @audit_log(AuditAction.UPDATE, "contacts")
    @require_permission("contacts", "merge")
    async def merge_contacts(
        self,
        ctx: ServiceContext,
        source_id: UUID,
        target_id: UUID
    ) -> dict:
        """
        Merge source contact into target contact.
        
        Target contact is preserved with merged data.
        Source contact is soft-deleted.
        """
        source = await self._get_contact_with_access(ctx, source_id, "update")
        target = await self._get_contact_with_access(ctx, target_id, "update")
        
        # Verify same lead
        if source["lead_id"] != target["lead_id"]:
            raise BusinessRuleViolation(
                message="Can only merge contacts from the same lead",
                rule="same_lead_merge"
            )
        
        if source_id == target_id:
            raise ValidationError("Cannot merge contact with itself")
        
        # Merge strategy: target wins for existing fields, source fills gaps
        merged_data = {}
        merge_fields = ["phone", "title", "linkedin_url"]
        
        for field in merge_fields:
            if not target.get(field) and source.get(field):
                merged_data[field] = source[field]
        
        # Merge notes
        source_notes = source.get("notes") or ""
        target_notes = target.get("notes") or ""
        if source_notes:
            merged_data["notes"] = f"{target_notes}\n\n--- Merged from {source['email']} ---\n{source_notes}".strip()
        
        # Preserve primary status if source was primary
        if source.get("is_primary") and not target.get("is_primary"):
            merged_data["is_primary"] = True
        
        # Update target if there's data to merge
        if merged_data:
            updated = await self.repo.update(target_id, merged_data)
        else:
            updated = target
        
        # Soft delete source
        await self.repo.delete(source_id)
        
        # Publish event
        await self._publish_event("contact.merged", {
            "source_id": str(source_id),
            "target_id": str(target_id),
            "merged_by": str(ctx.user_id)
        })
        
        return updated
    
    # ============= Helper Methods =============
    
    async def _check_lead_access(
        self,
        ctx: ServiceContext,
        lead_id: UUID,
        action: str
    ) -> None:
        """Verify user can access the lead."""
        if not self._lead_repo:
            return  # Skip check if no lead repo
        
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
    
    async def _get_contact_with_access(
        self,
        ctx: ServiceContext,
        contact_id: UUID,
        action: str
    ) -> dict:
        """Get contact and verify access via lead."""
        contact = await self.repo.get_by_id(contact_id)
        if not contact:
            raise NotFoundError(
                message=f"Contact {contact_id} not found",
                resource_type="contact",
                resource_id=str(contact_id)
            )
        
        await self._check_lead_access(ctx, contact["lead_id"], action)
        return contact
    
    async def _unset_primary_contacts(self, lead_id: UUID) -> None:
        """Remove primary flag from all contacts of a lead."""
        contacts = await self.repo.get_by_lead(lead_id, page=1, page_size=100)
        for contact in contacts.get("items", []):
            if contact.get("is_primary"):
                await self.repo.update(contact["id"], {"is_primary": False})
    
    async def _publish_event(self, event_type: str, data: dict) -> None:
        """Publish domain event if publisher is configured."""
        if self._event_publisher:
            try:
                await self._event_publisher.publish(event_type, data)
            except Exception as e:
                logger.warning(f"Failed to publish event {event_type}: {e}")


__all__ = ["ContactService"]

