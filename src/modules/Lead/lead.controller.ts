import { Request, Response } from "express";
import httpStatus from "http-status";
import catchAsync from "../../shared/catchAsync";
import sendResponse from "../../shared/sendResponse";
import { leadFilterableFields } from "./lead.constant";
import { LeadService } from "./lead.service";

const createLead = catchAsync(async (req: Request, res: Response) => {
  const user = req.user ? { id: req.user.id, name: req.user.name || req.user.email, email: req.user.email } : undefined;
  const result = await LeadService.createLead(req.body, user);

  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: "Lead created successfully",
    data: result,
  });
});

const getAllLeads = catchAsync(async (req: Request, res: Response) => {
  const filters: Record<string, any> = Object.fromEntries(
    Object.entries(req.query).filter(([key]) =>
      leadFilterableFields.includes(key),
    ),
  );
  if (req.query.search && !filters.searchTerm) {
    filters.searchTerm = req.query.search as string;
  }

  const paginationOptions = {
    page: req.query.page as string | undefined,
    limit: req.query.limit as string | undefined,
  };

  const sortOptions = {
    sortBy: req.query.sortBy as string | undefined,
    sortOrder: req.query.sortOrder as string | undefined,
  };

  const result = await LeadService.getAllLeads(
    filters,
    paginationOptions,
    sortOptions,
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Leads retrieved successfully",
    meta: result.meta,
    data: result.data,
  });
});

const getLeadById = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const result = await LeadService.getLeadById(id);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Lead details retrieved successfully",
    data: result,
  });
});

const updateLead = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const user = req.user ? { id: req.user.id, name: req.user.name || req.user.email, email: req.user.email } : undefined;
  const result = await LeadService.updateLead(id, req.body, user);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Lead updated successfully",
    data: result,
  });
});

const addLeadActivity = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const user = req.user ? { id: req.user.id, name: req.user.name || req.user.email, email: req.user.email } : undefined;
  const result = await LeadService.addLeadActivity(id, req.body, user);

  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: "Lead activity recorded successfully",
    data: result,
  });
});

const deleteLead = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const result = await LeadService.deleteLead(id);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Lead deleted successfully",
    data: result,
  });
});

const getLeadSummaryStats = catchAsync(async (req: Request, res: Response) => {
  const user = req.user ? { id: req.user.id, role: req.user.role } : undefined;
  const result = await LeadService.getLeadSummaryStats(user);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Lead summary statistics retrieved successfully",
    data: result,
  });
});

const getFollowUpQueue = catchAsync(async (req: Request, res: Response) => {
  const user = {
    id: req.user!.id,
    role: req.user?.role,
  };

  const filters = {
    urgency: req.query.urgency as "OVERDUE" | "TODAY" | "UPCOMING" | "ALL" | undefined,
    assignedToId: req.query.assignedToId as string | undefined,
    searchTerm: (req.query.searchTerm || req.query.search) as string | undefined,
  };

  const paginationOptions = {
    page: req.query.page as string | undefined,
    limit: req.query.limit as string | undefined,
  };

  const result = await LeadService.getFollowUpQueue(user, filters, paginationOptions);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Lead follow-up queue retrieved successfully",
    meta: result.meta,
    data: {
      items: result.data,
      counts: result.counts,
    },
  });
});

const completeFollowUp = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const user = req.user
    ? { id: req.user.id, name: req.user.name || req.user.email, email: req.user.email }
    : undefined;

  const result = await LeadService.completeFollowUp(id, req.body, user);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Lead follow-up marked as completed",
    data: result,
  });
});

export const LeadController = {
  createLead,
  getAllLeads,
  getLeadById,
  updateLead,
  addLeadActivity,
  deleteLead,
  getLeadSummaryStats,
  getFollowUpQueue,
  completeFollowUp,
};
