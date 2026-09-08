import { NextFunction, Request, Response } from 'express';
import httpStatus from 'http-status';
import jwt, { JwtPayload } from 'jsonwebtoken';
import { UserRole } from '@prisma/client';
import config from '../config';
import AppError from '../errors/AppError';
import prisma from '../lib/prisma';
import catchAsync from '../shared/catchAsync';
import { TAuthUser } from '../interface';

const auth = (...requiredRoles: UserRole[]) => {
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

    const { id, role } = decoded;

    // Check if user exists and is active
    const user = await prisma.user.findUnique({
      where: { id },
      select: { id: true, email: true, role: true, status: true },
    });

    if (!user) {
      throw new AppError(httpStatus.UNAUTHORIZED, 'User not found');
    }

    if (user.status !== 'ACTIVE') {
      throw new AppError(
        httpStatus.FORBIDDEN,
        `Your account is ${user.status.toLowerCase()}. Please contact support.`,
      );
    }

    // Check role authorization
    if (requiredRoles.length > 0 && !requiredRoles.includes(role)) {
      throw new AppError(
        httpStatus.FORBIDDEN,
        'You do not have permission to perform this action',
      );
    }

    req.user = {
      id: user.id,
      email: user.email,
      role: user.role,
    };

    next();
  });
};

export default auth;
