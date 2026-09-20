import { NoteVisibility } from "@prisma/client";

export type TCreateCaseNotePayload = {
  caseId: string;
  content: string;
  visibility?: NoteVisibility;
  isPinned?: boolean;
};

export type TUpdateCaseNotePayload = {
  content?: string;
  visibility?: NoteVisibility;
  isPinned?: boolean;
};
