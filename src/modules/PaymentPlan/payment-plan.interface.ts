import { Prisma } from "@prisma/client";

export type TCreatePaymentPlanPayload = {
  currency?: string;
  discountAmount?: number;
  discountReason?: string;
  depositAmount?: number;
  scheduleType: string;
  paymentMethod?: string;
  gracePeriodDays?: number;
  latePaymentPolicy?: string;
  installments: Array<{
    sequenceNumber: number;
    title?: string;
    amount: number;
    dueDate: string;
  }>;
};

export type TPaymentPlanWithInstallments = Prisma.PaymentPlanGetPayload<{
  include: { installments: true };
}>;
