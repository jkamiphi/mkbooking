import { randomUUID } from "node:crypto";
import {
  PutObjectCommand,
  S3Client,
  type PutObjectCommandInput,
} from "@aws-sdk/client-s3";
import { getServerConfig } from "@/lib/server-config";

interface S3StorageConfig {
  bucket: string;
  publicBaseUrl: string | null;
  region: string;
}

export interface UploadPublicObjectInput {
  body: NonNullable<PutObjectCommandInput["Body"]>;
  cacheControl?: string;
  contentType: string;
  fileName: string;
  keyPrefix?: string;
  metadata?: Record<string, string>;
}

export interface UploadPublicObjectResult {
  bucket: string;
  contentType: string;
  key: string;
  url: string;
}

let cachedConfig: S3StorageConfig | null = null;
let cachedS3Client: S3Client | null = null;

function getS3StorageConfig(): S3StorageConfig {
  if (cachedConfig) {
    return cachedConfig;
  }

  const serverConfig = getServerConfig();

  cachedConfig = {
    bucket: serverConfig.awsS3Bucket,
    publicBaseUrl: serverConfig.awsS3PublicBaseUrl,
    region: serverConfig.awsRegion,
  };

  return cachedConfig;
}

function getS3Client(): S3Client {
  if (cachedS3Client) {
    return cachedS3Client;
  }

  const { region } = getS3StorageConfig();
  const serverConfig = getServerConfig();

  cachedS3Client = new S3Client({
    credentials: {
      accessKeyId: serverConfig.awsAccessKeyId,
      secretAccessKey: serverConfig.awsSecretAccessKey,
    },
    region,
  });

  return cachedS3Client;
}

function sanitizeFileName(fileName: string): string {
  const fileNameWithoutPath = fileName.split(/[/\\]/).pop() || "file";
  const normalizedFileName = fileNameWithoutPath
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "");
  const sanitizedFileName = normalizedFileName
    .replace(/[^a-zA-Z0-9._-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^\.+/, "")
    .replace(/^-+|-+$/g, "");
  const truncatedFileName = sanitizedFileName.slice(0, 120);

  if (!truncatedFileName || truncatedFileName === "." || truncatedFileName === "..") {
    return "file";
  }

  return truncatedFileName;
}

function normalizeKeyPrefix(keyPrefix: string): string {
  const trimmedPrefix = keyPrefix.trim().replace(/^\/+|\/+$/g, "");
  return trimmedPrefix || "uploads";
}

function getDatePath(date: Date): string {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  return `${year}/${month}/${day}`;
}

export function createS3ObjectKey(
  fileName: string,
  options?: { keyPrefix?: string; now?: Date }
): string {
  const prefix = normalizeKeyPrefix(options?.keyPrefix || "uploads");
  const datePath = getDatePath(options?.now || new Date());
  const safeFileName = sanitizeFileName(fileName);

  return `${prefix}/${datePath}/${randomUUID()}-${safeFileName}`;
}

export function buildPublicObjectUrl(key: string): string {
  const { bucket, publicBaseUrl, region } = getS3StorageConfig();
  const encodedKey = key.split("/").map(encodeURIComponent).join("/");

  if (publicBaseUrl) {
    return `${publicBaseUrl.replace(/\/+$/g, "")}/${encodedKey}`;
  }

  return `https://${bucket}.s3.${region}.amazonaws.com/${encodedKey}`;
}

export async function uploadPublicObject(
  input: UploadPublicObjectInput
): Promise<UploadPublicObjectResult> {
  const { bucket } = getS3StorageConfig();
  const key = createS3ObjectKey(input.fileName, {
    keyPrefix: input.keyPrefix,
  });

  await getS3Client().send(
    new PutObjectCommand({
      Body: input.body,
      Bucket: bucket,
      CacheControl: input.cacheControl,
      ContentType: input.contentType,
      Key: key,
      Metadata: input.metadata,
    })
  );

  return {
    bucket,
    contentType: input.contentType,
    key,
    url: buildPublicObjectUrl(key),
  };
}
