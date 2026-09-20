import { Request, Response } from "express";
import httpStatus from "http-status";
import catchAsync from "../../shared/catchAsync";
import sendResponse from "../../shared/sendResponse";
import { CaseNoteService } from "./case-note.service";

const createNote = catchAsync(async (req: Request, res: Response) => {
  const result = await CaseNoteService.createNote(
    req.body,
    req.user!.id,
    req.user?.role,
  );
  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: "Case note created successfully",
    data: result,
  });
});

const getCaseNotes = catchAsync(async (req: Request, res: Response) => {
  const result = await CaseNoteService.getCaseNotes(
    req.params.caseId,
    req.user!.id,
    req.user?.role,
  );
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Case notes retrieved successfully",
    data: result,
  });
});

const updateNote = catchAsync(async (req: Request, res: Response) => {
  const result = await CaseNoteService.updateNote(
    req.params.id,
    req.body,
    req.user!.id,
    req.user?.role,
  );
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Case note updated successfully",
    data: result,
  });
});

const deleteNote = catchAsync(async (req: Request, res: Response) => {
  const result = await CaseNoteService.deleteNote(
    req.params.id,
    req.user!.id,
    req.user?.role,
  );
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Case note deleted successfully",
    data: result,
  });
});

export const CaseNoteController = {
  createNote,
  getCaseNotes,
  updateNote,
  deleteNote,
};
