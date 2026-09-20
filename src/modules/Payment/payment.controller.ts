import { Request, Response } from "express";
import httpStatus from "http-status";
import catchAsync from "../../shared/catchAsync";
import sendResponse from "../../shared/sendResponse";
import { PaymentService } from "./payment.service";

const isStaff = (req: Request) => req.user?.role !== "CLIENT";

const createPayment = catchAsync(async (req: Request, res: Response) => {
  const result = await PaymentService.createPayment(req.body, req.user!.id, isStaff(req));
  sendResponse(res, { statusCode: httpStatus.CREATED, success: true, message: "Payment recorded successfully", data: result });
});

const listPayments = catchAsync(async (req: Request, res: Response) => {
  const result = await PaymentService.listPayments(req.params.caseId, req.user!.id, isStaff(req));
  sendResponse(res, { statusCode: httpStatus.OK, success: true, message: "Payments retrieved successfully", data: result });
});

const getPaymentById = catchAsync(async (req: Request, res: Response) => {
  const result = await PaymentService.getPaymentById(req.params.id, req.user!.id, isStaff(req));
  sendResponse(res, { statusCode: httpStatus.OK, success: true, message: "Payment retrieved successfully", data: result });
});

const verifyPayment = catchAsync(async (req: Request, res: Response) => {
  const result = await PaymentService.verifyPayment(req.params.id, req.user!.id);
  sendResponse(res, { statusCode: httpStatus.OK, success: true, message: "Payment verified successfully", data: result });
});

const getAllPayments = catchAsync(async (req: Request, res: Response) => {
  const result = await PaymentService.getAllPayments(
    req.query as any,
    req.user!.id,
    isStaff(req),
  );
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Payments retrieved successfully",
    meta: {
      page: 1,
      limit: result.payments.length,
      total: result.stats.totalTransactions,
    },
    data: result,
  });
});

export const PaymentController = {
  createPayment,
  listPayments,
  getPaymentById,
  verifyPayment,
  getAllPayments,
};

