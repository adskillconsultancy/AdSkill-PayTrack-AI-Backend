import { Router } from "express";
import auth from "../../middlewares/auth";
import { AuditController } from "./audit.controller";

const router = Router();

/**
 * Audit Log Routes — Super Admin ONLY
 *
 * The auth() middleware with no arguments still validates the JWT and user session.
 * SUPER_ADMIN bypasses all permission checks (see auth.ts line 129).
 * All routes here effectively require SUPER_ADMIN because the route is guarded
 * with a specific "audit:read" permission, which only the SUPER_ADMIN role has.
 * Non-super-admin roles will receive 403 Forbidden.
 */

router.get("/", auth("audit:read"), AuditController.getAuditLogs);
router.get("/:id", auth("audit:read"), AuditController.getAuditLogById);

export const AuditRoutes = router;
