import { Request, Response } from "express";
import httpStatus from "http-status";
import catchAsync from "../../shared/catchAsync";
import sendResponse from "../../shared/sendResponse";
import { NotificationService } from "./notification.service";

const getUserNotifications = catchAsync(async (req: Request, res: Response) => {
  const isRead =
    req.query.isRead === "true"
      ? true
      : req.query.isRead === "false"
      ? false
      : undefined;

  const result = await NotificationService.getUserNotifications(req.user!.id, {
    page: req.query.page ? Number(req.query.page) : undefined,
    limit: req.query.limit ? Number(req.query.limit) : undefined,
    type: req.query.type as any,
    isRead,
  });

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Notifications retrieved successfully",
    meta: result.meta,
    data: result.data,
  });
});

const getUnreadCount = catchAsync(async (req: Request, res: Response) => {
  const result = await NotificationService.getUnreadCount(req.user!.id);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Unread count retrieved successfully",
    data: result,
  });
});

const markAsRead = catchAsync(async (req: Request, res: Response) => {
  const result = await NotificationService.markAsRead(
    req.user!.id,
    req.params.id
  );
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Notification marked as read",
    data: result,
  });
});

const markAllAsRead = catchAsync(async (req: Request, res: Response) => {
  const result = await NotificationService.markAllAsRead(req.user!.id);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "All notifications marked as read",
    data: result,
  });
});

const deleteNotification = catchAsync(async (req: Request, res: Response) => {
  const result = await NotificationService.deleteNotification(
    req.user!.id,
    req.params.id
  );
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Notification deleted successfully",
    data: result,
  });
});

const getUserPreferences = catchAsync(async (req: Request, res: Response) => {
  const result = await NotificationService.getUserPreferences(req.user!.id);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Notification preferences retrieved successfully",
    data: result,
  });
});

const updateUserPreferences = catchAsync(async (req: Request, res: Response) => {
  const result = await NotificationService.updateUserPreferences(
    req.user!.id,
    req.body
  );
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Notification preferences updated successfully",
    data: result,
  });
});

const processScheduledReminders = catchAsync(async (req: Request, res: Response) => {
  const result = await NotificationService.processScheduledReminders();
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Scheduled reminders processed successfully",
    data: result,
  });
});

const sendManualReminder = catchAsync(async (req: Request, res: Response) => {
  const result = await NotificationService.sendManualReminder(
    req.params.installmentId,
    req.body?.customNote,
    req.user?.id,
    req.user?.email,
  );
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: result.message,
    data: result,
  });
});

export const NotificationController = {
  getUserNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  getUserPreferences,
  updateUserPreferences,
  processScheduledReminders,
  sendManualReminder,
};
