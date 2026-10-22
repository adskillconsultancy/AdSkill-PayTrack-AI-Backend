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

const getStaffPerformanceReport = catchAsync(
  async (req: Request, res: Response) => {
    const actor = req.user!;
    const payload = {
      searchTerm:
        req.body?.searchTerm ||
        (req.query?.searchTerm as string) ||
        (req.query?.search as string) ||
        undefined,
      staffId:
        req.body?.staffId || (req.query?.staffId as string) || undefined,
      roleId: req.body?.roleId || (req.query?.roleId as string) || undefined,
      startDate:
        req.body?.startDate || (req.query?.startDate as string) || undefined,
      endDate:
        req.body?.endDate || (req.query?.endDate as string) || undefined,
      sortBy:
        req.body?.sortBy || (req.query?.sortBy as any) || "verifiedAmount",
      sortOrder:
        req.body?.sortOrder || (req.query?.sortOrder as any) || "desc",
      page: req.body?.page || (req.query?.page ? Number(req.query.page) : 1),
      limit:
        req.body?.limit || (req.query?.limit ? Number(req.query.limit) : 10),
    };

    const result = await ReportService.getStaffPerformanceReport(
      payload,
      actor,
    );

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Staff operational and performance report generated successfully",
      meta: result.meta,
      data: {
        kpis: result.kpis,
        items: result.items,
      },
    });
  },
);

const getStaffPerformanceTimeline = catchAsync(
  async (req: Request, res: Response) => {
    const actor = req.user!;
    const staffId = req.params.staffId;
    const startDate = (req.query.startDate as string) || undefined;
    const endDate = (req.query.endDate as string) || undefined;

    const result = await ReportService.getStaffPerformanceTimeline(
      staffId,
      startDate,
      endDate,
      actor,
    );

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Staff activity timeline retrieved successfully",
      data: result,
    });
  },
);

export const ReportController = {
  generateReport,
  getReportOverview,
  getStaffPerformanceReport,
  getStaffPerformanceTimeline,
};

