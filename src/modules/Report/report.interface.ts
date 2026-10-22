import { ServiceCategory } from "@prisma/client";

export interface TReportFilterPayload {
  searchTerm?: string;
  category?: ServiceCategory | "ALL";
  currency?: string;
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

// ==================== STAFF PERFORMANCE REPORT ====================

export interface TStaffPerformanceFilterPayload {
  searchTerm?: string;
  staffId?: string;
  roleId?: string;
  startDate?: string;
  endDate?: string;
  sortBy?:
    | "name"
    | "verifiedAmount"
    | "leadsCreated"
    | "leadsAssigned"
    | "activitiesCount"
    | "expensesLogged";
  sortOrder?: "asc" | "desc";
  page?: number;
  limit?: number;
}

export interface TStaffPerformanceKPIs {
  totalStaffCount: number;
  totalLeadsCreated: number;
  totalLeadsAssigned: number;
  totalActivitiesLogged: number;
  totalCaseNotesLogged: number;
  totalVerifiedAmount: number;
  totalOnlineStripeAmount: number;
  totalManualAmount: number;
  totalExpensesLogged: number;
  netOperationalRevenue: number;
  totalSupportMessages: number;
  totalSupportTicketsHandled: number;
}

export interface TStaffPerformanceRow {
  staffId: string;
  name: string;
  email: string;
  phone: string | null;
  roleName: string;
  status: string;

  // Leads & Pipeline
  leadsCreated: number;
  leadsAssigned: number;
  leadActivitiesCount: number;
  leadCallsCount: number;
  leadNotesCount: number;

  // Case & Client Operations
  caseNotesCount: number;
  casesAssigned: number;
  clientAuditUpdates: number;

  // Financials Handled & Verified
  verifiedPaymentsCount: number;
  verifiedAmount: number;
  onlineStripeAmount: number;
  manualPaymentAmount: number;

  // Expenses Submitted
  expensesLoggedCount: number;
  expensesLoggedAmount: number;

  // Support
  supportMessagesSent: number;
  supportTicketsHandled: number;
}

export interface TStaffPerformanceResponse {
  kpis: TStaffPerformanceKPIs;
  items: TStaffPerformanceRow[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPage: number;
  };
}

export type TTimelineActivityType =
  | "PAYMENT_VERIFIED"
  | "LEAD_CREATED"
  | "LEAD_ACTIVITY"
  | "CASE_NOTE"
  | "EXPENSE_LOGGED"
  | "SUPPORT_MESSAGE";

export interface TStaffTimelineItem {
  id: string;
  type: TTimelineActivityType;
  title: string;
  subtitle: string;
  timestamp: string;
  amount?: number;
  currency?: string;
  badge?: string;
  metadata?: Record<string, any>;
}

export interface TStaffTimelineResponse {
  staff: {
    id: string;
    name: string;
    email: string;
    roleName: string;
  };
  dateRange: {
    startDate: string;
    endDate: string;
  };
  summary: {
    leadsCreated: number;
    activitiesCount: number;
    verifiedAmount: number;
    expensesAmount: number;
    supportMessages: number;
  };
  timeline: TStaffTimelineItem[];
}

