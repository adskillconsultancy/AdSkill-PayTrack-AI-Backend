import { z } from "zod";

const installmentSchema = z.object({
  sequenceNumber: z.number().int().min(1),
  title: z.string().trim().min(1).max(200).optional(),
  amount: z.number().positive().finite(),
  dueDate: z.string().refine((val) => !isNaN(Date.parse(val)), {
    message: "Invalid date format for dueDate",
  }),
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

const updatePaymentPlanValidationSchema = z.object({
  params: z.object({ id: z.string().uuid("Invalid payment plan ID") }),
  body: z.object({
    amendmentReason: z.string().trim().min(2, "Amendment reason is required").max(500),
    paymentMethod: z.string().trim().min(2).max(50).optional(),
    gracePeriodDays: z.number().int().min(0).max(365).optional(),
    latePaymentPolicy: z.string().trim().max(1000).optional(),
    isActive: z.boolean().optional(),
  }),
});

const cleanUuid = (msg: string) =>
  z.string().transform((val) => {
    try {
      val = decodeURIComponent(val);
    } catch {}
    const match = val.match(/[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}/);
    return match ? match[0] : val.replace(/^[a-zA-Z0-9_-]+(=|%3D)/, "").trim();
  }).pipe(z.string().uuid(msg));

const paymentPlanIdValidationSchema = z.object({
  params: z.object({ id: cleanUuid("Invalid payment plan ID") }),
});

const casePaymentPlansValidationSchema = z.object({
  params: z.object({ caseId: cleanUuid("Invalid case ID") }),
});

export const PaymentPlanValidation = {
  createPaymentPlanValidationSchema,
  updatePaymentPlanValidationSchema,
  paymentPlanIdValidationSchema,
  casePaymentPlansValidationSchema,
};
