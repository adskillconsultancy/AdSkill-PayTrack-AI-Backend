export const PERMISSIONS = {
  EXPENSE_READ: "expense:read",
  EXPENSE_CREATE: "expense:create",
  EXPENSE_UPDATE: "expense:update",
  EXPENSE_DELETE: "expense:delete",
  EXPENSE_MANAGE: "expense:manage",
} as const;

export const EXPENSE_UPLOAD_FOLDER = "adskill-paytrack/expense-receipts" as const;

export const EXPENSE_CATEGORIES_EXPENSE = [
  "OFFICE_SUPPLIES",
  "UTILITIES",
  "RENT",
  "TRAVEL",
  "MEALS_ENTERTAINMENT",
  "MARKETING",
  "SALARY",
  "SOFTWARE_SUBSCRIPTIONS",
  "EQUIPMENT",
  "MAINTENANCE",
  "TAX",
  "OTHER",
] as const;

export const EXPENSE_CATEGORIES_INCOME = [
  "SERVICE_REVENUE",
  "CONSULTATION_FEE",
  "RETAINER",
  "REFERRAL_FEE",
  "MISCELLANEOUS_INCOME",
  "TAX",
  "OTHER",
] as const;

export const expenseSearchableFields: string[] = ["description", "otherCategory"];

export const expenseFilterableFields: string[] = [
  "searchTerm",
  "search",
  "type",
  "category",
  "currency",
  "startDate",
  "endDate",
  "createdById",
  "isDeleted",
];

export const expenseSortableFields: string[] = [
  "transactionDate",
  "amount",
  "createdAt",
  "updatedAt",
];
