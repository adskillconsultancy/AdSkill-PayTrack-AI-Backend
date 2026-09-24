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

  // Set refresh token in secure HTTP-only cookie
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
  const { refreshToken, accessToken, user } = result;

  // Set refresh token in secure HTTP-only cookie
  res.cookie("refreshToken", refreshToken, cookieOptions);

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
  refreshToken,
  getMe,
  updateProfile,
  changePassword,
};
