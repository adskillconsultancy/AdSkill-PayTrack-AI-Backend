import Stripe from "stripe";
import config from "../config";

/**
 * Shared Stripe SDK singleton.
 *
 * - API version is pinned to the current stable release to prevent unexpected
 *   breaking changes if Stripe updates their default.
 * - The secret key is loaded exclusively from the server-side config.
 *   It is NEVER exposed to the frontend or any client-accessible endpoint.
 * - TypeScript type-safety is enforced via the Stripe SDK's built-in types.
 */
const stripeApiKey =
  config.stripe.secret_key && config.stripe.secret_key.trim().length > 0
    ? config.stripe.secret_key
    : "sk_test_placeholder_not_configured";

if (!config.stripe.secret_key) {
  console.warn(
    "⚠️  [STRIPE] STRIPE_SECRET_KEY is not set. Using placeholder to prevent startup crash.",
  );
}

const stripe = new Stripe(stripeApiKey, {
  apiVersion: "2026-09-30.endive",
  typescript: true,
  // Timeout after 30s to align with Vercel's serverless function execution limit
  timeout: 30000,
  // Identify integration in Stripe Dashboard analytics
  appInfo: {
    name: "AdSkill PayTrack AI",
    version: "1.0.0",
  },
});

export default stripe;
