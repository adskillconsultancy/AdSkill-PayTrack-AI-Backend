import { Prisma } from "@prisma/client";
import httpStatus from "http-status";
import AppError from "../../errors/AppError";
import prisma from "../../lib/prisma";
import { getPrivateObjectSignedUrl } from "../../lib/r2";
import { AuditService } from "../Audit/audit.service";
import { NotificationService } from "../Notification/notification.service";
import { PERMISSIONS } from "../User/user.constant";
import { TCreatePaymentPayload, TPaymentFilters } from "./payment.interface";
import { StripeService } from "../Stripe/stripe.service";
import {
  ensureCase,
  refreshFinancialStatus,
  refreshInstallmentStatus,
} from "../../shared/payment.helpers";


const paymentInclude = {
  installment: { select: { id: true, sequenceNumber: true, title: true, amount: true, dueDate: true } },
  case: {
    select: {
      id: true,
      caseCode: true,
      userId: true,
      caseCategory: true,
      destinationCountry: true,
      assignedConsultantId: true,
      user: {
        select: {
          id: true,
          name: true,
          preferredName: true,
          email: true,
          phone: true,
          clientId: true,
        },
      },
      service: {
        select: {
          id: true,
          name: true,
          code: true,
        },
      },
    },
  },
  verifiedBy: {
    select: {
      id: true,
      name: true,
      preferredName: true,
      email: true,
      role: {
        select: {
          name: true,
        },
      },
    },
  },
  proofDocuments: {
    where: { isDeleted: false },
    select: {
      id: true,
      originalName: true,
      storedName: true,
      objectKey: true,
      mimeType: true,
      size: true,
      createdAt: true,
    },
  },
};

// Maximum percentage a STAFF-submitted amount may exceed the remaining balance (e.g. 5 = 5%)
const STAFF_OVERPAYMENT_TOLERANCE_PCT = new Prisma.Decimal(5);

/**
 * Validate and resolve the amount for a CLIENT payment.
 *
 * Rules:
 *  - CLIENT must supply an amount in the body (partial payments are allowed).
 *  - With installmentId:   0 < amount ≤ remaining CASE balance
 *                          (surplus beyond the installment target credits the case total,
 *                           covering gaps in other installments — e.g. pay $250 on a $200
 *                           installment when you owe $50 elsewhere)
 *  - Without installmentId: 0 < amount ≤ remaining case balance
 *  - Currency is always sourced from the active plan (not the request body).
 *  - Throws if no active plan exists.
 */
const computeClientAmount = async (
  caseId: string,
  clientAmount: number | undefined,
  installmentId?: string,
): Promise<{ amount: Prisma.Decimal; currency: string }> => {
  // amount is required
  if (clientAmount === undefined || clientAmount === null) {
    throw new AppError(httpStatus.BAD_REQUEST, "amount is required");
  }
  const requestedAmount = new Prisma.Decimal(clientAmount);
  if (requestedAmount.lte(0)) {
    throw new AppError(httpStatus.BAD_REQUEST, "Payment amount must be greater than zero");
  }

  const plan = await prisma.paymentPlan.findFirst({
    where: { caseId, isDeleted: false, isActive: true },
    orderBy: { createdAt: "desc" },
    select: {
      contractedFee: true,
      currency: true,
      installments: {
        where: { isDeleted: false },
        select: { id: true, amount: true },
      },
    },
  });

  if (!plan) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      "No active payment plan found. Please contact your consultant to set up a payment plan before recording a payment.",
    );
  }

  // Compute remaining CASE balance (used for both paths)
  const paidAgg = await prisma.payment.aggregate({
    where: { caseId, isDeleted: false, status: "VERIFIED" },
    _sum: { amount: true },
  });
  const alreadyPaid = paidAgg._sum.amount ?? new Prisma.Decimal(0);
  const caseRemaining = plan.contractedFee.minus(alreadyPaid);

  if (caseRemaining.lte(0)) {
    throw new AppError(httpStatus.BAD_REQUEST, "This case is already fully paid.");
  }

  if (installmentId) {
    const installment = plan.installments.find((i) => i.id === installmentId);
    if (!installment) {
      throw new AppError(httpStatus.BAD_REQUEST, "Installment does not belong to the active plan for this case");
    }

    // Cap at remaining CASE balance — not installment amount.
    // This allows surplus (e.g. $250 on a $200 installment) to credit the overall
    // case total, covering any gap left by partially-paid other installments.
    if (requestedAmount.gt(caseRemaining)) {
      throw new AppError(
        httpStatus.BAD_REQUEST,
        `Amount exceeds the total remaining case balance. ` +
        `Remaining: ${caseRemaining.toFixed(2)} ${plan.currency}.`,
      );
    }

    return { amount: requestedAmount, currency: plan.currency };
  }

  // No specific installment — also capped at remaining case balance
  if (requestedAmount.gt(caseRemaining)) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      `Amount exceeds the remaining case balance. ` +
      `Remaining: ${caseRemaining.toFixed(2)} ${plan.currency}.`,
    );
  }

  return { amount: requestedAmount, currency: plan.currency };
};



const createPayment = async (
  payload: TCreatePaymentPayload,
  actorId: string,
  staff: boolean,
  userRole?: string,
  actorEmail?: string,
  actorPermissions: string[] = [],
) => {
  await ensureCase(payload.caseId, actorId, staff, userRole);

  // ── Pre-validate idempotency key outside the transaction ─────────────────
  if (payload.idempotencyKey) {
    const existing = await prisma.payment.findUnique({
      where: { idempotencyKey: payload.idempotencyKey },
      include: paymentInclude,
    });
    if (existing) return existing;
  }

  // ── F-03: Amount resolution ───────────────────────────────────────────────
  // CLIENT: amount comes from body but is server-validated against the active
  //         payment plan. Partial payments are allowed; amount must not exceed
  //         the installment target (or remaining case balance if no installmentId).
  // STAFF:  amount comes from body but is sanity-checked against the
  //         remaining balance (must not exceed it by more than STAFF_OVERPAYMENT_TOLERANCE_PCT).
  let amount: Prisma.Decimal;
  let resolvedCurrency: string = payload.currency?.toUpperCase() ?? "";

  if (!staff) {
    // CLIENT path — validate amount against plan; currency from plan
    const computed = await computeClientAmount(payload.caseId, payload.amount, payload.installmentId);
    amount = computed.amount;
    resolvedCurrency = computed.currency;
  } else {
    // STAFF path — accept body amount but validate sanity
    if (payload.amount === undefined || payload.amount === null) {
      throw new AppError(httpStatus.BAD_REQUEST, "amount is required");
    }
    amount = new Prisma.Decimal(payload.amount);
    if (amount.lte(0)) {
      throw new AppError(httpStatus.BAD_REQUEST, "Payment amount must be greater than zero");
    }

    // Sanity cap: amount must not exceed remaining balance by more than the tolerance
    const paidAgg = await prisma.payment.aggregate({
      where: { caseId: payload.caseId, isDeleted: false, status: "VERIFIED" },
      _sum: { amount: true },
    });
    const alreadyPaid = paidAgg._sum.amount ?? new Prisma.Decimal(0);

    const activePlan = await prisma.paymentPlan.findFirst({
      where: { caseId: payload.caseId, isDeleted: false, isActive: true },
      orderBy: { createdAt: "desc" },
      select: { contractedFee: true, currency: true },
    });

    if (activePlan) {
      const remaining = activePlan.contractedFee.minus(alreadyPaid);
      // Allow up to (remaining * (1 + tolerance%)) — e.g. 105% of remaining is fine
      const maxAllowed = remaining.times(
        new Prisma.Decimal(1).plus(STAFF_OVERPAYMENT_TOLERANCE_PCT.dividedBy(100)),
      );
      if (amount.gt(maxAllowed) && remaining.gt(0)) {
        throw new AppError(
          httpStatus.BAD_REQUEST,
          `Payment amount exceeds the remaining balance by more than ${STAFF_OVERPAYMENT_TOLERANCE_PCT}%. ` +
          `Remaining balance: ${remaining.toFixed(2)} ${activePlan.currency}. ` +
          `Maximum allowed: ${maxAllowed.toFixed(2)} ${activePlan.currency}.`,
        );
      }
      if (!resolvedCurrency) resolvedCurrency = activePlan.currency;
    }
  }

  // ── Currency consistency check ────────────────────────────────────────────
  const plan = await prisma.paymentPlan.findFirst({
    where: { caseId: payload.caseId, isDeleted: false, isActive: true },
    orderBy: { createdAt: "desc" },
    select: { currency: true },
  });
  if (plan && plan.currency !== resolvedCurrency) {
    throw new AppError(httpStatus.BAD_REQUEST, "Payment currency does not match active plan");
  }

  // ── Installment ownership check (STAFF only — clients resolved above) ─────
  if (staff && payload.installmentId) {
    const installment = await prisma.installment.findFirst({
      where: { id: payload.installmentId, isDeleted: false, paymentPlan: { caseId: payload.caseId } },
      select: { id: true, amount: true },
    });
    if (!installment) throw new AppError(httpStatus.BAD_REQUEST, "Installment does not belong to case");
    // Overpayment is supported: surplus counts towards the client case balance
  }

  const payment = await prisma.$transaction(
    async (tx) => {
      const isVerifiableStaff =
        userRole === "SUPER_ADMIN" ||
        actorPermissions.includes(PERMISSIONS.PAYMENT_VERIFY);
      const isVerified = isVerifiableStaff && payload.status !== "PENDING";
      const initialStatus = isVerified ? "VERIFIED" : "PENDING";

      // F-06: Idempotency is now resolved atomically inside the transaction.
      // If two concurrent requests race past the pre-check above, only one will
      // succeed here. The loser catches the P2002 unique constraint error and
      // returns the existing record instead of throwing a 500.
      let paymentRecord;
      try {
        paymentRecord = await tx.payment.create({
          data: {
            caseId: payload.caseId,
            installmentId: payload.installmentId,
            amount,
            currency: resolvedCurrency,
            paymentDate: payload.paymentDate ? new Date(payload.paymentDate) : new Date(),
            paymentMethod: payload.paymentMethod,
            externalReference: payload.externalReference,
            idempotencyKey: payload.idempotencyKey,
            operationalNotes: payload.operationalNotes,
            status: initialStatus,
            verifiedById: isVerified ? actorId : undefined,
          },
          include: paymentInclude,
        });
      } catch (e: any) {
        // P2002 = unique constraint violation on idempotencyKey
        if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002" && payload.idempotencyKey) {
          const existing = await tx.payment.findUnique({
            where: { idempotencyKey: payload.idempotencyKey },
            include: paymentInclude,
          });
          if (existing) return existing;
        }
        throw e;
      }

      if (payload.proofDocumentIds?.length) {
        await tx.document.updateMany({
          where: { id: { in: payload.proofDocumentIds }, caseId: payload.caseId },
          data: { paymentId: paymentRecord.id },
        });
      }

      if (isVerified) {
        if (payload.installmentId) {
          await refreshInstallmentStatus(tx, payload.installmentId);
        }
        await refreshFinancialStatus(tx, payload.caseId);
      }

      return paymentRecord;
    },
    {
      maxWait: 10000,
      timeout: 25000,
    },
  );

  AuditService.writeAuditLog({
    actorId,
    actorEmail,
    action: "RECORD_PAYMENT",
    targetEntity: "Payment",
    targetId: payment.id,
    afterValue: {
      amount: payment.amount.toString(),
      currency: payment.currency,
      status: payment.status,
      caseId: payment.caseId,
      installmentId: payment.installmentId,
      paymentMethod: payment.paymentMethod,
    },
  });

  // Asynchronously dispatch payment recorded notifications & emails
  NotificationService.dispatchPaymentRecordedNotification({
    paymentId: payment.id,
    caseId: payment.caseId,
    caseCode: payment.case.caseCode,
    clientId: payment.case.userId,
    clientName: payment.case.user?.name || "Client",
    clientEmail: payment.case.user?.email || "",
    amount: payment.amount.toString(),
    currency: payment.currency,
    paymentMethod: payment.paymentMethod,
    assignedConsultantId: payment.case.assignedConsultantId,
  }).catch((err) => console.error("[NOTIFICATION_ERROR] dispatchPaymentRecordedNotification:", err));

  return payment;
};

const listPayments = async (caseId: string, actorId: string, staff: boolean, userRole?: string) => {
  await ensureCase(caseId, actorId, staff, userRole);
  return prisma.payment.findMany({
    where: { caseId, isDeleted: false },
    include: paymentInclude,
    orderBy: { paymentDate: "desc" },
  });
};

const verifyPayment = async (id: string, actorId: string, userRole?: string, actorEmail?: string) => {
  const updated = await prisma.$transaction(
    async (tx) => {
      const payment = await tx.payment.findFirst({
        where: { id, isDeleted: false },
        include: {
          ...paymentInclude,
          case: {
            select: {
              id: true,
              caseCode: true,
              userId: true,
              assignedConsultantId: true,
              caseCategory: true,
              destinationCountry: true,
              user: { select: { id: true, name: true, preferredName: true, email: true, phone: true, clientId: true } },
              service: { select: { id: true, name: true, code: true } },
            },
          },
        },
      });
      if (!payment) throw new AppError(httpStatus.NOT_FOUND, "Payment not found");
      // F-08: CONSULTANT may only verify payments on cases assigned to them
      if (userRole === "CONSULTANT" && payment.case.assignedConsultantId !== actorId) {
        throw new AppError(httpStatus.FORBIDDEN, "You are not assigned to this client case");
      }
      if (payment.status !== "PENDING") {
        throw new AppError(httpStatus.BAD_REQUEST, "Only pending payments can be verified");
      }
      const updatedRecord = await tx.payment.update({
        where: { id },
        data: { status: "VERIFIED", verifiedById: actorId },
        include: paymentInclude,
      });
      if (payment.installmentId) {
        await refreshInstallmentStatus(tx, payment.installmentId);
      }
      await refreshFinancialStatus(tx, payment.caseId);
      return updatedRecord;
    },
    {
      maxWait: 10000,
      timeout: 25000,
    },
  );

  AuditService.writeAuditLog({
    actorId,
    actorEmail,
    action: "VERIFY_PAYMENT",
    targetEntity: "Payment",
    targetId: updated.id,
    beforeValue: { status: "PENDING" },
    afterValue: {
      status: "VERIFIED",
      verifiedById: actorId,
      amount: updated.amount.toString(),
      currency: updated.currency,
    },
  });

  // Asynchronously dispatch payment verified notification & email
  NotificationService.dispatchPaymentVerifiedNotification({
    paymentId: updated.id,
    caseId: updated.caseId,
    caseCode: updated.case.caseCode,
    clientId: updated.case.userId,
    clientName: updated.case.user?.name || "Client",
    clientEmail: updated.case.user?.email || "",
    amount: updated.amount.toString(),
    currency: updated.currency,
    receiptNumber: `PAY-${updated.id.slice(0, 8).toUpperCase()}`,
    verifierName: updated.verifiedBy?.name || "AdSkill Finance",
    assignedConsultantId: updated.case.assignedConsultantId,
  }).catch((err) => console.error("[NOTIFICATION_ERROR] dispatchPaymentVerifiedNotification:", err));

  return updated;
};

const refundPayment = async (
  id: string,
  payload: { reason: string; refundAmount?: number },
  actorId: string,
  actorEmail?: string,
) => {
  const updated = await prisma.$transaction(
    async (tx) => {
      const payment = await tx.payment.findFirst({
        where: { id, isDeleted: false },
        include: paymentInclude,
      });
      if (!payment) throw new AppError(httpStatus.NOT_FOUND, "Payment not found");
      if (payment.status !== "VERIFIED" && payment.status !== "PARTIALLY_REFUNDED") {
        throw new AppError(httpStatus.BAD_REQUEST, "Only verified payments can be refunded");
      }

      const refundDec = payload.refundAmount ? new Prisma.Decimal(payload.refundAmount) : payment.amount;
      if (refundDec.lte(0)) {
        throw new AppError(httpStatus.BAD_REQUEST, "Refund amount must be greater than zero");
      }
      if (refundDec.gt(payment.amount)) {
        throw new AppError(httpStatus.BAD_REQUEST, "Refund amount cannot exceed payment amount");
      }

      const isFullRefund = refundDec.eq(payment.amount);
      const newStatus = isFullRefund ? "REFUNDED" : "PARTIALLY_REFUNDED";

      // ── Stripe Refund Path ─────────────────────────────────────────────────
      // If the payment was made online via Stripe (stripeChargeId present),
      // issue the refund through the Stripe Refunds API.
      // The charge.refund.updated webhook will confirm the final status.
      let stripeRefundId: string | undefined;
      if ((payment as any).stripeChargeId) {
        try {
          const stripeRefund = await StripeService.createStripeRefund(
            id,
            payload.refundAmount,
            payload.reason,
            actorId,
            actorEmail,
          );
          stripeRefundId = stripeRefund.id;
        } catch (stripeErr: any) {
          throw new AppError(
            httpStatus.BAD_REQUEST,
            `Stripe refund failed: ${stripeErr?.message || "Stripe API error"}`,
          );
        }
      }

      const updatedRecord = await tx.payment.update({
        where: { id },
        data: {
          status: newStatus,
          ...(stripeRefundId ? { stripeRefundId } : {}),
          operationalNotes: payment.operationalNotes
            ? `${payment.operationalNotes} | Refund of ${refundDec.toString()} ${payment.currency} processed: ${payload.reason}`
            : `Refund of ${refundDec.toString()} ${payment.currency} processed: ${payload.reason}`,
        },
        include: paymentInclude,
      });

      if (payment.installmentId) {
        await refreshInstallmentStatus(tx, payment.installmentId);
      }
      await refreshFinancialStatus(tx, payment.caseId);
      return updatedRecord;
    },
    {
      maxWait: 10000,
      timeout: 25000,
    },
  );

  AuditService.writeAuditLog({
    actorId,
    actorEmail,
    action: "REFUND_PAYMENT",
    targetEntity: "Payment",
    targetId: updated.id,
    beforeValue: { status: "VERIFIED" },
    afterValue: {
      status: updated.status,
      refundReason: payload.reason,
      refundAmount: payload.refundAmount ?? updated.amount.toString(),
      currency: updated.currency,
    },
  });

  return updated;
};

const getPaymentById = async (id: string, actorId: string, staff: boolean, userRole?: string) => {
  const payment = await prisma.payment.findFirst({ where: { id, isDeleted: false }, include: paymentInclude });
  if (!payment) throw new AppError(httpStatus.NOT_FOUND, "Payment not found");
  if (!staff && payment.case.userId !== actorId) throw new AppError(httpStatus.FORBIDDEN, "You cannot access this payment");
  if (userRole === "CONSULTANT" && payment.case.assignedConsultantId !== actorId) {
    throw new AppError(httpStatus.FORBIDDEN, "You are not assigned to this client case");
  }

  const proofDocumentsWithUrls = await Promise.all(
    (payment.proofDocuments || []).map(async (doc) => {
      try {
        const signedDownloadUrl = await getPrivateObjectSignedUrl(doc.objectKey);
        return { ...doc, signedDownloadUrl };
      } catch {
        return doc;
      }
    }),
  );

  return { ...payment, proofDocuments: proofDocumentsWithUrls };
};

const getAllPayments = async (
  filters: TPaymentFilters,
  actorId: string,
  staff: boolean,
  userRole?: string,
) => {
  // F-19: Base scope strictly defines the actor's authorization boundaries.
  // Neither search term filters nor aggregates can escape this boundary.
  const baseScope: Prisma.PaymentWhereInput = {
    isDeleted: false,
    ...(!staff
      ? { case: { userId: actorId } }
      : userRole === "CONSULTANT"
      ? { case: { assignedConsultantId: actorId } }
      : {}),
  };

  const andConditions: Prisma.PaymentWhereInput[] = [baseScope];

  // Status filter
  if (filters.status && filters.status !== "ALL") {
    andConditions.push({ status: filters.status });
  }

  // Payment method filter
  if (filters.paymentMethod && filters.paymentMethod !== "ALL") {
    andConditions.push({ paymentMethod: filters.paymentMethod });
  }

  // Date range
  if (filters.startDate || filters.endDate) {
    const dateFilter: Prisma.DateTimeFilter = {};
    if (filters.startDate) dateFilter.gte = new Date(filters.startDate);
    if (filters.endDate) dateFilter.lte = new Date(filters.endDate);
    andConditions.push({ paymentDate: dateFilter });
  }

  // Search term (scoped strictly within authorized cases)
  if (filters.searchTerm && filters.searchTerm.trim()) {
    const term = filters.searchTerm.trim();
    andConditions.push({
      OR: [
        { externalReference: { contains: term, mode: "insensitive" } },
        { operationalNotes: { contains: term, mode: "insensitive" } },
        { paymentMethod: { contains: term, mode: "insensitive" } },
        { receipts: { some: { receiptNumber: { contains: term, mode: "insensitive" } } } },
        {
          case: {
            OR: [
              { caseCode: { contains: term, mode: "insensitive" } },
              { serviceNameSnapshot: { contains: term, mode: "insensitive" } },
              { invoices: { some: { invoiceNumber: { contains: term, mode: "insensitive" } } } },
              { assignedConsultant: { name: { contains: term, mode: "insensitive" } } },
              {
                user: {
                  OR: [
                    { name: { contains: term, mode: "insensitive" } },
                    { email: { contains: term, mode: "insensitive" } },
                    { clientId: { contains: term, mode: "insensitive" } },
                    { phone: { contains: term, mode: "insensitive" } },
                  ],
                },
              },
            ],
          },
        },
      ],
    });
  }

  const whereCondition: Prisma.PaymentWhereInput = {
    AND: andConditions,
  };

  const [payments, verifiedAgg, pendingCount, verifiedCount] = await Promise.all([
    prisma.payment.findMany({
      where: whereCondition,
      include: paymentInclude,
      orderBy: [{ recordedAt: "desc" }, { paymentDate: "desc" }],
    }),
    prisma.payment.aggregate({
      where: {
        ...baseScope,
        status: "VERIFIED",
      },
      _sum: { amount: true },
    }),
    prisma.payment.count({
      where: {
        ...baseScope,
        status: "PENDING",
      },
    }),
    prisma.payment.count({
      where: {
        ...baseScope,
        status: "VERIFIED",
      },
    }),
  ]);

  // Today volume
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayAgg = await prisma.payment.aggregate({
    where: {
      ...baseScope,
      status: "VERIFIED",
      paymentDate: { gte: todayStart },
    },
    _sum: { amount: true },
  });

  return {
    payments,
    stats: {
      totalVolume: Number(verifiedAgg._sum.amount || 0),
      todayVolume: Number(todayAgg._sum.amount || 0),
      pendingCount,
      verifiedCount,
      totalTransactions: pendingCount + verifiedCount,
    },
  };
};

export const PaymentService = {
  createPayment,
  listPayments,
  verifyPayment,
  refundPayment,
  getPaymentById,
  getAllPayments,
};
