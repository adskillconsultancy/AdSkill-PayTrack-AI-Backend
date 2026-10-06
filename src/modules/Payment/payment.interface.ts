import { Prisma } from "@prisma/client";

export type TCreatePaymentPayload = {
  caseId: string;
  installmentId?: string;
  /** Required for CLIENT and STAFF. CLIENT partial payments allowed —
   *  server validates amount does not exceed installment target or remaining balance. */
  amount: number;
  /** CLIENT role: omit — resolved from the active payment plan.
   *  STAFF role: should be supplied. */
  currency?: string;
  paymentDate?: string;
  paymentMethod: string;
  externalReference?: string;
  idempotencyKey?: string;
  operationalNotes?: string;
  proofDocumentIds?: string[];
  status?: "PENDING" | "VERIFIED";
};
export type TPaymentFilters = {
  status?: string;
  paymentMethod?: string;
  searchTerm?: string;
  startDate?: string;
  endDate?: string;
};
