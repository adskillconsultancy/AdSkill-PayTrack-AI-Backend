import bcryptjs from "bcryptjs";
import httpStatus from "http-status";
import jwt, { JwtPayload, SignOptions } from "jsonwebtoken";
import config from "../../config";
import AppError from "../../errors/AppError";
import prisma from "../../lib/prisma";
import { sendMail, wrapEmailLayout } from "../../lib/mail";
import {
  generateBase32Secret,
  getOtpAuthUrl,
  verifyTotp,
} from "../../lib/totp.util";
import {
  TAuthResponse,
  TAuthUserResponse,
  TChangePasswordPayload,
  TDisableMfaPayload,
  TEnableMfaPayload,
  TForgotPasswordPayload,
  TLoginPayload,
  TRefreshTokenResponse,
  TRegisterPayload,
  TResetPasswordPayload,
  TUpdateProfilePayload,
  TVerifyMfaLoginPayload,
} from "./auth.interface";
import { AuditService } from "../Audit/audit.service";

// Safe user select definition for auth responses
const authUserSelect = {
  id: true,
  clientId: true,
  name: true,
  preferredName: true,
  email: true,
  phone: true,
  whatsapp: true,
  address: true,
  city: true,
  state: true,
  postalCode: true,
  country: true,
  status: true,
  isMfaEnabled: true,
  roleId: true,
  userPermissions: {
    where: { isDeleted: false, permission: { isDeleted: false } },
    select: {
      isRevoked: true,
      permission: {
        select: {
          name: true,
        },
      },
    },
  },
  role: {
    select: {
      id: true,
      name: true,
      isDeleted: true,
      rolePermissions: {
        where: { isDeleted: false, permission: { isDeleted: false } },
        select: {
          permission: {
            select: {
              name: true,
            },
          },
        },
      },
    },
  },
  isDeleted: true,
  deletedAt: true,
  createdAt: true,
  updatedAt: true,
};

// ==================== IN-MEMORY RATE LIMITER / LOGIN ATTEMPT SHIELD ====================
interface LoginAttemptRecord {
  count: number;
  lastAttempt: number;
  lockedUntil?: number;
}
const loginAttempts = new Map<string, LoginAttemptRecord>();
const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15 minutes

const checkLockout = (email: string) => {
  const record = loginAttempts.get(email);
  if (!record) return;

  if (record.lockedUntil && record.lockedUntil > Date.now()) {
    const remainingMinutes = Math.ceil(
      (record.lockedUntil - Date.now()) / (60 * 1000)
    );
    throw new AppError(
      httpStatus.TOO_MANY_REQUESTS,
      `Account is temporarily locked due to repeated failed login attempts. Please try again in ${remainingMinutes} minute(s) or reset your password.`
    );
  } else if (record.lockedUntil && record.lockedUntil <= Date.now()) {
    loginAttempts.delete(email);
  }
};

const recordFailedAttempt = (email: string) => {
  const now = Date.now();
  const record = loginAttempts.get(email) || { count: 0, lastAttempt: now };
  record.count += 1;
  record.lastAttempt = now;

  if (record.count >= MAX_FAILED_ATTEMPTS) {
    record.lockedUntil = now + LOCKOUT_DURATION_MS;
  }
  loginAttempts.set(email, record);
};

const clearFailedAttempts = (email: string) => {
  loginAttempts.delete(email);
};

// Helper to sanitize and format user object for responses
const formatAuthUser = (user: any): TAuthUserResponse => {
  const rolePermissions =
    user.role?.rolePermissions?.map(
      (rp: { permission: { name: string } }) => rp.permission.name
    ) || [];

  const directGranted =
    user.userPermissions
      ?.filter((up: { isRevoked: boolean; permission: { name: string } }) => !up.isRevoked)
      .map((up: { isRevoked: boolean; permission: { name: string } }) => up.permission.name) || [];

  const directRevoked = new Set(
    user.userPermissions
      ?.filter((up: { isRevoked: boolean; permission: { name: string } }) => up.isRevoked)
      .map((up: { isRevoked: boolean; permission: { name: string } }) => up.permission.name) || []
  );

  const combinedPerms = Array.from(new Set([...rolePermissions, ...directGranted]));
  const permissions = combinedPerms.filter((permName) => !directRevoked.has(permName));

  return {
    id: user.id,
    clientId: user.clientId ?? null,
    name: user.name,
    preferredName: user.preferredName ?? null,
    email: user.email,
    phone: user.phone ?? null,
    whatsapp: user.whatsapp ?? null,
    address: user.address ?? null,
    city: user.city ?? null,
    state: user.state ?? null,
    postalCode: user.postalCode ?? null,
    country: user.country ?? null,
    status: user.status,
    isMfaEnabled: user.isMfaEnabled,
    roleId: user.roleId,
    role: {
      id: user.role.id,
      name: user.role.name,
    },
    permissions,
    isDeleted: user.isDeleted,
    deletedAt: user.deletedAt ?? null,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
};

// Helper to generate a unique Client ID (e.g. ASK-2026-1042)
const generateClientId = async (): Promise<string> => {
  const currentYear = new Date().getFullYear();
  let isUnique = false;
  let clientId = "";
  let attempts = 0;
  const maxAttempts = 10;

  while (!isUnique && attempts < maxAttempts) {
    attempts++;
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    clientId = `ASK-${currentYear}-${randomSuffix}`;
    const existing = await prisma.user.findFirst({
      where: { clientId },
      select: { id: true },
    });
    if (!existing) {
      isUnique = true;
    }
  }

  if (!isUnique) {
    clientId = `ASK-${currentYear}-${Date.now().toString().slice(-4)}`;
  }

  return clientId;
};

// Helper to generate an Access Token
const generateAccessToken = (payload: {
  id: string;
  email: string;
  role: string;
}): string => {
  const accessSignOptions: SignOptions = {
    expiresIn: config.jwt.access_expires_in as SignOptions["expiresIn"],
  };
  return jwt.sign(
    payload,
    config.jwt.access_secret as string,
    accessSignOptions
  );
};

// Helper to generate both Access and Refresh tokens
const generateTokens = (payload: {
  id: string;
  email: string;
  role: string;
}) => {
  const accessToken = generateAccessToken(payload);
  const refreshSignOptions: SignOptions = {
    expiresIn: config.jwt.refresh_expires_in as SignOptions["expiresIn"],
  };

  const refreshToken = jwt.sign(
    { id: payload.id, email: payload.email },
    config.jwt.refresh_secret as string,
    refreshSignOptions
  );

  return { accessToken, refreshToken };
};

const register = async (payload: TRegisterPayload): Promise<TAuthResponse> => {
  const existingUser = await prisma.user.findUnique({
    where: { email: payload.email.toLowerCase().trim() },
  });

  if (existingUser) {
    throw new AppError(
      httpStatus.CONFLICT,
      "A user with this email address already exists"
    );
  }

  const clientRole = await prisma.userRole.findFirst({
    where: { name: "CLIENT", isDeleted: false },
  });

  if (!clientRole) {
    throw new AppError(
      httpStatus.INTERNAL_SERVER_ERROR,
      "Default CLIENT role is not initialized in the database. Please run seeding."
    );
  }

  const hashedPassword = await bcryptjs.hash(
    payload.password,
    config.bcrypt_salt_rounds
  );

  const clientId = await generateClientId();
  const { password: rawPassword, ...userData } = payload;

  const user = await prisma.user.create({
    data: {
      ...userData,
      email: payload.email.toLowerCase().trim(),
      password: hashedPassword,
      clientId,
      roleId: clientRole.id,
      status: "ACTIVE",
      isDeleted: false,
    },
    select: authUserSelect,
  });

  const { accessToken, refreshToken } = generateTokens({
    id: user.id,
    email: user.email,
    role: user.role.name,
  });

  AuditService.writeAuditLog({
    actorId: user.id,
    actorEmail: user.email,
    action: "REGISTER",
    targetEntity: "User",
    targetId: user.id,
    afterValue: {
      email: user.email,
      name: user.name,
      role: user.role?.name,
      clientId: user.clientId,
    },
  });

  return {
    accessToken,
    refreshToken,
    user: formatAuthUser(user),
  };
};

const login = async (payload: TLoginPayload): Promise<TAuthResponse> => {
  const normalizedEmail = payload.email.toLowerCase().trim();

  // 1. Check rate-limiting / account lockout
  checkLockout(normalizedEmail);

  // 2. Find user by email
  const user = await prisma.user.findUnique({
    where: { email: normalizedEmail },
    select: {
      ...authUserSelect,
      password: true,
      mfaSecret: true,
      isDeleted: true,
    },
  });

  if (!user || user.isDeleted || user.role?.isDeleted) {
    recordFailedAttempt(normalizedEmail);
    AuditService.writeAuditLog({
      actorEmail: normalizedEmail,
      action: "LOGIN_FAILED",
      targetEntity: "User",
      targetId: "unknown",
      reason: "Account not found or inactive",
    });
    throw new AppError(httpStatus.UNAUTHORIZED, "Invalid email or password");
  }

  // 3. Account status check
  if (user.status !== "ACTIVE") {
    AuditService.writeAuditLog({
      actorId: user.id,
      actorEmail: user.email,
      action: "LOGIN_BLOCKED",
      targetEntity: "User",
      targetId: user.id,
      reason: `Account status is ${user.status}`,
    });
    throw new AppError(
      httpStatus.FORBIDDEN,
      `Your account is currently ${user.status.toLowerCase()}. Please contact AdSkill support.`
    );
  }

  // 4. Verify password
  const isPasswordMatched = await bcryptjs.compare(
    payload.password,
    user.password
  );

  if (!isPasswordMatched) {
    recordFailedAttempt(normalizedEmail);
    AuditService.writeAuditLog({
      actorId: user.id,
      actorEmail: user.email,
      action: "LOGIN_FAILED",
      targetEntity: "User",
      targetId: user.id,
      reason: "Incorrect password",
    });
    throw new AppError(httpStatus.UNAUTHORIZED, "Invalid email or password");
  }

  // Password matched -> clear failed attempt counter
  clearFailedAttempts(normalizedEmail);

  // 5. MFA ENFORCEMENT CHECK (Section 15 Specification)
  if (user.isMfaEnabled && user.mfaSecret) {
    if (payload.mfaCode) {
      const isValidTotp = verifyTotp(payload.mfaCode, user.mfaSecret);
      if (!isValidTotp) {
        AuditService.writeAuditLog({
          actorId: user.id,
          actorEmail: user.email,
          action: "MFA_FAILED",
          targetEntity: "User",
          targetId: user.id,
          reason: "Invalid TOTP code",
        });
        throw new AppError(
          httpStatus.UNAUTHORIZED,
          "Invalid Multi-Factor Authentication (MFA) verification code"
        );
      }
    } else {
      // Prompt client for MFA code using short-lived session token (5 minutes)
      const mfaToken = jwt.sign(
        { id: user.id, email: user.email, pendingMfa: true },
        config.jwt.access_secret as string,
        { expiresIn: "5m" }
      );

      return {
        mfaRequired: true,
        mfaToken,
      };
    }
  }

  // 6. Generate final tokens & write audit log
  const { accessToken, refreshToken } = generateTokens({
    id: user.id,
    email: user.email,
    role: user.role.name,
  });

  AuditService.writeAuditLog({
    actorId: user.id,
    actorEmail: user.email,
    action: "LOGIN_SUCCESS",
    targetEntity: "User",
    targetId: user.id,
    afterValue: {
      email: user.email,
      role: user.role?.name,
    },
  });

  return {
    accessToken,
    refreshToken,
    user: formatAuthUser(user),
  };
};

const verifyMfaLogin = async (
  payload: TVerifyMfaLoginPayload
): Promise<TAuthResponse> => {
  let decoded: JwtPayload;
  try {
    decoded = jwt.verify(
      payload.mfaToken,
      config.jwt.access_secret as string
    ) as JwtPayload;
  } catch (error) {
    throw new AppError(
      httpStatus.FORBIDDEN,
      "MFA verification session has expired. Please sign in again."
    );
  }

  if (!decoded?.pendingMfa || !decoded?.id) {
    throw new AppError(httpStatus.BAD_REQUEST, "Invalid MFA session token");
  }

  const user = await prisma.user.findUnique({
    where: { id: decoded.id },
    select: {
      ...authUserSelect,
      mfaSecret: true,
    },
  });

  if (!user || user.isDeleted || !user.isMfaEnabled || !user.mfaSecret) {
    throw new AppError(
      httpStatus.UNAUTHORIZED,
      "User account invalid or MFA not configured"
    );
  }

  const isValid = verifyTotp(payload.code, user.mfaSecret);
  if (!isValid) {
    AuditService.writeAuditLog({
      actorId: user.id,
      actorEmail: user.email,
      action: "MFA_LOGIN_FAILED",
      targetEntity: "User",
      targetId: user.id,
      reason: "Invalid TOTP verification code",
    });
    throw new AppError(
      httpStatus.UNAUTHORIZED,
      "Invalid Multi-Factor Authentication (MFA) verification code"
    );
  }

  const { accessToken, refreshToken } = generateTokens({
    id: user.id,
    email: user.email,
    role: user.role.name,
  });

  AuditService.writeAuditLog({
    actorId: user.id,
    actorEmail: user.email,
    action: "MFA_LOGIN_SUCCESS",
    targetEntity: "User",
    targetId: user.id,
  });

  return {
    accessToken,
    refreshToken,
    user: formatAuthUser(user),
  };
};

// MFA Self-Service Setup
const setupMfa = async (userId: string) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, isMfaEnabled: true },
  });

  if (!user) throw new AppError(httpStatus.NOT_FOUND, "User not found");

  const secret = generateBase32Secret(20);
  const otpAuthUrl = getOtpAuthUrl(user.email, secret);

  return {
    secret,
    otpAuthUrl,
    instructions:
      "Enter this secret key or scan the otpauth URI in Google Authenticator, Authy, or Apple Passwords, then submit a 6-digit verification code to activate MFA.",
  };
};

const enableMfa = async (userId: string, payload: TEnableMfaPayload) => {
  const isValid = verifyTotp(payload.code, payload.secret);
  if (!isValid) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      "Invalid verification code. Please confirm the time on your authenticator device."
    );
  }

  await prisma.user.update({
    where: { id: userId },
    data: {
      isMfaEnabled: true,
      mfaSecret: payload.secret,
    },
  });

  AuditService.writeAuditLog({
    actorId: userId,
    action: "ENABLE_MFA",
    targetEntity: "User",
    targetId: userId,
  });

  return { message: "Multi-Factor Authentication enabled successfully" };
};

const disableMfa = async (userId: string, payload: TDisableMfaPayload) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, password: true },
  });
  if (!user) throw new AppError(httpStatus.NOT_FOUND, "User not found");

  const isMatch = await bcryptjs.compare(payload.password, user.password);
  if (!isMatch) {
    throw new AppError(httpStatus.UNAUTHORIZED, "Current password does not match");
  }

  await prisma.user.update({
    where: { id: userId },
    data: {
      isMfaEnabled: false,
      mfaSecret: null,
    },
  });

  AuditService.writeAuditLog({
    actorId: userId,
    action: "DISABLE_MFA",
    targetEntity: "User",
    targetId: userId,
  });

  return { message: "Multi-Factor Authentication disabled successfully" };
};

// ==================== FORGOT & RESET PASSWORD ====================
const forgotPassword = async (payload: TForgotPasswordPayload) => {
  const normalizedEmail = payload.email.toLowerCase().trim();
  const user = await prisma.user.findUnique({
    where: { email: normalizedEmail },
    select: { id: true, email: true, name: true, status: true, isDeleted: true },
  });

  // Always return consistent message to prevent account enumeration
  if (!user || user.isDeleted || user.status !== "ACTIVE") {
    return {
      message:
        "If that email address is registered, a password reset link has been dispatched to your inbox.",
    };
  }

  const resetToken = jwt.sign(
    { id: user.id, email: user.email, type: "PASSWORD_RESET" },
    config.jwt.access_secret as string,
    { expiresIn: "1h" }
  );

  const portalBase = config.client_url || "http://localhost:3000";
  const resetUrl = `${portalBase}/reset-password?token=${resetToken}`;

  const emailHtml = wrapEmailLayout(
    "Password Reset Request",
    `
    <div class="badge badge-info">Security Notification</div>
    <h1 class="h1">Hello ${user.name},</h1>
    <p>We received a request to reset your password for your AdSkill PayTrack account.</p>
    <p>Click the link below to enter a new password. This reset link is cryptographically protected and expires in 1 hour.</p>
    <div style="margin: 25px 0;">
      <a href="${resetUrl}" class="btn">Reset My Password</a>
    </div>
    <p style="font-size: 12px; color: #666;">If you did not request this password change, no action is required and your account remains safe.</p>
    `
  );

  sendMail({
    to: user.email,
    subject: "Reset Your Password - AdSkill PayTrack",
    html: emailHtml,
    templateName: "PASSWORD_RESET",
    metadata: { userId: user.id },
  }).catch((err) => console.error("[MAIL_ERROR] forgotPassword:", err));

  AuditService.writeAuditLog({
    actorId: user.id,
    actorEmail: user.email,
    action: "FORGOT_PASSWORD_REQUESTED",
    targetEntity: "User",
    targetId: user.id,
  });

  return {
    message:
      "If that email address is registered, a password reset link has been dispatched to your inbox.",
  };
};

const resetPassword = async (payload: TResetPasswordPayload) => {
  let decoded: JwtPayload;
  try {
    decoded = jwt.verify(
      payload.token,
      config.jwt.access_secret as string
    ) as JwtPayload;
  } catch (error) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      "Password reset link is invalid or has expired. Please request a new one."
    );
  }

  if (decoded?.type !== "PASSWORD_RESET" || !decoded?.id) {
    throw new AppError(httpStatus.BAD_REQUEST, "Invalid password reset token");
  }

  const user = await prisma.user.findUnique({
    where: { id: decoded.id },
    select: { id: true, email: true, isDeleted: true, status: true },
  });

  if (!user || user.isDeleted || user.status !== "ACTIVE") {
    throw new AppError(httpStatus.NOT_FOUND, "User account not found or inactive");
  }

  const hashedPassword = await bcryptjs.hash(
    payload.newPassword,
    config.bcrypt_salt_rounds
  );

  await prisma.user.update({
    where: { id: user.id },
    data: { password: hashedPassword },
  });

  clearFailedAttempts(user.email);

  AuditService.writeAuditLog({
    actorId: user.id,
    actorEmail: user.email,
    action: "PASSWORD_RESET_SUCCESS",
    targetEntity: "User",
    targetId: user.id,
  });

  return {
    message:
      "Password has been reset successfully. You can now sign in with your new password.",
  };
};

const refreshToken = async (token: string): Promise<TRefreshTokenResponse> => {
  if (!token) {
    throw new AppError(httpStatus.UNAUTHORIZED, "Refresh token is required");
  }

  let decoded: JwtPayload;
  try {
    decoded = jwt.verify(
      token,
      config.jwt.refresh_secret as string
    ) as JwtPayload;
  } catch (error) {
    throw new AppError(
      httpStatus.FORBIDDEN,
      "Invalid or expired refresh token"
    );
  }

  const { id } = decoded;

  const user = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      email: true,
      status: true,
      isDeleted: true,
      role: {
        select: {
          name: true,
          isDeleted: true,
        },
      },
    },
  });

  if (!user || user.isDeleted || user.role?.isDeleted) {
    throw new AppError(
      httpStatus.UNAUTHORIZED,
      "User account no longer exists or role is inactive"
    );
  }

  if (user.status !== "ACTIVE") {
    throw new AppError(
      httpStatus.FORBIDDEN,
      `Your account is ${user.status.toLowerCase()}. Please contact support.`
    );
  }

  const newAccessToken = generateAccessToken({
    id: user.id,
    email: user.email,
    role: user.role.name,
  });

  return {
    accessToken: newAccessToken,
  };
};

const getMe = async (userId: string): Promise<TAuthUserResponse> => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: authUserSelect,
  });

  if (!user || user.isDeleted || user.role?.isDeleted) {
    throw new AppError(httpStatus.NOT_FOUND, "User profile not found");
  }

  if (user.status !== "ACTIVE") {
    throw new AppError(
      httpStatus.FORBIDDEN,
      `Your account is ${user.status.toLowerCase()}. Please contact support.`
    );
  }

  return formatAuthUser(user);
};

const updateProfile = async (
  userId: string,
  payload: TUpdateProfilePayload
): Promise<TAuthUserResponse> => {
  const existing = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, isDeleted: true, status: true },
  });

  if (!existing || existing.isDeleted) {
    throw new AppError(httpStatus.NOT_FOUND, "User profile not found");
  }

  if (existing.status !== "ACTIVE") {
    throw new AppError(
      httpStatus.FORBIDDEN,
      `Your account is ${existing.status.toLowerCase()}. Please contact support.`
    );
  }

  const updated = await prisma.user.update({
    where: { id: userId },
    data: {
      ...(payload.name !== undefined && { name: payload.name.trim() }),
      ...(payload.preferredName !== undefined && {
        preferredName: payload.preferredName?.trim() || null,
      }),
      ...(payload.phone !== undefined && { phone: payload.phone?.trim() || null }),
      ...(payload.whatsapp !== undefined && {
        whatsapp: payload.whatsapp?.trim() || null,
      }),
      ...(payload.address !== undefined && {
        address: payload.address?.trim() || null,
      }),
      ...(payload.city !== undefined && { city: payload.city?.trim() || null }),
      ...(payload.state !== undefined && { state: payload.state?.trim() || null }),
      ...(payload.postalCode !== undefined && {
        postalCode: payload.postalCode?.trim() || null,
      }),
      ...(payload.country !== undefined && {
        country: payload.country?.trim() || null,
      }),
    },
    select: authUserSelect,
  });

  AuditService.writeAuditLog({
    actorId: userId,
    actorEmail: updated.email,
    action: "UPDATE_PROFILE",
    targetEntity: "User",
    targetId: userId,
    afterValue: {
      name: updated.name,
      email: updated.email,
      phone: updated.phone,
      whatsapp: updated.whatsapp,
      country: updated.country,
    },
  });

  return formatAuthUser(updated);
};

const changePassword = async (
  userId: string,
  payload: TChangePasswordPayload
) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, password: true, isDeleted: true, status: true },
  });

  if (!user || user.isDeleted) {
    throw new AppError(httpStatus.NOT_FOUND, "User not found");
  }

  if (user.status !== "ACTIVE") {
    throw new AppError(
      httpStatus.FORBIDDEN,
      `Your account is ${user.status.toLowerCase()}. Please contact support.`
    );
  }

  const isMatch = await bcryptjs.compare(payload.currentPassword, user.password);
  if (!isMatch) {
    AuditService.writeAuditLog({
      actorId: userId,
      actorEmail: user.email,
      action: "PASSWORD_CHANGE_FAILED",
      targetEntity: "User",
      targetId: userId,
      reason: "Current password mismatch",
    });
    throw new AppError(httpStatus.UNAUTHORIZED, "Current password does not match");
  }

  const hashedPassword = await bcryptjs.hash(
    payload.newPassword,
    config.bcrypt_salt_rounds
  );

  await prisma.user.update({
    where: { id: userId },
    data: { password: hashedPassword },
  });

  AuditService.writeAuditLog({
    actorId: userId,
    actorEmail: user.email,
    action: "PASSWORD_CHANGE",
    targetEntity: "User",
    targetId: userId,
  });

  return { message: "Password updated successfully" };
};

export const AuthService = {
  register,
  login,
  verifyMfaLogin,
  setupMfa,
  enableMfa,
  disableMfa,
  forgotPassword,
  resetPassword,
  refreshToken,
  getMe,
  updateProfile,
  changePassword,
};
