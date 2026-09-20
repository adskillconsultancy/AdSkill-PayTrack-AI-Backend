import { Router } from "express";
import auth from "../../middlewares/auth";
import validateRequest from "../../middlewares/validateRequest";
import { PERMISSIONS } from "../User/user.constant";
import { PaymentPlanController } from "./payment-plan.controller";
import { PaymentPlanValidation } from "./payment-plan.validation";

const router = Router();

router.post(
  "/cases/:caseId",
  auth(PERMISSIONS.PLAN_CREATE),
  validateRequest(PaymentPlanValidation.createPaymentPlanValidationSchema),
  PaymentPlanController.createPaymentPlan,
);
router.get(
  "/cases/:caseId",
  auth(PERMISSIONS.PLAN_READ),
  validateRequest(PaymentPlanValidation.casePaymentPlansValidationSchema),
  PaymentPlanController.getCasePaymentPlans,
);
router.get(
  "/:id",
  auth(PERMISSIONS.PLAN_READ),
  validateRequest(PaymentPlanValidation.paymentPlanIdValidationSchema),
  PaymentPlanController.getPaymentPlanById,
);

export const PaymentPlanRoutes = router;
