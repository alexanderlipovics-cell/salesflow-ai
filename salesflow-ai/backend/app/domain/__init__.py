"""SalesFlow AI - Domain Architecture (Modular Monolith)"""

from .shared.types import TenantId, UserId, RequestContext
from .shared.events import DomainEvent, LeadCreatedEvent, LeadExtractionProposedEvent, EventBus

__all__ = [
    "TenantId",
    "UserId",
    "RequestContext",
    "DomainEvent",
    "LeadCreatedEvent",
    "LeadExtractionProposedEvent",
    "EventBus",
]

