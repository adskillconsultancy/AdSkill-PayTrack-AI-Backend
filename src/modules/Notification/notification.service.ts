import { NotificationPriority, NotificationType, Prisma } from "@prisma/client";
import httpStatus from "http-status";
import AppError from "../../errors/AppError";
import prisma from "../../lib/prisma";
import { sendMail, wrapEmailLayout } from "../../lib/mail";
import {
  TCreateNotificationPayload,
  TNotificationFilters,
  TUpdateNotificationPreferencesPayload,
} from "./notification.interface";

/**
 * Universal In-App Notification & Isolation Engine
 */
export const NotificationService = {
  /**
   * Create an individual in-app notification record
   */
  async createNotification(payload: TCreateNotificationPayload) {
    return prisma.notification.create({
      data: {
        userId: payload.userId,
        title: payload.title,
        message: payload.message,
        type: payload.type || NotificationType.SYSTEM,
        priority: payload.priority || NotificationPriority.NORMAL,
        entityType: payload.entityType,
        entityId: payload.entityId,
        actionUrl: payload.actionUrl,
      },
    });
  },

  /**
   * Fetch paginated notifications for current user with strict userId scope
   */
  async getUserNotifications(userId: string, filters: TNotificationFilters) {
    const page = Number(filters.page) || 1;
    const limit = Number(filters.limit) || 15;
    const skip = (page - 1) * limit;

    const where: Prisma.NotificationWhereInput = {
      userId,
      isDeleted: false,
    };

    if (filters.type) {
      where.type = filters.type;
    }

    if (typeof filters.isRead === "boolean") {
      where.isRead = filters.isRead;
    }

    const [items, total, unreadCount] = await Promise.all([
      prisma.notification.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.notification.count({ where }),
      prisma.notification.count({
        where: { userId, isDeleted: false, isRead: false },
      }),
    ]);

    return {
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        unreadCount,
      },
      data: items,
    };
  },

  /**
   * Get unread notification counter for badge
   */
  async getUnreadCount(userId: string) {
    const unreadCount = await prisma.notification.count({
      where: {
        userId,
        isDeleted: false,
        isRead: false,
      },
    });

    return { unreadCount };
  },

  /**
   * Mark a single notification as read
   */
  async markAsRead(userId: string, notificationId: string) {
    const record = await prisma.notification.findFirst({
      where: { id: notificationId, userId, isDeleted: false },
    });

    if (!record) {
      throw new AppError(httpStatus.NOT_FOUND, "Notification not found");
    }

    return prisma.notification.update({
      where: { id: notificationId },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    });
  },

  /**
   * Mark all notifications as read for current user
   */
  async markAllAsRead(userId: string) {
    const result = await prisma.notification.updateMany({
      where: {
        userId,
        isRead: false,
        isDeleted: false,
      },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    });

    return { updatedCount: result.count };
  },

  /**
   * Soft-delete a notification from user view
   */
  async deleteNotification(userId: string, notificationId: string) {
    const record = await prisma.notification.findFirst({
      where: { id: notificationId, userId, isDeleted: false },
    });

    if (!record) {
      throw new AppError(httpStatus.NOT_FOUND, "Notification not found");
    }

    return prisma.notification.update({
      where: { id: notificationId },
      data: {
        isDeleted: true,
        deletedAt: new Date(),
      },
    });
  },

  /**
   * Get user notification preferences
   */
  async getUserPreferences(userId: string) {
    let pref = await prisma.notificationPreference.findUnique({
      where: { userId },
    });

    if (!pref) {
      pref = await prisma.notificationPreference.create({
        data: { userId },
      });
    }

    return pref;
  },

  /**
   * Update user notification preferences
   */
  async updateUserPreferences(
    userId: string,
    payload: TUpdateNotificationPreferencesPayload
  ) {
    return prisma.notificationPreference.upsert({
      where: { userId },
      update: payload,
      create: {
        userId,
        ...payload,
      },
    });
  },

  // =========================================================================
  // STRICT ROLE-ISOLATION EVENT DISPATCHERS
  // =========================================================================

  /**
   * Trigger 1: Case Created Event
   * - Client: Receives intake confirmation in-app + email
   * - Super Admin: Receives new case notification in-app + email
   * - Assigned Staff (if assigned & distinct from creator): Receives assignment in-app + email
   * - Other Staff / Consultants: EXCLUDED COMPLETELY (Strict Isolation)
   */
  async dispatchCaseCreatedNotification(params: {
    caseId: string;
    caseCode: string;
    clientId: string;
    clientName: string;
    clientEmail: string;
    serviceName: string;
    assignedConsultantId?: string | null;
    creatorId?: string;
    creatorRole?: string;
  }) {
    const {
      caseCode,
      clientId,
      clientName,
      clientEmail,
      serviceName,
      assignedConsultantId,
      creatorId,
    } = params;

    // 1. Notify Client
    await this.createNotification({
      userId: clientId,
      title: "Case Intake Received",
      message: `Your case (${caseCode}) for ${serviceName} has been recorded. Our team will review your dossier.`,
      type: NotificationType.CASE,
      priority: NotificationPriority.HIGH,
      entityType: "CASE",
      entityId: params.caseId,
      actionUrl: `/clients/${clientId}`,
    });

    const clientHtml = wrapEmailLayout(
      "Case Intake Received - AdSkill PayTrack",
      `
      <div class="badge badge-info">Case Intake Confirmation</div>
      <h1 class="h1">Hello ${clientName},</h1>
      <p>Thank you for choosing AdSkill Consultancy. Your service case has been successfully opened in our system.</p>
      <div class="card-detail">
        <div class="detail-row">
          <span class="detail-label">Case Reference:</span>
          <span class="detail-value">${caseCode}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Service Package:</span>
          <span class="detail-value">${serviceName}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Status:</span>
          <span class="detail-value">INTAKE REVIEW</span>
        </div>
      </div>
      <p>You can track milestone schedules, view invoices, and communicate with your assigned consultant via your secure client portal.</p>
      <a href="https://ad-skill-pay-track-ai-frontend.vercel.app/tracking" class="btn">View Case Tracker</a>
      `
    );

    sendMail({
      to: clientEmail,
      subject: `Case Intake Received [${caseCode}] - AdSkill PayTrack`,
      html: clientHtml,
      templateName: "CLIENT_CASE_INTAKE",
      metadata: { caseCode, clientId },
    }).catch((err) => console.error("Error sending client case email:", err));

    // 2. Fetch all Super Admins (Super Admin gets all notifications)
    const superAdmins = await prisma.user.findMany({
      where: {
        role: { name: "SUPER_ADMIN" },
        status: "ACTIVE",
        isDeleted: false,
      },
      select: { id: true, email: true, name: true },
    });

    for (const admin of superAdmins) {
      await this.createNotification({
        userId: admin.id,
        title: "New Case Created",
        message: `Case ${caseCode} (${serviceName}) was registered for ${clientName}.`,
        type: NotificationType.CASE,
        priority: NotificationPriority.NORMAL,
        entityType: "CASE",
        entityId: params.caseId,
        actionUrl: `/clients/${clientId}`,
      });

      const adminHtml = wrapEmailLayout(
        "New Case Created",
        `
        <div class="badge badge-info">Executive Notification</div>
        <h1 class="h1">New Client Case Registered</h1>
        <p>A new client case has been initiated in the AdSkill portal.</p>
        <div class="card-detail">
          <div class="detail-row"><span class="detail-label">Client:</span><span class="detail-value">${clientName}</span></div>
          <div class="detail-row"><span class="detail-label">Case Code:</span><span class="detail-value">${caseCode}</span></div>
          <div class="detail-row"><span class="detail-label">Service:</span><span class="detail-value">${serviceName}</span></div>
        </div>
        <a href="https://ad-skill-pay-track-ai-frontend.vercel.app/clients/${clientId}" class="btn">Open Case File</a>
        `
      );

      sendMail({
        to: admin.email,
        subject: `[Admin Alert] New Case Created: ${caseCode} (${clientName})`,
        html: adminHtml,
        templateName: "ADMIN_NEW_CASE",
        metadata: { caseCode, adminId: admin.id },
      }).catch((err) => console.error("Error sending admin email:", err));
    }

    // 3. Notify Assigned Consultant (if assigned and not the creator)
    if (assignedConsultantId && assignedConsultantId !== creatorId) {
      const consultant = await prisma.user.findUnique({
        where: { id: assignedConsultantId },
        select: { id: true, email: true, name: true },
      });

      if (consultant) {
        await this.createNotification({
          userId: consultant.id,
          title: "New Case Assigned to You",
          message: `You have been assigned as the consultant for ${clientName} (${caseCode} - ${serviceName}).`,
          type: NotificationType.CASE,
          priority: NotificationPriority.HIGH,
          entityType: "CASE",
          entityId: params.caseId,
          actionUrl: `/clients/${clientId}`,
        });

        const consultantHtml = wrapEmailLayout(
          "New Case Assigned",
          `
          <div class="badge badge-success">Assignment Notice</div>
          <h1 class="h1">Hello ${consultant.name},</h1>
          <p>You have been assigned as primary consultant for a new client case.</p>
          <div class="card-detail">
            <div class="detail-row"><span class="detail-label">Client:</span><span class="detail-value">${clientName}</span></div>
            <div class="detail-row"><span class="detail-label">Case:</span><span class="detail-value">${caseCode}</span></div>
            <div class="detail-row"><span class="detail-label">Service:</span><span class="detail-value">${serviceName}</span></div>
          </div>
          <a href="https://ad-skill-pay-track-ai-frontend.vercel.app/clients/${clientId}" class="btn">View Case Details</a>
          `
        );

        sendMail({
          to: consultant.email,
          subject: `Case Assigned: ${caseCode} (${clientName})`,
          html: consultantHtml,
          templateName: "STAFF_CASE_ASSIGNED",
          metadata: { caseCode, consultantId: consultant.id },
        }).catch((err) => console.error("Error sending consultant email:", err));
      }
    }
  },

  /**
   * Trigger 2: Payment Recorded / Submitted (Pending Verification)
   * - Client: Receives payment submission confirmation
   * - Super Admin: Receives pending verification alert
   * - Assigned Staff: Receives alert for their assigned case
   * - Other Staff: EXCLUDED COMPLETELY
   */
  async dispatchPaymentRecordedNotification(params: {
    paymentId: string;
    caseId: string;
    caseCode: string;
    clientId: string;
    clientName: string;
    clientEmail: string;
    amount: string | number;
    currency: string;
    paymentMethod: string;
    assignedConsultantId?: string | null;
  }) {
    const {
      caseCode,
      clientId,
      clientName,
      clientEmail,
      amount,
      currency,
      paymentMethod,
      assignedConsultantId,
    } = params;

    const formattedAmount = `${currency} ${Number(amount).toLocaleString("en-US", { minimumFractionDigits: 2 })}`;

    // 1. Notify Client
    await this.createNotification({
      userId: clientId,
      title: "Payment Submitted - Pending Verification",
      message: `Your payment of ${formattedAmount} via ${paymentMethod} for case ${caseCode} has been recorded and is undergoing verification.`,
      type: NotificationType.PAYMENT,
      priority: NotificationPriority.NORMAL,
      entityType: "PAYMENT",
      entityId: params.paymentId,
      actionUrl: `/payments`,
    });

    const clientHtml = wrapEmailLayout(
      "Payment Received - Pending Verification",
      `
      <div class="badge badge-warning">Payment Pending Verification</div>
      <h1 class="h1">Hello ${clientName},</h1>
      <p>We have received your payment submission. Our finance team is reviewing the transaction details.</p>
      <div class="card-detail">
        <div class="detail-row"><span class="detail-label">Amount:</span><span class="detail-value">${formattedAmount}</span></div>
        <div class="detail-row"><span class="detail-label">Payment Method:</span><span class="detail-value">${paymentMethod}</span></div>
        <div class="detail-row"><span class="detail-label">Case Reference:</span><span class="detail-value">${caseCode}</span></div>
        <div class="detail-row"><span class="detail-label">Status:</span><span class="detail-value">PENDING VERIFICATION</span></div>
      </div>
      <p>An official receipt will be generated and emailed to you as soon as verification completes.</p>
      <a href="https://ad-skill-pay-track-ai-frontend.vercel.app/payments" class="btn">View Payment Status</a>
      `
    );

    sendMail({
      to: clientEmail,
      subject: `Payment Received: ${formattedAmount} [Case ${caseCode}] - AdSkill`,
      html: clientHtml,
      templateName: "CLIENT_PAYMENT_SUBMITTED",
      metadata: { caseCode, amount: formattedAmount },
    }).catch((err) => console.error("Error sending payment submission email:", err));

    // 2. Notify Super Admins
    const superAdmins = await prisma.user.findMany({
      where: { role: { name: "SUPER_ADMIN" }, status: "ACTIVE", isDeleted: false },
      select: { id: true, email: true },
    });

    for (const admin of superAdmins) {
      await this.createNotification({
        userId: admin.id,
        title: "Payment Verification Required",
        message: `${clientName} submitted a payment of ${formattedAmount} (${paymentMethod}) for case ${caseCode}.`,
        type: NotificationType.PAYMENT,
        priority: NotificationPriority.HIGH,
        entityType: "PAYMENT",
        entityId: params.paymentId,
        actionUrl: `/payments`,
      });
    }

    // 3. Notify Assigned Consultant (if any)
    if (assignedConsultantId) {
      await this.createNotification({
        userId: assignedConsultantId,
        title: "Client Payment Submitted",
        message: `${clientName} submitted ${formattedAmount} for your assigned case ${caseCode}.`,
        type: NotificationType.PAYMENT,
        priority: NotificationPriority.NORMAL,
        entityType: "PAYMENT",
        entityId: params.paymentId,
        actionUrl: `/payments`,
      });
    }
  },

  /**
   * Trigger 3: Payment Verified & Official Receipt Issued
   * - Client: Receives verified confirmation + receipt link/email
   * - Super Admin: Receives verification notice
   * - Assigned Staff: Receives in-app update
   * - Other Staff: EXCLUDED COMPLETELY
   */
  async dispatchPaymentVerifiedNotification(params: {
    paymentId: string;
    caseId: string;
    caseCode: string;
    clientId: string;
    clientName: string;
    clientEmail: string;
    amount: string | number;
    currency: string;
    receiptNumber: string;
    verifierName: string;
    assignedConsultantId?: string | null;
  }) {
    const {
      caseCode,
      clientId,
      clientName,
      clientEmail,
      amount,
      currency,
      receiptNumber,
      verifierName,
      assignedConsultantId,
    } = params;

    const formattedAmount = `${currency} ${Number(amount).toLocaleString("en-US", { minimumFractionDigits: 2 })}`;

    // 1. Notify Client
    await this.createNotification({
      userId: clientId,
      title: "Payment Verified - Receipt Issued",
      message: `Your payment of ${formattedAmount} for case ${caseCode} has been verified! Official Receipt: ${receiptNumber}.`,
      type: NotificationType.PAYMENT,
      priority: NotificationPriority.HIGH,
      entityType: "RECEIPT",
      entityId: params.paymentId,
      actionUrl: `/invoices-receipts`,
    });

    const clientHtml = wrapEmailLayout(
      "Payment Verified - Official Receipt Available",
      `
      <div class="badge badge-success">Payment Verified</div>
      <h1 class="h1">Hello ${clientName},</h1>
      <p>Your payment has been successfully verified and posted to your account.</p>
      <div class="card-detail">
        <div class="detail-row"><span class="detail-label">Receipt Number:</span><span class="detail-value">${receiptNumber}</span></div>
        <div class="detail-row"><span class="detail-label">Amount Verified:</span><span class="detail-value">${formattedAmount}</span></div>
        <div class="detail-row"><span class="detail-label">Case Reference:</span><span class="detail-value">${caseCode}</span></div>
        <div class="detail-row"><span class="detail-label">Status:</span><span class="detail-value" style="color: #059669;">COMPLETED / PAID</span></div>
      </div>
      <p>Your official tax-compliant receipt is available for download in your portal.</p>
      <a href="https://ad-skill-pay-track-ai-frontend.vercel.app/invoices-receipts" class="btn">Download Official Receipt</a>
      `
    );

    sendMail({
      to: clientEmail,
      subject: `Official Receipt [${receiptNumber}] for Payment ${formattedAmount} - AdSkill`,
      html: clientHtml,
      templateName: "CLIENT_PAYMENT_VERIFIED",
      metadata: { receiptNumber, caseCode, amount: formattedAmount },
    }).catch((err) => console.error("Error sending payment verified email:", err));

    // 2. Notify Super Admins
    const superAdmins = await prisma.user.findMany({
      where: { role: { name: "SUPER_ADMIN" }, status: "ACTIVE", isDeleted: false },
      select: { id: true },
    });

    for (const admin of superAdmins) {
      await this.createNotification({
        userId: admin.id,
        title: "Payment Verified",
        message: `Payment of ${formattedAmount} for ${caseCode} (${clientName}) was verified by ${verifierName}. Receipt: ${receiptNumber}.`,
        type: NotificationType.PAYMENT,
        priority: NotificationPriority.NORMAL,
        entityType: "RECEIPT",
        entityId: params.paymentId,
        actionUrl: `/invoices-receipts`,
      });
    }

    // 3. Notify Assigned Consultant (if any)
    if (assignedConsultantId) {
      await this.createNotification({
        userId: assignedConsultantId,
        title: "Payment Verified on Your Case",
        message: `Payment of ${formattedAmount} verified for case ${caseCode} (${clientName}).`,
        type: NotificationType.PAYMENT,
        priority: NotificationPriority.NORMAL,
        entityType: "RECEIPT",
        entityId: params.paymentId,
        actionUrl: `/invoices-receipts`,
      });
    }
  },
};
