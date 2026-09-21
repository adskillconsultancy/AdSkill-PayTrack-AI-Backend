export type TDashboardPeriod =
  | "today"
  | "yesterday"
  | "7d"
  | "30d"
  | "this_month"
  | "custom";

export interface TDashboardFilterQuery {
  period?: TDashboardPeriod;
  startDate?: string;
  endDate?: string;
}

export interface TDashboardKPIs {
  totalRevenue: number; // Verified collected payments
  pendingRevenue: number; // Volume of payments pending verification
  totalContracted: number; // Total active contract fees
  outstandingReceivables: number; // Total contracted - verified
  activeClientsCount: number;
  openCasesCount: number;
  pendingVerificationCount: number;
  revenueGrowthPercentage: number; // Compared to previous equivalent period
}

export interface TPaymentStatusDistribution {
  status: string;
  count: number;
  totalAmount: number;
}

export interface TPaymentMethodDistribution {
  method: string;
  count: number;
  totalAmount: number;
}

export interface TDailyFinancialTrend {
  date: string;
  verifiedAmount: number;
  pendingAmount: number;
}

export interface TDashboardPaymentAnalytics {
  period: TDashboardPeriod;
  startDate: string;
  endDate: string;
  totalVolume: number;
  verifiedCount: number;
  pendingCount: number;
  rejectedCount: number;
  statusBreakdown: TPaymentStatusDistribution[];
  methodBreakdown: TPaymentMethodDistribution[];
  trend: TDailyFinancialTrend[];
}

export interface TServiceCategoryCount {
  category: string;
  count: number;
}

export interface TDailyGrowthTrend {
  date: string;
  newClients: number;
  newCases: number;
}

export interface TDashboardClientGrowth {
  period: TDashboardPeriod;
  startDate: string;
  endDate: string;
  totalNewClients: number;
  totalNewCases: number;
  categoryBreakdown: TServiceCategoryCount[];
  growthTrend: TDailyGrowthTrend[];
}

export interface TDashboardVerificationQueueItem {
  id: string;
  caseId: string;
  caseCode: string;
  clientId: string;
  clientName: string;
  clientEmail: string;
  serviceName: string;
  serviceCode: string;
  amount: number;
  currency: string;
  paymentDate: string;
  paymentMethod: string;
  externalReference: string | null;
  operationalNotes: string | null;
  status: string;
  proofDocumentsCount: number;
}

export interface TCaseDistributionItem {
  status: string;
  count: number;
}

export interface TFinancialDistributionItem {
  status: string;
  count: number;
}

export interface TDashboardCaseDistribution {
  caseStatusDistribution: TCaseDistributionItem[];
  financialStatusDistribution: TFinancialDistributionItem[];
  totalCases: number;
}

export interface TDashboardRecentActivityItem {
  id: string;
  action: string;
  targetEntity: string;
  targetId: string;
  actorName: string | null;
  actorEmail: string | null;
  reason: string | null;
  createdAt: string;
}
