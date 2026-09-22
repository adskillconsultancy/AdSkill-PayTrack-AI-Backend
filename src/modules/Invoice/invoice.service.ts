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
          baseFeeSnapshot: true,
          discountAmount: true,
          discountReason: true,
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
};

// ─── Access Gate ─────────────────────────────────────────────────────────────
const access = async (caseId: string, actorId: string, staff: boolean, userRole?: string) => {
  const item = await prisma.clientCase.findFirst({
    where: { id: caseId, isDeleted: false },
    select: { userId: true, assignedConsultantId: true },
  });
  if (!item) throw new AppError(httpStatus.NOT_FOUND, "Client case not found");
  if (!staff && item.userId !== actorId) throw new AppError(httpStatus.FORBIDDEN, "You cannot access this case");
  if (userRole === "CONSULTANT" && item.assignedConsultantId !== actorId)
    throw new AppError(httpStatus.FORBIDDEN, "You are not assigned to this case");
};

// ─── Sequential Invoice Number Generator ─────────────────────────────────────
const nextInvoiceNumber = async (tx: Prisma.TransactionClient): Promise<string> => {
  const year = new Date().getUTCFullYear();
  const counter = await tx.invoiceCounter.upsert({
    where: { year },
    create: { year, lastSeq: 1 },
    update: { lastSeq: { increment: 1 } },
  });
  return `INV-${year}-${String(counter.lastSeq).padStart(5, "0")}`;
};

// ─── Generate Invoice ─────────────────────────────────────────────────────────
const generateInvoice = async (caseId: string, actorId: string, userRole?: string, actorEmail?: string) => {
  await access(caseId, actorId, true, userRole);

  const invoice = await prisma.$transaction(async (tx) => {
    const plan = await tx.paymentPlan.findFirst({
      where: { caseId, isDeleted: false, isActive: true },
      orderBy: { createdAt: "desc" },
      select: { contractedFee: true, currency: true },
    });
    if (!plan) throw new AppError(httpStatus.BAD_REQUEST, "Active payment plan required");

    const invoiceNumber = await nextInvoiceNumber(tx);
    return tx.invoice.create({
      data: {
        caseId,
        invoiceNumber,
        currency: plan.currency,
        amount: new Prisma.Decimal(plan.contractedFee),
        status: "ISSUED",
      },
      include,
    });
  });

  AuditService.writeAuditLog({
    actorId,
    actorEmail,
    action: "GENERATE_INVOICE",
    targetEntity: "Invoice",
    targetId: invoice.id,
    afterValue: {
      invoiceNumber: invoice.invoiceNumber,
      amount: invoice.amount.toString(),
      currency: invoice.currency,
      caseId: invoice.caseId,
    },
  });

  return invoice;
};

// ─── List Invoices ────────────────────────────────────────────────────────────
const listInvoices = async (caseId: string, actorId: string, staff: boolean, userRole?: string) => {
  await access(caseId, actorId, staff, userRole);
  return prisma.invoice.findMany({ where: { caseId, isDeleted: false }, include, orderBy: { issuedAt: "desc" } });
};

// ─── Get Single Invoice ───────────────────────────────────────────────────────
const getInvoice = async (id: string, actorId: string, staff: boolean, userRole?: string) => {
  const item = await prisma.invoice.findFirst({ where: { id, isDeleted: false }, include });
  if (!item) throw new AppError(httpStatus.NOT_FOUND, "Invoice not found");
  if (!staff && item.case.userId !== actorId) throw new AppError(httpStatus.FORBIDDEN, "You cannot access this invoice");
  if (userRole === "CONSULTANT" && item.case.assignedConsultantId !== actorId)
    throw new AppError(httpStatus.FORBIDDEN, "You are not assigned to this case");
  return item;
};

// ─── Generate Invoice PDF ─────────────────────────────────────────────────────
const generateInvoicePdf = async (id: string, actorId: string, staff: boolean, userRole?: string, actorEmail?: string): Promise<Buffer> => {
  const inv = await getInvoice(id, actorId, staff, userRole);

  // Compute paid amount for this case
  const paidAgg = await prisma.payment.aggregate({
    where: { caseId: inv.caseId, isDeleted: false, status: "VERIFIED" },
    _sum: { amount: true },
  });
  const totalPaid = Number(paidAgg._sum.amount || 0);
  const contractedFee = Number(inv.case.paymentPlans?.[0]?.contractedFee || inv.amount);
  const plan = inv.case.paymentPlans?.[0];
  const nextInstallment = plan?.installments?.[0];
  const client = inv.case.user;
  const service = inv.case.service;

  const doc = createBrandedDocument(inv.invoiceNumber);

  // 1. Header with Badge & Status
  drawHeader(doc, "INVOICE", inv.invoiceNumber, inv.status);

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
      { label: "Invoice Number", value: inv.invoiceNumber },
      { label: "Issue Date", value: formatDate(inv.issuedAt) },
      { label: "Case Code", value: inv.case.caseCode },
      { label: "Currency", value: `${inv.currency} ($)` },
    ]
  );

  // 3. Service Program Banner
  drawServiceBanner(
    doc,
    service?.name || inv.case.serviceNameSnapshot,
    service?.code || inv.case.serviceCodeSnapshot,
    inv.case.serviceCategorySnapshot || service?.category || "IMMIGRATION",
    plan?.scheduleType
  );

  // 4. Itemized Fee Breakdown Table
  const baseFee = Number(plan?.baseFeeSnapshot || service?.baseFee || 0);
  const discountAmount = Number(plan?.discountAmount || 0);
  const govFee = Number(service?.estimatedGovFee || 0);
  const attorneyFee = Number(service?.estimatedAttorneyFee || 0);
  const thirdPartyFee = Number(service?.estimatedThirdPartyFee || 0);
  const currency = inv.currency;

  const feeRows = [
    {
      description: "AdSkill Professional Advisory & Case Preparation",
      categoryTag: "Professional Retainer",
      note: "Retained legal consultancy and petition management fee",
      amount: baseFee,
      currency,
    },
    ...(discountAmount > 0
      ? [
          {
            description: `Contract Fee Discount (${plan?.discountReason || "Special Promotion"})`,
            categoryTag: "Discount Credit",
            amount: -discountAmount,
            currency,
            color: ADSKILL.successGreen,
          },
        ]
      : []),
    ...(govFee > 0
      ? [
          {
            description: "Government / USCIS Official Filing Fees",
            categoryTag: "Pass-Through",
            note: "Official regulatory fees — pass-through cost",
            amount: govFee,
            currency,
          },
        ]
      : []),
    ...(attorneyFee > 0
      ? [
          {
            description: "Outside Legal Counsel Review Fees",
            categoryTag: "Pass-Through",
            note: "Bar-certified attorney review — pass-through cost",
            amount: attorneyFee,
            currency,
          },
        ]
      : []),
    ...(thirdPartyFee > 0
      ? [
          {
            description: "Third-Party Document & Translation Fees",
            categoryTag: "Pass-Through",
            note: "Academic evaluations / certified translations",
            amount: thirdPartyFee,
            currency,
          },
        ]
      : []),
    {
      description: "TOTAL CONTRACTED PROFESSIONAL FEE",
      amount: contractedFee,
      currency,
      isBold: true,
      isTotal: true,
    },
  ];

  drawFeeTable(doc, feeRows);

  // 5. Balance Summary Box
  drawBalanceBox(
    doc,
    totalPaid,
    contractedFee,
    currency,
    nextInstallment
      ? `Milestone #${nextInstallment.sequenceNumber}${nextInstallment.title ? ` — ${nextInstallment.title}` : ""}`
      : undefined,
    nextInstallment ? formatDate(nextInstallment.dueDate) : undefined,
    inv.status
  );

  // 6. Payment Remittance & Corporate Seal Block
  drawInstructionsAndSeal(doc, false);

  // 7. Legal Disclaimer & Institutional Footer
  drawDisclaimer(doc);

  // Audit log (non-mutating, safe fail)
  try {
    AuditService.writeAuditLog({
      actorId,
      actorEmail,
      action: "DOWNLOAD_INVOICE_PDF",
      targetEntity: "Invoice",
      targetId: inv.id,
      afterValue: { invoiceNumber: inv.invoiceNumber },
    });
  } catch {
    // Audit logging is non-blocking for document download
  }

  return streamToBuffer(doc);
};

export const InvoiceService = { generateInvoice, listInvoices, getInvoice, generateInvoicePdf };
