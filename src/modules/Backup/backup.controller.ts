import crypto from "crypto";
import { Request, Response } from "express";
import httpStatus from "http-status";
import catchAsync from "../../shared/catchAsync";
import sendResponse from "../../shared/sendResponse";
import { runDatabaseBackup } from "./backup.service";

export const triggerBackupController = catchAsync(
  async (req: Request, res: Response) => {
    const cronSecret = process.env.CRON_SECRET;
    const providedSecret = (req.headers["x-cron-secret"] as string) || (req.query.secret as string);

    let isAuthorized = false;

    // 1. Verify against valid non-empty CRON_SECRET if configured
    if (cronSecret && cronSecret.length >= 8 && providedSecret) {
      if (cronSecret.length === providedSecret.length) {
        isAuthorized = crypto.timingSafeEqual(
          Buffer.from(cronSecret),
          Buffer.from(providedSecret),
        );
      }
    }

    // 2. Or allow authenticated Super Admin session
    if (!isAuthorized && req.user && req.user.role === "SUPER_ADMIN") {
      isAuthorized = true;
    }

    if (!isAuthorized) {
      res.status(httpStatus.UNAUTHORIZED).json({
        success: false,
        message: "Unauthorized: Valid cron secret or Super Admin authentication required",
      });
      return;
    }

    const data = await runDatabaseBackup();

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Database backup completed and uploaded to Cloudflare R2 successfully",
      data,
    });
  },
);
