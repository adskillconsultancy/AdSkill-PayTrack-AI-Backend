import { Request, Response } from "express";
import httpStatus from "http-status";
import catchAsync from "../../shared/catchAsync";
import sendResponse from "../../shared/sendResponse";
import { RoleService } from "./role.service";

const getAllRoles = catchAsync(async (_req: Request, res: Response) => {
  const result = await RoleService.getAllRoles();

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Roles retrieved successfully",
    data: result,
  });
});

const getRoleById = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const result = await RoleService.getRoleById(id);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Role details retrieved successfully",
    data: result,
  });
});

const createRole = catchAsync(async (req: Request, res: Response) => {
  const result = await RoleService.createRole(req.body);

  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: "Dynamic role created successfully",
    data: result,
  });
});

const updateRolePermissions = catchAsync(
  async (req: Request, res: Response) => {
    const { id } = req.params;
    const result = await RoleService.updateRolePermissions(id, req.body);

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Role permissions updated successfully",
      data: result,
    });
  },
);

const deleteRole = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const result = await RoleService.deleteRole(id);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: result.message,
    data: null,
  });
});

const getAllPermissions = catchAsync(
  async (_req: Request, res: Response) => {
    const result = await RoleService.getAllPermissions();

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Permissions retrieved successfully",
      data: result,
    });
  },
);

export const RoleController = {
  getAllRoles,
  getRoleById,
  createRole,
  updateRolePermissions,
  deleteRole,
  getAllPermissions,
};
