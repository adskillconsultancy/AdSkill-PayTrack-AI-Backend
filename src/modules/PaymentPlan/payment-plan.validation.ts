import { z } from "zod";

const installmentSchema = z.object({
  sequenceNumber: z.number().int().min(1),
  title: z.string().trim().min(1).max(200).optional(),
  amount: z.number().positive().finite(),
  dueDate: z.string().datetime({ offset: true }),
});

const createPaymentPlanValidationSchema = z.object({
  params: z.object({ caseId: z.string().uuid("Invalid case ID") }),
  body: z.object({
    currency: z.string().trim().length(3).transform((value) => value.toUpperCase()).optional(),
    discountAmount: z.number().min(0).finite().optional(),
    discountReason: z.string().trim().min(2).max(500).optional(),
    depositAmount: z.number().min(0).finite().optional(),
    scheduleType: z.string().trim().min(2).max(50),
    paymentMethod: z.string().trim().min(2).max(50).optional(),
    gracePeriodDays: z.number().int().min(0).max(365).optional(),
    latePaymentPolicy: z.string().trim().max(1000).optional(),
    installments: z.array(installmentSchema).min(1).max(60),
  }),
});

const paymentPlanIdValidationSchema = z.object({
  params: z.object({ id: z.string().uuid("Invalid payment plan ID") }),
});

const casePaymentPlansValidationSchema = z.object({
  params: z.object({ caseId: z.string().uuid("Invalid case ID") }),
});

export const PaymentPlanValidation = {
  createPaymentPlanValidationSchema,
  paymentPlanIdValidationSchema,
  casePaymentPlansValidationSchema,
};
