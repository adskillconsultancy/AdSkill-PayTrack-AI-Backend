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

const updatePaymentPlan = catchAsync(async (req: Request, res: Response) => {
  const result = await PaymentPlanService.updatePaymentPlan(
    req.params.id,
    req.body,
    req.user!.id,
    req.user?.role,
    req.user?.email,
  );
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Payment plan amended successfully",
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

const getAllPaymentPlans = catchAsync(async (req: Request, res: Response) => {
  const caseId = (req.query.caseId || req.query.clientCaseId) as string | undefined;
  const result = await PaymentPlanService.getAllPaymentPlans(
    { caseId },
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

const createPaymentPlanRoot = catchAsync(async (req: Request, res: Response) => {
  const caseId = (req.params.caseId || req.body.caseId || req.body.clientCaseId) as string;
  const scheduleType = req.body.scheduleType || req.body.planType || "CUSTOM";
  const installments = (req.body.installments || []).map((inst: any, idx: number) => ({
    sequenceNumber: inst.sequenceNumber ?? idx + 1,
    title: inst.title || `Installment ${inst.sequenceNumber ?? idx + 1}`,
    amount: Number(inst.amount),
    dueDate: inst.dueDate,
  }));

  const payload = {
    ...req.body,
    scheduleType,
    installments,
  };

  const result = await PaymentPlanService.createPaymentPlan(
    caseId,
    payload,
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

export const PaymentPlanController = {
  createPaymentPlan,
  createPaymentPlanRoot,
  updatePaymentPlan,
  getCasePaymentPlans,
  getPaymentPlanById,
  getAllPaymentPlans,
};
