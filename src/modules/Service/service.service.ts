import { Prisma } from "@prisma/client";
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
import { serviceSearchableFields, serviceSortableFields } from "./service.constant";
import {
  TCreateServicePayload,
  TServiceFilterRequest,
  TUpdateServicePayload,
} from "./service.interface";

// Standard projection with audit actors
const serviceSelect = {
  id: true,
  name: true,
  code: true,
  category: true,
  description: true,
  baseFee: true,
  estimatedGovFee: true,
  estimatedAttorneyFee: true,
  estimatedThirdPartyFee: true,
  currency: true,
  defaultDeposit: true,
  defaultInstallments: true,
  estimatedDuration: true,
  isActive: true,
  createdById: true,
  createdBy: {
    select: {
      id: true,
      name: true,
      email: true,
    },
  },
  updatedById: true,
  updatedBy: {
    select: {
      id: true,
      name: true,
      email: true,
    },
  },
  isDeleted: true,
  deletedAt: true,
  createdAt: true,
  updatedAt: true,
};

/**
 * Calculates total estimated cost summing base professional fee and third-party pass-through fees
 */
const withTotalCost = (service: any) => {
  const base = Number(service.baseFee || 0);
  const gov = Number(service.estimatedGovFee || 0);
  const attorney = Number(service.estimatedAttorneyFee || 0);
  const thirdParty = Number(service.estimatedThirdPartyFee || 0);
  const totalEstimatedCost = (base + gov + attorney + thirdParty).toFixed(2);

  return {
    ...service,
    totalEstimatedCost: parseFloat(totalEstimatedCost),
  };
};

const createService = async (payload: TCreateServicePayload, actorId: string) => {
  // Check unique constraints for name and code
  const existingService = await prisma.service.findFirst({
    where: {
      OR: [{ name: payload.name }, { code: payload.code.toUpperCase() }],
      isDeleted: false,
    },
  });

  if (existingService) {
    if (existingService.code.toUpperCase() === payload.code.toUpperCase()) {
      throw new AppError(
        httpStatus.CONFLICT,
        `A service with code "${payload.code.toUpperCase()}" already exists`,
      );
    }
    throw new AppError(
      httpStatus.CONFLICT,
      `A service with name "${payload.name}" already exists`,
    );
  }

  const result = await prisma.service.create({
    data: {
      name: payload.name,
      code: payload.code.toUpperCase(),
      category: payload.category || "IMMIGRATION",
      description: payload.description,
      baseFee: new Prisma.Decimal(payload.baseFee),
      estimatedGovFee: new Prisma.Decimal(payload.estimatedGovFee ?? 0),
      estimatedAttorneyFee: new Prisma.Decimal(payload.estimatedAttorneyFee ?? 0),
      estimatedThirdPartyFee: new Prisma.Decimal(payload.estimatedThirdPartyFee ?? 0),
      currency: payload.currency ? payload.currency.toUpperCase() : "USD",
      defaultDeposit: payload.defaultDeposit !== undefined
        ? new Prisma.Decimal(payload.defaultDeposit)
        : null,
      defaultInstallments: payload.defaultInstallments,
      estimatedDuration: payload.estimatedDuration,
      isActive: payload.isActive ?? true,
      createdById: actorId,
    },
    select: serviceSelect,
  });

  return withTotalCost(result);
};

const getAllServices = async (
  filters: TServiceFilterRequest,
  paginationOptions?: IPaginationOptions,
  sortOptions?: ISortOptions,
) => {
  const { page, limit, skip } = calculatePagination(paginationOptions);
  const orderBy = buildSortOrder(
    sortOptions,
    serviceSortableFields,
    "createdAt",
    "desc",
  );

  const { searchTerm, category, currency, isActive, isDeleted, startDate, endDate } =
    filters;
  const andConditions: Prisma.ServiceWhereInput[] = [];

  // Default: exclude soft-deleted services unless explicitly requested
  andConditions.push({
    isDeleted: isDeleted !== undefined ? isDeleted : false,
  });

  // Reusable multi-field search (name, code, description)
  const searchCondition = buildSearchFilter(searchTerm, serviceSearchableFields);
  if (searchCondition) {
    andConditions.push(searchCondition);
  }

  // Filter by category
  if (category) {
    andConditions.push({ category });
  }

  // Filter by currency
  if (currency) {
    andConditions.push({ currency: currency.toUpperCase() });
  }

  // Filter by active status
  if (isActive !== undefined) {
    andConditions.push({ isActive });
  }

  // Date range filter on createdAt
  const dateRangeCondition = buildDateRangeFilter(
    "createdAt",
    startDate,
    endDate,
  );
  if (dateRangeCondition) {
    andConditions.push(dateRangeCondition);
  }

  const whereCondition: Prisma.ServiceWhereInput =
    andConditions.length > 0 ? { AND: andConditions } : {};

  const [services, total] = await Promise.all([
    prisma.service.findMany({
      where: whereCondition,
      select: serviceSelect,
      skip,
      take: limit,
      orderBy,
    }),
    prisma.service.count({ where: whereCondition }),
  ]);

  const meta = buildPaginationMeta(page, limit, total);
  const data = services.map(withTotalCost);

  return { meta, data };
};

const getServiceById = async (id: string) => {
  const service = await prisma.service.findFirst({
    where: {
      id,
      isDeleted: false,
    },
    select: serviceSelect,
  });

  if (!service) {
    throw new AppError(httpStatus.NOT_FOUND, "Service not found");
  }

  return withTotalCost(service);
};

const updateService = async (
  id: string,
  payload: TUpdateServicePayload,
  actorId: string,
) => {
  const existingService = await prisma.service.findFirst({
    where: { id, isDeleted: false },
  });

  if (!existingService) {
    throw new AppError(httpStatus.NOT_FOUND, "Service not found");
  }

  // Validate conflict if name or code is being modified
  if (payload.name && payload.name !== existingService.name) {
    const nameConflict = await prisma.service.findFirst({
      where: {
        name: payload.name,
        id: { not: id },
        isDeleted: false,
      },
    });
    if (nameConflict) {
      throw new AppError(
        httpStatus.CONFLICT,
        `A service with name "${payload.name}" already exists`,
      );
    }
  }

  if (payload.code && payload.code.toUpperCase() !== existingService.code) {
    const codeConflict = await prisma.service.findFirst({
      where: {
        code: payload.code.toUpperCase(),
        id: { not: id },
        isDeleted: false,
      },
    });
    if (codeConflict) {
      throw new AppError(
        httpStatus.CONFLICT,
        `A service with code "${payload.code.toUpperCase()}" already exists`,
      );
    }
  }

  const updateData: Prisma.ServiceUpdateInput = {
    updatedBy: { connect: { id: actorId } },
  };

  if (payload.name !== undefined) updateData.name = payload.name;
  if (payload.code !== undefined) updateData.code = payload.code.toUpperCase();
  if (payload.category !== undefined) updateData.category = payload.category;
  if (payload.description !== undefined) updateData.description = payload.description;
  if (payload.baseFee !== undefined) {
    updateData.baseFee = new Prisma.Decimal(payload.baseFee);
  }
  if (payload.estimatedGovFee !== undefined) {
    updateData.estimatedGovFee = new Prisma.Decimal(payload.estimatedGovFee);
  }
  if (payload.estimatedAttorneyFee !== undefined) {
    updateData.estimatedAttorneyFee = new Prisma.Decimal(payload.estimatedAttorneyFee);
  }
  if (payload.estimatedThirdPartyFee !== undefined) {
    updateData.estimatedThirdPartyFee = new Prisma.Decimal(payload.estimatedThirdPartyFee);
  }
  if (payload.currency !== undefined) updateData.currency = payload.currency.toUpperCase();
  if (payload.defaultDeposit !== undefined) {
    updateData.defaultDeposit = new Prisma.Decimal(payload.defaultDeposit);
  }
  if (payload.defaultInstallments !== undefined) {
    updateData.defaultInstallments = payload.defaultInstallments;
  }
  if (payload.estimatedDuration !== undefined) {
    updateData.estimatedDuration = payload.estimatedDuration;
  }
  if (payload.isActive !== undefined) updateData.isActive = payload.isActive;
  if (payload.isDeleted !== undefined) {
    updateData.isDeleted = payload.isDeleted;
    if (payload.isDeleted) {
      updateData.deletedAt = new Date();
    }
  }

  const result = await prisma.service.update({
    where: { id },
    data: updateData,
    select: serviceSelect,
  });

  return withTotalCost(result);
};

const deleteService = async (id: string, actorId: string) => {
  const existingService = await prisma.service.findFirst({
    where: { id, isDeleted: false },
  });

  if (!existingService) {
    throw new AppError(httpStatus.NOT_FOUND, "Service not found");
  }

  const result = await prisma.service.update({
    where: { id },
    data: {
      isDeleted: true,
      deletedAt: new Date(),
      updatedById: actorId,
    },
    select: serviceSelect,
  });

  return withTotalCost(result);
};

export const ServiceService = {
  createService,
  getAllServices,
  getServiceById,
  updateService,
  deleteService,
};
