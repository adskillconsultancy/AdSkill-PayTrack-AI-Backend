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
        clientCode: true,
        priority: true,
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

      const isHighPriority = lead.priority === "HIGH";
      const codeTag = lead.clientCode ? ` [${lead.clientCode}]` : "";

      try {
        await NotificationService.createNotification({
          userId: lead.assignedToId,
          title: `${isHighPriority ? "🔴 URGENT " : "📞 "}Follow-Up: ${lead.fullName}${codeTag}`,
          message: `${isHighPriority ? "High-priority client! " : ""}Follow-up is due for ${lead.fullName} (${lead.phone}). Click to review notes and contact lead.`,
          type: NotificationType.SYSTEM,
          priority: isHighPriority ? NotificationPriority.URGENT : NotificationPriority.HIGH,
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
 * Checks for leads with scheduled meetings and dispatches:
 * 1) 4-Day Advance Notice (e.g. 4 days before meeting)
 * 2) Day-of / 1-Hour Notice (e.g. morning/prior to meeting)
 */
export const checkAndDispatchMeetingReminders = async () => {
  try {
    const now = new Date();
    const fourDaysFromNow = new Date(now.getTime() + 4 * 24 * 60 * 60 * 1000);
    const twoHoursFromNow = new Date(now.getTime() + 2 * 60 * 60 * 1000);
    const oneHourAgo = new Date(now.getTime() - 1 * 60 * 60 * 1000);

    let meetingsDispatched = 0;

    // 1. Check for 4-Day Advance Reminders
    const upcoming4dMeetings = await prisma.lead.findMany({
      where: {
        isDeleted: false,
        meetingDateTime: {
          lte: fourDaysFromNow,
          gt: now,
        },
        meetingNotified4dAt: null,
        assignedToId: {
          not: null,
        },
      },
      select: {
        id: true,
        fullName: true,
        clientCode: true,
        meetingDateTime: true,
        meetingDateTimeStr: true,
        assignedToId: true,
      },
      take: 50,
    });

    for (const lead of upcoming4dMeetings) {
      if (!lead.assignedToId) continue;
      const codeTag = lead.clientCode ? ` [${lead.clientCode}]` : "";
      const timeDisplay = lead.meetingDateTimeStr || lead.meetingDateTime?.toLocaleString() || "Upcoming";

      try {
        await NotificationService.createNotification({
          userId: lead.assignedToId,
          title: `📅 Upcoming Consultation in 4 Days: ${lead.fullName}${codeTag}`,
          message: `Consultation meeting scheduled for ${timeDisplay}. Click to review CV and evaluation notes.`,
          type: NotificationType.SYSTEM,
          priority: NotificationPriority.NORMAL,
          entityType: "LEAD",
          entityId: lead.id,
          actionUrl: `/leads/${lead.id}`,
        });

        await prisma.lead.update({
          where: { id: lead.id },
          data: { meetingNotified4dAt: now },
        });

        meetingsDispatched++;
      } catch (err: any) {
        console.error(`[MeetingReminder] 4-day notification error for lead ${lead.id}:`, err?.message);
      }
    }

    // 2. Check for Day-of / Immediate (within next 2 hours) Reminders
    const dayOfMeetings = await prisma.lead.findMany({
      where: {
        isDeleted: false,
        meetingDateTime: {
          lte: twoHoursFromNow,
          gte: oneHourAgo,
        },
        meetingNotifiedDayAt: null,
        assignedToId: {
          not: null,
        },
      },
      select: {
        id: true,
        fullName: true,
        clientCode: true,
        meetingDateTime: true,
        meetingDateTimeStr: true,
        assignedToId: true,
      },
      take: 50,
    });

    for (const lead of dayOfMeetings) {
      if (!lead.assignedToId) continue;
      const codeTag = lead.clientCode ? ` [${lead.clientCode}]` : "";
      const timeDisplay = lead.meetingDateTimeStr || lead.meetingDateTime?.toLocaleTimeString() || "Today";

      try {
        await NotificationService.createNotification({
          userId: lead.assignedToId,
          title: `🔔 Meeting Starting Soon: ${lead.fullName}${codeTag}`,
          message: `URGENT: Consultation with ${lead.fullName} is scheduled at ${timeDisplay}. Please open client profile & CV.`,
          type: NotificationType.SYSTEM,
          priority: NotificationPriority.URGENT,
          entityType: "LEAD",
          entityId: lead.id,
          actionUrl: `/leads/${lead.id}`,
        });

        await prisma.lead.update({
          where: { id: lead.id },
          data: { meetingNotifiedDayAt: now },
        });

        meetingsDispatched++;
      } catch (err: any) {
        console.error(`[MeetingReminder] Day-of notification error for lead ${lead.id}:`, err?.message);
      }
    }

    if (meetingsDispatched > 0) {
      console.log(`📅 [MeetingReminder] Dispatched ${meetingsDispatched} meeting reminder alert(s).`);
    }

    return meetingsDispatched;
  } catch (error: any) {
    console.error("[MeetingReminder] Error in meeting reminder scheduler:", error?.message);
    return 0;
  }
};

/**
 * Schedules periodic follow-up and meeting reminder checks every 10 minutes.
 * Uses native Node setInterval.
 */
export const scheduleLeadFollowUpReminders = () => {
  const CHECK_INTERVAL_MS = 10 * 60 * 1000; // 10 minutes

  // Initial delayed run after 15 seconds to let server boot cleanly
  setTimeout(() => {
    checkAndDispatchFollowUpReminders().catch((err) =>
      console.error("[FollowUpReminder] Initial check error:", err?.message),
    );
    checkAndDispatchMeetingReminders().catch((err) =>
      console.error("[MeetingReminder] Initial check error:", err?.message),
    );
  }, 15000);

  // Periodic recurring timer
  setInterval(() => {
    checkAndDispatchFollowUpReminders().catch((err) =>
      console.error("[FollowUpReminder] Periodic check error:", err?.message),
    );
    checkAndDispatchMeetingReminders().catch((err) =>
      console.error("[MeetingReminder] Periodic check error:", err?.message),
    );
  }, CHECK_INTERVAL_MS);

  console.log("🕒 [LeadReminder] Lead follow-up & meeting reminder scheduler initialized (every 10m).");
};

