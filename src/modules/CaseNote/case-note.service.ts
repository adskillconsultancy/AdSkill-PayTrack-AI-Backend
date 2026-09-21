import { NoteVisibility, Prisma } from "@prisma/client";
import httpStatus from "http-status";
import AppError from "../../errors/AppError";
import prisma from "../../lib/prisma";
import { AuditService } from "../Audit/audit.service";
import { TCreateCaseNotePayload, TUpdateCaseNotePayload } from "./case-note.interface";

const authorSelect = {
  id: true,
  name: true,
  preferredName: true,
  email: true,
  role: {
    select: {
      id: true,
      name: true,
    },
  },
};

const createNote = async (
  payload: TCreateCaseNotePayload,
  authorId: string,
  authorRole?: string,
  authorEmail?: string,
) => {
  // 1. Verify case exists
  const existingCase = await prisma.clientCase.findUnique({
    where: { id: payload.caseId, isDeleted: false },
    select: { id: true, userId: true, assignedConsultantId: true },
  });

  if (!existingCase) {
    throw new AppError(httpStatus.NOT_FOUND, "Target client case not found");
  }

  if (authorRole === "CONSULTANT" && existingCase.assignedConsultantId !== authorId) {
    throw new AppError(httpStatus.FORBIDDEN, "You are not assigned to this client case");
  }

  // 2. Check role constraints on visibility
  const visibility = payload.visibility || NoteVisibility.STAFF;

  if (visibility === NoteVisibility.SUPER_ADMIN && authorRole !== "SUPER_ADMIN") {
    throw new AppError(
      httpStatus.FORBIDDEN,
      "Only Super Administrators can create Super Admin Confidential notes",
    );
  }

  if (authorRole === "CLIENT") {
    // Clients can only post to their own case, and visibility is forced to CLIENT
    if (existingCase.userId !== authorId) {
      throw new AppError(httpStatus.FORBIDDEN, "Access denied to this case");
    }
  }

  // 3. Create note record
  const note = await prisma.caseNote.create({
    data: {
      caseId: payload.caseId,
      authorId,
      content: payload.content,
      visibility: authorRole === "CLIENT" ? NoteVisibility.CLIENT : visibility,
      isPinned: payload.isPinned ?? false,
    },
    include: {
      author: {
        select: authorSelect,
      },
    },
  });

  AuditService.writeAuditLog({
    actorId: authorId,
    actorEmail: authorEmail,
    action: "CREATE_NOTE",
    targetEntity: "CaseNote",
    targetId: note.id,
    afterValue: {
      caseId: note.caseId,
      visibility: note.visibility,
      isPinned: note.isPinned,
    },
  });

  return note;
};

const getCaseNotes = async (
  caseId: string,
  actorId: string,
  actorRole?: string,
) => {
  // 1. Verify case exists
  const existingCase = await prisma.clientCase.findUnique({
    where: { id: caseId, isDeleted: false },
    select: { id: true, userId: true, assignedConsultantId: true },
  });

  if (!existingCase) {
    throw new AppError(httpStatus.NOT_FOUND, "Target client case not found");
  }

  if (actorRole === "CONSULTANT" && existingCase.assignedConsultantId !== actorId) {
    throw new AppError(httpStatus.FORBIDDEN, "You are not assigned to this client case");
  }

  // 2. Determine visibility filter based on actor's role
  const whereCondition: Prisma.CaseNoteWhereInput = {
    caseId,
    isDeleted: false,
  };

  if (actorRole === "CLIENT") {
    if (existingCase.userId !== actorId) {
      throw new AppError(httpStatus.FORBIDDEN, "Access denied to this case");
    }
    whereCondition.visibility = NoteVisibility.CLIENT;
  } else if (actorRole !== "SUPER_ADMIN") {
    // Staff (Consultants, Managers) see CLIENT and STAFF notes; Super Admin notes are hidden
    whereCondition.visibility = {
      in: [NoteVisibility.CLIENT, NoteVisibility.STAFF],
    };
  }
  // Super Admin has no visibility restriction (sees CLIENT, STAFF, and SUPER_ADMIN)

  const notes = await prisma.caseNote.findMany({
    where: whereCondition,
    include: {
      author: {
        select: authorSelect,
      },
    },
    orderBy: [
      { isPinned: "desc" },
      { createdAt: "desc" },
    ],
  });

  return notes;
};

const updateNote = async (
  noteId: string,
  payload: TUpdateCaseNotePayload,
  actorId: string,
  actorRole?: string,
  actorEmail?: string,
) => {
  const existingNote = await prisma.caseNote.findUnique({
    where: { id: noteId, isDeleted: false },
  });

  if (!existingNote) {
    throw new AppError(httpStatus.NOT_FOUND, "Note not found");
  }

  // Only author or Super Admin can edit
  if (actorRole !== "SUPER_ADMIN" && existingNote.authorId !== actorId) {
    throw new AppError(httpStatus.FORBIDDEN, "You can only edit notes that you authored");
  }

  if (
    payload.visibility === NoteVisibility.SUPER_ADMIN &&
    actorRole !== "SUPER_ADMIN"
  ) {
    throw new AppError(
      httpStatus.FORBIDDEN,
      "Only Super Administrators can set Super Admin Confidential visibility",
    );
  }

  const updated = await prisma.caseNote.update({
    where: { id: noteId },
    data: {
      content: payload.content,
      visibility: payload.visibility,
      isPinned: payload.isPinned,
    },
    include: {
      author: {
        select: authorSelect,
      },
    },
  });

  AuditService.writeAuditLog({
    actorId,
    actorEmail,
    action: "UPDATE_NOTE",
    targetEntity: "CaseNote",
    targetId: updated.id,
    afterValue: {
      visibility: updated.visibility,
      isPinned: updated.isPinned,
    },
  });

  return updated;
};

const deleteNote = async (
  noteId: string,
  actorId: string,
  actorRole?: string,
  actorEmail?: string,
) => {
  const existingNote = await prisma.caseNote.findUnique({
    where: { id: noteId, isDeleted: false },
  });

  if (!existingNote) {
    throw new AppError(httpStatus.NOT_FOUND, "Note not found");
  }

  // Only author or Super Admin can delete
  if (actorRole !== "SUPER_ADMIN" && existingNote.authorId !== actorId) {
    throw new AppError(httpStatus.FORBIDDEN, "You can only delete notes that you authored");
  }

  await prisma.caseNote.update({
    where: { id: noteId },
    data: {
      isDeleted: true,
      deletedAt: new Date(),
    },
  });

  AuditService.writeAuditLog({
    actorId,
    actorEmail,
    action: "DELETE_NOTE",
    targetEntity: "CaseNote",
    targetId: noteId,
    beforeValue: {
      caseId: existingNote.caseId,
      visibility: existingNote.visibility,
    },
  });

  return { message: "Note deleted successfully" };
};

export const CaseNoteService = {
  createNote,
  getCaseNotes,
  updateNote,
  deleteNote,
};
