import { Router } from "express";
import auth from "../../middlewares/auth";
import validateRequest from "../../middlewares/validateRequest";
import { PERMISSIONS } from "../User/user.constant";
import { ReportController } from "./report.controller";
import { ReportValidation } from "./report.validation";

const router = Router();

/**
 * POST /api/v1/reports
 * Generates an executive management report and returns KPIs + itemized ledger rows.
 * Gated by 'report:view' permission (Super Admin & Manager).
 */
router.post(
  "/",
  auth(PERMISSIONS.REPORT_VIEW),
  validateRequest(ReportValidation.generateReportSchema),
  ReportController.generateReport,
);

export const ReportRoutes = router;
