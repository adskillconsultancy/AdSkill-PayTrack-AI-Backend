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

// 4. Follow-up reminder queue (Urgent-First, Staff-Scoped)
router.get(
  "/follow-ups",
  auth(),
  LeadController.getFollowUpQueue,
);

// 5. Get all leads with filtering & pagination
router.get(
  "/",
  auth(),
  LeadController.getAllLeads,
);

// 6. Complete lead follow-up
router.patch(
  "/:id/complete-follow-up",
  auth(),
  validateRequest(LeadValidation.completeFollowUpZodSchema),
  LeadController.completeFollowUp,
);

// 7. Get single lead details with timeline
router.get(
  "/:id",
  auth(),
  LeadController.getLeadById,
);

// 8. Update lead
router.patch(
  "/:id",
  auth(),
  validateRequest(LeadValidation.updateLeadZodSchema),
  LeadController.updateLead,
);

// 9. Add lead activity log (calls, WhatsApp, meeting, note)
router.post(
  "/:id/activities",
  auth(),
  validateRequest(LeadValidation.createLeadActivityZodSchema),
  LeadController.addLeadActivity,
);

// 10. Update lead activity log
router.patch(
  "/activities/:activityId",
  auth(),
  LeadController.updateLeadActivity,
);
router.patch(
  "/:id/activities/:activityId",
  auth(),
  LeadController.updateLeadActivity,
);

// 11. Delete lead activity log
router.delete(
  "/activities/:activityId",
  auth(),
  LeadController.deleteLeadActivity,
);
router.delete(
  "/:id/activities/:activityId",
  auth(),
  LeadController.deleteLeadActivity,
);

// 12. Delete lead (soft delete)
router.delete(
  "/:id",
  auth(),
  LeadController.deleteLead,
);

export const LeadRoutes = router;
