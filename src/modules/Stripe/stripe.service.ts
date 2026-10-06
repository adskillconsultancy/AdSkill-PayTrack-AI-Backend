import { Prisma } from "@prisma/client";
import type Stripe from "stripe";
import httpStatus from "http-status";
import AppError from "../../errors/AppError";
import prisma from "../../lib/prisma";
import stripe from "../../lib/stripe";
import { AuditService } from "../Audit/audit.service";
import { NotificationService } from "../Notification/notification.service";

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Convert a Decimal dollar amount to Stripe's smallest currency unit (cents).
 * Stripe requires integer cents for USD (e.g. $10.50 → 1050).
 * We round to avoid floating-point precision issues.
 */
const toCents = (amount: Prisma.Decimal | number): number => {
  return Math.round(Number(amount) * 100);
};

/**
 * Ensure the actor (client or staff) has access to the requested case.
 * Reuses the same ownership/assignment rules as the existing PaymentService.
 */
const ensureCase = async (caseId: string, actorId: string, isStaff: boolean, userRole?: string) => {
  const record = await prisma.clientCase.findFirst({
    where: { id: caseId, isDeleted: false },
    select: {
      id: true,
      userId: true,
      assignedConsultantId: true,
      financialStatus: true,
    },
  });
  if (!record) throw new AppError(httpStatus.NOT_FOUND, "Client case not found");
  if (!isStaff && record.userId !== actorId) {
    throw new AppError(httpStatus.FORBIDDEN, "You cannot access this client case");
  }
  if (userRole === "CONSULTANT" && record.assignedConsultantId !== actorId) {
    throw new AppError(httpStatus.FORBIDDEN, "You are not assigned to this client case");
  }
  return record;
};

/**
 * Recalculate and persist ClientCase.financialStatus based on verified payments
 * vs contracted fee. Identical logic to the existing PaymentService helper.
 */
const refreshFinancialStatus = async (tx: Prisma.TransactionClient, caseId: string) => {
  const plan = await tx.paymentPlan.findFirst({
    where: { caseId, isDeleted: false, isActive: true },
    orderBy: { createdAt: "desc" },
    select: { contractedFee: true },
  });

  let targetFee = plan?.contractedFee;
  if (!targetFee) {
    const caseRec = await tx.clientCase.findUnique({
      where: { id: caseId },
      select: { service: { select: { baseFee: true } } },
    });
    targetFee = caseRec?.service?.baseFee;
  }
  if (!targetFee) return;

  const paid = await tx.payment.aggregate({
    where: { caseId, isDeleted: false, status: "VERIFIED" },
    _sum: { amount: true },
  });
  const total = paid._sum.amount ?? new Prisma.Decimal(0);
  const status = total.gte(targetFee)
    ? "PAID"
    : total.gt(0)
      ? "PARTIALLY_PAID"
      : "UNPAID";
  await tx.clientCase.update({ where: { id: caseId }, data: { financialStatus: status } });

  // If the case is settled in full, mark all remaining active installments as PAID
  if (status === "PAID") {
    await tx.installment.updateMany({
      where: {
        paymentPlan: { caseId },
        isDeleted: false,
        status: { not: "PAID" },
      },
      data: { status: "PAID" },
    });
  }
};

/**
 * Recalculate and persist Installment.status based on verified payments
 * on that installment. Identical logic to the existing PaymentService helper.
 */
const refreshInstallmentStatus = async (tx: Prisma.TransactionClient, installmentId: string) => {
  const inst = await tx.installment.findUnique({
    where: { id: installmentId },
    select: { id: true, amount: true },
  });
  if (!inst) return;
  const paidAgg = await tx.payment.aggregate({
    where: { installmentId, isDeleted: false, status: "VERIFIED" },
    _sum: { amount: true },
  });
  const totalPaid = paidAgg._sum.amount ?? new Prisma.Decimal(0);
  const status = totalPaid.gte(inst.amount)
    ? "PAID"
    : totalPaid.gt(0)
      ? "PARTIALLY_PAID"
      : "PENDING";
  await tx.installment.update({ where: { id: installmentId }, data: { status } });
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

  // 3. Compute the amount server-side
  let amountDecimal: Prisma.Decimal;

  // Check overall remaining balance on the case
  const paidOnCase = await prisma.payment.aggregate({
    where: { caseId, isDeleted: false, status: "VERIFIED" },
    _sum: { amount: true },
  });
  const alreadyPaidOnCase = paidOnCase._sum.amount ?? new Prisma.Decimal(0);
  const caseRemaining = plan.contractedFee.sub(alreadyPaidOnCase);

  if (caseRemaining.lte(0)) {
    throw new AppError(httpStatus.BAD_REQUEST, "This case agreement has already been paid in full");
  }

  if (installmentId) {
    // Pay a specific installment: use the installment amount minus already-verified payments
    const installment = await prisma.installment.findFirst({
      where: { id: installmentId, isDeleted: false, paymentPlan: { caseId } },
      select: { id: true, amount: true, status: true },
    });
    if (!installment) {
      throw new AppError(httpStatus.BAD_REQUEST, "Installment does not belong to this case");
    }
    if (installment.status === "PAID") {
      throw new AppError(httpStatus.BAD_REQUEST, "This installment has already been paid");
    }
    // Remaining = installment.amount - sum of verified payments on this installment
    const paidOnInstallment = await prisma.payment.aggregate({
      where: { installmentId, isDeleted: false, status: "VERIFIED" },
      _sum: { amount: true },
    });
    const alreadyPaid = paidOnInstallment._sum.amount ?? new Prisma.Decimal(0);
    amountDecimal = installment.amount.sub(alreadyPaid);
    amountDecimal = Prisma.Decimal.min(amountDecimal, caseRemaining);
    if (amountDecimal.lte(0)) {
      throw new AppError(httpStatus.BAD_REQUEST, "This installment has already been fully paid");
    }
  } else {
    // Pay remaining balance: contractedFee - total verified payments on case
    amountDecimal = caseRemaining;
  }

  // 4. Generate a stable idempotency key for this payment attempt
  const idempotencyKey = `stripe-pi-${caseId}-${installmentId || "case"}-${Date.now()}`;

  // 5. Create the DB payment record (STRIPE_PENDING) inside a transaction
  const paymentRecord = await prisma.$transaction(
    async (tx) => {
      return tx.payment.create({
        data: {
          caseId,
          installmentId: installmentId || null,
          amount: amountDecimal,
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
    },
    { maxWait: 10000, timeout: 25000 },
  );

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
    throw new AppError(
      httpStatus.INTERNAL_SERVER_ERROR,
      `Failed to initialize payment: ${stripeError?.message || "Stripe API error"}`,
    );
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

  // 3. Compute amount server-side
  let amountDecimal: Prisma.Decimal;
  let installmentTitle = "";

  // Check overall remaining balance on the case
  const paidOnCase = await prisma.payment.aggregate({
    where: { caseId, isDeleted: false, status: "VERIFIED" },
    _sum: { amount: true },
  });
  const alreadyPaidOnCase = paidOnCase._sum.amount ?? new Prisma.Decimal(0);
  const caseRemaining = plan.contractedFee.sub(alreadyPaidOnCase);

  if (caseRemaining.lte(0)) {
    throw new AppError(httpStatus.BAD_REQUEST, "This case agreement has already been paid in full");
  }

  if (installmentId) {
    const installment = await prisma.installment.findFirst({
      where: { id: installmentId, isDeleted: false, paymentPlan: { caseId } },
      select: { id: true, amount: true, status: true, title: true, sequenceNumber: true },
    });
    if (!installment) {
      throw new AppError(httpStatus.BAD_REQUEST, "Installment does not belong to this case");
    }
    if (installment.status === "PAID") {
      throw new AppError(httpStatus.BAD_REQUEST, "This installment has already been paid");
    }
    const paidOnInstallment = await prisma.payment.aggregate({
      where: { installmentId, isDeleted: false, status: "VERIFIED" },
      _sum: { amount: true },
    });
    const alreadyPaid = paidOnInstallment._sum.amount ?? new Prisma.Decimal(0);
    amountDecimal = installment.amount.sub(alreadyPaid);
    amountDecimal = Prisma.Decimal.min(amountDecimal, caseRemaining);
    if (amountDecimal.lte(0)) {
      throw new AppError(httpStatus.BAD_REQUEST, "This installment has already been fully paid");
    }
    installmentTitle = installment.title || `Installment #${installment.sequenceNumber}`;
  } else {
    amountDecimal = caseRemaining;
  }

  // 4. Generate stable idempotency key
  const idempotencyKey = `stripe-cs-${caseId}-${installmentId || "case"}-${Date.now()}`;

  // 5. Create pending payment record
  const paymentRecord = await prisma.$transaction(
    async (tx) => {
      return tx.payment.create({
        data: {
          caseId,
          installmentId: installmentId || null,
          amount: amountDecimal,
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
    },
    { maxWait: 10000, timeout: 25000 },
  );

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
    throw new AppError(
      httpStatus.INTERNAL_SERVER_ERROR,
      `Failed to initialize Stripe Checkout: ${stripeError?.message || "Stripe API error"}`,
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


// ─── Get Payment Intent Status ────────────────────────────────────────────────

/**
 * Returns the current status of a Stripe payment from our DB.
 * Used by the frontend to poll after a redirect or payment confirmation.
 * Does NOT call the Stripe API — avoids unnecessary API calls.
 */
const getPaymentIntentStatus = async (
  paymentId: string,
  actorId: string,
  isStaff: boolean,
  userRole?: string,
) => {
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

  NotificationService.dispatchPaymentVerifiedNotification(payment as any).catch((err) => {
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
  }).catch((err) => console.error("[NOTIFICATION_ERROR] Stripe success notification:", err));
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

  // Determine refund status based on the refund amount vs payment amount
  const refundAmountDollars = refund.amount / 100;
  const isFullRefund = new Prisma.Decimal(refundAmountDollars).gte(payment.amount);
  const newStatus = isFullRefund ? "REFUNDED" : "PARTIALLY_REFUNDED";

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

// ─── Create Stripe Refund ─────────────────────────────────────────────────────

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
};
