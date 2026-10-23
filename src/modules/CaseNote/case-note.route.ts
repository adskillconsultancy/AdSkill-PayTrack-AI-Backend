import { Router } from "express";
import auth from "../../middlewares/auth";
import validateRequest from "../../middlewares/validateRequest";
import { CaseNoteController } from "./case-note.controller";
import { CaseNoteValidation } from "./case-note.validation";
import { PERMISSIONS } from "../User/user.constant";

const router = Router();

router.post(
  "/",
  auth(PERMISSIONS.NOTE_CREATE),
  validateRequest(CaseNoteValidation.createCaseNoteSchema),
  CaseNoteController.createNote,
);

router.get(
  "/case/:caseId",
  auth(PERMISSIONS.NOTE_READ),
  CaseNoteController.getCaseNotes,
);

router.patch(
  "/:id",
  auth(PERMISSIONS.NOTE_UPDATE, PERMISSIONS.NOTE_MANAGE),
  validateRequest(CaseNoteValidation.updateCaseNoteSchema),
  CaseNoteController.updateNote,
);

router.delete(
  "/:id",
  auth(PERMISSIONS.NOTE_DELETE, PERMISSIONS.NOTE_MANAGE),
  CaseNoteController.deleteNote,
);

export const CaseNoteRoutes = router;
