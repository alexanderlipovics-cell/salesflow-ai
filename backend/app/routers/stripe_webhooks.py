"""
============================================
🔔 SALESFLOW AI - STRIPE WEBHOOK ROUTER
============================================
Secure webhook endpoint for Stripe events.

Features:
- Signature verification
- Idempotency handling
- Error recovery
- Event logging
"""

from fastapi import APIRouter, Request, HTTPException, Header
from fastapi.responses import JSONResponse
import structlog

from app.services.stripe_service import get_stripe_service

logger = structlog.get_logger()

router = APIRouter(prefix="/webhooks/stripe", tags=["webhooks"])


@router.post("")
async def stripe_webhook(
    request: Request,
    stripe_signature: str = Header(None, alias="stripe-signature")
):
    """
    Handle Stripe webhook events.
    
    This endpoint receives all configured Stripe webhook events:
    - Subscription lifecycle (created, updated, deleted)
    - Payment events (succeeded, failed)
    - Customer events
    - Invoice events
    
    Webhook signature is verified to ensure authenticity.
    """
    
    if not stripe_signature:
        logger.warning("Webhook received without signature")
        raise HTTPException(status_code=400, detail="Missing Stripe signature")
    
    try:
        # Get raw body for signature verification
        body = await request.body()
        
        # Process webhook
        stripe_service = get_stripe_service()
        result = await stripe_service.process_webhook(body, stripe_signature)
        
        logger.info(
            "Webhook processed successfully",
            event_type=result.get("event_type"),
            status=result.get("status")
        )
        
        return JSONResponse(
            status_code=200,
            content={"received": True, **result}
        )
        
    except ValueError as e:
        # Signature verification failed
        logger.error("Webhook signature verification failed", error=str(e))
        raise HTTPException(status_code=400, detail="Invalid signature")
        
    except Exception as e:
        # Log error but return 200 to prevent Stripe retries for non-recoverable errors
        logger.error("Webhook processing error", error=str(e))
        
        # Return 200 for idempotency - Stripe will retry on 4xx/5xx
        # Only return error for truly unrecoverable issues
        return JSONResponse(
            status_code=200,
            content={"received": True, "error": str(e)}
        )


@router.get("/health")
async def webhook_health():
    """Health check for webhook endpoint."""
    return {
        "status": "healthy",
        "service": "stripe-webhooks",
        "endpoint": "/webhooks/stripe"
    }


# ==================== WEBHOOK EVENT TYPES ====================
"""
Configured webhook events (set in Stripe Dashboard):

Subscription Events:
- customer.subscription.created
- customer.subscription.updated
- customer.subscription.deleted
- customer.subscription.trial_will_end

Payment Events:
- invoice.payment_succeeded
- invoice.payment_failed
- invoice.finalized
- invoice.upcoming

Customer Events:
- customer.created
- customer.updated
- customer.deleted

Payment Method Events:
- payment_method.attached
- payment_method.detached

Checkout Events:
- checkout.session.completed
- checkout.session.expired
"""
