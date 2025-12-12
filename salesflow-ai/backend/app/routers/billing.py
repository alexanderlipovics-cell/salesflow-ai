"""
============================================
💳 SALESFLOW AI - STRIPE API ROUTER
============================================
REST API endpoints for:
- Subscription management
- Payment methods
- Invoices & billing
- Checkout sessions
- Revenue analytics
"""

from datetime import datetime, timedelta
from typing import Optional, List

from fastapi import APIRouter, Depends, HTTPException, status, Query
from pydantic import BaseModel, EmailStr

from app.services.stripe_service import (
    get_stripe_service,
    StripeService,
    SubscriptionCreate,
    SubscriptionUpdate,
    SubscriptionResponse,
    PaymentMethodCreate,
    PaymentMethodResponse,
    InvoiceResponse,
    PlanTier,
    BillingInterval,
)
from app.core.security import get_current_user
from app.core.config import get_settings

router = APIRouter(prefix="/billing", tags=["billing"])
stripe_router = APIRouter(tags=["stripe"])


def _get_frontend_url():
    settings = get_settings()
    return getattr(settings, "frontend_url", None) or "https://salesflow-system.com"


# ==================== REQUEST/RESPONSE MODELS ====================

class CheckoutRequest(BaseModel):
    """Request for creating checkout session."""
    plan: PlanTier
    interval: BillingInterval = BillingInterval.MONTHLY
    success_url: str
    cancel_url: str


class CheckoutResponse(BaseModel):
    """Response with checkout URL."""
    checkout_url: str


class BillingPortalRequest(BaseModel):
    """Request for billing portal session."""
    return_url: str


class BillingPortalResponse(BaseModel):
    """Response with billing portal URL."""
    portal_url: str


class RevenueMetricsResponse(BaseModel):
    """Revenue analytics response."""
    total_revenue: float
    mrr: float
    arr: float
    successful_charges: int
    failed_charges: int
    success_rate: float
    avg_transaction: float
    active_subscriptions: int
    trialing_subscriptions: int
    period_days: int


class SubscriptionMetricsResponse(BaseModel):
    """Subscription breakdown response."""
    by_plan: dict
    by_interval: dict
    total: int


class PlanInfoResponse(BaseModel):
    """Plan information response."""
    id: str
    name: str
    price_monthly: float
    price_yearly: float
    features: dict
    popular: bool = False


# ==================== SUBSCRIPTION ENDPOINTS ====================

@router.post("/subscriptions", response_model=SubscriptionResponse)
async def create_subscription(
    data: SubscriptionCreate,
    current_user: dict = Depends(get_current_user),
    stripe_service: StripeService = Depends(get_stripe_service)
):
    """
    Create a new subscription.
    
    - **plan**: starter, pro, or enterprise
    - **interval**: monthly or yearly
    - **payment_method_id**: Optional Stripe payment method ID
    - **coupon_code**: Optional discount coupon
    - **trial_days**: Override default trial period (14 days)
    """
    try:
        subscription = await stripe_service.create_subscription(
            user_id=str(current_user["id"]),
            email=current_user["email"],
            data=data,
            name=current_user.get("name")
        )
        return subscription
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create subscription: {str(e)}")


@router.get("/subscriptions", response_model=List[SubscriptionResponse])
async def list_subscriptions(
    status: Optional[str] = None,
    current_user: dict = Depends(get_current_user),
    stripe_service: StripeService = Depends(get_stripe_service)
):
    """List user's subscriptions."""
    try:
        customer = await stripe_service.get_or_create_customer(
            user_id=str(current_user["id"]),
            email=current_user["email"]
        )
        return await stripe_service.get_customer_subscriptions(customer.id, status)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/subscriptions/current", response_model=Optional[SubscriptionResponse])
async def get_current_subscription(
    current_user: dict = Depends(get_current_user),
    stripe_service: StripeService = Depends(get_stripe_service)
):
    """Get user's active subscription."""
    try:
        customer = await stripe_service.get_or_create_customer(
            user_id=str(current_user["id"]),
            email=current_user["email"]
        )
        subscriptions = await stripe_service.get_customer_subscriptions(
            customer.id,
            status="active"
        )
        return subscriptions[0] if subscriptions else None
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/subscriptions/{subscription_id}", response_model=SubscriptionResponse)
async def get_subscription(
    subscription_id: str,
    current_user: dict = Depends(get_current_user),
    stripe_service: StripeService = Depends(get_stripe_service)
):
    """Get subscription details."""
    try:
        return await stripe_service.get_subscription(subscription_id)
    except Exception as e:
        raise HTTPException(status_code=404, detail="Subscription not found")


@router.patch("/subscriptions/{subscription_id}", response_model=SubscriptionResponse)
async def update_subscription(
    subscription_id: str,
    data: SubscriptionUpdate,
    current_user: dict = Depends(get_current_user),
    stripe_service: StripeService = Depends(get_stripe_service)
):
    """
    Update subscription (plan change).
    
    - **plan**: New plan tier
    - **interval**: New billing interval
    - **proration_behavior**: How to handle prorations
    """
    try:
        return await stripe_service.update_subscription(subscription_id, data)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/subscriptions/{subscription_id}", response_model=SubscriptionResponse)
async def cancel_subscription(
    subscription_id: str,
    immediately: bool = False,
    reason: Optional[str] = None,
    current_user: dict = Depends(get_current_user),
    stripe_service: StripeService = Depends(get_stripe_service)
):
    """
    Cancel subscription.
    
    - **immediately**: If true, cancels now; else cancels at period end
    - **reason**: Optional cancellation reason
    """
    try:
        return await stripe_service.cancel_subscription(
            subscription_id,
            cancel_immediately=immediately,
            cancellation_reason=reason
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/subscriptions/{subscription_id}/reactivate", response_model=SubscriptionResponse)
async def reactivate_subscription(
    subscription_id: str,
    current_user: dict = Depends(get_current_user),
    stripe_service: StripeService = Depends(get_stripe_service)
):
    """Reactivate a subscription scheduled for cancellation."""
    try:
        return await stripe_service.reactivate_subscription(subscription_id)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ==================== PAYMENT METHOD ENDPOINTS ====================

@router.get("/payment-methods", response_model=List[PaymentMethodResponse])
async def list_payment_methods(
    current_user: dict = Depends(get_current_user),
    stripe_service: StripeService = Depends(get_stripe_service)
):
    """List user's payment methods."""
    try:
        customer = await stripe_service.get_or_create_customer(
            user_id=str(current_user["id"]),
            email=current_user["email"]
        )
        return await stripe_service.list_payment_methods(customer.id)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/payment-methods", response_model=PaymentMethodResponse)
async def add_payment_method(
    data: PaymentMethodCreate,
    current_user: dict = Depends(get_current_user),
    stripe_service: StripeService = Depends(get_stripe_service)
):
    """
    Add a payment method.
    
    - **payment_method_id**: Stripe payment method ID from frontend
    - **set_default**: Whether to set as default payment method
    """
    try:
        customer = await stripe_service.get_or_create_customer(
            user_id=str(current_user["id"]),
            email=current_user["email"]
        )
        return await stripe_service.attach_payment_method(
            customer.id,
            data.payment_method_id,
            data.set_default
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/payment-methods/{payment_method_id}")
async def remove_payment_method(
    payment_method_id: str,
    current_user: dict = Depends(get_current_user),
    stripe_service: StripeService = Depends(get_stripe_service)
):
    """Remove a payment method."""
    try:
        await stripe_service.detach_payment_method(payment_method_id)
        return {"success": True}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ==================== INVOICE ENDPOINTS ====================

@router.get("/invoices", response_model=List[InvoiceResponse])
async def list_invoices(
    limit: int = Query(10, ge=1, le=100),
    current_user: dict = Depends(get_current_user),
    stripe_service: StripeService = Depends(get_stripe_service)
):
    """List user's invoices."""
    try:
        customer = await stripe_service.get_or_create_customer(
            user_id=str(current_user["id"]),
            email=current_user["email"]
        )
        return await stripe_service.list_invoices(customer.id, limit)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/invoices/upcoming", response_model=Optional[InvoiceResponse])
async def get_upcoming_invoice(
    current_user: dict = Depends(get_current_user),
    stripe_service: StripeService = Depends(get_stripe_service)
):
    """Get upcoming invoice preview."""
    try:
        customer = await stripe_service.get_or_create_customer(
            user_id=str(current_user["id"]),
            email=current_user["email"]
        )
        return await stripe_service.get_upcoming_invoice(customer.id)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ==================== CHECKOUT ENDPOINTS ====================

@router.post("/checkout", response_model=CheckoutResponse)
async def create_checkout_session(
    data: CheckoutRequest,
    current_user: dict = Depends(get_current_user),
    stripe_service: StripeService = Depends(get_stripe_service)
):
    """
    Create Stripe Checkout session.
    
    Returns URL to redirect user to Stripe Checkout page.
    """
    try:
        checkout_url = await stripe_service.create_checkout_session(
            user_id=str(current_user["id"]),
            email=current_user["email"],
            plan=data.plan,
            interval=data.interval,
            success_url=data.success_url,
            cancel_url=data.cancel_url
        )
        return CheckoutResponse(checkout_url=checkout_url)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@stripe_router.post("/stripe")
async def stripe_proxy(
    payload: dict,
    current_user: dict = Depends(get_current_active_user),
    stripe_service: StripeService = Depends(get_stripe_service),
):
    """
    Kompatibler Stripe-Proxy für das Frontend (/api/stripe).
    Unterstützte actions:
    - create-checkout: erwartet plan (starter/pro/enterprise) und interval (monthly/yearly)
    - create-portal: öffnet Billing-Portal
    - get-subscription: liefert aktive Subscription (falls vorhanden)
    """
    action = (payload or {}).get("action")
    frontend_url = _get_frontend_url()

    if action == "create-checkout":
        plan_raw = (payload.get("plan") or payload.get("priceId") or "pro").lower()
        interval_raw = (payload.get("interval") or "monthly").lower()
        try:
            plan = PlanTier(plan_raw)
        except Exception:
            plan = PlanTier.PRO
        try:
            interval = BillingInterval(interval_raw)
        except Exception:
            interval = BillingInterval.MONTHLY

        success_url = payload.get("successUrl") or f"{frontend_url}/billing/success"
        cancel_url = payload.get("cancelUrl") or f"{frontend_url}/billing/cancel"

        checkout_url = await stripe_service.create_checkout_session(
            user_id=str(current_user["id"]),
            email=current_user.get("email"),
            plan=plan,
            interval=interval,
            success_url=success_url,
            cancel_url=cancel_url,
        )
        return {"checkoutUrl": checkout_url}

    if action == "create-portal":
        customer = await stripe_service.get_or_create_customer(
            user_id=str(current_user["id"]),
            email=current_user.get("email"),
        )
        return_url = payload.get("returnUrl") or f"{frontend_url}/billing"
        portal_url = await stripe_service.create_billing_portal_session(
            customer.id,
            return_url,
        )
        return {"portalUrl": portal_url}

    if action == "get-subscription":
        customer = await stripe_service.get_or_create_customer(
            user_id=str(current_user["id"]),
            email=current_user.get("email"),
        )
        subs = await stripe_service.get_customer_subscriptions(customer.id, status="active")
        return subs[0] if subs else {}

    raise HTTPException(status_code=400, detail="Unsupported action")


@router.post("/billing-portal", response_model=BillingPortalResponse)
async def create_billing_portal_session(
    data: BillingPortalRequest,
    current_user: dict = Depends(get_current_user),
    stripe_service: StripeService = Depends(get_stripe_service)
):
    """
    Create Stripe Billing Portal session.
    
    Returns URL for customer to manage their subscription.
    """
    try:
        customer = await stripe_service.get_or_create_customer(
            user_id=str(current_user["id"]),
            email=current_user["email"]
        )
        portal_url = await stripe_service.create_billing_portal_session(
            customer.id,
            data.return_url
        )
        return BillingPortalResponse(portal_url=portal_url)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ==================== ANALYTICS ENDPOINTS (Admin only) ====================

@router.get("/analytics/revenue", response_model=RevenueMetricsResponse)
async def get_revenue_analytics(
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    current_user: dict = Depends(get_current_user),
    stripe_service: StripeService = Depends(get_stripe_service)
):
    """
    Get revenue analytics (admin only).
    
    - **start_date**: Period start (default: 30 days ago)
    - **end_date**: Period end (default: now)
    """
    # TODO: Add admin check
    # if not current_user.get("is_admin"):
    #     raise HTTPException(status_code=403, detail="Admin access required")
    
    if not start_date:
        start_date = datetime.utcnow() - timedelta(days=30)
    if not end_date:
        end_date = datetime.utcnow()
    
    try:
        metrics = await stripe_service.get_revenue_metrics(start_date, end_date)
        return RevenueMetricsResponse(**metrics)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/analytics/subscriptions", response_model=SubscriptionMetricsResponse)
async def get_subscription_analytics(
    current_user: dict = Depends(get_current_user),
    stripe_service: StripeService = Depends(get_stripe_service)
):
    """Get subscription breakdown (admin only)."""
    try:
        metrics = await stripe_service.get_subscription_metrics()
        return SubscriptionMetricsResponse(**metrics)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ==================== PLAN INFO ENDPOINTS ====================

@router.get("/plans", response_model=List[PlanInfoResponse])
async def get_plans():
    """Get available subscription plans."""
    return [
        PlanInfoResponse(
            id="starter",
            name="Starter",
            price_monthly=29.0,
            price_yearly=290.0,
            features={
                "leads_limit": 500,
                "users_limit": 1,
                "ai_credits": 100,
                "integrations": ["facebook"],
                "support": "email"
            },
            popular=False
        ),
        PlanInfoResponse(
            id="pro",
            name="Professional",
            price_monthly=79.0,
            price_yearly=790.0,
            features={
                "leads_limit": 5000,
                "users_limit": 5,
                "ai_credits": 1000,
                "integrations": ["facebook", "instagram", "linkedin"],
                "support": "priority"
            },
            popular=True
        ),
        PlanInfoResponse(
            id="enterprise",
            name="Enterprise",
            price_monthly=199.0,
            price_yearly=1990.0,
            features={
                "leads_limit": -1,  # Unlimited
                "users_limit": -1,
                "ai_credits": -1,
                "integrations": ["facebook", "instagram", "linkedin", "custom"],
                "support": "dedicated"
            },
            popular=False
        )
    ]
