import { NextFunction, Request, Response } from 'express';
import httpStatus from 'http-status';
import jwt, { JwtPayload } from 'jsonwebtoken';
import config from '../config';
import AppError from '../errors/AppError';
import prisma from '../lib/prisma';
import catchAsync from '../shared/catchAsync';
import { TAuthUser } from '../interface';

const auth = (...requiredRoles: string[]) => {
  return catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    const authHeader = req.headers.authorization;

    // Check token presence
    if (!authHeader) {
      throw new AppError(httpStatus.UNAUTHORIZED, 'Authentication token required');
    }

    // Support standard Bearer token format
    const token = authHeader.startsWith('Bearer ')
      ? authHeader.split(' ')[1]
      : authHeader;

    if (!token) {
      throw new AppError(httpStatus.UNAUTHORIZED, 'Invalid token format');
    }

    // Verify token
    const decoded = jwt.verify(
      token,
      config.jwt.access_secret as string,
    ) as JwtPayload & TAuthUser;

    const { id } = decoded;

    // Check if user exists and is not soft deleted
    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        status: true,
        isDeleted: true,
        roleId: true,
        role: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (!user || user.isDeleted) {
      throw new AppError(httpStatus.UNAUTHORIZED, 'User not found or account deactivated');
    }

    if (user.status !== 'ACTIVE') {
      throw new AppError(
        httpStatus.FORBIDDEN,
        `Your account is ${user.status.toLowerCase()}. Please contact support.`,
      );
    }

    // Check role authorization against dynamic role name
    const userRoleName = user.role?.name;
    if (requiredRoles.length > 0 && (!userRoleName || !requiredRoles.includes(userRoleName))) {
      throw new AppError(
        httpStatus.FORBIDDEN,
        'You do not have permission to perform this action',
      );
    }

    req.user = {
      id: user.id,
      email: user.email,
      role: userRoleName,
      roleId: user.roleId,
    };

    next();
  });
};

export default auth;
