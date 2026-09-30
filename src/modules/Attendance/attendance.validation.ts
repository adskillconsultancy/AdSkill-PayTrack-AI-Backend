import { z } from "zod";

const clockInSchema = z.object({
  body: z.object({
    currentFocus: z.string().trim().max(255).optional(),
  }),
});

const clockOutSchema = z.object({
  body: z.object({
    eodNotes: z.string().trim().optional(),
  }),
});

const updateFocusSchema = z.object({
  body: z.object({
    currentFocus: z.string().trim().min(1, "Current focus cannot be empty").max(255),
  }),
});

const generateDigestSchema = z.object({
  body: z.object({
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format, expected YYYY-MM-DD").optional(),
  }),
});

export const AttendanceValidation = {
  clockInSchema,
  clockOutSchema,
  updateFocusSchema,
  generateDigestSchema,
};
