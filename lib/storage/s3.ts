import { randomUUID } from "node:crypto";
import {
  PutObjectCommand,
  S3Client,
  type PutObjectCommandInput,
} from "@aws-sdk/client-s3";
import { getServerConfig } from "@/lib/server-config";

interface S3StorageConfig {
  bucket: string;
  legacyPublicBaseUrls: string[];
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

const uploadScopeToKeyPrefix = {
  default: "uploads",
  "inventory-zone": "inventory/zones",
  "inventory-structure-type": "inventory/structure-types",
  "inventory-asset-image": "inventory/assets",
  "inventory-face-image": "inventory/faces",
  "catalog-face-primary": "catalog/faces",
  "orders-creative": "orders/creatives",
  "orders-purchase-order": "orders/purchase-orders",
} as const;

type KnownUploadScope = keyof typeof uploadScopeToKeyPrefix;

let cachedConfig: S3StorageConfig | null = null;
let cachedS3Client: S3Client | null = null;

function getS3StorageConfig(): S3StorageConfig {
  if (cachedConfig) {
    return cachedConfig;
  }

  const serverConfig = getServerConfig();

  cachedConfig = {
    bucket: serverConfig.awsS3Bucket,
    legacyPublicBaseUrls: serverConfig.awsLegacyPublicBaseUrls,
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

function isKnownUploadScope(scope: string): scope is KnownUploadScope {
  return scope in uploadScopeToKeyPrefix;
}

function normalizeUploadScopeSuffix(rawSuffix: string): string {
  const normalized = rawSuffix
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9/_-]/g, "-")
    .replace(/\/+/g, "/")
    .replace(/-+/g, "-")
    .replace(/^\/+|\/+$/g, "")
    .replace(/^-+|-+$/g, "");

  return normalized || "uploads";
}

export function resolveUploadScopeKeyPrefix(scope: string | null | undefined): string {
  if (!scope) {
    return uploadScopeToKeyPrefix.default;
  }

  if (isKnownUploadScope(scope)) {
    return uploadScopeToKeyPrefix[scope];
  }

  if (scope.startsWith("orders-")) {
    return `orders/${normalizeUploadScopeSuffix(scope.slice("orders-".length))}`;
  }

  return uploadScopeToKeyPrefix.default;
}

export function isExpectedS3PublicUrl(rawUrl: string): boolean {
  let parsedUrl: URL;
  try {
    parsedUrl = new URL(rawUrl);
  } catch {
    return false;
  }

  let config: S3StorageConfig;
  try {
    config = getS3StorageConfig();
  } catch {
    return false;
  }

  const { bucket, legacyPublicBaseUrls, publicBaseUrl, region } = config;
  const configuredPublicBaseUrls = [
    publicBaseUrl,
    ...legacyPublicBaseUrls,
  ].filter((url): url is string => Boolean(url));

  for (const configuredBaseUrl of configuredPublicBaseUrls) {
    let parsedBaseUrl: URL;
    try {
      parsedBaseUrl = new URL(configuredBaseUrl);
    } catch {
      continue;
    }

    if (parsedUrl.origin !== parsedBaseUrl.origin) {
      continue;
    }

    const basePath = parsedBaseUrl.pathname.replace(/\/+$/g, "");
    if (!basePath || basePath === "/") {
      return parsedUrl.pathname.length > 1;
    }

    if (parsedUrl.pathname.startsWith(`${basePath}/`)) {
      return true;
    }
  }

  return parsedUrl.hostname === `${bucket}.s3.${region}.amazonaws.com`;
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
