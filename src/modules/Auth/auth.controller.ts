import { Request, Response } from "express";
import httpStatus from "http-status";
import config from "../../config";
import catchAsync from "../../shared/catchAsync";
import sendResponse from "../../shared/sendResponse";
import { AuthService } from "./auth.service";

const cookieOptions = {
  secure: config.env === "production",
  httpOnly: true,
  sameSite: config.env === "production" ? ("none" as const) : ("lax" as const),
};

const register = catchAsync(async (req: Request, res: Response) => {
  const result = await AuthService.register(req.body);
  const { refreshToken, accessToken, user } = result;

  res.cookie("refreshToken", refreshToken, cookieOptions);

  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: "Client account registered successfully",
    data: {
      accessToken,
      user,
    },
  });
});

const login = catchAsync(async (req: Request, res: Response) => {
  const result = await AuthService.login(req.body);

  if (result.mfaRequired) {
    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Multi-Factor Authentication code required",
      data: {
        mfaRequired: true,
        mfaToken: result.mfaToken,
      },
    });
    return;
  }

  const { refreshToken, accessToken, user } = result;
  if (refreshToken) {
    res.cookie("refreshToken", refreshToken, cookieOptions);
  }

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "User logged in successfully",
    data: {
      accessToken,
      user,
    },
  });
});

const verifyMfaLogin = catchAsync(async (req: Request, res: Response) => {
  const result = await AuthService.verifyMfaLogin(req.body);
  const { refreshToken, accessToken, user } = result;

  if (refreshToken) {
    res.cookie("refreshToken", refreshToken, cookieOptions);
  }

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "MFA verified, logged in successfully",
    data: {
      accessToken,
      user,
    },
  });
});

const setupMfa = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user!.id;
  const result = await AuthService.setupMfa(userId);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "MFA setup key generated successfully",
    data: result,
  });
});

const enableMfa = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user!.id;
  const result = await AuthService.enableMfa(userId, req.body);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: result.message,
    data: result,
  });
});

const disableMfa = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user!.id;
  const result = await AuthService.disableMfa(userId, req.body);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: result.message,
    data: result,
  });
});

const forgotPassword = catchAsync(async (req: Request, res: Response) => {
  const result = await AuthService.forgotPassword(req.body);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: result.message,
    data: result,
  });
});

const resetPassword = catchAsync(async (req: Request, res: Response) => {
  const result = await AuthService.resetPassword(req.body);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: result.message,
    data: result,
  });
});

const refreshToken = catchAsync(async (req: Request, res: Response) => {
  const token = req.cookies.refreshToken || req.body.refreshToken;
  const result = await AuthService.refreshToken(token);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Access token refreshed successfully",
    data: result,
  });
});

const getMe = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user!.id;
  const result = await AuthService.getMe(userId);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Current user profile fetched successfully",
    data: result,
  });
});

const updateProfile = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user!.id;
  const result = await AuthService.updateProfile(userId, req.body);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Profile updated successfully",
    data: result,
  });
});

const changePassword = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user!.id;
  const result = await AuthService.changePassword(userId, req.body);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: result.message,
    data: result,
  });
});

export const AuthController = {
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
