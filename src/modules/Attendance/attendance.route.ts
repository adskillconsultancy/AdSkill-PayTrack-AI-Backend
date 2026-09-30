import { Router } from "express";
import auth from "../../middlewares/auth";
import validateRequest from "../../middlewares/validateRequest";
import { AttendanceController } from "./attendance.controller";
import { AttendanceValidation } from "./attendance.validation";
import { PERMISSIONS } from "../User/user.constant";

const router = Router();

// Clock in / out / focus
router.post(
  "/clock-in",
  auth(PERMISSIONS.ATTENDANCE_TRACK),
  validateRequest(AttendanceValidation.clockInSchema),
  AttendanceController.clockIn,
);

router.post(
  "/clock-out",
  auth(PERMISSIONS.ATTENDANCE_TRACK),
  validateRequest(AttendanceValidation.clockOutSchema),
  AttendanceController.clockOut,
);

router.patch(
  "/focus",
  auth(PERMISSIONS.ATTENDANCE_TRACK),
  validateRequest(AttendanceValidation.updateFocusSchema),
  AttendanceController.updateFocus,
);

// Current personal status
router.get(
  "/status",
  auth(PERMISSIONS.ATTENDANCE_TRACK),
  AttendanceController.getCurrentStatus,
);

// Personal history
router.get(
  "/my-history",
  auth(PERMISSIONS.ATTENDANCE_READ_SELF),
  AttendanceController.getMyHistory,
);

// Team attendance (Admin & Manager with attendance:read-all)
router.get(
  "/team",
  auth(PERMISSIONS.ATTENDANCE_READ_ALL),
  AttendanceController.getTeamAttendance,
);

// Daily AI Digest (Admin & Manager with attendance:digest-read)
router.get(
  "/digest/today",
  auth(PERMISSIONS.ATTENDANCE_DIGEST_READ),
  AttendanceController.getTodayDigest,
);

router.post(
  "/digest/generate",
  auth(PERMISSIONS.ATTENDANCE_DIGEST_READ),
  validateRequest(AttendanceValidation.generateDigestSchema),
  AttendanceController.generateDigest,
);

export const AttendanceRoutes = router;
