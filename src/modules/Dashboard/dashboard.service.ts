import { Prisma } from "@prisma/client";
import prisma from "../../lib/prisma";
import { getDateRangeForPeriod } from "./dashboard.constant";
import {
  TDashboardCaseDistribution,
  TDashboardClientGrowth,
  TDashboardFilterQuery,
  TDashboardKPIs,
  TDashboardPaymentAnalytics,
  TDashboardRecentActivityItem,
  TDashboardVerificationQueueItem,
  TDailyFinancialTrend,
  TDailyGrowthTrend,
} from "./dashboard.interface";

/**
 * Generates an array of date string keys (YYYY-MM-DD) between start and end date
 */
const generateDateKeyArray = (startDate: Date, endDate: Date): string[] => {
  const dates: string[] = [];
  const current = new Date(startDate);
  // Normalize to UTC date string
  while (current <= endDate) {
    dates.push(current.toISOString().split("T")[0]);
    current.setUTCDate(current.getUTCDate() + 1);
  }
  return dates;
};

/**
 * 1. Calculate Executive CRM High-Level KPIs
 */
const getKPIs = async (
  filters: TDashboardFilterQuery,
): Promise<TDashboardKPIs> => {
  const { period = "30d", startDate: customStart, endDate: customEnd } = filters;
  const { startDate, endDate, previousStartDate, previousEndDate } =
    getDateRangeForPeriod(period, customStart, customEnd);

  const [
    periodVerifiedPayments,
    previousVerifiedPayments,
    allVerifiedPayments,
    pendingPayments,
    allActivePlans,
    activeClientsCount,
    openCasesCount,
  ] = await Promise.all([
    // Verified payments within selected period
    prisma.payment.findMany({
      where: {
        isDeleted: false,
        status: { in: ["VERIFIED", "COMPLETED", "PAID"] },
        paymentDate: { gte: startDate, lte: endDate },
      },
      select: { amount: true },
    }),

    // Verified payments in previous window for comparison
    prisma.payment.findMany({
      where: {
        isDeleted: false,
        status: { in: ["VERIFIED", "COMPLETED", "PAID"] },
        paymentDate: { gte: previousStartDate, lte: previousEndDate },
      },
      select: { amount: true },
    }),

    // All-time verified collections for total balance calculation
    prisma.payment.findMany({
      where: {
        isDeleted: false,
        status: { in: ["VERIFIED", "COMPLETED", "PAID"] },
      },
      select: { amount: true },
    }),

    // All active pending payments awaiting verification
    prisma.payment.findMany({
      where: {
        isDeleted: false,
        status: "PENDING",
      },
      select: { amount: true },
    }),

    // All active payment plans
    prisma.paymentPlan.findMany({
      where: { isDeleted: false, isActive: true },
      select: { contractedFee: true },
    }),

    // Active clients count
    prisma.user.count({
      where: {
        isDeleted: false,
        status: "ACTIVE",
        OR: [
          { clientId: { not: null } },
          { role: { name: "CLIENT" } },
        ],
      },
    }),

    // Open cases count
    prisma.clientCase.count({
      where: {
        isDeleted: false,
        caseStatus: { in: ["INTAKE", "ACTIVE", "ON_HOLD"] },
      },
    }),
  ]);

  const totalPeriodRevenue = periodVerifiedPayments.reduce(
    (sum, p) => sum + Number(p.amount || 0),
    0,
  );
  const previousRevenue = previousVerifiedPayments.reduce(
    (sum, p) => sum + Number(p.amount || 0),
    0,
  );

  const pendingRevenue = pendingPayments.reduce(
    (sum, p) => sum + Number(p.amount || 0),
    0,
  );

  const totalContracted = allActivePlans.reduce(
    (sum, plan) => sum + Number(plan.contractedFee || 0),
    0,
  );

  const allTimeVerified = allVerifiedPayments.reduce(
    (sum, p) => sum + Number(p.amount || 0),
    0,
  );

  const outstandingReceivables = Math.max(0, totalContracted - allTimeVerified);

  // Calculate percentage growth compared to previous window
  let revenueGrowthPercentage = 0;
  if (previousRevenue > 0) {
    revenueGrowthPercentage = Number(
      (((totalPeriodRevenue - previousRevenue) / previousRevenue) * 100).toFixed(1),
    );
  } else if (totalPeriodRevenue > 0) {
    revenueGrowthPercentage = 100.0;
  }

  return {
    totalRevenue: totalPeriodRevenue,
    pendingRevenue,
    totalContracted,
    outstandingReceivables,
    activeClientsCount,
    openCasesCount,
    pendingVerificationCount: pendingPayments.length,
    revenueGrowthPercentage,
  };
};

/**
 * 2. Payment Flow & Verification Analytics
 */
const getPaymentAnalytics = async (
  filters: TDashboardFilterQuery,
): Promise<TDashboardPaymentAnalytics> => {
  const { period = "30d", startDate: customStart, endDate: customEnd } = filters;
  const { startDate, endDate } = getDateRangeForPeriod(
    period,
    customStart,
    customEnd,
  );

  // Fetch payments within timeframe
  const payments = await prisma.payment.findMany({
    where: {
      isDeleted: false,
      paymentDate: { gte: startDate, lte: endDate },
    },
    select: {
      id: true,
      amount: true,
      status: true,
      paymentMethod: true,
      paymentDate: true,
    },
    orderBy: { paymentDate: "asc" },
  });

  // Calculate status breakdown
  const statusMap = new Map<string, { count: number; totalAmount: number }>();
  // Initialize with standard statuses
  statusMap.set("VERIFIED", { count: 0, totalAmount: 0 });
  statusMap.set("PENDING", { count: 0, totalAmount: 0 });
  statusMap.set("REJECTED", { count: 0, totalAmount: 0 });

  // Calculate method breakdown
  const methodMap = new Map<string, { count: number; totalAmount: number }>();

  // Daily trend
  const dateKeys = generateDateKeyArray(startDate, endDate);
  const trendMap = new Map<string, { verifiedAmount: number; pendingAmount: number }>();
  dateKeys.forEach((key) => {
    trendMap.set(key, { verifiedAmount: 0, pendingAmount: 0 });
  });

  let totalVolume = 0;
  let verifiedCount = 0;
  let pendingCount = 0;
  let rejectedCount = 0;

  for (const payment of payments) {
    const amt = Number(payment.amount || 0);
    totalVolume += amt;
    const normalizedStatus = ["VERIFIED", "COMPLETED", "PAID"].includes(payment.status)
      ? "VERIFIED"
      : payment.status;

    if (normalizedStatus === "VERIFIED") verifiedCount++;
    else if (normalizedStatus === "PENDING") pendingCount++;
    else if (normalizedStatus === "REJECTED") rejectedCount++;

    // Status map
    const currStatus = statusMap.get(normalizedStatus) || { count: 0, totalAmount: 0 };
    currStatus.count += 1;
    currStatus.totalAmount += amt;
    statusMap.set(normalizedStatus, currStatus);

    // Method map
    const method = payment.paymentMethod || "OTHER";
    const currMethod = methodMap.get(method) || { count: 0, totalAmount: 0 };
    currMethod.count += 1;
    currMethod.totalAmount += amt;
    methodMap.set(method, currMethod);

    // Daily trend
    const dayKey = payment.paymentDate.toISOString().split("T")[0];
    const dayTrend = trendMap.get(dayKey);
    if (dayTrend) {
      if (normalizedStatus === "VERIFIED") {
        dayTrend.verifiedAmount += amt;
      } else if (normalizedStatus === "PENDING") {
        dayTrend.pendingAmount += amt;
      }
    }
  }

  const statusBreakdown = Array.from(statusMap.entries()).map(([status, val]) => ({
    status,
    count: val.count,
    totalAmount: val.totalAmount,
  }));

  const methodBreakdown = Array.from(methodMap.entries())
    .map(([method, val]) => ({
      method,
      count: val.count,
      totalAmount: val.totalAmount,
    }))
    .sort((a, b) => b.totalAmount - a.totalAmount);

  const trend: TDailyFinancialTrend[] = Array.from(trendMap.entries()).map(
    ([date, val]) => ({
      date,
      verifiedAmount: val.verifiedAmount,
      pendingAmount: val.pendingAmount,
    }),
  );

  return {
    period,
    startDate: startDate.toISOString(),
    endDate: endDate.toISOString(),
    totalVolume,
    verifiedCount,
    pendingCount,
    rejectedCount,
    statusBreakdown,
    methodBreakdown,
    trend,
  };
};

/**
 * 3. Client Registration & Case Growth Analytics
 */
const getClientGrowth = async (
  filters: TDashboardFilterQuery,
): Promise<TDashboardClientGrowth> => {
  const { period = "30d", startDate: customStart, endDate: customEnd } = filters;
  const { startDate, endDate } = getDateRangeForPeriod(
    period,
    customStart,
    customEnd,
  );

  const [newClients, newCases, allCasesInRange] = await Promise.all([
    // Clients registered within period
    prisma.user.findMany({
      where: {
        isDeleted: false,
        createdAt: { gte: startDate, lte: endDate },
        OR: [
          { clientId: { not: null } },
          { role: { name: "CLIENT" } },
        ],
      },
      select: { id: true, createdAt: true },
    }),

    // Cases opened within period
    prisma.clientCase.findMany({
      where: {
        isDeleted: false,
        createdAt: { gte: startDate, lte: endDate },
      },
      select: {
        id: true,
        createdAt: true,
        serviceCategorySnapshot: true,
        service: { select: { category: true } },
      },
    }),

    // Category breakdown
    prisma.clientCase.findMany({
      where: {
        isDeleted: false,
        createdAt: { gte: startDate, lte: endDate },
      },
      select: {
        serviceCategorySnapshot: true,
        service: { select: { category: true } },
      },
    }),
  ]);

  // Aggregate by Category
  const categoryMap = new Map<string, number>();
  for (const c of allCasesInRange) {
    const cat = c.serviceCategorySnapshot || c.service?.category || "IMMIGRATION";
    categoryMap.set(cat, (categoryMap.get(cat) || 0) + 1);
  }

  const categoryBreakdown = Array.from(categoryMap.entries()).map(
    ([category, count]) => ({ category, count }),
  );

  // Daily growth trend
  const dateKeys = generateDateKeyArray(startDate, endDate);
  const trendMap = new Map<string, { newClients: number; newCases: number }>();
  dateKeys.forEach((key) => {
    trendMap.set(key, { newClients: 0, newCases: 0 });
  });

  for (const u of newClients) {
    const dayKey = u.createdAt.toISOString().split("T")[0];
    const item = trendMap.get(dayKey);
    if (item) item.newClients++;
  }

  for (const c of newCases) {
    const dayKey = c.createdAt.toISOString().split("T")[0];
    const item = trendMap.get(dayKey);
    if (item) item.newCases++;
  }

  const growthTrend: TDailyGrowthTrend[] = Array.from(trendMap.entries()).map(
    ([date, val]) => ({
      date,
      newClients: val.newClients,
      newCases: val.newCases,
    }),
  );

  return {
    period,
    startDate: startDate.toISOString(),
    endDate: endDate.toISOString(),
    totalNewClients: newClients.length,
    totalNewCases: newCases.length,
    categoryBreakdown,
    growthTrend,
  };
};

/**
 * 4. Pending Payment Verification Queue (Actionable Items)
 */
const getVerificationQueue = async (
  limit: number = 10,
): Promise<TDashboardVerificationQueueItem[]> => {
  const pendingPayments = await prisma.payment.findMany({
    where: {
      isDeleted: false,
      status: "PENDING",
    },
    take: limit,
    orderBy: { recordedAt: "asc" }, // Longest pending first
    include: {
      case: {
        include: {
          user: {
            select: {
              id: true,
              name: true,
              clientId: true,
              email: true,
            },
          },
          service: {
            select: {
              id: true,
              name: true,
              code: true,
            },
          },
        },
      },
      proofDocuments: {
        where: { isDeleted: false },
        select: { id: true },
      },
    },
  });

  return pendingPayments.map((p) => {
    const c = p.case;
    return {
      id: p.id,
      caseId: c.id,
      caseCode: c.caseCode,
      clientId: c.user?.clientId || "ASK-CLIENT",
      clientName: c.user?.name || "Client Account",
      clientEmail: c.user?.email || "No email",
      serviceName: c.serviceNameSnapshot || c.service?.name || "Case Advisory",
      serviceCode: c.serviceCodeSnapshot || c.service?.code || "SRV",
      amount: Number(p.amount || 0),
      currency: p.currency || "USD",
      paymentDate: p.paymentDate.toISOString(),
      paymentMethod: p.paymentMethod || "OFFLINE_TRANSFER",
      externalReference: p.externalReference || null,
      operationalNotes: p.operationalNotes || null,
      status: p.status,
      proofDocumentsCount: p.proofDocuments?.length || 0,
    };
  });
};

/**
 * 5. Case Lifecycle & Financial Health Distribution
 */
const getCaseDistribution = async (
  filters: TDashboardFilterQuery,
): Promise<TDashboardCaseDistribution> => {
  const [caseStatusCounts, financialStatusCounts, totalCases] = await Promise.all([
    prisma.clientCase.groupBy({
      by: ["caseStatus"],
      where: { isDeleted: false },
      _count: { id: true },
    }),
    prisma.clientCase.groupBy({
      by: ["financialStatus"],
      where: { isDeleted: false },
      _count: { id: true },
    }),
    prisma.clientCase.count({ where: { isDeleted: false } }),
  ]);

  return {
    caseStatusDistribution: caseStatusCounts.map((c) => ({
      status: c.caseStatus,
      count: c._count.id,
    })),
    financialStatusDistribution: financialStatusCounts.map((f) => ({
      status: f.financialStatus,
      count: f._count.id,
    })),
    totalCases,
  };
};

/**
 * 6. Recent Audit / Operational Activity
 */
const getRecentActivity = async (
  limit: number = 10,
): Promise<TDashboardRecentActivityItem[]> => {
  const logs = await prisma.auditLog.findMany({
    take: limit,
    orderBy: { createdAt: "desc" },
    include: {
      actor: {
        select: {
          name: true,
          email: true,
        },
      },
    },
  });

  return logs.map((log) => ({
    id: log.id,
    action: log.action,
    targetEntity: log.targetEntity,
    targetId: log.targetId,
    actorName: log.actor?.name || log.actorEmail || "System Automation",
    actorEmail: log.actor?.email || log.actorEmail || null,
    reason: log.reason || null,
    createdAt: log.createdAt.toISOString(),
  }));
};

export const DashboardService = {
  getKPIs,
  getPaymentAnalytics,
  getClientGrowth,
  getVerificationQueue,
  getCaseDistribution,
  getRecentActivity,
};
