import "dotenv/config";
import { db } from "../lib/db";

const DEFAULT_BATCH_SIZE = 100;

interface ParsedArguments {
  batchSize: number;
  execute: boolean;
  sourceBaseUrls: URL[];
  targetBaseUrl: URL;
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
  label: string;
  updateUrl: (id: string, newUrl: string) => Promise<void>;
}

function parseCsv(value: string | undefined): string[] {
  if (!value) {
    return [];
  }

  return value
    .split(",")
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
}

function parseRequiredUrl(value: string, label: string): URL {
  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    throw new Error(`${label} must be a valid URL`);
  }

  if (!["http:", "https:"].includes(parsed.protocol)) {
    throw new Error(`${label} must use http or https`);
  }

  return parsed;
}

function getArgumentValue(argv: string[], key: string): string | undefined {
  const argument = argv.find((item) => item.startsWith(`${key}=`));
  if (!argument) {
    return undefined;
  }

  return argument.slice(`${key}=`.length);
}

function normalizeBaseUrl(url: URL): URL {
  const normalized = new URL(url.toString());
  normalized.pathname = normalized.pathname.replace(/\/+$/g, "");
  normalized.search = "";
  normalized.hash = "";
  return normalized;
}

function getBaseUrlKey(url: URL): string {
  return `${url.protocol}//${url.host}${url.pathname}`;
}

function parseArguments(argv: string[]): ParsedArguments {
  const isExecute = argv.includes("--execute");
  const isDryRun = argv.includes("--dry-run");

  if (isExecute && isDryRun) {
    throw new Error("Use either --execute or --dry-run, not both");
  }

  const batchSizeArgument = getArgumentValue(argv, "--batch-size");
  const batchSize = batchSizeArgument
    ? Number(batchSizeArgument)
    : DEFAULT_BATCH_SIZE;
  if (!Number.isInteger(batchSize) || batchSize <= 0) {
    throw new Error("Batch size must be a positive integer");
  }

  const targetBaseUrlRaw =
    getArgumentValue(argv, "--target-base-url") ??
    process.env.AWS_S3_PUBLIC_BASE_URL?.trim();
  if (!targetBaseUrlRaw) {
    throw new Error(
      "Missing target base URL. Use --target-base-url or set AWS_S3_PUBLIC_BASE_URL"
    );
  }
  const targetBaseUrl = normalizeBaseUrl(
    parseRequiredUrl(targetBaseUrlRaw, "Target base URL")
  );

  const sourceFromArguments = getArgumentValue(argv, "--source-base-urls");
  const sourceRawUrls = sourceFromArguments
    ? parseCsv(sourceFromArguments)
    : parseCsv(process.env.AWS_S3_LEGACY_PUBLIC_BASE_URLS);

  const bucket = process.env.AWS_S3_BUCKET?.trim();
  const region = process.env.AWS_REGION?.trim();
  if (bucket && region) {
    sourceRawUrls.push(`https://${bucket}.s3.${region}.amazonaws.com`);
  }

  const uniqueSources = new Map<string, URL>();
  for (const sourceRawUrl of sourceRawUrls) {
    const parsedSource = normalizeBaseUrl(
      parseRequiredUrl(sourceRawUrl, `Source base URL (${sourceRawUrl})`)
    );
    const key = getBaseUrlKey(parsedSource);

    if (!uniqueSources.has(key)) {
      uniqueSources.set(key, parsedSource);
    }
  }

  uniqueSources.delete(getBaseUrlKey(targetBaseUrl));
  const sourceBaseUrls = Array.from(uniqueSources.values());

  if (sourceBaseUrls.length === 0) {
    throw new Error(
      "No source base URLs were resolved. Use --source-base-urls or set AWS_S3_LEGACY_PUBLIC_BASE_URLS"
    );
  }

  return {
    batchSize,
    execute: isExecute,
    sourceBaseUrls,
    targetBaseUrl,
  };
}

function getKeyPathForBaseUrl(url: URL, baseUrl: URL): string | null {
  const basePath = baseUrl.pathname.replace(/\/+$/g, "");
  const currentPath = url.pathname;

  if (!basePath || basePath === "/") {
    const keyPath = currentPath.replace(/^\/+/, "");
    return keyPath.length > 0 ? keyPath : null;
  }

  if (!currentPath.startsWith(`${basePath}/`)) {
    return null;
  }

  const keyPath = currentPath.slice(basePath.length + 1);
  return keyPath.length > 0 ? keyPath : null;
}

function normalizeKeyPath(pathname: string): string {
  return pathname
    .split("/")
    .filter(Boolean)
    .map((segment) => {
      try {
        return encodeURIComponent(decodeURIComponent(segment));
      } catch {
        return encodeURIComponent(segment);
      }
    })
    .join("/");
}

function joinBaseAndKey(baseUrl: URL, keyPath: string): string {
  const normalizedBasePath = baseUrl.pathname.replace(/\/+$/g, "");
  const base = `${baseUrl.protocol}//${baseUrl.host}${normalizedBasePath}`;
  return `${base}/${keyPath}`;
}

function rewriteUrlToTargetBase(
  rawUrl: string,
  sourceBaseUrls: URL[],
  targetBaseUrl: URL
): string | null {
  let parsedUrl: URL;
  try {
    parsedUrl = new URL(rawUrl);
  } catch {
    return null;
  }

  if (!["http:", "https:"].includes(parsedUrl.protocol)) {
    return null;
  }

  const normalizedCurrentBase = normalizeBaseUrl(parsedUrl);
  if (getBaseUrlKey(normalizedCurrentBase) === getBaseUrlKey(targetBaseUrl)) {
    return null;
  }

  for (const sourceBaseUrl of sourceBaseUrls) {
    if (parsedUrl.origin !== sourceBaseUrl.origin) {
      continue;
    }

    const keyPath = getKeyPathForBaseUrl(parsedUrl, sourceBaseUrl);
    if (!keyPath) {
      continue;
    }

    const normalizedKeyPath = normalizeKeyPath(keyPath);
    if (!normalizedKeyPath) {
      continue;
    }

    return joinBaseAndKey(targetBaseUrl, normalizedKeyPath);
  }

  return null;
}

function createMigrationTargets(): MigrationTarget[] {
  return [
    {
      fetchBatch: (lastId, batchSize) =>
        db.zone
          .findMany({
            orderBy: { id: "asc" },
            select: { id: true, imageUrl: true },
            take: batchSize,
            where: {
              id: lastId ? { gt: lastId } : undefined,
              imageUrl: { not: null },
            },
          })
          .then((rows) =>
            rows
              .filter((row): row is { id: string; imageUrl: string } => Boolean(row.imageUrl))
              .map((row) => ({ id: row.id, url: row.imageUrl }))
          ),
      label: "Zone.imageUrl",
      updateUrl: (id, newUrl) =>
        db.zone
          .update({
            data: { imageUrl: newUrl },
            where: { id },
          })
          .then(() => undefined),
    },
    {
      fetchBatch: (lastId, batchSize) =>
        db.structureType
          .findMany({
            orderBy: { id: "asc" },
            select: { id: true, imageUrl: true },
            take: batchSize,
            where: {
              id: lastId ? { gt: lastId } : undefined,
              imageUrl: { not: null },
            },
          })
          .then((rows) =>
            rows
              .filter((row): row is { id: string; imageUrl: string } => Boolean(row.imageUrl))
              .map((row) => ({ id: row.id, url: row.imageUrl }))
          ),
      label: "StructureType.imageUrl",
      updateUrl: (id, newUrl) =>
        db.structureType
          .update({
            data: { imageUrl: newUrl },
            where: { id },
          })
          .then(() => undefined),
    },
    {
      fetchBatch: (lastId, batchSize) =>
        db.assetImage
          .findMany({
            orderBy: { id: "asc" },
            select: { id: true, image: true },
            take: batchSize,
            where: {
              id: lastId ? { gt: lastId } : undefined,
              image: { startsWith: "http" },
            },
          })
          .then((rows) => rows.map((row) => ({ id: row.id, url: row.image }))),
      label: "AssetImage.image",
      updateUrl: (id, newUrl) =>
        db.assetImage
          .update({
            data: { image: newUrl },
            where: { id },
          })
          .then(() => undefined),
    },
    {
      fetchBatch: (lastId, batchSize) =>
        db.assetFaceImage
          .findMany({
            orderBy: { id: "asc" },
            select: { id: true, image: true },
            take: batchSize,
            where: {
              id: lastId ? { gt: lastId } : undefined,
              image: { startsWith: "http" },
            },
          })
          .then((rows) => rows.map((row) => ({ id: row.id, url: row.image }))),
      label: "AssetFaceImage.image",
      updateUrl: (id, newUrl) =>
        db.assetFaceImage
          .update({
            data: { image: newUrl },
            where: { id },
          })
          .then(() => undefined),
    },
    {
      fetchBatch: (lastId, batchSize) =>
        db.catalogFace
          .findMany({
            orderBy: { id: "asc" },
            select: { id: true, primaryImageUrl: true },
            take: batchSize,
            where: {
              id: lastId ? { gt: lastId } : undefined,
              primaryImageUrl: { not: null },
            },
          })
          .then((rows) =>
            rows
              .filter((row): row is { id: string; primaryImageUrl: string } =>
                Boolean(row.primaryImageUrl)
              )
              .map((row) => ({ id: row.id, url: row.primaryImageUrl }))
          ),
      label: "CatalogFace.primaryImageUrl",
      updateUrl: (id, newUrl) =>
        db.catalogFace
          .update({
            data: { primaryImageUrl: newUrl },
            where: { id },
          })
          .then(() => undefined),
    },
    {
      fetchBatch: (lastId, batchSize) =>
        db.permit
          .findMany({
            orderBy: { id: "asc" },
            select: { id: true, document: true },
            take: batchSize,
            where: {
              id: lastId ? { gt: lastId } : undefined,
              document: { not: null },
            },
          })
          .then((rows) =>
            rows
              .filter((row): row is { id: string; document: string } => Boolean(row.document))
              .map((row) => ({ id: row.id, url: row.document }))
          ),
      label: "Permit.document",
      updateUrl: (id, newUrl) =>
        db.permit
          .update({
            data: { document: newUrl },
            where: { id },
          })
          .then(() => undefined),
    },
    {
      fetchBatch: (lastId, batchSize) =>
        db.organizationDocument
          .findMany({
            orderBy: { id: "asc" },
            select: { id: true, fileUrl: true },
            take: batchSize,
            where: {
              id: lastId ? { gt: lastId } : undefined,
              fileUrl: { startsWith: "http" },
            },
          })
          .then((rows) => rows.map((row) => ({ id: row.id, url: row.fileUrl }))),
      label: "OrganizationDocument.fileUrl",
      updateUrl: (id, newUrl) =>
        db.organizationDocument
          .update({
            data: { fileUrl: newUrl },
            where: { id },
          })
          .then(() => undefined),
    },
    {
      fetchBatch: (lastId, batchSize) =>
        db.orderCreative
          .findMany({
            orderBy: { id: "asc" },
            select: { id: true, fileUrl: true },
            take: batchSize,
            where: {
              id: lastId ? { gt: lastId } : undefined,
              fileUrl: { startsWith: "http" },
            },
          })
          .then((rows) => rows.map((row) => ({ id: row.id, url: row.fileUrl }))),
      label: "OrderCreative.fileUrl",
      updateUrl: (id, newUrl) =>
        db.orderCreative
          .update({
            data: { fileUrl: newUrl },
            where: { id },
          })
          .then(() => undefined),
    },
    {
      fetchBatch: (lastId, batchSize) =>
        db.orderPurchaseOrder
          .findMany({
            orderBy: { id: "asc" },
            select: { id: true, fileUrl: true },
            take: batchSize,
            where: {
              id: lastId ? { gt: lastId } : undefined,
              fileUrl: { startsWith: "http" },
            },
          })
          .then((rows) => rows.map((row) => ({ id: row.id, url: row.fileUrl }))),
      label: "OrderPurchaseOrder.fileUrl",
      updateUrl: (id, newUrl) =>
        db.orderPurchaseOrder
          .update({
            data: { fileUrl: newUrl },
            where: { id },
          })
          .then(() => undefined),
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

      const rewrittenUrl = rewriteUrlToTargetBase(
        record.url,
        options.sourceBaseUrls,
        options.targetBaseUrl
      );
      if (!rewrittenUrl) {
        stats.skipped += 1;
        continue;
      }

      stats.candidates += 1;

      try {
        if (!options.execute) {
          console.log(`[DRY-RUN] ${target.label} ${record.id}: ${record.url} -> ${rewrittenUrl}`);
          stats.migrated += 1;
          continue;
        }

        await target.updateUrl(record.id, rewrittenUrl);
        console.log(`[OK] ${target.label} ${record.id}: ${record.url} -> ${rewrittenUrl}`);
        stats.migrated += 1;
      } catch (error) {
        stats.errors += 1;
        const message = error instanceof Error ? error.message : "Unknown error";
        console.error(`[ERROR] ${target.label} ${record.id}: ${message}`);
      }
    }
  }

  console.log(
    `[SUMMARY] ${target.label}: processed=${stats.processed}, candidates=${stats.candidates}, migrated=${stats.migrated}, skipped=${stats.skipped}, errors=${stats.errors}`
  );

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

  console.log(`Starting S3 URL to CloudFront migration in ${mode} mode...`);
  console.log(`Batch size: ${options.batchSize}`);
  console.log(
    `Target base URL: ${options.targetBaseUrl.protocol}//${options.targetBaseUrl.host}${options.targetBaseUrl.pathname || ""}`
  );
  console.log(
    `Source base URLs: ${options.sourceBaseUrls
      .map((url) => `${url.protocol}//${url.host}${url.pathname || ""}`)
      .join(", ")}`
  );

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
