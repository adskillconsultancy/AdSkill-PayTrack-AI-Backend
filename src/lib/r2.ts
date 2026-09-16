import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import httpStatus from "http-status";
import config from "../config";
import AppError from "../errors/AppError";

const getR2Config = () => {
  const { endpoint, bucket, access_key_id, secret_access_key } = config.r2;

  if (!endpoint || !bucket || !access_key_id || !secret_access_key) {
    throw new AppError(
      httpStatus.INTERNAL_SERVER_ERROR,
      "Cloudflare R2 storage is not configured",
    );
  }

  return { endpoint, bucket, access_key_id, secret_access_key };
};

const createR2Client = () => {
  const { endpoint, access_key_id, secret_access_key } = getR2Config();

  return new S3Client({
    region: "auto",
    endpoint,
    credentials: {
      accessKeyId: access_key_id,
      secretAccessKey: secret_access_key,
    },
  });
};

export const uploadPrivateObject = async ({
  key,
  body,
  contentType,
  metadata,
}: {
  key: string;
  body: Buffer;
  contentType: string;
  metadata?: Record<string, string>;
}) => {
  const { bucket } = getR2Config();
  const client = createR2Client();

  await client.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: body,
      ContentType: contentType,
      Metadata: metadata,
    }),
  );

  return {
    bucket,
    key,
  };
};

export const getPrivateObjectSignedUrl = async (
  key: string,
  expiresIn = config.r2.signed_url_expires_in,
) => {
  const { bucket } = getR2Config();
  const client = createR2Client();

  return getSignedUrl(
    client,
    new GetObjectCommand({
      Bucket: bucket,
      Key: key,
    }),
    { expiresIn },
  );
};

export const deletePrivateObject = async (key: string) => {
  const { bucket } = getR2Config();
  const client = createR2Client();

  await client.send(
    new DeleteObjectCommand({
      Bucket: bucket,
      Key: key,
    }),
  );
};
