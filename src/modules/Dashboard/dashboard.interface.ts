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

export interface TClientInstallmentItem {
  id: string;
  sequenceNumber: number;
  title: string | null;
  amount: number;
  dueDate: string;
  status: string;
  isOverdue: boolean;
}

export interface TClientPaymentHistoryItem {
  id: string;
  amount: number;
  currency: string;
  paymentDate: string;
  paymentMethod: string;
  status: string;
  externalReference: string | null;
  receiptId?: string | null;
  receiptNumber?: string | null;
}

export interface TClientInvoiceItem {
  id: string;
  invoiceNumber: string;
  currency: string;
  amount: number;
  status: string;
  issuedAt: string;
}

export interface TClientReceiptItem {
  id: string;
  receiptNumber: string;
  currency: string;
  amount: number;
  status: string;
  issuedAt: string;
  paymentId: string | null;
}

export interface TAdSkillContactInfo {
  legalName: string;
  address: string;
  email: string;
  phone: string;
  whatsapp: string;
  portalUrl: string;
}

export interface TClientDashboardSummary {
  hasActiveCase: boolean;
  caseId: string | null;
  caseCode: string | null;
  serviceName: string | null;
  serviceCategory: string | null;
  currency: string;
  caseStatus: string | null;
  financialStatus: string | null;
  totalProfessionalFee: number;
  totalPaid: number;
  remainingBalance: number;
  nextPaymentAmount: number | null;
  nextDueDate: string | null;
  nextInstallmentTitle: string | null;
  nextInstallmentSequence: number | null;
  schedule: TClientInstallmentItem[];
  paymentHistory: TClientPaymentHistoryItem[];
  invoices: TClientInvoiceItem[];
  receipts: TClientReceiptItem[];
  adskillContact: TAdSkillContactInfo;
  feeDisclaimer: string;
}

