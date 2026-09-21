import { Router } from "express";
import auth from "../../middlewares/auth";
import validateRequest from "../../middlewares/validateRequest";
import { AuthController } from "./auth.controller";
import { AuthValidation } from "./auth.validation";

const router = Router();

// Public Client Self-Registration (Strictly registers as CLIENT)
router.post(
  "/register",
  validateRequest(AuthValidation.registerValidationSchema),
  AuthController.register,
);

// Public User Authentication & Login
router.post(
  "/login",
  validateRequest(AuthValidation.loginValidationSchema),
  AuthController.login,
);

// Refresh Access Token
router.post(
  "/refresh-token",
  validateRequest(AuthValidation.refreshTokenValidationSchema),
  AuthController.refreshToken,
);

// Get Current Authenticated User Profile & Permissions
router.get("/me", auth(), AuthController.getMe);

// Update Authenticated User's Personal Profile Info
router.patch(
  "/profile",
  auth(),
  validateRequest(AuthValidation.updateProfileValidationSchema),
  AuthController.updateProfile,
);

// Change Password for Authenticated User
router.post(
  "/change-password",
  auth(),
  validateRequest(AuthValidation.changePasswordValidationSchema),
  AuthController.changePassword,
);

export const AuthRoutes = router;
