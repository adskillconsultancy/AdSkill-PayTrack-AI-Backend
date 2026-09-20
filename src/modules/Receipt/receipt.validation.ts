import { z } from "zod";
const paymentReceiptValidationSchema = z.object({ params: z.object({ paymentId: z.string().uuid("Invalid payment ID") }) });
const receiptIdValidationSchema = z.object({ params: z.object({ id: z.string().uuid("Invalid receipt ID") }) });
const caseReceiptValidationSchema = z.object({ params: z.object({ caseId: z.string().uuid("Invalid case ID") }) });
export const ReceiptValidation = { paymentReceiptValidationSchema, receiptIdValidationSchema, caseReceiptValidationSchema };
