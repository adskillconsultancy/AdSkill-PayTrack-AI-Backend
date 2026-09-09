import { Router } from 'express';
import auth from '../../middlewares/auth';
import validateRequest from '../../middlewares/validateRequest';
import { UserController } from './user.controller';
import { UserValidation } from './user.validation';
import { PERMISSIONS } from './user.constant';

const router = Router();

// Create new user (Requires 'user:create' permission; Super Admin & Manager)
router.post(
  '/',
  auth(PERMISSIONS.USER_CREATE),
  validateRequest(UserValidation.createUserValidationSchema),
  UserController.createUser,
);

// Get all users (Requires 'user:read' permission; Super Admin, Manager, Consultant)
router.get(
  '/',
  auth(PERMISSIONS.USER_READ),
  UserController.getAllUsers,
);

// Get single user by ID (Requires 'user:read' permission)
router.get(
  '/:id',
  auth(PERMISSIONS.USER_READ),
  UserController.getUserById,
);

// Update user by ID (Requires 'user:update' permission; Super Admin & Manager)
router.patch(
  '/:id',
  auth(PERMISSIONS.USER_UPDATE),
  validateRequest(UserValidation.updateUserValidationSchema),
  UserController.updateUser,
);

// Delete user by ID (Soft delete - Requires 'user:delete' permission; Super Admin)
router.delete(
  '/:id',
  auth(PERMISSIONS.USER_DELETE),
  UserController.deleteUser,
);

export const UserRoutes = router;
