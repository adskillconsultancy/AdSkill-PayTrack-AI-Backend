import { Request, Response } from "express";
import httpStatus from "http-status";
import catchAsync from "../../shared/catchAsync";
import sendResponse from "../../shared/sendResponse";
import { AttendanceService } from "./attendance.service";

const clockIn = catchAsync(async (req: Request, res: Response) => {
  const result = await AttendanceService.clockIn(req.user!.id, req.body);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Clocked in successfully",
    data: result,
  });
});

const clockOut = catchAsync(async (req: Request, res: Response) => {
  const result = await AttendanceService.clockOut(req.user!.id, req.body);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Clocked out successfully",
    data: result,
  });
});

const updateFocus = catchAsync(async (req: Request, res: Response) => {
  const result = await AttendanceService.updateFocus(req.user!.id, req.body);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Focus updated successfully",
    data: result,
  });
});

const getCurrentStatus = catchAsync(async (req: Request, res: Response) => {
  const result = await AttendanceService.getCurrentStatus(req.user!.id);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Attendance status retrieved successfully",
    data: result,
  });
});

const getMyHistory = catchAsync(async (req: Request, res: Response) => {
  const result = await AttendanceService.getMyHistory(req.user!.id, req.query);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Personal attendance history retrieved successfully",
    meta: result.meta,
    data: result.data,
  });
});

const getTeamAttendance = catchAsync(async (req: Request, res: Response) => {
  const result = await AttendanceService.getTeamAttendance(req.query);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Team attendance retrieved successfully",
    meta: result.meta,
    data: {
      metrics: result.metrics,
      records: result.data,
    },
  });
});

const getTodayDigest = catchAsync(async (req: Request, res: Response) => {
  const dateStr = req.query.date as string | undefined;
  const result = await AttendanceService.getOrGenerateDailyDigest(dateStr);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Daily AI Digest retrieved successfully",
    data: result,
  });
});

const generateDigest = catchAsync(async (req: Request, res: Response) => {
  const dateStr = req.body?.date || (req.query.date as string | undefined);
  const result = await AttendanceService.generateDailyDigest(dateStr);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Daily AI Digest generated successfully",
    data: result,
  });
});

export const AttendanceController = {
  clockIn,
  clockOut,
  updateFocus,
  getCurrentStatus,
  getMyHistory,
  getTeamAttendance,
  getTodayDigest,
  generateDigest,
};
