import { NotificationPriority, NotificationType } from "@prisma/client";
import prisma from "../../lib/prisma";
import { NotificationService } from "../Notification/notification.service";

/**
 * Checks for leads whose follow-up date is due/overdue and has not yet been notified.
 * Automatically generates in-app notifications for the assigned staff member.
 */
export const checkAndDispatchFollowUpReminders = async () => {
  try {
    const now = new Date();

    const dueLeads = await prisma.lead.findMany({
      where: {
        isDeleted: false,
        isFollowUpDone: false,
        nextFollowUpDate: {
          lte: now,
        },
        followUpNotifiedAt: null,
        assignedToId: {
          not: null,
        },
      },
      select: {
        id: true,
        fullName: true,
        phone: true,
        assignedToId: true,
        nextFollowUpDate: true,
      },
      take: 50,
    });

    if (dueLeads.length === 0) {
      return 0;
    }

    let dispatchedCount = 0;

    for (const lead of dueLeads) {
      if (!lead.assignedToId) continue;

      try {
        await NotificationService.createNotification({
          userId: lead.assignedToId,
          title: `Follow-Up Reminder: ${lead.fullName}`,
          message: `Follow-up is due for ${lead.fullName} (${lead.phone}). Click to review notes and contact lead.`,
          type: NotificationType.SYSTEM,
          priority: NotificationPriority.HIGH,
          entityType: "LEAD",
          entityId: lead.id,
          actionUrl: `/leads/${lead.id}`,
        });

        await prisma.lead.update({
          where: { id: lead.id },
          data: { followUpNotifiedAt: now },
        });

        dispatchedCount++;
      } catch (err: any) {
        console.error(
          `[FollowUpReminder] Failed to send reminder for lead ${lead.id}:`,
          err?.message,
        );
      }
    }

    if (dispatchedCount > 0) {
      console.log(
        `🔔 [FollowUpReminder] Dispatched ${dispatchedCount} lead follow-up reminder(s).`,
      );
    }

    return dispatchedCount;
  } catch (error: any) {
    console.error("[FollowUpReminder] Error in reminder scheduler:", error?.message);
    return 0;
  }
};

/**
 * Schedules periodic follow-up reminder checks every 10 minutes.
 * Uses native Node setInterval.
 */
export const scheduleLeadFollowUpReminders = () => {
  const CHECK_INTERVAL_MS = 10 * 60 * 1000; // 10 minutes

  // Initial delayed run after 15 seconds to let server boot cleanly
  setTimeout(() => {
    checkAndDispatchFollowUpReminders().catch((err) =>
      console.error("[FollowUpReminder] Initial check error:", err?.message),
    );
  }, 15000);

  // Periodic recurring timer
  setInterval(() => {
    checkAndDispatchFollowUpReminders().catch((err) =>
      console.error("[FollowUpReminder] Periodic check error:", err?.message),
    );
  }, CHECK_INTERVAL_MS);

  console.log("🕒 [FollowUpReminder] Lead follow-up reminder scheduler initialized (every 10m).");
};
