import bcryptjs from "bcryptjs";
import httpStatus from "http-status";
import jwt, { JwtPayload, SignOptions } from "jsonwebtoken";
import config from "../../config";
import AppError from "../../errors/AppError";
import prisma from "../../lib/prisma";
import {
  TAuthResponse,
  TAuthUserResponse,
  TLoginPayload,
  TRefreshTokenResponse,
  TRegisterPayload,
} from "./auth.interface";

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
  preferredLanguage: true,
  communicationConsent: true,
  status: true,
  isMfaEnabled: true,
  roleId: true,
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

// Helper to sanitize and format user object for responses
const formatAuthUser = (user: any): TAuthUserResponse => {
  const permissions =
    user.role?.rolePermissions?.map(
      (rp: { permission: { name: string } }) => rp.permission.name,
    ) || [];

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
    preferredLanguage: user.preferredLanguage,
    communicationConsent: user.communicationConsent,
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
    accessSignOptions,
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
    refreshSignOptions,
  );

  return { accessToken, refreshToken };
};

const register = async (payload: TRegisterPayload): Promise<TAuthResponse> => {
  // 1. Strict Unique Email Enforcement
  const existingUser = await prisma.user.findUnique({
    where: { email: payload.email.toLowerCase().trim() },
  });

  if (existingUser) {
    throw new AppError(
      httpStatus.CONFLICT,
      "A user with this email address already exists",
    );
  }

  // 2. Fetch the default CLIENT role (public self-registration strictly defaults to CLIENT)
  const clientRole = await prisma.userRole.findFirst({
    where: { name: "CLIENT", isDeleted: false },
  });

  if (!clientRole) {
    throw new AppError(
      httpStatus.INTERNAL_SERVER_ERROR,
      "Default CLIENT role is not initialized in the database. Please run seeding.",
    );
  }

  // 3. Hash Password
  const hashedPassword = await bcryptjs.hash(
    payload.password,
    config.bcrypt_salt_rounds,
  );

  // 4. Generate unique Client ID
  const clientId = await generateClientId();

  // 5. Exclude raw password from payload to prevent spreading plain text
  const { password: rawPassword, ...userData } = payload;

  // 6. Create user record
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

  // 7. Generate JWT tokens
  const { accessToken, refreshToken } = generateTokens({
    id: user.id,
    email: user.email,
    role: user.role.name,
  });

  return {
    accessToken,
    refreshToken,
    user: formatAuthUser(user),
  };
};

const login = async (payload: TLoginPayload): Promise<TAuthResponse> => {
  const normalizedEmail = payload.email.toLowerCase().trim();

  // 1. Find user by email
  const user = await prisma.user.findUnique({
    where: { email: normalizedEmail },
    select: {
      ...authUserSelect,
      password: true,
      isDeleted: true,
    },
  });

  if (!user || user.isDeleted || user.role?.isDeleted) {
    throw new AppError(httpStatus.UNAUTHORIZED, "Invalid email or password");
  }

  // 2. Account status check
  if (user.status !== "ACTIVE") {
    throw new AppError(
      httpStatus.FORBIDDEN,
      `Your account is currently ${user.status.toLowerCase()}. Please contact AdSkill support.`,
    );
  }

  // 3. Verify password
  const isPasswordMatched = await bcryptjs.compare(
    payload.password,
    user.password,
  );

  if (!isPasswordMatched) {
    throw new AppError(httpStatus.UNAUTHORIZED, "Invalid email or password");
  }

  // 4. Generate tokens & format response
  const { accessToken, refreshToken } = generateTokens({
    id: user.id,
    email: user.email,
    role: user.role.name,
  });

  return {
    accessToken,
    refreshToken,
    user: formatAuthUser(user),
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
      config.jwt.refresh_secret as string,
    ) as JwtPayload;
  } catch (error) {
    throw new AppError(
      httpStatus.FORBIDDEN,
      "Invalid or expired refresh token",
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
      "User account no longer exists or role is inactive",
    );
  }

  if (user.status !== "ACTIVE") {
    throw new AppError(
      httpStatus.FORBIDDEN,
      `Your account is ${user.status.toLowerCase()}. Please contact support.`,
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
      `Your account is ${user.status.toLowerCase()}. Please contact support.`,
    );
  }

  return formatAuthUser(user);
};

export const AuthService = {
  register,
  login,
  refreshToken,
  getMe,
};
