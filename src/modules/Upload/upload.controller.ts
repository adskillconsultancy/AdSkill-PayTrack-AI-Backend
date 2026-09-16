import { Request, Response } from "express";
import httpStatus from "http-status";
import catchAsync from "../../shared/catchAsync";
import sendResponse from "../../shared/sendResponse";
import { UploadService } from "./upload.service";

const uploadDocument = catchAsync(async (req: Request, res: Response) => {
  const result = await UploadService.uploadDocument(req.file, req.user!.id);

  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: "Document uploaded successfully",
    data: result,
  });
});

export const UploadController = {
  uploadDocument,
};
