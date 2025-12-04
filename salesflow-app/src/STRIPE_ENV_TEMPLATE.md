# 🔐 STRIPE ENVIRONMENT VARIABLES

Kopiere diese in `backend/.env`:

```bash
# ═══════════════════════════════════════════════════════════════════════════
# STRIPE (Payment Processing)
# ═══════════════════════════════════════════════════════════════════════════
# Test Keys (Development)
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Production Keys (Production)
# STRIPE_SECRET_KEY=sk_live_...
# STRIPE_WEBHOOK_SECRET=whsec_...
```

## 📝 Anleitung:

1. **Stripe Dashboard öffnen:** https://dashboard.stripe.com/test/apikeys
2. **Test Keys kopieren:**
   - Secret Key: `sk_test_...`
   - Webhook Secret: `whsec_...` (aus Webhooks → Endpoint Details)
3. **In `backend/.env` eintragen**

## 🔗 Webhook Setup:

1. Stripe Dashboard → Webhooks
2. Endpoint: `https://your-api.com/api/billing/webhooks/stripe`
3. Events auswählen:
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.paid`
   - `invoice.payment_failed`
4. Webhook Secret kopieren

