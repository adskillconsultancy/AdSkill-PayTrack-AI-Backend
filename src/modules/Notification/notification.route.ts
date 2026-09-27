import { Router } from "express";
import auth from "../../middlewares/auth";
import { NotificationController } from "./notification.controller";

const router = Router();

// All notification endpoints are scoped to the authenticated user
router.get("/", auth(), NotificationController.getUserNotifications);
router.get("/unread-count", auth(), NotificationController.getUnreadCount);
router.patch("/read-all", auth(), NotificationController.markAllAsRead);
router.patch("/:id/read", auth(), NotificationController.markAsRead);
router.delete("/:id", auth(), NotificationController.deleteNotification);

// Notification Preferences
router.get("/preferences", auth(), NotificationController.getUserPreferences);
router.patch("/preferences", auth(), NotificationController.updateUserPreferences);

export const NotificationRoutes = router;
