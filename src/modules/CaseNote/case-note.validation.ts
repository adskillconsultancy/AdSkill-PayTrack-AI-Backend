import { z } from "zod";
import { NoteVisibility } from "@prisma/client";

const createCaseNoteSchema = z.object({
  body: z.object({
    caseId: z.string({ required_error: "Case ID is required" }).uuid("Invalid Case ID"),
    content: z.string({ required_error: "Note content is required" }).min(1, "Note content cannot be empty"),
    visibility: z.nativeEnum(NoteVisibility).optional().default(NoteVisibility.STAFF),
    isPinned: z.boolean().optional().default(false),
  }),
});

const updateCaseNoteSchema = z.object({
  body: z.object({
    content: z.string().min(1, "Note content cannot be empty").optional(),
    visibility: z.nativeEnum(NoteVisibility).optional(),
    isPinned: z.boolean().optional(),
  }),
});

export const CaseNoteValidation = {
  createCaseNoteSchema,
  updateCaseNoteSchema,
};
