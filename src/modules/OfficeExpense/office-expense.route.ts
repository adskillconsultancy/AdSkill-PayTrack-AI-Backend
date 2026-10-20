import { Router } from "express";
import auth from "../../middlewares/auth";
import validateRequest from "../../middlewares/validateRequest";
import upload from "../Upload/upload.middleware";
import { PERMISSIONS } from "./office-expense.constant";
import { OfficeExpenseController } from "./office-expense.controller";
import { OfficeExpenseValidation } from "./office-expense.validation";

const router = Router();

// Dashboard summary (Super Admin — uses dashboard:view OR report:view)
router.get(
  "/dashboard-summary",
  auth("dashboard:view", "report:view"),
  OfficeExpenseController.getDashboardSummary,
);

// Create (requires expense:create)
// Accepts optional receipt file via multipart form (field: "receipt")
router.post(
  "/",
  auth(PERMISSIONS.EXPENSE_CREATE),
  upload.single("receipt"),
  validateRequest(OfficeExpenseValidation.createExpenseSchema),
  OfficeExpenseController.createExpense,
);

// List all (requires expense:read)
router.get(
  "/",
  auth(PERMISSIONS.EXPENSE_READ),
  OfficeExpenseController.getAllExpenses,
);

// Get single by ID (requires expense:read)
router.get(
  "/:id",
  auth(PERMISSIONS.EXPENSE_READ),
  OfficeExpenseController.getExpenseById,
);

// Update (requires expense:update)
router.patch(
  "/:id",
  auth(PERMISSIONS.EXPENSE_UPDATE),
  upload.single("receipt"),
  validateRequest(OfficeExpenseValidation.updateExpenseSchema),
  OfficeExpenseController.updateExpense,
);

// Soft-delete (requires expense:delete)
router.delete(
  "/:id",
  auth(PERMISSIONS.EXPENSE_DELETE),
  OfficeExpenseController.deleteExpense,
);

export const OfficeExpenseRoutes = router;
