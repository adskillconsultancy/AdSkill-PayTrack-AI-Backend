import { Request, Response } from "express";
import httpStatus from "http-status";
import Stripe from "stripe";
import config from "../../config";
import stripe from "../../lib/stripe";
import prisma from "../../lib/prisma";
import catchAsync from "../../shared/catchAsync";
import sendResponse from "../../shared/sendResponse";
import { StripeService } from "./stripe.service";

const isStaff = (req: Request) => req.user?.role !== "CLIENT";

// ─── Create Payment Intent ────────────────────────────────────────────────────

/**
 * POST /api/v1/stripe/create-payment-intent
 *
 * Creates a Stripe PaymentIntent and returns the clientSecret to the frontend.
 * The amount and currency are computed server-side — never from client input.
 */
const createPaymentIntent = catchAsync(async (req: Request, res: Response) => {
  const { caseId, installmentId, description } = req.body;

  const result = await StripeService.createPaymentIntent(
    caseId,
    installmentId,
    req.user!.id,
    isStaff(req),
    req.user?.role,
    req.user?.email,
  );

  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: "Payment intent created successfully",
    data: result,
  });
});

// ─── Create Checkout Session (Stripe Hosted Page) ────────────────────────────

/**
 * POST /api/v1/stripe/create-checkout-session
 *
 * Creates an official Stripe Hosted Checkout Session (checkout.stripe.com).
 * Maximum client trust: official Stripe domain, Apple Pay, Google Pay, SSL badge.
 */
const createCheckoutSession = catchAsync(async (req: Request, res: Response) => {
  const { caseId, installmentId } = req.body;
  // F-02: Never use req.headers.origin for redirect URLs — it is attacker-controlled.
  // A crafted Origin: https://evil.com header would cause Stripe to redirect back to
  // the attacker's domain with the session_id and paymentId in the URL.
  const origin = config.client_url;

  const result = await StripeService.createCheckoutSession(
    caseId,
    installmentId,
    req.user!.id,
    isStaff(req),
    req.user?.role,
    req.user?.email,
    origin,
  );

  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: "Checkout session created successfully",
    data: result,
  });
});

// ─── Get Payment Intent Status ────────────────────────────────────────────────

/**
 * GET /api/v1/stripe/payment-intent-status/:paymentId
 *
 * Returns current payment status from the DB (not from Stripe API).
 * Used by the frontend for status polling after redirect or confirmation.
 */
const getPaymentIntentStatus = catchAsync(async (req: Request, res: Response) => {
  const result = await StripeService.getPaymentIntentStatus(
    req.params.paymentId,
    req.user!.id,
    isStaff(req),
    req.user?.role,
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Payment status retrieved successfully",
    data: result,
  });
});

// ─── Stripe Webhook ───────────────────────────────────────────────────────────

/**
 * POST /api/v1/stripe/webhook
 *
 * SECURITY CRITICAL:
 *   - This route uses express.raw() body parser (registered in stripe.route.ts)
 *   - No JWT auth middleware — authentication is via Stripe-Signature HMAC verification
 *   - Must always return 200 for processed events (Stripe retries on non-2xx)
 *   - Returns 400 only on signature verification failure
 *
 * Idempotency:
 *   1. Signature verification (prevents forged events)
 *   2. StripeWebhookLog.stripeEventId @unique (prevents duplicate processing)
 *   3. Payment status check in service (prevents double-verification)
 */
const handleWebhook = async (req: Request, res: Response): Promise<void> => {
  const sig = req.headers["stripe-signature"];

  if (!sig) {
    res.status(400).json({ success: false, message: "Missing Stripe-Signature header" });
    return;
  }

  if (!config.stripe.webhook_secret) {
    console.error("[STRIPE_WEBHOOK] STRIPE_WEBHOOK_SECRET is not configured");
    res.status(500).json({ success: false, message: "Webhook not configured" });
    return;
  }

  // 1. Verify Stripe signature — MUST use raw body Buffer, NOT parsed JSON
  // F-05: Assert the body is a Buffer. The webhook route uses express.raw() so req.body
  // IS the Buffer. If this ever fails it means middleware order was changed — fail loudly
  // rather than silently accepting a parsed object that makes constructEvent() fail cryptically.
  let event: Stripe.Event;
  try {
    const rawPayload = (req as any).rawBody || (Buffer.isBuffer(req.body) ? req.body : undefined);
    if (!rawPayload || !Buffer.isBuffer(rawPayload)) {
      console.error("[STRIPE_WEBHOOK] Body is not a Buffer — express.raw() or rawBody middleware may be misconfigured");
      res.status(400).json({ success: false, message: "Invalid body format" });
      return;
    }
    event = stripe.webhooks.constructEvent(
      rawPayload,
      sig,
      config.stripe.webhook_secret,
    );
  } catch (err: any) {
    console.error(`[STRIPE_WEBHOOK] Signature verification failed: ${err?.message}`);
    res.status(400).json({ success: false, message: `Webhook signature verification failed: ${err?.message}` });
    return;
  }

  const paymentIntentId =
    (event.data.object as any)?.id?.startsWith("pi_")
      ? (event.data.object as any).id
      : (event.data.object as any)?.payment_intent || null;

  // 2. Idempotency check — look up existing log entry
  const existingLog = await prisma.stripeWebhookLog.findUnique({
    where: { stripeEventId: event.id },
    select: { id: true, status: true },
  });

  if (existingLog?.status === "PROCESSED") {
    // Already handled — return 200 immediately (Stripe may re-deliver; this is expected)
    console.log(`[STRIPE_WEBHOOK] Duplicate event ${event.id} — already PROCESSED, skipping`);
    res.status(200).json({ received: true, duplicate: true });
    return;
  }

  // 3. Upsert the webhook log (create on first delivery, recover on retry after partial failure)
  let webhookLog: { id: string };
  try {
    webhookLog = await prisma.stripeWebhookLog.upsert({
      where: { stripeEventId: event.id },
      create: {
        stripeEventId: event.id,
        eventType: event.type,
        paymentIntentId: typeof paymentIntentId === "string" ? paymentIntentId : null,
        status: "RECEIVED",
        rawPayload: event as unknown as import("@prisma/client").Prisma.InputJsonValue,
      },
      update: {
        // On retry after partial failure: reset to RECEIVED so processing re-runs
        status: "RECEIVED",
        errorMessage: null,
      },
      select: { id: true },
    });
  } catch (dbErr: any) {
    console.error("[STRIPE_WEBHOOK] Failed to upsert webhook log:", dbErr?.message);
    // Return 500 so Stripe will retry — we want to process this event
    res.status(500).json({ success: false, message: "Webhook log creation failed" });
    return;
  }

  // 4. Process the event
  try {
    await StripeService.handleWebhookEvent(event, webhookLog.id);
    res.status(200).json({ received: true });
  } catch (processingErr: any) {
    console.error(`[STRIPE_WEBHOOK] Processing error for ${event.type}:`, processingErr?.message);
    // Return 500 to trigger Stripe retry (the webhook log is already marked FAILED)
    res.status(500).json({ success: false, message: "Webhook processing failed" });
  }
};

export const StripeController = {
  createPaymentIntent,
  createCheckoutSession,
  getPaymentIntentStatus,
  handleWebhook,
};
