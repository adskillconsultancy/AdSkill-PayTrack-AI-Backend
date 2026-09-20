import { z } from "zod";
import { CaseStatus } from "@prisma/client";

const optionalDate = z.string().datetime({ offset: true }).optional();

const createClientCaseValidationSchema = z.object({
  body: z.object({
    userId: z.string().uuid("Invalid user ID").optional(),
    serviceId: z.string().uuid("Invalid service ID"),
    destinationCountry: z.string().trim().min(1).max(100).optional(),
    caseCategory: z.string().trim().min(1).max(100).optional(),
    caseSubcategory: z.string().trim().max(100).optional(),
    assignedConsultantId: z.string().uuid().or(z.literal("")).nullable().optional().transform(v => v || null),
    caseStatus: z.nativeEnum(CaseStatus).optional(),
    agreementDate: optionalDate,
    serviceStartDate: optionalDate,
    clientVisibleNotes: z.string().trim().max(10000).optional(),
    internalNotes: z.string().trim().max(20000).optional(),
    superAdminNotes: z.string().trim().max(20000).optional(),
  }),
});

const updateClientCaseValidationSchema = z.object({
  params: z.object({ id: z.string().uuid("Invalid case ID") }),
  body: z.object({
    destinationCountry: z.string().trim().min(1).max(100).optional(),
    caseCategory: z.string().trim().min(1).max(100).optional(),
    caseSubcategory: z.string().trim().max(100).optional(),
    agreementDate: optionalDate,
    serviceStartDate: optionalDate,
    caseStatus: z.nativeEnum(CaseStatus).optional(),
    clientVisibleNotes: z.string().trim().max(10000).optional(),
    internalNotes: z.string().trim().max(20000).optional(),
    superAdminNotes: z.string().trim().max(20000).optional(),
    assignedConsultantId: z.string().uuid().or(z.literal("")).nullable().optional().transform(v => v || null),
  }),
});

const caseIdValidationSchema = z.object({
  params: z.object({ id: z.string().uuid("Invalid case ID") }),
});

export const ClientCaseValidation = {
  createClientCaseValidationSchema,
  updateClientCaseValidationSchema,
  caseIdValidationSchema,
};
