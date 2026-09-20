import { ServiceCategory } from "@prisma/client";

export interface TReportFilterPayload {
  searchTerm?: string;
  category?: ServiceCategory | "ALL";
  startDate?: string;
  endDate?: string;
  sortBy?: "paymentDate" | "verifiedAmount" | "contractedFee" | "clientName" | "programName";
  sortOrder?: "asc" | "desc";
  page?: number;
  limit?: number;
}

export interface TReportKPIs {
  totalVerifiedIncome: number;
  totalContractedFees: number;
  totalOutstandingReceivables: number;
  verifiedCollectionsCount: number;
}

export interface TReportRow {
  id: string; // payment ID
  caseCode: string;
  clientId: string;
  clientName: string;
  programName: string;
  programCode: string;
  programCategory: string;
  collectionDate: string; // that day the money was collected
  contractedFee: number; // AdSkill contract fee only (excludes gov / 3rd party)
  verifiedAmount: number; // verified money only
  currency: string;
  paymentMethod: string;
  externalReference: string | null;
  status: string; // "VERIFIED"
}

export interface TReportDataResponse {
  kpis: TReportKPIs;
  items: TReportRow[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPage: number;
  };
}
