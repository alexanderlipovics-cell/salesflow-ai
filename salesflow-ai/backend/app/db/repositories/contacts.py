"""
SalesFlow AI - Contact Repository
Repository for Contact entity operations.
"""

from datetime import datetime, timezone
from enum import Enum
from typing import Any, Dict, List, Optional
from uuid import UUID
import logging

from pydantic import BaseModel, EmailStr, Field
from supabase import Client

from app.db.repositories.base import (
    BaseRepository,
    QueryFilter,
    FilterOperator,
    SortOrder,
    PaginationParams,
    PaginatedResult,
    log_query,
)
from app.core.exceptions import (
    ValidationError,
    ConflictError,
    NotFoundError,
)


logger = logging.getLogger(__name__)


# ─────────────────────────────────────────────────────────────────────────────
# Models
# ─────────────────────────────────────────────────────────────────────────────

class ContactType(str, Enum):
    """Type of contact."""
    PRIMARY = "primary"
    SECONDARY = "secondary"
    BILLING = "billing"
    TECHNICAL = "technical"
    DECISION_MAKER = "decision_maker"


class Contact(BaseModel):
    """Contact entity model."""
    id: UUID
    
    # Associated Lead
    lead_id: UUID
    
    # Contact Info
    email: EmailStr
    first_name: str
    last_name: str
    phone: Optional[str] = None
    mobile: Optional[str] = None
    
    # Role
    job_title: Optional[str] = None
    department: Optional[str] = None
    contact_type: ContactType = ContactType.PRIMARY
    is_primary: bool = False
    
    # Preferences
    preferred_contact_method: Optional[str] = None
    timezone: Optional[str] = None
    language: str = "en"
    
    # Social
    linkedin_url: Optional[str] = None
    twitter_handle: Optional[str] = None
    
    # Notes
    notes: Optional[str] = None
    
    # Timestamps
    created_at: datetime
    updated_at: datetime
    deleted_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True
    
    @property
    def full_name(self) -> str:
        """Get full name of contact."""
        return f"{self.first_name} {self.last_name}"


class ContactCreate(BaseModel):
    """Schema for creating a contact."""
    lead_id: UUID
    email: EmailStr
    first_name: str
    last_name: str
    phone: Optional[str] = None
    mobile: Optional[str] = None
    job_title: Optional[str] = None
    department: Optional[str] = None
    contact_type: ContactType = ContactType.PRIMARY
    is_primary: bool = False
    preferred_contact_method: Optional[str] = None
    timezone: Optional[str] = None
    language: str = "en"
    linkedin_url: Optional[str] = None
    twitter_handle: Optional[str] = None
    notes: Optional[str] = None


class ContactUpdate(BaseModel):
    """Schema for updating a contact."""
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    phone: Optional[str] = None
    mobile: Optional[str] = None
    job_title: Optional[str] = None
    department: Optional[str] = None
    contact_type: Optional[ContactType] = None
    is_primary: Optional[bool] = None
    preferred_contact_method: Optional[str] = None
    timezone: Optional[str] = None
    language: Optional[str] = None
    linkedin_url: Optional[str] = None
    twitter_handle: Optional[str] = None
    notes: Optional[str] = None


# ─────────────────────────────────────────────────────────────────────────────
# Contact Repository
# ─────────────────────────────────────────────────────────────────────────────

class ContactRepository(BaseRepository[Contact]):
    """
    Repository for Contact entity.
    
    Features:
        - Association with leads
        - Primary contact management
        - Email uniqueness per lead
    """
    
    table_name = "contacts"
    model_class = Contact
    soft_delete = True
    
    # ─────────────────────────────────────────────────────────────────────────
    # CRUD Overrides
    # ─────────────────────────────────────────────────────────────────────────
    
    @log_query("create")
    async def create(self, data: Dict[str, Any] | ContactCreate) -> Contact:
        """
        Create a new contact with email uniqueness check per lead.
        
        Args:
            data: Contact creation data.
            
        Returns:
            Created contact.
            
        Raises:
            ConflictError: If email already exists for this lead.
            ValidationError: If data is invalid.
        """
        if isinstance(data, ContactCreate):
            data = data.model_dump()
        
        lead_id = data.get("lead_id")
        email = data.get("email")
        
        # Check email uniqueness within lead
        existing = await self.get_by_lead_and_email(lead_id, email)
        if existing:
            raise ConflictError(
                message=f"Contact with email '{email}' already exists for this lead",
                field="email"
            )
        
        # If this is marked as primary, unset other primary contacts
        if data.get("is_primary"):
            await self._unset_primary_for_lead(lead_id)
        
        return await super().create(data)
    
    async def update(
        self,
        id: UUID | str,
        data: Dict[str, Any] | ContactUpdate,
        partial: bool = True
    ) -> Contact:
        """
        Update a contact with primary contact handling.
        
        Args:
            id: Contact ID.
            data: Update data.
            partial: If True, only update provided fields.
            
        Returns:
            Updated contact.
        """
        if isinstance(data, ContactUpdate):
            data = data.model_dump(exclude_unset=True)
        
        # If setting as primary, unset other primaries
        if data.get("is_primary"):
            contact = await self.get_by_id_or_fail(id)
            await self._unset_primary_for_lead(contact.lead_id)
        
        return await super().update(id, data, partial)
    
    async def _unset_primary_for_lead(self, lead_id: UUID | str) -> None:
        """Unset is_primary for all contacts of a lead."""
        try:
            self.db.table(self.table_name).update({
                "is_primary": False,
                "updated_at": datetime.now(timezone.utc).isoformat()
            }).eq("lead_id", str(lead_id)).eq("is_primary", True).execute()
        except Exception as e:
            logger.warning(f"Failed to unset primary contacts: {e}")
    
    # ─────────────────────────────────────────────────────────────────────────
    # Contact-Specific Queries
    # ─────────────────────────────────────────────────────────────────────────
    
    @log_query("get_by_lead")
    async def get_by_lead(
        self,
        lead_id: UUID | str,
        include_deleted: bool = False
    ) -> List[Contact]:
        """
        Get all contacts for a lead.
        
        Args:
            lead_id: Lead ID.
            include_deleted: Include soft-deleted contacts.
            
        Returns:
            List of contacts.
        """
        return await self.get_many_by_field("lead_id", str(lead_id), include_deleted)
    
    @log_query("get_primary_for_lead")
    async def get_primary_for_lead(
        self,
        lead_id: UUID | str
    ) -> Optional[Contact]:
        """
        Get primary contact for a lead.
        
        Args:
            lead_id: Lead ID.
            
        Returns:
            Primary contact if exists.
        """
        filters = [
            QueryFilter(field="lead_id", value=str(lead_id)),
            QueryFilter(field="is_primary", value=True),
        ]
        
        results = await self.get_all(filters=filters)
        contacts = results if isinstance(results, list) else results.items
        
        return contacts[0] if contacts else None
    
    @log_query("get_by_lead_and_email")
    async def get_by_lead_and_email(
        self,
        lead_id: UUID | str,
        email: str
    ) -> Optional[Contact]:
        """Get contact by lead ID and email."""
        filters = [
            QueryFilter(field="lead_id", value=str(lead_id)),
            QueryFilter(field="email", value=email.lower()),
        ]
        
        results = await self.get_all(filters=filters)
        contacts = results if isinstance(results, list) else results.items
        
        return contacts[0] if contacts else None
    
    @log_query("get_by_email")
    async def get_by_email(self, email: str) -> List[Contact]:
        """Get all contacts with a specific email (across all leads)."""
        return await self.get_many_by_field("email", email.lower())
    
    @log_query("get_decision_makers")
    async def get_decision_makers(
        self,
        lead_id: Optional[UUID | str] = None
    ) -> List[Contact]:
        """Get all decision maker contacts."""
        filters = [
            QueryFilter(field="contact_type", value=ContactType.DECISION_MAKER.value)
        ]
        
        if lead_id:
            filters.append(QueryFilter(field="lead_id", value=str(lead_id)))
        
        results = await self.get_all(filters=filters)
        return results if isinstance(results, list) else results.items
    
    # ─────────────────────────────────────────────────────────────────────────
    # Business Operations
    # ─────────────────────────────────────────────────────────────────────────
    
    @log_query("set_primary")
    async def set_primary(
        self,
        contact_id: UUID | str
    ) -> Contact:
        """
        Set a contact as the primary contact for its lead.
        
        Args:
            contact_id: Contact ID.
            
        Returns:
            Updated contact.
        """
        contact = await self.get_by_id_or_fail(contact_id)
        
        # Unset current primary
        await self._unset_primary_for_lead(contact.lead_id)
        
        # Set new primary
        return await self.update(contact_id, {"is_primary": True})
    
    @log_query("merge_contacts")
    async def merge_contacts(
        self,
        target_id: UUID | str,
        source_id: UUID | str
    ) -> Contact:
        """
        Merge source contact into target contact.
        Source contact will be soft-deleted.
        
        Args:
            target_id: Contact to keep.
            source_id: Contact to merge and delete.
            
        Returns:
            Merged target contact.
        """
        target = await self.get_by_id_or_fail(target_id)
        source = await self.get_by_id_or_fail(source_id)
        
        # Merge data (fill in blanks from source)
        update_data: Dict[str, Any] = {}
        
        if not target.phone and source.phone:
            update_data["phone"] = source.phone
        if not target.mobile and source.mobile:
            update_data["mobile"] = source.mobile
        if not target.job_title and source.job_title:
            update_data["job_title"] = source.job_title
        if not target.linkedin_url and source.linkedin_url:
            update_data["linkedin_url"] = source.linkedin_url
        
        # Merge notes
        if source.notes:
            existing_notes = target.notes or ""
            update_data["notes"] = f"{existing_notes}\n\n[Merged from {source.email}]\n{source.notes}".strip()
        
        # Update target if there's data to merge
        if update_data:
            target = await self.update(target_id, update_data)
        
        # Soft delete source
        await self.delete(source_id)
        
        return target
    
    @log_query("count_by_lead")
    async def count_by_lead(self, lead_id: UUID | str) -> int:
        """Count contacts for a lead."""
        filters = [QueryFilter(field="lead_id", value=str(lead_id))]
        return await self.count(filters=filters)


__all__ = [
    "ContactRepository",
    "Contact",
    "ContactCreate",
    "ContactUpdate",
    "ContactType",
]

