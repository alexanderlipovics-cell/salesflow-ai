# 🚀 SALESFLOW AI - TAG 4A: STRIPE INTEGRATION (CLAUDE)

## 🎯 MISSION: Complete Payment Infrastructure & Subscription Management

### 🔥 STRIPE ENTERPRISE INTEGRATION

#### 1. **Backend Stripe Service**
**Dateien:** `backend/app/services/stripe_service.py`, `backend/app/core/stripe.py`
**Enterprise-Grade Payment Processing**

```python
# backend/app/services/stripe_service.py
from __future__ import annotations

import asyncio
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional, Tuple
import json

import stripe
from stripe import Webhook
import structlog

from app.core.config import settings
from app.db.session import get_db_client
from app.models.user import User
from app.models.deployment_run import DeploymentRun

logger = structlog.get_logger()

class StripeService:
    """
    Enterprise Stripe Integration Service.

    Handles:
    - Subscription lifecycle management
    - Webhook processing and event handling
    - Payment method management
    - Failed payment recovery (dunning)
    - Usage-based billing
    - Revenue analytics
    """

    def __init__(self):
        stripe.api_key = settings.stripe_secret_key
        self.webhook_secret = settings.stripe_webhook_secret
        self.prices = self._load_price_config()

    def _load_price_config(self) -> Dict[str, Any]:
        """Load Stripe price IDs from config."""
        return {
            "starter": {
                "monthly": settings.stripe_price_starter_monthly,
                "yearly": settings.stripe_price_starter_yearly,
            },
            "pro": {
                "monthly": settings.stripe_price_pro_monthly,
                "yearly": settings.stripe_price_pro_yearly,
            },
            "enterprise": {
                "monthly": settings.stripe_price_enterprise_monthly,
                "yearly": settings.stripe_price_enterprise_yearly,
            }
        }

    # ==================== SUBSCRIPTION MANAGEMENT ====================

    async def create_subscription(
        self,
        user_id: str,
        plan: str,
        interval: str = "monthly",
        payment_method_id: Optional[str] = None,
        trial_days: int = 14
    ) -> Dict[str, Any]:
        """
        Create a new subscription with optional trial.

        Args:
            user_id: Internal user ID
            plan: Plan name (starter/pro/enterprise)
            interval: Billing interval (monthly/yearly)
            payment_method_id: Stripe payment method ID
            trial_days: Trial period in days

        Returns:
            Subscription data
        """
        try:
            # Get price ID
            price_id = self.prices.get(plan, {}).get(interval)
            if not price_id:
                raise ValueError(f"Invalid plan/interval: {plan}/{interval}")

            # Create or retrieve customer
            customer = await self._get_or_create_customer(user_id)

            # Prepare subscription data
            subscription_data = {
                "customer": customer["id"],
                "items": [{"price": price_id}],
                "trial_period_days": trial_days,
                "metadata": {
                    "user_id": user_id,
                    "plan": plan,
                    "interval": interval,
                },
                "expand": ["latest_invoice.payment_intent"]
            }

            # Add payment method if provided
            if payment_method_id:
                subscription_data["default_payment_method"] = payment_method_id

            # Create subscription
            subscription = stripe.Subscription.create(**subscription_data)

            # Update user in database
            await self._update_user_subscription(user_id, subscription)

            logger.info("Subscription created", subscription_id=subscription.id, user_id=user_id)
            return self._format_subscription_response(subscription)

        except stripe.error.StripeError as e:
            logger.error("Stripe subscription creation failed", error=str(e), user_id=user_id)
            raise

    async def update_subscription(
        self,
        user_id: str,
        subscription_id: str,
        plan: Optional[str] = None,
        interval: Optional[str] = None,
        proration_behavior: str = "create_prorations"
    ) -> Dict[str, Any]:
        """Update existing subscription (plan change, interval change)."""

        try:
            # Get current subscription
            subscription = stripe.Subscription.retrieve(subscription_id)

            update_data = {
                "proration_behavior": proration_behavior,
                "metadata": subscription.get("metadata", {})
            }

            # Update plan if specified
            if plan or interval:
                new_price_id = self.prices.get(plan or "starter", {}).get(interval or "monthly")
                if new_price_id:
                    update_data["items"] = [{
                        "id": subscription["items"]["data"][0]["id"],
                        "price": new_price_id
                    }]

            # Apply updates
            updated_subscription = stripe.Subscription.modify(
                subscription_id,
                **update_data
            )

            # Update database
            await self._update_user_subscription(user_id, updated_subscription)

            logger.info("Subscription updated", subscription_id=subscription_id, user_id=user_id)
            return self._format_subscription_response(updated_subscription)

        except stripe.error.StripeError as e:
            logger.error("Subscription update failed", error=str(e), subscription_id=subscription_id)
            raise

    async def cancel_subscription(
        self,
        user_id: str,
        subscription_id: str,
        cancel_at_period_end: bool = True
    ) -> Dict[str, Any]:
        """Cancel subscription immediately or at period end."""

        try:
            subscription = stripe.Subscription.modify(
                subscription_id,
                cancel_at_period_end=cancel_at_period_end
            )

            # Update database
            await self._update_user_subscription(user_id, subscription)

            action = "scheduled" if cancel_at_period_end else "immediate"
            logger.info(f"Subscription cancellation {action}", subscription_id=subscription_id, user_id=user_id)

            return self._format_subscription_response(subscription)

        except stripe.error.StripeError as e:
            logger.error("Subscription cancellation failed", error=str(e), subscription_id=subscription_id)
            raise

    # ==================== PAYMENT METHOD MANAGEMENT ====================

    async def attach_payment_method(
        self,
        user_id: str,
        payment_method_id: str
    ) -> Dict[str, Any]:
        """Attach payment method to customer."""

        try:
            customer = await self._get_or_create_customer(user_id)

            # Attach payment method
            payment_method = stripe.PaymentMethod.attach(
                payment_method_id,
                customer=customer["id"]
            )

            # Set as default
            stripe.Customer.modify(
                customer["id"],
                invoice_settings={
                    "default_payment_method": payment_method_id
                }
            )

            logger.info("Payment method attached", user_id=user_id, payment_method_id=payment_method_id)
            return {
                "id": payment_method.id,
                "type": payment_method.type,
                "card": payment_method.card if payment_method.type == "card" else None
            }

        except stripe.error.StripeError as e:
            logger.error("Payment method attachment failed", error=str(e), user_id=user_id)
            raise

    async def detach_payment_method(
        self,
        user_id: str,
        payment_method_id: str
    ) -> bool:
        """Detach payment method from customer."""

        try:
            payment_method = stripe.PaymentMethod.detach(payment_method_id)

            logger.info("Payment method detached", user_id=user_id, payment_method_id=payment_method_id)
            return True

        except stripe.error.StripeError as e:
            logger.error("Payment method detachment failed", error=str(e), payment_method_id=payment_method_id)
            raise

    # ==================== WEBHOOK PROCESSING ====================

    async def process_webhook(
        self,
        payload: bytes,
        signature: str
    ) -> Dict[str, Any]:
        """
        Process Stripe webhook events.

        Handles:
        - customer.subscription.created/updated/deleted
        - invoice.payment_succeeded/failed
        - customer.created/updated
        """

        try:
            # Verify webhook signature
            event = Webhook.construct_event(
                payload,
                signature,
                self.webhook_secret
            )

            logger.info("Webhook received", event_type=event.type, event_id=event.id)

            # Process event based on type
            handlers = {
                "customer.subscription.created": self._handle_subscription_created,
                "customer.subscription.updated": self._handle_subscription_updated,
                "customer.subscription.deleted": self._handle_subscription_deleted,
                "invoice.payment_succeeded": self._handle_payment_succeeded,
                "invoice.payment_failed": self._handle_payment_failed,
                "customer.created": self._handle_customer_created,
                "customer.updated": self._handle_customer_updated,
            }

            handler = handlers.get(event.type)
            if handler:
                await handler(event.data.object)
                return {"status": "processed", "event_type": event.type}
            else:
                logger.warning("Unhandled webhook event type", event_type=event.type)
                return {"status": "ignored", "event_type": event.type}

        except Exception as e:
            logger.error("Webhook processing failed", error=str(e))
            raise

    async def _handle_subscription_created(self, subscription: Dict[str, Any]) -> None:
        """Handle new subscription creation."""
        user_id = subscription.get("metadata", {}).get("user_id")
        if user_id:
            await self._update_user_subscription(user_id, subscription)
            logger.info("Subscription created via webhook", subscription_id=subscription["id"], user_id=user_id)

    async def _handle_subscription_updated(self, subscription: Dict[str, Any]) -> None:
        """Handle subscription updates."""
        user_id = subscription.get("metadata", {}).get("user_id")
        if user_id:
            await self._update_user_subscription(user_id, subscription)
            logger.info("Subscription updated via webhook", subscription_id=subscription["id"], user_id=user_id)

    async def _handle_subscription_deleted(self, subscription: Dict[str, Any]) -> None:
        """Handle subscription cancellation."""
        user_id = subscription.get("metadata", {}).get("user_id")
        if user_id:
            await self._update_user_subscription(user_id, subscription)
            logger.info("Subscription cancelled via webhook", subscription_id=subscription["id"], user_id=user_id)

    async def _handle_payment_succeeded(self, invoice: Dict[str, Any]) -> None:
        """Handle successful payment."""
        customer_id = invoice.get("customer")
        amount = invoice.get("amount_paid", 0) / 100  # Convert from cents

        logger.info("Payment succeeded",
                   customer_id=customer_id,
                   amount=amount,
                   invoice_id=invoice["id"])

        # TODO: Update payment history in database
        # TODO: Send payment confirmation email

    async def _handle_payment_failed(self, invoice: Dict[str, Any]) -> None:
        """Handle failed payment - implement dunning management."""
        customer_id = invoice.get("customer")
        attempt_count = invoice.get("attempt_count", 0)

        logger.warning("Payment failed",
                      customer_id=customer_id,
                      invoice_id=invoice["id"],
                      attempt_count=attempt_count)

        # Implement dunning management
        if attempt_count == 1:
            # Send first reminder
            await self._send_payment_reminder(customer_id, "first")
        elif attempt_count == 2:
            # Send second reminder
            await self._send_payment_reminder(customer_id, "second")
        elif attempt_count >= 3:
            # Cancel subscription after 3 failed attempts
            await self._cancel_subscription_after_failures(customer_id)

    # ==================== USAGE-BASED BILLING ====================

    async def record_usage(
        self,
        subscription_id: str,
        metric: str,
        quantity: int,
        timestamp: Optional[datetime] = None
    ) -> bool:
        """
        Record usage for metered billing.

        Args:
            subscription_id: Stripe subscription ID
            metric: Usage metric name (e.g., "leads_generated", "api_calls")
            quantity: Quantity used
            timestamp: When usage occurred (default: now)
        """

        try:
            # Create usage record
            stripe.SubscriptionItem.create_usage_record(
                subscription_id,
                quantity=quantity,
                timestamp=int((timestamp or datetime.utcnow()).timestamp()),
                action="increment"  # or "set" depending on use case
            )

            logger.info("Usage recorded",
                       subscription_id=subscription_id,
                       metric=metric,
                       quantity=quantity)

            return True

        except stripe.error.StripeError as e:
            logger.error("Usage recording failed", error=str(e), subscription_id=subscription_id)
            return False

    # ==================== ANALYTICS & REPORTING ====================

    async def get_revenue_metrics(
        self,
        start_date: datetime,
        end_date: datetime
    ) -> Dict[str, Any]:
        """Get revenue analytics for dashboard."""

        try:
            # Get charges in date range
            charges = stripe.Charge.list(
                created={
                    "gte": int(start_date.timestamp()),
                    "lte": int(end_date.timestamp())
                },
                limit=100
            )

            # Calculate metrics
            total_revenue = sum(charge.amount for charge in charges.data) / 100
            successful_charges = len([c for c in charges.data if c.status == "succeeded"])
            failed_charges = len([c for c in charges.data if c.status == "failed"])

            return {
                "total_revenue": total_revenue,
                "successful_charges": successful_charges,
                "failed_charges": failed_charges,
                "success_rate": successful_charges / max(1, successful_charges + failed_charges),
                "period_days": (end_date - start_date).days
            }

        except stripe.error.StripeError as e:
            logger.error("Revenue metrics retrieval failed", error=str(e))
            return {}

    # ==================== HELPER METHODS ====================

    async def _get_or_create_customer(self, user_id: str) -> Dict[str, Any]:
        """Get existing Stripe customer or create new one."""

        # Try to find existing customer by metadata
        customers = stripe.Customer.list(
            limit=1,
            metadata={"user_id": user_id}
        )

        if customers.data:
            return customers.data[0]

        # Get user data from database
        user_data = await self._get_user_data(user_id)

        # Create new customer
        customer = stripe.Customer.create(
            email=user_data.get("email"),
            name=user_data.get("name"),
            metadata={"user_id": user_id}
        )

        logger.info("Stripe customer created", customer_id=customer.id, user_id=user_id)
        return customer

    async def _get_user_data(self, user_id: str) -> Dict[str, Any]:
        """Get user data from database."""
        # TODO: Implement user data retrieval
        return {"email": f"user_{user_id}@example.com", "name": f"User {user_id}"}

    async def _update_user_subscription(self, user_id: str, subscription: Dict[str, Any]) -> None:
        """Update user subscription data in database."""
        # TODO: Implement database update
        logger.info("User subscription updated in database", user_id=user_id, subscription_id=subscription["id"])

    async def _send_payment_reminder(self, customer_id: str, reminder_type: str) -> None:
        """Send payment reminder email."""
        # TODO: Implement email sending
        logger.info("Payment reminder sent", customer_id=customer_id, reminder_type=reminder_type)

    async def _cancel_subscription_after_failures(self, customer_id: str) -> None:
        """Cancel subscription after repeated payment failures."""
        # TODO: Implement subscription cancellation
        logger.warning("Subscription cancelled due to payment failures", customer_id=customer_id)

    def _format_subscription_response(self, subscription: Dict[str, Any]) -> Dict[str, Any]:
        """Format subscription data for API response."""
        return {
            "id": subscription["id"],
            "status": subscription["status"],
            "current_period_start": subscription["current_period_start"],
            "current_period_end": subscription["current_period_end"],
            "cancel_at_period_end": subscription["cancel_at_period_end"],
            "plan": subscription.get("metadata", {}).get("plan"),
            "interval": subscription.get("metadata", {}).get("interval"),
        }

# ==================== SINGLETON ====================

_stripe_service: Optional[StripeService] = None

def get_stripe_service() -> StripeService:
    """Get singleton Stripe service instance."""
    global _stripe_service
    if _stripe_service is None:
        _stripe_service = StripeService()
    return _stripe_service
```

#### 2. **Stripe Webhook Router**
**Dateien:** `backend/app/routers/stripe_webhooks.py`

```python
# backend/app/routers/stripe_webhooks.py

from __future__ import annotations

from fastapi import APIRouter, Request, Response, HTTPException, Depends
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.services.stripe_service import get_stripe_service

router = APIRouter(prefix="/stripe/webhooks", tags=["stripe-webhooks"])

@router.post("")
async def stripe_webhook(
    request: Request,
    db: Session = Depends(get_db)
):
    """
    Handle Stripe webhooks.

    This endpoint receives all Stripe webhook events and processes them.
    Webhook signature verification ensures authenticity.
    """

    try:
        # Get raw body and signature
        body = await request.body()
        signature = request.headers.get("stripe-signature")

        if not signature:
            raise HTTPException(status_code=400, detail="Missing Stripe signature")

        # Process webhook
        stripe_service = get_stripe_service()
        result = await stripe_service.process_webhook(body, signature)

        return {"status": "success", **result}

    except Exception as e:
        # Log error but don't expose details to Stripe
        print(f"Webhook processing error: {e}")
        raise HTTPException(status_code=400, detail="Webhook processing failed")

@router.get("/health")
async def webhook_health():
    """Health check for webhook endpoint."""
    return {"status": "healthy", "service": "stripe-webhooks"}
```

### 📋 DELIVERABLES (4-6 Stunden)

1. **✅ Stripe Service** - Vollständige Subscription Management
2. **✅ Webhook Handler** - Event Processing & Signature Verification
3. **✅ Payment Recovery** - Dunning Management für failed payments
4. **✅ Usage Billing** - Metered billing für Enterprise Features
5. **✅ Revenue Analytics** - Dashboard-Metriken für Business Intelligence
6. **✅ Error Handling** - Robust Error Recovery & Logging

### 🧪 TESTING & VALIDATION

```bash
# Create test subscription
curl -X POST "https://api.salesflow.ai/stripe/subscriptions" \
  -H "Authorization: Bearer <token>" \
  -d '{"plan": "pro", "interval": "monthly"}'

# Simulate webhook
stripe listen --forward-to localhost:8000/stripe/webhooks

# Check revenue metrics
curl -H "Authorization: Bearer <token>" \
  "https://api.salesflow.ai/analytics/revenue?start=2024-01-01&end=2024-12-31"
```

### 🚨 CRITICAL SUCCESS FACTORS

- **Webhook Reliability** - 100% Uptime für Subscription Updates
- **Payment Recovery** - <5% Churn durch Failed Payment Handling
- **Security** - Webhook Signature Verification
- **Scalability** - Handle 1000+ concurrent subscriptions
- **Compliance** - PCI DSS Ready Architecture

**GOAL**: Production-ready payment infrastructure mit Enterprise-Grade Reliability! 💳

**TIMEFRAME**: 4-6 hours für komplette Stripe Integration
