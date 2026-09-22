import { Router } from "express";
import auth from "../../middlewares/auth";
import validateRequest from "../../middlewares/validateRequest";
import { PERMISSIONS } from "../User/user.constant";
import { DashboardController } from "./dashboard.controller";
import { DashboardValidation } from "./dashboard.validation";

const router = Router();

/**
 * GET /api/v1/dashboard/client-summary
 * Real-time client dashboard summary: active case, financial standing, schedule,
 * payment history, and downloadable invoices and receipts.
 * Accessible by any authenticated client (or staff).
 */
router.get("/client-summary", auth(), DashboardController.getClientSummary);

// Apply PBAC authorization to executive CRM dashboard endpoints below
router.use(auth(PERMISSIONS.DASHBOARD_VIEW, PERMISSIONS.REPORT_VIEW));

/**
 * GET /api/v1/dashboard/kpis
 * Executive KPI summary cards (Revenue, Pending, Receivables, Clients, Cases)
 */
router.get(
  "/kpis",
  validateRequest(DashboardValidation.dashboardFilterSchema),
  DashboardController.getKPIs,
);

/**
 * GET /api/v1/dashboard/payment-analytics
 * Payment status distribution, method breakdown, and daily cash flow trends
 */
router.get(
  "/payment-analytics",
  validateRequest(DashboardValidation.dashboardFilterSchema),
  DashboardController.getPaymentAnalytics,
);

/**
 * GET /api/v1/dashboard/client-growth
 * Client registrations & case intake metrics with service category breakdown
 */
router.get(
  "/client-growth",
  validateRequest(DashboardValidation.dashboardFilterSchema),
  DashboardController.getClientGrowth,
);

/**
 * GET /api/v1/dashboard/verification-queue
 * Live pending offline payments awaiting Super Admin review
 */
router.get(
  "/verification-queue",
  validateRequest(DashboardValidation.limitQuerySchema),
  DashboardController.getVerificationQueue,
);

/**
 * GET /api/v1/dashboard/case-distribution
 * Distribution of cases across lifecycle statuses and financial health
 */
router.get(
  "/case-distribution",
  validateRequest(DashboardValidation.dashboardFilterSchema),
  DashboardController.getCaseDistribution,
);

/**
 * GET /api/v1/dashboard/recent-activity
 * Live operational audit events stream
 */
router.get(
  "/recent-activity",
  validateRequest(DashboardValidation.limitQuerySchema),
  DashboardController.getRecentActivity,
);

export const DashboardRoutes = router;
