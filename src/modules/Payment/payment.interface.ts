import { Prisma } from "@prisma/client";

export type TCreatePaymentPayload = {
  caseId: string;
  installmentId?: string;
  amount: number;
  currency: string;
  paymentDate?: string;
  paymentMethod: string;
  externalReference?: string;
  idempotencyKey?: string;
  operationalNotes?: string;
  proofDocumentIds?: string[];
};
export type TPaymentFilters = {
  status?: string;
  paymentMethod?: string;
  searchTerm?: string;
  startDate?: string;
  endDate?: string;
};
