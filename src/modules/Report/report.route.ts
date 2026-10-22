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

/**
 * GET /api/v1/reports
 * Returns executive overview report
 */
router.get(
  "/",
  auth(PERMISSIONS.REPORT_VIEW),
  ReportController.getReportOverview,
);

/**
 * POST /api/v1/reports/staff-performance
 * Returns comprehensive staff workload, leads, client updates, collections, and expense attribution matrix.
 */
router.post(
  "/staff-performance",
  auth(PERMISSIONS.REPORT_VIEW),
  validateRequest(ReportValidation.staffPerformanceSchema),
  ReportController.getStaffPerformanceReport,
);

/**
 * GET /api/v1/reports/staff-performance
 * Query param variant for fast dashboard fetching
 */
router.get(
  "/staff-performance",
  auth(PERMISSIONS.REPORT_VIEW),
  ReportController.getStaffPerformanceReport,
);

/**
 * GET /api/v1/reports/staff-performance/:staffId/timeline
 * Returns detailed chronological activities for a staff member during the selected window.
 */
router.get(
  "/staff-performance/:staffId/timeline",
  auth(PERMISSIONS.REPORT_VIEW),
  ReportController.getStaffPerformanceTimeline,
);

export const ReportRoutes = router;

