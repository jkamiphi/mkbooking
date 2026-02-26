import { Buffer } from "node:buffer";
import "dotenv/config";
import { db } from "../lib/db";
import {
  buildPublicObjectUrl,
  createS3ObjectKey,
  uploadPublicObject,
} from "../lib/storage/s3";

const BLOB_HOST_FRAGMENT = "blob.vercel-storage.com";
const DEFAULT_BATCH_SIZE = 100;

interface ParsedArguments {
  batchSize: number;
  execute: boolean;
}

interface RecordWithUrl {
  id: string;
  url: string;
}

interface MigrationStats {
  candidates: number;
  errors: number;
  migrated: number;
  processed: number;
  skipped: number;
}

interface MigrationTarget {
  fetchBatch: (lastId: string | null, batchSize: number) => Promise<RecordWithUrl[]>;
  keyPrefix: string;
  label: string;
  updateUrl: (id: string, newUrl: string) => Promise<void>;
}

const MIME_BY_EXTENSION: Record<string, string> = {
  ".gif": "image/gif",
  ".jpeg": "image/jpeg",
  ".jpg": "image/jpeg",
  ".pdf": "application/pdf",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".webp": "image/webp",
};

function parseArguments(argv: string[]): ParsedArguments {
  const isExecute = argv.includes("--execute");
  const isDryRun = argv.includes("--dry-run");

  if (isExecute && isDryRun) {
    throw new Error("Use either --execute or --dry-run, not both");
  }

  const batchSizeArgument = argv.find((argument) =>
    argument.startsWith("--batch-size=")
  );
  const batchSizeValue = batchSizeArgument
    ? Number(batchSizeArgument.split("=")[1])
    : DEFAULT_BATCH_SIZE;

  if (!Number.isInteger(batchSizeValue) || batchSizeValue <= 0) {
    throw new Error("Batch size must be a positive integer");
  }

  return {
    batchSize: batchSizeValue,
    execute: isExecute,
  };
}

function isVercelBlobUrl(rawUrl: string): boolean {
  try {
    const parsedUrl = new URL(rawUrl);
    return parsedUrl.hostname.includes(BLOB_HOST_FRAGMENT);
  } catch {
    return false;
  }
}

function getFileNameFromUrl(url: string, fallbackName: string): string {
  try {
    const parsedUrl = new URL(url);
    const pathnameParts = decodeURIComponent(parsedUrl.pathname)
      .split("/")
      .filter(Boolean);
    const lastPathSegment = pathnameParts[pathnameParts.length - 1];

    return lastPathSegment || fallbackName;
  } catch {
    return fallbackName;
  }
}

function inferMimeType(fileName: string): string {
  const extensionIndex = fileName.lastIndexOf(".");

  if (extensionIndex < 0) {
    return "application/octet-stream";
  }

  const extension = fileName.slice(extensionIndex).toLowerCase();
  return MIME_BY_EXTENSION[extension] || "application/octet-stream";
}

function createMigrationTargets(): MigrationTarget[] {
  return [
    {
      fetchBatch: (lastId, batchSize) =>
        db.zone.findMany({
          orderBy: { id: "asc" },
          select: { id: true, imageUrl: true },
          take: batchSize,
          where: {
            id: lastId ? { gt: lastId } : undefined,
            imageUrl: { contains: BLOB_HOST_FRAGMENT },
          },
        })
          .then((rows) =>
            rows
              .filter((row): row is { id: string; imageUrl: string } => Boolean(row.imageUrl))
              .map((row) => ({ id: row.id, url: row.imageUrl }))
          ),
      keyPrefix: "migrated/zone",
      label: "Zone.imageUrl",
      updateUrl: (id, newUrl) =>
        db.zone.update({
          data: { imageUrl: newUrl },
          where: { id },
        }).then(() => undefined),
    },
    {
      fetchBatch: (lastId, batchSize) =>
        db.structureType.findMany({
          orderBy: { id: "asc" },
          select: { id: true, imageUrl: true },
          take: batchSize,
          where: {
            id: lastId ? { gt: lastId } : undefined,
            imageUrl: { contains: BLOB_HOST_FRAGMENT },
          },
        })
          .then((rows) =>
            rows
              .filter((row): row is { id: string; imageUrl: string } => Boolean(row.imageUrl))
              .map((row) => ({ id: row.id, url: row.imageUrl }))
          ),
      keyPrefix: "migrated/structure-type",
      label: "StructureType.imageUrl",
      updateUrl: (id, newUrl) =>
        db.structureType.update({
          data: { imageUrl: newUrl },
          where: { id },
        }).then(() => undefined),
    },
    {
      fetchBatch: (lastId, batchSize) =>
        db.orderCreative.findMany({
          orderBy: { id: "asc" },
          select: { fileUrl: true, id: true },
          take: batchSize,
          where: {
            fileUrl: { contains: BLOB_HOST_FRAGMENT },
            id: lastId ? { gt: lastId } : undefined,
          },
        })
          .then((rows) => rows.map((row) => ({ id: row.id, url: row.fileUrl }))),
      keyPrefix: "migrated/order-creative",
      label: "OrderCreative.fileUrl",
      updateUrl: (id, newUrl) =>
        db.orderCreative.update({
          data: { fileUrl: newUrl },
          where: { id },
        }).then(() => undefined),
    },
  ];
}

async function migrateTarget(
  target: MigrationTarget,
  options: ParsedArguments
): Promise<MigrationStats> {
  const stats: MigrationStats = {
    candidates: 0,
    errors: 0,
    migrated: 0,
    processed: 0,
    skipped: 0,
  };
  let lastId: string | null = null;

  console.log(`\n=== ${target.label} ===`);

  while (true) {
    const batch = await target.fetchBatch(lastId, options.batchSize);

    if (batch.length === 0) {
      break;
    }

    for (const record of batch) {
      stats.processed += 1;
      lastId = record.id;

      if (!isVercelBlobUrl(record.url)) {
        stats.skipped += 1;
        console.log(`[SKIP] ${target.label} ${record.id} -> URL is not a Vercel Blob URL`);
        continue;
      }

      stats.candidates += 1;

      try {
        const fallbackFileName = `${target.label.replace(/\W+/g, "-")}-${record.id}`;
        const fileName = getFileNameFromUrl(record.url, fallbackFileName);

        if (!options.execute) {
          const targetKey = createS3ObjectKey(fileName, {
            keyPrefix: target.keyPrefix,
          });
          const targetUrl = buildPublicObjectUrl(targetKey);

          console.log(`[DRY-RUN] ${target.label} ${record.id}: ${record.url} -> ${targetUrl}`);
          stats.migrated += 1;
          continue;
        }

        const sourceResponse = await fetch(record.url);

        if (!sourceResponse.ok) {
          throw new Error(`Source download failed with status ${sourceResponse.status}`);
        }

        const sourceContentType = sourceResponse.headers.get("content-type");
        const contentType = sourceContentType || inferMimeType(fileName);
        const fileBuffer = Buffer.from(await sourceResponse.arrayBuffer());
        const uploadResult = await uploadPublicObject({
          body: fileBuffer,
          contentType,
          fileName,
          keyPrefix: target.keyPrefix,
          metadata: {
            source: "vercel-blob-migration",
            sourceRecordId: record.id,
          },
        });

        await target.updateUrl(record.id, uploadResult.url);
        console.log(`[OK] ${target.label} ${record.id}: ${record.url} -> ${uploadResult.url}`);

        stats.migrated += 1;
      } catch (error) {
        stats.errors += 1;
        const message = error instanceof Error ? error.message : "Unknown error";
        console.error(`[ERROR] ${target.label} ${record.id}: ${message}`);
      }
    }
  }

  return stats;
}

function printSummary(mode: string, totals: MigrationStats): void {
  console.log("\n=== Summary ===");
  console.log(`Mode: ${mode}`);
  console.log(`Processed: ${totals.processed}`);
  console.log(`Candidates: ${totals.candidates}`);
  console.log(`Migrated: ${totals.migrated}`);
  console.log(`Skipped: ${totals.skipped}`);
  console.log(`Errors: ${totals.errors}`);
}

async function main(): Promise<void> {
  const options = parseArguments(process.argv.slice(2));
  const mode = options.execute ? "execute" : "dry-run";

  console.log(`Starting Blob to S3 migration in ${mode} mode...`);
  console.log(`Batch size: ${options.batchSize}`);

  const totalStats: MigrationStats = {
    candidates: 0,
    errors: 0,
    migrated: 0,
    processed: 0,
    skipped: 0,
  };
  const targets = createMigrationTargets();

  for (const target of targets) {
    const stats = await migrateTarget(target, options);

    totalStats.candidates += stats.candidates;
    totalStats.errors += stats.errors;
    totalStats.migrated += stats.migrated;
    totalStats.processed += stats.processed;
    totalStats.skipped += stats.skipped;
  }

  printSummary(mode, totalStats);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await db.$disconnect();
  });
