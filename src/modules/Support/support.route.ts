import { Router } from "express";
import auth from "../../middlewares/auth";
import validateRequest from "../../middlewares/validateRequest";
import { PERMISSIONS } from "../User/user.constant";
import { SupportController } from "./support.controller";
import { SupportValidation } from "./support.validation";

const router = Router();

// Get Support Overview (Assigned Consultant, Central Support Desk, Active Cases, Curated FAQs, Ticket Stats)
router.get(
  "/overview",
  auth(PERMISSIONS.SUPPORT_READ),
  SupportController.getSupportOverview,
);

// Create Support Ticket with Smart Routing (Assigned Consultant vs Central Desk)
router.post(
  "/tickets",
  auth(PERMISSIONS.SUPPORT_CREATE),
  validateRequest(SupportValidation.createSupportTicketValidationSchema),
  SupportController.createTicket,
);

// Get Support Tickets (Role-scoped: Client gets own; Consultant gets assigned; Staff/Admin gets all)
router.get(
  "/tickets",
  auth(PERMISSIONS.SUPPORT_READ),
  SupportController.getTickets,
);

// Get Messenger Conversation Channels (Left sidebar for Client & Staff)
router.get(
  "/conversations",
  auth(PERMISSIONS.SUPPORT_READ),
  SupportController.getConversations,
);

// Get Specific Ticket with complete threaded conversation
router.get(
  "/tickets/:id",
  auth(PERMISSIONS.SUPPORT_READ),
  SupportController.getTicketById,
);

// Mark conversation messages as read (Read receipts)
router.patch(
  "/tickets/:id/read",
  auth(PERMISSIONS.SUPPORT_READ, PERMISSIONS.SUPPORT_REPLY),
  SupportController.markTicketRead,
);

// Send Message in Ticket Conversation (Threaded chat reply for client & staff)
router.post(
  "/tickets/:id/messages",
  auth(PERMISSIONS.SUPPORT_REPLY),
  validateRequest(SupportValidation.sendMessageValidationSchema),
  SupportController.sendMessage,
);

// Update Ticket Status or Reassign Handler (Staff/Admin - Requires 'support:manage')
router.patch(
  "/tickets/:id/status",
  auth(PERMISSIONS.SUPPORT_MANAGE),
  validateRequest(SupportValidation.updateTicketStatusValidationSchema),
  SupportController.updateTicketStatus,
);

// ==================== LEGACY COMPATIBILITY ROUTES ====================

// Submit Legacy Support Ticket / Inquiry
router.post(
  "/inquiries",
  auth(PERMISSIONS.SUPPORT_CREATE),
  validateRequest(SupportValidation.createSupportInquiryValidationSchema),
  SupportController.createInquiry,
);

// Get User's Past Support Inquiries & Responses
router.get(
  "/inquiries",
  auth(PERMISSIONS.SUPPORT_READ),
  SupportController.getMyInquiries,
);

export const SupportRoutes = router;

