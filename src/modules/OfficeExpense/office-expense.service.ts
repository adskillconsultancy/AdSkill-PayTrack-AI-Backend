import { OfficeExpenseCategory, Prisma, TransactionType } from "@prisma/client";
import crypto from "crypto";
import httpStatus from "http-status";
import AppError from "../../errors/AppError";
import { deletePrivateObject, getPrivateObjectSignedUrl, uploadPrivateObject } from "../../lib/r2";
import prisma from "../../lib/prisma";
import {
  buildDateRangeFilter,
  buildSearchFilter,
  buildSortOrder,
  ISortOptions,
} from "../../shared/filterHelper";
import {
  buildPaginationMeta,
  calculatePagination,
  IPaginationOptions,
} from "../../shared/paginationHelper";
import { AuditService } from "../Audit/audit.service";
import {
  EXPENSE_UPLOAD_FOLDER,
  expenseSearchableFields,
  expenseSortableFields,
} from "./office-expense.constant";
import {
  TCreateExpensePayload,
  TExpenseFilterRequest,
  TUpdateExpensePayload,
} from "./office-expense.interface";

// ── Standard projection ──────────────────────────────────────────────────────
const expenseSelect = {
  id: true,
  type: true,
  category: true,
  otherCategory: true,
  amount: true,
  currency: true,
  description: true,
  transactionDate: true,
  receiptKey: true,
  receiptBucket: true,
  receiptName: true,
  receiptMimeType: true,
  createdById: true,
  createdBy: {
    select: { id: true, name: true, email: true },
  },
  updatedById: true,
  updatedBy: {
    select: { id: true, name: true, email: true },
  },
  isDeleted: true,
  deletedAt: true,
  createdAt: true,
  updatedAt: true,
};

// ── Helpers ──────────────────────────────────────────────────────────────────

const sanitizeReceiptName = (name: string) =>
  name.trim().replace(/[^a-zA-Z0-9._-]/g, "-").replace(/-+/g, "-").slice(0, 120);

const buildReceiptKey = (actorId: string, originalName: string): string => {
  const now = new Date();
  const year = now.getUTCFullYear();
  const month = String(now.getUTCMonth() + 1).padStart(2, "0");
  const uid = crypto.randomUUID();
  return `${EXPENSE_UPLOAD_FOLDER}/${actorId}/${year}/${month}/${uid}-${sanitizeReceiptName(originalName)}`;
};

const withSignedReceipt = async (expense: any) => {
  if (!expense.receiptKey) return { ...expense, receiptSignedUrl: null };
  try {
    const receiptSignedUrl = await getPrivateObjectSignedUrl(expense.receiptKey);
    return { ...expense, receiptSignedUrl };
  } catch {
    return { ...expense, receiptSignedUrl: null };
  }
};

// ── CRUD Operations ──────────────────────────────────────────────────────────

const createExpense = async (
  payload: TCreateExpensePayload,
  actorId: string,
  actorEmail?: string,
  receiptFile?: Express.Multer.File,
) => {
  let receiptKey: string | undefined;
  let receiptBucket: string | undefined;
  let receiptName: string | undefined;
  let receiptMimeType: string | undefined;

  // Upload receipt to R2 if provided
  if (receiptFile) {
    receiptKey = buildReceiptKey(actorId, receiptFile.originalname);
    const uploadResult = await uploadPrivateObject({
      key: receiptKey,
      body: receiptFile.buffer,
      contentType: receiptFile.mimetype,
      metadata: { uploadedBy: actorId, module: "office-expense" },
    });
    receiptBucket = uploadResult.bucket;
    receiptName = receiptFile.originalname;
    receiptMimeType = receiptFile.mimetype;
  }

  const result = await prisma.officeExpense.create({
    data: {
      type: payload.type,
      category: (payload.category || "OTHER") as OfficeExpenseCategory,
      otherCategory: payload.otherCategory,
      amount: new Prisma.Decimal(payload.amount),
      currency: payload.currency ? payload.currency.toUpperCase() : "USD",
      description: payload.description,
      transactionDate: new Date(payload.transactionDate),
      receiptKey,
      receiptBucket,
      receiptName,
      receiptMimeType,
      createdById: actorId,
    },
    select: expenseSelect,
  });

  AuditService.writeAuditLog({
    actorId,
    actorEmail,
    action: "CREATE_OFFICE_EXPENSE",
    targetEntity: "OfficeExpense",
    targetId: result.id,
    afterValue: {
      type: result.type,
      category: result.category,
      amount: result.amount.toString(),
      currency: result.currency,
      transactionDate: result.transactionDate,
    },
  });

  return withSignedReceipt(result);
};

const getAllExpenses = async (
  filters: TExpenseFilterRequest,
  paginationOptions?: IPaginationOptions,
  sortOptions?: ISortOptions,
) => {
  const { page, limit, skip } = calculatePagination(paginationOptions);
  const orderBy = buildSortOrder(sortOptions, expenseSortableFields, "transactionDate", "desc");

  const { searchTerm, type, category, currency, startDate, endDate, createdById, isDeleted } =
    filters;

  const andConditions: Prisma.OfficeExpenseWhereInput[] = [];

  // Soft delete filter
  const isDeletedBool =
    isDeleted !== undefined
      ? typeof isDeleted === "string"
        ? isDeleted === "true"
        : Boolean(isDeleted)
      : false;
  andConditions.push({ isDeleted: isDeletedBool });

  // Search
  const searchWord = searchTerm || (filters as any).search;
  const searchCondition = buildSearchFilter(searchWord, expenseSearchableFields);
  if (searchCondition) andConditions.push(searchCondition);

  if (type) andConditions.push({ type: type as TransactionType });
  if (category) andConditions.push({ category: category as OfficeExpenseCategory });
  if (currency) andConditions.push({ currency: currency.toUpperCase() });
  if (createdById) andConditions.push({ createdById });

  // Date range on transactionDate
  const dateFilter = buildDateRangeFilter("transactionDate", startDate, endDate);
  if (dateFilter) andConditions.push(dateFilter);

  const whereCondition: Prisma.OfficeExpenseWhereInput =
    andConditions.length > 0 ? { AND: andConditions } : {};

  const [expenses, total] = await Promise.all([
    prisma.officeExpense.findMany({
      where: whereCondition,
      select: expenseSelect,
      skip,
      take: limit,
      orderBy,
    }),
    prisma.officeExpense.count({ where: whereCondition }),
  ]);

  // Aggregate totals for KPI summary
  const [incomeAgg, expenseAgg] = await Promise.all([
    prisma.officeExpense.aggregate({
      where: { ...whereCondition, type: "INCOME" },
      _sum: { amount: true },
      _count: true,
    }),
    prisma.officeExpense.aggregate({
      where: { ...whereCondition, type: "EXPENSE" },
      _sum: { amount: true },
      _count: true,
    }),
  ]);

  const meta = buildPaginationMeta(page, limit, total);
  const kpis = {
    totalIncome: Number(incomeAgg._sum.amount || 0),
    totalExpenses: Number(expenseAgg._sum.amount || 0),
    netBalance: Number(incomeAgg._sum.amount || 0) - Number(expenseAgg._sum.amount || 0),
    incomeCount: incomeAgg._count,
    expenseCount: expenseAgg._count,
  };

  // Sign receipt URLs in batch (best-effort)
  const data = await Promise.all(expenses.map(withSignedReceipt));

  return { meta, data, kpis };
};

const getExpenseById = async (id: string) => {
  const expense = await prisma.officeExpense.findFirst({
    where: { id, isDeleted: false },
    select: expenseSelect,
  });

  if (!expense) throw new AppError(httpStatus.NOT_FOUND, "Expense/Income entry not found");

  return withSignedReceipt(expense);
};

const updateExpense = async (
  id: string,
  payload: TUpdateExpensePayload,
  actorId: string,
  actorEmail?: string,
  receiptFile?: Express.Multer.File,
) => {
  const existing = await prisma.officeExpense.findFirst({
    where: { id, isDeleted: false },
  });

  if (!existing) throw new AppError(httpStatus.NOT_FOUND, "Expense/Income entry not found");

  const updateData: Prisma.OfficeExpenseUpdateInput = {
    updatedBy: { connect: { id: actorId } },
  };

  if (payload.type !== undefined) updateData.type = payload.type;
  if (payload.category !== undefined) updateData.category = payload.category as OfficeExpenseCategory;
  if (payload.otherCategory !== undefined) updateData.otherCategory = payload.otherCategory;
  if (payload.amount !== undefined) updateData.amount = new Prisma.Decimal(payload.amount);
  if (payload.currency !== undefined) updateData.currency = payload.currency.toUpperCase();
  if (payload.description !== undefined) updateData.description = payload.description;
  if (payload.transactionDate !== undefined)
    updateData.transactionDate = new Date(payload.transactionDate);

  // Replace receipt if a new file is uploaded
  if (receiptFile) {
    // Delete old receipt from R2 if exists
    if (existing.receiptKey) {
      try {
        await deletePrivateObject(existing.receiptKey);
      } catch {
        // Non-fatal: log but continue
      }
    }
    const newKey = buildReceiptKey(actorId, receiptFile.originalname);
    const uploadResult = await uploadPrivateObject({
      key: newKey,
      body: receiptFile.buffer,
      contentType: receiptFile.mimetype,
      metadata: { uploadedBy: actorId, module: "office-expense" },
    });
    updateData.receiptKey = newKey;
    updateData.receiptBucket = uploadResult.bucket;
    updateData.receiptName = receiptFile.originalname;
    updateData.receiptMimeType = receiptFile.mimetype;
  }

  const result = await prisma.officeExpense.update({
    where: { id },
    data: updateData,
    select: expenseSelect,
  });

  AuditService.writeAuditLog({
    actorId,
    actorEmail,
    action: "UPDATE_OFFICE_EXPENSE",
    targetEntity: "OfficeExpense",
    targetId: id,
    beforeValue: {
      type: existing.type,
      amount: existing.amount.toString(),
      category: existing.category,
    },
    afterValue: {
      type: result.type,
      amount: result.amount.toString(),
      category: result.category,
    },
  });

  return withSignedReceipt(result);
};

const deleteExpense = async (id: string, actorId: string, actorEmail?: string) => {
  const existing = await prisma.officeExpense.findFirst({
    where: { id, isDeleted: false },
  });

  if (!existing) throw new AppError(httpStatus.NOT_FOUND, "Expense/Income entry not found");

  const result = await prisma.officeExpense.update({
    where: { id },
    data: {
      isDeleted: true,
      deletedAt: new Date(),
      updatedById: actorId,
    },
    select: expenseSelect,
  });

  AuditService.writeAuditLog({
    actorId,
    actorEmail,
    action: "DELETE_OFFICE_EXPENSE",
    targetEntity: "OfficeExpense",
    targetId: id,
    beforeValue: { type: existing.type, amount: existing.amount.toString(), isDeleted: false },
    afterValue: { isDeleted: true, deletedAt: new Date().toISOString() },
  });

  return result;
};

// ── Dashboard-level summary (Super Admin widget) ─────────────────────────────
const getDashboardSummary = async () => {
  const now = new Date();
  const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const [monthIncome, monthExpense, allTimeIncome, allTimeExpense] = await Promise.all([
    prisma.officeExpense.aggregate({
      where: { type: "INCOME", isDeleted: false, transactionDate: { gte: firstOfMonth } },
      _sum: { amount: true },
      _count: true,
    }),
    prisma.officeExpense.aggregate({
      where: { type: "EXPENSE", isDeleted: false, transactionDate: { gte: firstOfMonth } },
      _sum: { amount: true },
      _count: true,
    }),
    prisma.officeExpense.aggregate({
      where: { type: "INCOME", isDeleted: false },
      _sum: { amount: true },
    }),
    prisma.officeExpense.aggregate({
      where: { type: "EXPENSE", isDeleted: false },
      _sum: { amount: true },
    }),
  ]);

  return {
    currentMonth: {
      totalIncome: Number(monthIncome._sum.amount || 0),
      totalExpenses: Number(monthExpense._sum.amount || 0),
      netBalance:
        Number(monthIncome._sum.amount || 0) - Number(monthExpense._sum.amount || 0),
      incomeCount: monthIncome._count,
      expenseCount: monthExpense._count,
    },
    allTime: {
      totalIncome: Number(allTimeIncome._sum.amount || 0),
      totalExpenses: Number(allTimeExpense._sum.amount || 0),
      netBalance:
        Number(allTimeIncome._sum.amount || 0) - Number(allTimeExpense._sum.amount || 0),
    },
  };
};

export const OfficeExpenseService = {
  createExpense,
  getAllExpenses,
  getExpenseById,
  updateExpense,
  deleteExpense,
  getDashboardSummary,
};
