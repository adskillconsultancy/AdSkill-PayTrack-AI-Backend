import { Prisma } from "@prisma/client";
import prisma from "../../lib/prisma";
import {
  buildDateRangeFilter,
  buildSearchFilter,
  buildSortOrder,
} from "../../shared/filterHelper";
import {
  buildPaginationMeta,
  calculatePagination,
  IPaginationOptions,
} from "../../shared/paginationHelper";

// ─── Write ───────────────────────────────────────────────────────────────────

export type TAuditInput = {
  actorId?: string;
  actorEmail?: string;
  action: string;
  targetEntity: string;
  targetId: string;
  beforeValue?: Prisma.InputJsonValue;
  afterValue?: Prisma.InputJsonValue;
  reason?: string;
  ipAddress?: string;
  userAgent?: string;
};

const writeAuditLog = async (input: TAuditInput) => {
  try {
    let email = input.actorEmail;
    if (!email && input.actorId) {
      const u = await prisma.user.findUnique({
        where: { id: input.actorId },
        select: { email: true },
      });
      if (u) email = u.email;
    }
    return await prisma.auditLog.create({
      data: {
        ...input,
        actorEmail: email,
      },
    });
  } catch (err) {
    console.error("[AuditService] Failed to record audit log:", err);
  }
};


// ─── Searchable / Sortable Fields ────────────────────────────────────────────

const AUDIT_SEARCHABLE_FIELDS = ["actorEmail", "action", "targetEntity", "targetId", "reason"];
const AUDIT_SORTABLE_FIELDS = ["createdAt", "action", "targetEntity", "actorEmail"];

// ─── Query Filters ────────────────────────────────────────────────────────────

export interface IAuditLogFilters {
  searchTerm?: string;
  actorId?: string;
  actorEmail?: string;
  action?: string;
  targetEntity?: string;
  targetId?: string;
  startDate?: string;
  endDate?: string;
  sortBy?: string;
  sortOrder?: string;
}

const getAuditLogs = async (
  filters: IAuditLogFilters,
  pagination: IPaginationOptions
) => {
  const { page, limit, skip } = calculatePagination(pagination);

  const andConditions: Prisma.AuditLogWhereInput[] = [];

  // Search across multiple text fields
  const searchFilter = buildSearchFilter(filters.searchTerm, AUDIT_SEARCHABLE_FIELDS);
  if (searchFilter) {
    andConditions.push(searchFilter as Prisma.AuditLogWhereInput);
  }

  // Exact match filters
  if (filters.actorId) {
    andConditions.push({ actorId: filters.actorId });
  }
  if (filters.actorEmail) {
    andConditions.push({
      actorEmail: { contains: filters.actorEmail, mode: "insensitive" },
    });
  }
  if (filters.action) {
    andConditions.push({
      action: { contains: filters.action, mode: "insensitive" },
    });
  }
  if (filters.targetEntity) {
    andConditions.push({
      targetEntity: { contains: filters.targetEntity, mode: "insensitive" },
    });
  }
  if (filters.targetId) {
    andConditions.push({ targetId: filters.targetId });
  }

  // Date range
  const dateFilter = buildDateRangeFilter("createdAt", filters.startDate, filters.endDate);
  if (dateFilter) {
    andConditions.push(dateFilter as Prisma.AuditLogWhereInput);
  }

  const where: Prisma.AuditLogWhereInput =
    andConditions.length > 0 ? { AND: andConditions } : {};

  const orderBy = buildSortOrder(
    { sortBy: filters.sortBy, sortOrder: filters.sortOrder },
    AUDIT_SORTABLE_FIELDS,
    "createdAt",
    "desc"
  );

  const [total, logs] = await Promise.all([
    prisma.auditLog.count({ where }),
    prisma.auditLog.findMany({
      where,
      orderBy,
      skip,
      take: limit,
      include: {
        actor: {
          select: {
            id: true,
            name: true,
            email: true,
            role: { select: { name: true } },
          },
        },
      },
    }),
  ]);

  return {
    data: logs,
    meta: buildPaginationMeta(page, limit, total),
  };
};

const getAuditLogById = async (id: string) => {
  const log = await prisma.auditLog.findUnique({
    where: { id },
    include: {
      actor: {
        select: {
          id: true,
          name: true,
          email: true,
          role: { select: { name: true } },
        },
      },
    },
  });
  return log;
};

export const AuditService = { writeAuditLog, getAuditLogs, getAuditLogById };
