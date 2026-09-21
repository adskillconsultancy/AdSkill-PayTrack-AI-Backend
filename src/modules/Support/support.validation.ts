import { z } from "zod";

const createSupportInquiryValidationSchema = z.object({
  body: z.object({
    caseId: z.string().uuid("Invalid case ID").optional(),
    category: z.enum([
      "BILLING_PAYMENT",
      "MILESTONE_SCHEDULE",
      "DOCUMENT_VERIFICATION",
      "CASE_STATUS",
      "GENERAL",
    ], {
      required_error: "Inquiry category is required",
    }),
    subject: z.string({
      required_error: "Inquiry subject is required",
    }).min(3, "Subject must be at least 3 characters").max(200),
    message: z.string({
      required_error: "Inquiry message is required",
    }).min(10, "Message must be at least 10 characters").max(4000),
    priority: z.enum(["LOW", "NORMAL", "URGENT"]).optional().default("NORMAL"),
  }),
});

export const SupportValidation = {
  createSupportInquiryValidationSchema,
};
