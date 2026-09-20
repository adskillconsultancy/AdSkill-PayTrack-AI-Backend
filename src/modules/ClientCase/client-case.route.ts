import { Router } from "express";
import auth from "../../middlewares/auth";
import validateRequest from "../../middlewares/validateRequest";
import { ClientCaseController } from "./client-case.controller";
import { ClientCaseValidation } from "./client-case.validation";
import { PERMISSIONS } from "../User/user.constant";

const router = Router();

router.post(
  "/",
  auth(PERMISSIONS.CASE_CREATE),
  validateRequest(ClientCaseValidation.createClientCaseValidationSchema),
  ClientCaseController.createClientCase,
);

router.get("/mine", auth(PERMISSIONS.CASE_READ), ClientCaseController.getMyCases);

router.get(
  "/:id",
  auth(PERMISSIONS.CASE_READ),
  validateRequest(ClientCaseValidation.caseIdValidationSchema),
  ClientCaseController.getCaseById,
);

router.patch(
  "/:id",
  auth(PERMISSIONS.CASE_MANAGE),
  validateRequest(ClientCaseValidation.updateClientCaseValidationSchema),
  ClientCaseController.updateCase,
);

export const ClientCaseRoutes = router;
