import { Router } from "express";
import {
  listBackupsController,
  triggerBackupController,
} from "./backup.controller";

const router = Router();

// List existing backups stored in Cloudflare R2
router.get("/", listBackupsController);

// Allows both GET and POST for convenience (GET is used by Vercel Cron)
router.get("/run", triggerBackupController);
router.post("/run", triggerBackupController);

export const BackupRoutes = router;

