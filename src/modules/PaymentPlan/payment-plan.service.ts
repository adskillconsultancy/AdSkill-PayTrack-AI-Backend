import { Prisma } from "@prisma/client";
import httpStatus from "http-status";
import AppError from "../../errors/AppError";
import prisma from "../../lib/prisma";
import { AuditService } from "../Audit/audit.service";
import { TCreatePaymentPlanPayload, TUpdatePaymentPlanPayload } from "./payment-plan.interface";

const planInclude = {
  installments: { where: { isDeleted: false }, orderBy: { sequenceNumber: "asc" as const } },
  case: { select: { id: true, caseCode: true, userId: true, serviceNameSnapshot: true, assignedConsultantId: true } },
};

const ensureCaseAccess = async (caseId: string, actorId: string, staff: boolean, userRole?: string) => {
  const record = await prisma.clientCase.findFirst({
    where: { id: caseId, isDeleted: false },
    select: { id: true, userId: true, assignedConsultantId: true },
  });
  if (!record) throw new AppError(httpStatus.NOT_FOUND, "Client case not found");
  if (!staff && record.userId !== actorId) {
    throw new AppError(httpStatus.FORBIDDEN, "You cannot access this client case");
  }
  if (userRole === "CONSULTANT" && record.assignedConsultantId !== actorId) {
    throw new AppError(httpStatus.FORBIDDEN, "You are not assigned to this client case");
  }
  return record;
};

const getPaymentPlansForCase = async (caseId: string, actorId: string, staff: boolean, userRole?: string) => {
  await ensureCaseAccess(caseId, actorId, staff, userRole);
  return prisma.paymentPlan.findMany({
    where: { caseId, isDeleted: false },
    include: planInclude,
    orderBy: { createdAt: "desc" },
  });
};

const createPaymentPlan = async (
  caseId: string,
  payload: TCreatePaymentPlanPayload,
  actorId: string,
  userRole?: string,
  actorEmail?: string,
) => {
  await ensureCaseAccess(caseId, actorId, true, userRole);
  const serviceCase = await prisma.clientCase.findUnique({
    where: { id: caseId },
    select: { service: { select: { baseFee: true, currency: true } } },
  });
  if (!serviceCase) throw new AppError(httpStatus.NOT_FOUND, "Client case not found");

  const baseFee = payload.totalAmount
    ? new Prisma.Decimal(payload.totalAmount)
    : payload.contractedFee
    ? new Prisma.Decimal(payload.contractedFee)
    : new Prisma.Decimal(serviceCase.service.baseFee);
  const discount = new Prisma.Decimal(payload.discountAmount ?? 0);
  const deposit = new Prisma.Decimal(payload.depositAmount ?? 0);
  const contractedFee = baseFee.minus(discount);
  if (discount.gt(baseFee)) throw new AppError(httpStatus.BAD_REQUEST, "Discount cannot exceed base fee");
  if (deposit.gt(contractedFee)) throw new AppError(httpStatus.BAD_REQUEST, "Deposit cannot exceed contracted fee");
  if (discount.gt(0) && !payload.discountReason) {
    throw new AppError(httpStatus.BAD_REQUEST, "Discount reason is required");
  }

  const sequences = payload.installments.map((item) => item.sequenceNumber);
  if (new Set(sequences).size !== sequences.length) {
    throw new AppError(httpStatus.BAD_REQUEST, "Installment sequence numbers must be unique");
  }
  const installmentTotal = payload.installments.reduce(
    (sum, item) => sum.plus(new Prisma.Decimal(item.amount)),
    new Prisma.Decimal(0),
  );
  if (!installmentTotal.eq(contractedFee) && !installmentTotal.plus(deposit).eq(contractedFee)) {
    throw new AppError(httpStatus.BAD_REQUEST, "Installments must equal contracted fee or remaining balance after deposit");
  }

  const plan = await prisma.$transaction(
    async (tx) => {
      const createdPlan = await tx.paymentPlan.create({
        data: {
          caseId,
          currency: (payload.currency ?? serviceCase.service.currency).toUpperCase(),
          baseFeeSnapshot: baseFee,
          discountAmount: discount,
          discountReason: payload.discountReason,
          contractedFee,
          depositAmount: deposit,
          scheduleType: payload.scheduleType,
          paymentMethod: payload.paymentMethod,
          gracePeriodDays: payload.gracePeriodDays ?? 0,
          latePaymentPolicy: payload.latePaymentPolicy,
          installments: {
            create: payload.installments.map((item) => ({
              sequenceNumber: item.sequenceNumber,
              title: item.title,
              amount: new Prisma.Decimal(item.amount),
              dueDate: new Date(item.dueDate),
            })),
          },
        },
        include: planInclude,
      });
      return createdPlan;
    },
    {
      maxWait: 10000,
      timeout: 25000,
    },
  );

  AuditService.writeAuditLog({
    actorId,
    actorEmail,
    action: "CREATE_PAYMENT_PLAN",
    targetEntity: "PaymentPlan",
    targetId: plan.id,
    afterValue: {
      caseId: plan.caseId,
      contractedFee: plan.contractedFee.toString(),
      currency: plan.currency,
      scheduleType: plan.scheduleType,
      installmentsCount: plan.installments?.length,
    },
  });

  return plan;
};

const updatePaymentPlan = async (
  id: string,
  payload: TUpdatePaymentPlanPayload,
  actorId: string,
  userRole?: string,
  actorEmail?: string,
) => {
  const existingPlan = await prisma.paymentPlan.findFirst({
    where: { id, isDeleted: false },
    include: planInclude,
  });
  if (!existingPlan) throw new AppError(httpStatus.NOT_FOUND, "Payment plan not found");
  await ensureCaseAccess(existingPlan.caseId, actorId, true, userRole);

  const updatedPlan = await prisma.paymentPlan.update({
    where: { id },
    data: {
      paymentMethod: payload.paymentMethod !== undefined ? payload.paymentMethod : existingPlan.paymentMethod,
      gracePeriodDays: payload.gracePeriodDays !== undefined ? payload.gracePeriodDays : existingPlan.gracePeriodDays,
      latePaymentPolicy: payload.latePaymentPolicy !== undefined ? payload.latePaymentPolicy : existingPlan.latePaymentPolicy,
      isActive: payload.isActive !== undefined ? payload.isActive : existingPlan.isActive,
    },
    include: planInclude,
  });

  AuditService.writeAuditLog({
    actorId,
    actorEmail,
    action: "UPDATE_PAYMENT_PLAN",
    targetEntity: "PaymentPlan",
    targetId: id,
    beforeValue: {
      paymentMethod: existingPlan.paymentMethod,
      gracePeriodDays: existingPlan.gracePeriodDays,
      latePaymentPolicy: existingPlan.latePaymentPolicy,
      isActive: existingPlan.isActive,
    },
    afterValue: {
      paymentMethod: updatedPlan.paymentMethod,
      gracePeriodDays: updatedPlan.gracePeriodDays,
      latePaymentPolicy: updatedPlan.latePaymentPolicy,
      isActive: updatedPlan.isActive,
      amendmentReason: payload.amendmentReason,
    },
  });

  return updatedPlan;
};

const getPaymentPlanById = async (id: string, actorId: string, staff: boolean, userRole?: string) => {
  const plan = await prisma.paymentPlan.findFirst({
    where: { id, isDeleted: false },
    include: planInclude,
  });
  if (!plan) throw new AppError(httpStatus.NOT_FOUND, "Payment plan not found");
  if (!staff && plan.case.userId !== actorId) {
    throw new AppError(httpStatus.FORBIDDEN, "You cannot access this payment plan");
  }
  if (userRole === "CONSULTANT" && plan.case.assignedConsultantId !== actorId) {
    throw new AppError(httpStatus.FORBIDDEN, "You are not assigned to this client case");
  }
  return plan;
};

const getAllPaymentPlans = async (
  query: { caseId?: string },
  actorId: string,
  staff: boolean,
  userRole?: string,
) => {
  const andConditions: Prisma.PaymentPlanWhereInput[] = [{ isDeleted: false }];

  if (query.caseId) {
    await ensureCaseAccess(query.caseId, actorId, staff, userRole);
    andConditions.push({ caseId: query.caseId });
  } else {
    if (!staff) {
      andConditions.push({ case: { userId: actorId } });
    }
    if (userRole === "CONSULTANT") {
      andConditions.push({ case: { assignedConsultantId: actorId } });
    }
  }

  return prisma.paymentPlan.findMany({
    where: { AND: andConditions },
    include: planInclude,
    orderBy: { createdAt: "desc" },
  });
};

export const PaymentPlanService = {
  createPaymentPlan,
  updatePaymentPlan,
  getPaymentPlansForCase,
  getPaymentPlanById,
  getAllPaymentPlans,
};
