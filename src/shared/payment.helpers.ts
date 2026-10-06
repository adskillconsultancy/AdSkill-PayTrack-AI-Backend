import { Prisma } from "@prisma/client";
import httpStatus from "http-status";
import AppError from "../errors/AppError";
import prisma from "../lib/prisma";

/**
 * F-17: Shared payment domain helpers.
 * Extracted to prevent divergence between PaymentService and StripeService.
 */

/**
 * Validates that the requested case exists and the calling user has permission to access it.
 */
export const ensureCase = async (
  caseId: string,
  actorId: string,
  staff: boolean,
  userRole?: string,
) => {
  const record = await prisma.clientCase.findFirst({
    where: { id: caseId, isDeleted: false },
    select: { id: true, userId: true, assignedConsultantId: true },
  });
  if (!record) {
    throw new AppError(httpStatus.NOT_FOUND, "Client case not found");
  }
  if (!staff && record.userId !== actorId) {
    throw new AppError(httpStatus.FORBIDDEN, "You cannot access this client case");
  }
  if (userRole === "CONSULTANT" && record.assignedConsultantId !== actorId) {
    throw new AppError(httpStatus.FORBIDDEN, "You are not assigned to this client case");
  }
  return record;
};

/**
 * Recalculates and persists ClientCase.financialStatus based on verified payments.
 * If total verified >= target fee, updates to PAID (and marks all active installments PAID).
 * If total verified > 0, updates to PARTIALLY_PAID.
 * Otherwise UNPAID.
 */
export const refreshFinancialStatus = async (
  tx: Prisma.TransactionClient,
  caseId: string,
) => {
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

  await tx.clientCase.update({
    where: { id: caseId },
    data: { financialStatus: status },
  });

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
 * Recalculates and persists Installment.status based on verified payments for that installment.
 */
export const refreshInstallmentStatus = async (
  tx: Prisma.TransactionClient,
  installmentId: string,
) => {
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

  await tx.installment.update({
    where: { id: installmentId },
    data: { status },
  });
};
