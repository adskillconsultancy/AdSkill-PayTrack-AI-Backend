import bcryptjs from 'bcryptjs';
import { Prisma } from '@prisma/client';
import httpStatus from 'http-status';
import config from '../../config';
import AppError from '../../errors/AppError';
import prisma from '../../lib/prisma';
import { userSearchableFields } from './user.constant';
import {
  TCreateUserPayload,
  TUpdateUserPayload,
  TUserFilterRequest,
} from './user.interface';

// Safe user select (excludes password and mfaSecret)
const safeUserSelect = {
  id: true,
  name: true,
  email: true,
  phone: true,
  role: true,
  status: true,
  isMfaEnabled: true,
  createdAt: true,
  updatedAt: true,
};

const createUser = async (payload: TCreateUserPayload) => {
  // Check if user already exists
  const existingUser = await prisma.user.findUnique({
    where: { email: payload.email },
  });

  if (existingUser) {
    throw new AppError(httpStatus.CONFLICT, 'A user with this email already exists');
  }

  // Hash password
  const hashedPassword = await bcryptjs.hash(
    payload.password,
    config.bcrypt_salt_rounds,
  );

  const result = await prisma.user.create({
    data: {
      ...payload,
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
    sortOrder?: 'asc' | 'desc';
  },
) => {
  const page = Number(options.page) || 1;
  const limit = Number(options.limit) || 10;
  const skip = (page - 1) * limit;
  const sortBy = options.sortBy || 'createdAt';
  const sortOrder = options.sortOrder || 'desc';

  const { searchTerm, ...filterData } = filters;
  const andConditions: Prisma.UserWhereInput[] = [];

  // Search in searchable fields
  if (searchTerm) {
    andConditions.push({
      OR: userSearchableFields.map((field) => ({
        [field]: {
          contains: searchTerm,
          mode: 'insensitive',
        },
      })),
    });
  }

  // Strict match on specific filter fields (role, status, email)
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

  if (!user) {
    throw new AppError(httpStatus.NOT_FOUND, 'User not found');
  }

  return user;
};

const updateUser = async (id: string, payload: TUpdateUserPayload) => {
  // Check if user exists
  await getUserById(id);

  // If updating password, hash it first
  let updateData: Prisma.UserUpdateInput = { ...payload };
  if (payload.password) {
    const hashedPassword = await bcryptjs.hash(
      payload.password,
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

const deleteUser = async (id: string) => {
  // Check if user exists
  await getUserById(id);

  // Soft delete / suspend or delete record
  const result = await prisma.user.delete({
    where: { id },
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
