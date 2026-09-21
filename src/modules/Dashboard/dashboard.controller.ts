import { Request, Response } from "express";
import httpStatus from "http-status";
import catchAsync from "../../shared/catchAsync";
import sendResponse from "../../shared/sendResponse";
import { TDashboardFilterQuery } from "./dashboard.interface";
import { DashboardService } from "./dashboard.service";

const getKPIs = catchAsync(async (req: Request, res: Response) => {
  const filters: TDashboardFilterQuery = {
    period: req.query.period as TDashboardFilterQuery["period"],
    startDate: req.query.startDate as string,
    endDate: req.query.endDate as string,
  };

  const result = await DashboardService.getKPIs(filters);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Dashboard KPIs retrieved successfully",
    data: result,
  });
});

const getPaymentAnalytics = catchAsync(async (req: Request, res: Response) => {
  const filters: TDashboardFilterQuery = {
    period: req.query.period as TDashboardFilterQuery["period"],
    startDate: req.query.startDate as string,
    endDate: req.query.endDate as string,
  };

  const result = await DashboardService.getPaymentAnalytics(filters);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Payment analytics retrieved successfully",
    data: result,
  });
});

const getClientGrowth = catchAsync(async (req: Request, res: Response) => {
  const filters: TDashboardFilterQuery = {
    period: req.query.period as TDashboardFilterQuery["period"],
    startDate: req.query.startDate as string,
    endDate: req.query.endDate as string,
  };

  const result = await DashboardService.getClientGrowth(filters);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Client growth analytics retrieved successfully",
    data: result,
  });
});

const getVerificationQueue = catchAsync(async (req: Request, res: Response) => {
  const limit = req.query.limit ? Number(req.query.limit) : 10;
  const result = await DashboardService.getVerificationQueue(limit);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Pending verification queue retrieved successfully",
    data: result,
  });
});

const getCaseDistribution = catchAsync(async (req: Request, res: Response) => {
  const filters: TDashboardFilterQuery = {
    period: req.query.period as TDashboardFilterQuery["period"],
    startDate: req.query.startDate as string,
    endDate: req.query.endDate as string,
  };

  const result = await DashboardService.getCaseDistribution(filters);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Case distribution retrieved successfully",
    data: result,
  });
});

const getRecentActivity = catchAsync(async (req: Request, res: Response) => {
  const limit = req.query.limit ? Number(req.query.limit) : 10;
  const result = await DashboardService.getRecentActivity(limit);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Recent activity retrieved successfully",
    data: result,
  });
});

export const DashboardController = {
  getKPIs,
  getPaymentAnalytics,
  getClientGrowth,
  getVerificationQueue,
  getCaseDistribution,
  getRecentActivity,
};
