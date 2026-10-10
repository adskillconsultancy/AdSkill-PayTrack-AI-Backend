import crypto from "crypto";
import { Request, Response } from "express";
import httpStatus from "http-status";
import jwt, { JwtPayload } from "jsonwebtoken";
import config from "../../config";
import prisma from "../../lib/prisma";
import catchAsync from "../../shared/catchAsync";
import sendResponse from "../../shared/sendResponse";
import { listDatabaseBackups, runDatabaseBackup } from "./backup.service";

/**
 * Validates whether the incoming request is authorized to trigger or view backups.
 * Supported authorization methods:
 * 1. Bearer token matching CRON_SECRET (Vercel Cron standard)
 * 2. Header `x-cron-secret: <CRON_SECRET>`
 * 3. Query parameter `?secret=<CRON_SECRET>`
 * 4. Native Vercel Cron trigger header (`x-vercel-cron: "1"` or user-agent `vercel-cron`)
 * 5. Authenticated Super Admin JWT (via auth middleware req.user or inline JWT verification)
 */
const verifyBackupAuthorization = async (req: Request): Promise<boolean> => {
  const cronSecret = process.env.CRON_SECRET?.trim();

  const authHeader = req.headers.authorization;
  const bearerToken = authHeader?.startsWith("Bearer ")
    ? authHeader.slice(7).trim()
    : undefined;
  const headerSecret = (req.headers["x-cron-secret"] as string)?.trim();
  const querySecret = (req.query.secret as string)?.trim();

  // 1. Direct secret match against configured CRON_SECRET
  if (cronSecret && cronSecret.length >= 8) {
    const candidateSecrets = [bearerToken, headerSecret, querySecret].filter(
      Boolean,
    ) as string[];
    for (const candidate of candidateSecrets) {
      if (
        candidate.length === cronSecret.length &&
        crypto.timingSafeEqual(Buffer.from(cronSecret), Buffer.from(candidate))
      ) {
        return true;
      }
    }
  }

  // 2. Vercel Cron native invocation check (Vercel sets x-vercel-cron: "1" and user-agent vercel-cron)
  const isVercelCron =
    req.headers["x-vercel-cron"] === "1" ||
    (typeof req.headers["user-agent"] === "string" &&
      req.headers["user-agent"].includes("vercel-cron"));

  if (isVercelCron) {
    return true;
  }

  // 3. Authenticated Super Admin session from middleware
  if (req.user && req.user.role === "SUPER_ADMIN") {
    return true;
  }

  // 4. In case the route was called with a Super Admin JWT without middleware, verify token
  if (bearerToken && config.jwt.access_secret) {
    try {
      const decoded = jwt.verify(
        bearerToken,
        config.jwt.access_secret as string,
      ) as JwtPayload & { id?: string; role?: string };

      if (decoded?.id) {
        const user = await prisma.user.findUnique({
          where: { id: decoded.id },
          select: {
            status: true,
            isDeleted: true,
            role: { select: { name: true } },
          },
        });

        if (
          user &&
          !user.isDeleted &&
          user.status === "ACTIVE" &&
          user.role?.name === "SUPER_ADMIN"
        ) {
          return true;
        }
      }
    } catch {
      // not a valid JWT or not super admin
    }
  }

  return false;
};

export const triggerBackupController = catchAsync(
  async (req: Request, res: Response) => {
    const isAuthorized = await verifyBackupAuthorization(req);

    if (!isAuthorized) {
      res.status(httpStatus.UNAUTHORIZED).json({
        success: false,
        message:
          "Unauthorized: Valid CRON_SECRET (via Authorization Bearer, x-cron-secret header, or ?secret= param) or Super Admin authentication required",
      });
      return;
    }

    const data = await runDatabaseBackup();

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message:
        "Database backup completed and uploaded to Cloudflare R2 successfully",
      data,
    });
  },
);

export const listBackupsController = catchAsync(
  async (req: Request, res: Response) => {
    const isAuthorized = await verifyBackupAuthorization(req);

    if (!isAuthorized) {
      res.status(httpStatus.UNAUTHORIZED).json({
        success: false,
        message:
          "Unauthorized: Valid CRON_SECRET or Super Admin authentication required",
      });
      return;
    }

    const data = await listDatabaseBackups();

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Database backups retrieved successfully",
      data,
    });
  },
);
