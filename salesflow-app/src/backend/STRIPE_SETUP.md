# Stripe Payment Integration - Setup Guide

## Environment Variables

Füge folgende Variablen zu deiner `.env` Datei hinzu:

```bash
# Stripe API Keys
STRIPE_SECRET_KEY=sk_live_xxx                    # Secret Key aus Stripe Dashboard
STRIPE_PUBLISHABLE_KEY=pk_live_xxx               # Publishable Key (für Frontend)
STRIPE_WEBHOOK_SECRET=whsec_xxx                  # Webhook Secret (aus Stripe Dashboard)

# Frontend URL (für Success/Cancel URLs)
FRONTEND_URL=https://your-app.com                # Oder http://localhost:3000 für Development
```

## Stripe Dashboard Setup

### 1. Produkte & Preise erstellen

Erstelle in Stripe Dashboard folgende Produkte:

#### Starter Plan
- **Monthly**: €29/mo → Price ID: `price_xxx`
- **Yearly**: €290/year → Price ID: `price_xxx`

#### Growth Plan
- **Monthly**: €59/mo → Price ID: `price_xxx`
- **Yearly**: €590/year → Price ID: `price_xxx`

#### Scale Plan
- **Monthly**: €119/mo → Price ID: `price_xxx`
- **Yearly**: €1190/year → Price ID: `price_xxx`

#### Founding Member
- **One-time**: €499 → Price ID: `price_xxx`

### 2. Price IDs in Code eintragen

Aktualisiere `backend/app/services/payment/stripe_service.py`:

```python
PRICES = {
    "starter_monthly": "price_xxx",  # Deine Price ID
    "starter_yearly": "price_xxx",
    "growth_monthly": "price_xxx",
    "growth_yearly": "price_xxx",
    "scale_monthly": "price_xxx",
    "scale_yearly": "price_xxx",
    "founding_member": "price_xxx",
}
```

### 3. Webhook einrichten

1. Gehe zu Stripe Dashboard → Developers → Webhooks
2. Klicke "Add endpoint"
3. Endpoint URL: `https://your-api.com/api/v2/payment/webhook`
4. Events auswählen:
   - `checkout.session.completed`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.paid`
   - `invoice.payment_failed`
5. Webhook Secret kopieren → in `.env` als `STRIPE_WEBHOOK_SECRET`

### 4. Customer Portal aktivieren

1. Gehe zu Stripe Dashboard → Settings → Billing → Customer portal
2. Aktiviere Customer Portal
3. Konfiguriere erlaubte Aktionen:
   - ✅ Subscription cancellation
   - ✅ Payment method updates
   - ✅ Invoice history

## Supabase Setup

### 1. Table erstellen

Führe das SQL-Script aus: `backend/app/db/migrations/subscriptions_table.sql`

Oder manuell in Supabase SQL Editor:

```sql
-- Siehe subscriptions_table.sql
```

### 2. Row Level Security (RLS)

RLS ist bereits im SQL-Script enthalten. Prüfe, ob Policies korrekt sind.

## API Routes

Die Payment Routes sind unter `/api/v2/payment` verfügbar:

- `POST /api/v2/payment/create-checkout` - Checkout Session erstellen
- `POST /api/v2/payment/create-portal` - Customer Portal öffnen
- `POST /api/v2/payment/webhook` - Stripe Webhook Handler
- `GET /api/v2/payment/subscription` - Aktuelle Subscription abrufen

## Frontend Integration

### Screens

- `screens/billing/PaymentScreen.tsx` - Plan-Auswahl
- `screens/billing/SubscriptionScreen.tsx` - Abo-Verwaltung

### Navigation

Füge die Screens zu deinem Navigator hinzu:

```typescript
import { PaymentScreen, SubscriptionScreen } from './screens/billing';

// In deinem Navigator
<Stack.Screen name="Payment" component={PaymentScreen} />
<Stack.Screen name="Subscription" component={SubscriptionScreen} />
```

## Testing

### Development

1. Nutze Stripe Test Keys (`sk_test_...`, `pk_test_...`)
2. Test Cards: https://stripe.com/docs/testing
3. Webhook Testing: Nutze Stripe CLI

```bash
stripe listen --forward-to localhost:8000/api/v2/payment/webhook
```

### Production

1. Wechsle zu Live Keys
2. Teste mit echten Karten (kleine Beträge)
3. Überwache Webhook Events im Stripe Dashboard

## Troubleshooting

### Webhook nicht empfangen

- Prüfe Webhook Secret
- Prüfe Endpoint URL
- Prüfe Firewall/Network Settings
- Nutze Stripe CLI für lokales Testing

### Checkout Session nicht erstellt

- Prüfe Stripe Secret Key
- Prüfe Price IDs
- Prüfe Logs für Fehlerdetails

### Customer Portal nicht verfügbar

- Prüfe ob Customer Portal aktiviert ist
- Prüfe ob Customer ID korrekt ist
- Prüfe ob Subscription existiert

## Security

- ✅ Webhook Signature Verification
- ✅ Row Level Security (RLS) in Supabase
- ✅ User Authentication für alle Endpoints
- ✅ Keine sensiblen Daten in Frontend

## Support

Bei Problemen:
1. Prüfe Stripe Dashboard → Logs
2. Prüfe Backend Logs
3. Prüfe Webhook Events im Stripe Dashboard

