"""
SalesFlow AI - Message Event Repository
Repository for tracking message events and communications.
"""

from datetime import datetime, timezone, timedelta
from enum import Enum
from typing import Any, Dict, List, Optional
from uuid import UUID
import logging

from pydantic import BaseModel, Field
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
from app.core.exceptions import ValidationError


logger = logging.getLogger(__name__)


# ─────────────────────────────────────────────────────────────────────────────
# Models
# ─────────────────────────────────────────────────────────────────────────────

class MessageChannel(str, Enum):
    """Communication channel."""
    EMAIL = "email"
    SMS = "sms"
    WHATSAPP = "whatsapp"
    LINKEDIN = "linkedin"
    PHONE = "phone"
    MEETING = "meeting"
    OTHER = "other"


class MessageDirection(str, Enum):
    """Message direction."""
    OUTBOUND = "outbound"  # From us to lead
    INBOUND = "inbound"    # From lead to us


class MessageStatus(str, Enum):
    """Message delivery status."""
    PENDING = "pending"
    SENT = "sent"
    DELIVERED = "delivered"
    OPENED = "opened"
    CLICKED = "clicked"
    REPLIED = "replied"
    BOUNCED = "bounced"
    FAILED = "failed"
    SPAM = "spam"
    UNSUBSCRIBED = "unsubscribed"


class MessageEvent(BaseModel):
    """Message event entity model."""
    id: UUID
    
    # Associations
    lead_id: UUID
    contact_id: Optional[UUID] = None
    campaign_id: Optional[UUID] = None
    template_id: Optional[UUID] = None
    
    # Message Details
    channel: MessageChannel
    direction: MessageDirection
    status: MessageStatus = MessageStatus.PENDING
    
    # Content
    subject: Optional[str] = None
    body: Optional[str] = None
    body_html: Optional[str] = None
    
    # Metadata
    external_id: Optional[str] = None  # ID from external service (e.g., SendGrid)
    metadata: Dict[str, Any] = Field(default_factory=dict)
    
    # Tracking
    sent_at: Optional[datetime] = None
    delivered_at: Optional[datetime] = None
    opened_at: Optional[datetime] = None
    clicked_at: Optional[datetime] = None
    replied_at: Optional[datetime] = None
    failed_at: Optional[datetime] = None
    
    # Error handling
    error_code: Optional[str] = None
    error_message: Optional[str] = None
    retry_count: int = 0
    
    # Analytics
    open_count: int = 0
    click_count: int = 0
    
    # Sender info
    sent_by: Optional[UUID] = None  # User who sent
    
    # Timestamps
    created_at: datetime
    updated_at: datetime
    deleted_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True


class MessageEventCreate(BaseModel):
    """Schema for creating a message event."""
    lead_id: UUID
    contact_id: Optional[UUID] = None
    campaign_id: Optional[UUID] = None
    template_id: Optional[UUID] = None
    channel: MessageChannel
    direction: MessageDirection
    subject: Optional[str] = None
    body: Optional[str] = None
    body_html: Optional[str] = None
    external_id: Optional[str] = None
    metadata: Dict[str, Any] = Field(default_factory=dict)
    sent_by: Optional[UUID] = None


class MessageEventUpdate(BaseModel):
    """Schema for updating a message event."""
    status: Optional[MessageStatus] = None
    sent_at: Optional[datetime] = None
    delivered_at: Optional[datetime] = None
    opened_at: Optional[datetime] = None
    clicked_at: Optional[datetime] = None
    replied_at: Optional[datetime] = None
    error_code: Optional[str] = None
    error_message: Optional[str] = None
    external_id: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None


class MessageSearchParams(BaseModel):
    """Parameters for searching message events."""
    lead_id: Optional[UUID] = None
    contact_id: Optional[UUID] = None
    campaign_id: Optional[UUID] = None
    channel: Optional[List[MessageChannel]] = None
    direction: Optional[MessageDirection] = None
    status: Optional[List[MessageStatus]] = None
    sent_after: Optional[datetime] = None
    sent_before: Optional[datetime] = None
    sent_by: Optional[UUID] = None


# ─────────────────────────────────────────────────────────────────────────────
# Message Event Repository
# ─────────────────────────────────────────────────────────────────────────────

class MessageEventRepository(BaseRepository[MessageEvent]):
    """
    Repository for MessageEvent entity.
    
    Features:
        - Event status tracking
        - Analytics aggregation
        - Delivery tracking webhooks
        - Campaign performance metrics
    """
    
    table_name = "message_events"
    model_class = MessageEvent
    soft_delete = False  # Keep all events for analytics
    
    # Valid status transitions
    STATUS_FLOW = {
        MessageStatus.PENDING: [MessageStatus.SENT, MessageStatus.FAILED],
        MessageStatus.SENT: [
            MessageStatus.DELIVERED, MessageStatus.BOUNCED,
            MessageStatus.FAILED, MessageStatus.SPAM
        ],
        MessageStatus.DELIVERED: [
            MessageStatus.OPENED, MessageStatus.SPAM,
            MessageStatus.UNSUBSCRIBED
        ],
        MessageStatus.OPENED: [
            MessageStatus.CLICKED, MessageStatus.REPLIED,
            MessageStatus.UNSUBSCRIBED
        ],
        MessageStatus.CLICKED: [MessageStatus.REPLIED, MessageStatus.UNSUBSCRIBED],
        MessageStatus.REPLIED: [],
        MessageStatus.BOUNCED: [],
        MessageStatus.FAILED: [MessageStatus.PENDING],  # Retry
        MessageStatus.SPAM: [],
        MessageStatus.UNSUBSCRIBED: [],
    }
    
    # ─────────────────────────────────────────────────────────────────────────
    # Status Updates (Webhook handlers)
    # ─────────────────────────────────────────────────────────────────────────
    
    @log_query("update_status")
    async def update_status(
        self,
        message_id: UUID | str,
        status: MessageStatus,
        timestamp: Optional[datetime] = None
    ) -> MessageEvent:
        """
        Update message status with timestamp tracking.
        
        Args:
            message_id: Message event ID.
            status: New status.
            timestamp: When the status change occurred.
            
        Returns:
            Updated message event.
        """
        now = timestamp or datetime.now(timezone.utc)
        
        update_data: Dict[str, Any] = {"status": status.value}
        
        # Set appropriate timestamp based on status
        if status == MessageStatus.SENT:
            update_data["sent_at"] = now.isoformat()
        elif status == MessageStatus.DELIVERED:
            update_data["delivered_at"] = now.isoformat()
        elif status == MessageStatus.OPENED:
            update_data["opened_at"] = now.isoformat()
        elif status == MessageStatus.CLICKED:
            update_data["clicked_at"] = now.isoformat()
        elif status == MessageStatus.REPLIED:
            update_data["replied_at"] = now.isoformat()
        elif status in [MessageStatus.BOUNCED, MessageStatus.FAILED]:
            update_data["failed_at"] = now.isoformat()
        
        return await self.update(message_id, update_data)
    
    @log_query("record_open")
    async def record_open(
        self,
        message_id: UUID | str,
        timestamp: Optional[datetime] = None
    ) -> MessageEvent:
        """Record a message open event."""
        message = await self.get_by_id_or_fail(message_id)
        
        now = timestamp or datetime.now(timezone.utc)
        
        update_data: Dict[str, Any] = {
            "open_count": message.open_count + 1,
            "status": MessageStatus.OPENED.value
        }
        
        # Only set opened_at on first open
        if not message.opened_at:
            update_data["opened_at"] = now.isoformat()
        
        return await self.update(message_id, update_data)
    
    @log_query("record_click")
    async def record_click(
        self,
        message_id: UUID | str,
        link_url: Optional[str] = None,
        timestamp: Optional[datetime] = None
    ) -> MessageEvent:
        """Record a link click event."""
        message = await self.get_by_id_or_fail(message_id)
        
        now = timestamp or datetime.now(timezone.utc)
        
        # Update click tracking in metadata
        metadata = message.metadata.copy()
        clicks = metadata.get("clicks", [])
        clicks.append({
            "url": link_url,
            "timestamp": now.isoformat()
        })
        metadata["clicks"] = clicks
        
        update_data: Dict[str, Any] = {
            "click_count": message.click_count + 1,
            "status": MessageStatus.CLICKED.value,
            "metadata": metadata
        }
        
        if not message.clicked_at:
            update_data["clicked_at"] = now.isoformat()
        
        return await self.update(message_id, update_data)
    
    @log_query("record_reply")
    async def record_reply(
        self,
        message_id: UUID | str,
        reply_message_id: Optional[str] = None,
        timestamp: Optional[datetime] = None
    ) -> MessageEvent:
        """Record a reply to a message."""
        message = await self.get_by_id_or_fail(message_id)
        
        now = timestamp or datetime.now(timezone.utc)
        
        metadata = message.metadata.copy()
        metadata["reply_message_id"] = reply_message_id
        
        return await self.update(message_id, {
            "status": MessageStatus.REPLIED.value,
            "replied_at": now.isoformat(),
            "metadata": metadata
        })
    
    @log_query("record_failure")
    async def record_failure(
        self,
        message_id: UUID | str,
        error_code: str,
        error_message: str,
        timestamp: Optional[datetime] = None
    ) -> MessageEvent:
        """Record a delivery failure."""
        message = await self.get_by_id_or_fail(message_id)
        
        now = timestamp or datetime.now(timezone.utc)
        
        return await self.update(message_id, {
            "status": MessageStatus.FAILED.value,
            "failed_at": now.isoformat(),
            "error_code": error_code,
            "error_message": error_message,
            "retry_count": message.retry_count + 1
        })
    
    @log_query("mark_for_retry")
    async def mark_for_retry(self, message_id: UUID | str) -> MessageEvent:
        """Reset message to pending for retry."""
        message = await self.get_by_id_or_fail(message_id)
        
        if message.retry_count >= 3:
            raise ValidationError("Maximum retry count exceeded")
        
        return await self.update(message_id, {
            "status": MessageStatus.PENDING.value,
            "error_code": None,
            "error_message": None
        })
    
    # ─────────────────────────────────────────────────────────────────────────
    # Query Methods
    # ─────────────────────────────────────────────────────────────────────────
    
    @log_query("search")
    async def search(
        self,
        params: MessageSearchParams,
        pagination: Optional[PaginationParams] = None,
        sort: Optional[List[SortOrder]] = None
    ) -> List[MessageEvent] | PaginatedResult[MessageEvent]:
        """Search message events with filters."""
        filters: List[QueryFilter] = []
        
        if params.lead_id:
            filters.append(QueryFilter(field="lead_id", value=str(params.lead_id)))
        
        if params.contact_id:
            filters.append(QueryFilter(field="contact_id", value=str(params.contact_id)))
        
        if params.campaign_id:
            filters.append(QueryFilter(field="campaign_id", value=str(params.campaign_id)))
        
        if params.channel:
            filters.append(QueryFilter(
                field="channel",
                operator=FilterOperator.IN,
                value=[c.value for c in params.channel]
            ))
        
        if params.direction:
            filters.append(QueryFilter(field="direction", value=params.direction.value))
        
        if params.status:
            filters.append(QueryFilter(
                field="status",
                operator=FilterOperator.IN,
                value=[s.value for s in params.status]
            ))
        
        if params.sent_after:
            filters.append(QueryFilter(
                field="sent_at",
                operator=FilterOperator.GTE,
                value=params.sent_after.isoformat()
            ))
        
        if params.sent_before:
            filters.append(QueryFilter(
                field="sent_at",
                operator=FilterOperator.LTE,
                value=params.sent_before.isoformat()
            ))
        
        if params.sent_by:
            filters.append(QueryFilter(field="sent_by", value=str(params.sent_by)))
        
        if not sort:
            sort = [SortOrder(field="created_at", ascending=False)]
        
        return await self.get_all(
            filters=filters,
            sort=sort,
            pagination=pagination
        )
    
    @log_query("get_by_lead")
    async def get_by_lead(
        self,
        lead_id: UUID | str,
        limit: int = 50
    ) -> List[MessageEvent]:
        """Get recent message events for a lead."""
        filters = [QueryFilter(field="lead_id", value=str(lead_id))]
        
        results = await self.get_all(
            filters=filters,
            sort=[SortOrder(field="created_at", ascending=False)],
            pagination=PaginationParams(page=1, page_size=limit)
        )
        
        return results.items if isinstance(results, PaginatedResult) else results
    
    @log_query("get_by_external_id")
    async def get_by_external_id(
        self,
        external_id: str
    ) -> Optional[MessageEvent]:
        """Get message event by external service ID."""
        return await self.get_by_field("external_id", external_id)
    
    @log_query("get_pending")
    async def get_pending(
        self,
        channel: Optional[MessageChannel] = None,
        limit: int = 100
    ) -> List[MessageEvent]:
        """Get pending messages for sending."""
        filters = [
            QueryFilter(field="status", value=MessageStatus.PENDING.value)
        ]
        
        if channel:
            filters.append(QueryFilter(field="channel", value=channel.value))
        
        results = await self.get_all(
            filters=filters,
            sort=[SortOrder(field="created_at", ascending=True)],
            pagination=PaginationParams(page=1, page_size=limit)
        )
        
        return results.items if isinstance(results, PaginatedResult) else results
    
    @log_query("get_failed_for_retry")
    async def get_failed_for_retry(
        self,
        max_retries: int = 3,
        failed_before: Optional[datetime] = None
    ) -> List[MessageEvent]:
        """Get failed messages eligible for retry."""
        if failed_before is None:
            failed_before = datetime.now(timezone.utc) - timedelta(minutes=5)
        
        filters = [
            QueryFilter(field="status", value=MessageStatus.FAILED.value),
            QueryFilter(
                field="retry_count",
                operator=FilterOperator.LT,
                value=max_retries
            ),
            QueryFilter(
                field="failed_at",
                operator=FilterOperator.LT,
                value=failed_before.isoformat()
            )
        ]
        
        results = await self.get_all(filters=filters)
        return results if isinstance(results, list) else results.items
    
    # ─────────────────────────────────────────────────────────────────────────
    # Analytics & Reporting
    # ─────────────────────────────────────────────────────────────────────────
    
    @log_query("get_statistics")
    async def get_statistics(
        self,
        lead_id: Optional[UUID] = None,
        campaign_id: Optional[UUID] = None,
        channel: Optional[MessageChannel] = None,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None
    ) -> Dict[str, Any]:
        """
        Get message statistics.
        
        Returns:
            Dictionary with delivery statistics.
        """
        filters = []
        
        if lead_id:
            filters.append(QueryFilter(field="lead_id", value=str(lead_id)))
        if campaign_id:
            filters.append(QueryFilter(field="campaign_id", value=str(campaign_id)))
        if channel:
            filters.append(QueryFilter(field="channel", value=channel.value))
        if start_date:
            filters.append(QueryFilter(
                field="created_at",
                operator=FilterOperator.GTE,
                value=start_date.isoformat()
            ))
        if end_date:
            filters.append(QueryFilter(
                field="created_at",
                operator=FilterOperator.LTE,
                value=end_date.isoformat()
            ))
        
        results = await self.get_all(filters=filters)
        messages = results if isinstance(results, list) else results.items
        
        # Count by status
        status_counts = {}
        for status in MessageStatus:
            status_counts[status.value] = sum(1 for m in messages if m.status == status)
        
        # Calculate rates
        total = len(messages)
        sent = status_counts.get("sent", 0) + status_counts.get("delivered", 0) + \
               status_counts.get("opened", 0) + status_counts.get("clicked", 0) + \
               status_counts.get("replied", 0)
        
        delivered = status_counts.get("delivered", 0) + status_counts.get("opened", 0) + \
                    status_counts.get("clicked", 0) + status_counts.get("replied", 0)
        
        opened = status_counts.get("opened", 0) + status_counts.get("clicked", 0) + \
                 status_counts.get("replied", 0)
        
        clicked = status_counts.get("clicked", 0) + status_counts.get("replied", 0)
        replied = status_counts.get("replied", 0)
        
        return {
            "total": total,
            "by_status": status_counts,
            "rates": {
                "delivery_rate": round(delivered / sent * 100, 2) if sent > 0 else 0,
                "open_rate": round(opened / delivered * 100, 2) if delivered > 0 else 0,
                "click_rate": round(clicked / opened * 100, 2) if opened > 0 else 0,
                "reply_rate": round(replied / sent * 100, 2) if sent > 0 else 0,
                "bounce_rate": round(
                    status_counts.get("bounced", 0) / sent * 100, 2
                ) if sent > 0 else 0,
            },
            "totals": {
                "opens": sum(m.open_count for m in messages),
                "clicks": sum(m.click_count for m in messages),
            }
        }
    
    @log_query("get_engagement_timeline")
    async def get_engagement_timeline(
        self,
        lead_id: UUID | str,
        days: int = 30
    ) -> List[Dict[str, Any]]:
        """Get engagement timeline for a lead."""
        start_date = datetime.now(timezone.utc) - timedelta(days=days)
        
        filters = [
            QueryFilter(field="lead_id", value=str(lead_id)),
            QueryFilter(
                field="created_at",
                operator=FilterOperator.GTE,
                value=start_date.isoformat()
            )
        ]
        
        results = await self.get_all(
            filters=filters,
            sort=[SortOrder(field="created_at", ascending=True)]
        )
        messages = results if isinstance(results, list) else results.items
        
        timeline = []
        for msg in messages:
            entry = {
                "id": str(msg.id),
                "channel": msg.channel.value,
                "direction": msg.direction.value,
                "status": msg.status.value,
                "subject": msg.subject,
                "created_at": msg.created_at.isoformat(),
            }
            
            if msg.opened_at:
                entry["opened_at"] = msg.opened_at.isoformat()
            if msg.clicked_at:
                entry["clicked_at"] = msg.clicked_at.isoformat()
            if msg.replied_at:
                entry["replied_at"] = msg.replied_at.isoformat()
            
            timeline.append(entry)
        
        return timeline
