import { CaseStatus } from "@prisma/client";

export type TCreateClientCasePayload = {
  serviceId: string;
  destinationCountry?: string;
  caseCategory?: string;
  caseSubcategory?: string;
  agreementDate?: string;
  serviceStartDate?: string;
  clientVisibleNotes?: string;
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
  assignedConsultantId?: string | null;
};
