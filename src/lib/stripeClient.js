import { loadStripe } from "@stripe/stripe-js";

const STRIPE_ENDPOINT = "/.netlify/functions/stripe";
const ENV =
  (typeof import.meta !== "undefined" && import.meta.env) || (typeof process !== "undefined" && process.env) || {};

let stripePromise = null;

export const getStripe = () => {
  if (!stripePromise) {
    const publishableKey = ENV.VITE_STRIPE_PUBLISHABLE_KEY || ENV.STRIPE_PUBLISHABLE_KEY;
    if (!publishableKey) {
      throw new Error("Stripe Publishable Key ist nicht konfiguriert.");
    }
    stripePromise = loadStripe(publishableKey);
  }
  return stripePromise;
};

const callStripeFunction = async (payload = {}) => {
  const response = await fetch(STRIPE_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data?.error || "Stripe-Service nicht verfügbar.");
  }
  return data;
};

export const createCheckoutSession = async (options = {}) => {
  const payload =
    typeof options === "string"
      ? { action: "create-checkout", priceId: options }
      : { action: options.action || "create-checkout", ...options };

  const data = await callStripeFunction(payload);

  if (data.sessionId) {
    const stripe = await getStripe();
    await stripe.redirectToCheckout({ sessionId: data.sessionId });
    return { redirected: true };
  }

  if (data.checkoutUrl) {
    window.location.assign(data.checkoutUrl);
    return { redirected: true };
  }

  return data;
};

export const createPortalSession = (payload) =>
  callStripeFunction({ action: "create-portal", ...payload });

export const fetchSubscription = (payload) =>
  callStripeFunction({ action: "get-subscription", ...payload });
