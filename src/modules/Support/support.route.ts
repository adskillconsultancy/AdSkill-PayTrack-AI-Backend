import { Router } from "express";
import auth from "../../middlewares/auth";
import validateRequest from "../../middlewares/validateRequest";
import { SupportController } from "./support.controller";
import { SupportValidation } from "./support.validation";

const router = Router();

// Get Support Overview (Assigned Consultant, Central Support Desk, Active Cases, Curated FAQs, Ticket Stats)
router.get("/overview", auth(), SupportController.getSupportOverview);

// Create Support Ticket with Smart Routing (Assigned Consultant vs Central Desk)
router.post(
  "/tickets",
  auth(),
  validateRequest(SupportValidation.createSupportTicketValidationSchema),
  SupportController.createTicket,
);

// Get Support Tickets (Role-scoped: Client gets own; Consultant gets assigned; Staff/Admin gets all)
router.get("/tickets", auth(), SupportController.getTickets);

// Get Messenger Conversation Channels (Left sidebar for Client & Staff)
router.get("/conversations", auth(), SupportController.getConversations);

// Get Specific Ticket with complete threaded conversation
router.get("/tickets/:id", auth(), SupportController.getTicketById);

// Mark conversation messages as read (Read receipts)
router.patch("/tickets/:id/read", auth(), SupportController.markTicketRead);

// Send Message in Ticket Conversation (Threaded chat reply for client & staff)
router.post(
  "/tickets/:id/messages",
  auth(),
  validateRequest(SupportValidation.sendMessageValidationSchema),
  SupportController.sendMessage,
);

// Update Ticket Status or Reassign Handler (Staff/Admin)
router.patch(
  "/tickets/:id/status",
  auth(),
  validateRequest(SupportValidation.updateTicketStatusValidationSchema),
  SupportController.updateTicketStatus,
);

// ==================== LEGACY COMPATIBILITY ROUTES ====================

// Submit Legacy Support Ticket / Inquiry
router.post(
  "/inquiries",
  auth(),
  validateRequest(SupportValidation.createSupportInquiryValidationSchema),
  SupportController.createInquiry,
);

// Get User's Past Support Inquiries & Responses
router.get("/inquiries", auth(), SupportController.getMyInquiries);

export const SupportRoutes = router;

