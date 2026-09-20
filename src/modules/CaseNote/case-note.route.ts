import { Router } from "express";
import auth from "../../middlewares/auth";
import validateRequest from "../../middlewares/validateRequest";
import { CaseNoteController } from "./case-note.controller";
import { CaseNoteValidation } from "./case-note.validation";
import { PERMISSIONS } from "../User/user.constant";

const router = Router();

router.post(
  "/",
  auth(PERMISSIONS.NOTE_CREATE, PERMISSIONS.CASE_READ),
  validateRequest(CaseNoteValidation.createCaseNoteSchema),
  CaseNoteController.createNote,
);

router.get(
  "/case/:caseId",
  auth(PERMISSIONS.NOTE_READ, PERMISSIONS.CASE_READ),
  CaseNoteController.getCaseNotes,
);

router.patch(
  "/:id",
  auth(PERMISSIONS.NOTE_CREATE, PERMISSIONS.CASE_READ),
  validateRequest(CaseNoteValidation.updateCaseNoteSchema),
  CaseNoteController.updateNote,
);

router.delete(
  "/:id",
  auth(PERMISSIONS.NOTE_CREATE, PERMISSIONS.CASE_READ),
  CaseNoteController.deleteNote,
);

export const CaseNoteRoutes = router;
