import { Prisma } from "@prisma/client";
import httpStatus from "http-status";
import AppError from "../../errors/AppError";
import prisma from "../../lib/prisma";
import { getPrivateObjectSignedUrl } from "../../lib/r2";
import { AuditService } from "../Audit/audit.service";
import { TCreatePaymentPayload, TPaymentFilters } from "./payment.interface";

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

const ensureCase = async (caseId: string, actorId: string, staff: boolean, userRole?: string) => {
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
  await tx.installment.update({
    where: { id: installmentId },
    data: { status },
  });
};

const createPayment = async (
  payload: TCreatePaymentPayload,
  actorId: string,
  staff: boolean,
  userRole?: string,
  actorEmail?: string,
) => {
  await ensureCase(payload.caseId, actorId, staff, userRole);
  const amount = new Prisma.Decimal(payload.amount);

  // Pre-validate outside interactive transaction to avoid holding DB connections / timing out
  if (payload.idempotencyKey) {
    const existing = await prisma.payment.findUnique({
      where: { idempotencyKey: payload.idempotencyKey },
      include: paymentInclude,
    });
    if (existing) return existing;
  }

  const plan = await prisma.paymentPlan.findFirst({
    where: { caseId: payload.caseId, isDeleted: false, isActive: true },
    orderBy: { createdAt: "desc" },
    select: { currency: true },
  });
  if (plan && plan.currency !== payload.currency.toUpperCase()) {
    throw new AppError(httpStatus.BAD_REQUEST, "Payment currency does not match active plan");
  }

  if (payload.installmentId) {
    const installment = await prisma.installment.findFirst({
      where: { id: payload.installmentId, isDeleted: false, paymentPlan: { caseId: payload.caseId } },
      select: { id: true, amount: true },
    });
    if (!installment) throw new AppError(httpStatus.BAD_REQUEST, "Installment does not belong to case");
    const alreadyPaid = await prisma.payment.aggregate({
      where: { installmentId: payload.installmentId, isDeleted: false, status: "VERIFIED" },
      _sum: { amount: true },
    });
    const remaining = installment.amount.sub(alreadyPaid._sum.amount ?? new Prisma.Decimal(0));
    if (amount.gt(remaining)) {
      throw new AppError(httpStatus.BAD_REQUEST, `Payment cannot exceed remaining installment balance (${remaining})`);
    }
  }

  const payment = await prisma.$transaction(
    async (tx) => {
      const isVerifiableStaff = userRole === "SUPER_ADMIN" || userRole === "MANAGER";
      const isVerified = isVerifiableStaff && payload.status !== "PENDING";
      const initialStatus = isVerified ? "VERIFIED" : "PENDING";

      const paymentRecord = await tx.payment.create({
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
          status: initialStatus,
          verifiedById: isVerified ? actorId : undefined,
        },
        include: paymentInclude,
      });

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

const verifyPayment = async (id: string, actorId: string, actorEmail?: string) => {
  const updated = await prisma.$transaction(
    async (tx) => {
      const payment = await tx.payment.findFirst({ where: { id, isDeleted: false } });
      if (!payment) throw new AppError(httpStatus.NOT_FOUND, "Payment not found");
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
  const whereCondition: Prisma.PaymentWhereInput = {
    isDeleted: false,
  };

  // If client, restrict strictly to their own cases
  if (!staff) {
    whereCondition.case = {
      userId: actorId,
    };
  } else if (userRole === "CONSULTANT") {
    whereCondition.case = {
      assignedConsultantId: actorId,
    };
  }

  // Status filter
  if (filters.status && filters.status !== "ALL") {
    whereCondition.status = filters.status;
  }

  // Payment method filter
  if (filters.paymentMethod && filters.paymentMethod !== "ALL") {
    whereCondition.paymentMethod = filters.paymentMethod;
  }

  // Search term (across client name, email, caseCode, externalReference, operationalNotes)
  if (filters.searchTerm && filters.searchTerm.trim()) {
    const term = filters.searchTerm.trim();
    whereCondition.OR = [
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
    ];
  }

  // Date range
  if (filters.startDate || filters.endDate) {
    whereCondition.paymentDate = {};
    if (filters.startDate) whereCondition.paymentDate.gte = new Date(filters.startDate);
    if (filters.endDate) whereCondition.paymentDate.lte = new Date(filters.endDate);
  }

  const [payments, verifiedAgg, pendingCount, verifiedCount] = await Promise.all([
    prisma.payment.findMany({
      where: whereCondition,
      include: paymentInclude,
      orderBy: [{ recordedAt: "desc" }, { paymentDate: "desc" }],
    }),
    prisma.payment.aggregate({
      where: {
        ...(whereCondition.case ? { case: whereCondition.case } : {}),
        isDeleted: false,
        status: "VERIFIED",
      },
      _sum: { amount: true },
    }),
    prisma.payment.count({
      where: {
        ...(whereCondition.case ? { case: whereCondition.case } : {}),
        isDeleted: false,
        status: "PENDING",
      },
    }),
    prisma.payment.count({
      where: {
        ...(whereCondition.case ? { case: whereCondition.case } : {}),
        isDeleted: false,
        status: "VERIFIED",
      },
    }),
  ]);

  // Today volume
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayAgg = await prisma.payment.aggregate({
    where: {
      ...(whereCondition.case ? { case: whereCondition.case } : {}),
      isDeleted: false,
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
  getPaymentById,
  getAllPayments,
};
