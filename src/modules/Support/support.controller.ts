import { Request, Response } from "express";
import httpStatus from "http-status";
import catchAsync from "../../shared/catchAsync";
import sendResponse from "../../shared/sendResponse";
import { SupportService } from "./support.service";

const getSupportOverview = catchAsync(async (req: Request, res: Response) => {
  const result = await SupportService.getSupportOverview(req.user!.id, req.user?.role);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Support overview fetched successfully",
    data: result,
  });
});

const createInquiry = catchAsync(async (req: Request, res: Response) => {
  const result = await SupportService.createInquiry(req.user!.id, req.body);
  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: result.message,
    data: result,
  });
});

const getMyInquiries = catchAsync(async (req: Request, res: Response) => {
  const result = await SupportService.getMyInquiries(req.user!.id);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Support inquiries fetched successfully",
    data: result,
  });
});

export const SupportController = {
  getSupportOverview,
  createInquiry,
  getMyInquiries,
};
