import { Router } from "express";
import auth from "../../middlewares/auth";
import validateRequest from "../../middlewares/validateRequest";
import { PERMISSIONS } from "../User/user.constant";
import { RoleController } from "./role.controller";
import { RoleValidation } from "./role.validation";

const router = Router();

// Get all system permissions grouped by module (for admin capability matrix UI)
router.get(
  "/permissions/all",
  auth(PERMISSIONS.USER_MANAGE_ROLE),
  RoleController.getAllPermissions,
);

// Get all roles with their assigned permissions from DB
router.get(
  "/",
  auth(
    PERMISSIONS.USER_MANAGE_ROLE,
    PERMISSIONS.USER_CREATE,
    PERMISSIONS.USER_READ,
  ),
  RoleController.getAllRoles,
);

// Create a new dynamic role
router.post(
  "/",
  auth(PERMISSIONS.USER_MANAGE_ROLE),
  validateRequest(RoleValidation.createRoleZodSchema),
  RoleController.createRole,
);

// Get single role details by ID
router.get(
  "/:id",
  auth(PERMISSIONS.USER_MANAGE_ROLE),
  RoleController.getRoleById,
);

// Update/assign permissions for a role (checkbox matrix submit)
router.patch(
  "/:id/permissions",
  auth(PERMISSIONS.USER_MANAGE_ROLE),
  validateRequest(RoleValidation.updateRolePermissionsZodSchema),
  RoleController.updateRolePermissions,
);

// Soft delete a custom dynamic role
router.delete(
  "/:id",
  auth(PERMISSIONS.USER_MANAGE_ROLE),
  RoleController.deleteRole,
);

export const RoleRoutes = router;
