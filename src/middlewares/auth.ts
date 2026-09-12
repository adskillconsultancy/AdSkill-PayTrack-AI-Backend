import { NextFunction, Request, Response } from "express";
import httpStatus from "http-status";
import jwt, { JwtPayload } from "jsonwebtoken";
import config from "../config";
import AppError from "../errors/AppError";
import prisma from "../lib/prisma";
import catchAsync from "../shared/catchAsync";
import { TAuthUser } from "../interface";

/**
 * Permission-Based Access Control (PBAC) Authentication & Authorization Middleware
 *
 * @param requiredPermissions - One or more permissions required to access the endpoint (e.g. 'user:read')
 *
 * Rules:
 * 1. Requires valid JWT access token.
 * 2. Validates user account exists, is active, and is not soft deleted.
 * 3. SUPER_ADMIN has full universal access (bypasses permission checks).
 * 4. All other roles must possess at least one of the requiredPermissions.
 */
const auth = (...requiredPermissions: string[]) => {
  return catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    const authHeader = req.headers.authorization;

    // Check token presence
    if (!authHeader) {
      throw new AppError(
        httpStatus.UNAUTHORIZED,
        "Authentication token required",
      );
    }

    // Support standard Bearer token format
    const token = authHeader.startsWith("Bearer ")
      ? authHeader.split(" ")[1]
      : authHeader;

    if (!token) {
      throw new AppError(httpStatus.UNAUTHORIZED, "Invalid token format");
    }

    // Verify token
    const decoded = jwt.verify(
      token,
      config.jwt.access_secret as string,
    ) as JwtPayload & TAuthUser;

    const { id } = decoded;

    // Fetch user, role, and granted permissions
    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        status: true,
        isDeleted: true,
        roleId: true,
        userPermissions: {
          where: {
            isDeleted: false,
            permission: { isDeleted: false },
          },
          select: {
            isRevoked: true,
            permission: {
              select: {
                name: true,
              },
            },
          },
        },
        role: {
          select: {
            id: true,
            name: true,
            isDeleted: true,
            rolePermissions: {
              where: {
                isDeleted: false,
                permission: { isDeleted: false },
              },
              select: {
                permission: {
                  select: {
                    name: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!user || user.isDeleted || user.role?.isDeleted) {
      throw new AppError(
        httpStatus.UNAUTHORIZED,
        "User account not found or deactivated",
      );
    }

    if (user.status !== "ACTIVE") {
      throw new AppError(
        httpStatus.FORBIDDEN,
        `Your account is ${user.status.toLowerCase()}. Please contact support.`,
      );
    }

    const userRoleName = user.role?.name;
    const rolePermissions =
      user.role?.rolePermissions.map((rp) => rp.permission.name) || [];
    const directGranted =
      user.userPermissions
        .filter((up) => !up.isRevoked)
        .map((up) => up.permission.name) || [];
    const directRevoked = new Set(
      user.userPermissions
        .filter((up) => up.isRevoked)
        .map((up) => up.permission.name) || [],
    );

    // Unified Effective Capabilities = (Role Permissions + Direct Granted) - Direct Revoked
    const effectivePermissions = Array.from(
      new Set([...rolePermissions, ...directGranted]),
    ).filter((name) => !directRevoked.has(name));

    // SUPER_ADMIN has universal unrestricted access across all actions
    if (userRoleName === "SUPER_ADMIN") {
      req.user = {
        id: user.id,
        email: user.email,
        role: userRoleName,
        roleId: user.roleId,
        permissions: effectivePermissions,
      };
      return next();
    }

    // Check if user has any of the required permissions
    if (requiredPermissions.length > 0) {
      const hasPermission = requiredPermissions.some((perm) =>
        effectivePermissions.includes(perm),
      );

      if (!hasPermission) {
        throw new AppError(
          httpStatus.FORBIDDEN,
          "You do not have permission to perform this action",
        );
      }
    }

    req.user = {
      id: user.id,
      email: user.email,
      role: userRoleName,
      roleId: user.roleId,
      permissions: effectivePermissions,
    };

    next();
  });
};

export default auth;
