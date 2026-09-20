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

const uploadCaseDocuments = catchAsync(async (req: Request, res: Response) => {
  const result = await UploadService.uploadCaseDocuments(
    req.files as Express.Multer.File[],
    req.params.caseId,
    req.user!.id,
    req.body.documentType,
  );

  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: "Documents uploaded successfully",
    data: result,
  });
});

const getCaseDocuments = catchAsync(async (req: Request, res: Response) => {
  const result = await UploadService.getCaseDocuments(req.params.caseId, req.user!.id);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Documents retrieved successfully",
    data: result,
  });
});

const deleteDocument = catchAsync(async (req: Request, res: Response) => {
  const result = await UploadService.deleteDocument(req.params.documentId, req.user!.id);
  sendResponse(res, { statusCode: httpStatus.OK, success: true, message: "Document deleted successfully", data: result });
});

const getDocumentDownload = catchAsync(async (req: Request, res: Response) => {
  const result = await UploadService.getDocumentDownload(req.params.documentId, req.user!.id);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Document download URL generated successfully",
    data: result,
  });
});

export const UploadController = {
  uploadDocument,
  uploadCaseDocuments,
  getCaseDocuments,
  getDocumentDownload,
  deleteDocument,
};
