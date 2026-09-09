import httpStatus from "http-status";
import AppError from "../../errors/AppError";
import prisma from "../../lib/prisma";
import {
  TCreateRolePayload,
  TPermissionGroup,
  TUpdateRolePermissionsPayload,
} from "./role.interface";

const IMMUTABLE_SYSTEM_ROLES = [
  "SUPER_ADMIN",
  "MANAGER",
  "CONSULTANT",
  "CLIENT",
];

const getAllRoles = async () => {
  const roles = await prisma.userRole.findMany({
    where: { isDeleted: false },
    include: {
      _count: {
        select: {
          users: {
            where: { isDeleted: false },
          },
        },
      },
      rolePermissions: {
        where: {
          isDeleted: false,
          permission: { isDeleted: false },
        },
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
    orderBy: { createdAt: "asc" },
  });

  return roles.map((role) => ({
    id: role.id,
    name: role.name,
    userCount: role._count.users,
    isSystemRole: IMMUTABLE_SYSTEM_ROLES.includes(role.name),
    permissions: role.rolePermissions.map((rp) => rp.permission),
    createdAt: role.createdAt,
    updatedAt: role.updatedAt,
  }));
};

const getRoleById = async (id: string) => {
  const role = await prisma.userRole.findFirst({
    where: { id, isDeleted: false },
    include: {
      _count: {
        select: {
          users: {
            where: { isDeleted: false },
          },
        },
      },
      rolePermissions: {
        where: {
          isDeleted: false,
          permission: { isDeleted: false },
        },
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
  });

  if (!role) {
    throw new AppError(httpStatus.NOT_FOUND, "Role not found");
  }

  return {
    id: role.id,
    name: role.name,
    userCount: role._count.users,
    isSystemRole: IMMUTABLE_SYSTEM_ROLES.includes(role.name),
    permissions: role.rolePermissions.map((rp) => rp.permission),
    createdAt: role.createdAt,
    updatedAt: role.updatedAt,
  };
};

const createRole = async (payload: TCreateRolePayload) => {
  const existingRole = await prisma.userRole.findUnique({
    where: { name: payload.name },
  });

  if (existingRole && !existingRole.isDeleted) {
    throw new AppError(
      httpStatus.CONFLICT,
      `Role with name '${payload.name}' already exists`,
    );
  }

  // Validate permission IDs if provided
  if (payload.permissionIds && payload.permissionIds.length > 0) {
    const validPermsCount = await prisma.permission.count({
      where: {
        id: { in: payload.permissionIds },
        isDeleted: false,
      },
    });

    if (validPermsCount !== payload.permissionIds.length) {
      throw new AppError(
        httpStatus.BAD_REQUEST,
        "One or more provided permission IDs are invalid",
      );
    }
  }

  return await prisma.$transaction(async (tx) => {
    let role;
    if (existingRole && existingRole.isDeleted) {
      role = await tx.userRole.update({
        where: { id: existingRole.id },
        data: {
          isDeleted: false,
          deletedAt: null,
        },
      });
    } else {
      role = await tx.userRole.create({
        data: {
          name: payload.name,
        },
      });
    }

    if (payload.permissionIds && payload.permissionIds.length > 0) {
      await tx.rolePermission.createMany({
        data: payload.permissionIds.map((permissionId) => ({
          roleId: role.id,
          permissionId,
        })),
      });
    }

    return role;
  });
};

const updateRolePermissions = async (
  roleId: string,
  payload: TUpdateRolePermissionsPayload,
) => {
  const role = await prisma.userRole.findFirst({
    where: { id: roleId, isDeleted: false },
  });

  if (!role) {
    throw new AppError(httpStatus.NOT_FOUND, "Role not found");
  }

  // Validate all permission IDs exist
  if (payload.permissionIds.length > 0) {
    const validPerms = await prisma.permission.findMany({
      where: {
        id: { in: payload.permissionIds },
        isDeleted: false,
      },
      select: { id: true },
    });

    if (validPerms.length !== payload.permissionIds.length) {
      throw new AppError(
        httpStatus.BAD_REQUEST,
        "One or more provided permission IDs do not exist",
      );
    }
  }

  // Atomically replace permissions
  await prisma.$transaction(async (tx) => {
    await tx.rolePermission.deleteMany({
      where: { roleId },
    });

    if (payload.permissionIds.length > 0) {
      await tx.rolePermission.createMany({
        data: payload.permissionIds.map((permissionId) => ({
          roleId,
          permissionId,
        })),
      });
    }
  });

  return await getRoleById(roleId);
};

const deleteRole = async (roleId: string) => {
  const role = await prisma.userRole.findFirst({
    where: { id: roleId, isDeleted: false },
    include: {
      _count: {
        select: {
          users: {
            where: { isDeleted: false },
          },
        },
      },
    },
  });

  if (!role) {
    throw new AppError(httpStatus.NOT_FOUND, "Role not found");
  }

  if (IMMUTABLE_SYSTEM_ROLES.includes(role.name)) {
    throw new AppError(
      httpStatus.FORBIDDEN,
      `Cannot delete canonical system role: '${role.name}'`,
    );
  }

  if (role._count.users > 0) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      `Cannot delete role '${role.name}'. There are ${role._count.users} active user(s) currently assigned to this role.`,
    );
  }

  await prisma.userRole.update({
    where: { id: roleId },
    data: {
      isDeleted: true,
      deletedAt: new Date(),
    },
  });

  return { message: `Role '${role.name}' deleted successfully` };
};

const getAllPermissions = async (): Promise<TPermissionGroup[]> => {
  const permissions = await prisma.permission.findMany({
    where: { isDeleted: false },
    orderBy: [{ module: "asc" }, { name: "asc" }],
  });

  // Group by module
  const groupMap = new Map<string, typeof permissions>();

  for (const perm of permissions) {
    if (!groupMap.has(perm.module)) {
      groupMap.set(perm.module, []);
    }
    groupMap.get(perm.module)!.push(perm);
  }

  const result: TPermissionGroup[] = [];
  for (const [moduleName, perms] of groupMap.entries()) {
    result.push({
      module: moduleName,
      permissions: perms.map((p) => ({
        id: p.id,
        name: p.name,
        description: p.description,
      })),
    });
  }

  return result;
};

export const RoleService = {
  getAllRoles,
  getRoleById,
  createRole,
  updateRolePermissions,
  deleteRole,
  getAllPermissions,
};
