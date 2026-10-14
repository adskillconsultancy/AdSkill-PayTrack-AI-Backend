import { LeadActivityType, LeadStatus, Prisma } from "@prisma/client";
import httpStatus from "http-status";
import AppError from "../../errors/AppError";
import prisma from "../../lib/prisma";
import {
  buildDateRangeFilter,
  buildSearchFilter,
  buildSortOrder,
  ISortOptions,
} from "../../shared/filterHelper";
import {
  buildPaginationMeta,
  calculatePagination,
  IPaginationOptions,
} from "../../shared/paginationHelper";
import { leadSearchableFields, leadSortableFields } from "./lead.constant";
import {
  TCreateLeadActivityPayload,
  TCreateLeadPayload,
  TLeadFilterRequest,
  TUpdateLeadPayload,
} from "./lead.interface";

// Standard projection for leads
const leadSelect = {
  id: true,
  fullName: true,
  phone: true,
  email: true,
  address: true,
  country: true,
  referralName: true,
  status: true,
  serviceId: true,
  service: {
    select: {
      id: true,
      name: true,
      code: true,
      category: true,
      baseFee: true,
    },
  },
  assignedToId: true,
  assignedTo: {
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      role: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  },
  createdById: true,
  createdBy: {
    select: {
      id: true,
      name: true,
      email: true,
    },
  },
  createdByName: true,
  isDeleted: true,
  deletedAt: true,
  createdAt: true,
  updatedAt: true,
  _count: {
    select: {
      activities: true,
    },
  },
};

// 1. Create Lead
const createLead = async (
  payload: TCreateLeadPayload,
  user?: { id: string; name: string; email: string },
) => {
  const {
    fullName,
    phone,
    email,
    address,
    country,
    serviceId,
    referralName,
    status = LeadStatus.NEW,
    assignedToId,
    createdByName,
  } = payload;

  // Validate service if provided
  if (serviceId) {
    const serviceExists = await prisma.service.findUnique({
      where: { id: serviceId, isDeleted: false },
    });
    if (!serviceExists) {
      throw new AppError(httpStatus.NOT_FOUND, "Selected service offering not found");
    }
  }

  // Validate assigned staff if provided
  let assignedStaffName = "";
  if (assignedToId) {
    const staffExists = await prisma.user.findUnique({
      where: { id: assignedToId, isDeleted: false },
      include: { role: true },
    });
    if (!staffExists) {
      throw new AppError(httpStatus.NOT_FOUND, "Assigned staff member not found");
    }
    assignedStaffName = staffExists.name;
  }

  const creatorName =
    user?.name || createdByName || "Online Form";
  const creatorId = user?.id || null;

  const result = await prisma.$transaction(async (tx) => {
    const lead = await tx.lead.create({
      data: {
        fullName,
        phone,
        email: email || null,
        address: address || null,
        country: country || null,
        referralName: referralName || null,
        status,
        serviceId: serviceId || null,
        assignedToId: assignedToId || null,
        createdById: creatorId,
        createdByName: creatorName,
      },
      select: leadSelect,
    });

    // Record initial system activity log
    const initialNote = assignedStaffName
      ? `Lead created by ${creatorName} and assigned to ${assignedStaffName}.`
      : `Lead created by ${creatorName}.`;

    await tx.leadActivity.create({
      data: {
        leadId: lead.id,
        activityType: LeadActivityType.NOTE,
        notes: initialNote,
        performedById: creatorId,
        performedByName: creatorName,
      },
    });

    return lead;
  });

  return result;
};

// 2. Get All Leads with Filtering, Search, & Pagination
const getAllLeads = async (
  filters: TLeadFilterRequest,
  paginationOptions: IPaginationOptions,
  sortOptions: ISortOptions,
) => {
  const { searchTerm, status, serviceId, assignedToId, country, startDate, endDate } =
    filters;
  const { page, limit, skip } = calculatePagination(paginationOptions);

  const andConditions: Prisma.LeadWhereInput[] = [{ isDeleted: false }];

  // Search filter
  if (searchTerm) {
    const searchCondition = buildSearchFilter(searchTerm, leadSearchableFields);
    if (searchCondition) {
      andConditions.push(searchCondition as Prisma.LeadWhereInput);
    }
  }

  // Exact filters
  if (status) {
    andConditions.push({ status });
  }

  if (serviceId) {
    andConditions.push({ serviceId });
  }

  if (assignedToId) {
    if (assignedToId === "UNASSIGNED") {
      andConditions.push({ assignedToId: null });
    } else {
      andConditions.push({ assignedToId });
    }
  }

  if (country) {
    andConditions.push({ country: { contains: country, mode: "insensitive" } });
  }

  // Date range
  const dateFilter = buildDateRangeFilter(startDate, endDate, "createdAt");
  if (dateFilter) {
    andConditions.push(dateFilter as Prisma.LeadWhereInput);
  }

  const whereConditions: Prisma.LeadWhereInput = { AND: andConditions };
  const orderBy = buildSortOrder(sortOptions, leadSortableFields);

  const [data, total] = await Promise.all([
    prisma.lead.findMany({
      where: whereConditions,
      select: {
        id: true,
        fullName: true,
        phone: true,
        email: true,
        country: true,
        status: true,
        serviceId: true,
        service: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
        assignedToId: true,
        assignedTo: {
          select: {
            id: true,
            name: true,
            email: true,
            role: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            activities: true,
          },
        },
      },
      skip,
      take: limit,
      orderBy,
    }),
    prisma.lead.count({ where: whereConditions }),
  ]);

  const meta = buildPaginationMeta(page, limit, total);

  return { meta, data };
};

// 3. Get Lead By ID with Full Timeline
const getLeadById = async (id: string) => {
  const lead = await prisma.lead.findUnique({
    where: { id, isDeleted: false },
    select: {
      ...leadSelect,
      activities: {
        orderBy: { createdAt: "desc" },
        include: {
          performedBy: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      },
    },
  });

  if (!lead) {
    throw new AppError(httpStatus.NOT_FOUND, "Lead not found");
  }

  return lead;
};

// 4. Update Lead
const updateLead = async (
  id: string,
  payload: TUpdateLeadPayload,
  user?: { id: string; name: string; email: string },
) => {
  const lead = await prisma.lead.findUnique({
    where: { id, isDeleted: false },
    include: { assignedTo: true },
  });

  if (!lead) {
    throw new AppError(httpStatus.NOT_FOUND, "Lead not found");
  }

  // Validate service if changing
  if (payload.serviceId) {
    const serviceExists = await prisma.service.findUnique({
      where: { id: payload.serviceId, isDeleted: false },
    });
    if (!serviceExists) {
      throw new AppError(httpStatus.NOT_FOUND, "Selected service offering not found");
    }
  }

  // Validate assigned staff if changing
  let newlyAssignedStaffName = "";
  if (payload.assignedToId && payload.assignedToId !== lead.assignedToId) {
    const staffExists = await prisma.user.findUnique({
      where: { id: payload.assignedToId, isDeleted: false },
    });
    if (!staffExists) {
      throw new AppError(httpStatus.NOT_FOUND, "Assigned staff member not found");
    }
    newlyAssignedStaffName = staffExists.name;
  }

  const actorName = user?.name || "Staff";
  const actorId = user?.id || null;

  const result = await prisma.$transaction(async (tx) => {
    const updated = await tx.lead.update({
      where: { id },
      data: {
        fullName: payload.fullName,
        phone: payload.phone,
        email: payload.email === "" ? null : payload.email,
        address: payload.address === "" ? null : payload.address,
        country: payload.country === "" ? null : payload.country,
        referralName: payload.referralName === "" ? null : payload.referralName,
        serviceId: payload.serviceId === "" ? null : payload.serviceId,
        assignedToId: payload.assignedToId === "" ? null : payload.assignedToId,
        status: payload.status,
      },
      select: leadSelect,
    });

    // Check if status changed
    if (payload.status && payload.status !== lead.status) {
      await tx.leadActivity.create({
        data: {
          leadId: id,
          activityType: LeadActivityType.STATUS_CHANGE,
          notes: `Status changed from ${lead.status} to ${payload.status} by ${actorName}.`,
          performedById: actorId,
          performedByName: actorName,
        },
      });
    }

    // Check if assignment changed
    if (payload.assignedToId !== undefined && payload.assignedToId !== lead.assignedToId) {
      const assignmentNote = payload.assignedToId
        ? `Lead assigned to ${newlyAssignedStaffName} by ${actorName}.`
        : `Lead unassigned by ${actorName}.`;

      await tx.leadActivity.create({
        data: {
          leadId: id,
          activityType: LeadActivityType.NOTE,
          notes: assignmentNote,
          performedById: actorId,
          performedByName: actorName,
        },
      });
    }

    return updated;
  });

  return result;
};

// 5. Add Lead Activity Log (Call, WhatsApp, Meeting, Note)
const addLeadActivity = async (
  leadId: string,
  payload: TCreateLeadActivityPayload,
  user?: { id: string; name: string; email: string },
) => {
  const lead = await prisma.lead.findUnique({
    where: { id: leadId, isDeleted: false },
  });

  if (!lead) {
    throw new AppError(httpStatus.NOT_FOUND, "Lead not found");
  }

  // Determine acting staff
  let actorId = payload.performedById || user?.id || null;
  let actorName = payload.performedByName || user?.name || "Staff";

  if (payload.performedById && !payload.performedByName) {
    const staff = await prisma.user.findUnique({
      where: { id: payload.performedById },
      select: { name: true },
    });
    if (staff) {
      actorName = staff.name;
    }
  }

  const result = await prisma.$transaction(async (tx) => {
    // 1. Create activity record
    const activity = await tx.leadActivity.create({
      data: {
        leadId,
        activityType: payload.activityType,
        callOutcome: payload.callOutcome || null,
        notes: payload.notes || null,
        nextFollowUp: payload.nextFollowUp ? new Date(payload.nextFollowUp) : null,
        performedById: actorId,
        performedByName: actorName,
      },
      include: {
        performedBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    // 2. If status was also updated in this activity, update lead status
    if (payload.statusUpdate && payload.statusUpdate !== lead.status) {
      await tx.lead.update({
        where: { id: leadId },
        data: { status: payload.statusUpdate },
      });
    }

    return activity;
  });

  return result;
};

// 6. Delete Lead (Soft Delete)
const deleteLead = async (id: string) => {
  const lead = await prisma.lead.findUnique({
    where: { id, isDeleted: false },
  });

  if (!lead) {
    throw new AppError(httpStatus.NOT_FOUND, "Lead not found");
  }

  const deleted = await prisma.lead.update({
    where: { id },
    data: {
      isDeleted: true,
      deletedAt: new Date(),
    },
  });

  return deleted;
};

// 7. Get Lead Metrics / Summary Stats
const getLeadSummaryStats = async () => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [totalLeads, newLeadsToday, followUps, convertedLeads, inProgressLeads] =
    await Promise.all([
      prisma.lead.count({ where: { isDeleted: false } }),
      prisma.lead.count({
        where: {
          isDeleted: false,
          createdAt: { gte: today },
        },
      }),
      prisma.lead.count({
        where: {
          isDeleted: false,
          status: LeadStatus.FOLLOW_UP,
        },
      }),
      prisma.lead.count({
        where: {
          isDeleted: false,
          status: LeadStatus.CONVERTED,
        },
      }),
      prisma.lead.count({
        where: {
          isDeleted: false,
          status: { in: [LeadStatus.CONTACTED, LeadStatus.IN_PROGRESS] },
        },
      }),
    ]);

  return {
    totalLeads,
    newLeadsToday,
    followUps,
    convertedLeads,
    inProgressLeads,
  };
};

export const LeadService = {
  createLead,
  getAllLeads,
  getLeadById,
  updateLead,
  addLeadActivity,
  deleteLead,
  getLeadSummaryStats,
};
