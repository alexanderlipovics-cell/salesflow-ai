# 💳 STRIPE VERBINDUNGEN - VOLLSTÄNDIGE ÜBERSICHT

## 📋 Inhaltsverzeichnis
1. [Backend API](#backend-api)
2. [Frontend Integration](#frontend-integration)
3. [Datenbank Schema](#datenbank-schema)
4. [Environment Variables](#environment-variables)
5. [Webhooks](#webhooks)
6. [Price IDs](#price-ids)

---

## 🔧 BACKEND API

### Datei: `backend/app/api/routes/billing.py`

#### **Stripe Konfiguration:**
```python
stripe.api_key = os.getenv("STRIPE_SECRET_KEY", "")
STRIPE_WEBHOOK_SECRET = os.getenv("STRIPE_WEBHOOK_SECRET", "")
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:19006")
```

#### **API Endpoints:**

1. **POST `/api/billing/checkout`**
   - Erstellt Stripe Checkout Session
   - Parameter: `price_id`, `success_url`, `cancel_url`, `trial_days`
   - Test-Modus: Wenn kein Stripe Key → simuliert Checkout
   - Echter Modus: Erstellt echte Stripe Session

2. **POST `/api/billing/checkout/addon`**
   - Fügt Add-On zu bestehender Subscription hinzu
   - Verwendet: `stripe.SubscriptionItem.create()`

3. **POST `/api/billing/portal`**
   - Erstellt Stripe Customer Portal Session
   - Self-Service für User (Zahlungsmethode ändern, kündigen, etc.)
   - Verwendet: `stripe.billing_portal.Session.create()`

4. **GET `/api/billing/subscription`**
   - Holt aktuelle Subscription des Users
   - Gibt Plan, Status, Limits zurück

5. **GET `/api/billing/usage`**
   - Holt Usage-Records für aktuellen Billing-Zeitraum
   - Berechnet Usage-Percentage

6. **POST `/api/billing/usage/record`**
   - Zeichnet Usage für metered Billing auf
   - Feature: `ai_analyses`, `auto_actions`, etc.

7. **POST `/api/billing/webhooks/stripe`**
   - Stripe Webhook Handler
   - Verarbeitet Events: `checkout.session.completed`, `customer.subscription.*`, `invoice.*`

#### **Stripe API Calls:**
- `stripe.Customer.create()` - Customer erstellen
- `stripe.checkout.Session.create()` - Checkout Session
- `stripe.Subscription.retrieve()` - Subscription abrufen
- `stripe.SubscriptionItem.create()` - Add-On hinzufügen
- `stripe.billing_portal.Session.create()` - Customer Portal
- `stripe.Webhook.construct_event()` - Webhook verifizieren

---

## 🎨 FRONTEND INTEGRATION

### Datei: `screens/settings/PricingScreen.tsx`
- **Zweck:** UI für Plan-Auswahl
- **Features:**
  - Zeigt alle Pricing Tiers (Basic + 3 Add-Ons)
  - Monatlich/Jährlich Toggle
  - Kategorie-Filter
  - "Auswählen" Button → ruft `billing.upgrade()` auf

### Datei: `api/billing.ts` (Frontend API Client)
- **Zweck:** Frontend API Client für Billing
- **Funktionen:**
  - `createCheckout()` - Checkout Session erstellen
  - `createPortal()` - Customer Portal öffnen
  - `getSubscription()` - Subscription abrufen
  - `getUsage()` - Usage abrufen
  - `recordUsage()` - Usage aufzeichnen

### Datei: `screens/billing/TestCheckoutScreen.tsx`
- **Zweck:** Test-Checkout für Development
- **Features:** Simuliert Stripe Checkout ohne echte Zahlung

### Hook: `hooks/useBilling.ts` (vermutlich)
- **Zweck:** React Hook für Billing-Funktionalität
- **Verwendet:** `api/billing.ts`

---

## 🗄️ DATENBANK SCHEMA

### Datei: `backend/migrations/20251203_billing_system.sql`

#### **1. PROFILES Table (Erweitert):**
```sql
ALTER TABLE profiles ADD COLUMN stripe_customer_id TEXT UNIQUE;
ALTER TABLE profiles ADD COLUMN plan TEXT DEFAULT 'free';
ALTER TABLE profiles ADD COLUMN trial_ends_at TIMESTAMPTZ;
```

#### **2. SUBSCRIPTIONS Table:**
```sql
CREATE TABLE subscriptions (
    id UUID PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id),
    stripe_subscription_id TEXT UNIQUE NOT NULL,
    stripe_customer_id TEXT NOT NULL,
    plan TEXT NOT NULL DEFAULT 'basic',
    status TEXT NOT NULL DEFAULT 'active',
    current_period_start TIMESTAMPTZ NOT NULL,
    current_period_end TIMESTAMPTZ NOT NULL,
    cancel_at_period_end BOOLEAN DEFAULT FALSE,
    canceled_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### **3. SUBSCRIPTION_ITEMS Table (Add-Ons):**
```sql
CREATE TABLE subscription_items (
    id UUID PRIMARY KEY,
    subscription_id TEXT NOT NULL,  -- Stripe Subscription ID
    stripe_item_id TEXT UNIQUE NOT NULL,
    addon_id TEXT NOT NULL,  -- autopilot_pro, finance_starter, etc.
    price_id TEXT NOT NULL,  -- Stripe Price ID
    quantity INTEGER DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### **4. USAGE_RECORDS Table:**
```sql
CREATE TABLE usage_records (
    id UUID PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id),
    feature TEXT NOT NULL,  -- ai_analyses, auto_actions, etc.
    quantity INTEGER DEFAULT 1,
    context JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### **5. INVOICES Table:**
```sql
CREATE TABLE invoices (
    id UUID PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id),
    stripe_invoice_id TEXT UNIQUE NOT NULL,
    subscription_id TEXT NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    currency TEXT DEFAULT 'eur',
    status TEXT NOT NULL,  -- paid, pending, failed
    invoice_pdf TEXT,
    paid_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### **6. PAYMENT_METHODS Table:**
```sql
CREATE TABLE payment_methods (
    id UUID PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id),
    stripe_payment_method_id TEXT UNIQUE NOT NULL,
    type TEXT NOT NULL,  -- card, sepa_debit
    card_brand TEXT,
    card_last4 TEXT,
    is_default BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## 🔐 ENVIRONMENT VARIABLES

### Backend (`.env` oder Docker):
```bash
STRIPE_SECRET_KEY=sk_live_...          # Stripe Secret Key
STRIPE_WEBHOOK_SECRET=whsec_...        # Webhook Secret
FRONTEND_URL=http://localhost:19006     # Frontend URL für Redirects

# Stripe Price IDs (optional, falls nicht in Code)
STRIPE_PRICE_BASIC_MONTHLY=price_...
STRIPE_PRICE_BASIC_YEARLY=price_...
STRIPE_PRICE_AUTOPILOT_STARTER=price_...
STRIPE_PRICE_AUTOPILOT_PRO=price_...
STRIPE_PRICE_AUTOPILOT_UNLIMITED=price_...
STRIPE_PRICE_FINANCE_STARTER=price_...
STRIPE_PRICE_FINANCE_PRO=price_...
STRIPE_PRICE_FINANCE_BUSINESS=price_...
STRIPE_PRICE_LEADGEN_STARTER=price_...
STRIPE_PRICE_LEADGEN_PRO=price_...
STRIPE_PRICE_LEADGEN_UNLIMITED=price_...
STRIPE_PRICE_BUNDLE_STARTER=price_...
STRIPE_PRICE_BUNDLE_PRO=price_...
STRIPE_PRICE_BUNDLE_UNLIMITED=price_...
```

### Docker Compose:
```yaml
environment:
  - STRIPE_SECRET_KEY=${STRIPE_SECRET_KEY}
  - STRIPE_WEBHOOK_SECRET=${STRIPE_WEBHOOK_SECRET}
```

---

## 🔔 WEBHOOKS

### Endpoint: `POST /api/billing/webhooks/stripe`

#### **Verarbeitete Events:**

1. **`checkout.session.completed`**
   - Checkout abgeschlossen
   - Erstellt Subscription in DB

2. **`customer.subscription.created`**
   - Neue Subscription erstellt
   - Synchronisiert mit DB

3. **`customer.subscription.updated`**
   - Subscription aktualisiert (Upgrade/Downgrade)
   - Synchronisiert mit DB

4. **`customer.subscription.deleted`**
   - Subscription gekündigt
   - Setzt Status auf `canceled`

5. **`invoice.paid`**
   - Rechnung bezahlt
   - Speichert Invoice in DB

6. **`invoice.payment_failed`**
   - Zahlung fehlgeschlagen
   - Erstellt Notification für User

#### **Webhook Setup:**
1. In Stripe Dashboard → Webhooks
2. Endpoint: `https://your-api.com/api/billing/webhooks/stripe`
3. Events auswählen (siehe oben)
4. Webhook Secret kopieren → `STRIPE_WEBHOOK_SECRET`

---

## 💰 PRICE IDs

### Konfiguration: `backend/app/api/routes/billing.py`

```python
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
```

---

## 📦 DEPENDENCIES

### Backend: `backend/requirements.txt`
```txt
stripe>=8.0.0            # Stripe Payments
```

---

## 🔄 FLOW DIAGRAM

```
User wählt Plan
    ↓
Frontend: billing.upgrade(priceId)
    ↓
Backend: POST /api/billing/checkout
    ↓
Stripe: checkout.Session.create()
    ↓
User: Zahlung in Stripe Checkout
    ↓
Stripe: Webhook → checkout.session.completed
    ↓
Backend: Subscription in DB speichern
    ↓
Frontend: Redirect zu Success Page
```

---

## 🧪 TEST MODE

### Wenn `STRIPE_SECRET_KEY` nicht gesetzt:
- Backend simuliert Checkout
- Gibt Test-Session-ID zurück
- Keine echte Zahlung
- Frontend zeigt Test-Checkout Screen

### Test-Modus aktivieren:
```python
# backend/app/api/routes/billing.py
if not stripe.api_key:
    # Test-Modus
    return {
        "checkout_url": f"{FRONTEND_URL}/billing/test-checkout?...",
        "test_mode": True
    }
```

---

## 📝 ZUSAMMENFASSUNG

### **Stripe Integration umfasst:**

1. ✅ **Backend API** (`billing.py`)
   - Checkout Sessions
   - Customer Portal
   - Webhook Handler
   - Subscription Management

2. ✅ **Frontend** (`PricingScreen.tsx`, `api/billing.ts`)
   - Plan-Auswahl UI
   - Checkout Integration
   - Usage Tracking

3. ✅ **Datenbank** (6 Tabellen)
   - `profiles` (stripe_customer_id)
   - `subscriptions`
   - `subscription_items`
   - `usage_records`
   - `invoices`
   - `payment_methods`

4. ✅ **Webhooks** (6 Events)
   - Subscription Lifecycle
   - Invoice Events
   - Payment Failures

5. ✅ **Price IDs** (13 Preise)
   - Basic (monthly/yearly)
   - Autopilot (3 Tiers)
   - Finance (3 Tiers)
   - LeadGen (3 Tiers)
   - Bundles (3 Tiers)

---

## 🚀 NÄCHSTE SCHRITTE

1. **Stripe Dashboard konfigurieren:**
   - Products & Prices erstellen
   - Webhook Endpoint einrichten
   - Test Keys für Development

2. **Environment Variables setzen:**
   - `STRIPE_SECRET_KEY`
   - `STRIPE_WEBHOOK_SECRET`
   - Price IDs (optional)

3. **Testing:**
   - Test Checkout durchführen
   - Webhook Events testen
   - Subscription Flow prüfen

