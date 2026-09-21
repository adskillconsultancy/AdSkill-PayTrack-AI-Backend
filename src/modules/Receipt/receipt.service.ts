import crypto from "crypto";
import httpStatus from "http-status";
import AppError from "../../errors/AppError";
import prisma from "../../lib/prisma";
import { AuditService } from "../Audit/audit.service";

const include = { case: { select: { id: true, caseCode: true, userId: true, assignedConsultantId: true } }, payment: { select: { id: true, status: true } } };
const createReceipt = async (paymentId: string, actorId: string, userRole?: string, actorEmail?: string) => {
  const receipt = await prisma.$transaction(async (tx) => {
    const payment = await tx.payment.findFirst({ where: { id: paymentId, isDeleted: false }, select: { id: true, caseId: true, amount: true, currency: true, status: true } });
    if (!payment) throw new AppError(httpStatus.NOT_FOUND, "Payment not found");
    if (payment.status !== "VERIFIED") throw new AppError(httpStatus.BAD_REQUEST, "Verified payment required");
    const owner = await tx.clientCase.findUnique({ where: { id: payment.caseId }, select: { userId: true, assignedConsultantId: true } });
    if (!owner) throw new AppError(httpStatus.NOT_FOUND, "Client case not found");
    if (userRole === "CONSULTANT" && owner.assignedConsultantId !== actorId) {
      throw new AppError(httpStatus.FORBIDDEN, "You are not assigned to this client case");
    }
    const number = `RCT-${new Date().getUTCFullYear()}-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
    return tx.receipt.create({ data: { caseId: payment.caseId, paymentId, receiptNumber: number, currency: payment.currency, amount: payment.amount }, include });
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
const listReceipts = async (caseId: string, actorId: string, staff: boolean, userRole?: string) => {
  const item = await prisma.clientCase.findFirst({ where: { id: caseId, isDeleted: false }, select: { userId: true, assignedConsultantId: true } });
  if (!item) throw new AppError(httpStatus.NOT_FOUND, "Client case not found");
  if (!staff && item.userId !== actorId) throw new AppError(httpStatus.FORBIDDEN, "You cannot access this case");
  if (userRole === "CONSULTANT" && item.assignedConsultantId !== actorId) throw new AppError(httpStatus.FORBIDDEN, "You are not assigned to this case");
  return prisma.receipt.findMany({ where: { caseId, isDeleted: false }, include, orderBy: { issuedAt: "desc" } });
};
const getReceipt = async (id: string, actorId: string, staff: boolean, userRole?: string) => {
  const item = await prisma.receipt.findFirst({ where: { id, isDeleted: false }, include });
  if (!item) throw new AppError(httpStatus.NOT_FOUND, "Receipt not found");
  if (!staff && item.case.userId !== actorId) throw new AppError(httpStatus.FORBIDDEN, "You cannot access this receipt");
  if (userRole === "CONSULTANT" && item.case.assignedConsultantId !== actorId) throw new AppError(httpStatus.FORBIDDEN, "You are not assigned to this receipt");
  return item;
};
export const ReceiptService = { createReceipt, listReceipts, getReceipt };
