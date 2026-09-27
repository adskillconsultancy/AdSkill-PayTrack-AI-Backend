import { Request, Response } from "express";
import httpStatus from "http-status";
import catchAsync from "../../shared/catchAsync";
import sendResponse from "../../shared/sendResponse";
import { ReportService } from "./report.service";

const generateReport = catchAsync(async (req: Request, res: Response) => {
  const actor = req.user!;
  const result = await ReportService.generateReport(req.body, actor);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Executive financial and management report generated successfully",
    meta: result.meta,
    data: {
      kpis: result.kpis,
      items: result.items,
    },
  });
});

const getReportOverview = catchAsync(async (req: Request, res: Response) => {
  const actor = req.user!;
  const payload = {
    type: (req.query.type as any) || "MONTHLY_COLLECTIONS",
    startDate: (req.query.startDate as string) || undefined,
    endDate: (req.query.endDate as string) || undefined,
    category: (req.query.category as any) || undefined,
    searchTerm: ((req.query.searchTerm || req.query.search) as string) || undefined,
    page: req.query.page ? Number(req.query.page) : 1,
    limit: req.query.limit ? Number(req.query.limit) : 20,
  };
  const result = await ReportService.generateReport(payload, actor);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Executive financial and management report generated successfully",
    meta: result.meta,
    data: {
      kpis: result.kpis,
      items: result.items,
    },
  });
});

export const ReportController = {
  generateReport,
  getReportOverview,
};
