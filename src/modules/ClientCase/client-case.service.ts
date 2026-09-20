import { Prisma } from "@prisma/client";
import httpStatus from "http-status";
import AppError from "../../errors/AppError";
import prisma from "../../lib/prisma";
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
  assignedConsultant: { select: { id: true, name: true, email: true } },
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

const ensureOwnerOrStaff = (record: { userId: string }, actorId: string, staff = false) => {
  if (!staff && record.userId !== actorId) {
    throw new AppError(httpStatus.FORBIDDEN, "You cannot access this client case");
  }
};

const createClientCase = async (payload: TCreateClientCasePayload, userId: string) => {
  const [user, service] = await Promise.all([
    prisma.user.findFirst({
      where: { id: userId, isDeleted: false, status: "ACTIVE" },
      select: { id: true, clientId: true, role: { select: { name: true } } },
    }),
    prisma.service.findFirst({
      where: { id: payload.serviceId, isDeleted: false, isActive: true },
    }),
  ]);

  if (!user) throw new AppError(httpStatus.UNAUTHORIZED, "Active client account required");
  if (!service) throw new AppError(httpStatus.NOT_FOUND, "Active service not found");

  const caseCode = await createCaseCode(user.clientId);
  return prisma.clientCase.create({
    data: {
      caseCode,
      userId,
      serviceId: service.id,
      serviceCodeSnapshot: service.code,
      serviceNameSnapshot: service.name,
      serviceCategorySnapshot: service.category,
      destinationCountry: payload.destinationCountry,
      caseCategory: payload.caseCategory,
      caseSubcategory: payload.caseSubcategory,
      agreementDate: payload.agreementDate ? new Date(payload.agreementDate) : undefined,
      serviceStartDate: payload.serviceStartDate ? new Date(payload.serviceStartDate) : undefined,
      clientVisibleNotes: payload.clientVisibleNotes,
    },
    select: caseSelect,
  });
};

const getCasesForUser = async (userId: string) =>
  prisma.clientCase.findMany({
    where: { userId, isDeleted: false },
    select: caseSelect,
    orderBy: { createdAt: "desc" },
  });

const getCaseById = async (id: string, userId: string, staff = false) => {
  const result = await prisma.clientCase.findFirst({
    where: { id, isDeleted: false },
    select: caseSelect,
  });
  if (!result) throw new AppError(httpStatus.NOT_FOUND, "Client case not found");
  ensureOwnerOrStaff(result, userId, staff);
  return result;
};

const updateCase = async (
  id: string,
  payload: TUpdateClientCasePayload,
  userId: string,
  staff = false,
) => {
  const existing = await prisma.clientCase.findFirst({
    where: { id, isDeleted: false },
    select: { userId: true },
  });
  if (!existing) throw new AppError(httpStatus.NOT_FOUND, "Client case not found");
  ensureOwnerOrStaff(existing, userId, staff);

  if (!staff && (payload.caseStatus !== undefined || payload.internalNotes !== undefined || payload.assignedConsultantId !== undefined)) {
    throw new AppError(httpStatus.FORBIDDEN, "Only staff can update internal case fields");
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
  if (payload.assignedConsultantId !== undefined) {
    data.assignedConsultant = payload.assignedConsultantId
      ? { connect: { id: payload.assignedConsultantId } }
      : { disconnect: true };
  }

  return prisma.clientCase.update({ where: { id }, data, select: caseSelect });
};

export const ClientCaseService = {
  createClientCase,
  getCasesForUser,
  getCaseById,
  updateCase,
};
