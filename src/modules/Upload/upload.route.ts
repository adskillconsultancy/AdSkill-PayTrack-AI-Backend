import { Router } from "express";
import auth from "../../middlewares/auth";
import { UploadController } from "./upload.controller";
import upload from "./upload.middleware";

const router = Router();

router.post(
  "/document",
  auth(),
  upload.single("file"),
  UploadController.uploadDocument,
);

export const UploadRoutes = router;
