"""
============================================
💳 SALESFLOW AI - STRIPE PAYMENT SERVICE
============================================
Enterprise-grade payment infrastructure with:
- Subscription lifecycle management
- Webhook processing & verification
- Payment method management
- Dunning (failed payment recovery)
- Usage-based billing
- Revenue analytics
- Multi-currency support
"""

from __future__ import annotations

import asyncio
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional, Tuple
from decimal import Decimal
from enum import Enum
import json

import stripe
from stripe import Webhook
from stripe.error import StripeError, SignatureVerificationError
import structlog

from pydantic import BaseModel, EmailStr, Field

logger = structlog.get_logger()

# Import Email Service for automated welcome sequences
from app.services.email_service import EmailService


# ==================== CONFIGURATION ====================

class StripeConfig:
    """Stripe configuration from environment."""
    
    def __init__(self):
        from app.core.config import settings
        
        self.secret_key = settings.stripe_secret_key
        self.publishable_key = settings.stripe_publishable_key
        self.webhook_secret = settings.stripe_webhook_secret
        
        # Price IDs for each plan
        self.prices = {
            "starter": {
                "monthly": settings.stripe_price_starter_monthly,
                "yearly": settings.stripe_price_starter_yearly,
                "features": {
                    "leads_limit": 500,
                    "users_limit": 1,
                    "ai_credits": 100,
                    "integrations": ["facebook"],
                }
            },
            "pro": {
                "monthly": settings.stripe_price_pro_monthly,
                "yearly": settings.stripe_price_pro_yearly,
                "features": {
                    "leads_limit": 5000,
                    "users_limit": 5,
                    "ai_credits": 1000,
                    "integrations": ["facebook", "instagram", "linkedin"],
                }
            },
            "enterprise": {
                "monthly": settings.stripe_price_enterprise_monthly,
                "yearly": settings.stripe_price_enterprise_yearly,
                "features": {
                    "leads_limit": -1,  # Unlimited
                    "users_limit": -1,
                    "ai_credits": -1,
                    "integrations": ["facebook", "instagram", "linkedin", "custom"],
                }
            }
        }
        
        # Trial configuration
        self.trial_days = 14
        
        # Dunning configuration
        self.max_payment_attempts = 3
        self.dunning_intervals = [1, 3, 7]  # Days after failed payment


# ==================== ENUMS ====================

class SubscriptionStatus(str, Enum):
    ACTIVE = "active"
    TRIALING = "trialing"
    PAST_DUE = "past_due"
    CANCELED = "canceled"
    UNPAID = "unpaid"
    INCOMPLETE = "incomplete"


class PaymentStatus(str, Enum):
    SUCCEEDED = "succeeded"
    PENDING = "pending"
    FAILED = "failed"
    REFUNDED = "refunded"


class PlanTier(str, Enum):
    STARTER = "starter"
    PRO = "pro"
    ENTERPRISE = "enterprise"


class BillingInterval(str, Enum):
    MONTHLY = "monthly"
    YEARLY = "yearly"


# ==================== MODELS ====================

class SubscriptionCreate(BaseModel):
    """Request model for creating subscription."""
    plan: PlanTier
    interval: BillingInterval = BillingInterval.MONTHLY
    payment_method_id: Optional[str] = None
    coupon_code: Optional[str] = None
    trial_days: Optional[int] = None


class SubscriptionUpdate(BaseModel):
    """Request model for updating subscription."""
    plan: Optional[PlanTier] = None
    interval: Optional[BillingInterval] = None
    proration_behavior: str = "create_prorations"


class PaymentMethodCreate(BaseModel):
    """Request model for adding payment method."""
    payment_method_id: str
    set_default: bool = True


class SubscriptionResponse(BaseModel):
    """Response model for subscription data."""
    id: str
    status: SubscriptionStatus
    plan: PlanTier
    interval: BillingInterval
    current_period_start: datetime
    current_period_end: datetime
    cancel_at_period_end: bool
    trial_end: Optional[datetime] = None
    features: Dict[str, Any]


class PaymentMethodResponse(BaseModel):
    """Response model for payment method."""
    id: str
    type: str
    card: Optional[Dict[str, Any]] = None
    is_default: bool = False


class InvoiceResponse(BaseModel):
    """Response model for invoice."""
    id: str
    status: str
    amount_due: Decimal
    amount_paid: Decimal
    currency: str
    created: datetime
    invoice_pdf: Optional[str] = None


# ==================== STRIPE SERVICE ====================

class StripeService:
    """
    Enterprise Stripe Integration Service.
    
    Features:
    - Subscription lifecycle management
    - Webhook processing & signature verification
    - Payment method management
    - Dunning management (failed payment recovery)
    - Usage-based billing for metered features
    - Revenue analytics & reporting
    - Multi-currency support
    """
    
    def __init__(self, db=None):
        self.config = StripeConfig()
        stripe.api_key = self.config.secret_key
        self.db = db
        self.email_service = EmailService(db) if db else None

        logger.info("Stripe service initialized")
    
    # ==================== CUSTOMER MANAGEMENT ====================
    
    async def get_or_create_customer(
        self,
        user_id: str,
        email: str,
        name: Optional[str] = None,
        metadata: Optional[Dict] = None
    ) -> stripe.Customer:
        """
        Get existing Stripe customer or create new one.
        
        Args:
            user_id: Internal user ID
            email: User email
            name: User name
            metadata: Additional metadata
            
        Returns:
            Stripe Customer object
        """
        try:
            # Search for existing customer
            customers = stripe.Customer.search(
                query=f'metadata["user_id"]:"{user_id}"',
                limit=1
            )
            
            if customers.data:
                return customers.data[0]
            
            # Create new customer
            customer_data = {
                "email": email,
                "metadata": {
                    "user_id": user_id,
                    **(metadata or {})
                }
            }
            
            if name:
                customer_data["name"] = name
            
            customer = stripe.Customer.create(**customer_data)
            
            logger.info(
                "Stripe customer created",
                customer_id=customer.id,
                user_id=user_id
            )
            
            return customer
            
        except StripeError as e:
            logger.error("Failed to get/create customer", error=str(e), user_id=user_id)
            raise
    
    async def update_customer(
        self,
        customer_id: str,
        email: Optional[str] = None,
        name: Optional[str] = None,
        metadata: Optional[Dict] = None
    ) -> stripe.Customer:
        """Update customer information."""
        try:
            update_data = {}
            if email:
                update_data["email"] = email
            if name:
                update_data["name"] = name
            if metadata:
                update_data["metadata"] = metadata
            
            customer = stripe.Customer.modify(customer_id, **update_data)
            
            logger.info("Customer updated", customer_id=customer_id)
            return customer
            
        except StripeError as e:
            logger.error("Failed to update customer", error=str(e), customer_id=customer_id)
            raise
    
    # ==================== SUBSCRIPTION MANAGEMENT ====================
    
    async def create_subscription(
        self,
        user_id: str,
        email: str,
        data: SubscriptionCreate,
        name: Optional[str] = None
    ) -> SubscriptionResponse:
        """
        Create a new subscription.
        
        Args:
            user_id: Internal user ID
            email: User email
            data: Subscription creation data
            name: User name
            
        Returns:
            SubscriptionResponse with subscription details
        """
        try:
            # Get or create customer
            customer = await self.get_or_create_customer(user_id, email, name)
            
            # Get price ID
            price_id = self.config.prices.get(data.plan.value, {}).get(data.interval.value)
            if not price_id:
                raise ValueError(f"Invalid plan/interval: {data.plan}/{data.interval}")
            
            # Prepare subscription data
            subscription_data = {
                "customer": customer.id,
                "items": [{"price": price_id}],
                "metadata": {
                    "user_id": user_id,
                    "plan": data.plan.value,
                    "interval": data.interval.value,
                },
                "payment_behavior": "default_incomplete",
                "payment_settings": {
                    "save_default_payment_method": "on_subscription"
                },
                "expand": ["latest_invoice.payment_intent", "pending_setup_intent"]
            }
            
            # Add trial period
            trial_days = data.trial_days if data.trial_days is not None else self.config.trial_days
            if trial_days > 0:
                subscription_data["trial_period_days"] = trial_days
            
            # Add payment method if provided
            if data.payment_method_id:
                # Attach payment method first
                await self.attach_payment_method(
                    customer.id,
                    data.payment_method_id,
                    set_default=True
                )
                subscription_data["default_payment_method"] = data.payment_method_id
            
            # Add coupon if provided
            if data.coupon_code:
                subscription_data["coupon"] = data.coupon_code
            
            # Create subscription
            subscription = stripe.Subscription.create(**subscription_data)
            
            logger.info(
                "Subscription created",
                subscription_id=subscription.id,
                user_id=user_id,
                plan=data.plan.value
            )
            
            return self._format_subscription(subscription)
            
        except StripeError as e:
            logger.error(
                "Subscription creation failed",
                error=str(e),
                user_id=user_id,
                plan=data.plan.value
            )
            raise
    
    async def get_subscription(
        self,
        subscription_id: str
    ) -> SubscriptionResponse:
        """Get subscription details."""
        try:
            subscription = stripe.Subscription.retrieve(
                subscription_id,
                expand=["latest_invoice", "default_payment_method"]
            )
            return self._format_subscription(subscription)
            
        except StripeError as e:
            logger.error("Failed to get subscription", error=str(e), subscription_id=subscription_id)
            raise
    
    async def get_customer_subscriptions(
        self,
        customer_id: str,
        status: Optional[str] = None
    ) -> List[SubscriptionResponse]:
        """Get all subscriptions for a customer."""
        try:
            params = {"customer": customer_id, "limit": 100}
            if status:
                params["status"] = status
            
            subscriptions = stripe.Subscription.list(**params)
            
            return [self._format_subscription(sub) for sub in subscriptions.data]
            
        except StripeError as e:
            logger.error("Failed to get subscriptions", error=str(e), customer_id=customer_id)
            raise
    
    async def update_subscription(
        self,
        subscription_id: str,
        data: SubscriptionUpdate
    ) -> SubscriptionResponse:
        """
        Update subscription (plan upgrade/downgrade).
        
        Handles prorations automatically.
        """
        try:
            subscription = stripe.Subscription.retrieve(subscription_id)
            
            update_data = {
                "proration_behavior": data.proration_behavior,
            }
            
            # Get new price if plan or interval changed
            plan = data.plan.value if data.plan else subscription.metadata.get("plan")
            interval = data.interval.value if data.interval else subscription.metadata.get("interval")
            
            new_price_id = self.config.prices.get(plan, {}).get(interval)
            if new_price_id:
                update_data["items"] = [{
                    "id": subscription["items"]["data"][0]["id"],
                    "price": new_price_id
                }]
                update_data["metadata"] = {
                    **subscription.metadata,
                    "plan": plan,
                    "interval": interval
                }
            
            updated_subscription = stripe.Subscription.modify(
                subscription_id,
                **update_data
            )
            
            logger.info(
                "Subscription updated",
                subscription_id=subscription_id,
                new_plan=plan,
                new_interval=interval
            )
            
            return self._format_subscription(updated_subscription)
            
        except StripeError as e:
            logger.error("Subscription update failed", error=str(e), subscription_id=subscription_id)
            raise
    
    async def cancel_subscription(
        self,
        subscription_id: str,
        cancel_immediately: bool = False,
        cancellation_reason: Optional[str] = None
    ) -> SubscriptionResponse:
        """
        Cancel subscription.
        
        Args:
            subscription_id: Stripe subscription ID
            cancel_immediately: If True, cancel now; else cancel at period end
            cancellation_reason: Optional reason for analytics
        """
        try:
            if cancel_immediately:
                subscription = stripe.Subscription.delete(subscription_id)
            else:
                update_data = {"cancel_at_period_end": True}
                if cancellation_reason:
                    update_data["metadata"] = {"cancellation_reason": cancellation_reason}
                
                subscription = stripe.Subscription.modify(subscription_id, **update_data)
            
            action = "cancelled immediately" if cancel_immediately else "scheduled for cancellation"
            logger.info(
                f"Subscription {action}",
                subscription_id=subscription_id,
                reason=cancellation_reason
            )
            
            return self._format_subscription(subscription)
            
        except StripeError as e:
            logger.error("Subscription cancellation failed", error=str(e), subscription_id=subscription_id)
            raise
    
    async def reactivate_subscription(
        self,
        subscription_id: str
    ) -> SubscriptionResponse:
        """Reactivate a subscription that was scheduled for cancellation."""
        try:
            subscription = stripe.Subscription.modify(
                subscription_id,
                cancel_at_period_end=False
            )
            
            logger.info("Subscription reactivated", subscription_id=subscription_id)
            return self._format_subscription(subscription)
            
        except StripeError as e:
            logger.error("Subscription reactivation failed", error=str(e), subscription_id=subscription_id)
            raise
    
    # ==================== PAYMENT METHOD MANAGEMENT ====================
    
    async def attach_payment_method(
        self,
        customer_id: str,
        payment_method_id: str,
        set_default: bool = True
    ) -> PaymentMethodResponse:
        """Attach payment method to customer."""
        try:
            # Attach to customer
            payment_method = stripe.PaymentMethod.attach(
                payment_method_id,
                customer=customer_id
            )
            
            # Set as default if requested
            if set_default:
                stripe.Customer.modify(
                    customer_id,
                    invoice_settings={
                        "default_payment_method": payment_method_id
                    }
                )
            
            logger.info(
                "Payment method attached",
                customer_id=customer_id,
                payment_method_id=payment_method_id,
                is_default=set_default
            )
            
            return self._format_payment_method(payment_method, is_default=set_default)
            
        except StripeError as e:
            logger.error("Payment method attachment failed", error=str(e))
            raise
    
    async def detach_payment_method(
        self,
        payment_method_id: str
    ) -> bool:
        """Detach payment method from customer."""
        try:
            stripe.PaymentMethod.detach(payment_method_id)
            logger.info("Payment method detached", payment_method_id=payment_method_id)
            return True
            
        except StripeError as e:
            logger.error("Payment method detachment failed", error=str(e))
            raise
    
    async def list_payment_methods(
        self,
        customer_id: str,
        type: str = "card"
    ) -> List[PaymentMethodResponse]:
        """List customer's payment methods."""
        try:
            # Get customer to find default
            customer = stripe.Customer.retrieve(customer_id)
            default_pm_id = customer.invoice_settings.default_payment_method
            
            payment_methods = stripe.PaymentMethod.list(
                customer=customer_id,
                type=type
            )
            
            return [
                self._format_payment_method(pm, is_default=(pm.id == default_pm_id))
                for pm in payment_methods.data
            ]
            
        except StripeError as e:
            logger.error("Failed to list payment methods", error=str(e))
            raise
    
    # ==================== WEBHOOK PROCESSING ====================
    
    async def process_webhook(
        self,
        payload: bytes,
        signature: str
    ) -> Dict[str, Any]:
        """
        Process and verify Stripe webhook.
        
        Args:
            payload: Raw request body
            signature: Stripe-Signature header
            
        Returns:
            Processing result
        """
        try:
            # Verify signature
            event = Webhook.construct_event(
                payload,
                signature,
                self.config.webhook_secret
            )
            
            logger.info("Webhook received", event_type=event.type, event_id=event.id)
            
            # Route to appropriate handler
            handlers = {
                # Subscription events
                "customer.subscription.created": self._handle_subscription_created,
                "customer.subscription.updated": self._handle_subscription_updated,
                "customer.subscription.deleted": self._handle_subscription_deleted,
                "customer.subscription.trial_will_end": self._handle_trial_ending,
                
                # Payment events
                "invoice.payment_succeeded": self._handle_payment_succeeded,
                "invoice.payment_failed": self._handle_payment_failed,
                "invoice.finalized": self._handle_invoice_finalized,
                
                # Customer events
                "customer.created": self._handle_customer_created,
                "customer.updated": self._handle_customer_updated,
                "customer.deleted": self._handle_customer_deleted,
                
                # Payment method events
                "payment_method.attached": self._handle_payment_method_attached,
                "payment_method.detached": self._handle_payment_method_detached,
                
                # Checkout events
                "checkout.session.completed": self._handle_checkout_completed,
            }
            
            handler = handlers.get(event.type)
            if handler:
                await handler(event.data.object)
                return {"status": "processed", "event_type": event.type, "event_id": event.id}
            else:
                logger.debug("Unhandled webhook event", event_type=event.type)
                return {"status": "ignored", "event_type": event.type}
            
        except SignatureVerificationError as e:
            logger.error("Webhook signature verification failed", error=str(e))
            raise ValueError("Invalid webhook signature")
        except Exception as e:
            logger.error("Webhook processing failed", error=str(e))
            raise
    
    async def _handle_subscription_created(self, subscription: Dict) -> None:
        """Handle subscription.created event."""
        user_id = subscription.get("metadata", {}).get("user_id")
        logger.info(
            "Subscription created webhook",
            subscription_id=subscription["id"],
            user_id=user_id,
            status=subscription["status"]
        )
        # Update user in database
        await self._update_user_subscription_status(user_id, subscription)

        # Trigger automated welcome sequence
        if user_id and self.email_service:
            try:
                # Get user data for personalization
                user_data = await self._get_user_data_for_email(user_id)
                if user_data:
                    await self.email_service.send_welcome_sequence(user_id, user_data)
                    logger.info("Welcome sequence triggered for new subscriber", user_id=user_id)
            except Exception as e:
                logger.error("Failed to trigger welcome sequence", user_id=user_id, error=str(e))

    async def _get_user_data_for_email(self, user_id: str) -> Optional[Dict[str, Any]]:
        """Get user data for email personalization."""
        try:
            # TODO: Fetch from actual user database
            # For now, return basic data
            return {
                "name": f"User {user_id[:8]}",
                "company": "Your Company",
                "role": "Sales Professional",
                "source": "stripe_checkout"
            }
        except Exception as e:
            logger.warning("Failed to get user data for email", user_id=user_id, error=str(e))
            return None

    async def _handle_subscription_updated(self, subscription: Dict) -> None:
        """Handle subscription.updated event."""
        user_id = subscription.get("metadata", {}).get("user_id")
        logger.info(
            "Subscription updated webhook",
            subscription_id=subscription["id"],
            user_id=user_id,
            status=subscription["status"]
        )
        await self._update_user_subscription_status(user_id, subscription)
    
    async def _handle_subscription_deleted(self, subscription: Dict) -> None:
        """Handle subscription.deleted event."""
        user_id = subscription.get("metadata", {}).get("user_id")
        subscription_id = subscription["id"]
        
        logger.info(
            "Subscription deleted webhook",
            subscription_id=subscription_id,
            user_id=user_id
        )
        
        try:
            from app.supabase_client import get_supabase_client
            supabase = get_supabase_client()
            
            # Downgrade to free
            supabase.table("users").update({
                "plan_tier": "free",
                "subscription_status": "cancelled",
                "updated_at": datetime.utcnow().isoformat()
            }).eq("subscription_id", subscription_id).execute()
            
            # Deactivate addons
            supabase.table("user_addons").update({
                "is_active": False,
                "updated_at": datetime.utcnow().isoformat()
            }).eq("stripe_subscription_id", subscription_id).execute()
            
            logger.info(f"User {user_id} downgraded to free plan")
        except Exception as e:
            logger.error(f"Failed to handle subscription deletion: {e}", user_id=user_id)
        
        # TODO: Send cancellation email
    
    async def _handle_trial_ending(self, subscription: Dict) -> None:
        """Handle trial_will_end event (3 days before trial ends)."""
        user_id = subscription.get("metadata", {}).get("user_id")
        trial_end = datetime.fromtimestamp(subscription["trial_end"])
        
        logger.info(
            "Trial ending soon",
            subscription_id=subscription["id"],
            user_id=user_id,
            trial_end=trial_end.isoformat()
        )
        # TODO: Send trial ending email
    
    async def _handle_payment_succeeded(self, invoice: Dict) -> None:
        """Handle successful payment."""
        customer_id = invoice.get("customer")
        amount = Decimal(invoice.get("amount_paid", 0)) / 100
        
        logger.info(
            "Payment succeeded",
            invoice_id=invoice["id"],
            customer_id=customer_id,
            amount=float(amount),
            currency=invoice.get("currency", "eur").upper()
        )
        
        # TODO: Record payment in database
        # TODO: Send payment receipt email
        # TODO: Update user credits/limits if applicable
    
    async def _handle_payment_failed(self, invoice: Dict) -> None:
        """Handle failed payment - implement dunning."""
        customer_id = invoice.get("customer")
        subscription_id = invoice.get("subscription")
        attempt_count = invoice.get("attempt_count", 0)
        
        logger.warning(
            "Payment failed",
            invoice_id=invoice["id"],
            customer_id=customer_id,
            subscription_id=subscription_id,
            attempt_count=attempt_count
        )
        
        # Dunning management
        await self._process_dunning(customer_id, subscription_id, attempt_count)
    
    async def _handle_invoice_finalized(self, invoice: Dict) -> None:
        """Handle invoice finalization."""
        logger.info(
            "Invoice finalized",
            invoice_id=invoice["id"],
            amount=invoice.get("amount_due", 0) / 100
        )
    
    async def _handle_customer_created(self, customer: Dict) -> None:
        """Handle customer.created event."""
        logger.info("Customer created", customer_id=customer["id"])
    
    async def _handle_customer_updated(self, customer: Dict) -> None:
        """Handle customer.updated event."""
        logger.info("Customer updated", customer_id=customer["id"])
    
    async def _handle_customer_deleted(self, customer: Dict) -> None:
        """Handle customer.deleted event."""
        logger.info("Customer deleted", customer_id=customer["id"])
    
    async def _handle_payment_method_attached(self, payment_method: Dict) -> None:
        """Handle payment_method.attached event."""
        logger.info(
            "Payment method attached",
            payment_method_id=payment_method["id"],
            customer_id=payment_method.get("customer")
        )
    
    async def _handle_payment_method_detached(self, payment_method: Dict) -> None:
        """Handle payment_method.detached event."""
        logger.info("Payment method detached", payment_method_id=payment_method["id"])
    
    async def _handle_checkout_completed(self, session: Dict) -> None:
        """Handle checkout.session.completed event."""
        try:
            from app.supabase_client import get_supabase_client
            supabase = get_supabase_client()
            
            user_id = session.get("metadata", {}).get("user_id")
            plan_name = session.get("metadata", {}).get("plan_name")
            addon_name = session.get("metadata", {}).get("addon_name")
            subscription_id = session.get("subscription")
            
            logger.info(
                "Checkout session completed",
                session_id=session["id"],
                user_id=user_id,
                plan_name=plan_name,
                addon_name=addon_name
            )
            
            if user_id and plan_name:
                # Update user plan
                supabase.table("users").update({
                    "plan_tier": plan_name,
                    "subscription_id": subscription_id,
                    "subscription_status": "active",
                    "updated_at": datetime.utcnow().isoformat()
                }).eq("id", user_id).execute()
                logger.info(f"User {user_id} upgraded to {plan_name}")
                
            elif user_id and addon_name:
                # Add addon to user
                supabase.table("user_addons").insert({
                    "user_id": user_id,
                    "addon_name": addon_name,
                    "stripe_subscription_id": subscription_id,
                    "is_active": True,
                    "created_at": datetime.utcnow().isoformat(),
                    "updated_at": datetime.utcnow().isoformat()
                }).execute()
                logger.info(f"User {user_id} purchased addon {addon_name}")
                
        except Exception as e:
            logger.error(f"Failed to handle checkout completion: {e}", exc_info=True)
    
    # ==================== DUNNING MANAGEMENT ====================
    
    async def _process_dunning(
        self,
        customer_id: str,
        subscription_id: str,
        attempt_count: int
    ) -> None:
        """
        Process dunning for failed payments.
        
        Dunning flow:
        1. First failure: Send reminder email
        2. Second failure: Send urgent reminder
        3. Third failure: Final warning + grace period
        4. Fourth failure: Cancel subscription
        """
        if attempt_count == 1:
            await self._send_payment_reminder(customer_id, "first")
        elif attempt_count == 2:
            await self._send_payment_reminder(customer_id, "second")
        elif attempt_count == 3:
            await self._send_payment_reminder(customer_id, "final")
        elif attempt_count >= self.config.max_payment_attempts:
            await self._cancel_subscription_for_nonpayment(subscription_id)
    
    async def _send_payment_reminder(
        self,
        customer_id: str,
        reminder_type: str
    ) -> None:
        """Send payment reminder email."""
        # TODO: Implement email sending
        logger.info(
            "Payment reminder sent",
            customer_id=customer_id,
            reminder_type=reminder_type
        )
    
    async def _cancel_subscription_for_nonpayment(
        self,
        subscription_id: str
    ) -> None:
        """Cancel subscription after max payment attempts."""
        try:
            await self.cancel_subscription(
                subscription_id,
                cancel_immediately=True,
                cancellation_reason="payment_failed"
            )
            logger.warning(
                "Subscription cancelled for non-payment",
                subscription_id=subscription_id
            )
        except Exception as e:
            logger.error(
                "Failed to cancel subscription for non-payment",
                error=str(e),
                subscription_id=subscription_id
            )
    
    # ==================== USAGE-BASED BILLING ====================
    
    async def record_usage(
        self,
        subscription_item_id: str,
        quantity: int,
        timestamp: Optional[datetime] = None,
        action: str = "increment"
    ) -> bool:
        """
        Record usage for metered billing.
        
        Args:
            subscription_item_id: Subscription item ID (for metered price)
            quantity: Usage quantity
            timestamp: When usage occurred
            action: 'increment' or 'set'
        """
        try:
            stripe.SubscriptionItem.create_usage_record(
                subscription_item_id,
                quantity=quantity,
                timestamp=int((timestamp or datetime.utcnow()).timestamp()),
                action=action
            )
            
            logger.info(
                "Usage recorded",
                subscription_item_id=subscription_item_id,
                quantity=quantity,
                action=action
            )
            return True
            
        except StripeError as e:
            logger.error("Usage recording failed", error=str(e))
            return False
    
    async def get_usage_summary(
        self,
        subscription_item_id: str
    ) -> Dict[str, Any]:
        """Get usage summary for metered subscription."""
        try:
            summaries = stripe.SubscriptionItem.list_usage_record_summaries(
                subscription_item_id,
                limit=1
            )
            
            if summaries.data:
                summary = summaries.data[0]
                return {
                    "total_usage": summary.total_usage,
                    "period_start": datetime.fromtimestamp(summary.period.start),
                    "period_end": datetime.fromtimestamp(summary.period.end),
                }
            return {}
            
        except StripeError as e:
            logger.error("Failed to get usage summary", error=str(e))
            return {}
    
    # ==================== INVOICES ====================
    
    async def list_invoices(
        self,
        customer_id: str,
        limit: int = 10
    ) -> List[InvoiceResponse]:
        """List customer invoices."""
        try:
            invoices = stripe.Invoice.list(
                customer=customer_id,
                limit=limit
            )
            
            return [self._format_invoice(inv) for inv in invoices.data]
            
        except StripeError as e:
            logger.error("Failed to list invoices", error=str(e))
            raise
    
    async def get_upcoming_invoice(
        self,
        customer_id: str,
        subscription_id: Optional[str] = None
    ) -> Optional[InvoiceResponse]:
        """Get upcoming invoice preview."""
        try:
            params = {"customer": customer_id}
            if subscription_id:
                params["subscription"] = subscription_id
            
            invoice = stripe.Invoice.upcoming(**params)
            return self._format_invoice(invoice)
            
        except stripe.error.InvalidRequestError:
            # No upcoming invoice
            return None
        except StripeError as e:
            logger.error("Failed to get upcoming invoice", error=str(e))
            raise
    
    # ==================== REVENUE ANALYTICS ====================
    
    async def get_revenue_metrics(
        self,
        start_date: datetime,
        end_date: datetime
    ) -> Dict[str, Any]:
        """Get revenue analytics for dashboard."""
        try:
            # Get charges
            charges = stripe.Charge.list(
                created={
                    "gte": int(start_date.timestamp()),
                    "lte": int(end_date.timestamp())
                },
                limit=100
            )
            
            # Calculate metrics
            successful_charges = [c for c in charges.data if c.status == "succeeded"]
            failed_charges = [c for c in charges.data if c.status == "failed"]
            
            total_revenue = sum(c.amount for c in successful_charges) / 100
            avg_transaction = total_revenue / max(1, len(successful_charges))
            
            # Get subscriptions
            subscriptions = stripe.Subscription.list(limit=100)
            active_subs = [s for s in subscriptions.data if s.status == "active"]
            trialing_subs = [s for s in subscriptions.data if s.status == "trialing"]
            
            # Calculate MRR (Monthly Recurring Revenue)
            mrr = sum(
                s.plan.amount / (12 if s.plan.interval == "year" else 1)
                for s in active_subs
            ) / 100
            
            return {
                "total_revenue": total_revenue,
                "mrr": mrr,
                "arr": mrr * 12,
                "successful_charges": len(successful_charges),
                "failed_charges": len(failed_charges),
                "success_rate": len(successful_charges) / max(1, len(charges.data)),
                "avg_transaction": avg_transaction,
                "active_subscriptions": len(active_subs),
                "trialing_subscriptions": len(trialing_subs),
                "period_days": (end_date - start_date).days
            }
            
        except StripeError as e:
            logger.error("Failed to get revenue metrics", error=str(e))
            return {}
    
    async def get_subscription_metrics(self) -> Dict[str, Any]:
        """Get subscription breakdown by plan."""
        try:
            subscriptions = stripe.Subscription.list(
                status="active",
                limit=100
            )
            
            plan_counts = {"starter": 0, "pro": 0, "enterprise": 0}
            interval_counts = {"monthly": 0, "yearly": 0}
            
            for sub in subscriptions.data:
                plan = sub.metadata.get("plan", "starter")
                interval = sub.metadata.get("interval", "monthly")
                
                if plan in plan_counts:
                    plan_counts[plan] += 1
                if interval in interval_counts:
                    interval_counts[interval] += 1
            
            return {
                "by_plan": plan_counts,
                "by_interval": interval_counts,
                "total": len(subscriptions.data)
            }
            
        except StripeError as e:
            logger.error("Failed to get subscription metrics", error=str(e))
            return {}
    
    # ==================== HELPER METHODS ====================
    
    async def _update_user_subscription_status(
        self,
        user_id: str,
        subscription: Dict
    ) -> None:
        """Update user subscription status in database."""
        try:
            from app.supabase_client import get_supabase_client
            supabase = get_supabase_client()
            
            plan_name = subscription.get("metadata", {}).get("plan_name") or subscription.get("metadata", {}).get("plan", "free")
            
            # Update user plan
            supabase.table("users").update({
                "plan_tier": plan_name,
                "subscription_id": subscription["id"],
                "subscription_status": subscription["status"],
                "updated_at": datetime.utcnow().isoformat()
            }).eq("id", user_id).execute()
            
            logger.info(
                "User subscription status updated",
                user_id=user_id,
                subscription_id=subscription["id"],
                status=subscription["status"],
                plan=plan_name
            )
        except Exception as e:
            logger.error(f"Failed to update user subscription status: {e}", user_id=user_id)
    
    def _format_subscription(self, subscription) -> SubscriptionResponse:
        """Format Stripe subscription to response model."""
        plan = subscription.metadata.get("plan", "starter")
        
        return SubscriptionResponse(
            id=subscription.id,
            status=SubscriptionStatus(subscription.status),
            plan=PlanTier(plan),
            interval=BillingInterval(subscription.metadata.get("interval", "monthly")),
            current_period_start=datetime.fromtimestamp(subscription.current_period_start),
            current_period_end=datetime.fromtimestamp(subscription.current_period_end),
            cancel_at_period_end=subscription.cancel_at_period_end,
            trial_end=datetime.fromtimestamp(subscription.trial_end) if subscription.trial_end else None,
            features=self.config.prices.get(plan, {}).get("features", {})
        )
    
    def _format_payment_method(
        self,
        payment_method,
        is_default: bool = False
    ) -> PaymentMethodResponse:
        """Format Stripe payment method to response model."""
        return PaymentMethodResponse(
            id=payment_method.id,
            type=payment_method.type,
            card={
                "brand": payment_method.card.brand,
                "last4": payment_method.card.last4,
                "exp_month": payment_method.card.exp_month,
                "exp_year": payment_method.card.exp_year,
            } if payment_method.type == "card" else None,
            is_default=is_default
        )
    
    def _format_invoice(self, invoice) -> InvoiceResponse:
        """Format Stripe invoice to response model."""
        return InvoiceResponse(
            id=invoice.id,
            status=invoice.status or "draft",
            amount_due=Decimal(invoice.amount_due) / 100,
            amount_paid=Decimal(invoice.amount_paid) / 100,
            currency=invoice.currency.upper(),
            created=datetime.fromtimestamp(invoice.created),
            invoice_pdf=invoice.invoice_pdf
        )
    
    # ==================== CHECKOUT SESSION ====================
    
    async def create_checkout_session(
        self,
        user_id: str,
        email: str,
        plan: PlanTier,
        interval: BillingInterval,
        success_url: str,
        cancel_url: str
    ) -> str:
        """
        Create Stripe Checkout session for subscription.
        
        Returns checkout session URL.
        """
        try:
            price_id = self.config.prices.get(plan.value, {}).get(interval.value)
            
            session = stripe.checkout.Session.create(
                mode="subscription",
                payment_method_types=["card"],
                customer_email=email,
                line_items=[{
                    "price": price_id,
                    "quantity": 1
                }],
                success_url=success_url,
                cancel_url=cancel_url,
                subscription_data={
                    "trial_period_days": self.config.trial_days,
                    "metadata": {
                        "user_id": user_id,
                        "plan": plan.value,
                        "interval": interval.value
                    }
                },
                metadata={
                    "user_id": user_id
                }
            )
            
            logger.info(
                "Checkout session created",
                session_id=session.id,
                user_id=user_id
            )
            
            return session.url
            
        except StripeError as e:
            logger.error("Checkout session creation failed", error=str(e))
            raise
    
    async def create_billing_portal_session(
        self,
        customer_id: str,
        return_url: str
    ) -> str:
        """
        Create Stripe Billing Portal session.
        
        Returns portal URL for customer to manage subscription.
        """
        try:
            session = stripe.billing_portal.Session.create(
                customer=customer_id,
                return_url=return_url
            )
            
            logger.info("Billing portal session created", customer_id=customer_id)
            return session.url
            
        except StripeError as e:
            logger.error("Billing portal session failed", error=str(e))
            raise


# ==================== SINGLETON ====================

_stripe_service: Optional[StripeService] = None


def get_stripe_service() -> StripeService:
    """Get singleton Stripe service instance."""
    global _stripe_service
    if _stripe_service is None:
        _stripe_service = StripeService()
    return _stripe_service
