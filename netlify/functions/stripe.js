const Stripe = require("stripe");
const { createClient } = require("@supabase/supabase-js");

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const stripeSecret = process.env.STRIPE_SECRET_KEY;

const stripe = stripeSecret ? new Stripe(stripeSecret, { apiVersion: "2023-10-16" }) : null;

const supabase =
  SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY
    ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
    : null;

const PRICE_IDS = {
  starter: {
    month: process.env.STRIPE_PRICE_STARTER_MONTH,
    year: process.env.STRIPE_PRICE_STARTER_YEAR,
  },
  pro: {
    month: process.env.STRIPE_PRICE_PRO_MONTH,
    year: process.env.STRIPE_PRICE_PRO_YEAR,
  },
  enterprise: {
    month: process.env.STRIPE_PRICE_ENTERPRISE_MONTH,
    year: process.env.STRIPE_PRICE_ENTERPRISE_YEAR,
  },
};

const PLAN_LABELS = {
  starter: "Starter",
  pro: "Professional",
  enterprise: "Enterprise",
};

const successUrl =
  process.env.CHECKOUT_SUCCESS_URL || "https://salesflow.ai/settings?success=true";
const cancelUrl =
  process.env.CHECKOUT_CANCEL_URL || "https://salesflow.ai/pricing?canceled=true";

const getPriceId = (plan, interval) => {
  const planPrices = PRICE_IDS[plan];
  if (!planPrices) return null;
  return planPrices[interval];
};

const upsertSubscriptionMeta = async ({ userId, customerId }) => {
  if (!supabase) return null;
  const { data } = await supabase
    .from("subscriptions")
    .select("user_id")
    .eq("user_id", userId)
    .maybeSingle();

  const payload = {
    user_id: userId,
    stripe_customer_id: customerId,
  };

  if (data) {
    await supabase.from("subscriptions").update(payload).eq("user_id", userId);
  } else {
    await supabase.from("subscriptions").insert(payload);
  }
};

const ensureStripeCustomer = async (userId) => {
  if (!stripe) {
    throw new Error("Stripe ist nicht konfiguriert.");
  }

  if (!supabase) {
    throw new Error("Supabase ist nicht erreichbar.");
  }

  const { data, error } = await supabase
    .from("subscriptions")
    .select("stripe_customer_id, email")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    throw new Error("Konnte Subscription-Eintrag nicht lesen.");
  }

  if (data?.stripe_customer_id) {
    return data.stripe_customer_id;
  }

  const customer = await stripe.customers.create({
    metadata: { user_id: userId },
    email: data?.email || undefined,
  });

  await upsertSubscriptionMeta({ userId, customerId: customer.id });
  return customer.id;
};

const handleCreateCheckout = async ({ plan, interval = "month", userId }) => {
  if (!plan || !userId) {
    throw new Error("plan und userId sind erforderlich.");
  }

  const normalizedPlan = plan.toLowerCase();
  if (!PRICE_IDS[normalizedPlan]) {
    throw new Error("Unbekannter Plan.");
  }

  const normalizedInterval = interval === "year" ? "year" : "month";
  const priceId = getPriceId(normalizedPlan, normalizedInterval);
  if (!priceId) {
    throw new Error("Preis-ID fehlt. Bitte Environment Variablen prüfen.");
  }

  const customerId = await ensureStripeCustomer(userId);

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: customerId,
    success_url: successUrl,
    cancel_url: cancelUrl,
    metadata: {
      plan: normalizedPlan,
      interval: normalizedInterval,
      userId,
    },
    subscription_data: {
      metadata: {
        userId,
        plan: normalizedPlan,
      },
    },
    line_items: [{ price: priceId, quantity: 1 }],
  });

  return { checkoutUrl: session.url };
};

const handleCreatePortal = async ({ userId }) => {
  if (!userId) throw new Error("userId ist erforderlich.");
  const customerId = await ensureStripeCustomer(userId);
  const session = await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: successUrl,
  });
  return { portalUrl: session.url };
};

const handleGetSubscription = async ({ userId }) => {
  if (!userId) throw new Error("userId ist erforderlich.");
  if (!supabase) throw new Error("Supabase nicht verfügbar.");
  const { data, error } = await supabase
    .from("subscriptions")
    .select(
      "plan,status,current_period_end,stripe_customer_id,billing_interval"
    )
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    throw new Error("Konnte Subscription nicht laden.");
  }

  if (!data) {
    return {
      plan: "free",
      status: "inactive",
      currentPeriodEnd: null,
      interval: "month",
    };
  }

  return {
    plan: (data.plan || "free").toLowerCase(),
    status: data.status || "inactive",
    currentPeriodEnd: data.current_period_end,
    nextCharge: data.current_period_end,
    interval: data.billing_interval || "month",
    hasCustomer: Boolean(data.stripe_customer_id),
  };
};

exports.handler = async (event) => {
  if (event.httpMethod === "OPTIONS") {
    return {
      statusCode: 204,
      headers: CORS_HEADERS,
      body: "",
    };
  }

  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      headers: CORS_HEADERS,
      body: JSON.stringify({ error: "Nur POST erlaubt." }),
    };
  }

  try {
    const payload = JSON.parse(event.body || "{}");
    const action = payload.action;

    if (!action) {
      throw new Error("action ist erforderlich.");
    }

    let result;
    if (action === "create-checkout") {
      result = await handleCreateCheckout(payload);
    } else if (action === "create-portal") {
      result = await handleCreatePortal(payload);
    } else if (action === "get-subscription") {
      result = await handleGetSubscription(payload);
    } else {
      throw new Error("Unbekannte action.");
    }

    return {
      statusCode: 200,
      headers: CORS_HEADERS,
      body: JSON.stringify(result),
    };
  } catch (error) {
    console.error("Stripe handler error:", error);
    return {
      statusCode: 400,
      headers: CORS_HEADERS,
      body: JSON.stringify({ error: error.message || "Unbekannter Fehler." }),
    };
  }
};
