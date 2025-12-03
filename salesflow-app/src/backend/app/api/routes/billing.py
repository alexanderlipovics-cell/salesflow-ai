"""
╔════════════════════════════════════════════════════════════════════════════╗
║  BILLING API - Stripe Integration für Subscriptions                        ║
║  Production-Ready Payment System                                            ║
╚════════════════════════════════════════════════════════════════════════════╝

Features:
- Stripe Checkout Sessions
- Subscription Management
- Webhook Handling
- Usage-Based Billing für Add-Ons
- Invoice Management
"""

import os
import stripe
from datetime import datetime, timedelta
from typing import Optional, List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, Request, Header
from pydantic import BaseModel, Field
from supabase import Client

from ...db.deps import get_current_user, get_supabase, CurrentUser

# ═══════════════════════════════════════════════════════════════════════════
# STRIPE CONFIG
# ═══════════════════════════════════════════════════════════════════════════

stripe.api_key = os.getenv("STRIPE_SECRET_KEY", "")
STRIPE_WEBHOOK_SECRET = os.getenv("STRIPE_WEBHOOK_SECRET", "")
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:19006")

# Stripe Price IDs (aus Stripe Dashboard)
PRICE_IDS = {
    # Basic Plan
    "basic_monthly": os.getenv("STRIPE_PRICE_BASIC_MONTHLY", "price_basic_monthly"),
    "basic_yearly": os.getenv("STRIPE_PRICE_BASIC_YEARLY", "price_basic_yearly"),
    
    # Autopilot Add-On
    "autopilot_starter_monthly": os.getenv("STRIPE_PRICE_AUTOPILOT_STARTER", "price_autopilot_starter"),
    "autopilot_pro_monthly": os.getenv("STRIPE_PRICE_AUTOPILOT_PRO", "price_autopilot_pro"),
    "autopilot_unlimited_monthly": os.getenv("STRIPE_PRICE_AUTOPILOT_UNLIMITED", "price_autopilot_unlimited"),
    
    # Finance Add-On
    "finance_starter_monthly": os.getenv("STRIPE_PRICE_FINANCE_STARTER", "price_finance_starter"),
    "finance_pro_monthly": os.getenv("STRIPE_PRICE_FINANCE_PRO", "price_finance_pro"),
    "finance_business_monthly": os.getenv("STRIPE_PRICE_FINANCE_BUSINESS", "price_finance_business"),
    
    # LeadGen Add-On
    "leadgen_starter_monthly": os.getenv("STRIPE_PRICE_LEADGEN_STARTER", "price_leadgen_starter"),
    "leadgen_pro_monthly": os.getenv("STRIPE_PRICE_LEADGEN_PRO", "price_leadgen_pro"),
    "leadgen_unlimited_monthly": os.getenv("STRIPE_PRICE_LEADGEN_UNLIMITED", "price_leadgen_unlimited"),
    
    # Bundles
    "bundle_starter_monthly": os.getenv("STRIPE_PRICE_BUNDLE_STARTER", "price_bundle_starter"),
    "bundle_pro_monthly": os.getenv("STRIPE_PRICE_BUNDLE_PRO", "price_bundle_pro"),
    "bundle_unlimited_monthly": os.getenv("STRIPE_PRICE_BUNDLE_UNLIMITED", "price_bundle_unlimited"),
}

router = APIRouter(prefix="/billing", tags=["billing"])


# ═══════════════════════════════════════════════════════════════════════════
# SCHEMAS
# ═══════════════════════════════════════════════════════════════════════════

class CreateCheckoutRequest(BaseModel):
    price_id: str = Field(..., description="Stripe Price ID oder interner Plan-Key")
    success_url: Optional[str] = None
    cancel_url: Optional[str] = None
    trial_days: Optional[int] = 7


class CreatePortalRequest(BaseModel):
    return_url: Optional[str] = None


class SubscriptionResponse(BaseModel):
    id: str
    status: str
    plan: str
    current_period_start: datetime
    current_period_end: datetime
    cancel_at_period_end: bool
    addons: List[str]


class UsageRecord(BaseModel):
    feature: str  # ai_analyses, auto_actions, etc.
    quantity: int = 1


class PlanLimits(BaseModel):
    leads: int
    chats_import: int
    ai_analyses: int
    follow_ups: int
    templates: int
    team_members: int
    auto_actions: int
    ghost_reengages: int
    transactions: int
    lead_suggestions: int


# ═══════════════════════════════════════════════════════════════════════════
# CHECKOUT & SUBSCRIPTION
# ═══════════════════════════════════════════════════════════════════════════

@router.post("/checkout")
async def create_checkout_session(
    request: CreateCheckoutRequest,
    current_user: CurrentUser = Depends(get_current_user),
    db: Client = Depends(get_supabase),
):
    """
    Erstellt eine Stripe Checkout Session für neue Subscriptions.
    """
    # TEST MODE: Wenn kein Stripe Key, simuliere Checkout
    if not stripe.api_key:
        # Simuliere erfolgreichen Checkout für Tests
        test_session_id = f"cs_test_{current_user.id[:8]}_{request.price_id}"
        return {
            "checkout_url": f"{FRONTEND_URL}/billing/test-checkout?session_id={test_session_id}&plan={request.price_id}&price=30",
            "session_id": test_session_id,
            "test_mode": True,
            "message": "Test-Modus aktiv. Konfiguriere STRIPE_SECRET_KEY für echte Zahlungen."
        }
    
    try:
        # Stripe Price ID auflösen
        price_id = PRICE_IDS.get(request.price_id, request.price_id)
        
        # Customer finden oder erstellen
        customer_id = await get_or_create_stripe_customer(current_user, db)
        
        # Checkout Session erstellen
        session = stripe.checkout.Session.create(
            customer=customer_id,
            payment_method_types=["card", "sepa_debit"],
            line_items=[{
                "price": price_id,
                "quantity": 1,
            }],
            mode="subscription",
            subscription_data={
                "trial_period_days": request.trial_days,
                "metadata": {
                    "user_id": current_user.id,
                    "plan_key": request.price_id,
                },
            },
            success_url=request.success_url or f"{FRONTEND_URL}/billing/success?session_id={{CHECKOUT_SESSION_ID}}",
            cancel_url=request.cancel_url or f"{FRONTEND_URL}/billing/cancel",
            allow_promotion_codes=True,
            billing_address_collection="required",
            customer_update={
                "address": "auto",
                "name": "auto",
            },
        )
        
        return {
            "checkout_url": session.url,
            "session_id": session.id,
        }
        
    except stripe.error.StripeError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/checkout/addon")
async def add_addon_to_subscription(
    request: CreateCheckoutRequest,
    current_user: CurrentUser = Depends(get_current_user),
    db: Client = Depends(get_supabase),
):
    """
    Fügt ein Add-On zu einer bestehenden Subscription hinzu.
    """
    try:
        # Aktuelle Subscription holen
        sub_data = db.table("subscriptions").select("*").eq(
            "user_id", current_user.id
        ).eq("status", "active").single().execute()
        
        if not sub_data.data:
            raise HTTPException(status_code=400, detail="Keine aktive Subscription gefunden")
        
        stripe_sub_id = sub_data.data["stripe_subscription_id"]
        price_id = PRICE_IDS.get(request.price_id, request.price_id)
        
        # Add-On zur Subscription hinzufügen
        subscription = stripe.Subscription.retrieve(stripe_sub_id)
        
        stripe.SubscriptionItem.create(
            subscription=stripe_sub_id,
            price=price_id,
            proration_behavior="create_prorations",
        )
        
        return {"success": True, "message": "Add-On hinzugefügt"}
        
    except stripe.error.StripeError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/portal")
async def create_portal_session(
    request: CreatePortalRequest,
    current_user: CurrentUser = Depends(get_current_user),
    db: Client = Depends(get_supabase),
):
    """
    Erstellt eine Stripe Customer Portal Session für Self-Service.
    """
    try:
        customer_id = await get_or_create_stripe_customer(current_user, db)
        
        session = stripe.billing_portal.Session.create(
            customer=customer_id,
            return_url=request.return_url or f"{FRONTEND_URL}/settings/billing",
        )
        
        return {"portal_url": session.url}
        
    except stripe.error.StripeError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/subscription")
async def get_subscription(
    current_user: CurrentUser = Depends(get_current_user),
    db: Client = Depends(get_supabase),
) -> Dict[str, Any]:
    """
    Holt die aktuelle Subscription des Users.
    """
    result = db.table("subscriptions").select(
        "*, subscription_items(*)"
    ).eq("user_id", current_user.id).eq("status", "active").single().execute()
    
    if not result.data:
        return {
            "has_subscription": False,
            "plan": "free",
            "limits": get_free_limits(),
        }
    
    sub = result.data
    
    return {
        "has_subscription": True,
        "subscription_id": sub["id"],
        "stripe_subscription_id": sub["stripe_subscription_id"],
        "plan": sub["plan"],
        "status": sub["status"],
        "current_period_start": sub["current_period_start"],
        "current_period_end": sub["current_period_end"],
        "cancel_at_period_end": sub.get("cancel_at_period_end", False),
        "addons": [item["addon_id"] for item in sub.get("subscription_items", [])],
        "limits": get_plan_limits(sub["plan"], sub.get("subscription_items", [])),
    }


@router.get("/usage")
async def get_usage(
    current_user: CurrentUser = Depends(get_current_user),
    db: Client = Depends(get_supabase),
) -> Dict[str, Any]:
    """
    Holt die aktuelle Nutzung des Users für den Billing-Zeitraum.
    """
    # Aktuellen Monat holen
    now = datetime.utcnow()
    period_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    
    # Usage Records holen
    usage_result = db.table("usage_records").select(
        "feature, SUM(quantity) as total"
    ).eq("user_id", current_user.id).gte(
        "created_at", period_start.isoformat()
    ).execute()
    
    usage = {}
    for record in usage_result.data or []:
        usage[record["feature"]] = record["total"]
    
    # Limits holen
    sub_result = db.table("subscriptions").select(
        "plan, subscription_items(*)"
    ).eq("user_id", current_user.id).eq("status", "active").single().execute()
    
    if sub_result.data:
        limits = get_plan_limits(
            sub_result.data["plan"],
            sub_result.data.get("subscription_items", [])
        )
    else:
        limits = get_free_limits()
    
    return {
        "period_start": period_start.isoformat(),
        "usage": usage,
        "limits": limits,
        "usage_percentage": calculate_usage_percentage(usage, limits),
    }


@router.post("/usage/record")
async def record_usage(
    record: UsageRecord,
    current_user: CurrentUser = Depends(get_current_user),
    db: Client = Depends(get_supabase),
):
    """
    Zeichnet Usage für metered Billing auf.
    """
    db.table("usage_records").insert({
        "user_id": current_user.id,
        "feature": record.feature,
        "quantity": record.quantity,
        "created_at": datetime.utcnow().isoformat(),
    }).execute()
    
    return {"success": True}


# ═══════════════════════════════════════════════════════════════════════════
# WEBHOOKS
# ═══════════════════════════════════════════════════════════════════════════

@router.post("/webhooks/stripe")
async def stripe_webhook(
    request: Request,
    stripe_signature: str = Header(None, alias="Stripe-Signature"),
    db: Client = Depends(get_supabase),
):
    """
    Stripe Webhook Handler für Subscription Events.
    """
    payload = await request.body()
    
    try:
        event = stripe.Webhook.construct_event(
            payload, stripe_signature, STRIPE_WEBHOOK_SECRET
        )
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid payload")
    except stripe.error.SignatureVerificationError:
        raise HTTPException(status_code=400, detail="Invalid signature")
    
    # Event Handler
    if event["type"] == "checkout.session.completed":
        await handle_checkout_completed(event["data"]["object"], db)
        
    elif event["type"] == "customer.subscription.created":
        await handle_subscription_created(event["data"]["object"], db)
        
    elif event["type"] == "customer.subscription.updated":
        await handle_subscription_updated(event["data"]["object"], db)
        
    elif event["type"] == "customer.subscription.deleted":
        await handle_subscription_deleted(event["data"]["object"], db)
        
    elif event["type"] == "invoice.paid":
        await handle_invoice_paid(event["data"]["object"], db)
        
    elif event["type"] == "invoice.payment_failed":
        await handle_payment_failed(event["data"]["object"], db)
    
    return {"received": True}


# ═══════════════════════════════════════════════════════════════════════════
# WEBHOOK HANDLERS
# ═══════════════════════════════════════════════════════════════════════════

async def handle_checkout_completed(session: dict, db: Client):
    """Checkout abgeschlossen - Subscription erstellen."""
    user_id = session.get("metadata", {}).get("user_id")
    if not user_id:
        return
    
    subscription_id = session.get("subscription")
    if subscription_id:
        subscription = stripe.Subscription.retrieve(subscription_id)
        await sync_subscription(subscription, user_id, db)


async def handle_subscription_created(subscription: dict, db: Client):
    """Neue Subscription erstellt."""
    user_id = subscription.get("metadata", {}).get("user_id")
    if user_id:
        await sync_subscription(subscription, user_id, db)


async def handle_subscription_updated(subscription: dict, db: Client):
    """Subscription aktualisiert (Upgrade/Downgrade/Cancel)."""
    user_id = subscription.get("metadata", {}).get("user_id")
    if user_id:
        await sync_subscription(subscription, user_id, db)


async def handle_subscription_deleted(subscription: dict, db: Client):
    """Subscription gekündigt."""
    db.table("subscriptions").update({
        "status": "canceled",
        "canceled_at": datetime.utcnow().isoformat(),
    }).eq("stripe_subscription_id", subscription["id"]).execute()


async def handle_invoice_paid(invoice: dict, db: Client):
    """Rechnung bezahlt - Invoice speichern."""
    customer_id = invoice.get("customer")
    
    # User finden
    user_result = db.table("profiles").select("id").eq(
        "stripe_customer_id", customer_id
    ).single().execute()
    
    if not user_result.data:
        return
    
    db.table("invoices").upsert({
        "user_id": user_result.data["id"],
        "stripe_invoice_id": invoice["id"],
        "amount": invoice["amount_paid"] / 100,  # Cents to EUR
        "currency": invoice["currency"],
        "status": "paid",
        "invoice_pdf": invoice.get("invoice_pdf"),
        "paid_at": datetime.utcnow().isoformat(),
    }).execute()


async def handle_payment_failed(invoice: dict, db: Client):
    """Zahlung fehlgeschlagen - User benachrichtigen."""
    customer_id = invoice.get("customer")
    
    user_result = db.table("profiles").select("id, email").eq(
        "stripe_customer_id", customer_id
    ).single().execute()
    
    if user_result.data:
        # TODO: Email senden
        # TODO: Push Notification
        db.table("notifications").insert({
            "user_id": user_result.data["id"],
            "type": "payment_failed",
            "title": "Zahlung fehlgeschlagen",
            "message": "Deine letzte Zahlung konnte nicht verarbeitet werden. Bitte aktualisiere deine Zahlungsmethode.",
            "action_url": "/settings/billing",
        }).execute()


# ═══════════════════════════════════════════════════════════════════════════
# HELPERS
# ═══════════════════════════════════════════════════════════════════════════

async def get_or_create_stripe_customer(user: CurrentUser, db: Client) -> str:
    """Holt oder erstellt einen Stripe Customer."""
    # Prüfen ob Customer existiert
    result = db.table("profiles").select("stripe_customer_id").eq(
        "id", user.id
    ).single().execute()
    
    if result.data and result.data.get("stripe_customer_id"):
        return result.data["stripe_customer_id"]
    
    # Neuen Customer erstellen
    customer = stripe.Customer.create(
        email=user.email,
        name=f"{user.first_name or ''} {user.last_name or ''}".strip() or None,
        metadata={"user_id": user.id},
    )
    
    # In DB speichern
    db.table("profiles").update({
        "stripe_customer_id": customer.id,
    }).eq("id", user.id).execute()
    
    return customer.id


async def sync_subscription(subscription: dict, user_id: str, db: Client):
    """Synchronisiert Stripe Subscription mit DB."""
    plan_key = subscription.get("metadata", {}).get("plan_key", "basic")
    
    # Haupt-Subscription speichern
    db.table("subscriptions").upsert({
        "user_id": user_id,
        "stripe_subscription_id": subscription["id"],
        "stripe_customer_id": subscription["customer"],
        "plan": plan_key,
        "status": subscription["status"],
        "current_period_start": datetime.fromtimestamp(subscription["current_period_start"]).isoformat(),
        "current_period_end": datetime.fromtimestamp(subscription["current_period_end"]).isoformat(),
        "cancel_at_period_end": subscription.get("cancel_at_period_end", False),
        "updated_at": datetime.utcnow().isoformat(),
    }, on_conflict="user_id").execute()
    
    # Subscription Items (Add-Ons) speichern
    for item in subscription.get("items", {}).get("data", []):
        price_id = item["price"]["id"]
        addon_id = get_addon_from_price(price_id)
        
        if addon_id:
            db.table("subscription_items").upsert({
                "subscription_id": subscription["id"],
                "stripe_item_id": item["id"],
                "addon_id": addon_id,
                "price_id": price_id,
            }, on_conflict="stripe_item_id").execute()


def get_addon_from_price(price_id: str) -> Optional[str]:
    """Mappt Stripe Price ID auf Add-On ID."""
    for key, value in PRICE_IDS.items():
        if value == price_id and key != "basic_monthly" and key != "basic_yearly":
            return key.replace("_monthly", "").replace("_yearly", "")
    return None


def get_free_limits() -> dict:
    """Limits für Free User."""
    return {
        "leads": 10,
        "chats_import": 5,
        "ai_analyses": 10,
        "follow_ups": 20,
        "templates": 5,
        "team_members": 1,
        "auto_actions": 0,
        "ghost_reengages": 0,
        "transactions": 0,
        "lead_suggestions": 0,
    }


def get_plan_limits(plan: str, addons: list) -> dict:
    """Berechnet kombinierte Limits basierend auf Plan + Add-Ons."""
    # Basis-Limits
    if plan == "basic":
        limits = {
            "leads": 100,
            "chats_import": 50,
            "ai_analyses": 100,
            "follow_ups": 200,
            "templates": 20,
            "team_members": 1,
            "auto_actions": 0,
            "ghost_reengages": 0,
            "transactions": 0,
            "lead_suggestions": 0,
        }
    else:
        limits = get_free_limits()
    
    # Add-On Limits hinzufügen
    addon_limits = {
        "autopilot_starter": {"auto_actions": 100, "ghost_reengages": 20},
        "autopilot_pro": {"auto_actions": 500, "ghost_reengages": 100},
        "autopilot_unlimited": {"auto_actions": -1, "ghost_reengages": -1},
        "finance_starter": {"transactions": 100},
        "finance_pro": {"transactions": 500},
        "finance_business": {"transactions": -1},
        "leadgen_starter": {"lead_suggestions": 50},
        "leadgen_pro": {"lead_suggestions": 200},
        "leadgen_unlimited": {"lead_suggestions": -1},
    }
    
    for addon in addons:
        addon_id = addon.get("addon_id") if isinstance(addon, dict) else addon
        if addon_id in addon_limits:
            for key, value in addon_limits[addon_id].items():
                if value == -1:
                    limits[key] = -1
                elif limits.get(key, 0) != -1:
                    limits[key] = limits.get(key, 0) + value
    
    return limits


def calculate_usage_percentage(usage: dict, limits: dict) -> dict:
    """Berechnet Nutzung in Prozent."""
    percentages = {}
    for key, limit in limits.items():
        if limit == -1:
            percentages[key] = 0  # Unlimited
        elif limit > 0:
            used = usage.get(key, 0)
            percentages[key] = min(100, round((used / limit) * 100))
        else:
            percentages[key] = 0
    return percentages

