import { Prisma } from "@prisma/client";
import prisma from "../../lib/prisma";
import { TAuthUser } from "../../interface";
import {
  TReportDataResponse,
  TReportFilterPayload,
  TReportKPIs,
  TReportRow,
  TStaffPerformanceFilterPayload,
  TStaffPerformanceKPIs,
  TStaffPerformanceResponse,
  TStaffPerformanceRow,
  TStaffTimelineItem,
  TStaffTimelineResponse,
} from "./report.interface";

const generateReport = async (
  payload: TReportFilterPayload,
  actor: TAuthUser,
): Promise<TReportDataResponse> => {
  const {
    searchTerm,
    category,
    currency,
    startDate,
    endDate,
    sortBy = "paymentDate",
    sortOrder = "desc",
    page = 1,
    limit = 10,
  } = payload;

  // Build where filter strictly for VERIFIED collections (pure AdSkill income)
  const where: Prisma.PaymentWhereInput = {
    isDeleted: false,
    status: { in: ["VERIFIED", "COMPLETED", "PAID"] },
  };

  // Filter by currency if provided
  if (currency && currency.trim() && currency !== "ALL") {
    where.currency = currency.trim().toUpperCase();
  }

  // Filter by service program category
  if (category && category !== "ALL") {
    where.case = {
      isDeleted: false,
      OR: [
        { serviceCategorySnapshot: category },
        { service: { category } },
      ],
    };
  }

  // Filter by payment collection date (that day the money was collected)
  if (startDate || endDate) {
    const dateFilter: Prisma.DateTimeFilter = {};
    if (startDate) {
      dateFilter.gte = new Date(`${startDate}T00:00:00.000Z`);
    }
    if (endDate) {
      dateFilter.lte = new Date(`${endDate}T23:59:59.999Z`);
    }
    where.paymentDate = dateFilter;
  }

  // Filter by search term
  if (searchTerm && searchTerm.trim()) {
    const term = searchTerm.trim();
    where.OR = [
      { externalReference: { contains: term, mode: "insensitive" } },
      {
        case: {
          OR: [
            { caseCode: { contains: term, mode: "insensitive" } },
            { serviceNameSnapshot: { contains: term, mode: "insensitive" } },
            { serviceCodeSnapshot: { contains: term, mode: "insensitive" } },
            {
              service: {
                OR: [
                  { name: { contains: term, mode: "insensitive" } },
                  { code: { contains: term, mode: "insensitive" } },
                ],
              },
            },
            {
              user: {
                OR: [
                  { name: { contains: term, mode: "insensitive" } },
                  { clientId: { contains: term, mode: "insensitive" } },
                  { email: { contains: term, mode: "insensitive" } },
                ],
              },
            },
          ],
        },
      },
    ];
  }

  // 1. Calculate Executive KPIs across verified income and contracted fees using exact Prisma.Decimal
  const [allVerifiedPaymentsAggregate, allActivePlansAggregate] = await Promise.all([
    prisma.payment.aggregate({
      where: {
        isDeleted: false,
        status: { in: ["VERIFIED", "COMPLETED", "PAID"] },
        ...(currency && currency !== "ALL" ? { currency: currency.trim().toUpperCase() } : {}),
      },
      _sum: { amount: true },
      _count: { _all: true },
    }),
    prisma.paymentPlan.aggregate({
      where: {
        isDeleted: false,
        isActive: true,
        ...(currency && currency !== "ALL" ? { currency: currency.trim().toUpperCase() } : {}),
      },
      _sum: { contractedFee: true },
    }),
  ]);

  const totalVerifiedIncomeDec = allVerifiedPaymentsAggregate._sum.amount ?? new Prisma.Decimal(0);
  const totalContractedFeesDec = allActivePlansAggregate._sum.contractedFee ?? new Prisma.Decimal(0);
  const totalOutstandingReceivablesDec = totalContractedFeesDec.gt(totalVerifiedIncomeDec)
    ? totalContractedFeesDec.minus(totalVerifiedIncomeDec)
    : new Prisma.Decimal(0);

  const kpis: TReportKPIs = {
    totalVerifiedIncome: totalVerifiedIncomeDec.toNumber(),
    totalContractedFees: totalContractedFeesDec.toNumber(),
    totalOutstandingReceivables: totalOutstandingReceivablesDec.toNumber(),
    verifiedCollectionsCount: allVerifiedPaymentsAggregate._count._all,
  };

  // 2. Fetch total count of verified payments matching the filters
  const totalMatchingPayments = await prisma.payment.count({ where });

  // 3. Query matching verified payments with their case, service, and user
  const rawPayments = await prisma.payment.findMany({
    where,
    orderBy: { paymentDate: sortOrder },
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
              category: true,
              baseFee: true,
              currency: true,
            },
          },
          paymentPlans: {
            where: { isDeleted: false },
            select: { contractedFee: true, currency: true, isActive: true },
          },
        },
      },
    },
  });

  // Map into verified income report rows (program, client, collection date, contract fee, verified collected money)
  const mappedRows: TReportRow[] = rawPayments.map((p) => {
    const c = p.case;
    const activePlan = c.paymentPlans.find((plan) => plan.isActive) || c.paymentPlans[0];

    // Contract fee: strictly AdSkill professional fee (revenue income, NO 3rd party or govt fee)
    const contractedFee = activePlan
      ? Number(activePlan.contractedFee || 0)
      : Number(c.service?.baseFee || 0);

    const verifiedAmount = Number(p.amount || 0);

    return {
      id: p.id,
      caseCode: c.caseCode,
      clientId: c.user?.clientId || "ASK-CLIENT",
      clientName: c.user?.name || "Client Account",
      programName: c.serviceNameSnapshot || c.service?.name || "Consulting Program",
      programCode: c.serviceCodeSnapshot || c.service?.code || "SRV",
      programCategory: c.serviceCategorySnapshot || c.service?.category || "IMMIGRATION",
      collectionDate: p.paymentDate.toISOString(),
      contractedFee,
      verifiedAmount,
      currency: p.currency || activePlan?.currency || "USD",
      paymentMethod: p.paymentMethod || "DIRECT_DEPOSIT",
      externalReference: p.externalReference || null,
      status: "VERIFIED",
    };
  });

  // Handle in-memory sorting for non-Prisma computed fields
  if (sortBy === "verifiedAmount") {
    mappedRows.sort((a, b) =>
      sortOrder === "asc"
        ? a.verifiedAmount - b.verifiedAmount
        : b.verifiedAmount - a.verifiedAmount,
    );
  } else if (sortBy === "contractedFee") {
    mappedRows.sort((a, b) =>
      sortOrder === "asc"
        ? a.contractedFee - b.contractedFee
        : b.contractedFee - a.contractedFee,
    );
  } else if (sortBy === "clientName") {
    mappedRows.sort((a, b) =>
      sortOrder === "asc"
        ? a.clientName.localeCompare(b.clientName)
        : b.clientName.localeCompare(a.clientName),
    );
  } else if (sortBy === "programName") {
    mappedRows.sort((a, b) =>
      sortOrder === "asc"
        ? a.programName.localeCompare(b.programName)
        : b.programName.localeCompare(a.programName),
    );
  }

  // Pagination slice
  const startIndex = (page - 1) * limit;
  const paginatedItems = mappedRows.slice(startIndex, startIndex + limit);

  // Record Audit Log for Super Admin report access
  try {
    await prisma.auditLog.create({
      data: {
        actorId: actor.id,
        actorEmail: actor.email,
        action: "GENERATE_EXECUTIVE_REPORT",
        targetEntity: "REPORT",
        targetId: "VERIFIED_INCOME_COLLECTIONS",
        reason: `Super Admin accessed verified collections report: category=${category || "ALL"}, term=${searchTerm || "NONE"}`,
      },
    });
  } catch {
    // Non-blocking audit log
  }

  return {
    kpis,
    items: paginatedItems,
    meta: {
      page,
      limit,
      total: totalMatchingPayments,
      totalPage: Math.max(1, Math.ceil(totalMatchingPayments / limit)),
    },
  };
};

// ==================== STAFF PERFORMANCE & OPERATIONS MATRIX ====================

const getStaffPerformanceReport = async (
  payload: TStaffPerformanceFilterPayload,
  actor: TAuthUser,
): Promise<TStaffPerformanceResponse> => {
  const now = new Date();
  const todayStr = now.toISOString().split("T")[0];
  const effectiveStartDate =
    payload.startDate && payload.startDate.trim() ? payload.startDate.trim() : todayStr;
  const effectiveEndDate =
    payload.endDate && payload.endDate.trim() ? payload.endDate.trim() : effectiveStartDate;

  // 12-hour buffer ensures activities logged in any local timezone (UTC-12 to UTC+14) are included
  const startUtc = new Date(
    new Date(`${effectiveStartDate}T00:00:00.000Z`).getTime() -
      12 * 60 * 60 * 1000,
  );
  const endUtc = new Date(
    new Date(`${effectiveEndDate}T23:59:59.999Z`).getTime() +
      12 * 60 * 60 * 1000,
  );
  const dateRange = { gte: startUtc, lte: endUtc };

  // Enforce self-view if caller is not Super Admin or Manager
  const isSuperAdminOrManager =
    actor.role === "SUPER_ADMIN" ||
    actor.role === "MANAGER" ||
    (actor.permissions && actor.permissions.includes("report:view"));

  const effectiveStaffId =
    actor.role !== "SUPER_ADMIN" && actor.role !== "MANAGER"
      ? actor.id
      : payload.staffId && payload.staffId.trim()
        ? payload.staffId.trim()
        : undefined;

  const staffWhere: Prisma.UserWhereInput = {
    isDeleted: false,
    status: "ACTIVE",
    role: {
      name: { not: "CLIENT" },
    },
  };

  if (effectiveStaffId) {
    staffWhere.id = effectiveStaffId;
  }

  if (payload.roleId && payload.roleId.trim()) {
    staffWhere.roleId = payload.roleId.trim();
  }

  if (payload.searchTerm && payload.searchTerm.trim()) {
    const term = payload.searchTerm.trim();
    staffWhere.OR = [
      { name: { contains: term, mode: "insensitive" } },
      { email: { contains: term, mode: "insensitive" } },
      { phone: { contains: term, mode: "insensitive" } },
    ];
  }

  const staffMembers = await prisma.user.findMany({
    where: staffWhere,
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      status: true,
      role: {
        select: {
          id: true,
          name: true,
        },
      },
    },
    orderBy: { name: "asc" },
  });

  // High-performance parallel aggregations
  const [
    leadsCreatedAgg,
    leadsAssignedAgg,
    leadActivitiesAgg,
    caseNotesAgg,
    casesAssignedAgg,
    clientAuditLogsAgg,
    paymentsVerifiedAgg,
    expensesLoggedAgg,
    supportMessagesAgg,
    supportTicketsAgg,
  ] = await Promise.all([
    prisma.lead.groupBy({
      by: ["createdById"],
      where: {
        isDeleted: false,
        createdAt: dateRange,
        createdById: { not: null },
      },
      _count: true,
    }),
    prisma.lead.groupBy({
      by: ["assignedToId"],
      where: {
        isDeleted: false,
        assignedToId: { not: null },
      },
      _count: true,
    }),
    prisma.leadActivity.groupBy({
      by: ["performedById", "activityType"],
      where: {
        createdAt: dateRange,
        performedById: { not: null },
      },
      _count: true,
    }),
    prisma.caseNote.groupBy({
      by: ["authorId"],
      where: {
        isDeleted: false,
        createdAt: dateRange,
      },
      _count: true,
    }),
    prisma.clientCase.groupBy({
      by: ["assignedConsultantId"],
      where: {
        isDeleted: false,
        assignedConsultantId: { not: null },
      },
      _count: true,
    }),
    prisma.auditLog.groupBy({
      by: ["actorId"],
      where: {
        createdAt: dateRange,
        actorId: { not: null },
        targetEntity: { in: ["CLIENT_CASE", "USER"] },
      },
      _count: true,
    }),
    prisma.payment.groupBy({
      by: ["verifiedById", "paymentMethod"],
      where: {
        isDeleted: false,
        status: { in: ["VERIFIED", "COMPLETED", "PAID"] },
        paymentDate: dateRange,
        verifiedById: { not: null },
      },
      _sum: { amount: true },
      _count: true,
    }),
    prisma.officeExpense.groupBy({
      by: ["createdById", "type"],
      where: {
        isDeleted: false,
        transactionDate: dateRange,
      },
      _sum: { amount: true },
      _count: true,
    }),
    prisma.supportMessage.groupBy({
      by: ["senderId"],
      where: {
        createdAt: dateRange,
        isStaffReply: true,
      },
      _count: true,
    }),
    prisma.supportTicket.groupBy({
      by: ["assignedStaffId"],
      where: {
        isDeleted: false,
        assignedStaffId: { not: null },
      },
      _count: true,
    }),
  ]);

  // Aggregate mappings
  const leadsCreatedMap = new Map<string, number>();
  leadsCreatedAgg.forEach((item) => {
    if (item.createdById) leadsCreatedMap.set(item.createdById, item._count);
  });

  const leadsAssignedMap = new Map<string, number>();
  leadsAssignedAgg.forEach((item) => {
    if (item.assignedToId) leadsAssignedMap.set(item.assignedToId, item._count);
  });

  const leadActivitiesMap = new Map<
    string,
    { total: number; calls: number; notes: number }
  >();
  leadActivitiesAgg.forEach((item) => {
    if (!item.performedById) return;
    const curr = leadActivitiesMap.get(item.performedById) || {
      total: 0,
      calls: 0,
      notes: 0,
    };
    curr.total += item._count;
    if (item.activityType === "CALL") curr.calls += item._count;
    if (item.activityType === "NOTE") curr.notes += item._count;
    leadActivitiesMap.set(item.performedById, curr);
  });

  const caseNotesMap = new Map<string, number>();
  caseNotesAgg.forEach((item) => {
    caseNotesMap.set(item.authorId, item._count);
  });

  const casesAssignedMap = new Map<string, number>();
  casesAssignedAgg.forEach((item) => {
    if (item.assignedConsultantId)
      casesAssignedMap.set(item.assignedConsultantId, item._count);
  });

  const auditUpdatesMap = new Map<string, number>();
  clientAuditLogsAgg.forEach((item) => {
    if (item.actorId) auditUpdatesMap.set(item.actorId, item._count);
  });

  const paymentsMap = new Map<
    string,
    { count: number; totalAmount: number; onlineAmount: number; manualAmount: number }
  >();
  paymentsVerifiedAgg.forEach((item) => {
    if (!item.verifiedById) return;
    const curr = paymentsMap.get(item.verifiedById) || {
      count: 0,
      totalAmount: 0,
      onlineAmount: 0,
      manualAmount: 0,
    };
    const amt = item._sum.amount ? Number(item._sum.amount) : 0;
    curr.count += item._count;
    curr.totalAmount += amt;
    const isOnline = item.paymentMethod?.toUpperCase() === "STRIPE";
    if (isOnline) {
      curr.onlineAmount += amt;
    } else {
      curr.manualAmount += amt;
    }
    paymentsMap.set(item.verifiedById, curr);
  });

  const expensesMap = new Map<
    string,
    { count: number; expenseAmount: number; incomeAmount: number }
  >();
  expensesLoggedAgg.forEach((item) => {
    const curr = expensesMap.get(item.createdById) || {
      count: 0,
      expenseAmount: 0,
      incomeAmount: 0,
    };
    const amt = item._sum.amount ? Number(item._sum.amount) : 0;
    if (item.type === "EXPENSE") {
      curr.count += item._count;
      curr.expenseAmount += amt;
    } else if (item.type === "INCOME") {
      curr.incomeAmount += amt;
    }
    expensesMap.set(item.createdById, curr);
  });

  const supportMessagesMap = new Map<string, number>();
  supportMessagesAgg.forEach((item) => {
    supportMessagesMap.set(item.senderId, item._count);
  });

  const supportTicketsMap = new Map<string, number>();
  supportTicketsAgg.forEach((item) => {
    if (item.assignedStaffId)
      supportTicketsMap.set(item.assignedStaffId, item._count);
  });

  let totalStaffCount = staffMembers.length;
  let totalLeadsCreated = 0;
  let totalLeadsAssigned = 0;
  let totalActivitiesLogged = 0;
  let totalCaseNotesLogged = 0;
  let totalVerifiedAmount = 0;
  let totalOnlineStripeAmount = 0;
  let totalManualAmount = 0;
  let totalExpensesLogged = 0;
  let totalSupportMessages = 0;
  let totalSupportTicketsHandled = 0;

  const rows: TStaffPerformanceRow[] = staffMembers.map((staff) => {
    const lCreated = leadsCreatedMap.get(staff.id) || 0;
    const lAssigned = leadsAssignedMap.get(staff.id) || 0;
    const act = leadActivitiesMap.get(staff.id) || {
      total: 0,
      calls: 0,
      notes: 0,
    };
    const cNotes = caseNotesMap.get(staff.id) || 0;
    const cAssigned = casesAssignedMap.get(staff.id) || 0;
    const cAudit = auditUpdatesMap.get(staff.id) || 0;
    const pay = paymentsMap.get(staff.id) || {
      count: 0,
      totalAmount: 0,
      onlineAmount: 0,
      manualAmount: 0,
    };
    const exp = expensesMap.get(staff.id) || {
      count: 0,
      expenseAmount: 0,
      incomeAmount: 0,
    };
    const sMsgs = supportMessagesMap.get(staff.id) || 0;
    const sTkts = supportTicketsMap.get(staff.id) || 0;

    totalLeadsCreated += lCreated;
    totalLeadsAssigned += lAssigned;
    totalActivitiesLogged += act.total;
    totalCaseNotesLogged += cNotes;
    totalVerifiedAmount += pay.totalAmount;
    totalOnlineStripeAmount += pay.onlineAmount;
    totalManualAmount += pay.manualAmount;
    totalExpensesLogged += exp.expenseAmount;
    totalSupportMessages += sMsgs;
    totalSupportTicketsHandled += sTkts;

    return {
      staffId: staff.id,
      name: staff.name,
      email: staff.email,
      phone: staff.phone,
      roleName: staff.role?.name || "STAFF",
      status: staff.status,
      leadsCreated: lCreated,
      leadsAssigned: lAssigned,
      leadActivitiesCount: act.total,
      leadCallsCount: act.calls,
      leadNotesCount: act.notes,
      caseNotesCount: cNotes,
      casesAssigned: cAssigned,
      clientAuditUpdates: cAudit,
      verifiedPaymentsCount: pay.count,
      verifiedAmount: Number(pay.totalAmount.toFixed(2)),
      onlineStripeAmount: Number(pay.onlineAmount.toFixed(2)),
      manualPaymentAmount: Number(pay.manualAmount.toFixed(2)),
      expensesLoggedCount: exp.count,
      expensesLoggedAmount: Number(exp.expenseAmount.toFixed(2)),
      supportMessagesSent: sMsgs,
      supportTicketsHandled: sTkts,
    };
  });

  const {
    sortBy = "verifiedAmount",
    sortOrder = "desc",
    page = 1,
    limit = 10,
  } = payload;

  rows.sort((a, b) => {
    let comparison = 0;
    switch (sortBy) {
      case "name":
        comparison = a.name.localeCompare(b.name);
        break;
      case "verifiedAmount":
        comparison = a.verifiedAmount - b.verifiedAmount;
        break;
      case "leadsCreated":
        comparison = a.leadsCreated - b.leadsCreated;
        break;
      case "leadsAssigned":
        comparison = a.leadsAssigned - b.leadsAssigned;
        break;
      case "activitiesCount":
        comparison = a.leadActivitiesCount - b.leadActivitiesCount;
        break;
      case "expensesLogged":
        comparison = a.expensesLoggedAmount - b.expensesLoggedAmount;
        break;
      default:
        comparison = b.verifiedAmount - a.verifiedAmount;
    }
    return sortOrder === "asc" ? comparison : -comparison;
  });

  const total = rows.length;
  const startIndex = (page - 1) * limit;
  const paginatedRows = rows.slice(startIndex, startIndex + limit);

  const kpis: TStaffPerformanceKPIs = {
    totalStaffCount,
    totalLeadsCreated,
    totalLeadsAssigned,
    totalActivitiesLogged,
    totalCaseNotesLogged,
    totalVerifiedAmount: Number(totalVerifiedAmount.toFixed(2)),
    totalOnlineStripeAmount: Number(totalOnlineStripeAmount.toFixed(2)),
    totalManualAmount: Number(totalManualAmount.toFixed(2)),
    totalExpensesLogged: Number(totalExpensesLogged.toFixed(2)),
    netOperationalRevenue: Number(
      (totalVerifiedAmount - totalExpensesLogged).toFixed(2),
    ),
    totalSupportMessages,
    totalSupportTicketsHandled,
  };

  return {
    kpis,
    items: paginatedRows,
    meta: {
      page,
      limit,
      total,
      totalPage: Math.max(1, Math.ceil(total / limit)),
    },
  };
};

const getStaffPerformanceTimeline = async (
  staffId: string,
  startDate?: string,
  endDate?: string,
  actor?: TAuthUser,
): Promise<TStaffTimelineResponse> => {
  const staff = await prisma.user.findUnique({
    where: { id: staffId },
    select: {
      id: true,
      name: true,
      email: true,
      role: { select: { name: true } },
    },
  });

  if (!staff) {
    throw new Error("Staff member not found");
  }

  const now = new Date();
  const todayStr = now.toISOString().split("T")[0];
  const effectiveStartDate = startDate && startDate.trim() ? startDate.trim() : todayStr;
  const effectiveEndDate = endDate && endDate.trim() ? endDate.trim() : effectiveStartDate;

  const startUtc = new Date(
    new Date(`${effectiveStartDate}T00:00:00.000Z`).getTime() -
      12 * 60 * 60 * 1000,
  );
  const endUtc = new Date(
    new Date(`${effectiveEndDate}T23:59:59.999Z`).getTime() +
      12 * 60 * 60 * 1000,
  );
  const dateRange = { gte: startUtc, lte: endUtc };

  const [
    payments,
    createdLeads,
    activities,
    caseNotes,
    expenses,
    supportMessages,
  ] = await Promise.all([
    prisma.payment.findMany({
      where: {
        verifiedById: staffId,
        isDeleted: false,
        status: { in: ["VERIFIED", "COMPLETED", "PAID"] },
        paymentDate: dateRange,
      },
      include: {
        case: {
          select: {
            caseCode: true,
            user: { select: { name: true } },
          },
        },
      },
      take: 20,
      orderBy: { paymentDate: "desc" },
    }),
    prisma.lead.findMany({
      where: {
        createdById: staffId,
        isDeleted: false,
        createdAt: dateRange,
      },
      take: 20,
      orderBy: { createdAt: "desc" },
    }),
    prisma.leadActivity.findMany({
      where: {
        performedById: staffId,
        createdAt: dateRange,
      },
      include: {
        lead: { select: { fullName: true } },
      },
      take: 20,
      orderBy: { createdAt: "desc" },
    }),
    prisma.caseNote.findMany({
      where: {
        authorId: staffId,
        isDeleted: false,
        createdAt: dateRange,
      },
      include: {
        case: {
          select: {
            caseCode: true,
            user: { select: { name: true } },
          },
        },
      },
      take: 20,
      orderBy: { createdAt: "desc" },
    }),
    prisma.officeExpense.findMany({
      where: {
        createdById: staffId,
        isDeleted: false,
        transactionDate: dateRange,
      },
      take: 20,
      orderBy: { transactionDate: "desc" },
    }),
    prisma.supportMessage.findMany({
      where: {
        senderId: staffId,
        isStaffReply: true,
        createdAt: dateRange,
      },
      include: {
        ticket: { select: { ticketCode: true, subject: true } },
      },
      take: 20,
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const timelineItems: TStaffTimelineItem[] = [];

  payments.forEach((p) => {
    const isOnline = p.paymentMethod?.toUpperCase() === "STRIPE";
    timelineItems.push({
      id: p.id,
      type: "PAYMENT_VERIFIED",
      title: `Verified Payment: ${p.currency} ${Number(p.amount).toLocaleString()}`,
      subtitle: `Client: ${p.case?.user?.name || "Client"} (${p.case?.caseCode || "Case"}) • ${isOnline ? "Stripe Online" : p.paymentMethod}`,
      timestamp: p.paymentDate.toISOString(),
      amount: Number(p.amount),
      currency: p.currency,
      badge: isOnline ? "ONLINE_STRIPE" : "DIRECT_PAYMENT",
    });
  });

  createdLeads.forEach((l) => {
    timelineItems.push({
      id: l.id,
      type: "LEAD_CREATED",
      title: `Created Lead: ${l.fullName}`,
      subtitle: `Phone: ${l.phone} • Status: ${l.status}`,
      timestamp: l.createdAt.toISOString(),
      badge: l.status,
    });
  });

  activities.forEach((a) => {
    timelineItems.push({
      id: a.id,
      type: "LEAD_ACTIVITY",
      title: `Lead Activity: ${a.activityType}`,
      subtitle: `Lead: ${a.lead?.fullName || "Lead"} • ${a.notes || "No notes"}`,
      timestamp: a.createdAt.toISOString(),
      badge: a.activityType,
    });
  });

  caseNotes.forEach((cn) => {
    timelineItems.push({
      id: cn.id,
      type: "CASE_NOTE",
      title: `Added Case Note`,
      subtitle: `Case: ${cn.case?.caseCode || "Case"} (${cn.case?.user?.name || "Client"})`,
      timestamp: cn.createdAt.toISOString(),
      badge: "CASE_NOTE",
    });
  });

  expenses.forEach((e) => {
    timelineItems.push({
      id: e.id,
      type: "EXPENSE_LOGGED",
      title: `Logged ${e.type}: ${e.currency} ${Number(e.amount).toLocaleString()}`,
      subtitle: `${e.category}${e.otherCategory ? ` - ${e.otherCategory}` : ""}: ${e.description || "No description"}`,
      timestamp: e.transactionDate.toISOString(),
      amount: Number(e.amount),
      currency: e.currency,
      badge: e.type,
    });
  });

  supportMessages.forEach((sm) => {
    timelineItems.push({
      id: sm.id,
      type: "SUPPORT_MESSAGE",
      title: `Replied to Ticket ${sm.ticket?.ticketCode || ""}`,
      subtitle: `${sm.ticket?.subject || "Subject"}: "${sm.message.slice(0, 60)}${sm.message.length > 60 ? "..." : ""}"`,
      timestamp: sm.createdAt.toISOString(),
      badge: "SUPPORT_REPLY",
    });
  });

  timelineItems.sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
  );

  const totalVerifiedAmount = payments.reduce(
    (sum, p) => sum + Number(p.amount),
    0,
  );
  const totalExpensesAmount = expenses
    .filter((e) => e.type === "EXPENSE")
    .reduce((sum, e) => sum + Number(e.amount), 0);

  return {
    staff: {
      id: staff.id,
      name: staff.name,
      email: staff.email,
      roleName: staff.role?.name || "STAFF",
    },
    dateRange: {
      startDate: effectiveStartDate,
      endDate: effectiveEndDate,
    },
    summary: {
      leadsCreated: createdLeads.length,
      activitiesCount: activities.length,
      verifiedAmount: Number(totalVerifiedAmount.toFixed(2)),
      expensesAmount: Number(totalExpensesAmount.toFixed(2)),
      supportMessages: supportMessages.length,
    },
    timeline: timelineItems,
  };
};

export const ReportService = {
  generateReport,
  getStaffPerformanceReport,
  getStaffPerformanceTimeline,
};

