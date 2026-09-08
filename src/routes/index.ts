import { Router } from 'express';
import { HealthRoutes } from '../modules/Health/health.route';
import { UserRoutes } from '../modules/User/user.route';

const router = Router();

const moduleRoutes = [
  {
    path: '/health',
    route: HealthRoutes,
  },
  {
    path: '/users',
    route: UserRoutes,
  },
  // Upcoming modules:
  // { path: '/auth', route: AuthRoutes },
  // { path: '/clients', route: ClientRoutes },
  // { path: '/services', route: ServiceRoutes },
  // { path: '/payment-plans', route: PaymentPlanRoutes },
  // { path: '/payments', route: PaymentRoutes },
  // { path: '/invoices', route: InvoiceRoutes },
  // { path: '/notifications', route: NotificationRoutes },
  // { path: '/audit-logs', route: AuditLogRoutes },
  // { path: '/ai', route: AIRoutes },
];

moduleRoutes.forEach((route) => router.use(route.path, route.route));

export default router;
