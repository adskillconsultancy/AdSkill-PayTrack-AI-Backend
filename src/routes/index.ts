import { Router } from "express";
import { HealthRoutes } from "../modules/Health/health.route";
import { UserRoutes } from "../modules/User/user.route";
import { AuthRoutes } from "../modules/Auth/auth.route";
import { RoleRoutes } from "../modules/Role/role.route";
import { ServiceRoutes } from "../modules/Service/service.route";
import { UploadRoutes } from "../modules/Upload/upload.route";
import { ClientCaseRoutes } from "../modules/ClientCase/client-case.route";
import { PaymentPlanRoutes } from "../modules/PaymentPlan/payment-plan.route";
import { PaymentRoutes } from "../modules/Payment/payment.route";
import { InvoiceRoutes } from "../modules/Invoice/invoice.route";
import { ReceiptRoutes } from "../modules/Receipt/receipt.route";
import { CaseNoteRoutes } from "../modules/CaseNote/case-note.route";
import { ReportRoutes } from "../modules/Report/report.route";
import { SupportRoutes } from "../modules/Support/support.route";
import { AuditRoutes } from "../modules/Audit/audit.route";

const router = Router();

const moduleRoutes = [
  {
    path: "/health",
    route: HealthRoutes,
  },
  {
    path: "/auth",
    route: AuthRoutes,
  },
  {
    path: "/users",
    route: UserRoutes,
  },
  {
    path: "/roles",
    route: RoleRoutes,
  },
  {
    path: "/services",
    route: ServiceRoutes,
  },
  {
    path: "/uploads",
    route: UploadRoutes,
  },
  {
    path: "/client-cases",
    route: ClientCaseRoutes,
  },
  {
    path: "/payment-plans",
    route: PaymentPlanRoutes,
  },
  {
    path: "/payments",
    route: PaymentRoutes,
  },
  {
    path: "/invoices",
    route: InvoiceRoutes,
  },
  {
    path: "/receipts",
    route: ReceiptRoutes,
  },
  {
    path: "/case-notes",
    route: CaseNoteRoutes,
  },
  {
    path: "/reports",
    route: ReportRoutes,
  },
  {
    path: "/support",
    route: SupportRoutes,
  },
  {
    path: "/audit-logs",
    route: AuditRoutes,
  },
  // Upcoming modules:
  // { path: '/clients', route: ClientRoutes },
  // { path: '/payment-plans', route: PaymentPlanRoutes },
  // { path: '/payments', route: PaymentRoutes },
  // { path: '/invoices', route: InvoiceRoutes },
  // { path: '/notifications', route: NotificationRoutes },
  // { path: '/ai', route: AIRoutes },
];

moduleRoutes.forEach((route) => router.use(route.path, route.route));

export default router;
