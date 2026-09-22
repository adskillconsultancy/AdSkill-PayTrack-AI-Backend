import PDFDocument from "pdfkit";
import { Prisma } from "@prisma/client";
import httpStatus from "http-status";
import AppError from "../../errors/AppError";
import prisma from "../../lib/prisma";
import { AuditService } from "../Audit/audit.service";
import {
  ADSKILL,
  createBrandedDocument,
  drawHeader,
  drawDualMetaCards,
  drawServiceBanner,
  drawFeeTable,
  drawBalanceBox,
  drawInstructionsAndSeal,
  drawDisclaimer,
  streamToBuffer,
  formatDate,
  formatMoney,
} from "../../lib/pdf.util";

// ─── Prisma Include ──────────────────────────────────────────────────────────
const include = {
  case: {
    select: {
      id: true,
      caseCode: true,
      userId: true,
      serviceNameSnapshot: true,
      serviceCodeSnapshot: true,
      serviceCategorySnapshot: true,
      assignedConsultantId: true,
      user: {
        select: {
          id: true,
          clientId: true,
          name: true,
          preferredName: true,
          email: true,
          phone: true,
          address: true,
          city: true,
          state: true,
          postalCode: true,
          country: true,
        },
      },
      service: {
        select: {
          id: true,
          name: true,
          code: true,
          category: true,
          baseFee: true,
          estimatedGovFee: true,
          estimatedAttorneyFee: true,
          estimatedThirdPartyFee: true,
          currency: true,
        },
      },
      paymentPlans: {
        where: { isDeleted: false, isActive: true },
        orderBy: { createdAt: "desc" as const },
        take: 1,
        select: {
          contractedFee: true,
          currency: true,
          scheduleType: true,
          paymentMethod: true,
          installments: {
            where: { isDeleted: false, status: { not: "PAID" } },
            orderBy: { dueDate: "asc" as const },
            take: 1,
            select: { sequenceNumber: true, title: true, amount: true, dueDate: true },
          },
        },
      },
    },
  },
  payment: {
    select: {
      id: true,
      status: true,
      amount: true,
      currency: true,
      paymentDate: true,
      paymentMethod: true,
      externalReference: true,
      verifiedById: true,
      installment: {
        select: { sequenceNumber: true, title: true },
      },
      verifiedBy: {
        select: { id: true, name: true, email: true, role: { select: { name: true } } },
      },
    },
  },
};

// ─── Sequential Receipt Number Generator ─────────────────────────────────────
const nextReceiptNumber = async (tx: Prisma.TransactionClient): Promise<string> => {
  const year = new Date().getUTCFullYear();
  const counter = await tx.receiptCounter.upsert({
    where: { year },
    create: { year, lastSeq: 1 },
    update: { lastSeq: { increment: 1 } },
  });
  return `RCT-${year}-${String(counter.lastSeq).padStart(5, "0")}`;
};

// ─── Create Receipt ───────────────────────────────────────────────────────────
const createReceipt = async (paymentId: string, actorId: string, userRole?: string, actorEmail?: string) => {
  const receipt = await prisma.$transaction(async (tx) => {
    const payment = await tx.payment.findFirst({
      where: { id: paymentId, isDeleted: false },
      select: { id: true, caseId: true, amount: true, currency: true, status: true },
    });
    if (!payment) throw new AppError(httpStatus.NOT_FOUND, "Payment not found");
    if (payment.status !== "VERIFIED") throw new AppError(httpStatus.BAD_REQUEST, "Verified payment required");

    const owner = await tx.clientCase.findUnique({
      where: { id: payment.caseId },
      select: { userId: true, assignedConsultantId: true },
    });
    if (!owner) throw new AppError(httpStatus.NOT_FOUND, "Client case not found");
    if (userRole === "CONSULTANT" && owner.assignedConsultantId !== actorId) {
      throw new AppError(httpStatus.FORBIDDEN, "You are not assigned to this client case");
    }

    const receiptNumber = await nextReceiptNumber(tx);
    return tx.receipt.create({
      data: {
        caseId: payment.caseId,
        paymentId,
        receiptNumber,
        currency: payment.currency,
        amount: payment.amount,
        status: "PAID",
      },
      include,
    });
  });

  AuditService.writeAuditLog({
    actorId,
    actorEmail,
    action: "GENERATE_RECEIPT",
    targetEntity: "Receipt",
    targetId: receipt.id,
    afterValue: {
      receiptNumber: receipt.receiptNumber,
      amount: receipt.amount.toString(),
      currency: receipt.currency,
      caseId: receipt.caseId,
      paymentId: receipt.paymentId,
    },
  });

  return receipt;
};

// ─── List Receipts ────────────────────────────────────────────────────────────
const listReceipts = async (caseId: string, actorId: string, staff: boolean, userRole?: string) => {
  const item = await prisma.clientCase.findFirst({
    where: { id: caseId, isDeleted: false },
    select: { userId: true, assignedConsultantId: true },
  });
  if (!item) throw new AppError(httpStatus.NOT_FOUND, "Client case not found");
  if (!staff && item.userId !== actorId) throw new AppError(httpStatus.FORBIDDEN, "You cannot access this case");
  if (userRole === "CONSULTANT" && item.assignedConsultantId !== actorId)
    throw new AppError(httpStatus.FORBIDDEN, "You are not assigned to this case");
  return prisma.receipt.findMany({ where: { caseId, isDeleted: false }, include, orderBy: { issuedAt: "desc" } });
};

// ─── Get Single Receipt ───────────────────────────────────────────────────────
const getReceipt = async (id: string, actorId: string, staff: boolean, userRole?: string) => {
  const item = await prisma.receipt.findFirst({ where: { id, isDeleted: false }, include });
  if (!item) throw new AppError(httpStatus.NOT_FOUND, "Receipt not found");
  if (!staff && item.case.userId !== actorId) throw new AppError(httpStatus.FORBIDDEN, "You cannot access this receipt");
  if (userRole === "CONSULTANT" && item.case.assignedConsultantId !== actorId)
    throw new AppError(httpStatus.FORBIDDEN, "You are not assigned to this receipt");
  return item;
};

// ─── Generate Receipt PDF ─────────────────────────────────────────────────────
const generateReceiptPdf = async (id: string, actorId: string, staff: boolean, userRole?: string, actorEmail?: string): Promise<Buffer> => {
  const rct = await getReceipt(id, actorId, staff, userRole);

  const paidAgg = await prisma.payment.aggregate({
    where: { caseId: rct.caseId, isDeleted: false, status: "VERIFIED" },
    _sum: { amount: true },
  });
  const totalPaid = Number(paidAgg._sum.amount || 0);
  const contractedFee = Number(rct.case.paymentPlans?.[0]?.contractedFee || rct.amount);
  const plan = rct.case.paymentPlans?.[0];
  const nextInstallment = plan?.installments?.[0];
  const client = rct.case.user;
  const service = rct.case.service;
  const payment = rct.payment;
  const currency = rct.currency;

  const doc = createBrandedDocument(rct.receiptNumber);

  // 1. Header with Badge & Status
  drawHeader(doc, "RECEIPT", rct.receiptNumber, rct.status);

  // 2. Client & Document Meta Cards
  const clientAddress = [client?.city, client?.state, client?.country].filter(Boolean).join(", ");
  drawDualMetaCards(
    doc,
    [
      { label: "Client Name", value: client?.name || "Valued Client" },
      { label: "Client ID", value: client?.clientId || "ASK-CLIENT" },
      { label: "Email", value: client?.email || "N/A" },
      { label: "Location", value: clientAddress || client?.country || "United States" },
    ],
    [
      { label: "Receipt Number", value: rct.receiptNumber },
      { label: "Payment Date", value: formatDate(payment?.paymentDate || rct.issuedAt) },
      { label: "Case Code", value: rct.case.caseCode },
      { label: "Status", value: "PAYMENT VERIFIED" },
    ]
  );

  // 3. Service Program Banner
  drawServiceBanner(
    doc,
    service?.name || rct.case.serviceNameSnapshot,
    service?.code || rct.case.serviceCodeSnapshot,
    rct.case.serviceCategorySnapshot || service?.category || "IMMIGRATION",
    payment?.paymentMethod
  );

  // 4. Payment Items Table
  drawFeeTable(doc, [
    {
      description: payment?.installment
        ? `Installment Payment — Milestone #${payment.installment.sequenceNumber} (${payment.installment.title || "Milestone Retainer"})`
        : "Direct Account Payment Allocation",
      categoryTag: "Verified Inflow",
      note: `Method: ${payment?.paymentMethod || "STRIPE"} • Reference: ${payment?.externalReference || "N/A"}`,
      amount: Number(rct.amount),
      currency,
    },
    {
      description: "TOTAL AMOUNT RECEIVED & CONFIRMED",
      amount: Number(rct.amount),
      currency,
      isBold: true,
      isTotal: true,
      color: ADSKILL.successGreen,
    },
  ]);

  // 5. Account Standing After This Payment
  drawBalanceBox(
    doc,
    totalPaid,
    contractedFee,
    currency,
    nextInstallment
      ? `Milestone #${nextInstallment.sequenceNumber}${nextInstallment.title ? ` — ${nextInstallment.title}` : ""}`
      : undefined,
    nextInstallment ? formatDate(nextInstallment.dueDate) : undefined,
    "PAID"
  );

  // 6. Payment Transaction Verification Proof & Corporate Seal Block
  drawInstructionsAndSeal(doc, true, {
    method: payment?.paymentMethod || "STRIPE",
    date: formatDate(payment?.paymentDate),
    reference: payment?.externalReference || payment?.id?.slice(0, 16) || "N/A",
    verifiedBy: payment?.verifiedBy?.name
      ? `${payment.verifiedBy.name} (${payment.verifiedBy.role?.name || "OFFICER"})`
      : "Authorized Staff Audit",
  });

  // 7. Disclaimer
  drawDisclaimer(doc);

  // Audit log (non-mutating, safe fail)
  try {
    AuditService.writeAuditLog({
      actorId,
      actorEmail,
      action: "DOWNLOAD_RECEIPT_PDF",
      targetEntity: "Receipt",
      targetId: rct.id,
      afterValue: { receiptNumber: rct.receiptNumber },
    });
  } catch {
    // Non-blocking
  }

  return streamToBuffer(doc);
};

export const ReceiptService = { createReceipt, listReceipts, getReceipt, generateReceiptPdf };
