import { NoteVisibility } from "@prisma/client";
import httpStatus from "http-status";
import AppError from "../../errors/AppError";
import prisma from "../../lib/prisma";
import {
  TCreateSupportInquiryPayload,
  TFaqItem,
  TSupportOverviewResponse,
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
  };
};

const createInquiry = async (
  userId: string,
  payload: TCreateSupportInquiryPayload,
) => {
  // Resolve case: either passed or first active case for client
  let targetCaseId = payload.caseId;
  if (!targetCaseId) {
    const firstCase = await prisma.clientCase.findFirst({
      where: { userId, isDeleted: false },
      select: { id: true },
      orderBy: { createdAt: "desc" },
    });
    if (!firstCase) {
      throw new AppError(httpStatus.BAD_REQUEST, "No active case found to attach support inquiry");
    }
    targetCaseId = firstCase.id;
  }

  const clientCase = await prisma.clientCase.findFirst({
    where: { id: targetCaseId, isDeleted: false },
    select: { id: true, userId: true },
  });

  if (!clientCase) {
    throw new AppError(httpStatus.NOT_FOUND, "Associated case not found");
  }

  if (clientCase.userId !== userId) {
    throw new AppError(httpStatus.FORBIDDEN, "You cannot submit an inquiry for this case");
  }

  const ticketCode = `TKT-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;

  const formattedContent = `[SUPPORT INQUIRY #${ticketCode} | Category: ${payload.category} | Priority: ${payload.priority || "NORMAL"}]\nSubject: ${payload.subject}\n\n${payload.message}`;

  const note = await prisma.caseNote.create({
    data: {
      caseId: targetCaseId,
      authorId: userId,
      content: formattedContent,
      visibility: NoteVisibility.CLIENT,
    },
    include: {
      author: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
  });

  return {
    ticketCode,
    noteId: note.id,
    createdAt: note.createdAt,
    category: payload.category,
    subject: payload.subject,
    status: "RECEIVED",
    message: "Your support inquiry has been logged successfully and routed to your case advisor.",
  };
};

const getMyInquiries = async (userId: string) => {
  const userCases = await prisma.clientCase.findMany({
    where: { userId, isDeleted: false },
    select: { id: true, caseCode: true },
  });

  const caseIds = userCases.map((c) => c.id);
  if (!caseIds.length) return [];

  const notes = await prisma.caseNote.findMany({
    where: {
      caseId: { in: caseIds },
      isDeleted: false,
      OR: [
        { authorId: userId },
        { content: { contains: "SUPPORT INQUIRY" } },
      ],
    },
    orderBy: { createdAt: "desc" },
    include: {
      author: {
        select: {
          id: true,
          name: true,
          email: true,
          role: { select: { name: true } },
        },
      },
      case: {
        select: {
          caseCode: true,
          serviceNameSnapshot: true,
        },
      },
    },
  });

  return notes.map((n) => {
    const isTicket = n.content.includes("SUPPORT INQUIRY");
    const subjectMatch = n.content.match(/Subject:\s*(.*?)(\n|$)/);
    const categoryMatch = n.content.match(/Category:\s*(.*?)(\s*\||$)/);

    return {
      id: n.id,
      ticketCode: isTicket ? (n.content.match(/#([A-Z0-9-]+)/)?.[1] || "INQ") : "NOTE",
      category: categoryMatch ? categoryMatch[1].trim() : "GENERAL",
      subject: subjectMatch ? subjectMatch[1].trim() : "Case Inquiry",
      content: n.content,
      caseCode: n.case?.caseCode,
      serviceName: n.case?.serviceNameSnapshot,
      authorName: n.author.name,
      authorRole: n.author.role?.name,
      isStaffReply: n.author.role?.name !== "CLIENT",
      createdAt: n.createdAt,
      status: n.author.role?.name !== "CLIENT" ? "RESPONDED" : "OPEN",
    };
  });
};

export const SupportService = {
  getSupportOverview,
  createInquiry,
  getMyInquiries,
};
