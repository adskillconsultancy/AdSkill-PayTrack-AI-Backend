import { Router } from "express";
import auth from "../../middlewares/auth";
import { optionalAuth } from "../../middlewares/optionalAuth";
import validateRequest from "../../middlewares/validateRequest";
import { LeadController } from "./lead.controller";
import { LeadValidation } from "./lead.validation";

const router = Router();

// 1. Create lead (open / public or authenticated)
router.post(
  "/",
  optionalAuth,
  validateRequest(LeadValidation.createLeadZodSchema),
  LeadController.createLead,
);

// 2. Public form endpoint (explicit for landing pages/websites)
router.post(
  "/public",
  optionalAuth,
  validateRequest(LeadValidation.createLeadZodSchema),
  LeadController.createLead,
);

// 3. Lead summary statistics
router.get(
  "/stats",
  auth(),
  LeadController.getLeadSummaryStats,
);

// 4. Get all leads with filtering & pagination
router.get(
  "/",
  auth(),
  LeadController.getAllLeads,
);

// 5. Get single lead details with timeline
router.get(
  "/:id",
  auth(),
  LeadController.getLeadById,
);

// 6. Update lead
router.patch(
  "/:id",
  auth(),
  validateRequest(LeadValidation.updateLeadZodSchema),
  LeadController.updateLead,
);

// 7. Add lead activity log (calls, WhatsApp, meeting, note)
router.post(
  "/:id/activities",
  auth(),
  validateRequest(LeadValidation.createLeadActivityZodSchema),
  LeadController.addLeadActivity,
);

// 8. Delete lead (soft delete)
router.delete(
  "/:id",
  auth(),
  LeadController.deleteLead,
);

export const LeadRoutes = router;
