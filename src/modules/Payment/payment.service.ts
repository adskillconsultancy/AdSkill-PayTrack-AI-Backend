import { Prisma } from "@prisma/client";
import httpStatus from "http-status";
import AppError from "../../errors/AppError";
import prisma from "../../lib/prisma";
import { getPrivateObjectSignedUrl } from "../../lib/r2";
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
    if (amount.gt(installment.amount)) {
      throw new AppError(httpStatus.BAD_REQUEST, "Payment cannot exceed installment amount");
    }
  }

  return prisma.$transaction(
    async (tx) => {
      const isVerified = (payload.status === "VERIFIED" && staff);
      const initialStatus = isVerified ? "VERIFIED" : "PENDING";

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
          status: initialStatus,
          verifiedById: isVerified ? actorId : undefined,
        },
        include: paymentInclude,
      });

      if (payload.proofDocumentIds?.length) {
        await tx.document.updateMany({
          where: { id: { in: payload.proofDocumentIds }, caseId: payload.caseId },
          data: { paymentId: payment.id },
        });
      }

      if (isVerified) {
        if (payload.installmentId) {
          await tx.installment.update({
            where: { id: payload.installmentId },
            data: { status: "PAID" },
          });
        }
        await refreshFinancialStatus(tx, payload.caseId);
      }

      return payment;
    },
    {
      maxWait: 10000,
      timeout: 25000,
    },
  );
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
  return prisma.$transaction(
    async (tx) => {
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
    },
    {
      maxWait: 10000,
      timeout: 25000,
    },
  );
};

const getPaymentById = async (id: string, actorId: string, staff: boolean) => {
  const payment = await prisma.payment.findFirst({ where: { id, isDeleted: false }, include: paymentInclude });
  if (!payment) throw new AppError(httpStatus.NOT_FOUND, "Payment not found");
  if (!staff && payment.case.userId !== actorId) throw new AppError(httpStatus.FORBIDDEN, "You cannot access this payment");

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
) => {
  const whereCondition: Prisma.PaymentWhereInput = {
    isDeleted: false,
  };

  // If client, restrict strictly to their own cases
  if (!staff) {
    whereCondition.case = {
      userId: actorId,
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
      {
        case: {
          OR: [
            { caseCode: { contains: term, mode: "insensitive" } },
            {
              user: {
                OR: [
                  { name: { contains: term, mode: "insensitive" } },
                  { email: { contains: term, mode: "insensitive" } },
                  { clientId: { contains: term, mode: "insensitive" } },
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
