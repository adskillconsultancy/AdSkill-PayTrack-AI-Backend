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
  AuthController.register
);

// Public User Authentication & Login (with Rate Limiting & MFA Challenge)
router.post(
  "/login",
  validateRequest(AuthValidation.loginValidationSchema),
  AuthController.login
);

// Verify MFA TOTP Code during login
router.post(
  "/mfa/login-verify",
  validateRequest(AuthValidation.verifyMfaLoginValidationSchema),
  AuthController.verifyMfaLogin
);

// Authenticated MFA Self-Service Setup
router.post("/mfa/setup", auth(), AuthController.setupMfa);

// Authenticated MFA Activation
router.post(
  "/mfa/enable",
  auth(),
  validateRequest(AuthValidation.enableMfaValidationSchema),
  AuthController.enableMfa
);

// Authenticated MFA Deactivation
router.post(
  "/mfa/disable",
  auth(),
  validateRequest(AuthValidation.disableMfaValidationSchema),
  AuthController.disableMfa
);

// Public Forgot Password Request (Dispatches reset link via email)
router.post(
  "/forgot-password",
  validateRequest(AuthValidation.forgotPasswordValidationSchema),
  AuthController.forgotPassword
);

// Public Reset Password Submission (Cryptographic token verification)
router.post(
  "/reset-password",
  validateRequest(AuthValidation.resetPasswordValidationSchema),
  AuthController.resetPassword
);

// Refresh Access Token
router.post(
  "/refresh-token",
  validateRequest(AuthValidation.refreshTokenValidationSchema),
  AuthController.refreshToken
);

// Get Current Authenticated User Profile & Permissions
router.get("/me", auth(), AuthController.getMe);

// Update Authenticated User's Personal Profile Info
router.patch(
  "/profile",
  auth(),
  validateRequest(AuthValidation.updateProfileValidationSchema),
  AuthController.updateProfile
);

// Change Password for Authenticated User
router.post(
  "/change-password",
  auth(),
  validateRequest(AuthValidation.changePasswordValidationSchema),
  AuthController.changePassword
);

export const AuthRoutes = router;
