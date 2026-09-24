import { Request, Response } from "express";
import httpStatus from "http-status";
import catchAsync from "../../shared/catchAsync";
import sendResponse from "../../shared/sendResponse";
import { runDatabaseBackup } from "./backup.service";

export const triggerBackupController = catchAsync(
  async (req: Request, res: Response) => {
    // Check for optional CRON_SECRET or staff/super-admin role if authenticated
    const cronSecret = process.env.CRON_SECRET;
    const providedSecret = req.headers["x-cron-secret"] || req.query.secret;

    if (cronSecret && providedSecret !== cronSecret && process.env.NODE_ENV === "production") {
      res.status(httpStatus.UNAUTHORIZED).json({
        success: false,
        message: "Unauthorized: Invalid cron secret",
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
