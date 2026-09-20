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

export const ReportController = {
  generateReport,
};
