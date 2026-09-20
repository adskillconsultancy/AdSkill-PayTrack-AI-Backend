import { z } from "zod";
import { CaseStatus } from "@prisma/client";

const optionalDate = z.string().datetime({ offset: true }).optional();

const createClientCaseValidationSchema = z.object({
  body: z.object({
    serviceId: z.string().uuid("Invalid service ID"),
    destinationCountry: z.string().trim().min(2).max(100).optional(),
    caseCategory: z.string().trim().min(2).max(100).optional(),
    caseSubcategory: z.string().trim().min(2).max(100).optional(),
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
    destinationCountry: z.string().trim().min(2).max(100).optional(),
    caseCategory: z.string().trim().min(2).max(100).optional(),
    caseSubcategory: z.string().trim().min(2).max(100).optional(),
    agreementDate: optionalDate,
    serviceStartDate: optionalDate,
    caseStatus: z.nativeEnum(CaseStatus).optional(),
    clientVisibleNotes: z.string().trim().max(10000).optional(),
    internalNotes: z.string().trim().max(20000).optional(),
    superAdminNotes: z.string().trim().max(20000).optional(),
    assignedConsultantId: z.string().uuid().nullable().optional(),
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
