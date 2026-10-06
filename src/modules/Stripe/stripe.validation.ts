import { z } from "zod";

// ─── Create Payment Intent ────────────────────────────────────────────────────
// Amount and currency are NEVER accepted from the client.
// They are always computed server-side from the active PaymentPlan / Installment.
const createPaymentIntentSchema = z.object({
  body: z.object({
    caseId: z.string().uuid("Invalid case ID"),
    installmentId: z.string().uuid("Invalid installment ID").optional(),
    description: z.string().trim().max(500).optional(),
  }),
});

// ─── Get Payment Intent Status ───────────────────────────────────────────────
const paymentIntentStatusSchema = z.object({
  params: z.object({
    paymentId: z.string().uuid("Invalid payment ID"),
  }),
});

export const StripeValidation = {
  createPaymentIntentSchema,
  paymentIntentStatusSchema,
};
