import { Prisma } from "@prisma/client";
import prisma from "../../lib/prisma";
import { TAuthUser } from "../../interface";
import {
  TReportDataResponse,
  TReportFilterPayload,
  TReportKPIs,
  TReportRow,
} from "./report.interface";

const generateReport = async (
  payload: TReportFilterPayload,
  actor: TAuthUser,
): Promise<TReportDataResponse> => {
  const {
    searchTerm,
    category,
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

  // 1. Calculate Executive KPIs across all verified income and contracted fees
  const [allVerifiedPayments, allActivePlans] = await Promise.all([
    prisma.payment.findMany({
      where: {
        isDeleted: false,
        status: { in: ["VERIFIED", "COMPLETED", "PAID"] },
      },
      select: { amount: true },
    }),
    prisma.paymentPlan.findMany({
      where: { isDeleted: false, isActive: true },
      select: { contractedFee: true },
    }),
  ]);

  const totalVerifiedIncome = allVerifiedPayments.reduce(
    (sum, p) => sum + Number(p.amount || 0),
    0,
  );
  const totalContractedFees = allActivePlans.reduce(
    (sum, plan) => sum + Number(plan.contractedFee || 0),
    0,
  );
  const totalOutstandingReceivables = Math.max(
    0,
    totalContractedFees - totalVerifiedIncome,
  );

  const kpis: TReportKPIs = {
    totalVerifiedIncome,
    totalContractedFees,
    totalOutstandingReceivables,
    verifiedCollectionsCount: allVerifiedPayments.length,
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

export const ReportService = {
  generateReport,
};
