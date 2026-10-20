import { z } from "zod";

const createExpenseSchema = z.object({
  body: z.object({
    type: z.enum(["EXPENSE", "INCOME"], {
      required_error: "Transaction type is required",
      invalid_type_error: "Type must be EXPENSE or INCOME",
    }),
    category: z
      .enum([
        "OFFICE_SUPPLIES",
        "UTILITIES",
        "RENT",
        "TRAVEL",
        "MEALS_ENTERTAINMENT",
        "MARKETING",
        "SALARY",
        "SOFTWARE_SUBSCRIPTIONS",
        "EQUIPMENT",
        "MAINTENANCE",
        "SERVICE_REVENUE",
        "CONSULTATION_FEE",
        "RETAINER",
        "REFERRAL_FEE",
        "MISCELLANEOUS_INCOME",
        "TAX",
        "OTHER",
      ])
      .optional()
      .default("OTHER"),
    otherCategory: z.string().max(120).optional(),
    amount: z.coerce
      .number({ required_error: "Amount is required" })
      .positive("Amount must be positive")
      .max(9999999999.99, "Amount exceeds maximum allowed"),
    currency: z.string().length(3, "Currency must be a 3-letter ISO code").optional().default("USD"),
    description: z.string().max(2000).optional(),
    transactionDate: z
      .string({ required_error: "Transaction date is required" })
      .refine((val) => !isNaN(Date.parse(val)), {
        message: "transactionDate must be a valid ISO date string",
      }),
  }),
});

const updateExpenseSchema = z.object({
  body: z
    .object({
      type: z.enum(["EXPENSE", "INCOME"]).optional(),
      category: z
        .enum([
          "OFFICE_SUPPLIES",
          "UTILITIES",
          "RENT",
          "TRAVEL",
          "MEALS_ENTERTAINMENT",
          "MARKETING",
          "SALARY",
          "SOFTWARE_SUBSCRIPTIONS",
          "EQUIPMENT",
          "MAINTENANCE",
          "SERVICE_REVENUE",
          "CONSULTATION_FEE",
          "RETAINER",
          "REFERRAL_FEE",
          "MISCELLANEOUS_INCOME",
          "TAX",
          "OTHER",
        ])
        .optional(),
      otherCategory: z.string().max(120).optional(),
      amount: z.coerce.number().positive().max(9999999999.99).optional(),
      currency: z.string().length(3).optional(),
      description: z.string().max(2000).optional(),
      transactionDate: z
        .string()
        .refine((val) => !isNaN(Date.parse(val)), {
          message: "transactionDate must be a valid ISO date string",
        })
        .optional(),
    })
    .strict(),
});

export const OfficeExpenseValidation = {
  createExpenseSchema,
  updateExpenseSchema,
};
