import { NotificationPriority, NotificationType } from "@prisma/client";

export interface TNotificationFilters {
  page?: number;
  limit?: number;
  type?: NotificationType;
  isRead?: boolean;
}

export interface TCreateNotificationPayload {
  userId: string;
  title: string;
  message: string;
  type?: NotificationType;
  priority?: NotificationPriority;
  entityType?: string;
  entityId?: string;
  actionUrl?: string;
}

export interface TUpdateNotificationPreferencesPayload {
  emailOnCaseUpdates?: boolean;
  emailOnPayments?: boolean;
  emailOnDocuments?: boolean;
  emailOnSupport?: boolean;
  inAppAlerts?: boolean;
}
