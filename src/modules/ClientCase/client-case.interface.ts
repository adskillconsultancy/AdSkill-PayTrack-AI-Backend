import { CaseStatus } from "@prisma/client";

export type TCreateClientCasePayload = {
  userId?: string;
  serviceId: string;
  destinationCountry?: string;
  caseCategory?: string;
  caseSubcategory?: string;
  agreementDate?: string;
  serviceStartDate?: string;
  assignedConsultantId?: string | null;
  caseStatus?: CaseStatus;
  clientVisibleNotes?: string;
  internalNotes?: string;
  superAdminNotes?: string;
};

export type TUpdateClientCasePayload = {
  destinationCountry?: string;
  caseCategory?: string;
  caseSubcategory?: string;
  agreementDate?: string;
  serviceStartDate?: string;
  caseStatus?: CaseStatus;
  clientVisibleNotes?: string;
  internalNotes?: string;
  superAdminNotes?: string;
  assignedConsultantId?: string | null;
};
