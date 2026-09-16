export type TUploadedDocument = {
  key: string;
  bucket: string;
  originalName: string;
  mimeType: string;
  size: number;
  signedDownloadUrl: string;
  signedUrlExpiresIn: number;
  publicUrl?: string;
};
