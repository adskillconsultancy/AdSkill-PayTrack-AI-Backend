import crypto from "crypto";
import httpStatus from "http-status";
import config from "../../config";
import AppError from "../../errors/AppError";
import {
  getPrivateObjectSignedUrl,
  uploadPrivateObject,
} from "../../lib/r2";
import { UPLOAD_FOLDERS } from "./upload.constant";
import { TUploadedDocument } from "./upload.interface";

const sanitizeFileName = (fileName: string) =>
  fileName
    .trim()
    .replace(/[^a-zA-Z0-9._-]/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 120);

const createDocumentKey = (userId: string, originalName: string) => {
  const now = new Date();
  const year = now.getUTCFullYear();
  const month = String(now.getUTCMonth() + 1).padStart(2, "0");
  const id = crypto.randomUUID();
  const safeName = sanitizeFileName(originalName);

  return `${UPLOAD_FOLDERS.DOCUMENTS}/${userId}/${year}/${month}/${id}-${safeName}`;
};

const uploadDocument = async (
  file: Express.Multer.File | undefined,
  actorId: string,
): Promise<TUploadedDocument> => {
  if (!file) {
    throw new AppError(httpStatus.BAD_REQUEST, "Document file is required");
  }

  const key = createDocumentKey(actorId, file.originalname);
  const result = await uploadPrivateObject({
    key,
    body: file.buffer,
    contentType: file.mimetype,
    metadata: {
      uploadedBy: actorId,
      originalName: sanitizeFileName(file.originalname),
    },
  });
  const signedDownloadUrl = await getPrivateObjectSignedUrl(key);

  return {
    key,
    bucket: result.bucket,
    originalName: file.originalname,
    mimeType: file.mimetype,
    size: file.size,
    signedDownloadUrl,
    signedUrlExpiresIn: config.r2.signed_url_expires_in,
    ...(config.r2.public_base_url && {
      publicUrl: `${config.r2.public_base_url.replace(/\/$/, "")}/${key}`,
    }),
  };
};

export const UploadService = {
  uploadDocument,
};
