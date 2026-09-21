import crypto from "crypto";
import httpStatus from "http-status";
import config from "../../config";
import AppError from "../../errors/AppError";
import {
  deletePrivateObject,
  getPrivateObjectSignedUrl,
  uploadPrivateObject,
} from "../../lib/r2";
import prisma from "../../lib/prisma";
import { UPLOAD_FOLDERS } from "./upload.constant";
import { TUploadedDocument } from "./upload.interface";

const sanitizeFileName = (fileName: string) =>
  fileName.trim().replace(/[^a-zA-Z0-9._-]/g, "-").replace(/-+/g, "-").slice(0, 120);

const isStaffActor = async (actorId: string) => {
  const actor = await prisma.user.findFirst({
    where: { id: actorId, isDeleted: false, status: "ACTIVE" },
    select: { role: { select: { name: true } } },
  });
  return actor?.role.name !== "CLIENT";
};

const hasValidSignature = (file: Express.Multer.File) => {
  if (file.mimetype === "application/pdf") return file.buffer.subarray(0, 5).toString() === "%PDF-";
  if (file.mimetype === "image/jpeg") return file.buffer.subarray(0, 3).equals(Buffer.from([0xff, 0xd8, 0xff]));
  if (file.mimetype === "image/png") return file.buffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  return false;
};

const ensureSafeFile = (file: Express.Multer.File) => {
  if (!hasValidSignature(file)) {
    throw new AppError(httpStatus.BAD_REQUEST, "File content does not match its declared type");
  }
};
const createDocumentKey = (userId: string, originalName: string) => {
  const now = new Date();
  const year = now.getUTCFullYear();
  const month = String(now.getUTCMonth() + 1).padStart(2, "0");
  const id = crypto.randomUUID();
  return `${UPLOAD_FOLDERS.DOCUMENTS}/${userId}/${year}/${month}/${id}-${sanitizeFileName(originalName)}`;
};

const createCaseDocumentKey = (
  clientId: string | null,
  caseCode: string,
  documentId: string,
  originalName: string,
  documentType?: string,
) => {
  const safeClientId = (clientId || "CLIENT").replace(/[^a-zA-Z0-9_-]/g, "-");
  const safeCaseCode = caseCode.replace(/[^a-zA-Z0-9_-]/g, "-");
  if (documentType === "PAYMENT_PROOF") {
    const ext = originalName.includes(".") ? originalName.split(".").pop() : "bin";
    const timestamp = Date.now();
    return `${UPLOAD_FOLDERS.DOCUMENTS}/${safeClientId}/${safeCaseCode}/payment_${safeClientId}-${timestamp}.${ext}`;
  }
  return `${UPLOAD_FOLDERS.DOCUMENTS}/${safeClientId}/${safeCaseCode}/${documentId}-${sanitizeFileName(originalName)}`;
};

const uploadDocument = async (file: Express.Multer.File | undefined, actorId: string): Promise<TUploadedDocument> => {
  if (!file) throw new AppError(httpStatus.BAD_REQUEST, "Document file is required");
  ensureSafeFile(file);
  const key = createDocumentKey(actorId, file.originalname);
  const result = await uploadPrivateObject({
    key,
    body: file.buffer,
    contentType: file.mimetype,
    metadata: { uploadedBy: actorId, originalName: sanitizeFileName(file.originalname) },
  });
  return {
    key,
    bucket: result.bucket,
    originalName: file.originalname,
    mimeType: file.mimetype,
    size: file.size,
    signedDownloadUrl: await getPrivateObjectSignedUrl(key),
    signedUrlExpiresIn: config.r2.signed_url_expires_in,
    ...(config.r2.public_base_url && { publicUrl: `${config.r2.public_base_url.replace(/\/$/, "")}/${key}` }),
  };
};

const uploadCaseDocuments = async (
  files: Express.Multer.File[],
  caseId: string,
  actorId: string,
  documentType: "AGREEMENT" | "INVOICE" | "RECEIPT" | "PAYMENT_PROOF" | "IDENTITY" | "SUPPORTING" | "OTHER" = "SUPPORTING",
  paymentId?: string,
  userRole?: string,
): Promise<TUploadedDocument[]> => {
  if (!files.length) throw new AppError(httpStatus.BAD_REQUEST, "At least one document file is required");
  const staff = await isStaffActor(actorId);
  const clientCase = await prisma.clientCase.findFirst({
    where: staff
      ? { id: caseId, isDeleted: false }
      : { id: caseId, userId: actorId, isDeleted: false },
    select: { userId: true, caseCode: true, assignedConsultantId: true, user: { select: { clientId: true } } },
  });
  if (!clientCase) throw new AppError(httpStatus.NOT_FOUND, "Client case not found");
  if (userRole === "CONSULTANT" && clientCase.assignedConsultantId !== actorId) {
    throw new AppError(httpStatus.FORBIDDEN, "You are not assigned to this client case");
  }

  const uploadedKeys: string[] = [];
  try {
    const results: TUploadedDocument[] = [];
    for (const file of files) {
      ensureSafeFile(file);
      const documentId = crypto.randomUUID();
      const key = createCaseDocumentKey(clientCase.user.clientId, clientCase.caseCode, documentId, file.originalname, documentType);
      const uploadResult = await uploadPrivateObject({
        key,
        body: file.buffer,
        contentType: file.mimetype,
        metadata: { uploadedBy: actorId, caseId, documentId, originalName: sanitizeFileName(file.originalname) },
      });
      uploadedKeys.push(key);
      const storedName = documentType === "PAYMENT_PROOF"
        ? key.split("/").pop() || `${documentId}-${sanitizeFileName(file.originalname)}`
        : `${documentId}-${sanitizeFileName(file.originalname)}`;
      const document = await prisma.document.create({
        data: {
          id: documentId,
          userId: clientCase.userId,
          caseId,
          paymentId: paymentId || undefined,
          documentType,
          objectKey: key,
          bucket: uploadResult.bucket,
          storedName,
          originalName: file.originalname,
          mimeType: file.mimetype,
          size: file.size,
          uploadedById: actorId,
        },
      });
      results.push({
        id: document.id,
        key,
        bucket: document.bucket,
        originalName: document.originalName,
        storedName: document.storedName,
        mimeType: document.mimeType,
        size: document.size,
        signedDownloadUrl: await getPrivateObjectSignedUrl(key),
        signedUrlExpiresIn: config.r2.signed_url_expires_in,
      });
    }
    return results;
  } catch (error) {
    await Promise.allSettled(uploadedKeys.map((key) => deletePrivateObject(key)));
    throw error;
  }
};

const getCaseDocuments = async (caseId: string, actorId: string, userRole?: string) => {
  if (userRole === "CONSULTANT") {
    const assigned = await prisma.clientCase.findFirst({
      where: { id: caseId, assignedConsultantId: actorId, isDeleted: false },
      select: { id: true },
    });
    if (!assigned) throw new AppError(httpStatus.FORBIDDEN, "You are not assigned to this client case");
  }
  const staff = await isStaffActor(actorId);
  const documents = await prisma.document.findMany({
    where: {
      caseId,
      isDeleted: false,
      ...(staff ? {} : { userId: actorId }),
    },
    orderBy: { createdAt: "desc" },
  });
  if (!documents.length) {
    const clientCase = await prisma.clientCase.findFirst({
      where: staff
        ? { id: caseId, isDeleted: false }
        : { id: caseId, userId: actorId, isDeleted: false },
      select: { id: true },
    });
    if (!clientCase) throw new AppError(httpStatus.NOT_FOUND, "Client case not found");
  }
  return Promise.all(documents.map(async (document) => ({
    id: document.id,
    key: document.objectKey,
    bucket: document.bucket,
    originalName: document.originalName,
    storedName: document.storedName,
    mimeType: document.mimeType,
    size: document.size,
    signedDownloadUrl: await getPrivateObjectSignedUrl(document.objectKey),
    signedUrlExpiresIn: config.r2.signed_url_expires_in,
    documentType: document.documentType,
    scanStatus: document.scanStatus,
    createdAt: document.createdAt,
  })));
};

const deleteDocument = async (documentId: string, actorId: string, userRole?: string) => {
  const staff = await isStaffActor(actorId);
  const document = await prisma.document.findFirst({
    where: { id: documentId, isDeleted: false, ...(staff ? {} : { userId: actorId }) },
    include: { case: { select: { assignedConsultantId: true } } },
  });
  if (!document) throw new AppError(httpStatus.NOT_FOUND, "Document not found");
  if (userRole === "CONSULTANT" && document.case?.assignedConsultantId !== actorId) {
    throw new AppError(httpStatus.FORBIDDEN, "You are not assigned to this client case");
  }
  await prisma.document.update({ where: { id: documentId }, data: { isDeleted: true, deletedAt: new Date() } });
  await deletePrivateObject(document.objectKey);
  return { id: document.id, deleted: true };
};
const getDocumentDownload = async (documentId: string, actorId: string, userRole?: string) => {
  const staff = await isStaffActor(actorId);
  const document = await prisma.document.findFirst({
    where: {
      id: documentId,
      isDeleted: false,
      ...(staff ? {} : { userId: actorId }),
    },
    include: { case: { select: { assignedConsultantId: true } } },
  });

  if (!document) throw new AppError(httpStatus.NOT_FOUND, "Document not found");
  if (userRole === "CONSULTANT" && document.case?.assignedConsultantId !== actorId) {
    throw new AppError(httpStatus.FORBIDDEN, "You are not assigned to this client case");
  }
  if (document.scanStatus === "REJECTED") {
    throw new AppError(httpStatus.FORBIDDEN, "Rejected documents cannot be downloaded");
  }

  return {
    id: document.id,
    originalName: document.originalName,
    signedDownloadUrl: await getPrivateObjectSignedUrl(document.objectKey),
    signedUrlExpiresIn: config.r2.signed_url_expires_in,
  };
};

export const UploadService = {
  uploadDocument,
  uploadCaseDocuments,
  getCaseDocuments,
  getDocumentDownload,
  deleteDocument,
};
