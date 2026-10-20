import { Request, Response } from "express";
import httpStatus from "http-status";
import catchAsync from "../../shared/catchAsync";
import sendResponse from "../../shared/sendResponse";
import { expenseFilterableFields } from "./office-expense.constant";
import { OfficeExpenseService } from "./office-expense.service";

// POST /api/v1/office-expenses
const createExpense = catchAsync(async (req: Request, res: Response) => {
  const actorId = req.user!.id;
  const result = await OfficeExpenseService.createExpense(
    req.body,
    actorId,
    req.user?.email,
    req.file, // optional receipt file via multipart
  );

  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: "Expense/Income entry created successfully",
    data: result,
  });
});

// GET /api/v1/office-expenses
const getAllExpenses = catchAsync(async (req: Request, res: Response) => {
  const filters: Record<string, any> = Object.fromEntries(
    Object.entries(req.query).filter(([key]) => expenseFilterableFields.includes(key)),
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

  const result = await OfficeExpenseService.getAllExpenses(filters, paginationOptions, sortOptions);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Expense/Income entries retrieved successfully",
    meta: result.meta,
    data: { items: result.data, kpis: result.kpis },
  });
});

// GET /api/v1/office-expenses/:id
const getExpenseById = catchAsync(async (req: Request, res: Response) => {
  const result = await OfficeExpenseService.getExpenseById(req.params.id);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Expense/Income entry retrieved successfully",
    data: result,
  });
});

// PATCH /api/v1/office-expenses/:id
const updateExpense = catchAsync(async (req: Request, res: Response) => {
  const actorId = req.user!.id;
  const result = await OfficeExpenseService.updateExpense(
    req.params.id,
    req.body,
    actorId,
    req.user?.email,
    req.file,
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Expense/Income entry updated successfully",
    data: result,
  });
});

// DELETE /api/v1/office-expenses/:id
const deleteExpense = catchAsync(async (req: Request, res: Response) => {
  const actorId = req.user!.id;
  const result = await OfficeExpenseService.deleteExpense(req.params.id, actorId, req.user?.email);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Expense/Income entry deleted successfully",
    data: result,
  });
});

// GET /api/v1/office-expenses/dashboard-summary
const getDashboardSummary = catchAsync(async (_req: Request, res: Response) => {
  const result = await OfficeExpenseService.getDashboardSummary();

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Dashboard expense summary retrieved successfully",
    data: result,
  });
});

export const OfficeExpenseController = {
  createExpense,
  getAllExpenses,
  getExpenseById,
  updateExpense,
  deleteExpense,
  getDashboardSummary,
};
