import { OfficeExpenseCategory, TransactionType } from "@prisma/client";

export type TCreateExpensePayload = {
  type: TransactionType;
  category?: OfficeExpenseCategory;
  otherCategory?: string;
  amount: number;
  currency?: string;
  description?: string;
  transactionDate: string; // ISO date string
};

export type TUpdateExpensePayload = Partial<TCreateExpensePayload> & {
  isDeleted?: boolean;
};

export type TExpenseFilterRequest = {
  searchTerm?: string;
  search?: string;
  type?: TransactionType;
  category?: OfficeExpenseCategory;
  currency?: string;
  startDate?: string;
  endDate?: string;
  createdById?: string;
  isDeleted?: boolean | string;
};
