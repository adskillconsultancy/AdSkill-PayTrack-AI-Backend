import { Request, Response } from "express";
import httpStatus from "http-status";
import catchAsync from "../../shared/catchAsync";
import sendResponse from "../../shared/sendResponse";
import { ClientCaseService } from "./client-case.service";

const isStaff = (req: Request) => req.user?.role !== "CLIENT";


const createClientCase = catchAsync(async (req: Request, res: Response) => {
  const result = await ClientCaseService.createClientCase(req.body, req.user!.id);
  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: "Client case created successfully",
    data: result,
  });
});

const getMyCases = catchAsync(async (req: Request, res: Response) => {
  const result = await ClientCaseService.getCasesForUser(req.user!.id);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Client cases retrieved successfully",
    data: result,
  });
});

const getCaseById = catchAsync(async (req: Request, res: Response) => {
  const result = await ClientCaseService.getCaseById(req.params.id, req.user!.id, isStaff(req));
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Client case retrieved successfully",
    data: result,
  });
});

const updateCase = catchAsync(async (req: Request, res: Response) => {
  const result = await ClientCaseService.updateCase(
    req.params.id,
    req.body,
    req.user!.id,
    isStaff(req),
  );
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Client case updated successfully",
    data: result,
  });
});

export const ClientCaseController = {
  createClientCase,
  getMyCases,
  getCaseById,
  updateCase,
};
