import { Prisma } from "@prisma/client";
import bcryptjs from "bcryptjs";
import httpStatus from "http-status";
import config from "../../config";
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
import { userSearchableFields, userSortableFields } from "./user.constant";
import {
  TCreateUserPayload,
  TUpdateUserPayload,
  TUserFilterRequest,
} from "./user.interface";

// Safe user projection (excludes password hash and mfaSecret)
const safeUserSelect = {
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
  roleId: true,
  role: {
    select: {
      id: true,
      name: true,
    },
  },
  status: true,
  isMfaEnabled: true,
  isDeleted: true,
  deletedAt: true,
  createdAt: true,
  updatedAt: true,
};

const createUser = async (payload: TCreateUserPayload) => {
  // Check if user already exists
  const existingUser = await prisma.user.findUnique({
    where: { email: payload.email },
  });

  if (existingUser) {
    throw new AppError(
      httpStatus.CONFLICT,
      "A user with this email already exists",
    );
  }

  // Resolve role: use provided roleId, roleName, or default to CLIENT per specification
  let targetRoleId = payload.roleId;

  if (!targetRoleId) {
    const roleToFind = payload.roleName || "CLIENT";
    const role = await prisma.userRole.findFirst({
      where: { name: roleToFind, isDeleted: false },
    });

    if (!role) {
      throw new AppError(
        httpStatus.BAD_REQUEST,
        `Role "${roleToFind}" does not exist in the database`,
      );
    }
    targetRoleId = role.id;
  } else {
    // Validate that roleId exists and is not soft deleted
    const role = await prisma.userRole.findFirst({
      where: { id: targetRoleId, isDeleted: false },
    });
    if (!role) {
      throw new AppError(
        httpStatus.BAD_REQUEST,
        "Specified role does not exist",
      );
    }
  }

  // Hash password
  const hashedPassword = await bcryptjs.hash(
    payload.password,
    config.bcrypt_salt_rounds,
  );

  const { roleName, permissionIds, deniedPermissionIds, ...userData } = payload;

  // Validate custom granted permissions if provided
  if (permissionIds && permissionIds.length > 0) {
    const validPerms = await prisma.permission.findMany({
      where: {
        id: { in: permissionIds },
        isDeleted: false,
      },
      select: { id: true },
    });

    if (validPerms.length !== permissionIds.length) {
      throw new AppError(
        httpStatus.BAD_REQUEST,
        "One or more provided granted permission IDs are invalid",
      );
    }
  }

  // Validate custom denied permissions if provided
  if (deniedPermissionIds && deniedPermissionIds.length > 0) {
    const validDeniedPerms = await prisma.permission.findMany({
      where: {
        id: { in: deniedPermissionIds },
        isDeleted: false,
      },
      select: { id: true },
    });

    if (validDeniedPerms.length !== deniedPermissionIds.length) {
      throw new AppError(
        httpStatus.BAD_REQUEST,
        "One or more provided denied permission IDs are invalid",
      );
    }
  }

  const userPermsToCreate: { permissionId: string; isRevoked: boolean }[] = [];
  if (permissionIds && permissionIds.length > 0) {
    permissionIds.forEach((pid) =>
      userPermsToCreate.push({ permissionId: pid, isRevoked: false }),
    );
  }
  if (deniedPermissionIds && deniedPermissionIds.length > 0) {
    deniedPermissionIds.forEach((pid) =>
      userPermsToCreate.push({ permissionId: pid, isRevoked: true }),
    );
  }

  const result = await prisma.user.create({
    data: {
      ...userData,
      roleId: targetRoleId,
      password: hashedPassword,
      ...(userPermsToCreate.length > 0
        ? {
            userPermissions: {
              create: userPermsToCreate,
            },
          }
        : {}),
    },
    select: safeUserSelect,
  });

  return result;
};

const getAllUsers = async (
  filters: TUserFilterRequest,
  paginationOptions?: IPaginationOptions,
  sortOptions?: ISortOptions,
) => {
  const { page, limit, skip } = calculatePagination(paginationOptions);
  const orderBy = buildSortOrder(
    sortOptions,
    userSortableFields,
    "createdAt",
    "desc",
  );

  const { searchTerm, roleName, isDeleted, startDate, endDate, ...filterData } =
    filters;
  const andConditions: Prisma.UserWhereInput[] = [];

  // Default: exclude soft-deleted users unless explicitly requested
  andConditions.push({
    isDeleted: isDeleted !== undefined ? isDeleted : false,
  });

  // Reusable multi-field search
  const searchCondition = buildSearchFilter(searchTerm, userSearchableFields);
  if (searchCondition) {
    andConditions.push(searchCondition);
  }

  // Reusable date range filter on createdAt
  const dateRangeCondition = buildDateRangeFilter(
    "createdAt",
    startDate,
    endDate,
  );
  if (dateRangeCondition) {
    andConditions.push(dateRangeCondition);
  }

  // Filter by role name if supplied
  if (roleName) {
    andConditions.push({
      role: {
        name: {
          equals: roleName,
          mode: "insensitive",
        },
      },
    });
  }

  // Filter by exact fields (roleId, status, email, country, etc.)
  if (Object.keys(filterData).length > 0) {
    andConditions.push({
      AND: Object.keys(filterData).map((key) => ({
        [key]: {
          equals: (filterData as Record<string, unknown>)[key],
        },
      })),
    });
  }

  const whereConditions: Prisma.UserWhereInput =
    andConditions.length > 0 ? { AND: andConditions } : {};

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where: whereConditions,
      skip,
      take: limit,
      orderBy,
      select: safeUserSelect,
    }),
    prisma.user.count({
      where: whereConditions,
    }),
  ]);

  return {
    meta: buildPaginationMeta(page, limit, total),
    data: users,
  };
};

const getUserById = async (idOrClientId: string) => {
  const user = await prisma.user.findFirst({
    where: {
      OR: [{ id: idOrClientId }, { clientId: idOrClientId }],
      isDeleted: false,
    },
    select: safeUserSelect,
  });

  if (!user) {
    throw new AppError(httpStatus.NOT_FOUND, "User not found");
  }

  return user;
};

const updateUser = async (
  idOrClientId: string,
  payload: TUpdateUserPayload,
) => {
  // Check if user exists and is not soft deleted (resolves actual UUID)
  const existingUser = await getUserById(idOrClientId);

  const { roleName, password, ...rest } = payload;
  const updateData: Prisma.UserUpdateInput = { ...rest };

  // Resolve roleName to roleId if supplied
  if (roleName) {
    const role = await prisma.userRole.findFirst({
      where: { name: roleName, isDeleted: false },
    });
    if (!role) {
      throw new AppError(
        httpStatus.BAD_REQUEST,
        `Role "${roleName}" does not exist`,
      );
    }
    updateData.role = { connect: { id: role.id } };
  } else if (payload.roleId) {
    updateData.role = { connect: { id: payload.roleId } };
  }

  // If updating password, hash it first
  if (password) {
    const hashedPassword = await bcryptjs.hash(
      password,
      config.bcrypt_salt_rounds,
    );
    updateData.password = hashedPassword;
  }

  const result = await prisma.user.update({
    where: { id: existingUser.id },
    data: updateData,
    select: safeUserSelect,
  });

  return result;
};

// Universal Soft Delete implementation (Never hard delete user records)
const deleteUser = async (idOrClientId: string, currentUserId?: string) => {
  // Check if user exists and is not already deleted (resolves actual UUID)
  const existingUser = await getUserById(idOrClientId);

  if (
    currentUserId &&
    (existingUser.id === currentUserId || idOrClientId === currentUserId)
  ) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      "You cannot delete your own account",
    );
  }

  const result = await prisma.user.update({
    where: { id: existingUser.id },
    data: {
      isDeleted: true,
      deletedAt: new Date(),
      status: "INACTIVE",
    },
    select: safeUserSelect,
  });

  return result;
};

// Retrieve effective permissions for an individual user (Role + Direct Overrides)
const getUserEffectivePermissions = async (idOrClientId: string) => {
  const user = await prisma.user.findFirst({
    where: {
      OR: [{ id: idOrClientId }, { clientId: idOrClientId }],
      isDeleted: false,
    },
    select: {
      id: true,
      name: true,
      email: true,
      clientId: true,
      role: {
        select: {
          id: true,
          name: true,
          rolePermissions: {
            where: { isDeleted: false, permission: { isDeleted: false } },
            select: {
              permission: {
                select: {
                  id: true,
                  name: true,
                  module: true,
                  description: true,
                },
              },
            },
          },
        },
      },
      userPermissions: {
        where: { isDeleted: false, permission: { isDeleted: false } },
        select: {
          isRevoked: true,
          permission: {
            select: {
              id: true,
              name: true,
              module: true,
              description: true,
            },
          },
        },
      },
    },
  });

  if (!user) {
    throw new AppError(httpStatus.NOT_FOUND, "User not found");
  }

  const rolePermissions =
    user.role?.rolePermissions.map((rp) => rp.permission) || [];
  const grantedDirect =
    user.userPermissions
      .filter((up) => !up.isRevoked)
      .map((up) => up.permission) || [];
  const revokedDirect = new Set(
    user.userPermissions
      .filter((up) => up.isRevoked)
      .map((up) => up.permission.name),
  );

  const combinedPermissions = Array.from(
    new Set([
      ...rolePermissions.map((p) => p.name),
      ...grantedDirect.map((p) => p.name),
    ]),
  );

  // Strip out any explicitly revoked permissions
  const effectivePermissionNames = combinedPermissions.filter(
    (name) => !revokedDirect.has(name),
  );

  return {
    userId: user.id,
    name: user.name,
    email: user.email,
    clientId: user.clientId,
    role: user.role?.name,
    rolePermissions,
    directPermissions: grantedDirect,
    revokedPermissions: user.userPermissions
      .filter((up) => up.isRevoked)
      .map((up) => up.permission),
    effectivePermissions: effectivePermissionNames,
  };
};

// Atomically assign / replace direct user capability overrides (both grant and revoke)
const updateUserDirectPermissions = async (
  idOrClientId: string,
  permissionIds: string[] = [],
  deniedPermissionIds: string[] = [],
) => {
  const user = await getUserById(idOrClientId);
  const resolvedUserId = user.id;

  const allIds = [...new Set([...permissionIds, ...deniedPermissionIds])];
  if (allIds.length > 0) {
    const validPerms = await prisma.permission.findMany({
      where: {
        id: { in: allIds },
        isDeleted: false,
      },
      select: { id: true },
    });

    if (validPerms.length !== allIds.length) {
      throw new AppError(
        httpStatus.BAD_REQUEST,
        "One or more provided permission IDs are invalid",
      );
    }
  }

  // Atomically replace direct permissions
  await prisma.$transaction(async (tx) => {
    await tx.userPermission.deleteMany({
      where: { userId: resolvedUserId },
    });

    const userPermsToCreate: {
      userId: string;
      permissionId: string;
      isRevoked: boolean;
    }[] = [];
    permissionIds.forEach((pid) =>
      userPermsToCreate.push({
        userId: resolvedUserId,
        permissionId: pid,
        isRevoked: false,
      }),
    );
    deniedPermissionIds.forEach((pid) =>
      userPermsToCreate.push({
        userId: resolvedUserId,
        permissionId: pid,
        isRevoked: true,
      }),
    );

    if (userPermsToCreate.length > 0) {
      await tx.userPermission.createMany({
        data: userPermsToCreate,
      });
    }
  });

  return await getUserEffectivePermissions(resolvedUserId);
};

export const UserService = {
  createUser,
  getAllUsers,
  getUserById,
  updateUser,
  deleteUser,
  getUserEffectivePermissions,
  updateUserDirectPermissions,
};
