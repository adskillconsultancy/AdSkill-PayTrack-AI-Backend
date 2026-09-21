import { z } from "zod";

const dashboardFilterSchema = z.object({
  query: z.object({
    period: z
      .enum(["today", "yesterday", "7d", "30d", "this_month", "custom"])
      .optional()
      .default("30d"),
    startDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "startDate must be in YYYY-MM-DD format")
      .optional(),
    endDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "endDate must be in YYYY-MM-DD format")
      .optional(),
  }),
});

const limitQuerySchema = z.object({
  query: z.object({
    limit: z.coerce.number().min(1).max(100).optional().default(10),
  }),
});

export const DashboardValidation = {
  dashboardFilterSchema,
  limitQuerySchema,
};
