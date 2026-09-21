import { Request, Response } from "express";
import httpStatus from "http-status";
import AppError from "../../errors/AppError";
import catchAsync from "../../shared/catchAsync";
import sendResponse from "../../shared/sendResponse";
import { AuditService } from "./audit.service";

/**
 * GET /api/v1/audit-logs
 * Lists all audit logs with pagination and filters.
 * Restricted to SUPER_ADMIN only (enforced at route level).
 */
const getAuditLogs = catchAsync(async (req: Request, res: Response) => {
  const {
    page,
    limit,
    sortBy,
    sortOrder,
    searchTerm,
    actorId,
    actorEmail,
    action,
    targetEntity,
    targetId,
    startDate,
    endDate,
  } = req.query as Record<string, string>;

  const result = await AuditService.getAuditLogs(
    {
      searchTerm,
      actorId,
      actorEmail,
      action,
      targetEntity,
      targetId,
      startDate,
      endDate,
      sortBy,
      sortOrder,
    },
    { page, limit }
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Audit logs retrieved successfully",
    meta: result.meta,
    data: result.data,
  });
});

/**
 * GET /api/v1/audit-logs/:id
 * Returns a single audit log entry with full before/after snapshot.
 * Restricted to SUPER_ADMIN only (enforced at route level).
 */
const getAuditLogById = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const log = await AuditService.getAuditLogById(id);

  if (!log) {
    throw new AppError(httpStatus.NOT_FOUND, "Audit log entry not found");
  }

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Audit log entry retrieved successfully",
    data: log,
  });
});

export const AuditController = { getAuditLogs, getAuditLogById };
