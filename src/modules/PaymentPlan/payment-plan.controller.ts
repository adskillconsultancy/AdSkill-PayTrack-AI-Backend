import { Request, Response } from "express";
import httpStatus from "http-status";
import catchAsync from "../../shared/catchAsync";
import sendResponse from "../../shared/sendResponse";
import { PaymentPlanService } from "./payment-plan.service";

const isStaff = (req: Request) => req.user?.role !== "CLIENT";

const createPaymentPlan = catchAsync(async (req: Request, res: Response) => {
  const result = await PaymentPlanService.createPaymentPlan(
    req.params.caseId,
    req.body,
    req.user!.id,
    req.user?.role,
    req.user?.email,
  );
  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: "Payment plan created successfully",
    data: result,
  });
});

const getCasePaymentPlans = catchAsync(async (req: Request, res: Response) => {
  const result = await PaymentPlanService.getPaymentPlansForCase(
    req.params.caseId,
    req.user!.id,
    isStaff(req),
    req.user?.role,
  );
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Payment plans retrieved successfully",
    data: result,
  });
});

const getPaymentPlanById = catchAsync(async (req: Request, res: Response) => {
  const result = await PaymentPlanService.getPaymentPlanById(
    req.params.id,
    req.user!.id,
    isStaff(req),
    req.user?.role,
  );
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Payment plan retrieved successfully",
    data: result,
  });
});

export const PaymentPlanController = {
  createPaymentPlan,
  getCasePaymentPlans,
  getPaymentPlanById,
};
