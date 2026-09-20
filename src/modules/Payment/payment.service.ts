import { Prisma } from "@prisma/client";
import httpStatus from "http-status";
import AppError from "../../errors/AppError";
import prisma from "../../lib/prisma";
import { TCreatePaymentPayload } from "./payment.interface";

const paymentInclude = {
  installment: { select: { id: true, sequenceNumber: true, title: true, amount: true, dueDate: true } },
  case: { select: { id: true, caseCode: true, userId: true } },
  verifiedBy: { select: { id: true, name: true, email: true } },
};

const ensureCase = async (caseId: string, actorId: string, staff: boolean) => {
  const record = await prisma.clientCase.findFirst({
    where: { id: caseId, isDeleted: false },
    select: { id: true, userId: true },
  });
  if (!record) throw new AppError(httpStatus.NOT_FOUND, "Client case not found");
  if (!staff && record.userId !== actorId) {
    throw new AppError(httpStatus.FORBIDDEN, "You cannot access this client case");
  }
  return record;
};

const refreshFinancialStatus = async (tx: Prisma.TransactionClient, caseId: string) => {
  const plan = await tx.paymentPlan.findFirst({
    where: { caseId, isDeleted: false, isActive: true },
    orderBy: { createdAt: "desc" },
    select: { contractedFee: true },
  });
  if (!plan) return;
  const paid = await tx.payment.aggregate({
    where: { caseId, isDeleted: false, status: "VERIFIED" },
    _sum: { amount: true },
  });
  const total = paid._sum.amount ?? new Prisma.Decimal(0);
  const status = total.gte(plan.contractedFee)
    ? "PAID"
    : total.gt(0)
      ? "PARTIALLY_PAID"
      : "UNPAID";
  await tx.clientCase.update({ where: { id: caseId }, data: { financialStatus: status } });
};

const createPayment = async (
  payload: TCreatePaymentPayload,
  actorId: string,
  staff: boolean,
) => {
  await ensureCase(payload.caseId, actorId, staff);
  const amount = new Prisma.Decimal(payload.amount);

  return prisma.$transaction(async (tx) => {
    if (payload.idempotencyKey) {
      const existing = await tx.payment.findUnique({
        where: { idempotencyKey: payload.idempotencyKey },
        include: paymentInclude,
      });
      if (existing) return existing;
    }

    const plan = await tx.paymentPlan.findFirst({
      where: { caseId: payload.caseId, isDeleted: false, isActive: true },
      orderBy: { createdAt: "desc" },
      select: { currency: true },
    });
    if (plan && plan.currency !== payload.currency.toUpperCase()) {
      throw new AppError(httpStatus.BAD_REQUEST, "Payment currency does not match active plan");
    }

    if (payload.installmentId) {
      const installment = await tx.installment.findFirst({
        where: { id: payload.installmentId, isDeleted: false, paymentPlan: { caseId: payload.caseId } },
        select: { id: true, amount: true },
      });
      if (!installment) throw new AppError(httpStatus.BAD_REQUEST, "Installment does not belong to case");
      if (amount.gt(installment.amount)) {
        throw new AppError(httpStatus.BAD_REQUEST, "Payment cannot exceed installment amount");
      }
    }

    const payment = await tx.payment.create({
      data: {
        caseId: payload.caseId,
        installmentId: payload.installmentId,
        amount,
        currency: payload.currency.toUpperCase(),
        paymentDate: payload.paymentDate ? new Date(payload.paymentDate) : new Date(),
        paymentMethod: payload.paymentMethod,
        externalReference: payload.externalReference,
        idempotencyKey: payload.idempotencyKey,
        operationalNotes: payload.operationalNotes,
        status: staff ? "VERIFIED" : "PENDING",
        verifiedById: staff ? actorId : undefined,
      },
      include: paymentInclude,
    });
    if (staff) await refreshFinancialStatus(tx, payload.caseId);
    return payment;
  });
};

const listPayments = async (caseId: string, actorId: string, staff: boolean) => {
  await ensureCase(caseId, actorId, staff);
  return prisma.payment.findMany({
    where: { caseId, isDeleted: false },
    include: paymentInclude,
    orderBy: { paymentDate: "desc" },
  });
};

const verifyPayment = async (id: string, actorId: string) => {
  return prisma.$transaction(async (tx) => {
    const payment = await tx.payment.findFirst({ where: { id, isDeleted: false } });
    if (!payment) throw new AppError(httpStatus.NOT_FOUND, "Payment not found");
    if (payment.status !== "PENDING") {
      throw new AppError(httpStatus.BAD_REQUEST, "Only pending payments can be verified");
    }
    const updated = await tx.payment.update({
      where: { id },
      data: { status: "VERIFIED", verifiedById: actorId },
      include: paymentInclude,
    });
    if (payment.installmentId) {
      await tx.installment.update({ where: { id: payment.installmentId }, data: { status: "PAID" } });
    }
    await refreshFinancialStatus(tx, payment.caseId);
    return updated;
  });
};

const getPaymentById = async (id: string, actorId: string, staff: boolean) => {
  const payment = await prisma.payment.findFirst({ where: { id, isDeleted: false }, include: paymentInclude });
  if (!payment) throw new AppError(httpStatus.NOT_FOUND, "Payment not found");
  if (!staff && payment.case.userId !== actorId) throw new AppError(httpStatus.FORBIDDEN, "You cannot access this payment");
  return payment;
};

export const PaymentService = {
  createPayment,
  listPayments,
  verifyPayment,
  getPaymentById,
};
