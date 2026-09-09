import { Router } from 'express';
import auth from '../../middlewares/auth';
import validateRequest from '../../middlewares/validateRequest';
import { UserController } from './user.controller';
import { UserValidation } from './user.validation';
import { USER_ROLES } from './user.constant';

const router = Router();

// Create new user (Public registration defaults to CLIENT; staff can create with role)
router.post(
  '/',
  validateRequest(UserValidation.createUserValidationSchema),
  UserController.createUser,
);

// Get all users (Super Admin & Manager only)
router.get(
  '/',
  auth(USER_ROLES.SUPER_ADMIN, USER_ROLES.MANAGER),
  UserController.getAllUsers,
);

// Get single user by ID
router.get(
  '/:id',
  auth(
    USER_ROLES.SUPER_ADMIN,
    USER_ROLES.MANAGER,
    USER_ROLES.CONSULTANT,
    USER_ROLES.CLIENT,
  ),
  UserController.getUserById,
);

// Update user by ID (Super Admin & Manager)
router.patch(
  '/:id',
  auth(USER_ROLES.SUPER_ADMIN, USER_ROLES.MANAGER),
  validateRequest(UserValidation.updateUserValidationSchema),
  UserController.updateUser,
);

// Delete user by ID (Soft delete - Super Admin only)
router.delete(
  '/:id',
  auth(USER_ROLES.SUPER_ADMIN),
  UserController.deleteUser,
);

export const UserRoutes = router;
