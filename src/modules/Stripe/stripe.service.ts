import { Prisma } from "@prisma/client";
import type Stripe from "stripe";
import httpStatus from "http-status";
import AppError from "../../errors/AppError";
import prisma from "../../lib/prisma";
import stripe from "../../lib/stripe";
import { AuditService } from "../Audit/audit.service";
import { NotificationService } from "../Notification/notification.service";
import {
  ensureCase,
  refreshFinancialStatus,
  refreshInstallmentStatus,
} from "../../shared/payment.helpers";

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Convert a Decimal dollar amount to Stripe's smallest currency unit (cents).
 * Stripe requires integer cents for USD (e.g. $10.50 → 1050).
 * We round to avoid floating-point precision issues.
 */
const toCents = (amount: Prisma.Decimal | number): number => {
  return Math.round(Number(amount) * 100);
};

// ─── Create Payment Intent ────────────────────────────────────────────────────

/**
 * Creates a Stripe PaymentIntent and records a STRIPE_PENDING payment in the DB.
 *
 * Security guarantees:
 *   - Amount is computed server-side from the installment or remaining plan balance.
 *   - Currency is taken from the active PaymentPlan, never from the request.
 *   - The client_secret is returned to the frontend but NEVER stored in the DB.
 *   - An idempotency key prevents duplicate PaymentIntents on retry.
 */
const createPaymentIntent = async (
  caseId: string,
  installmentId: string | undefined,
  actorId: string,
  isStaff: boolean,
  userRole?: string,
  actorEmail?: string,
) => {
  // 1. Verify case access
  await ensureCase(caseId, actorId, isStaff, userRole);

  // 2. Resolve active PaymentPlan (currency lock)
  const plan = await prisma.paymentPlan.findFirst({
    where: { caseId, isDeleted: false, isActive: true },
    orderBy: { createdAt: "desc" },
    select: { contractedFee: true, currency: true },
  });
  if (!plan) {
    throw new AppError(httpStatus.BAD_REQUEST, "No active payment plan found for this case. A payment plan must be created before paying online.");
  }

  const currency = plan.currency.toLowerCase();
  const today = new Date().toISOString().slice(0, 10);
  const idempotencyKey = `stripe-pi-${caseId}-${installmentId || "full"}-${today}`;

  // 3 & 4 & 5. F-07: Compute amount and create STRIPE_PENDING record inside an atomic transaction
  // Prevents concurrent requests from reading stale balance and double-charging.
  const { paymentRecord, amountDecimal, reusedIntent } = await prisma.$transaction(
    async (tx) => {
      // Check if an existing STRIPE_PENDING record already exists for this idempotency key
      const existing = await tx.payment.findUnique({
        where: { idempotencyKey },
        select: {
          id: true,
          caseId: true,
          installmentId: true,
          amount: true,
          currency: true,
          status: true,
          stripePaymentIntentId: true,
          idempotencyKey: true,
          case: {
            select: {
              caseCode: true,
              userId: true,
              assignedConsultantId: true,
              user: { select: { id: true, name: true, email: true } },
            },
          },
        },
      });

      if (existing && existing.status === "STRIPE_PENDING" && existing.stripePaymentIntentId) {
        return { paymentRecord: existing, amountDecimal: existing.amount, reusedIntent: true };
      }

      // Check overall remaining balance on the case inside transaction
      const paidOnCase = await tx.payment.aggregate({
        where: { caseId, isDeleted: false, status: "VERIFIED" },
        _sum: { amount: true },
      });
      const alreadyPaidOnCase = paidOnCase._sum.amount ?? new Prisma.Decimal(0);
      const caseRemaining = plan.contractedFee.sub(alreadyPaidOnCase);

      if (caseRemaining.lte(0)) {
        throw new AppError(httpStatus.BAD_REQUEST, "This case agreement has already been paid in full");
      }

      let targetAmount: Prisma.Decimal;
      if (installmentId) {
        const installment = await tx.installment.findFirst({
          where: { id: installmentId, isDeleted: false, paymentPlan: { caseId } },
          select: { id: true, amount: true, status: true },
        });
        if (!installment) {
          throw new AppError(httpStatus.BAD_REQUEST, "Installment does not belong to this case");
        }
        if (installment.status === "PAID") {
          throw new AppError(httpStatus.BAD_REQUEST, "This installment has already been paid");
        }
        const paidOnInstallment = await tx.payment.aggregate({
          where: { installmentId, isDeleted: false, status: "VERIFIED" },
          _sum: { amount: true },
        });
        const alreadyPaid = paidOnInstallment._sum.amount ?? new Prisma.Decimal(0);
        targetAmount = installment.amount.sub(alreadyPaid);
        targetAmount = Prisma.Decimal.min(targetAmount, caseRemaining);
        if (targetAmount.lte(0)) {
          throw new AppError(httpStatus.BAD_REQUEST, "This installment has already been fully paid");
        }
      } else {
        targetAmount = caseRemaining;
      }

      let created;
      try {
        created = await tx.payment.create({
          data: {
            caseId,
            installmentId: installmentId || null,
            amount: targetAmount,
            currency: plan.currency.toUpperCase(),
            paymentMethod: "STRIPE_ONLINE",
            paymentDate: new Date(),
            idempotencyKey,
            status: "STRIPE_PENDING",
          },
          select: {
            id: true,
            caseId: true,
            installmentId: true,
            amount: true,
            currency: true,
            status: true,
            stripePaymentIntentId: true,
            idempotencyKey: true,
            case: {
              select: {
                caseCode: true,
                userId: true,
                assignedConsultantId: true,
                user: { select: { id: true, name: true, email: true } },
              },
            },
          },
        });
      } catch (e: any) {
        if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
          const coll = await tx.payment.findUnique({
            where: { idempotencyKey },
            select: {
              id: true,
              caseId: true,
              installmentId: true,
              amount: true,
              currency: true,
              status: true,
              stripePaymentIntentId: true,
              idempotencyKey: true,
              case: {
                select: {
                  caseCode: true,
                  userId: true,
                  assignedConsultantId: true,
                  user: { select: { id: true, name: true, email: true } },
                },
              },
            },
          });
          if (coll) return { paymentRecord: coll, amountDecimal: coll.amount, reusedIntent: true };
        }
        throw e;
      }

      return { paymentRecord: created, amountDecimal: targetAmount, reusedIntent: false };
    },
    { maxWait: 10000, timeout: 25000 },
  );

  // If reusing a pending intent that already has a Stripe PaymentIntent, return it
  if (reusedIntent && paymentRecord.stripePaymentIntentId) {
    try {
      const existingPI = await stripe.paymentIntents.retrieve(paymentRecord.stripePaymentIntentId);
      if (existingPI.status !== "canceled" && existingPI.client_secret) {
        return {
          paymentId: paymentRecord.id,
          clientSecret: existingPI.client_secret,
          amount: Number(amountDecimal),
          currency: plan.currency.toUpperCase(),
          stripePaymentIntentId: existingPI.id,
        };
      }
    } catch {
      // If retrieval fails or status was cancelled, proceed to create fresh PaymentIntent below
    }
  }

  // 6. Create the Stripe PaymentIntent (after DB record exists so we have the paymentId)
  let paymentIntent: Stripe.PaymentIntent;
  try {
    paymentIntent = await stripe.paymentIntents.create(
      {
        amount: toCents(amountDecimal),
        currency,
        // Stripe will automatically present the best payment methods for the customer's location
        automatic_payment_methods: { enabled: true },
        // Metadata links the Stripe PI back to our DB records for webhook processing
        metadata: {
          paymentId: paymentRecord.id,
          caseId,
          installmentId: installmentId || "",
          actorId,
          environment: process.env.NODE_ENV || "development",
        },
        description: `AdSkill PayTrack — Case ${paymentRecord.case.caseCode}`,
      },
      // Stripe-level idempotency prevents duplicate PIs if the client retries
      { idempotencyKey: `pi-${paymentRecord.id}` },
    );
  } catch (stripeError: any) {
    // Roll back the DB payment record if Stripe PI creation fails
    await prisma.payment.delete({ where: { id: paymentRecord.id } }).catch(() => {});
    console.error("[STRIPE_ERROR] Failed to create PaymentIntent:", stripeError?.message);
    // F-18: Never expose raw Stripe error messages to the client — they may contain
    // API version details or internal codes useful to attackers. Log server-side only.
    const userMessage =
      stripeError?.type === "StripeCardError"
        ? "Your card was declined. Please try a different payment method."
        : "Unable to initialize payment. Please try again or contact support.";
    throw new AppError(httpStatus.INTERNAL_SERVER_ERROR, userMessage);
  }

  // 7. Update the DB payment record with the Stripe PaymentIntent ID
  await prisma.payment.update({
    where: { id: paymentRecord.id },
    data: { stripePaymentIntentId: paymentIntent.id },
  });

  // 8. Audit log
  AuditService.writeAuditLog({
    actorId,
    actorEmail,
    action: "CREATE_STRIPE_PAYMENT_INTENT",
    targetEntity: "Payment",
    targetId: paymentRecord.id,
    afterValue: {
      paymentId: paymentRecord.id,
      stripePaymentIntentId: paymentIntent.id,
      amount: amountDecimal.toString(),
      currency: plan.currency.toUpperCase(),
      caseId,
      installmentId: installmentId || null,
    },
  });

  // 9. Return clientSecret to frontend — it is NEVER stored in the DB
  return {
    paymentId: paymentRecord.id,
    clientSecret: paymentIntent.client_secret,
    amount: Number(amountDecimal),
    currency: plan.currency.toUpperCase(),
    stripePaymentIntentId: paymentIntent.id,
  };
};

/**
 * POST /api/v1/stripe/create-checkout-session
 *
 * Redirects the customer to the official Stripe Hosted Checkout page (checkout.stripe.com).
 * Maximum client trust: official Stripe domain, Apple Pay, Google Pay, SSL badge.
 */
const createCheckoutSession = async (
  caseId: string,
  installmentId: string | undefined,
  actorId: string,
  isStaff: boolean,
  userRole?: string,
  actorEmail?: string,
  origin = "http://localhost:3000",
) => {
  // 1. Verify case access
  await ensureCase(caseId, actorId, isStaff, userRole);

  // 2. Fetch the active payment plan
  const plan = await prisma.paymentPlan.findFirst({
    where: { caseId, isDeleted: false, isActive: true },
    orderBy: { createdAt: "desc" },
    select: { id: true, currency: true, contractedFee: true },
  });

  if (!plan) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      "No active payment plan found for this case. A payment plan must be created before paying online.",
    );
  }

  const currency = plan.currency.toLowerCase();
  // F-12: Stable idempotency key per day (removed Date.now())
  const today = new Date().toISOString().slice(0, 10);
  const idempotencyKey = `stripe-cs-${caseId}-${installmentId || "case"}-${today}`;

  // 3 & 4 & 5. F-07: Compute amount and create STRIPE_PENDING record inside an atomic transaction
  const { paymentRecord, amountDecimal, installmentTitle, reusedSession } = await prisma.$transaction(
    async (tx) => {
      // Check for existing pending session
      const existing = await tx.payment.findUnique({
        where: { idempotencyKey },
        select: {
          id: true,
          caseId: true,
          installmentId: true,
          amount: true,
          currency: true,
          status: true,
          stripePaymentIntentId: true,
          case: {
            select: {
              caseCode: true,
              serviceNameSnapshot: true,
              userId: true,
              user: { select: { id: true, name: true, email: true } },
            },
          },
        },
      });

      if (existing && existing.status === "STRIPE_PENDING" && existing.stripePaymentIntentId) {
        return {
          paymentRecord: existing,
          amountDecimal: existing.amount,
          installmentTitle: "",
          reusedSession: true,
        };
      }

      // Check overall remaining balance on the case
      const paidOnCase = await tx.payment.aggregate({
        where: { caseId, isDeleted: false, status: "VERIFIED" },
        _sum: { amount: true },
      });
      const alreadyPaidOnCase = paidOnCase._sum.amount ?? new Prisma.Decimal(0);
      const caseRemaining = plan.contractedFee.sub(alreadyPaidOnCase);

      if (caseRemaining.lte(0)) {
        throw new AppError(httpStatus.BAD_REQUEST, "This case agreement has already been paid in full");
      }

      let targetAmount: Prisma.Decimal;
      let title = "";

      if (installmentId) {
        const installment = await tx.installment.findFirst({
          where: { id: installmentId, isDeleted: false, paymentPlan: { caseId } },
          select: { id: true, amount: true, status: true, title: true, sequenceNumber: true },
        });
        if (!installment) {
          throw new AppError(httpStatus.BAD_REQUEST, "Installment does not belong to this case");
        }
        if (installment.status === "PAID") {
          throw new AppError(httpStatus.BAD_REQUEST, "This installment has already been paid");
        }
        const paidOnInstallment = await tx.payment.aggregate({
          where: { installmentId, isDeleted: false, status: "VERIFIED" },
          _sum: { amount: true },
        });
        const alreadyPaid = paidOnInstallment._sum.amount ?? new Prisma.Decimal(0);
        targetAmount = installment.amount.sub(alreadyPaid);
        targetAmount = Prisma.Decimal.min(targetAmount, caseRemaining);
        if (targetAmount.lte(0)) {
          throw new AppError(httpStatus.BAD_REQUEST, "This installment has already been fully paid");
        }
        title = installment.title || `Installment #${installment.sequenceNumber}`;
      } else {
        targetAmount = caseRemaining;
      }

      let created;
      try {
        created = await tx.payment.create({
          data: {
            caseId,
            installmentId: installmentId || null,
            amount: targetAmount,
            currency: plan.currency.toUpperCase(),
            paymentMethod: "STRIPE_CHECKOUT",
            paymentDate: new Date(),
            idempotencyKey,
            status: "STRIPE_PENDING",
          },
          select: {
            id: true,
            caseId: true,
            installmentId: true,
            amount: true,
            currency: true,
            status: true,
            stripePaymentIntentId: true,
            case: {
              select: {
                caseCode: true,
                serviceNameSnapshot: true,
                userId: true,
                user: { select: { id: true, name: true, email: true } },
              },
            },
          },
        });
      } catch (e: any) {
        if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
          const coll = await tx.payment.findUnique({
            where: { idempotencyKey },
            select: {
              id: true,
              caseId: true,
              installmentId: true,
              amount: true,
              currency: true,
              status: true,
              stripePaymentIntentId: true,
              case: {
                select: {
                  caseCode: true,
                  serviceNameSnapshot: true,
                  userId: true,
                  user: { select: { id: true, name: true, email: true } },
                },
              },
            },
          });
          if (coll) {
            return {
              paymentRecord: coll,
              amountDecimal: coll.amount,
              installmentTitle: "",
              reusedSession: true,
            };
          }
        }
        throw e;
      }

      return {
        paymentRecord: created,
        amountDecimal: targetAmount,
        installmentTitle: title,
        reusedSession: false,
      };
    },
    { maxWait: 10000, timeout: 25000 },
  );

  // If reusing a pending session that is still open on Stripe, return its URL
  if (reusedSession && paymentRecord.stripePaymentIntentId) {
    try {
      const existingSession = await stripe.checkout.sessions.retrieve(paymentRecord.stripePaymentIntentId);
      if (existingSession.status === "open" && existingSession.url) {
        return {
          paymentId: paymentRecord.id,
          url: existingSession.url,
          sessionId: existingSession.id,
          amount: Number(amountDecimal),
          currency: plan.currency.toUpperCase(),
        };
      }
    } catch {
      // If retrieval fails or session expired, proceed with fresh checkout session below
    }
  }

  // 6. Create Stripe Checkout Session
  let session: Stripe.Checkout.Session;
  try {
    session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: [
        {
          price_data: {
            currency,
            product_data: {
              name: `AdSkill PayTrack — Case ${paymentRecord.case.caseCode}`,
              description: installmentTitle
                ? `${installmentTitle} (${paymentRecord.case.serviceNameSnapshot})`
                : `Professional Settlement for Case ${paymentRecord.case.caseCode}`,
            },
            unit_amount: toCents(amountDecimal),
          },
          quantity: 1,
        },
      ],
      customer_email: actorEmail || paymentRecord.case.user?.email || undefined,
      success_url: `${origin}/payments/pay-online?success=true&session_id={CHECKOUT_SESSION_ID}&paymentId=${paymentRecord.id}`,
      cancel_url: `${origin}/payments/pay-online?caseId=${caseId}&cancelled=true`,
      metadata: {
        paymentId: paymentRecord.id,
        caseId,
        installmentId: installmentId || "",
        actorId,
        environment: process.env.NODE_ENV || "development",
      },
    });
  } catch (stripeError: any) {
    await prisma.payment.delete({ where: { id: paymentRecord.id } }).catch(() => {});
    console.error("[STRIPE_ERROR] Failed to create Checkout Session:", stripeError?.message);
    // F-18: Sanitize error message to client
    throw new AppError(
      httpStatus.INTERNAL_SERVER_ERROR,
      "Unable to initialize Stripe Checkout. Please try again or contact support.",
    );
  }

  // Update payment with session id as temporary reference
  await prisma.payment.update({
    where: { id: paymentRecord.id },
    data: { stripePaymentIntentId: session.id },
  });

  return {
    paymentId: paymentRecord.id,
    url: session.url,
    sessionId: session.id,
    amount: Number(amountDecimal),
    currency: plan.currency,
  };
};


// ─── Self-Healing Sync with Stripe API ────────────────────────────────────────

/**
 * Self-healing sync: directly queries Stripe API to verify payment state
 * if a webhook was missed, delayed, or not forwarded (e.g. during local development).
 * Cascades status to installment and case ledger automatically.
 */
const syncAndVerifyPaymentWithStripe = async (paymentId: string): Promise<boolean> => {
  const payment = await prisma.payment.findUnique({
    where: { id: paymentId },
    select: {
      id: true,
      status: true,
      stripePaymentIntentId: true,
      caseId: true,
      installmentId: true,
      amount: true,
      currency: true,
      case: {
        select: {
          caseCode: true,
          userId: true,
        },
      },
    },
  });

  if (!payment || payment.status === "VERIFIED" || !payment.stripePaymentIntentId) {
    return false;
  }

  if (!["STRIPE_PENDING", "PENDING", "STRIPE_PROCESSING", "STRIPE_ACTION_REQUIRED"].includes(payment.status)) {
    return false;
  }

  try {
    // 1. If it's a Checkout Session (starts with cs_)
    if (payment.stripePaymentIntentId.startsWith("cs_")) {
      const session = await stripe.checkout.sessions.retrieve(payment.stripePaymentIntentId);
      if (session.payment_status === "paid" || session.status === "complete") {
        const paymentIntentId =
          typeof session.payment_intent === "string"
            ? session.payment_intent
            : (session.payment_intent as any)?.id || null;

        await prisma.$transaction(
          async (tx) => {
            await tx.payment.update({
              where: { id: payment.id },
              data: {
                status: "VERIFIED",
                ...(paymentIntentId ? { stripePaymentIntentId: paymentIntentId } : {}),
                stripeMetadata: (session.customer_details as unknown as Prisma.InputJsonValue) || undefined,
              },
            });

            if (payment.installmentId) {
              await refreshInstallmentStatus(tx, payment.installmentId);
            }
            await refreshFinancialStatus(tx, payment.caseId);
          },
          { maxWait: 10000, timeout: 25000 },
        );

        NotificationService.dispatchPaymentVerifiedNotification(payment as any).catch(() => {});
        AuditService.writeAuditLog({
          actorId: session.metadata?.actorId || payment.case.userId,
          action: "STRIPE_CHECKOUT_AUTO_SYNC_VERIFIED",
          targetEntity: "Payment",
          targetId: payment.id,
          afterValue: { status: "VERIFIED", checkoutSessionId: session.id, paymentIntentId },
        });

        return true;
      }
    }

    // 2. If it's a Payment Intent (starts with pi_)
    if (payment.stripePaymentIntentId.startsWith("pi_")) {
      const pi = await stripe.paymentIntents.retrieve(payment.stripePaymentIntentId);
      if (pi.status === "succeeded") {
        await prisma.$transaction(
          async (tx) => {
            await tx.payment.update({
              where: { id: payment.id },
              data: { status: "VERIFIED" },
            });

            if (payment.installmentId) {
              await refreshInstallmentStatus(tx, payment.installmentId);
            }
            await refreshFinancialStatus(tx, payment.caseId);
          },
          { maxWait: 10000, timeout: 25000 },
        );

        NotificationService.dispatchPaymentVerifiedNotification(payment as any).catch(() => {});
        AuditService.writeAuditLog({
          actorId: pi.metadata?.actorId || payment.case.userId,
          action: "STRIPE_PI_AUTO_SYNC_VERIFIED",
          targetEntity: "Payment",
          targetId: payment.id,
          afterValue: { status: "VERIFIED", paymentIntentId: pi.id },
        });

        return true;
      }
    }
  } catch (err: any) {
    console.warn(`[STRIPE_AUTO_SYNC] Failed to sync payment ${paymentId}:`, err?.message);
  }

  return false;
};

// ─── Get Payment Intent Status ────────────────────────────────────────────────

/**
 * Returns the current status of a Stripe payment from our DB.
 * Used by the frontend to poll after a redirect or payment confirmation.
 * Runs self-healing sync if the payment is still marked pending.
 */
const getPaymentIntentStatus = async (
  paymentId: string,
  actorId: string,
  isStaff: boolean,
  userRole?: string,
) => {
  // Self-healing: if Stripe already collected funds, sync immediately
  await syncAndVerifyPaymentWithStripe(paymentId);

  const payment = await prisma.payment.findFirst({
    where: { id: paymentId, isDeleted: false },
    select: {
      id: true,
      status: true,
      amount: true,
      currency: true,
      stripePaymentIntentId: true,
      failureCode: true,
      failureMessage: true,
      caseId: true,
      case: { select: { userId: true, assignedConsultantId: true, caseCode: true } },
    },
  });
  if (!payment) throw new AppError(httpStatus.NOT_FOUND, "Payment not found");

  // Authorization check
  if (!isStaff && payment.case.userId !== actorId) {
    throw new AppError(httpStatus.FORBIDDEN, "You cannot access this payment");
  }
  if (userRole === "CONSULTANT" && payment.case.assignedConsultantId !== actorId) {
    throw new AppError(httpStatus.FORBIDDEN, "You are not assigned to this case");
  }

  return {
    paymentId: payment.id,
    status: payment.status,
    amount: Number(payment.amount),
    currency: payment.currency,
    stripePaymentIntentId: payment.stripePaymentIntentId,
    failureCode: payment.failureCode,
    failureMessage: payment.failureMessage,
  };
};

// ─── Webhook Event Handlers ───────────────────────────────────────────────────

/**
 * Routes an incoming Stripe webhook event to the appropriate handler.
 * Idempotency is enforced via the StripeWebhookLog table BEFORE this function is called.
 */
const handleWebhookEvent = async (event: Stripe.Event, webhookLogId: string): Promise<void> => {
  try {
    switch (event.type) {
      case "checkout.session.completed":
        await handleCheckoutSessionCompleted(event.data.object as Stripe.Checkout.Session);
        break;
      case "payment_intent.succeeded":
        await handlePaymentIntentSucceeded(event.data.object as Stripe.PaymentIntent);
        break;
      case "payment_intent.payment_failed":
        await handlePaymentIntentFailed(event.data.object as Stripe.PaymentIntent);
        break;
      case "payment_intent.canceled":
        await handlePaymentIntentCanceled(event.data.object as Stripe.PaymentIntent);
        break;
      case "payment_intent.requires_action":
        await handlePaymentIntentRequiresAction(event.data.object as Stripe.PaymentIntent);
        break;
      case "charge.succeeded":
        await handleChargeSucceeded(event.data.object as Stripe.Charge);
        break;
      case "charge.refund.updated":
        await handleChargeRefundUpdated(event.data.object as unknown as Stripe.Refund);
        break;
      // F-09: Handle chargeback events. When a client disputes a charge, Stripe withdraws
      // the funds from the merchant. Without handling this, the payment stays VERIFIED and
      // the case stays PAID — client gets the service for free.
      case "charge.dispute.created":
      case "charge.dispute.funds_withdrawn":
        await handleChargeDisputeCreated(event.data.object as Stripe.Dispute);
        break;
      case "charge.dispute.closed":
      case "charge.dispute.funds_reinstated":
        await handleChargeDisputeClosed(event.data.object as Stripe.Dispute);
        break;
      default:
        // Log but do not error on unknown event types — Stripe sends many event types
        console.log(`[STRIPE_WEBHOOK] Unhandled event type: ${event.type}`);
        await prisma.stripeWebhookLog.update({
          where: { id: webhookLogId },
          data: { status: "IGNORED", processedAt: new Date() },
        });
        return;
    }

    // Mark as successfully processed
    await prisma.stripeWebhookLog.update({
      where: { id: webhookLogId },
      data: { status: "PROCESSED", processedAt: new Date() },
    });
  } catch (error: any) {
    console.error(`[STRIPE_WEBHOOK] Error processing event ${event.type}:`, error?.message);
    // Mark as FAILED — Stripe will retry delivery
    await prisma.stripeWebhookLog.update({
      where: { id: webhookLogId },
      data: {
        status: "FAILED",
        errorMessage: error?.message || "Unknown processing error",
        processedAt: new Date(),
      },
    });
    // Re-throw so the controller can return a 500 to trigger Stripe retry
    throw error;
  }
};

/**
 * checkout.session.completed
 * The customer completed payment on the official Stripe Hosted Checkout page.
 * Auto-verifies the payment and cascades status to Case & Installments.
 */
const handleCheckoutSessionCompleted = async (session: Stripe.Checkout.Session): Promise<void> => {
  const paymentId = session.metadata?.paymentId;
  const paymentIntentId =
    typeof session.payment_intent === "string"
      ? session.payment_intent
      : (session.payment_intent as any)?.id || null;

  const payment = await prisma.payment.findFirst({
    where: {
      OR: [
        ...(paymentId ? [{ id: paymentId }] : []),
        ...(paymentIntentId ? [{ stripePaymentIntentId: paymentIntentId }] : []),
        { stripePaymentIntentId: session.id },
      ],
      isDeleted: false,
    },
    select: {
      id: true,
      status: true,
      caseId: true,
      installmentId: true,
      amount: true,
      currency: true,
      case: {
        select: {
          caseCode: true,
          userId: true,
          assignedConsultantId: true,
          user: { select: { id: true, name: true, email: true } },
        },
      },
    },
  });

  if (!payment) {
    console.warn(`[STRIPE_WEBHOOK] checkout.session.completed: payment not found for session ${session.id}`);
    return;
  }

  if (payment.status === "VERIFIED") {
    console.log(`[STRIPE_WEBHOOK] Payment ${payment.id} already VERIFIED — skipping duplicate processing`);
    return;
  }

  await prisma.$transaction(
    async (tx) => {
      await tx.payment.update({
        where: { id: payment.id },
        data: {
          status: "VERIFIED",
          ...(paymentIntentId ? { stripePaymentIntentId: paymentIntentId } : {}),
          stripeMetadata: (session.customer_details as unknown as Prisma.InputJsonValue) || undefined,
        },
      });

      if (payment.installmentId) {
        await refreshInstallmentStatus(tx, payment.installmentId);
      }
      await refreshFinancialStatus(tx, payment.caseId);
    },
    { maxWait: 10000, timeout: 25000 },
  );

  console.log(`[STRIPE_WEBHOOK] Payment ${payment.id} verified via checkout.session.completed`);

  NotificationService.dispatchPaymentVerifiedNotification(payment as any).catch((err: any) => {
    console.error("[NOTIFICATION] Failed to dispatch payment verified notification:", err?.message);
  });

  AuditService.writeAuditLog({
    actorId: session.metadata?.actorId || payment.case.userId,
    action: "STRIPE_CHECKOUT_COMPLETED",
    targetEntity: "Payment",
    targetId: payment.id,
    afterValue: {
      status: "VERIFIED",
      checkoutSessionId: session.id,
      paymentIntentId,
      amount: payment.amount,
      currency: payment.currency,
    },
  });
};

/**
 * payment_intent.succeeded
 * The payment was confirmed and funds captured.
 * Auto-verifies the payment (bypasses manual verification step).
 */
const handlePaymentIntentSucceeded = async (pi: Stripe.PaymentIntent): Promise<void> => {
  const paymentId = pi.metadata?.paymentId;
  if (!paymentId) {
    console.warn(`[STRIPE_WEBHOOK] payment_intent.succeeded: no paymentId in metadata for PI ${pi.id}`);
    return;
  }

  // Fetch current payment to check status (idempotency guard layer 3)
  const existingPayment = await prisma.payment.findFirst({
    where: { id: paymentId, isDeleted: false },
    select: {
      id: true,
      status: true,
      caseId: true,
      installmentId: true,
      amount: true,
      currency: true,
      case: {
        select: {
          caseCode: true,
          userId: true,
          assignedConsultantId: true,
          user: { select: { id: true, name: true, email: true } },
        },
      },
    },
  });

  if (!existingPayment) {
    console.error(`[STRIPE_WEBHOOK] payment_intent.succeeded: payment ${paymentId} not found in DB`);
    return;
  }

  // Idempotency guard: already VERIFIED — skip
  if (existingPayment.status === "VERIFIED") {
    console.log(`[STRIPE_WEBHOOK] Payment ${paymentId} already VERIFIED — skipping`);
    return;
  }

  // Extract card metadata from the PaymentIntent's payment_method_details (if available)
  // charge.succeeded fires separately with full charge details, but we capture basics here
  const stripeMetadata: Record<string, unknown> = {
    stripePaymentIntentId: pi.id,
    amount: pi.amount,
    currency: pi.currency,
    paymentMethodTypes: pi.payment_method_types,
  };

  // Update payment to VERIFIED inside a transaction (same atomic pattern as manual verify)
  await prisma.$transaction(
    async (tx) => {
      await tx.payment.update({
        where: { id: paymentId },
        data: {
          status: "VERIFIED",
          stripePaymentIntentId: pi.id,
          stripeMetadata: stripeMetadata as Prisma.InputJsonValue,
          paymentDate: new Date(),
        },
      });

      if (existingPayment.installmentId) {
        await refreshInstallmentStatus(tx, existingPayment.installmentId);
      }
      await refreshFinancialStatus(tx, existingPayment.caseId);
    },
    { maxWait: 10000, timeout: 25000 },
  );

  console.log(`[STRIPE_WEBHOOK] Payment ${paymentId} verified successfully (PI: ${pi.id})`);

  // Audit log (fire-and-forget — non-blocking)
  AuditService.writeAuditLog({
    action: "STRIPE_PAYMENT_SUCCEEDED",
    targetEntity: "Payment",
    targetId: paymentId,
    afterValue: {
      status: "VERIFIED",
      stripePaymentIntentId: pi.id,
      amount: existingPayment.amount.toString(),
      currency: existingPayment.currency,
    },
  });

  // Dispatch payment verified notification and email (fire-and-forget)
  NotificationService.dispatchPaymentVerifiedNotification({
    paymentId,
    caseId: existingPayment.caseId,
    caseCode: existingPayment.case.caseCode,
    clientId: existingPayment.case.userId,
    clientName: existingPayment.case.user?.name || "Client",
    clientEmail: existingPayment.case.user?.email || "",
    amount: existingPayment.amount.toString(),
    currency: existingPayment.currency,
    receiptNumber: `STRIPE-${paymentId.slice(0, 8).toUpperCase()}`,
    verifierName: "Stripe Payment System",
    assignedConsultantId: existingPayment.case.assignedConsultantId,
  }).catch((err: any) => console.error("[NOTIFICATION_ERROR] Stripe success notification:", err));
};

/**
 * payment_intent.payment_failed
 * The payment was declined or otherwise failed.
 */
const handlePaymentIntentFailed = async (pi: Stripe.PaymentIntent): Promise<void> => {
  const paymentId = pi.metadata?.paymentId;
  if (!paymentId) {
    console.warn(`[STRIPE_WEBHOOK] payment_intent.payment_failed: no paymentId in metadata for PI ${pi.id}`);
    return;
  }

  const lastError = pi.last_payment_error;
  const failureCode = lastError?.code || "unknown_error";
  const failureMessage = lastError?.message || "Payment failed";

  await prisma.payment.updateMany({
    where: { id: paymentId, isDeleted: false, status: { not: "VERIFIED" } },
    data: {
      status: "FAILED",
      failureCode,
      failureMessage,
      stripePaymentIntentId: pi.id,
    },
  });

  console.log(`[STRIPE_WEBHOOK] Payment ${paymentId} FAILED (code: ${failureCode})`);

  AuditService.writeAuditLog({
    action: "STRIPE_PAYMENT_FAILED",
    targetEntity: "Payment",
    targetId: paymentId,
    afterValue: { status: "FAILED", failureCode, failureMessage, stripePaymentIntentId: pi.id },
  });
};

/**
 * payment_intent.canceled
 * The PaymentIntent was canceled (e.g. client abandoned or timeout).
 */
const handlePaymentIntentCanceled = async (pi: Stripe.PaymentIntent): Promise<void> => {
  const paymentId = pi.metadata?.paymentId;
  if (!paymentId) return;

  await prisma.payment.updateMany({
    where: { id: paymentId, isDeleted: false, status: { not: "VERIFIED" } },
    data: { status: "CANCELLED", stripePaymentIntentId: pi.id },
  });

  console.log(`[STRIPE_WEBHOOK] Payment ${paymentId} CANCELLED (PI: ${pi.id})`);

  AuditService.writeAuditLog({
    action: "STRIPE_PAYMENT_CANCELLED",
    targetEntity: "Payment",
    targetId: paymentId,
    afterValue: { status: "CANCELLED", stripePaymentIntentId: pi.id },
  });
};

/**
 * payment_intent.requires_action
 * 3D Secure authentication is required. Update status to inform the UI.
 */
const handlePaymentIntentRequiresAction = async (pi: Stripe.PaymentIntent): Promise<void> => {
  const paymentId = pi.metadata?.paymentId;
  if (!paymentId) return;

  await prisma.payment.updateMany({
    where: { id: paymentId, isDeleted: false, status: "STRIPE_PENDING" },
    data: { status: "STRIPE_ACTION_REQUIRED", stripePaymentIntentId: pi.id },
  });

  console.log(`[STRIPE_WEBHOOK] Payment ${paymentId} requires 3DS action (PI: ${pi.id})`);
};

/**
 * charge.succeeded
 * Fires alongside payment_intent.succeeded. Contains the Charge ID
 * (ch_xxx) and detailed card metadata (last4, brand, exp_month, etc.).
 * We store stripeChargeId here — it is required for the Stripe Refunds API.
 */
const handleChargeSucceeded = async (charge: Stripe.Charge): Promise<void> => {
  const piId = typeof charge.payment_intent === "string" ? charge.payment_intent : charge.payment_intent?.id;
  if (!piId) return;

  // Extract card metadata
  const cardDetails = charge.payment_method_details?.card;
  const stripeMetadata: Record<string, unknown> = {
    last4: cardDetails?.last4,
    brand: cardDetails?.brand,
    exp_month: cardDetails?.exp_month,
    exp_year: cardDetails?.exp_year,
    funding: cardDetails?.funding,
    country: cardDetails?.country,
    network: cardDetails?.network,
    chargeId: charge.id,
  };

  // Find the payment by Stripe PaymentIntent ID
  const payment = await prisma.payment.findFirst({
    where: { stripePaymentIntentId: piId, isDeleted: false },
    select: { id: true },
  });
  if (!payment) {
    console.warn(`[STRIPE_WEBHOOK] charge.succeeded: no payment found for PI ${piId}`);
    return;
  }

  await prisma.payment.update({
    where: { id: payment.id },
    data: {
      stripeChargeId: charge.id,
      stripePaymentMethodId: typeof charge.payment_method === "string" ? charge.payment_method : undefined,
      stripeMetadata: stripeMetadata as Prisma.InputJsonValue,
    },
  });

  console.log(`[STRIPE_WEBHOOK] Charge ${charge.id} stored for payment ${payment.id}`);
};

/**
 * charge.refund.updated
 * Fires when a refund status changes. The event data is a Stripe.Refund object.
 * We look up the payment via stripeChargeId (stored during charge.succeeded) and
 * update the payment status accordingly.
 */
const handleChargeRefundUpdated = async (refund: Stripe.Refund): Promise<void> => {
  if (!refund.charge) return;

  const chargeId = typeof refund.charge === "string" ? refund.charge : refund.charge.id;

  const payment = await prisma.payment.findFirst({
    where: { stripeChargeId: chargeId, isDeleted: false },
    select: { id: true, amount: true, caseId: true, installmentId: true },
  });
  if (!payment) {
    console.warn(`[STRIPE_WEBHOOK] charge.refund.updated: no payment found for charge ${chargeId}`);
    return;
  }

  // F-11: Compare in integer cents to avoid JavaScript floating-point imprecision.
  // e.g. 1230 / 100 = 12.299999... in JS, which would misclassify a full $12.30
  // refund as PARTIALLY_REFUNDED.
  const refundCents = refund.amount; // already an integer from Stripe
  const paymentCents = Math.round(Number(payment.amount) * 100);
  const isFullRefund = refundCents >= paymentCents;
  const newStatus = isFullRefund ? "REFUNDED" : "PARTIALLY_REFUNDED";
  const refundAmountDollars = (refund.amount / 100).toFixed(2);

  await prisma.$transaction(
    async (tx) => {
      await tx.payment.update({
        where: { id: payment.id },
        data: {
          status: newStatus,
          stripeRefundId: refund.id,
          operationalNotes: `Stripe refund processed: ${refundAmountDollars} ${refund.currency.toUpperCase()} (status: ${refund.status})`,
        },
      });

      if (payment.installmentId) {
        await refreshInstallmentStatus(tx, payment.installmentId);
      }
      await refreshFinancialStatus(tx, payment.caseId);
    },
    { maxWait: 10000, timeout: 25000 },
  );

  console.log(`[STRIPE_WEBHOOK] Payment ${payment.id} refund status updated to ${newStatus} (Refund: ${refund.id})`);

  AuditService.writeAuditLog({
    action: "STRIPE_REFUND_UPDATED",
    targetEntity: "Payment",
    targetId: payment.id,
    afterValue: {
      status: newStatus,
      stripeRefundId: refund.id,
      amountRefunded: refund.amount,
      currency: refund.currency,
      refundStatus: refund.status,
    },
  });
};

// ─── Dispute / Chargeback Handlers (F-09) ────────────────────────────────────

/**
 * charge.dispute.created | charge.dispute.funds_withdrawn
 * A client has initiated a chargeback. Stripe withdraws the funds immediately.
 * Mark the payment DISPUTED and refresh financial status so the case is no
 * longer shown as PAID — the client cannot receive service for free.
 */
const handleChargeDisputeCreated = async (dispute: Stripe.Dispute): Promise<void> => {
  const chargeId = typeof dispute.charge === "string" ? dispute.charge : (dispute.charge as any)?.id;
  if (!chargeId) return;

  const payment = await prisma.payment.findFirst({
    where: { stripeChargeId: chargeId, isDeleted: false },
    select: { id: true, caseId: true, installmentId: true, amount: true, currency: true },
  });
  if (!payment) {
    console.warn(`[STRIPE_WEBHOOK] charge.dispute.created: no payment found for charge ${chargeId}`);
    return;
  }

  await prisma.$transaction(
    async (tx) => {
      await tx.payment.update({
        where: { id: payment.id },
        data: {
          status: "DISPUTED",
          operationalNotes: `Chargeback opened (dispute: ${dispute.id}). Amount: ${dispute.amount / 100} ${dispute.currency.toUpperCase()}. Reason: ${dispute.reason}.`,
        },
      });
      if (payment.installmentId) {
        await refreshInstallmentStatus(tx, payment.installmentId);
      }
      await refreshFinancialStatus(tx, payment.caseId);
    },
    { maxWait: 10000, timeout: 25000 },
  );

  // Alert staff immediately — this is a revenue loss event
  console.error(`[STRIPE_DISPUTE] ⚠️  Chargeback opened on payment ${payment.id} (charge ${chargeId}). Dispute: ${dispute.id}. Amount: ${dispute.amount / 100} ${dispute.currency.toUpperCase()}`);

  AuditService.writeAuditLog({
    action: "STRIPE_DISPUTE_CREATED",
    targetEntity: "Payment",
    targetId: payment.id,
    afterValue: { status: "DISPUTED", disputeId: dispute.id, chargeId, reason: dispute.reason, amount: dispute.amount },
  });
};

/**
 * charge.dispute.closed | charge.dispute.funds_reinstated
 * The dispute was resolved — either won (funds reinstated) or lost (funds gone).
 * If won: revert to VERIFIED and restore financial status.
 * If lost: keep DISPUTED so staff can see the outcome.
 */
const handleChargeDisputeClosed = async (dispute: Stripe.Dispute): Promise<void> => {
  const chargeId = typeof dispute.charge === "string" ? dispute.charge : (dispute.charge as any)?.id;
  if (!chargeId) return;

  const payment = await prisma.payment.findFirst({
    where: { stripeChargeId: chargeId, isDeleted: false },
    select: { id: true, caseId: true, installmentId: true },
  });
  if (!payment) return;

  const won = dispute.status === "won";

  await prisma.$transaction(
    async (tx) => {
      await tx.payment.update({
        where: { id: payment.id },
        data: {
          status: won ? "VERIFIED" : "DISPUTED",
          operationalNotes: `Dispute ${dispute.id} closed: ${dispute.status}. ${won ? "Funds reinstated." : "Funds lost to chargeback."}`,
        },
      });
      if (payment.installmentId) {
        await refreshInstallmentStatus(tx, payment.installmentId);
      }
      await refreshFinancialStatus(tx, payment.caseId);
    },
    { maxWait: 10000, timeout: 25000 },
  );

  console.log(`[STRIPE_DISPUTE] Dispute ${dispute.id} closed with status "${dispute.status}" for payment ${payment.id}`);

  AuditService.writeAuditLog({
    action: "STRIPE_DISPUTE_CLOSED",
    targetEntity: "Payment",
    targetId: payment.id,
    afterValue: { disputeStatus: dispute.status, disputeId: dispute.id, paymentStatus: won ? "VERIFIED" : "DISPUTED" },
  });
};



/**
 * Issues a refund via the Stripe Refunds API for a Stripe-originated payment.
 * Called by the existing PaymentService.refundPayment() when stripeChargeId is present.
 *
 * For manual payments (no stripeChargeId), the existing manual refund path is used.
 */
const createStripeRefund = async (
  paymentId: string,
  refundAmount: number | undefined,
  reason: string,
  actorId: string,
  actorEmail?: string,
): Promise<Stripe.Refund> => {
  const payment = await prisma.payment.findFirst({
    where: { id: paymentId, isDeleted: false },
    select: { id: true, stripeChargeId: true, amount: true, currency: true },
  });
  if (!payment) throw new AppError(httpStatus.NOT_FOUND, "Payment not found");
  if (!payment.stripeChargeId) {
    throw new AppError(httpStatus.BAD_REQUEST, "This payment was not made via Stripe and cannot be refunded through the Stripe API");
  }

  const refundAmountCents = refundAmount ? Math.round(refundAmount * 100) : undefined;

  // Map our reason string to Stripe's accepted reason enum
  const stripeReason: Stripe.RefundCreateParams.Reason =
    reason.toLowerCase().includes("duplicate")
      ? "duplicate"
      : reason.toLowerCase().includes("fraud")
        ? "fraudulent"
        : "requested_by_customer";

  const refund = await stripe.refunds.create({
    charge: payment.stripeChargeId,
    ...(refundAmountCents ? { amount: refundAmountCents } : {}),
    reason: stripeReason,
    metadata: {
      paymentId,
      actorId,
      internalReason: reason.slice(0, 500), // Stripe metadata values max 500 chars
    },
  });

  console.log(`[STRIPE] Refund ${refund.id} created for payment ${paymentId}`);

  AuditService.writeAuditLog({
    actorId,
    actorEmail,
    action: "STRIPE_REFUND_CREATED",
    targetEntity: "Payment",
    targetId: paymentId,
    afterValue: {
      stripeRefundId: refund.id,
      refundAmount: refund.amount,
      currency: refund.currency,
      reason: stripeReason,
      status: refund.status,
    },
  });

  return refund;
};

// ─── Export ───────────────────────────────────────────────────────────────────

export const StripeService = {
  createPaymentIntent,
  createCheckoutSession,
  getPaymentIntentStatus,
  handleWebhookEvent,
  createStripeRefund,
  syncAndVerifyPaymentWithStripe,
};
