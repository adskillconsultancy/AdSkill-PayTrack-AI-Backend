import { z } from "zod";
import { DocumentType } from "@prisma/client";

const caseDocumentsValidationSchema = z.object({
  params: z.object({ caseId: z.string().uuid("Invalid case ID") }),
  body: z.object({
    documentType: z.nativeEnum(DocumentType).optional(),
    paymentId: z.string().uuid("Invalid payment ID").optional(),
  }),
});

const caseDocumentsListValidationSchema = z.object({
  params: z.object({ caseId: z.string().uuid("Invalid case ID") }),
});

const documentDownloadValidationSchema = z.object({
  params: z.object({ documentId: z.string().uuid("Invalid document ID") }),
});

const documentDeleteValidationSchema = z.object({
  params: z.object({ documentId: z.string().uuid("Invalid document ID") }),
});

export const UploadValidation = {
  caseDocumentsValidationSchema,
  caseDocumentsListValidationSchema,
  documentDownloadValidationSchema,
  documentDeleteValidationSchema,
};
