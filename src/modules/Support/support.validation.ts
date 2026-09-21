import { z } from "zod";

const createSupportTicketValidationSchema = z.object({
  body: z.object({
    targetType: z.enum(["CONSULTANT", "MANAGEMENT_ADMIN"], {
      required_error: "Target recipient is required (CONSULTANT or MANAGEMENT_ADMIN)",
    }),
    caseId: z.string().uuid("Invalid case ID").optional(),
    category: z.enum(
      [
        "CASE_STATUS",
        "DOCUMENT_VERIFICATION",
        "BILLING_PAYMENT",
        "MILESTONE_SCHEDULE",
        "SERVICE_INQUIRY",
        "GENERAL",
      ],
      {
        required_error: "Inquiry category is required",
      },
    ),
    priority: z.enum(["LOW", "NORMAL", "URGENT"]).optional().default("NORMAL"),
    subject: z
      .string({
        required_error: "Subject is required",
      })
      .min(3, "Subject must be at least 3 characters")
      .max(200, "Subject cannot exceed 200 characters"),
    initialMessage: z
      .string({
        required_error: "Initial message is required",
      })
      .min(5, "Message must be at least 5 characters")
      .max(4000, "Message cannot exceed 4000 characters"),
    attachments: z.array(z.any()).optional(),
  }),
});

const sendMessageValidationSchema = z.object({
  body: z.object({
    message: z
      .string({
        required_error: "Message is required",
      })
      .min(1, "Message cannot be empty")
      .max(4000, "Message cannot exceed 4000 characters"),
    attachments: z.array(z.any()).optional(),
  }),
});

const updateTicketStatusValidationSchema = z.object({
  body: z.object({
    status: z
      .enum(["OPEN", "IN_PROGRESS", "WAITING_ON_CLIENT", "RESOLVED", "CLOSED"])
      .optional(),
    assignedStaffId: z.string().uuid("Invalid staff ID").optional(),
  }),
});

// Legacy backward compatibility schema
const createSupportInquiryValidationSchema = z.object({
  body: z.object({
    caseId: z.string().uuid("Invalid case ID").optional(),
    targetType: z.enum(["CONSULTANT", "MANAGEMENT_ADMIN"]).optional().default("MANAGEMENT_ADMIN"),
    category: z.enum(
      [
        "BILLING_PAYMENT",
        "MILESTONE_SCHEDULE",
        "DOCUMENT_VERIFICATION",
        "CASE_STATUS",
        "SERVICE_INQUIRY",
        "GENERAL",
      ],
      {
        required_error: "Inquiry category is required",
      },
    ),
    subject: z
      .string({
        required_error: "Inquiry subject is required",
      })
      .min(3, "Subject must be at least 3 characters")
      .max(200),
    message: z
      .string({
        required_error: "Inquiry message is required",
      })
      .min(5, "Message must be at least 5 characters")
      .max(4000),
    priority: z.enum(["LOW", "NORMAL", "URGENT"]).optional().default("NORMAL"),
  }),
});

export const SupportValidation = {
  createSupportTicketValidationSchema,
  sendMessageValidationSchema,
  updateTicketStatusValidationSchema,
  createSupportInquiryValidationSchema,
};

