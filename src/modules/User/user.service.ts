import bcryptjs from "bcryptjs";
import { Prisma } from "@prisma/client";
import httpStatus from "http-status";
import config from "../../config";
import AppError from "../../errors/AppError";
import prisma from "../../lib/prisma";
import { userSearchableFields } from "./user.constant";
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

  const { roleName, ...userData } = payload;

  const result = await prisma.user.create({
    data: {
      ...userData,
      roleId: targetRoleId,
      password: hashedPassword,
    },
    select: safeUserSelect,
  });

  return result;
};

const getAllUsers = async (
  filters: TUserFilterRequest,
  options: {
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: "asc" | "desc";
  },
) => {
  const page = Number(options.page) || 1;
  const limit = Number(options.limit) || 10;
  const skip = (page - 1) * limit;
  const sortBy = options.sortBy || "createdAt";
  const sortOrder = options.sortOrder || "desc";

  const { searchTerm, roleName, isDeleted, ...filterData } = filters;
  const andConditions: Prisma.UserWhereInput[] = [];

  // Default: exclude soft-deleted users unless explicitly requested
  andConditions.push({
    isDeleted: isDeleted !== undefined ? isDeleted : false,
  });

  // Search across designated searchable fields
  if (searchTerm) {
    andConditions.push({
      OR: userSearchableFields.map((field) => ({
        [field]: {
          contains: searchTerm,
          mode: "insensitive",
        },
      })),
    });
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
      orderBy: {
        [sortBy]: sortOrder,
      },
      select: safeUserSelect,
    }),
    prisma.user.count({
      where: whereConditions,
    }),
  ]);

  return {
    meta: {
      page,
      limit,
      total,
      totalPage: Math.ceil(total / limit),
    },
    data: users,
  };
};

const getUserById = async (id: string) => {
  const user = await prisma.user.findUnique({
    where: { id },
    select: safeUserSelect,
  });

  if (!user || user.isDeleted) {
    throw new AppError(httpStatus.NOT_FOUND, "User not found");
  }

  return user;
};

const updateUser = async (id: string, payload: TUpdateUserPayload) => {
  // Check if user exists and is not soft deleted
  await getUserById(id);

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
    where: { id },
    data: updateData,
    select: safeUserSelect,
  });

  return result;
};

// Universal Soft Delete implementation (Never hard delete user records)
const deleteUser = async (id: string) => {
  // Check if user exists and is not already deleted
  await getUserById(id);

  const result = await prisma.user.update({
    where: { id },
    data: {
      isDeleted: true,
      deletedAt: new Date(),
      status: "INACTIVE",
    },
    select: safeUserSelect,
  });

  return result;
};

export const UserService = {
  createUser,
  getAllUsers,
  getUserById,
  updateUser,
  deleteUser,
};
