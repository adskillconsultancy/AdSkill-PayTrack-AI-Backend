import { Request, Response } from "express";
import httpStatus from "http-status";
import catchAsync from "../../shared/catchAsync";
import sendResponse from "../../shared/sendResponse";
import { InvoiceService } from "./invoice.service";

const staff = (req: Request) => req.user?.role !== "CLIENT";

const generateInvoice = catchAsync(async (req: Request, res: Response) => {
  const data = await InvoiceService.generateInvoice(req.params.caseId, req.user!.id, req.user?.role, req.user?.email);
  sendResponse(res, { statusCode: httpStatus.CREATED, success: true, message: "Invoice generated successfully", data });
});

const listInvoices = catchAsync(async (req: Request, res: Response) => {
  const data = await InvoiceService.listInvoices(req.params.caseId, req.user!.id, staff(req), req.user?.role);
  sendResponse(res, { statusCode: httpStatus.OK, success: true, message: "Invoices retrieved successfully", data });
});

const getInvoice = catchAsync(async (req: Request, res: Response) => {
  const data = await InvoiceService.getInvoice(req.params.id, req.user!.id, staff(req), req.user?.role);
  sendResponse(res, { statusCode: httpStatus.OK, success: true, message: "Invoice retrieved successfully", data });
});

const downloadInvoicePdf = catchAsync(async (req: Request, res: Response) => {
  const pdfBuffer = await InvoiceService.generateInvoicePdf(
    req.params.id,
    req.user!.id,
    staff(req),
    req.user?.role,
    req.user?.email
  );
  res.set({
    "Content-Type": "application/pdf",
    "Content-Disposition": `inline; filename="invoice-${req.params.id}.pdf"`,
    "Content-Length": pdfBuffer.length,
    "Cache-Control": "no-store",
  });
  res.send(pdfBuffer);
});

export const InvoiceController = { generateInvoice, listInvoices, getInvoice, downloadInvoicePdf };
