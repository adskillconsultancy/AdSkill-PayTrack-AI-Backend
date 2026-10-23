import { Router } from "express";
import auth from "../../middlewares/auth";
import validateRequest from "../../middlewares/validateRequest";
import { PERMISSIONS } from "./service.constant";
import { ServiceController } from "./service.controller";
import { ServiceValidation } from "./service.validation";

const router = Router();

// Create a new service offering (Requires 'service:create' or 'service:manage' permission; Super Admin)
router.post(
  "/",
  auth(PERMISSIONS.SERVICE_CREATE, PERMISSIONS.SERVICE_MANAGE),
  validateRequest(ServiceValidation.createServiceValidationSchema),
  ServiceController.createService,
);

// Get all service offerings (Requires 'service:read' permission; Super Admin, Manager, Consultant)
router.get(
  "/",
  auth(PERMISSIONS.SERVICE_READ),
  ServiceController.getAllServices,
);


// Get single service by ID (Requires 'service:read' permission)
router.get(
  "/:id",
  auth(PERMISSIONS.SERVICE_READ),
  ServiceController.getServiceById,
);

// Update service by ID (Requires 'service:update' or 'service:manage' permission; Super Admin)
router.patch(
  "/:id",
  auth(PERMISSIONS.SERVICE_UPDATE, PERMISSIONS.SERVICE_MANAGE),
  validateRequest(ServiceValidation.updateServiceValidationSchema),
  ServiceController.updateService,
);

// Soft delete service by ID (Requires 'service:delete' or 'service:manage' permission; Super Admin)
router.delete(
  "/:id",
  auth(PERMISSIONS.SERVICE_DELETE, PERMISSIONS.SERVICE_MANAGE),
  ServiceController.deleteService,
);

export const ServiceRoutes = router;
