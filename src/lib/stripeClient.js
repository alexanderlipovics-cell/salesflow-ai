const STRIPE_ENDPOINT = "/.netlify/functions/stripe";

const postStripe = async (action, payload = {}) => {
  const response = await fetch(STRIPE_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action, ...payload }),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = data?.error || "Stripe-Service nicht verfügbar.";
    throw new Error(error);
  }
  return data;
};

export const createCheckoutSession = (payload) =>
  postStripe("create-checkout", payload);

export const createPortalSession = (payload) =>
  postStripe("create-portal", payload);

export const fetchSubscription = (payload) =>
  postStripe("get-subscription", payload);
