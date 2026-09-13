import { z } from "zod";
import { ServiceCategory } from "@prisma/client";


const createServiceValidationSchema = z.object({
  body: z.object({
    name: z.string({
      required_error: "Service name is required",
    }).min(2, "Service name must be at least 2 characters"),
    code: z.string({
      required_error: "Service code / SKU is required",
    }).min(2, "Service code must be at least 2 characters"),
    category: z.nativeEnum(ServiceCategory).optional(),
    description: z.string().optional(),
    baseFee: z
      .number({
        required_error: "Base professional fee is required",
      })
      .min(0, "Base fee cannot be negative"),
    estimatedGovFee: z.number().min(0, "Government fee cannot be negative").optional(),
    estimatedAttorneyFee: z.number().min(0, "Attorney fee cannot be negative").optional(),
    estimatedThirdPartyFee: z.number().min(0, "Third-party fee cannot be negative").optional(),
    currency: z.string().length(3, "Currency must be a 3-letter code (e.g. USD)").optional(),
    defaultDeposit: z.number().min(0, "Default deposit cannot be negative").optional(),
    defaultInstallments: z.number().int().min(1, "Default installments must be at least 1").optional(),
    estimatedDuration: z.string().optional(),
    isActive: z.boolean().optional(),
  }),
});

const updateServiceValidationSchema = z.object({
  body: z.object({
    name: z.string().min(2).optional(),
    code: z.string().min(2).optional(),
    category: z.nativeEnum(ServiceCategory).optional(),
    description: z.string().optional(),
    baseFee: z.number().min(0).optional(),
    estimatedGovFee: z.number().min(0).optional(),
    estimatedAttorneyFee: z.number().min(0).optional(),
    estimatedThirdPartyFee: z.number().min(0).optional(),
    currency: z.string().length(3).optional(),
    defaultDeposit: z.number().min(0).optional(),
    defaultInstallments: z.number().int().min(1).optional(),
    estimatedDuration: z.string().optional(),
    isActive: z.boolean().optional(),
    isDeleted: z.boolean().optional(),
  }),
});

export const ServiceValidation = {
  createServiceValidationSchema,
  updateServiceValidationSchema,
};
