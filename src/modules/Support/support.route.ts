import { Router } from "express";
import auth from "../../middlewares/auth";
import validateRequest from "../../middlewares/validateRequest";
import { SupportController } from "./support.controller";
import { SupportValidation } from "./support.validation";

const router = Router();

// Get Support Overview (Assigned Consultant, Central Support Desk, Active Cases, Curated FAQs)
router.get("/overview", auth(), SupportController.getSupportOverview);

// Submit Support Ticket / Inquiry
router.post(
  "/inquiries",
  auth(),
  validateRequest(SupportValidation.createSupportInquiryValidationSchema),
  SupportController.createInquiry,
);

// Get User's Past Support Inquiries & Responses
router.get("/inquiries", auth(), SupportController.getMyInquiries);

export const SupportRoutes = router;
