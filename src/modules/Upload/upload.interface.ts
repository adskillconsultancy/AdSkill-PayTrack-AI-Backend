export type TUploadedDocument = {
  id?: string;
  key: string;
  bucket: string;
  originalName: string;
  storedName?: string;
  mimeType: string;
  size: number;
  signedDownloadUrl: string;
  signedUrlExpiresIn: number;
  publicUrl?: string;
};
