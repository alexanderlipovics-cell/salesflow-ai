"""
╔════════════════════════════════════════════════════════════════════════════╗
║  BILLING API                                                                ║
║  API für Abonnement-Verwaltung und Nutzungsstatistiken                     ║
╚════════════════════════════════════════════════════════════════════════════╝
"""

from __future__ import annotations

from datetime import datetime, timedelta
from typing import Optional, List
from uuid import uuid4

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel

from app.utils.logger import get_logger

logger = get_logger(__name__)
router = APIRouter(prefix="/api/v1/billing", tags=["billing"])


# =============================================================================
# MODELS
# =============================================================================

class SubscriptionPlan(BaseModel):
    """Ein Abo-Plan."""
    id: str
    name: str
    price_monthly: float
    price_yearly: float
    features: List[str]
    limits: dict


class Subscription(BaseModel):
    """Aktives Abonnement."""
    id: str
    user_id: str
    plan_id: str
    plan_name: str
    status: str  # active, cancelled, past_due, trialing
    current_period_start: str
    current_period_end: str
    cancel_at_period_end: bool = False
    trial_end: Optional[str] = None
    features: List[str]
    limits: dict


class UsageStats(BaseModel):
    """Nutzungsstatistiken."""
    period_start: str
    period_end: str
    ai_messages_used: int
    ai_messages_limit: int
    leads_created: int
    leads_limit: int
    templates_used: int
    templates_limit: int
    team_members: int
    team_members_limit: int
    storage_used_mb: float
    storage_limit_mb: float


class Invoice(BaseModel):
    """Eine Rechnung."""
    id: str
    amount: float
    currency: str
    status: str  # paid, pending, failed
    created_at: str
    paid_at: Optional[str] = None
    pdf_url: Optional[str] = None


# =============================================================================
# DEMO DATA
# =============================================================================

_demo_plans = [
    {
        "id": "plan_free",
        "name": "Free",
        "price_monthly": 0,
        "price_yearly": 0,
        "features": [
            "100 AI-Nachrichten/Monat",
            "50 Leads",
            "5 Templates",
            "E-Mail Support",
        ],
        "limits": {
            "ai_messages": 100,
            "leads": 50,
            "templates": 5,
            "team_members": 1,
            "storage_mb": 100,
        },
    },
    {
        "id": "plan_basic",
        "name": "Basic",
        "price_monthly": 29,
        "price_yearly": 290,
        "features": [
            "1.000 AI-Nachrichten/Monat",
            "500 Leads",
            "Unbegrenzte Templates",
            "Priority Support",
            "Analytics Dashboard",
        ],
        "limits": {
            "ai_messages": 1000,
            "leads": 500,
            "templates": -1,  # unlimited
            "team_members": 3,
            "storage_mb": 1000,
        },
    },
    {
        "id": "plan_pro",
        "name": "Pro",
        "price_monthly": 79,
        "price_yearly": 790,
        "features": [
            "Unbegrenzte AI-Nachrichten",
            "Unbegrenzte Leads",
            "Unbegrenzte Templates",
            "Priority Support",
            "Advanced Analytics",
            "API-Zugang",
            "White-Label Option",
        ],
        "limits": {
            "ai_messages": -1,
            "leads": -1,
            "templates": -1,
            "team_members": 10,
            "storage_mb": 10000,
        },
    },
    {
        "id": "plan_enterprise",
        "name": "Enterprise",
        "price_monthly": 199,
        "price_yearly": 1990,
        "features": [
            "Alles aus Pro",
            "Dedizierter Account Manager",
            "Custom Integrations",
            "SLA-Garantie",
            "On-Premise Option",
        ],
        "limits": {
            "ai_messages": -1,
            "leads": -1,
            "templates": -1,
            "team_members": -1,
            "storage_mb": -1,
        },
    },
]

_demo_subscription = {
    "id": f"sub_{uuid4().hex[:12]}",
    "user_id": "demo-user",
    "plan_id": "plan_free",
    "plan_name": "Free",
    "status": "active",
    "current_period_start": (datetime.now() - timedelta(days=15)).isoformat(),
    "current_period_end": (datetime.now() + timedelta(days=15)).isoformat(),
    "cancel_at_period_end": False,
    "trial_end": None,
    "features": _demo_plans[0]["features"],
    "limits": _demo_plans[0]["limits"],
}

_demo_usage = {
    "period_start": (datetime.now().replace(day=1)).isoformat(),
    "period_end": (datetime.now().replace(day=1) + timedelta(days=30)).isoformat(),
    "ai_messages_used": 45,
    "ai_messages_limit": 100,
    "leads_created": 23,
    "leads_limit": 50,
    "templates_used": 3,
    "templates_limit": 5,
    "team_members": 1,
    "team_members_limit": 1,
    "storage_used_mb": 25.5,
    "storage_limit_mb": 100,
}


# =============================================================================
# SUBSCRIPTION ENDPOINTS
# =============================================================================

@router.get("/subscription", response_model=Subscription)
async def get_subscription() -> Subscription:
    """
    Holt das aktuelle Abonnement des Benutzers.
    
    Returns:
        Aktives Subscription-Objekt
    """
    return Subscription(**_demo_subscription)


@router.get("/plans", response_model=List[SubscriptionPlan])
async def get_plans() -> List[SubscriptionPlan]:
    """
    Holt alle verfügbaren Abo-Pläne.
    
    Returns:
        Liste aller Pläne
    """
    return [SubscriptionPlan(**plan) for plan in _demo_plans]


@router.post("/subscription/upgrade")
async def upgrade_subscription(
    plan_id: str = Query(..., description="ID des neuen Plans"),
) -> dict:
    """
    Upgraded das Abonnement auf einen neuen Plan.
    
    Args:
        plan_id: ID des Ziel-Plans
        
    Returns:
        Bestätigung mit neuem Subscription-Status
    """
    # Find plan
    plan = next((p for p in _demo_plans if p["id"] == plan_id), None)
    if not plan:
        raise HTTPException(status_code=404, detail="Plan nicht gefunden")
    
    # Update subscription
    _demo_subscription["plan_id"] = plan_id
    _demo_subscription["plan_name"] = plan["name"]
    _demo_subscription["features"] = plan["features"]
    _demo_subscription["limits"] = plan["limits"]
    
    logger.info(f"Subscription upgraded to {plan['name']}")
    return {
        "success": True,
        "message": f"Erfolgreich auf {plan['name']} geupgraded",
        "subscription": Subscription(**_demo_subscription),
    }


@router.post("/subscription/cancel")
async def cancel_subscription() -> dict:
    """
    Kündigt das Abonnement zum Ende der Periode.
    
    Returns:
        Bestätigung
    """
    _demo_subscription["cancel_at_period_end"] = True
    
    logger.info("Subscription cancelled")
    return {
        "success": True,
        "message": "Abonnement wird zum Ende der Periode gekündigt",
        "cancel_at": _demo_subscription["current_period_end"],
    }


@router.post("/subscription/reactivate")
async def reactivate_subscription() -> dict:
    """
    Reaktiviert ein gekündigtes Abonnement.
    
    Returns:
        Bestätigung
    """
    _demo_subscription["cancel_at_period_end"] = False
    
    logger.info("Subscription reactivated")
    return {
        "success": True,
        "message": "Abonnement wurde reaktiviert",
        "subscription": Subscription(**_demo_subscription),
    }


# =============================================================================
# USAGE ENDPOINTS
# =============================================================================

@router.get("/usage", response_model=UsageStats)
async def get_usage() -> UsageStats:
    """
    Holt die Nutzungsstatistiken für die aktuelle Periode.
    
    Returns:
        UsageStats-Objekt
    """
    return UsageStats(**_demo_usage)


@router.get("/usage/history")
async def get_usage_history(
    months: int = Query(6, description="Anzahl Monate zurück"),
) -> List[dict]:
    """
    Holt die Nutzungshistorie.
    
    Args:
        months: Anzahl Monate
        
    Returns:
        Liste der Nutzungsstatistiken pro Monat
    """
    history = []
    
    for i in range(months):
        month_date = datetime.now() - timedelta(days=30 * i)
        history.append({
            "month": month_date.strftime("%Y-%m"),
            "ai_messages_used": max(0, 45 - i * 5),
            "leads_created": max(0, 23 - i * 3),
            "templates_used": max(0, 3 - i),
        })
    
    return history


# =============================================================================
# INVOICE ENDPOINTS
# =============================================================================

@router.get("/invoices", response_model=List[Invoice])
async def get_invoices(
    limit: int = Query(10, description="Anzahl Rechnungen"),
) -> List[Invoice]:
    """
    Holt die Rechnungshistorie.
    
    Args:
        limit: Max. Anzahl
        
    Returns:
        Liste der Rechnungen
    """
    # Demo invoices für Free Plan (keine Rechnungen)
    return []


@router.get("/invoices/{invoice_id}", response_model=Invoice)
async def get_invoice(invoice_id: str) -> Invoice:
    """
    Holt eine einzelne Rechnung.
    
    Args:
        invoice_id: ID der Rechnung
        
    Returns:
        Invoice-Objekt
    """
    raise HTTPException(status_code=404, detail="Rechnung nicht gefunden")


# =============================================================================
# PAYMENT METHODS
# =============================================================================

@router.get("/payment-methods")
async def get_payment_methods() -> dict:
    """
    Holt die gespeicherten Zahlungsmethoden.
    
    Returns:
        Liste der Zahlungsmethoden
    """
    return {
        "payment_methods": [],
        "default_payment_method": None,
    }


@router.post("/payment-methods")
async def add_payment_method(
    token: str = Query(..., description="Payment Token von Stripe"),
) -> dict:
    """
    Fügt eine neue Zahlungsmethode hinzu.
    
    Args:
        token: Stripe Token
        
    Returns:
        Bestätigung
    """
    return {
        "success": True,
        "message": "Zahlungsmethode hinzugefügt (Demo)",
    }


# =============================================================================
# CHECKOUT
# =============================================================================

@router.post("/checkout/session")
async def create_checkout_session(
    plan_id: str = Query(..., description="ID des Plans"),
    billing_period: str = Query("monthly", description="monthly oder yearly"),
) -> dict:
    """
    Erstellt eine Checkout-Session für den Kauf.
    
    Args:
        plan_id: ID des Plans
        billing_period: Abrechnungsperiode
        
    Returns:
        Checkout URL
    """
    plan = next((p for p in _demo_plans if p["id"] == plan_id), None)
    if not plan:
        raise HTTPException(status_code=404, detail="Plan nicht gefunden")
    
    price = plan["price_yearly"] if billing_period == "yearly" else plan["price_monthly"]
    
    return {
        "checkout_url": f"https://checkout.stripe.com/demo/{plan_id}",
        "plan_name": plan["name"],
        "price": price,
        "billing_period": billing_period,
        "message": "Demo-Checkout - In Produktion würde hier ein Stripe-Link generiert",
    }


@router.get("/portal")
async def get_billing_portal() -> dict:
    """
    Holt die URL zum Stripe Customer Portal.
    
    Returns:
        Portal URL
    """
    return {
        "portal_url": "https://billing.stripe.com/demo/portal",
        "message": "Demo-Portal - In Produktion würde hier ein Stripe-Portal-Link generiert",
    }

