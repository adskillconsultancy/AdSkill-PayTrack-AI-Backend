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


export const AttendanceValidation = {
  clockInSchema,
  clockOutSchema,
  updateFocusSchema,
};
