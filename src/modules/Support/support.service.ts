import {
  NoteVisibility,
  Prisma,
  SupportCategory,
  SupportPriority,
  SupportStatus,
  SupportTargetType,
} from "@prisma/client";
import httpStatus from "http-status";
import AppError from "../../errors/AppError";
import prisma from "../../lib/prisma";
import {
  TCreateSupportInquiryPayload,
  TCreateSupportTicketPayload,
  TFaqItem,
  TSendMessagePayload,
  TSupportOverviewResponse,
  TTicketFilterOptions,
  TUpdateTicketStatusPayload,
  TConversationChannel,
  TConversationListResponse,
} from "./support.interface";

const CURATED_FAQS: TFaqItem[] = [
  {
    id: "faq-1",
    category: "Payments & Ledger",
    question: "How do offline bank wire settlements work?",
    answer:
      "When you submit a bank wire or deposit slip under 'Submit Offline Payment', our administrative audit desk verifies the transaction reference with the banking partner. Once approved (typically within 12–24 hours), your payment transitions to VERIFIED, credits your milestone, and an official sequential receipt is instantly generated.",
  },
  {
    id: "faq-2",
    category: "Payments & Ledger",
    question: "Can I make partial payments towards a contracted milestone?",
    answer:
      "Yes. You can pay an installment in parts or submit general unallocated deposits. The system automatically maintains your remaining balance due and updates your overall financial standing accordingly.",
  },
  {
    id: "faq-3",
    category: "Billing & Invoices",
    question: "Where can I find and download official invoices and receipts?",
    answer:
      "Visit the 'Invoices & Receipts' section from the navigation sidebar. You can view, print, or download compliant PDF invoices (INV-YYYY-XXXX) and payment receipts (RCT-YYYY-XXXX) complete with QR verification.",
  },
  {
    id: "faq-4",
    category: "Account & Profile",
    question: "How do I update my contact information or phone number?",
    answer:
      "You can update your personal contact info, phone number, WhatsApp number, and address anytime directly in the Personal Profile tab above. Click 'Save Profile Changes' to update your file.",
  },
  {
    id: "faq-5",
    category: "Case Advisory",
    question: "How do I reach my dedicated assigned consultant?",
    answer:
      "Your dedicated consultant's name, email, phone, and direct WhatsApp chat button are displayed on your Support Hub card. Click 'Chat on WhatsApp' or 'Send Email' for priority assistance.",
  },
];

const CENTRAL_SUPPORT = {
  agencyName: "AdSkill Consultancy International",
  email: "support@adskillconsultancy.com",
  hotline: "+1 (800) 555-SKILL",
  whatsapp: "+1 (212) 555-0199",
  officeAddress: "555 5th Avenue, 14th Floor, New York, NY 10017",
  businessHours: "Monday – Saturday: 9:00 AM – 7:00 PM EST",
  responseTime: "Within 24 business hours",
};

/**
 * Generate a unique sequential ticket code: e.g. TKT-2026-XXXX
 */
const generateTicketCode = async (): Promise<string> => {
  const year = new Date().getFullYear();
  for (let i = 0; i < 5; i++) {
    const random = Math.floor(1000 + Math.random() * 9000);
    const code = `TKT-${year}-${random}`;
    const existing = await prisma.supportTicket.findUnique({
      where: { ticketCode: code },
      select: { id: true },
    });
    if (!existing) return code;
  }
  return `TKT-${year}-${Date.now().toString().slice(-4)}`;
};

/**
 * Get Client Support Overview (Assigned Advisor, Central Desk, Active Cases, FAQs, and Ticket Stats)
 */
const getSupportOverview = async (
  userId: string,
  userRole?: string,
): Promise<TSupportOverviewResponse> => {
  // Fetch active client cases
  const cases = await prisma.clientCase.findMany({
    where: {
      userId,
      isDeleted: false,
    },
    select: {
      id: true,
      caseCode: true,
      serviceNameSnapshot: true,
      destinationCountry: true,
      caseStatus: true,
      financialStatus: true,
      assignedConsultant: {
        select: {
          id: true,
          name: true,
          preferredName: true,
          email: true,
          phone: true,
          whatsapp: true,
          role: { select: { name: true } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  // Extract assigned consultant from first case with consultant assigned
  const caseWithConsultant = cases.find((c) => Boolean(c.assignedConsultant));
  const consultant = caseWithConsultant?.assignedConsultant;

  const assignedConsultant = consultant
    ? {
        name: consultant.name,
        role: "Senior Immigration & Client Advisor",
        email: consultant.email,
        phone: consultant.phone || "+1 (800) 555-SKILL",
        whatsapp: consultant.whatsapp || consultant.phone || "+1 (212) 555-0199",
        officeHours: "Monday – Friday: 9:00 AM – 6:00 PM EST",
      }
    : null;

  // Aggregate ticket stats for client
  const [totalTickets, openTickets, resolvedTickets, awaitingReply] =
    await Promise.all([
      prisma.supportTicket.count({
        where: { clientId: userId, isDeleted: false },
      }),
      prisma.supportTicket.count({
        where: {
          clientId: userId,
          isDeleted: false,
          status: { in: [SupportStatus.OPEN, SupportStatus.IN_PROGRESS] },
        },
      }),
      prisma.supportTicket.count({
        where: {
          clientId: userId,
          isDeleted: false,
          status: { in: [SupportStatus.RESOLVED, SupportStatus.CLOSED] },
        },
      }),
      prisma.supportTicket.count({
        where: {
          clientId: userId,
          isDeleted: false,
          status: SupportStatus.WAITING_ON_CLIENT,
        },
      }),
    ]);

  return {
    assignedConsultant,
    centralSupport: CENTRAL_SUPPORT,
    activeCases: cases.map((c) => ({
      id: c.id,
      caseCode: c.caseCode,
      serviceName: c.serviceNameSnapshot,
      destinationCountry: c.destinationCountry,
      status: c.caseStatus,
      financialStatus: c.financialStatus,
    })),
    faqs: CURATED_FAQS,
    ticketStats: {
      totalTickets,
      openTickets,
      resolvedTickets,
      awaitingReply,
    },
  };
};

/**
 * Create a new Support Ticket with smart routing and initial message
 */
const createTicket = async (
  userId: string,
  userRole: string | undefined,
  payload: TCreateSupportTicketPayload,
) => {
  let targetCaseId = payload.caseId;
  let resolvedConsultantId: string | null = null;

  // If ticket is specifically targeted for CONSULTANT
  if (payload.targetType === SupportTargetType.CONSULTANT) {
    if (targetCaseId) {
      const selectedCase = await prisma.clientCase.findFirst({
        where: { id: targetCaseId, isDeleted: false },
        select: { id: true, userId: true, assignedConsultantId: true },
      });

      if (!selectedCase) {
        throw new AppError(httpStatus.NOT_FOUND, "Selected case was not found");
      }

      if (userRole === "CLIENT" && selectedCase.userId !== userId) {
        throw new AppError(
          httpStatus.FORBIDDEN,
          "You cannot open an inquiry for a case not registered under your profile",
        );
      }

      resolvedConsultantId = selectedCase.assignedConsultantId;
    } else {
      // Find client's first active case with an assigned consultant
      const clientCase = await prisma.clientCase.findFirst({
        where: {
          userId,
          isDeleted: false,
          assignedConsultantId: { not: null },
        },
        select: { id: true, assignedConsultantId: true },
        orderBy: { createdAt: "desc" },
      });

      if (clientCase) {
        targetCaseId = clientCase.id;
        resolvedConsultantId = clientCase.assignedConsultantId;
      }
    }

    if (!resolvedConsultantId) {
      throw new AppError(
        httpStatus.BAD_REQUEST,
        "No dedicated consultant is currently assigned to your active case. Your query will be routed to the AdSkill Central Management Desk.",
      );
    }
  } else if (targetCaseId) {
    // MANAGEMENT_ADMIN inquiry with optional case reference
    const selectedCase = await prisma.clientCase.findFirst({
      where: { id: targetCaseId, isDeleted: false },
      select: { id: true, userId: true, assignedConsultantId: true },
    });
    if (selectedCase) {
      resolvedConsultantId = selectedCase.assignedConsultantId;
    }
  }

  const ticketCode = await generateTicketCode();
  const isStaffReply = userRole !== "CLIENT";

  // Create ticket and initial message atomically with Prisma nested write
  const ticket = await prisma.supportTicket.create({
    data: {
      ticketCode,
      clientId: userId,
      caseId: targetCaseId || null,
      targetType: payload.targetType,
      assignedConsultantId: resolvedConsultantId,
      category: payload.category,
      priority: payload.priority || SupportPriority.NORMAL,
      status: SupportStatus.OPEN,
      subject: payload.subject,
      lastMessageAt: new Date(),
      messages: {
        create: {
          senderId: userId,
          message: payload.initialMessage,
          isStaffReply,
          attachments: payload.attachments ? (payload.attachments as any) : undefined,
        },
      },
    },
    include: {
      client: {
        select: {
          id: true,
          name: true,
          preferredName: true,
          email: true,
          clientId: true,
        },
      },
      assignedConsultant: {
        select: {
          id: true,
          name: true,
          preferredName: true,
          email: true,
          phone: true,
          role: { select: { name: true } },
        },
      },
      case: {
        select: {
          id: true,
          caseCode: true,
          serviceNameSnapshot: true,
        },
      },
      messages: {
        include: {
          sender: {
            select: {
              id: true,
              name: true,
              preferredName: true,
              email: true,
              role: { select: { name: true } },
            },
          },
        },
      },
    },
  });

  return {
    success: true,
    message:
      payload.targetType === SupportTargetType.CONSULTANT
        ? "Your message has been directly routed to your assigned consultant."
        : "Your support inquiry has been submitted to the AdSkill Management & Billing Desk.",
    ticket,
  };
};

/**
 * Get Tickets list scoped by user role and filters
 */
const getTickets = async (
  user: { id: string; role?: string },
  filters: TTicketFilterOptions,
) => {
  const {
    searchTerm,
    status,
    category,
    targetType,
    scope,
    caseId,
    page = 1,
    limit = 20,
    sortBy = "lastMessageAt",
    sortOrder = "desc",
  } = filters;

  const pageNumber = Math.max(1, Number(page) || 1);
  const limitNumber = Math.min(100, Math.max(1, Number(limit) || 20));
  const skip = (pageNumber - 1) * limitNumber;

  const whereConditions: Prisma.SupportTicketWhereInput = {
    isDeleted: false,
  };

  // Role Scoping
  if (user.role === "CLIENT") {
    whereConditions.clientId = user.id;
  } else if (user.role === "CONSULTANT") {
    // Consultant sees tickets where they are assigned as consultant OR assigned as staff
    if (scope === "assigned_to_me" || !scope) {
      whereConditions.OR = [
        { assignedConsultantId: user.id },
        { assignedStaffId: user.id },
        { case: { assignedConsultantId: user.id } },
      ];
    }
  } else if (user.role === "SUPER_ADMIN" || user.role === "MANAGER") {
    // Super Admin & Manager can see everything or filter by scope
    if (scope === "assigned_to_me") {
      whereConditions.assignedStaffId = user.id;
    } else if (scope === "unassigned") {
      whereConditions.assignedStaffId = null;
      whereConditions.targetType = SupportTargetType.MANAGEMENT_ADMIN;
    }
  }

  // Target type filter
  if (targetType) {
    whereConditions.targetType = targetType;
  }

  // Status filter
  if (status) {
    whereConditions.status = status;
  }

  // Category filter
  if (category) {
    whereConditions.category = category;
  }

  // Specific case filter
  if (caseId) {
    whereConditions.caseId = caseId;
  }

  // Search term
  if (searchTerm) {
    whereConditions.OR = [
      { ticketCode: { contains: searchTerm, mode: "insensitive" } },
      { subject: { contains: searchTerm, mode: "insensitive" } },
      { client: { name: { contains: searchTerm, mode: "insensitive" } } },
      { client: { email: { contains: searchTerm, mode: "insensitive" } } },
      { client: { clientId: { contains: searchTerm, mode: "insensitive" } } },
      {
        messages: {
          some: { message: { contains: searchTerm, mode: "insensitive" } },
        },
      },
    ];
  }

  const [total, tickets] = await Promise.all([
    prisma.supportTicket.count({ where: whereConditions }),
    prisma.supportTicket.findMany({
      where: whereConditions,
      skip,
      take: limitNumber,
      orderBy: { [sortBy]: sortOrder },
      include: {
        client: {
          select: {
            id: true,
            name: true,
            preferredName: true,
            email: true,
            clientId: true,
            phone: true,
            whatsapp: true,
          },
        },
        case: {
          select: {
            id: true,
            caseCode: true,
            serviceNameSnapshot: true,
            destinationCountry: true,
          },
        },
        assignedConsultant: {
          select: {
            id: true,
            name: true,
            preferredName: true,
            email: true,
            phone: true,
            role: { select: { name: true } },
          },
        },
        assignedStaff: {
          select: {
            id: true,
            name: true,
            preferredName: true,
            email: true,
            role: { select: { name: true } },
          },
        },
        messages: {
          take: 1,
          orderBy: { createdAt: "desc" },
          select: {
            id: true,
            message: true,
            isStaffReply: true,
            createdAt: true,
            sender: {
              select: {
                id: true,
                name: true,
                role: { select: { name: true } },
              },
            },
          },
        },
        _count: {
          select: { messages: true },
        },
      },
    }),
  ]);

  const formattedTickets = tickets.map((t) => {
    const lastMessage = t.messages[0] || null;

    // Resolve human-readable handling agent
    let handlerInfo = {
      type: t.targetType,
      name:
        t.targetType === SupportTargetType.CONSULTANT
          ? t.assignedConsultant?.name || "Assigned Consultant"
          : t.assignedStaff?.name || "AdSkill Support Desk",
      role:
        t.targetType === SupportTargetType.CONSULTANT
          ? "Case Advisor"
          : t.assignedStaff?.role?.name || "Support Management",
      isAssigned: Boolean(
        t.targetType === SupportTargetType.CONSULTANT
          ? t.assignedConsultant
          : t.assignedStaff,
      ),
    };

    return {
      id: t.id,
      ticketCode: t.ticketCode,
      targetType: t.targetType,
      category: t.category,
      priority: t.priority,
      status: t.status,
      subject: t.subject,
      lastMessageAt: t.lastMessageAt,
      createdAt: t.createdAt,
      updatedAt: t.updatedAt,
      client: t.client,
      case: t.case,
      handlerInfo,
      assignedConsultant: t.assignedConsultant,
      assignedStaff: t.assignedStaff,
      totalMessages: t._count.messages,
      lastMessage: lastMessage
        ? {
            id: lastMessage.id,
            snippet:
              lastMessage.message.length > 120
                ? `${lastMessage.message.slice(0, 120)}...`
                : lastMessage.message,
            isStaffReply: lastMessage.isStaffReply,
            createdAt: lastMessage.createdAt,
            senderName: lastMessage.sender.name,
            senderRole: lastMessage.sender.role?.name,
          }
        : null,
    };
  });

  return {
    meta: {
      page: pageNumber,
      limit: limitNumber,
      total,
      totalPages: Math.ceil(total / limitNumber),
    },
    data: formattedTickets,
  };
};

/**
 * Get full Ticket Details with complete threaded conversation
 */
const getTicketById = async (
  ticketId: string,
  user: { id: string; role?: string },
) => {
  const ticket = await prisma.supportTicket.findFirst({
    where: { id: ticketId, isDeleted: false },
    include: {
      client: {
        select: {
          id: true,
          name: true,
          preferredName: true,
          email: true,
          clientId: true,
          phone: true,
          whatsapp: true,
        },
      },
      case: {
        select: {
          id: true,
          caseCode: true,
          serviceNameSnapshot: true,
          destinationCountry: true,
          caseStatus: true,
          financialStatus: true,
        },
      },
      assignedConsultant: {
        select: {
          id: true,
          name: true,
          preferredName: true,
          email: true,
          phone: true,
          whatsapp: true,
          role: { select: { name: true } },
        },
      },
      assignedStaff: {
        select: {
          id: true,
          name: true,
          preferredName: true,
          email: true,
          role: { select: { name: true } },
        },
      },
      messages: {
        orderBy: { createdAt: "asc" },
        include: {
          sender: {
            select: {
              id: true,
              name: true,
              preferredName: true,
              email: true,
              role: { select: { name: true } },
            },
          },
        },
      },
    },
  });

  if (!ticket) {
    throw new AppError(httpStatus.NOT_FOUND, "Support ticket not found");
  }

  // Authorization Check
  if (user.role === "CLIENT" && ticket.clientId !== user.id) {
    throw new AppError(
      httpStatus.FORBIDDEN,
      "You are not authorized to view this support conversation",
    );
  }

  if (
    user.role === "CONSULTANT" &&
    ticket.targetType === SupportTargetType.CONSULTANT &&
    ticket.assignedConsultantId !== user.id &&
    ticket.assignedStaffId !== user.id
  ) {
    // Consultant can only access if assigned or supervisory role
    const isConsultantOnCase = ticket.caseId
      ? await prisma.clientCase.findFirst({
          where: { id: ticket.caseId, assignedConsultantId: user.id },
          select: { id: true },
        })
      : null;

    if (!isConsultantOnCase) {
      throw new AppError(
        httpStatus.FORBIDDEN,
        "You do not have permission to view inquiries for other consultants' clients",
      );
    }
  }

  const handlerInfo = {
    targetType: ticket.targetType,
    name:
      ticket.targetType === SupportTargetType.CONSULTANT
        ? ticket.assignedConsultant?.name || "Assigned Consultant"
        : ticket.assignedStaff?.name || "AdSkill Support Desk",
    role:
      ticket.targetType === SupportTargetType.CONSULTANT
        ? "Dedicated Case Advisor"
        : ticket.assignedStaff?.role?.name || "Support Management",
    email:
      ticket.targetType === SupportTargetType.CONSULTANT
        ? ticket.assignedConsultant?.email
        : ticket.assignedStaff?.email || CENTRAL_SUPPORT.email,
    phone:
      ticket.targetType === SupportTargetType.CONSULTANT
        ? ticket.assignedConsultant?.phone
        : CENTRAL_SUPPORT.hotline,
  };

  return {
    ...ticket,
    handlerInfo,
  };
};

/**
 * Send a new message in a Ticket Thread (Supports Client and Staff)
 */
const sendMessage = async (
  ticketId: string,
  user: { id: string; role?: string },
  payload: TSendMessagePayload,
) => {
  const ticket = await prisma.supportTicket.findFirst({
    where: { id: ticketId, isDeleted: false },
    select: {
      id: true,
      clientId: true,
      targetType: true,
      assignedConsultantId: true,
      assignedStaffId: true,
      status: true,
      caseId: true,
    },
  });

  if (!ticket) {
    throw new AppError(httpStatus.NOT_FOUND, "Support ticket not found");
  }

  const isStaffReply = user.role !== "CLIENT";

  // Access validation
  if (!isStaffReply && ticket.clientId !== user.id) {
    throw new AppError(
      httpStatus.FORBIDDEN,
      "You cannot send a message to a ticket that does not belong to you",
    );
  }

  // Calculate new status and assignee updates
  let updatedStatus = ticket.status;
  let updatedStaffId = ticket.assignedStaffId;

  if (isStaffReply) {
    // If ticket was open, mark in-progress
    if (ticket.status === SupportStatus.OPEN) {
      updatedStatus = SupportStatus.IN_PROGRESS;
    }
    // If ticket was unassigned and staff replies to a central inquiry, claim handling
    if (!updatedStaffId && ticket.targetType === SupportTargetType.MANAGEMENT_ADMIN) {
      updatedStaffId = user.id;
    }
  } else {
    // If client replies to a resolved ticket, reopen it
    if (ticket.status === SupportStatus.RESOLVED) {
      updatedStatus = SupportStatus.IN_PROGRESS;
    }
  }

  // Create message and update ticket
  const newMessage = await prisma.supportMessage.create({
    data: {
      ticketId: ticket.id,
      senderId: user.id,
      message: payload.message,
      isStaffReply,
      attachments: payload.attachments ? (payload.attachments as any) : undefined,
    },
    include: {
      sender: {
        select: {
          id: true,
          name: true,
          preferredName: true,
          email: true,
          role: { select: { name: true } },
        },
      },
    },
  });

  const updatedTicket = await prisma.supportTicket.update({
    where: { id: ticket.id },
    data: {
      lastMessageAt: new Date(),
      status: updatedStatus,
      assignedStaffId: updatedStaffId,
    },
    select: {
      id: true,
      ticketCode: true,
      status: true,
      lastMessageAt: true,
      assignedStaffId: true,
    },
  });

  return {
    success: true,
    message: "Message delivered successfully",
    data: newMessage,
    ticket: updatedTicket,
  };
};

/**
 * Update Ticket Status or Reassign Handler (Staff Only)
 */
const updateTicketStatus = async (
  ticketId: string,
  user: { id: string; role?: string },
  payload: TUpdateTicketStatusPayload,
) => {
  if (user.role === "CLIENT") {
    throw new AppError(
      httpStatus.FORBIDDEN,
      "Clients are not permitted to modify ticket management properties",
    );
  }

  const existingTicket = await prisma.supportTicket.findFirst({
    where: { id: ticketId, isDeleted: false },
    select: { id: true },
  });

  if (!existingTicket) {
    throw new AppError(httpStatus.NOT_FOUND, "Support ticket not found");
  }

  const updatedTicket = await prisma.supportTicket.update({
    where: { id: ticketId },
    data: {
      status: payload.status,
      assignedStaffId: payload.assignedStaffId,
    },
    include: {
      assignedStaff: {
        select: {
          id: true,
          name: true,
          email: true,
          role: { select: { name: true } },
        },
      },
    },
  });

  return {
    success: true,
    message: `Ticket status successfully updated to ${updatedTicket.status}`,
    data: updatedTicket,
  };
};

/**
 * Legacy Support Inquiry Compatibility
 */
const createInquiry = async (
  userId: string,
  payload: TCreateSupportInquiryPayload,
) => {
  // Map legacy category to enum
  const categoryMap: Record<string, SupportCategory> = {
    BILLING_PAYMENT: SupportCategory.BILLING_PAYMENT,
    MILESTONE_SCHEDULE: SupportCategory.MILESTONE_SCHEDULE,
    DOCUMENT_VERIFICATION: SupportCategory.DOCUMENT_VERIFICATION,
    CASE_STATUS: SupportCategory.CASE_STATUS,
    GENERAL: SupportCategory.GENERAL,
  };

  const targetCategory = categoryMap[payload.category] || SupportCategory.GENERAL;
  const targetType =
    payload.targetType === "CONSULTANT"
      ? SupportTargetType.CONSULTANT
      : SupportTargetType.MANAGEMENT_ADMIN;

  const result = await createTicket(userId, "CLIENT", {
    targetType,
    caseId: payload.caseId,
    category: targetCategory,
    priority: (payload.priority as SupportPriority) || SupportPriority.NORMAL,
    subject: payload.subject,
    initialMessage: payload.message,
  });

  return {
    ticketCode: result.ticket.ticketCode,
    noteId: result.ticket.id,
    createdAt: result.ticket.createdAt,
    category: result.ticket.category,
    subject: result.ticket.subject,
    status: result.ticket.status,
    message: result.message,
  };
};

/**
 * Legacy Inquiries list for client backwards compatibility
 */
const getMyInquiries = async (userId: string) => {
  const result = await getTickets({ id: userId, role: "CLIENT" }, { limit: 50 });
  return result.data.map((t) => ({
    id: t.id,
    ticketCode: t.ticketCode,
    category: t.category,
    subject: t.subject,
    content: t.lastMessage?.snippet || t.subject,
    caseCode: t.case?.caseCode,
    serviceName: t.case?.serviceNameSnapshot,
    authorName: t.client.name,
    authorRole: "CLIENT",
    isStaffReply: t.lastMessage?.isStaffReply || false,
    createdAt: t.createdAt,
    status: t.status,
    handlerInfo: t.handlerInfo,
  }));
};

/**
 * Mark all incoming messages in a conversation as read
 */
const markTicketRead = async (
  ticketId: string,
  user: { id: string; role?: string },
) => {
  const ticket = await prisma.supportTicket.findFirst({
    where: { id: ticketId, isDeleted: false },
    select: { id: true, clientId: true },
  });

  if (!ticket) {
    throw new AppError(httpStatus.NOT_FOUND, "Support ticket not found");
  }

  const result = await prisma.supportMessage.updateMany({
    where: {
      ticketId,
      senderId: { not: user.id },
      readAt: null,
    },
    data: {
      readAt: new Date(),
    },
  });

  return {
    success: true,
    markedCount: result.count,
    ticketId,
  };
};

/**
 * Get Messenger Conversation Channels (Facebook Messenger style inbox)
 * For Client: Left sidebar shows 2 primary channels: (1) Assigned Consultant, (2) Support/Staff Desk
 * For Staff: Shows incoming client conversations with unread badges and search
 */
const getConversations = async (
  user: { id: string; role?: string },
): Promise<TConversationListResponse> => {
  const isClient = user.role === "CLIENT";

  if (isClient) {
    // 1. Fetch client's active case and consultant info
    const activeCase = await prisma.clientCase.findFirst({
      where: { userId: user.id, isDeleted: false },
      select: {
        id: true,
        caseCode: true,
        serviceNameSnapshot: true,
        assignedConsultant: {
          select: {
            id: true,
            name: true,
            preferredName: true,
            email: true,
            phone: true,
            whatsapp: true,
            role: { select: { name: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const consultant = activeCase?.assignedConsultant;

    // 2. Fetch latest ticket for CONSULTANT channel
    const consultantTicket = await prisma.supportTicket.findFirst({
      where: {
        clientId: user.id,
        targetType: SupportTargetType.CONSULTANT,
        isDeleted: false,
      },
      orderBy: { lastMessageAt: "desc" },
      include: {
        messages: {
          orderBy: { createdAt: "desc" },
          take: 1,
          include: { sender: { select: { name: true } } },
        },
        _count: {
          select: {
            messages: {
              where: {
                senderId: { not: user.id },
                readAt: null,
              },
            },
          },
        },
      },
    });

    // 3. Fetch latest ticket for MANAGEMENT_ADMIN channel
    const supportTicket = await prisma.supportTicket.findFirst({
      where: {
        clientId: user.id,
        targetType: SupportTargetType.MANAGEMENT_ADMIN,
        isDeleted: false,
      },
      orderBy: { lastMessageAt: "desc" },
      include: {
        assignedStaff: { select: { name: true, role: { select: { name: true } } } },
        messages: {
          orderBy: { createdAt: "desc" },
          take: 1,
          include: { sender: { select: { name: true } } },
        },
        _count: {
          select: {
            messages: {
              where: {
                senderId: { not: user.id },
                readAt: null,
              },
            },
          },
        },
      },
    });

    const activeChannels: TConversationChannel[] = [];

    // Consultant channel (Channel 1)
    if (consultantTicket || consultant) {
      const lastMsg = consultantTicket?.messages[0];
      activeChannels.push({
        id: consultantTicket?.id || "consultant-direct",
        ticketCode: consultantTicket?.ticketCode || "ADVISOR-DIRECT",
        channelType: SupportTargetType.CONSULTANT,
        title: consultant ? consultant.name : "Assigned Case Consultant",
        subtitle: activeCase ? `${activeCase.caseCode} • Case Advisor` : "Dedicated Immigration Advisor",
        avatarName: consultant?.name || "Consultant",
        avatarRole: "Senior Case Advisor",
        contact: {
          email: consultant?.email,
          phone: consultant?.phone,
          whatsapp: consultant?.whatsapp,
          officeHours: "Mon – Fri: 9:00 AM – 6:00 PM EST",
        },
        caseInfo: activeCase
          ? {
              id: activeCase.id,
              caseCode: activeCase.caseCode,
              serviceName: activeCase.serviceNameSnapshot,
            }
          : null,
        lastMessage: lastMsg
          ? {
              text: lastMsg.message,
              createdAt: lastMsg.createdAt,
              senderName: lastMsg.sender.name,
              isStaffReply: lastMsg.isStaffReply,
              isFromMe: lastMsg.senderId === user.id,
              isRead: Boolean(lastMsg.readAt),
            }
          : null,
        unreadCount: consultantTicket?._count.messages || 0,
        status: consultantTicket?.status || SupportStatus.OPEN,
        priority: consultantTicket?.priority || SupportPriority.NORMAL,
        updatedAt: consultantTicket?.lastMessageAt || new Date(),
      });
    }

    // Support Desk channel (Channel 2)
    const deskLastMsg = supportTicket?.messages[0];
    activeChannels.push({
      id: supportTicket?.id || "support-desk-direct",
      ticketCode: supportTicket?.ticketCode || "SUPPORT-DESK",
      channelType: SupportTargetType.MANAGEMENT_ADMIN,
      title: "AdSkill Support & Operations Desk",
      subtitle: supportTicket?.assignedStaff
        ? `Handled by ${supportTicket.assignedStaff.name}`
        : "Billing, Fees & Platform Support",
      avatarName: supportTicket?.assignedStaff?.name || "AdSkill Desk",
      avatarRole: supportTicket?.assignedStaff?.role?.name || "Operations Team",
      contact: {
        email: CENTRAL_SUPPORT.email,
        phone: CENTRAL_SUPPORT.hotline,
        whatsapp: CENTRAL_SUPPORT.whatsapp,
        officeHours: CENTRAL_SUPPORT.businessHours,
      },
      caseInfo: activeCase
        ? {
            id: activeCase.id,
            caseCode: activeCase.caseCode,
            serviceName: activeCase.serviceNameSnapshot,
          }
        : null,
      lastMessage: deskLastMsg
        ? {
            text: deskLastMsg.message,
            createdAt: deskLastMsg.createdAt,
            senderName: deskLastMsg.sender.name,
            isStaffReply: deskLastMsg.isStaffReply,
            isFromMe: deskLastMsg.senderId === user.id,
            isRead: Boolean(deskLastMsg.readAt),
          }
        : null,
      unreadCount: supportTicket?._count.messages || 0,
      status: supportTicket?.status || SupportStatus.OPEN,
      priority: supportTicket?.priority || SupportPriority.NORMAL,
      updatedAt: supportTicket?.lastMessageAt || new Date(),
    });

    const totalUnreadCount = activeChannels.reduce(
      (sum, ch) => sum + ch.unreadCount,
      0,
    );

    return {
      activeChannels,
      totalUnreadCount,
      userRole: "CLIENT",
    };
  } else {
    // Staff view (Facebook Messenger Inbox style for Consultants & Admins)
    const whereConditions: Prisma.SupportTicketWhereInput = {
      isDeleted: false,
    };

    if (user.role === "CONSULTANT") {
      whereConditions.OR = [
        { assignedConsultantId: user.id },
        { assignedStaffId: user.id },
        { case: { assignedConsultantId: user.id } },
      ];
    }

    const tickets = await prisma.supportTicket.findMany({
      where: whereConditions,
      orderBy: { lastMessageAt: "desc" },
      take: 50,
      include: {
        client: {
          select: {
            id: true,
            name: true,
            preferredName: true,
            email: true,
            clientId: true,
          },
        },
        case: {
          select: {
            id: true,
            caseCode: true,
            serviceNameSnapshot: true,
          },
        },
        assignedConsultant: {
          select: { id: true, name: true, email: true },
        },
        assignedStaff: {
          select: { id: true, name: true, role: { select: { name: true } } },
        },
        messages: {
          orderBy: { createdAt: "desc" },
          take: 1,
          include: { sender: { select: { name: true } } },
        },
        _count: {
          select: {
            messages: {
              where: {
                isStaffReply: false,
                readAt: null,
              },
            },
          },
        },
      },
    });

    const activeChannels: TConversationChannel[] = tickets.map((t) => {
      const lastMsg = t.messages[0];
      const isConsultantTarget = t.targetType === SupportTargetType.CONSULTANT;

      return {
        id: t.id,
        ticketCode: t.ticketCode,
        channelType: t.targetType,
        title: t.client.name,
        subtitle: isConsultantTarget
          ? `Advisor Query • ${t.case?.caseCode || "Case"}`
          : `Support Desk • ${t.category.replace(/_/g, " ")}`,
        avatarName: t.client.name,
        avatarRole: t.client.clientId || "Client",
        client: t.client,
        caseInfo: t.case
          ? {
              id: t.case.id,
              caseCode: t.case.caseCode,
              serviceName: t.case.serviceNameSnapshot,
            }
          : null,
        lastMessage: lastMsg
          ? {
              text: lastMsg.message,
              createdAt: lastMsg.createdAt,
              senderName: lastMsg.sender.name,
              isStaffReply: lastMsg.isStaffReply,
              isFromMe: lastMsg.senderId === user.id,
              isRead: Boolean(lastMsg.readAt),
            }
          : null,
        unreadCount: t._count.messages,
        status: t.status,
        priority: t.priority,
        updatedAt: t.lastMessageAt,
      };
    });

    const totalUnreadCount = activeChannels.reduce(
      (sum, ch) => sum + ch.unreadCount,
      0,
    );

    return {
      activeChannels,
      totalUnreadCount,
      userRole: user.role || "STAFF",
    };
  }
};

export const SupportService = {
  getSupportOverview,
  createTicket,
  getTickets,
  getTicketById,
  sendMessage,
  updateTicketStatus,
  markTicketRead,
  getConversations,
  createInquiry,
  getMyInquiries,
};


