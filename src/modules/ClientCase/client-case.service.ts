import { Prisma } from "@prisma/client";
import httpStatus from "http-status";
import AppError from "../../errors/AppError";
import prisma from "../../lib/prisma";
import { AuditService } from "../Audit/audit.service";
import { TCreateClientCasePayload, TUpdateClientCasePayload } from "./client-case.interface";

const caseSelect = {
  id: true,
  caseCode: true,
  userId: true,
  serviceId: true,
  serviceCodeSnapshot: true,
  serviceNameSnapshot: true,
  serviceCategorySnapshot: true,
  destinationCountry: true,
  caseCategory: true,
  caseSubcategory: true,
  assignedConsultantId: true,
  agreementDate: true,
  serviceStartDate: true,
  caseStatus: true,
  financialStatus: true,
  clientVisibleNotes: true,
  internalNotes: true,
  superAdminNotes: true,
  createdAt: true,
  updatedAt: true,
  service: {
    select: {
      id: true,
      name: true,
      code: true,
      description: true,
      category: true,
      baseFee: true,
      estimatedGovFee: true,
      estimatedAttorneyFee: true,
      estimatedThirdPartyFee: true,
      currency: true,
      defaultDeposit: true,
      defaultInstallments: true,
      estimatedDuration: true,
      isActive: true,
    },
  },
  user: {
    select: {
      id: true,
      clientId: true,
      name: true,
      preferredName: true,
      email: true,
      phone: true,
      whatsapp: true,
      address: true,
      city: true,
      state: true,
      postalCode: true,
      country: true,
      status: true,
      role: { select: { id: true, name: true } },
    },
  },
  assignedConsultant: {
    select: {
      id: true,
      name: true,
      preferredName: true,
      email: true,
      phone: true,
      whatsapp: true,
    },
  },
} satisfies Prisma.ClientCaseSelect;

type CaseWithRelations = Prisma.ClientCaseGetPayload<{ select: typeof caseSelect }>;

const createCaseCode = async (clientId: string | null) => {
  const prefix = (clientId || "CLIENT").replace(/[^a-zA-Z0-9]/g, "").slice(0, 24) || "CLIENT";
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const suffix = Math.floor(10000 + Math.random() * 90000);
    const caseCode = `${prefix}-${suffix}`.toUpperCase();
    const existing = await prisma.clientCase.findUnique({
      where: { caseCode },
      select: { id: true },
    });
    if (!existing) return caseCode;
  }
  return `${prefix}-${Date.now().toString(36).toUpperCase()}`;
};

const sanitizeCaseNotes = <
  T extends { internalNotes?: string | null; superAdminNotes?: string | null },
>(
  item: T,
  userRole?: string,
): T => {
  if (userRole === "SUPER_ADMIN") return item;
  if (userRole === "CLIENT") {
    return { ...item, internalNotes: null, superAdminNotes: null };
  }
  return { ...item, superAdminNotes: null };
};

const ensureOwnerOrStaff = (record: { userId: string }, actorId: string, staff = false) => {
  if (!staff && record.userId !== actorId) {
    throw new AppError(httpStatus.FORBIDDEN, "You cannot access this client case");
  }
};

const createClientCase = async (
  payload: TCreateClientCasePayload,
  actorUserId: string,
  userRole?: string,
  actorEmail?: string,
) => {
  const isStaff = userRole !== "CLIENT";
  const targetUserId = (isStaff && payload.userId) ? payload.userId : actorUserId;

  const [user, service] = await Promise.all([
    prisma.user.findFirst({
      where: { id: targetUserId, isDeleted: false, status: "ACTIVE" },
      select: { id: true, clientId: true, role: { select: { name: true } } },
    }),
    prisma.service.findFirst({
      where: { id: payload.serviceId, isDeleted: false, isActive: true },
    }),
  ]);

  if (!user) throw new AppError(httpStatus.UNAUTHORIZED, "Active client account required");
  if (!service) throw new AppError(httpStatus.NOT_FOUND, "Active service not found");

  const assignedConsultantId =
    userRole === "CONSULTANT"
      ? actorUserId
      : (payload.assignedConsultantId ?? undefined);

  const caseCode = await createCaseCode(user.clientId);
  const created = await prisma.clientCase.create({
    data: {
      caseCode,
      userId: targetUserId,
      serviceId: service.id,
      serviceCodeSnapshot: service.code,
      serviceNameSnapshot: service.name,
      serviceCategorySnapshot: service.category,
      destinationCountry: payload.destinationCountry,
      caseCategory: payload.caseCategory,
      caseSubcategory: payload.caseSubcategory,
      assignedConsultantId,
      caseStatus: payload.caseStatus ?? undefined,
      agreementDate: payload.agreementDate ? new Date(payload.agreementDate) : undefined,
      serviceStartDate: payload.serviceStartDate ? new Date(payload.serviceStartDate) : undefined,
      clientVisibleNotes: payload.clientVisibleNotes,
      internalNotes: payload.internalNotes,
      superAdminNotes: payload.superAdminNotes,
    },
    select: caseSelect,
  });

  // Seed initial timeline CaseNote records
  const initialNotesToCreate: Prisma.CaseNoteCreateManyInput[] = [];
  if (payload.clientVisibleNotes?.trim()) {
    initialNotesToCreate.push({
      caseId: created.id,
      authorId: actorUserId,
      content: payload.clientVisibleNotes.trim(),
      visibility: "CLIENT",
      isPinned: true,
    });
  }
  if (payload.internalNotes?.trim()) {
    initialNotesToCreate.push({
      caseId: created.id,
      authorId: actorUserId,
      content: payload.internalNotes.trim(),
      visibility: "STAFF",
      isPinned: true,
    });
  }
  if (payload.superAdminNotes?.trim() && userRole === "SUPER_ADMIN") {
    initialNotesToCreate.push({
      caseId: created.id,
      authorId: actorUserId,
      content: payload.superAdminNotes.trim(),
      visibility: "SUPER_ADMIN",
      isPinned: true,
    });
  }
  if (initialNotesToCreate.length > 0) {
    await prisma.caseNote.createMany({
      data: initialNotesToCreate,
    });
  }

  AuditService.writeAuditLog({
    actorId: actorUserId,
    actorEmail,
    action: "CREATE_CLIENT_CASE",
    targetEntity: "ClientCase",
    targetId: created.id,
    afterValue: {
      caseCode: created.caseCode,
      caseCategory: created.caseCategory,
      destinationCountry: created.destinationCountry,
      caseStatus: created.caseStatus,
      clientId: created.user?.clientId,
      clientName: created.user?.name,
      serviceName: created.serviceNameSnapshot,
    },
  });

  return sanitizeCaseNotes(created, userRole);
};

const getCasesForUser = async (userId: string, userRole?: string) => {
  const where: Prisma.ClientCaseWhereInput = {
    isDeleted: false,
    ...(userRole === "CONSULTANT" ? { assignedConsultantId: userId } : { userId }),
  };
  const list = await prisma.clientCase.findMany({
    where,
    select: caseSelect,
    orderBy: { createdAt: "desc" },
  });
  return list.map((item) => sanitizeCaseNotes(item, userRole));
};

const getCaseById = async (id: string, userId: string, staff = false, userRole?: string) => {
  const result = await prisma.clientCase.findFirst({
    where: { id, isDeleted: false },
    select: caseSelect,
  });
  if (!result) throw new AppError(httpStatus.NOT_FOUND, "Client case not found");
  ensureOwnerOrStaff(result, userId, staff);
  if (userRole === "CONSULTANT" && result.assignedConsultantId !== userId) {
    throw new AppError(httpStatus.FORBIDDEN, "You are not assigned to this client case");
  }
  return sanitizeCaseNotes(result, userRole);
};

const updateCase = async (
  id: string,
  payload: TUpdateClientCasePayload,
  userId: string,
  staff = false,
  userRole?: string,
  actorEmail?: string,
) => {
  const existing = await prisma.clientCase.findFirst({
    where: { id, isDeleted: false },
    select: { userId: true, assignedConsultantId: true, caseStatus: true, caseCode: true },
  });
  if (!existing) throw new AppError(httpStatus.NOT_FOUND, "Client case not found");
  ensureOwnerOrStaff(existing, userId, staff);

  if (userRole === "CONSULTANT" && existing.assignedConsultantId !== userId) {
    throw new AppError(httpStatus.FORBIDDEN, "You are not assigned to this client case");
  }

  if (userRole === "CONSULTANT" && payload.assignedConsultantId !== undefined && payload.assignedConsultantId !== existing.assignedConsultantId) {
    throw new AppError(httpStatus.FORBIDDEN, "Consultants cannot reassign cases");
  }

  if (!staff && (payload.caseStatus !== undefined || payload.internalNotes !== undefined || payload.assignedConsultantId !== undefined)) {
    throw new AppError(httpStatus.FORBIDDEN, "Only staff can update internal case fields");
  }

  if (payload.superAdminNotes !== undefined && userRole !== "SUPER_ADMIN") {
    throw new AppError(httpStatus.FORBIDDEN, "Only Super Admin can update confidential notes");
  }

  const data: Prisma.ClientCaseUpdateInput = {};
  if (payload.destinationCountry !== undefined) data.destinationCountry = payload.destinationCountry;
  if (payload.caseCategory !== undefined) data.caseCategory = payload.caseCategory;
  if (payload.caseSubcategory !== undefined) data.caseSubcategory = payload.caseSubcategory;
  if (payload.agreementDate !== undefined) data.agreementDate = new Date(payload.agreementDate);
  if (payload.serviceStartDate !== undefined) data.serviceStartDate = new Date(payload.serviceStartDate);
  if (payload.caseStatus !== undefined) data.caseStatus = payload.caseStatus;
  if (payload.clientVisibleNotes !== undefined) data.clientVisibleNotes = payload.clientVisibleNotes;
  if (payload.internalNotes !== undefined) data.internalNotes = payload.internalNotes;
  if (payload.superAdminNotes !== undefined) data.superAdminNotes = payload.superAdminNotes;
  if (payload.assignedConsultantId !== undefined) {
    data.assignedConsultant = payload.assignedConsultantId
      ? { connect: { id: payload.assignedConsultantId } }
      : { disconnect: true };
  }

  const updated = await prisma.clientCase.update({ where: { id }, data, select: caseSelect });

  AuditService.writeAuditLog({
    actorId: userId,
    actorEmail,
    action: "UPDATE_CLIENT_CASE",
    targetEntity: "ClientCase",
    targetId: updated.id,
    beforeValue: {
      caseStatus: existing.caseStatus,
      assignedConsultantId: existing.assignedConsultantId,
    },
    afterValue: {
      caseCode: updated.caseCode,
      caseStatus: updated.caseStatus,
      destinationCountry: updated.destinationCountry,
      assignedConsultantId: updated.assignedConsultant?.id,
    },
  });

  return sanitizeCaseNotes(updated, userRole);
};


const getAllCases = async (
  actorUserId: string,
  userRole?: string,
  filters?: { search?: string; status?: string; category?: string },
) => {
  const whereClause: Prisma.ClientCaseWhereInput = {
    isDeleted: false,
    ...(userRole === "CLIENT" ? { userId: actorUserId } : {}),
    ...(userRole === "CONSULTANT" ? { assignedConsultantId: actorUserId } : {}),
  };

  if (filters?.status) {
    whereClause.caseStatus = filters.status as any;
  }
  if (filters?.category) {
    whereClause.caseCategory = filters.category;
  }
  if (filters?.search) {
    const q = filters.search.trim();
    whereClause.OR = [
      { caseCode: { contains: q, mode: "insensitive" } },
      { destinationCountry: { contains: q, mode: "insensitive" } },
      { caseCategory: { contains: q, mode: "insensitive" } },
      { serviceNameSnapshot: { contains: q, mode: "insensitive" } },
      { serviceCodeSnapshot: { contains: q, mode: "insensitive" } },
      { user: { name: { contains: q, mode: "insensitive" } } },
      { user: { email: { contains: q, mode: "insensitive" } } },
      { user: { clientId: { contains: q, mode: "insensitive" } } },
      { user: { phone: { contains: q, mode: "insensitive" } } },
      { user: { whatsapp: { contains: q, mode: "insensitive" } } },
      { assignedConsultant: { name: { contains: q, mode: "insensitive" } } },
      { assignedConsultant: { email: { contains: q, mode: "insensitive" } } },
    ];
  }

  const list = await prisma.clientCase.findMany({
    where: whereClause,
    select: caseSelect,
    orderBy: { createdAt: "desc" },
  });

  return list.map((item) => sanitizeCaseNotes(item, userRole));
};

export const ClientCaseService = {
  getAllCases,
  createClientCase,
  getCasesForUser,
  getCaseById,
  updateCase,
};
