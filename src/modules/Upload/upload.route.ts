import { Router } from "express";
import auth from "../../middlewares/auth";
import validateRequest from "../../middlewares/validateRequest";
import { UploadController } from "./upload.controller";
import { PERMISSIONS } from "../User/user.constant";
import upload from "./upload.middleware";
import { UploadValidation } from "./upload.validation";

const router = Router();

router.post(
  "/document",
  auth(PERMISSIONS.DOCUMENT_UPLOAD),
  upload.single("file"),
  UploadController.uploadDocument,
);

router.post(
  "/cases/:caseId/documents",
  auth(PERMISSIONS.DOCUMENT_UPLOAD),
  upload.array("files", 10),
  validateRequest(UploadValidation.caseDocumentsValidationSchema),
  UploadController.uploadCaseDocuments,
);

router.get(
  "/cases/:caseId/documents",
  auth(PERMISSIONS.DOCUMENT_READ),
  validateRequest(UploadValidation.caseDocumentsListValidationSchema),
  UploadController.getCaseDocuments,
);

router.get(
  "/documents/:documentId/download",
  auth(PERMISSIONS.DOCUMENT_READ),
  validateRequest(UploadValidation.documentDownloadValidationSchema),
  UploadController.getDocumentDownload,
);

router.delete(
  "/documents/:documentId",
  auth(PERMISSIONS.DOCUMENT_DELETE),
  validateRequest(UploadValidation.documentDeleteValidationSchema),
  UploadController.deleteDocument,
);

export const UploadRoutes = router;
