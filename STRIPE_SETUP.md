# 💳 SalesFlow AI - Stripe Integration Guide

## Übersicht

SalesFlow AI verwendet Stripe für:
- Subscription Management (Starter, Pro, Enterprise)
- Payment Processing
- Dunning Management (Failed Payment Recovery)
- Usage-based Billing
- Revenue Analytics

---

## 📋 Stripe Dashboard Setup

### 1. Account erstellen

1. Gehe zu [dashboard.stripe.com](https://dashboard.stripe.com)
2. Account erstellen (falls noch nicht vorhanden)
3. Geschäftsdaten verifizieren für Live-Modus

### 2. API Keys kopieren

1. Gehe zu **Developers → API Keys**
2. Kopiere:
   - `Publishable key` (pk_test_... oder pk_live_...)
   - `Secret key` (sk_test_... oder sk_live_...)

### 3. Produkte & Preise erstellen

Erstelle in **Products** folgende Produkte:

#### Starter Plan
```
Name: SalesFlow Starter
Preise:
- €29/Monat (price_starter_monthly)
- €290/Jahr (price_starter_yearly)
Metadata:
  - plan: starter
```

#### Professional Plan
```
Name: SalesFlow Professional
Preise:
- €79/Monat (price_pro_monthly)
- €790/Jahr (price_pro_yearly)
Metadata:
  - plan: pro
```

#### Enterprise Plan
```
Name: SalesFlow Enterprise
Preise:
- €199/Monat (price_enterprise_monthly)
- €1990/Jahr (price_enterprise_yearly)
Metadata:
  - plan: enterprise
```

### 4. Webhook einrichten

1. Gehe zu **Developers → Webhooks**
2. Klicke **Add endpoint**
3. URL: `https://api.salesflow.ai/webhooks/stripe`
4. Events auswählen:
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `customer.subscription.trial_will_end`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
   - `invoice.finalized`
   - `customer.created`
   - `customer.updated`
   - `customer.deleted`
   - `payment_method.attached`
   - `payment_method.detached`
   - `checkout.session.completed`

5. Kopiere **Signing secret** (whsec_...)

### 5. Billing Portal konfigurieren

1. Gehe zu **Settings → Billing → Customer portal**
2. Aktiviere:
   - ✅ Update payment method
   - ✅ View invoices
   - ✅ Cancel subscription
   - ✅ Switch plans
3. Speichere

---

## ⚙️ Environment Variables

### Backend (.env)
```bash
# Stripe API
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Price IDs (aus Stripe Dashboard)
STRIPE_PRICE_STARTER_MONTHLY=price_...
STRIPE_PRICE_STARTER_YEARLY=price_...
STRIPE_PRICE_PRO_MONTHLY=price_...
STRIPE_PRICE_PRO_YEARLY=price_...
STRIPE_PRICE_ENTERPRISE_MONTHLY=price_...
STRIPE_PRICE_ENTERPRISE_YEARLY=price_...
```

### Frontend (.env.local)
```bash
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
```

---

## 🔌 API Endpoints

### Subscriptions

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/billing/subscriptions` | POST | Create subscription |
| `/billing/subscriptions` | GET | List subscriptions |
| `/billing/subscriptions/current` | GET | Get active subscription |
| `/billing/subscriptions/{id}` | PATCH | Update subscription |
| `/billing/subscriptions/{id}` | DELETE | Cancel subscription |
| `/billing/subscriptions/{id}/reactivate` | POST | Reactivate |

### Payment Methods

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/billing/payment-methods` | GET | List payment methods |
| `/billing/payment-methods` | POST | Add payment method |
| `/billing/payment-methods/{id}` | DELETE | Remove payment method |

### Invoices

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/billing/invoices` | GET | List invoices |
| `/billing/invoices/upcoming` | GET | Preview upcoming invoice |

### Checkout

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/billing/checkout` | POST | Create Checkout session |
| `/billing/billing-portal` | POST | Create Billing Portal session |

### Analytics (Admin)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/billing/analytics/revenue` | GET | Revenue metrics |
| `/billing/analytics/subscriptions` | GET | Subscription breakdown |

---

## 🧪 Testing

### Test Cards

| Szenario | Kartennummer |
|----------|--------------|
| Erfolg | 4242424242424242 |
| Abgelehnt | 4000000000000002 |
| 3D Secure | 4000002500003155 |
| Expired | 4000000000000069 |
| Insufficient funds | 4000000000009995 |

### Webhook Testing (lokal)

```bash
# Stripe CLI installieren
brew install stripe/stripe-cli/stripe

# Login
stripe login

# Webhooks forwarden
stripe listen --forward-to localhost:8000/webhooks/stripe

# Events triggern
stripe trigger customer.subscription.created
stripe trigger invoice.payment_failed
```

### API Tests

```bash
# Subscription erstellen
curl -X POST "http://localhost:8000/billing/subscriptions" \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "plan": "pro",
    "interval": "monthly",
    "payment_method_id": "pm_..."
  }'

# Checkout Session erstellen
curl -X POST "http://localhost:8000/billing/checkout" \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "plan": "pro",
    "interval": "yearly",
    "success_url": "https://salesflow.ai/success",
    "cancel_url": "https://salesflow.ai/pricing"
  }'
```

---

## 🚨 Dunning Management

Bei fehlgeschlagenen Zahlungen:

| Versuch | Aktion |
|---------|--------|
| 1. Fehlschlag | E-Mail: "Zahlung fehlgeschlagen" |
| 2. Fehlschlag | E-Mail: "Dringende Erinnerung" |
| 3. Fehlschlag | E-Mail: "Letzte Warnung" |
| 4. Fehlschlag | Subscription kündigen |

### Retry Schedule (Stripe Standard)

- 1. Retry: Nach 1 Tag
- 2. Retry: Nach 3 Tagen
- 3. Retry: Nach 5 Tagen
- 4. Retry: Nach 7 Tagen

---

## 📊 Revenue Metrics

```typescript
// API Response: GET /billing/analytics/revenue
{
  "total_revenue": 12500.00,
  "mrr": 2500.00,
  "arr": 30000.00,
  "successful_charges": 125,
  "failed_charges": 3,
  "success_rate": 0.976,
  "avg_transaction": 100.00,
  "active_subscriptions": 45,
  "trialing_subscriptions": 12,
  "period_days": 30
}
```

---

## 🔒 Security Checklist

- [ ] Webhook Signature Verification aktiviert
- [ ] API Keys als Secrets gespeichert
- [ ] HTTPS für alle Endpoints
- [ ] PCI DSS Compliance (durch Stripe Checkout/Elements)
- [ ] Idempotency Keys für kritische Operationen
- [ ] Rate Limiting auf Billing Endpoints

---

## 🚀 Go-Live Checklist

- [ ] Live API Keys in Production
- [ ] Webhook URL aktualisiert (keine localhost)
- [ ] Tax Settings konfiguriert (wenn nötig)
- [ ] Email Templates angepasst
- [ ] Billing Portal branding
- [ ] Test-Subscription durchgeführt
- [ ] Cancellation Flow getestet
- [ ] Dunning Emails konfiguriert

---

## 📞 Support

- Stripe Docs: https://stripe.com/docs
- API Reference: https://stripe.com/docs/api
- Support: https://support.stripe.com
