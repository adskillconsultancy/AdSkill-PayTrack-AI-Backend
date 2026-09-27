import { Request, Response } from "express";
import httpStatus from "http-status";
import AppError from "../../errors/AppError";
import catchAsync from "../../shared/catchAsync";
import sendResponse from "../../shared/sendResponse";
import { userFilterableFields } from "./user.constant";
import { UserService } from "./user.service";

const createUser = catchAsync(async (req: Request, res: Response) => {
  const result = await UserService.createUser(
    req.body,
    req.user?.id,
    req.user?.email,
    req.user?.role,
    req.user?.permissions,
  );

  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: "User created successfully",
    data: result,
  });
});

const getAllUsers = catchAsync(async (req: Request, res: Response) => {
  if (req.user?.role === "CLIENT") {
    throw new AppError(
      httpStatus.FORBIDDEN,
      "Clients are not authorized to view the user directory",
    );
  }

  // Extract filter parameters
  const filters: Record<string, any> = Object.fromEntries(
    Object.entries(req.query).filter(([key]) =>
      userFilterableFields.includes(key),
    ),
  );
  if (req.query.search && !filters.searchTerm) {
    filters.searchTerm = req.query.search as string;
  }

  // Extract pagination parameters
  const paginationOptions = {
    page: req.query.page as string | undefined,
    limit: req.query.limit as string | undefined,
  };

  // Extract sorting parameters
  const sortOptions = {
    sortBy: req.query.sortBy as string | undefined,
    sortOrder: req.query.sortOrder as string | undefined,
  };

  const result = await UserService.getAllUsers(
    filters,
    paginationOptions,
    sortOptions,
    req.user?.id,
    req.user?.role,
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Users retrieved successfully",
    meta: result.meta,
    data: result.data,
  });
});

const getUserById = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const result = await UserService.getUserById(
    id,
    req.user?.id,
    req.user?.role,
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "User retrieved successfully",
    data: result,
  });
});

const updateUser = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const result = await UserService.updateUser(
    id,
    req.body,
    req.user?.id,
    req.user?.email,
    req.user?.role,
    req.user?.permissions,
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "User updated successfully",
    data: result,
  });
});

const deleteUser = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const currentUserId = req.user?.id;
  const result = await UserService.deleteUser(
    id,
    currentUserId,
    req.user?.email,
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "User deleted successfully",
    data: result,
  });
});

const getUserPermissions = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const result = await UserService.getUserEffectivePermissions(id);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "User effective permissions retrieved successfully",
    data: result,
  });
});

const updateUserPermissions = catchAsync(
  async (req: Request, res: Response) => {
    const { id } = req.params;
    const { permissionIds, deniedPermissionIds } = req.body;
    const result = await UserService.updateUserDirectPermissions(
      id,
      permissionIds,
      deniedPermissionIds,
      req.user?.id,
      req.user?.email,
    );

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "User direct capability overrides updated successfully",
      data: result,
    });
  },
);

export const UserController = {
  createUser,
  getAllUsers,
  getUserById,
  updateUser,
  deleteUser,
  getUserPermissions,
  updateUserPermissions,
};
