import { CallOutcome, LeadActivityType, LeadStatus, Prisma } from "@prisma/client";
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
  TCompleteFollowUpPayload,
  TCreateLeadActivityPayload,
  TCreateLeadPayload,
  TFollowUpFilterRequest,
  TLeadFilterRequest,
  TUpdateLeadPayload,
} from "./lead.interface";

// Standard projection for leads
const leadSelect = {
  id: true,
  clientCode: true,
  entryNumber: true,
  fullName: true,
  phone: true,
  email: true,
  address: true,
  country: true,
  referralName: true,
  status: true,
  leadSource: true,
  whatClientWants: true,
  resumeUrl: true,
  profileAssessment: true,
  meetingScheduled: true,
  meetingDateTime: true,
  meetingDateTimeStr: true,
  meetingLocation: true,
  priority: true,
  remarks: true,
  evaluationNotes: true,
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
  nextFollowUpDate: true,
  lastFollowUpAt: true,
  isFollowUpDone: true,
  followUpNotifiedAt: true,
  meetingNotified4dAt: true,
  meetingNotifiedDayAt: true,
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
    nextFollowUpDate,
    clientCode,
    entryNumber,
    leadSource,
    whatClientWants,
    resumeUrl,
    profileAssessment,
    meetingScheduled,
    meetingDateTime,
    meetingDateTimeStr,
    meetingLocation,
    priority = "MEDIUM",
    remarks,
    evaluationNotes,
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

  // Generate unique clientCode if not provided (AC-0001, AC-0002, etc.)
  let finalClientCode = clientCode;
  if (!finalClientCode) {
    const highestLead = await prisma.lead.findFirst({
      where: { clientCode: { startsWith: "AC-" } },
      orderBy: { clientCode: "desc" },
      select: { clientCode: true },
    });
    let nextNum = 1;
    if (highestLead?.clientCode) {
      const match = highestLead.clientCode.match(/AC-(\d+)/);
      if (match) nextNum = parseInt(match[1], 10) + 1;
    }
    finalClientCode = `AC-${String(nextNum).padStart(4, "0")}`;
  }

  // Determine initial follow-up date: default to 3 days later at 10:00 AM if not specified
  let initialFollowUpDate: Date | null = null;
  if (nextFollowUpDate) {
    initialFollowUpDate = new Date(nextFollowUpDate);
  } else {
    initialFollowUpDate = new Date();
    initialFollowUpDate.setDate(initialFollowUpDate.getDate() + 3);
    initialFollowUpDate.setHours(10, 0, 0, 0);
  }

  const result = await prisma.$transaction(async (tx) => {
    const lead = await tx.lead.create({
      data: {
        clientCode: finalClientCode,
        entryNumber: entryNumber || null,
        fullName,
        phone,
        email: email || null,
        address: address || null,
        country: country || null,
        referralName: referralName || null,
        leadSource: leadSource || null,
        whatClientWants: whatClientWants || null,
        resumeUrl: resumeUrl || null,
        profileAssessment: profileAssessment || null,
        meetingScheduled: meetingScheduled || null,
        meetingDateTime: meetingDateTime ? new Date(meetingDateTime) : null,
        meetingDateTimeStr: meetingDateTimeStr || null,
        meetingLocation: meetingLocation || null,
        priority: priority || "MEDIUM",
        remarks: remarks || null,
        evaluationNotes: evaluationNotes || null,
        status,
        serviceId: serviceId || null,
        assignedToId: assignedToId || null,
        createdById: creatorId,
        createdByName: creatorName,
        nextFollowUpDate: initialFollowUpDate,
        isFollowUpDone: false,
      },
      select: leadSelect,
    });

    // Record initial system activity log
    const initialNote = assignedStaffName
      ? `Lead [${finalClientCode}] created by ${creatorName} and assigned to ${assignedStaffName}.`
      : `Lead [${finalClientCode}] created by ${creatorName}.`;

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

  if (filters.isFollowUpDone !== undefined) {
    andConditions.push({ isFollowUpDone: filters.isFollowUpDone });
  }

  // Date range
  const dateFilter = buildDateRangeFilter("createdAt", startDate, endDate);
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
        clientCode: true,
        entryNumber: true,
        fullName: true,
        phone: true,
        email: true,
        country: true,
        status: true,
        leadSource: true,
        profileAssessment: true,
        priority: true,
        meetingScheduled: true,
        meetingDateTime: true,
        meetingDateTimeStr: true,
        resumeUrl: true,
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
        nextFollowUpDate: true,
        lastFollowUpAt: true,
        isFollowUpDone: true,
        followUpNotifiedAt: true,
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
    const leadUpdateData: Prisma.LeadUncheckedUpdateInput = {
      fullName: payload.fullName,
      phone: payload.phone,
      email: payload.email === "" ? null : payload.email,
      address: payload.address === "" ? null : payload.address,
      country: payload.country === "" ? null : payload.country,
      referralName: payload.referralName === "" ? null : payload.referralName,
      serviceId: payload.serviceId === "" ? null : payload.serviceId,
      assignedToId: payload.assignedToId === "" ? null : payload.assignedToId,
      status: payload.status,
    };

    if (payload.clientCode !== undefined) leadUpdateData.clientCode = payload.clientCode;
    if (payload.entryNumber !== undefined) leadUpdateData.entryNumber = payload.entryNumber;
    if (payload.leadSource !== undefined) leadUpdateData.leadSource = payload.leadSource;
    if (payload.whatClientWants !== undefined) leadUpdateData.whatClientWants = payload.whatClientWants;
    if (payload.resumeUrl !== undefined) leadUpdateData.resumeUrl = payload.resumeUrl;
    if (payload.profileAssessment !== undefined) leadUpdateData.profileAssessment = payload.profileAssessment;
    if (payload.meetingScheduled !== undefined) leadUpdateData.meetingScheduled = payload.meetingScheduled;
    if (payload.priority !== undefined) leadUpdateData.priority = payload.priority;
    if (payload.remarks !== undefined) leadUpdateData.remarks = payload.remarks;
    if (payload.evaluationNotes !== undefined) leadUpdateData.evaluationNotes = payload.evaluationNotes;
    if (payload.meetingDateTime !== undefined) {
      leadUpdateData.meetingDateTime = payload.meetingDateTime ? new Date(payload.meetingDateTime) : null;
      leadUpdateData.meetingNotified4dAt = null;
      leadUpdateData.meetingNotifiedDayAt = null;
    }
    if (payload.meetingDateTimeStr !== undefined) leadUpdateData.meetingDateTimeStr = payload.meetingDateTimeStr;
    if (payload.meetingLocation !== undefined) leadUpdateData.meetingLocation = payload.meetingLocation;

    if (payload.nextFollowUpDate !== undefined) {
      if (payload.nextFollowUpDate) {
        leadUpdateData.nextFollowUpDate = new Date(payload.nextFollowUpDate);
        leadUpdateData.isFollowUpDone = false;
        leadUpdateData.followUpNotifiedAt = null;
      } else {
        leadUpdateData.nextFollowUpDate = null;
      }
    } else if (payload.assignedToId && payload.assignedToId !== lead.assignedToId && !lead.nextFollowUpDate) {
      // Automatically schedule a prompt 3-day follow-up reminder if newly assigned without date
      const defaultFollowUp = new Date();
      defaultFollowUp.setDate(defaultFollowUp.getDate() + 3);
      defaultFollowUp.setHours(10, 0, 0, 0);
      leadUpdateData.nextFollowUpDate = defaultFollowUp;
      leadUpdateData.isFollowUpDone = false;
      leadUpdateData.followUpNotifiedAt = null;
    }

    if (payload.isFollowUpDone !== undefined) {
      leadUpdateData.isFollowUpDone = payload.isFollowUpDone;
      if (payload.isFollowUpDone) {
        leadUpdateData.lastFollowUpAt = new Date();
      }
    }

    const updated = await tx.lead.update({
      where: { id },
      data: leadUpdateData,
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
        isFollowUpDone: payload.isFollowUpDone || false,
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

    // 2. If status or follow-up was updated in this activity, update lead
    const leadUpdates: Prisma.LeadUpdateInput = {};
    if (payload.statusUpdate && payload.statusUpdate !== lead.status) {
      leadUpdates.status = payload.statusUpdate;
    }
    if (payload.nextFollowUp) {
      leadUpdates.nextFollowUpDate = new Date(payload.nextFollowUp);
      leadUpdates.isFollowUpDone = false;
      leadUpdates.followUpNotifiedAt = null;
    }
    if (payload.isFollowUpDone) {
      leadUpdates.isFollowUpDone = true;
      leadUpdates.lastFollowUpAt = new Date();
    }
    if (Object.keys(leadUpdates).length > 0) {
      await tx.lead.update({
        where: { id: leadId },
        data: leadUpdates,
      });
    }

    return activity;
  });

  return result;
};

// 6. Update Lead Activity Log
const updateLeadActivity = async (
  activityId: string,
  payload: { notes?: string; callOutcome?: CallOutcome; nextFollowUp?: string | null },
  user?: { id: string; name: string; email: string },
) => {
  const activity = await prisma.leadActivity.findUnique({
    where: { id: activityId },
  });

  if (!activity) {
    throw new AppError(httpStatus.NOT_FOUND, "Lead activity not found");
  }

  const updated = await prisma.leadActivity.update({
    where: { id: activityId },
    data: {
      notes: payload.notes !== undefined ? payload.notes : activity.notes,
      callOutcome: payload.callOutcome !== undefined ? payload.callOutcome : activity.callOutcome,
      nextFollowUp: payload.nextFollowUp !== undefined ? (payload.nextFollowUp ? new Date(payload.nextFollowUp) : null) : activity.nextFollowUp,
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

  return updated;
};

// 7. Delete Lead Activity Log
const deleteLeadActivity = async (
  activityId: string,
  user?: { id: string; name: string; email: string },
) => {
  const activity = await prisma.leadActivity.findUnique({
    where: { id: activityId },
  });

  if (!activity) {
    throw new AppError(httpStatus.NOT_FOUND, "Lead activity not found");
  }

  const deleted = await prisma.leadActivity.delete({
    where: { id: activityId },
  });

  return deleted;
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
const getLeadSummaryStats = async (user?: { id: string; role?: string }) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const isPrivileged = user?.role === "SUPER_ADMIN" || user?.role === "ADMIN";
  const baseWhere: Prisma.LeadWhereInput = { isDeleted: false };
  if (user && !isPrivileged) {
    baseWhere.assignedToId = user.id;
  }

  const [totalLeads, newLeadsToday, followUps, convertedLeads, inProgressLeads] =
    await Promise.all([
      prisma.lead.count({ where: baseWhere }),
      prisma.lead.count({
        where: {
          ...baseWhere,
          createdAt: { gte: today },
        },
      }),
      prisma.lead.count({
        where: {
          ...baseWhere,
          isFollowUpDone: false,
        },
      }),
      prisma.lead.count({
        where: {
          ...baseWhere,
          status: LeadStatus.CONVERTED,
        },
      }),
      prisma.lead.count({
        where: {
          ...baseWhere,
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

// 8. Get Follow-Up Reminder Queue (Urgent-First, Staff-Scoped)
const getFollowUpQueue = async (
  user: { id: string; role?: string },
  filters: TFollowUpFilterRequest,
  paginationOptions: IPaginationOptions,
) => {
  const { urgency, assignedToId, searchTerm } = filters;
  const { page, limit, skip } = calculatePagination(paginationOptions);

  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
  const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

  // Base conditions for leads in the queue
  const baseConditions: Prisma.LeadWhereInput[] = [
    { isDeleted: false },
  ];

  // Role scoping: if not privileged (SUPER_ADMIN / ADMIN), strictly restrict to assignedToId
  const isPrivileged = user.role === "SUPER_ADMIN" || user.role === "ADMIN";
  if (!isPrivileged) {
    baseConditions.push({ assignedToId: user.id });
  } else if (assignedToId) {
    if (assignedToId === "UNASSIGNED") {
      baseConditions.push({ assignedToId: null });
    } else {
      baseConditions.push({ assignedToId });
    }
  }

  // Search filter
  if (searchTerm) {
    baseConditions.push({
      OR: [
        { fullName: { contains: searchTerm, mode: "insensitive" } },
        { phone: { contains: searchTerm, mode: "insensitive" } },
        { email: { contains: searchTerm, mode: "insensitive" } },
      ],
    });
  }

  // Urgency condition definitions
  const overdueCondition: Prisma.LeadWhereInput = {
    isFollowUpDone: false,
    OR: [
      { nextFollowUpDate: { lt: startOfToday } },
      { nextFollowUpDate: null },
    ],
  };

  const todayCondition: Prisma.LeadWhereInput = {
    isFollowUpDone: false,
    nextFollowUpDate: { gte: startOfToday, lte: endOfToday },
  };

  const upcomingCondition: Prisma.LeadWhereInput = {
    isFollowUpDone: false,
    nextFollowUpDate: { gt: endOfToday },
  };

  const completedCondition: Prisma.LeadWhereInput = {
    isFollowUpDone: true,
  };

  // Count summaries by urgency bucket
  const [overdueCount, todayCount, upcomingCount, completedCount, totalCount] = await Promise.all([
    prisma.lead.count({
      where: {
        AND: [...baseConditions, overdueCondition],
      },
    }),
    prisma.lead.count({
      where: {
        AND: [...baseConditions, todayCondition],
      },
    }),
    prisma.lead.count({
      where: {
        AND: [...baseConditions, upcomingCondition],
      },
    }),
    prisma.lead.count({
      where: {
        AND: [...baseConditions, completedCondition],
      },
    }),
    prisma.lead.count({
      where: {
        AND: baseConditions,
      },
    }),
  ]);

  // Apply urgency filter to data query if selected
  const queryConditions = [...baseConditions];
  if (urgency === "OVERDUE") {
    queryConditions.push(overdueCondition);
  } else if (urgency === "TODAY") {
    queryConditions.push(todayCondition);
  } else if (urgency === "UPCOMING") {
    queryConditions.push(upcomingCondition);
  } else if (urgency === "COMPLETED") {
    queryConditions.push(completedCondition);
  }

  const whereConditions: Prisma.LeadWhereInput = { AND: queryConditions };

  const [rawLeads, total] = await Promise.all([
    prisma.lead.findMany({
      where: whereConditions,
      select: {
        id: true,
        clientCode: true,
        fullName: true,
        phone: true,
        email: true,
        country: true,
        status: true,
        priority: true,
        profileAssessment: true,
        meetingScheduled: true,
        meetingDateTime: true,
        meetingDateTimeStr: true,
        resumeUrl: true,
        nextFollowUpDate: true,
        lastFollowUpAt: true,
        isFollowUpDone: true,
        followUpNotifiedAt: true,
        service: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
        assignedTo: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
          },
        },
        activities: {
          orderBy: { createdAt: "desc" },
          take: 1,
          select: {
            id: true,
            activityType: true,
            notes: true,
            callOutcome: true,
            createdAt: true,
            performedByName: true,
          },
        },
        createdAt: true,
        updatedAt: true,
      },
      skip,
      take: limit,
      orderBy: [
        { isFollowUpDone: "asc" }, // Incomplete (false) first, completed (true) last
        { nextFollowUpDate: "asc" }, // Earliest due date first
        { createdAt: "desc" },
      ],
    }),
    prisma.lead.count({ where: whereConditions }),
  ]);

  // Map each lead with urgency classification
  const data = rawLeads.map((lead) => {
    let leadUrgency: "OVERDUE" | "TODAY" | "UPCOMING" | "COMPLETED" = "COMPLETED";
    if (lead.isFollowUpDone) {
      leadUrgency = "COMPLETED";
    } else {
      const dueDate = lead.nextFollowUpDate ? new Date(lead.nextFollowUpDate) : null;
      if (dueDate) {
        if (dueDate < startOfToday) {
          leadUrgency = "OVERDUE";
        } else if (dueDate <= endOfToday) {
          leadUrgency = "TODAY";
        } else {
          leadUrgency = "UPCOMING";
        }
      } else {
        leadUrgency = "OVERDUE"; // Action required: no scheduled follow-up
      }
    }

    return {
      ...lead,
      urgency: leadUrgency,
      lastActivity: lead.activities[0] || null,
    };
  });

  const meta = buildPaginationMeta(page, limit, total);

  return {
    meta,
    counts: {
      overdue: overdueCount,
      today: todayCount,
      upcoming: upcomingCount,
      completed: completedCount,
      total: totalCount,
    },
    data,
  };
};

// 9. Complete Lead Follow-Up (Records FOLLOW_UP_COMPLETED activity for EOD Reporting)
const completeFollowUp = async (
  leadId: string,
  payload: TCompleteFollowUpPayload,
  user?: { id: string; name: string; email?: string },
) => {
  const lead = await prisma.lead.findUnique({
    where: { id: leadId, isDeleted: false },
  });

  if (!lead) {
    throw new AppError(httpStatus.NOT_FOUND, "Lead not found");
  }

  const actorId = user?.id || null;
  const actorName = user?.name || "Staff";

  const result = await prisma.$transaction(async (tx) => {
    const hasNextSchedule = Boolean(payload.nextFollowUpDate);
    const newFollowUpDate = payload.nextFollowUpDate
      ? new Date(payload.nextFollowUpDate)
      : null;

    // 1. Update lead record
    const updatedLead = await tx.lead.update({
      where: { id: leadId },
      data: {
        lastFollowUpAt: new Date(),
        isFollowUpDone: !hasNextSchedule,
        nextFollowUpDate: newFollowUpDate,
        followUpNotifiedAt: null, // Reset alert timestamp for next schedule
      },
      select: leadSelect,
    });

    // 2. Log immutable audit activity record for EOD activity report
    const followUpNote = payload.notes?.trim()
      ? payload.notes.trim()
      : hasNextSchedule
      ? `Follow-up completed by ${actorName}. Next follow-up rescheduled for ${newFollowUpDate?.toLocaleDateString()}.`
      : `Follow-up marked as completed by ${actorName}.`;

    const activity = await tx.leadActivity.create({
      data: {
        leadId,
        activityType: LeadActivityType.FOLLOW_UP_COMPLETED,
        notes: followUpNote,
        nextFollowUp: newFollowUpDate,
        isFollowUpDone: true,
        performedById: actorId,
        performedByName: actorName,
      },
    });

    return { lead: updatedLead, activity };
  });

  return result;
};

export const LeadService = {
  createLead,
  getAllLeads,
  getLeadById,
  updateLead,
  addLeadActivity,
  updateLeadActivity,
  deleteLeadActivity,
  deleteLead,
  getLeadSummaryStats,
  getFollowUpQueue,
  completeFollowUp,
};
