import { Router } from "express";
import { HealthRoutes } from "../modules/Health/health.route";
import { UserRoutes } from "../modules/User/user.route";
import { AuthRoutes } from "../modules/Auth/auth.route";
import { RoleRoutes } from "../modules/Role/role.route";
import { ServiceRoutes } from "../modules/Service/service.route";
import { UploadRoutes } from "../modules/Upload/upload.route";

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
