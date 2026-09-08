import { Router } from 'express';
import { UserRole } from '@prisma/client';
import auth from '../../middlewares/auth';
import validateRequest from '../../middlewares/validateRequest';
import { UserController } from './user.controller';
import { UserValidation } from './user.validation';

const router = Router();

// Create new user
router.post(
  '/',
  validateRequest(UserValidation.createUserValidationSchema),
  UserController.createUser,
);

// Get all users (Staff only)
router.get(
  '/',
  auth(UserRole.SUPER_ADMIN, UserRole.FINANCE_MANAGER),
  UserController.getAllUsers,
);

// Get single user by ID
router.get(
  '/:id',
  auth(
    UserRole.SUPER_ADMIN,
    UserRole.FINANCE_MANAGER,
    UserRole.CASE_MANAGER,
    UserRole.CLIENT,
  ),
  UserController.getUserById,
);

// Update user by ID
router.patch(
  '/:id',
  auth(UserRole.SUPER_ADMIN, UserRole.FINANCE_MANAGER),
  validateRequest(UserValidation.updateUserValidationSchema),
  UserController.updateUser,
);

// Delete user by ID (Super Admin only)
router.delete(
  '/:id',
  auth(UserRole.SUPER_ADMIN),
  UserController.deleteUser,
);

export const UserRoutes = router;
