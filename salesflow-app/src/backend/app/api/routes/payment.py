"""
╔════════════════════════════════════════════════════════════════════════════╗
║  PAYMENT API ROUTES                                                         ║
║  Stripe Payment Integration                                                 ║
╚════════════════════════════════════════════════════════════════════════════╝
"""

from fastapi import APIRouter, Depends, HTTPException, Request, Header
from typing import Optional
from pydantic import BaseModel

from ...db.deps import get_db, get_current_user, CurrentUser
from ...services.payment import StripeService
from ...core.config import settings

router = APIRouter(prefix="/payment", tags=["payment"])

stripe_service = StripeService()


# =============================================================================
# REQUEST/RESPONSE MODELS
# =============================================================================

class CreateCheckoutRequest(BaseModel):
    plan: str  # "starter", "growth", "scale", "founding_member"
    billing: str  # "monthly", "yearly", "one_time"


class CreateCheckoutResponse(BaseModel):
    checkout_url: str


class CreatePortalResponse(BaseModel):
    portal_url: str


class SubscriptionResponse(BaseModel):
    plan: str
    status: str
    current_period_end: Optional[str] = None
    cancel_at: Optional[str] = None
    stripe_customer_id: Optional[str] = None
    stripe_subscription_id: Optional[str] = None


# =============================================================================
# CHECKOUT
# =============================================================================

@router.post("/create-checkout", response_model=CreateCheckoutResponse)
async def create_checkout(
    request: CreateCheckoutRequest,
    current_user: CurrentUser = Depends(get_current_user),
):
    """
    Erstellt eine Stripe Checkout Session.
    
    Beispiel:
    {
        "plan": "growth",
        "billing": "monthly"
    }
    """
    try:
        # Hole Price ID
        price_id = stripe_service.get_price_id(request.plan, request.billing)
        
        if not price_id:
            raise HTTPException(
                status_code=400,
                detail=f"Ungültiger Plan oder Billing: {request.plan}/{request.billing}"
            )
        
        # URLs für Success/Cancel
        base_url = settings.CORS_ORIGINS.split(",")[0] if settings.CORS_ORIGINS else "http://localhost:3000"
        success_url = f"{base_url}/payment/success?session_id={{CHECKOUT_SESSION_ID}}"
        cancel_url = f"{base_url}/payment/cancel"
        
        # Checkout Session erstellen
        checkout_url = await stripe_service.create_checkout_session(
            user_id=str(current_user.id),
            price_id=price_id,
            success_url=success_url,
            cancel_url=cancel_url,
            customer_email=current_user.email,
            metadata={
                "plan": request.plan,
                "billing": request.billing,
            }
        )
        
        return CreateCheckoutResponse(checkout_url=checkout_url)
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Fehler beim Erstellen der Checkout Session: {str(e)}")


# =============================================================================
# CUSTOMER PORTAL
# =============================================================================

@router.post("/create-portal", response_model=CreatePortalResponse)
async def create_portal(
    current_user: CurrentUser = Depends(get_current_user),
    db = Depends(get_db),
):
    """
    Erstellt eine Stripe Customer Portal Session.
    
    Ermöglicht Kunden:
    - Abo verwalten
    - Zahlungsmethoden ändern
    - Rechnungen ansehen
    - Abo kündigen
    """
    try:
        # Hole Subscription aus DB
        from ...db.supabase import get_supabase
        supabase = get_supabase()
        
        result = supabase.table("subscriptions").select("*").eq(
            "user_id", str(current_user.id)
        ).single().execute()
        
        subscription = result.data if result.data else None
        
        if not subscription or not subscription.get("stripe_customer_id"):
            raise HTTPException(
                status_code=404,
                detail="Kein Stripe Customer gefunden. Bitte erstelle zuerst ein Abo."
            )
        
        customer_id = subscription["stripe_customer_id"]
        
        if not customer_id:
            raise HTTPException(
                status_code=404,
                detail="Kein Stripe Customer gefunden. Bitte erstelle zuerst ein Abo."
            )
        
        # Portal Session erstellen
        base_url = settings.CORS_ORIGINS.split(",")[0] if settings.CORS_ORIGINS else "http://localhost:3000"
        return_url = f"{base_url}/subscription"
        
        portal_url = await stripe_service.create_portal_session(
            customer_id=customer_id,
            return_url=return_url
        )
        
        return CreatePortalResponse(portal_url=portal_url)
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Fehler beim Erstellen der Portal Session: {str(e)}")


# =============================================================================
# WEBHOOK
# =============================================================================

@router.post("/webhook")
async def stripe_webhook(
    request: Request,
    stripe_signature: str = Header(None, alias="stripe-signature"),
):
    """
    Stripe Webhook Handler.
    
    Verarbeitet:
    - checkout.session.completed
    - customer.subscription.updated
    - customer.subscription.deleted
    - invoice.paid
    - invoice.payment_failed
    """
    if not stripe_signature:
        raise HTTPException(status_code=400, detail="Missing stripe-signature header")
    
    try:
        payload = await request.body()
        
        result = await stripe_service.handle_webhook(
            payload=payload,
            sig=stripe_signature
        )
        
        return result
        
    except ValueError as e:
        raise HTTPException(status_code=400, detail=f"Invalid payload: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Webhook error: {str(e)}")


# =============================================================================
# SUBSCRIPTION INFO
# =============================================================================

@router.get("/subscription", response_model=SubscriptionResponse)
async def get_subscription(
    current_user: CurrentUser = Depends(get_current_user),
    db = Depends(get_db),
):
    """
    Holt aktuelle Subscription-Informationen.
    """
    try:
        from ...db.supabase import get_supabase
        supabase = get_supabase()
        
        result = supabase.table("subscriptions").select("*").eq(
            "user_id", str(current_user.id)
        ).single().execute()
        
        if not result.data:
            # Fallback: Free Plan
            subscription = {
                "plan": "free",
                "status": "active",
                "current_period_end": None,
                "cancel_at": None,
                "stripe_customer_id": None,
                "stripe_subscription_id": None,
            }
        else:
            subscription = result.data
        
        return SubscriptionResponse(**subscription)
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Fehler beim Abrufen der Subscription: {str(e)}")

