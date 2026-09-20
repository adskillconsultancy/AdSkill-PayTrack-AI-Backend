import { NextFunction, Request, Response, Router } from "express";
import httpStatus from "http-status";
import AppError from "../../errors/AppError";
import auth from "../../middlewares/auth";
import validateRequest from "../../middlewares/validateRequest";
import { ReportController } from "./report.controller";
import { ReportValidation } from "./report.validation";

const router = Router();

// Middleware: Strictly enforce Super Admin role authorization
const requireSuperAdmin = (req: Request, res: Response, next: NextFunction) => {
  if (req.user?.role !== "SUPER_ADMIN") {
    throw new AppError(
      httpStatus.FORBIDDEN,
      "Access denied. Executive management reports are exclusively restricted to Super Administrators.",
    );
  }
  next();
};

/**
 * POST /api/v1/reports
 * Generates an executive management report and returns KPIs + itemized ledger rows.
 * Restricted strictly to SUPER_ADMIN.
 */
router.post(
  "/",
  auth(),
  requireSuperAdmin,
  validateRequest(ReportValidation.generateReportSchema),
  ReportController.generateReport,
);

export const ReportRoutes = router;
