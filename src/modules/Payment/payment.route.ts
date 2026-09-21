import { Router } from "express";
import auth from "../../middlewares/auth";
import validateRequest from "../../middlewares/validateRequest";
import { PERMISSIONS } from "../User/user.constant";
import { PaymentController } from "./payment.controller";
import { PaymentValidation } from "./payment.validation";

const router = Router();

router.get(
  "/",
  auth(PERMISSIONS.PAYMENT_READ),
  PaymentController.getAllPayments,
);
router.post(
  "/",
  auth(PERMISSIONS.PAYMENT_PAY, PERMISSIONS.PAYMENT_RECORD, PERMISSIONS.PAYMENT_READ),
  validateRequest(PaymentValidation.createPaymentValidationSchema),
  PaymentController.createPayment,
);
router.get(
  "/cases/:caseId",
  auth(PERMISSIONS.PAYMENT_READ),
  validateRequest(PaymentValidation.casePaymentsValidationSchema),
  PaymentController.listPayments,
);
router.get(
  "/:id",
  auth(PERMISSIONS.PAYMENT_READ),
  validateRequest(PaymentValidation.paymentIdValidationSchema),
  PaymentController.getPaymentById,
);
router.post(
  "/:id/verify",
  auth(PERMISSIONS.PAYMENT_VERIFY),
  validateRequest(PaymentValidation.paymentIdValidationSchema),
  PaymentController.verifyPayment,
);

export const PaymentRoutes = router;
