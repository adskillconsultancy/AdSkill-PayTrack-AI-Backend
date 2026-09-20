import { z } from "zod";

const caseInvoiceValidationSchema = z.object({
  params: z.object({ caseId: z.string().uuid("Invalid case ID") }),
});
const invoiceIdValidationSchema = z.object({
  params: z.object({ id: z.string().uuid("Invalid invoice ID") }),
});
export const InvoiceValidation = { caseInvoiceValidationSchema, invoiceIdValidationSchema };
