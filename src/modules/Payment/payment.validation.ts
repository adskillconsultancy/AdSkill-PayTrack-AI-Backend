import { z } from "zod";

const createPaymentValidationSchema = z.object({
  body: z.object({
    caseId: z.string().uuid("Invalid case ID"),
    installmentId: z.string().uuid("Invalid installment ID").optional(),
    amount: z.number().positive().finite(),
    currency: z.string().trim().length(3).transform((value) => value.toUpperCase()),
    paymentDate: z.string().datetime({ offset: true }).optional(),
    paymentMethod: z.string().trim().min(2).max(50),
    externalReference: z.string().trim().max(200).optional(),
    idempotencyKey: z.string().trim().min(8).max(200).optional(),
    operationalNotes: z.string().trim().max(2000).optional(),
    proofDocumentIds: z.array(z.string().uuid("Invalid document ID")).optional(),
  }),
});

const paymentIdValidationSchema = z.object({
  params: z.object({ id: z.string().uuid("Invalid payment ID") }),
});

const casePaymentsValidationSchema = z.object({
  params: z.object({ caseId: z.string().uuid("Invalid case ID") }),
});

export const PaymentValidation = {
  createPaymentValidationSchema,
  paymentIdValidationSchema,
  casePaymentsValidationSchema,
};
