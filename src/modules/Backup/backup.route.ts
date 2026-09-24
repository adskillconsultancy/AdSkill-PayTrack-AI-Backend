import { Router } from "express";
import { triggerBackupController } from "./backup.controller";

const router = Router();

// Allows both GET and POST for convenience (GET is used by Vercel Cron)
router.get("/run", triggerBackupController);
router.post("/run", triggerBackupController);

export const BackupRoutes = router;
