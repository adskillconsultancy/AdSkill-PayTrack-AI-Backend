import { Request, Response } from "express";
import httpStatus from "http-status";
import catchAsync from "../../shared/catchAsync";
import sendResponse from "../../shared/sendResponse";
import { SupportService } from "./support.service";

const getSupportOverview = catchAsync(async (req: Request, res: Response) => {
  const result = await SupportService.getSupportOverview(
    req.user!.id,
    req.user?.role,
  );
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Support overview fetched successfully",
    data: result,
  });
});

const createTicket = catchAsync(async (req: Request, res: Response) => {
  const result = await SupportService.createTicket(
    req.user!.id,
    req.user?.role,
    req.body,
  );
  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: result.message,
    data: result.ticket,
  });
});

const getTickets = catchAsync(async (req: Request, res: Response) => {
  const filters = {
    searchTerm: req.query.searchTerm as string | undefined,
    status: req.query.status as any,
    category: req.query.category as any,
    targetType: req.query.targetType as any,
    scope: req.query.scope as any,
    caseId: req.query.caseId as string | undefined,
    page: req.query.page ? Number(req.query.page) : undefined,
    limit: req.query.limit ? Number(req.query.limit) : undefined,
    sortBy: req.query.sortBy as string | undefined,
    sortOrder: req.query.sortOrder as any,
  };

  const result = await SupportService.getTickets(
    { id: req.user!.id, role: req.user?.role },
    filters,
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Support tickets retrieved successfully",
    meta: result.meta,
    data: result.data,
  });
});

const getTicketById = catchAsync(async (req: Request, res: Response) => {
  const result = await SupportService.getTicketById(
    req.params.id,
    { id: req.user!.id, role: req.user?.role },
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Support conversation fetched successfully",
    data: result,
  });
});

const sendMessage = catchAsync(async (req: Request, res: Response) => {
  const result = await SupportService.sendMessage(
    req.params.id,
    { id: req.user!.id, role: req.user?.role },
    req.body,
  );

  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: result.message,
    data: result.data,
  });
});

const updateTicketStatus = catchAsync(async (req: Request, res: Response) => {
  const result = await SupportService.updateTicketStatus(
    req.params.id,
    { id: req.user!.id, role: req.user?.role },
    req.body,
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: result.message,
    data: result.data,
  });
});

const getConversations = catchAsync(async (req: Request, res: Response) => {
  const result = await SupportService.getConversations({
    id: req.user!.id,
    role: req.user?.role,
  });

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Messenger conversations retrieved successfully",
    data: result,
  });
});

const markTicketRead = catchAsync(async (req: Request, res: Response) => {
  const result = await SupportService.markTicketRead(
    req.params.id,
    { id: req.user!.id, role: req.user?.role },
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Conversation marked as read",
    data: result,
  });
});

// Legacy backward-compatibility endpoints
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
  createTicket,
  getTickets,
  getTicketById,
  sendMessage,
  updateTicketStatus,
  getConversations,
  markTicketRead,
  createInquiry,
  getMyInquiries,
};


