import { Router, raw } from "express";
import auth from "../../middlewares/auth";
import validateRequest from "../../middlewares/validateRequest";
import { PERMISSIONS } from "../User/user.constant";
import { StripeController } from "./stripe.controller";
import { StripeValidation } from "./stripe.validation";

const router = Router();

/**
 * CRITICAL: The webhook route uses express.raw() instead of express.json().
 *
 * Stripe signature verification requires the raw request body buffer.
 * If express.json() runs first, it parses the body into an object and the
 * raw bytes are lost — stripe.webhooks.constructEvent() will then throw
 * "No signatures found matching the expected signature for payload".
 *
 * This router-level raw() middleware only applies to the webhook route.
 * All other routes in this router still receive parsed JSON via app.ts.
 */

// POST /api/v1/stripe/webhook — NO JWT auth (Stripe signature is the auth)
router.post(
  "/webhook",
  raw({ type: "application/json" }),
  StripeController.handleWebhook,
);

// POST /api/v1/stripe/create-payment-intent — requires payment:pay permission
router.post(
  "/create-payment-intent",
  auth(PERMISSIONS.PAYMENT_PAY),
  validateRequest(StripeValidation.createPaymentIntentSchema),
  StripeController.createPaymentIntent,
);

// POST /api/v1/stripe/create-checkout-session — official Stripe Hosted Checkout (checkout.stripe.com)
router.post(
  "/create-checkout-session",
  auth(PERMISSIONS.PAYMENT_PAY),
  validateRequest(StripeValidation.createPaymentIntentSchema),
  StripeController.createCheckoutSession,
);

// GET /api/v1/stripe/payment-intent-status/:paymentId — requires payment:read permission
router.get(
  "/payment-intent-status/:paymentId",
  auth(PERMISSIONS.PAYMENT_READ),
  validateRequest(StripeValidation.paymentIntentStatusSchema),
  StripeController.getPaymentIntentStatus,
);

export const StripeRoutes = router;
