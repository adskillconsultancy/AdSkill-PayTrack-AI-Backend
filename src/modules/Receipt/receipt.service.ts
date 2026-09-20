import crypto from "crypto";
import httpStatus from "http-status";
import AppError from "../../errors/AppError";
import prisma from "../../lib/prisma";
const include = { case: { select: { id: true, caseCode: true, userId: true } }, payment: { select: { id: true, status: true } } };
const createReceipt = async (paymentId: string, actorId: string) => prisma.$transaction(async (tx) => {
  const payment = await tx.payment.findFirst({ where: { id: paymentId, isDeleted: false }, select: { id: true, caseId: true, amount: true, currency: true, status: true } });
  if (!payment) throw new AppError(httpStatus.NOT_FOUND, "Payment not found");
  if (payment.status !== "VERIFIED") throw new AppError(httpStatus.BAD_REQUEST, "Verified payment required");
  const owner = await tx.clientCase.findUnique({ where: { id: payment.caseId }, select: { userId: true } });
  if (!owner) throw new AppError(httpStatus.NOT_FOUND, "Client case not found");
  const number = `RCT-${new Date().getUTCFullYear()}-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
  return tx.receipt.create({ data: { caseId: payment.caseId, paymentId, receiptNumber: number, currency: payment.currency, amount: payment.amount }, include });
});
const listReceipts = async (caseId: string, actorId: string, staff: boolean) => { const item = await prisma.clientCase.findFirst({ where: { id: caseId, isDeleted: false }, select: { userId: true } }); if (!item) throw new AppError(httpStatus.NOT_FOUND, "Client case not found"); if (!staff && item.userId !== actorId) throw new AppError(httpStatus.FORBIDDEN, "You cannot access this case"); return prisma.receipt.findMany({ where: { caseId, isDeleted: false }, include, orderBy: { issuedAt: "desc" } }); };
const getReceipt = async (id: string, actorId: string, staff: boolean) => { const item = await prisma.receipt.findFirst({ where: { id, isDeleted: false }, include }); if (!item) throw new AppError(httpStatus.NOT_FOUND, "Receipt not found"); if (!staff && item.case.userId !== actorId) throw new AppError(httpStatus.FORBIDDEN, "You cannot access this receipt"); return item; };
export const ReceiptService = { createReceipt, listReceipts, getReceipt };
