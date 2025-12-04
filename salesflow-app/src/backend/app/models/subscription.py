"""
╔════════════════════════════════════════════════════════════════════════════╗
║  SUBSCRIPTION MODEL                                                         ║
║  Datenmodell für Abonnements                                                 ║
╚════════════════════════════════════════════════════════════════════════════╝
"""

from typing import Optional
from datetime import datetime
from dataclasses import dataclass, field
from enum import Enum


class PlanType(str, Enum):
    """Verfügbare Pläne."""
    FREE = "free"
    STARTER = "starter"
    GROWTH = "growth"
    SCALE = "scale"
    FOUNDING_MEMBER = "founding_member"


class SubscriptionStatus(str, Enum):
    """Subscription Status."""
    ACTIVE = "active"
    CANCELED = "canceled"
    PAST_DUE = "past_due"
    TRIALING = "trialing"
    INCOMPLETE = "incomplete"
    INCOMPLETE_EXPIRED = "incomplete_expired"
    UNPAID = "unpaid"


@dataclass
class Subscription:
    """
    Subscription Model.
    
    Repräsentiert ein User-Abonnement.
    """
    user_id: str
    stripe_customer_id: Optional[str] = None
    stripe_subscription_id: Optional[str] = None
    plan: str = PlanType.FREE.value  # "free", "starter", "growth", "scale", "founding_member"
    status: str = SubscriptionStatus.ACTIVE.value  # "active", "canceled", "past_due"
    current_period_end: Optional[datetime] = None
    cancel_at: Optional[datetime] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    
    # Metadata
    billing_cycle: Optional[str] = None  # "monthly", "yearly", "one_time"
    trial_end: Optional[datetime] = None
    
    def to_dict(self) -> dict:
        """Konvertiert zu Dictionary."""
        return {
            "user_id": self.user_id,
            "stripe_customer_id": self.stripe_customer_id,
            "stripe_subscription_id": self.stripe_subscription_id,
            "plan": self.plan,
            "status": self.status,
            "current_period_end": self.current_period_end.isoformat() if self.current_period_end else None,
            "cancel_at": self.cancel_at.isoformat() if self.cancel_at else None,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
            "billing_cycle": self.billing_cycle,
            "trial_end": self.trial_end.isoformat() if self.trial_end else None,
        }
    
    @classmethod
    def from_dict(cls, data: dict) -> "Subscription":
        """Erstellt aus Dictionary."""
        return cls(
            user_id=data["user_id"],
            stripe_customer_id=data.get("stripe_customer_id"),
            stripe_subscription_id=data.get("stripe_subscription_id"),
            plan=data.get("plan", PlanType.FREE.value),
            status=data.get("status", SubscriptionStatus.ACTIVE.value),
            current_period_end=datetime.fromisoformat(data["current_period_end"]) if data.get("current_period_end") else None,
            cancel_at=datetime.fromisoformat(data["cancel_at"]) if data.get("cancel_at") else None,
            created_at=datetime.fromisoformat(data["created_at"]) if data.get("created_at") else None,
            updated_at=datetime.fromisoformat(data["updated_at"]) if data.get("updated_at") else None,
            billing_cycle=data.get("billing_cycle"),
            trial_end=datetime.fromisoformat(data["trial_end"]) if data.get("trial_end") else None,
        )
    
    def is_active(self) -> bool:
        """Prüft ob Subscription aktiv ist."""
        return self.status == SubscriptionStatus.ACTIVE.value
    
    def is_canceled(self) -> bool:
        """Prüft ob Subscription gekündigt ist."""
        return self.status == SubscriptionStatus.CANCELED.value
    
    def is_past_due(self) -> bool:
        """Prüft ob Zahlung überfällig ist."""
        return self.status == SubscriptionStatus.PAST_DUE.value


# =============================================================================
# EXPORTS
# =============================================================================

__all__ = [
    "Subscription",
    "PlanType",
    "SubscriptionStatus",
]

