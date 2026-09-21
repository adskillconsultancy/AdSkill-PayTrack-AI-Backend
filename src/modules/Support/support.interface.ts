import {
  SupportCategory,
  SupportPriority,
  SupportStatus,
  SupportTargetType,
} from "@prisma/client";

export type TCreateSupportTicketPayload = {
  targetType: SupportTargetType;
  caseId?: string;
  category: SupportCategory;
  priority?: SupportPriority;
  subject: string;
  initialMessage: string;
  attachments?: string[] | object[];
};

export type TSendMessagePayload = {
  message: string;
  attachments?: string[] | object[];
};

export type TUpdateTicketStatusPayload = {
  status?: SupportStatus;
  assignedStaffId?: string;
};

export type TTicketFilterOptions = {
  searchTerm?: string;
  status?: SupportStatus;
  category?: SupportCategory;
  targetType?: SupportTargetType;
  scope?: "all" | "assigned_to_me" | "mine" | "unassigned";
  caseId?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
};

// Legacy compatibility payload
export type TCreateSupportInquiryPayload = {
  caseId?: string;
  category: "BILLING_PAYMENT" | "MILESTONE_SCHEDULE" | "DOCUMENT_VERIFICATION" | "CASE_STATUS" | "GENERAL";
  subject: string;
  message: string;
  priority?: "LOW" | "NORMAL" | "URGENT";
  targetType?: "CONSULTANT" | "MANAGEMENT_ADMIN";
};

export type TSupportContact = {
  name: string;
  role: string;
  email: string;
  phone?: string | null;
  whatsapp?: string | null;
  officeHours: string;
};

export type TFaqItem = {
  id: string;
  category: string;
  question: string;
  answer: string;
};

export type TSupportOverviewResponse = {
  assignedConsultant: TSupportContact | null;
  centralSupport: {
    agencyName: string;
    email: string;
    hotline: string;
    whatsapp: string;
    officeAddress: string;
    businessHours: string;
    responseTime: string;
  };
  activeCases: Array<{
    id: string;
    caseCode: string;
    serviceName: string;
    destinationCountry?: string | null;
    status: string;
    financialStatus: string;
  }>;
  faqs: TFaqItem[];
  ticketStats?: {
    totalTickets: number;
    openTickets: number;
    resolvedTickets: number;
    awaitingReply: number;
  };
};

export type TConversationChannel = {
  id: string;
  ticketCode: string;
  channelType: SupportTargetType;
  title: string;
  subtitle?: string;
  avatarName: string;
  avatarRole: string;
  contact?: {
    email?: string | null;
    phone?: string | null;
    whatsapp?: string | null;
    officeHours?: string;
  };
  client?: {
    id: string;
    name: string;
    email: string;
    clientId?: string | null;
  };
  caseInfo?: {
    id: string;
    caseCode: string;
    serviceName: string;
  } | null;
  lastMessage?: {
    text: string;
    createdAt: Date;
    senderName: string;
    isStaffReply: boolean;
    isFromMe: boolean;
    isRead: boolean;
  } | null;
  unreadCount: number;
  status: SupportStatus;
  priority: SupportPriority;
  updatedAt: Date;
};

export type TConversationListResponse = {
  activeChannels: TConversationChannel[];
  totalUnreadCount: number;
  userRole: string;
};


