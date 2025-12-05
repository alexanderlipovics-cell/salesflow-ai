"""
SalesFlow AI - Lead Repository
Repository for Lead entity with business-specific operations.
"""

from datetime import datetime, timezone, timedelta
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
    InvalidStateError,
)


logger = logging.getLogger(__name__)


# ─────────────────────────────────────────────────────────────────────────────
# Enums and Models
# ─────────────────────────────────────────────────────────────────────────────

class LeadStatus(str, Enum):
    """Lead lifecycle status."""
    NEW = "new"
    CONTACTED = "contacted"
    QUALIFIED = "qualified"
    PROPOSAL = "proposal"
    NEGOTIATION = "negotiation"
    WON = "won"
    LOST = "lost"
    ARCHIVED = "archived"


class LeadSource(str, Enum):
    """Lead acquisition source."""
    WEBSITE = "website"
    REFERRAL = "referral"
    LINKEDIN = "linkedin"
    COLD_OUTREACH = "cold_outreach"
    TRADE_SHOW = "trade_show"
    ADVERTISING = "advertising"
    OTHER = "other"


class LeadPriority(str, Enum):
    """Lead priority level."""
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    URGENT = "urgent"


class Lead(BaseModel):
    """Lead entity model."""
    id: UUID
    
    # Contact Info
    email: EmailStr
    first_name: str
    last_name: str
    phone: Optional[str] = None
    company: Optional[str] = None
    job_title: Optional[str] = None
    
    # Lead Data
    status: LeadStatus = LeadStatus.NEW
    source: LeadSource = LeadSource.OTHER
    priority: LeadPriority = LeadPriority.MEDIUM
    score: int = Field(default=0, ge=0, le=100)
    
    # Assignment
    assigned_to: Optional[UUID] = None
    
    # Tracking
    last_contacted_at: Optional[datetime] = None
    next_follow_up: Optional[datetime] = None
    
    # Value
    estimated_value: Optional[float] = None
    currency: str = "USD"
    
    # Notes
    notes: Optional[str] = None
    tags: List[str] = Field(default_factory=list)
    
    # Metadata
    custom_fields: Dict[str, Any] = Field(default_factory=dict)
    
    # Timestamps
    created_at: datetime
    updated_at: datetime
    deleted_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True


class LeadCreate(BaseModel):
    """Schema for creating a lead."""
    email: EmailStr
    first_name: str
    last_name: str
    phone: Optional[str] = None
    company: Optional[str] = None
    job_title: Optional[str] = None
    source: LeadSource = LeadSource.OTHER
    priority: LeadPriority = LeadPriority.MEDIUM
    assigned_to: Optional[UUID] = None
    estimated_value: Optional[float] = None
    currency: str = "USD"
    notes: Optional[str] = None
    tags: List[str] = Field(default_factory=list)
    custom_fields: Dict[str, Any] = Field(default_factory=dict)


class LeadUpdate(BaseModel):
    """Schema for updating a lead."""
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    phone: Optional[str] = None
    company: Optional[str] = None
    job_title: Optional[str] = None
    status: Optional[LeadStatus] = None
    source: Optional[LeadSource] = None
    priority: Optional[LeadPriority] = None
    score: Optional[int] = Field(default=None, ge=0, le=100)
    assigned_to: Optional[UUID] = None
    next_follow_up: Optional[datetime] = None
    estimated_value: Optional[float] = None
    currency: Optional[str] = None
    notes: Optional[str] = None
    tags: Optional[List[str]] = None
    custom_fields: Optional[Dict[str, Any]] = None


class LeadSearchParams(BaseModel):
    """Parameters for searching leads."""
    query: Optional[str] = None  # Search in name, email, company
    status: Optional[List[LeadStatus]] = None
    source: Optional[List[LeadSource]] = None
    priority: Optional[List[LeadPriority]] = None
    assigned_to: Optional[UUID] = None
    min_score: Optional[int] = None
    max_score: Optional[int] = None
    min_value: Optional[float] = None
    max_value: Optional[float] = None
    tags: Optional[List[str]] = None
    created_after: Optional[datetime] = None
    created_before: Optional[datetime] = None
    needs_follow_up: Optional[bool] = None


# ─────────────────────────────────────────────────────────────────────────────
# Lead Repository
# ─────────────────────────────────────────────────────────────────────────────

class LeadRepository(BaseRepository[Lead]):
    """
    Repository for Lead entity with business-specific operations.
    
    Extends BaseRepository with:
        - Email uniqueness validation
        - Status transition validation
        - Search and filtering
        - Statistics and reporting
        - Assignment operations
    """
    
    table_name = "leads"
    model_class = Lead
    soft_delete = True
    
    # Valid status transitions
    STATUS_TRANSITIONS = {
        LeadStatus.NEW: [LeadStatus.CONTACTED, LeadStatus.QUALIFIED, LeadStatus.ARCHIVED],
        LeadStatus.CONTACTED: [LeadStatus.QUALIFIED, LeadStatus.LOST, LeadStatus.ARCHIVED],
        LeadStatus.QUALIFIED: [LeadStatus.PROPOSAL, LeadStatus.LOST, LeadStatus.ARCHIVED],
        LeadStatus.PROPOSAL: [LeadStatus.NEGOTIATION, LeadStatus.LOST, LeadStatus.ARCHIVED],
        LeadStatus.NEGOTIATION: [LeadStatus.WON, LeadStatus.LOST, LeadStatus.ARCHIVED],
        LeadStatus.WON: [LeadStatus.ARCHIVED],
        LeadStatus.LOST: [LeadStatus.CONTACTED, LeadStatus.ARCHIVED],  # Can re-engage
        LeadStatus.ARCHIVED: [LeadStatus.NEW],  # Can unarchive
    }
    
    # ─────────────────────────────────────────────────────────────────────────
    # CRUD Overrides
    # ─────────────────────────────────────────────────────────────────────────
    
    @log_query("create")
    async def create(self, data: Dict[str, Any] | LeadCreate) -> Lead:
        """
        Create a new lead with email uniqueness check.
        
        Args:
            data: Lead creation data.
            
        Returns:
            Created lead.
            
        Raises:
            ConflictError: If email already exists.
            ValidationError: If data is invalid.
        """
        if isinstance(data, LeadCreate):
            data = data.model_dump()
        
        # Check email uniqueness
        existing = await self.get_by_email(data.get("email"))
        if existing:
            raise ConflictError(
                message=f"Lead with email '{data.get('email')}' already exists",
                field="email",
                existing_value=data.get("email")
            )
        
        # Set default status
        if "status" not in data:
            data["status"] = LeadStatus.NEW.value
        
        return await super().create(data)
    
    async def update(
        self,
        id: UUID | str,
        data: Dict[str, Any] | LeadUpdate,
        partial: bool = True
    ) -> Lead:
        """
        Update a lead with status transition validation.
        
        Args:
            id: Lead ID.
            data: Update data.
            partial: If True, only update provided fields.
            
        Returns:
            Updated lead.
            
        Raises:
            NotFoundError: If lead doesn't exist.
            InvalidStateError: If status transition is invalid.
        """
        if isinstance(data, LeadUpdate):
            data = data.model_dump(exclude_unset=True)
        
        # Validate status transition if status is being changed
        if "status" in data:
            current = await self.get_by_id_or_fail(id)
            new_status = LeadStatus(data["status"])
            
            if not self._is_valid_status_transition(current.status, new_status):
                raise InvalidStateError(
                    message=f"Cannot transition from '{current.status}' to '{new_status}'",
                    current_state=current.status.value,
                    required_state=", ".join(s.value for s in self.STATUS_TRANSITIONS.get(current.status, []))
                )
        
        return await super().update(id, data, partial)
    
    def _is_valid_status_transition(
        self,
        current: LeadStatus,
        new: LeadStatus
    ) -> bool:
        """Check if status transition is allowed."""
        if current == new:
            return True
        
        allowed = self.STATUS_TRANSITIONS.get(current, [])
        return new in allowed
    
    # ─────────────────────────────────────────────────────────────────────────
    # Lead-Specific Queries
    # ─────────────────────────────────────────────────────────────────────────
    
    @log_query("get_by_email")
    async def get_by_email(self, email: str) -> Optional[Lead]:
        """
        Get lead by email address.
        
        Args:
            email: Email address to search.
            
        Returns:
            Lead if found, None otherwise.
        """
        return await self.get_by_field("email", email.lower())
    
    @log_query("search")
    async def search(
        self,
        params: LeadSearchParams,
        pagination: Optional[PaginationParams] = None,
        sort: Optional[List[SortOrder]] = None
    ) -> List[Lead] | PaginatedResult[Lead]:
        """
        Search leads with multiple filters.
        
        Args:
            params: Search parameters.
            pagination: Optional pagination.
            sort: Optional sorting.
            
        Returns:
            List of matching leads or paginated result.
        """
        filters: List[QueryFilter] = []
        
        # Status filter
        if params.status:
            filters.append(QueryFilter(
                field="status",
                operator=FilterOperator.IN,
                value=[s.value for s in params.status]
            ))
        
        # Source filter
        if params.source:
            filters.append(QueryFilter(
                field="source",
                operator=FilterOperator.IN,
                value=[s.value for s in params.source]
            ))
        
        # Priority filter
        if params.priority:
            filters.append(QueryFilter(
                field="priority",
                operator=FilterOperator.IN,
                value=[p.value for p in params.priority]
            ))
        
        # Assignment filter
        if params.assigned_to:
            filters.append(QueryFilter(
                field="assigned_to",
                operator=FilterOperator.EQ,
                value=str(params.assigned_to)
            ))
        
        # Score range
        if params.min_score is not None:
            filters.append(QueryFilter(
                field="score",
                operator=FilterOperator.GTE,
                value=params.min_score
            ))
        if params.max_score is not None:
            filters.append(QueryFilter(
                field="score",
                operator=FilterOperator.LTE,
                value=params.max_score
            ))
        
        # Value range
        if params.min_value is not None:
            filters.append(QueryFilter(
                field="estimated_value",
                operator=FilterOperator.GTE,
                value=params.min_value
            ))
        if params.max_value is not None:
            filters.append(QueryFilter(
                field="estimated_value",
                operator=FilterOperator.LTE,
                value=params.max_value
            ))
        
        # Date range
        if params.created_after:
            filters.append(QueryFilter(
                field="created_at",
                operator=FilterOperator.GTE,
                value=params.created_after.isoformat()
            ))
        if params.created_before:
            filters.append(QueryFilter(
                field="created_at",
                operator=FilterOperator.LTE,
                value=params.created_before.isoformat()
            ))
        
        # Follow-up filter
        if params.needs_follow_up:
            filters.append(QueryFilter(
                field="next_follow_up",
                operator=FilterOperator.LTE,
                value=datetime.now(timezone.utc).isoformat()
            ))
        
        # Default sort by priority then score
        if not sort:
            sort = [
                SortOrder(field="priority", ascending=False),
                SortOrder(field="score", ascending=False),
            ]
        
        return await self.get_all(
            filters=filters,
            sort=sort,
            pagination=pagination
        )
    
    @log_query("get_by_assigned_user")
    async def get_by_assigned_user(
        self,
        user_id: UUID,
        status: Optional[List[LeadStatus]] = None,
        pagination: Optional[PaginationParams] = None
    ) -> List[Lead] | PaginatedResult[Lead]:
        """Get all leads assigned to a specific user."""
        filters = [
            QueryFilter(field="assigned_to", value=str(user_id))
        ]
        
        if status:
            filters.append(QueryFilter(
                field="status",
                operator=FilterOperator.IN,
                value=[s.value for s in status]
            ))
        
        return await self.get_all(filters=filters, pagination=pagination)
    
    @log_query("get_unassigned")
    async def get_unassigned(
        self,
        pagination: Optional[PaginationParams] = None
    ) -> List[Lead] | PaginatedResult[Lead]:
        """Get all unassigned leads."""
        filters = [
            QueryFilter(field="assigned_to", operator=FilterOperator.IS, value="null")
        ]
        
        return await self.get_all(filters=filters, pagination=pagination)
    
    @log_query("get_needs_follow_up")
    async def get_needs_follow_up(
        self,
        user_id: Optional[UUID] = None,
        days_overdue: int = 0
    ) -> List[Lead]:
        """Get leads that need follow-up."""
        threshold = datetime.now(timezone.utc) - timedelta(days=days_overdue)
        
        filters = [
            QueryFilter(
                field="next_follow_up",
                operator=FilterOperator.LTE,
                value=threshold.isoformat()
            ),
            QueryFilter(
                field="status",
                operator=FilterOperator.IN,
                value=[
                    LeadStatus.NEW.value,
                    LeadStatus.CONTACTED.value,
                    LeadStatus.QUALIFIED.value,
                    LeadStatus.PROPOSAL.value,
                    LeadStatus.NEGOTIATION.value,
                ]
            )
        ]
        
        if user_id:
            filters.append(QueryFilter(field="assigned_to", value=str(user_id)))
        
        return await self.get_all(
            filters=filters,
            sort=[SortOrder(field="next_follow_up", ascending=True)]
        )
    
    # ─────────────────────────────────────────────────────────────────────────
    # Business Operations
    # ─────────────────────────────────────────────────────────────────────────
    
    @log_query("assign")
    async def assign(
        self,
        lead_id: UUID | str,
        user_id: UUID | str
    ) -> Lead:
        """
        Assign a lead to a user.
        
        Args:
            lead_id: Lead to assign.
            user_id: User to assign to.
            
        Returns:
            Updated lead.
        """
        return await self.update(lead_id, {
            "assigned_to": str(user_id)
        })
    
    @log_query("unassign")
    async def unassign(self, lead_id: UUID | str) -> Lead:
        """Remove assignment from a lead."""
        # Direct update to set null
        result = self.db.table(self.table_name).update({
            "assigned_to": None,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }).eq("id", str(lead_id)).execute()
        
        if result.data:
            return self._to_model(result.data[0])
        raise Exception("Update failed")
    
    @log_query("mark_contacted")
    async def mark_contacted(
        self,
        lead_id: UUID | str,
        next_follow_up: Optional[datetime] = None
    ) -> Lead:
        """
        Mark a lead as contacted and optionally set next follow-up.
        
        Args:
            lead_id: Lead ID.
            next_follow_up: Optional next follow-up datetime.
            
        Returns:
            Updated lead.
        """
        now = datetime.now(timezone.utc)
        
        update_data = {
            "last_contacted_at": now.isoformat(),
            "status": LeadStatus.CONTACTED.value
        }
        
        if next_follow_up:
            update_data["next_follow_up"] = next_follow_up.isoformat()
        
        return await self.update(lead_id, update_data)
    
    @log_query("update_score")
    async def update_score(self, lead_id: UUID | str, score: int) -> Lead:
        """
        Update lead score with validation.
        
        Args:
            lead_id: Lead ID.
            score: New score (0-100).
            
        Returns:
            Updated lead.
            
        Raises:
            ValidationError: If score is out of range.
        """
        if not 0 <= score <= 100:
            raise ValidationError(
                message="Score must be between 0 and 100",
                field="score"
            )
        
        return await self.update(lead_id, {"score": score})
    
    @log_query("add_tags")
    async def add_tags(
        self,
        lead_id: UUID | str,
        tags: List[str]
    ) -> Lead:
        """Add tags to a lead (without duplicates)."""
        lead = await self.get_by_id_or_fail(lead_id)
        
        existing_tags = set(lead.tags or [])
        new_tags = list(existing_tags | set(tags))
        
        return await self.update(lead_id, {"tags": new_tags})
    
    @log_query("remove_tags")
    async def remove_tags(
        self,
        lead_id: UUID | str,
        tags: List[str]
    ) -> Lead:
        """Remove tags from a lead."""
        lead = await self.get_by_id_or_fail(lead_id)
        
        remaining_tags = [t for t in (lead.tags or []) if t not in tags]
        
        return await self.update(lead_id, {"tags": remaining_tags})
    
    @log_query("archive")
    async def archive(self, lead_id: UUID | str) -> Lead:
        """Archive a lead."""
        return await self.update(lead_id, {"status": LeadStatus.ARCHIVED.value})
    
    @log_query("convert_to_won")
    async def convert_to_won(
        self,
        lead_id: UUID | str,
        final_value: Optional[float] = None
    ) -> Lead:
        """
        Mark lead as won/converted.
        
        Args:
            lead_id: Lead ID.
            final_value: Final deal value.
            
        Returns:
            Updated lead.
        """
        update_data: Dict[str, Any] = {"status": LeadStatus.WON.value}
        
        if final_value is not None:
            update_data["estimated_value"] = final_value
        
        return await self.update(lead_id, update_data)
    
    @log_query("mark_lost")
    async def mark_lost(
        self,
        lead_id: UUID | str,
        reason: Optional[str] = None
    ) -> Lead:
        """Mark lead as lost with optional reason."""
        update_data: Dict[str, Any] = {"status": LeadStatus.LOST.value}
        
        if reason:
            # Get current lead to preserve existing notes
            lead = await self.get_by_id_or_fail(lead_id)
            existing_notes = lead.notes or ""
            update_data["notes"] = f"{existing_notes}\n\n[LOST] {reason}".strip()
        
        return await self.update(lead_id, update_data)
    
    # ─────────────────────────────────────────────────────────────────────────
    # Statistics & Reporting
    # ─────────────────────────────────────────────────────────────────────────
    
    @log_query("get_statistics")
    async def get_statistics(
        self,
        user_id: Optional[UUID] = None
    ) -> Dict[str, Any]:
        """
        Get lead statistics (counts by status, source, etc.).
        
        Args:
            user_id: Optional filter by assigned user.
            
        Returns:
            Dictionary with statistics.
        """
        filters = []
        if user_id:
            filters.append(QueryFilter(field="assigned_to", value=str(user_id)))
        
        all_leads = await self.get_all(filters=filters)
        leads = all_leads if isinstance(all_leads, list) else all_leads.items
        
        # Count by status
        status_counts = {}
        for status in LeadStatus:
            status_counts[status.value] = sum(1 for l in leads if l.status == status)
        
        # Count by source
        source_counts = {}
        for source in LeadSource:
            source_counts[source.value] = sum(1 for l in leads if l.source == source)
        
        # Count by priority
        priority_counts = {}
        for priority in LeadPriority:
            priority_counts[priority.value] = sum(1 for l in leads if l.priority == priority)
        
        # Value statistics
        leads_with_value = [l for l in leads if l.estimated_value is not None]
        total_value = sum(l.estimated_value for l in leads_with_value)
        avg_value = total_value / len(leads_with_value) if leads_with_value else 0
        
        return {
            "total": len(leads),
            "by_status": status_counts,
            "by_source": source_counts,
            "by_priority": priority_counts,
            "pipeline_value": {
                "total": total_value,
                "average": round(avg_value, 2),
                "leads_with_value": len(leads_with_value),
            },
            "conversion_rate": round(
                status_counts.get("won", 0) / len(leads) * 100 if leads else 0, 2
            ),
        }
    
    @log_query("get_pipeline_value")
    async def get_pipeline_value(
        self,
        statuses: Optional[List[LeadStatus]] = None
    ) -> float:
        """Get total estimated value of leads in pipeline."""
        if statuses is None:
            statuses = [
                LeadStatus.QUALIFIED,
                LeadStatus.PROPOSAL,
                LeadStatus.NEGOTIATION,
            ]
        
        filters = [
            QueryFilter(
                field="status",
                operator=FilterOperator.IN,
                value=[s.value for s in statuses]
            )
        ]
        
        leads = await self.get_all(filters=filters)
        if isinstance(leads, PaginatedResult):
            leads = leads.items
        
        return sum(l.estimated_value or 0 for l in leads)


__all__ = [
    "LeadRepository",
    "Lead",
    "LeadCreate",
    "LeadUpdate",
    "LeadSearchParams",
    "LeadStatus",
    "LeadSource",
    "LeadPriority",
]

