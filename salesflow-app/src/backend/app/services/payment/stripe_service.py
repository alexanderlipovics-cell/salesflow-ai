"""
╔════════════════════════════════════════════════════════════════════════════╗
║  STRIPE PAYMENT SERVICE                                                     ║
║  Vollständige Stripe Integration für Abonnements                             ║
╚════════════════════════════════════════════════════════════════════════════╝
"""

import stripe
from typing import Dict, Any, Optional
from datetime import datetime
import logging

from ...core.config import settings

# Stripe API Key setzen
stripe.api_key = settings.STRIPE_SECRET_KEY

logger = logging.getLogger(__name__)


class StripeService:
    """
    Service für Stripe Payment Integration.
    
    Features:
    - Checkout Sessions erstellen
    - Customer Portal für Abo-Verwaltung
    - Webhook Handling
    - Subscription Management
    """
    
    # ═══════════════════════════════════════════════════════════════════════
    # PRODUKTE/PREISE
    # ═══════════════════════════════════════════════════════════════════════
    
    PRICES = {
        "starter_monthly": "price_xxx",  # €29/mo
        "starter_yearly": "price_xxx",   # €290/year
        "growth_monthly": "price_xxx",    # €59/mo
        "growth_yearly": "price_xxx",     # €590/year
        "scale_monthly": "price_xxx",     # €119/mo
        "scale_yearly": "price_xxx",      # €1190/year
        "founding_member": "price_xxx",   # €499 einmalig
    }
    
    # Plan-Mapping
    PLAN_MAPPING = {
        "starter": {
            "monthly": "starter_monthly",
            "yearly": "starter_yearly",
        },
        "growth": {
            "monthly": "growth_monthly",
            "yearly": "growth_yearly",
        },
        "scale": {
            "monthly": "scale_monthly",
            "yearly": "scale_yearly",
        },
        "founding_member": {
            "one_time": "founding_member",
        },
    }
    
    # ═══════════════════════════════════════════════════════════════════════
    # CHECKOUT SESSIONS
    # ═══════════════════════════════════════════════════════════════════════
    
    async def create_checkout_session(
        self,
        user_id: str,
        price_id: str,
        success_url: str,
        cancel_url: str,
        customer_email: Optional[str] = None,
        metadata: Optional[Dict[str, str]] = None
    ) -> str:
        """
        Erstellt eine Stripe Checkout Session.
        
        Args:
            user_id: User ID aus der Datenbank
            price_id: Stripe Price ID
            success_url: URL nach erfolgreichem Checkout
            cancel_url: URL bei Abbruch
            customer_email: Optional - E-Mail des Kunden
            metadata: Optional - Zusätzliche Metadaten
            
        Returns:
            checkout_url: URL zur Checkout-Seite
        """
        try:
            # Erstelle oder hole Customer
            customer = await self._get_or_create_customer(user_id, customer_email)
            
            # Metadata zusammenstellen
            session_metadata = {
                "user_id": user_id,
            }
            if metadata:
                session_metadata.update(metadata)
            
            # Checkout Session erstellen
            session = stripe.checkout.Session.create(
                customer=customer.id,
                payment_method_types=["card"],
                line_items=[
                    {
                        "price": price_id,
                        "quantity": 1,
                    }
                ],
                mode="subscription" if "monthly" in price_id or "yearly" in price_id else "payment",
                success_url=success_url,
                cancel_url=cancel_url,
                metadata=session_metadata,
                allow_promotion_codes=True,
                subscription_data={
                    "metadata": session_metadata,
                } if "monthly" in price_id or "yearly" in price_id else None,
            )
            
            logger.info(f"Checkout Session erstellt: {session.id} für User {user_id}")
            
            return session.url
            
        except stripe.error.StripeError as e:
            logger.error(f"Stripe Fehler beim Erstellen der Checkout Session: {e}")
            raise
    
    # ═══════════════════════════════════════════════════════════════════════
    # CUSTOMER PORTAL
    # ═══════════════════════════════════════════════════════════════════════
    
    async def create_portal_session(
        self,
        customer_id: str,
        return_url: str
    ) -> str:
        """
        Erstellt eine Stripe Customer Portal Session.
        
        Ermöglicht Kunden:
        - Abo verwalten
        - Zahlungsmethoden ändern
        - Rechnungen ansehen
        - Abo kündigen
        
        Args:
            customer_id: Stripe Customer ID
            return_url: URL nach Portal-Besuch
            
        Returns:
            portal_url: URL zum Customer Portal
        """
        try:
            session = stripe.billing_portal.Session.create(
                customer=customer_id,
                return_url=return_url,
            )
            
            logger.info(f"Portal Session erstellt: {session.id} für Customer {customer_id}")
            
            return session.url
            
        except stripe.error.StripeError as e:
            logger.error(f"Stripe Fehler beim Erstellen der Portal Session: {e}")
            raise
    
    # ═══════════════════════════════════════════════════════════════════════
    # WEBHOOK HANDLING
    # ═══════════════════════════════════════════════════════════════════════
    
    async def handle_webhook(
        self,
        payload: bytes,
        sig: str
    ) -> Dict[str, Any]:
        """
        Verarbeitet Stripe Webhooks.
        
        Unterstützte Events:
        - checkout.session.completed
        - customer.subscription.updated
        - customer.subscription.deleted
        - invoice.paid
        - invoice.payment_failed
        
        Args:
            payload: Webhook Payload (bytes)
            sig: Stripe Signature Header
            
        Returns:
            Event-Daten
        """
        try:
            # Webhook verifizieren
            event = stripe.Webhook.construct_event(
                payload,
                sig,
                settings.STRIPE_WEBHOOK_SECRET
            )
            
            logger.info(f"Webhook Event empfangen: {event['type']}")
            
            # Event verarbeiten
            event_type = event["type"]
            event_data = event["data"]["object"]
            
            if event_type == "checkout.session.completed":
                await self._handle_checkout_completed(event_data)
            
            elif event_type == "customer.subscription.updated":
                await self._handle_subscription_updated(event_data)
            
            elif event_type == "customer.subscription.deleted":
                await self._handle_subscription_deleted(event_data)
            
            elif event_type == "invoice.paid":
                await self._handle_invoice_paid(event_data)
            
            elif event_type == "invoice.payment_failed":
                await self._handle_invoice_payment_failed(event_data)
            
            else:
                logger.warning(f"Unbekanntes Webhook Event: {event_type}")
            
            return {
                "status": "success",
                "event_type": event_type,
                "event_id": event["id"],
            }
            
        except ValueError as e:
            logger.error(f"Ungültiges Webhook Payload: {e}")
            raise
        except stripe.error.SignatureVerificationError as e:
            logger.error(f"Webhook Signature Verification fehlgeschlagen: {e}")
            raise
        except Exception as e:
            logger.error(f"Fehler beim Verarbeiten des Webhooks: {e}")
            raise
    
    # ═══════════════════════════════════════════════════════════════════════
    # WEBHOOK HANDLERS
    # ═══════════════════════════════════════════════════════════════════════
    
    async def _handle_checkout_completed(self, session: Dict[str, Any]):
        """Verarbeitet erfolgreichen Checkout."""
        user_id = session.get("metadata", {}).get("user_id")
        customer_id = session.get("customer")
        subscription_id = session.get("subscription")
        
        if not user_id:
            logger.warning("Keine user_id in Checkout Session Metadata")
            return
        
        # Hole Subscription Details
        if subscription_id:
            subscription = stripe.Subscription.retrieve(subscription_id)
            plan = self._extract_plan_from_price(subscription.items.data[0].price.id)
            
            # Speichere in Datenbank
            await self._save_subscription(
                user_id=user_id,
                stripe_customer_id=customer_id,
                stripe_subscription_id=subscription_id,
                plan=plan,
                status="active",
                current_period_end=datetime.fromtimestamp(subscription.current_period_end),
            )
        else:
            # One-time Payment (z.B. Founding Member)
            plan = "founding_member"
            await self._save_subscription(
                user_id=user_id,
                stripe_customer_id=customer_id,
                stripe_subscription_id=None,
                plan=plan,
                status="active",
                current_period_end=None,
            )
        
        logger.info(f"Checkout abgeschlossen für User {user_id}, Plan: {plan}")
    
    async def _handle_subscription_updated(self, subscription: Dict[str, Any]):
        """Verarbeitet Subscription Update."""
        subscription_id = subscription["id"]
        customer_id = subscription["customer"]
        status = subscription["status"]
        
        # Hole User ID aus Customer Metadata
        customer = stripe.Customer.retrieve(customer_id)
        user_id = customer.metadata.get("user_id")
        
        if not user_id:
            logger.warning(f"Keine user_id in Customer Metadata für {customer_id}")
            return
        
        plan = self._extract_plan_from_price(subscription["items"]["data"][0]["price"]["id"])
        current_period_end = datetime.fromtimestamp(subscription["current_period_end"])
        
        await self._update_subscription(
            user_id=user_id,
            stripe_subscription_id=subscription_id,
            plan=plan,
            status=status,
            current_period_end=current_period_end,
        )
        
        logger.info(f"Subscription aktualisiert für User {user_id}, Status: {status}")
    
    async def _handle_subscription_deleted(self, subscription: Dict[str, Any]):
        """Verarbeitet Subscription Deletion."""
        subscription_id = subscription["id"]
        customer_id = subscription["customer"]
        
        # Hole User ID
        customer = stripe.Customer.retrieve(customer_id)
        user_id = customer.metadata.get("user_id")
        
        if not user_id:
            logger.warning(f"Keine user_id in Customer Metadata für {customer_id}")
            return
        
        await self._update_subscription(
            user_id=user_id,
            stripe_subscription_id=subscription_id,
            status="canceled",
        )
        
        logger.info(f"Subscription gekündigt für User {user_id}")
    
    async def _handle_invoice_paid(self, invoice: Dict[str, Any]):
        """Verarbeitet erfolgreiche Zahlung."""
        customer_id = invoice["customer"]
        subscription_id = invoice.get("subscription")
        
        if subscription_id:
            # Subscription Invoice
            customer = stripe.Customer.retrieve(customer_id)
            user_id = customer.metadata.get("user_id")
            
            if user_id:
                await self._update_subscription(
                    user_id=user_id,
                    stripe_subscription_id=subscription_id,
                    status="active",
                )
        
        logger.info(f"Rechnung bezahlt für Customer {customer_id}")
    
    async def _handle_invoice_payment_failed(self, invoice: Dict[str, Any]):
        """Verarbeitet fehlgeschlagene Zahlung."""
        customer_id = invoice["customer"]
        subscription_id = invoice.get("subscription")
        
        if subscription_id:
            customer = stripe.Customer.retrieve(customer_id)
            user_id = customer.metadata.get("user_id")
            
            if user_id:
                await self._update_subscription(
                    user_id=user_id,
                    stripe_subscription_id=subscription_id,
                    status="past_due",
                )
        
        logger.warning(f"Zahlung fehlgeschlagen für Customer {customer_id}")
    
    # ═══════════════════════════════════════════════════════════════════════
    # HELPER METHODS
    # ═══════════════════════════════════════════════════════════════════════
    
    async def _get_or_create_customer(
        self,
        user_id: str,
        email: Optional[str] = None
    ) -> stripe.Customer:
        """Erstellt oder holt einen Stripe Customer."""
        # Prüfe ob Customer bereits existiert (in DB)
        # Falls nicht, erstelle neuen Customer
        try:
            # Suche nach Customer mit user_id in Metadata
            customers = stripe.Customer.list(
                limit=1,
                metadata={"user_id": user_id}
            )
            
            if customers.data:
                return customers.data[0]
            
            # Erstelle neuen Customer
            customer = stripe.Customer.create(
                email=email,
                metadata={"user_id": user_id},
            )
            
            logger.info(f"Neuer Stripe Customer erstellt: {customer.id} für User {user_id}")
            
            return customer
            
        except stripe.error.StripeError as e:
            logger.error(f"Fehler beim Erstellen/Holen des Customers: {e}")
            raise
    
    def _extract_plan_from_price(self, price_id: str) -> str:
        """Extrahiert Plan-Namen aus Price ID."""
        for plan_key, price_key in self.PRICES.items():
            if price_key == price_id:
                # Konvertiere z.B. "starter_monthly" -> "starter"
                return plan_key.split("_")[0]
        
        # Fallback
        return "unknown"
    
    async def _save_subscription(
        self,
        user_id: str,
        stripe_customer_id: str,
        stripe_subscription_id: Optional[str],
        plan: str,
        status: str,
        current_period_end: Optional[datetime] = None,
    ):
        """Speichert Subscription in Datenbank."""
        try:
            from ...db.supabase import get_supabase
            
            supabase = get_supabase()
            
            subscription_data = {
                "user_id": user_id,
                "stripe_customer_id": stripe_customer_id,
                "stripe_subscription_id": stripe_subscription_id,
                "plan": plan,
                "status": status,
                "current_period_end": current_period_end.isoformat() if current_period_end else None,
                "updated_at": datetime.utcnow().isoformat(),
            }
            
            # Upsert (Update oder Insert)
            result = supabase.table("subscriptions").upsert(
                subscription_data,
                on_conflict="user_id"
            ).execute()
            
            logger.info(f"Subscription gespeichert: User {user_id}, Plan {plan}, Status {status}")
            
        except Exception as e:
            logger.error(f"Fehler beim Speichern der Subscription: {e}")
            raise
    
    async def _update_subscription(
        self,
        user_id: str,
        stripe_subscription_id: Optional[str] = None,
        plan: Optional[str] = None,
        status: Optional[str] = None,
        current_period_end: Optional[datetime] = None,
    ):
        """Aktualisiert Subscription in Datenbank."""
        try:
            from ...db.supabase import get_supabase
            
            supabase = get_supabase()
            
            update_data = {
                "updated_at": datetime.utcnow().isoformat(),
            }
            
            if plan:
                update_data["plan"] = plan
            if status:
                update_data["status"] = status
            if current_period_end:
                update_data["current_period_end"] = current_period_end.isoformat()
            if stripe_subscription_id:
                update_data["stripe_subscription_id"] = stripe_subscription_id
            
            result = supabase.table("subscriptions").update(update_data).eq(
                "user_id", user_id
            ).execute()
            
            logger.info(f"Subscription aktualisiert: User {user_id}, Status {status}")
            
        except Exception as e:
            logger.error(f"Fehler beim Aktualisieren der Subscription: {e}")
            raise
    
    def get_price_id(self, plan: str, billing: str) -> Optional[str]:
        """
        Holt Price ID für Plan und Billing.
        
        Args:
            plan: Plan-Name (starter, growth, scale, founding_member)
            billing: Billing-Zyklus (monthly, yearly, one_time)
            
        Returns:
            Price ID oder None
        """
        if plan == "founding_member":
            return self.PRICES.get("founding_member")
        
        plan_mapping = self.PLAN_MAPPING.get(plan, {})
        price_key = plan_mapping.get(billing)
        
        if price_key:
            return self.PRICES.get(price_key)
        
        return None


# =============================================================================
# EXPORTS
# =============================================================================

__all__ = ["StripeService"]

