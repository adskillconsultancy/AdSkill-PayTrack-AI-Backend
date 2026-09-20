import { z } from "zod";
import { ServiceCategory } from "@prisma/client";

const generateReportSchema = z.object({
  body: z.object({
    searchTerm: z.string().trim().optional(),
    category: z
      .union([z.nativeEnum(ServiceCategory), z.literal("ALL")])
      .optional(),
    startDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Start date must be YYYY-MM-DD")
      .optional()
      .or(z.literal("")),
    endDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "End date must be YYYY-MM-DD")
      .optional()
      .or(z.literal("")),
    sortBy: z
      .enum([
        "paymentDate",
        "verifiedAmount",
        "contractedFee",
        "clientName",
        "programName",
      ])
      .optional(),
    sortOrder: z.enum(["asc", "desc"]).optional(),
    page: z.number().int().positive().optional(),
    limit: z.number().int().positive().max(100).optional(),
  }),
});

export const ReportValidation = {
  generateReportSchema,
};
