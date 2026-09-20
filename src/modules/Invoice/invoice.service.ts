import crypto from "crypto";
import { Prisma } from "@prisma/client";
import httpStatus from "http-status";
import AppError from "../../errors/AppError";
import prisma from "../../lib/prisma";

const include = { case: { select: { id: true, caseCode: true, userId: true, serviceNameSnapshot: true } } };
const access = async (caseId: string, actorId: string, staff: boolean) => {
  const item = await prisma.clientCase.findFirst({ where: { id: caseId, isDeleted: false }, select: { userId: true } });
  if (!item) throw new AppError(httpStatus.NOT_FOUND, "Client case not found");
  if (!staff && item.userId !== actorId) throw new AppError(httpStatus.FORBIDDEN, "You cannot access this case");
};
const generateInvoice = async (caseId: string, actorId: string) => {
  await access(caseId, actorId, true);
  return prisma.$transaction(async (tx) => {
    const plan = await tx.paymentPlan.findFirst({ where: { caseId, isDeleted: false, isActive: true }, orderBy: { createdAt: "desc" }, select: { contractedFee: true, currency: true } });
    if (!plan) throw new AppError(httpStatus.BAD_REQUEST, "Active payment plan required");
    const number = `INV-${new Date().getUTCFullYear()}-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
    return tx.invoice.create({ data: { caseId, invoiceNumber: number, currency: plan.currency, amount: new Prisma.Decimal(plan.contractedFee) }, include });
  });
};
const listInvoices = async (caseId: string, actorId: string, staff: boolean) => { await access(caseId, actorId, staff); return prisma.invoice.findMany({ where: { caseId, isDeleted: false }, include, orderBy: { issuedAt: "desc" } }); };
const getInvoice = async (id: string, actorId: string, staff: boolean) => { const item = await prisma.invoice.findFirst({ where: { id, isDeleted: false }, include }); if (!item) throw new AppError(httpStatus.NOT_FOUND, "Invoice not found"); if (!staff && item.case.userId !== actorId) throw new AppError(httpStatus.FORBIDDEN, "You cannot access this invoice"); return item; };
export const InvoiceService = { generateInvoice, listInvoices, getInvoice };
