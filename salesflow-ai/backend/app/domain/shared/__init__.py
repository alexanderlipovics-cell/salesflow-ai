"""SalesFlow AI - Shared Domain Types"""

from .types import TenantId, UserId, RequestContext
from .events import DomainEvent, LeadCreatedEvent, LeadExtractionProposedEvent, EventBus

__all__ = [
    "TenantId",
    "UserId",
    "RequestContext",
    "DomainEvent",
    "LeadCreatedEvent",
    "LeadExtractionProposedEvent",
    "EventBus",
]

