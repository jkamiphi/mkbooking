import { db } from "@/lib/db";
import { z } from "zod";
import type { Prisma } from "@prisma/client";
import { isExpectedS3PublicUrl } from "@/lib/storage/s3";

const assetStatusValues = ["ACTIVE", "INACTIVE", "MAINTENANCE", "RETIRED"] as const;
const assetFaceStatusValues = ["ACTIVE", "INACTIVE", "MAINTENANCE", "RETIRED"] as const;
const assetFaceFacingValues = ["TRAFFIC", "OPPOSITE_TRAFFIC"] as const;
const landTenureValues = ["SERVIDUMBRE", "PRIVADO", "ESTATAL", "OTRO"] as const;
const occupancyStatusValues = ["OCUPADO", "DISPONIBLE"] as const;

export const assetStatusSchema = z.enum(assetStatusValues);
export const assetFaceStatusSchema = z.enum(assetFaceStatusValues);
export const assetFaceFacingSchema = z.enum(assetFaceFacingValues);
export const landTenureSchema = z.enum(landTenureValues);
export const occupancyStatusSchema = z.enum(occupancyStatusValues);

const s3OnlyImageErrorMessage =
  "Image URLs must use a configured media domain (CloudFront or S3).";

const s3PublicUrlSchema = z.string().url().refine(isExpectedS3PublicUrl, {
  message: s3OnlyImageErrorMessage,
});

const inventoryImageInputSchema = z.object({
  id: z.string().min(1).optional(),
  image: s3PublicUrlSchema,
  caption: z.string().trim().max(300).optional(),
  isPrimary: z.boolean().optional(),
});

// ============================================================================
// Taxonomy Schemas
// ============================================================================

export const createProvinceSchema = z.object({
  name: z.string().min(1),
});

export const createZoneSchema = z.object({
  name: z.string().min(1),
  provinceId: z.string().min(1),
  imageUrl: s3PublicUrlSchema.optional(),
});

export const updateZoneSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1).optional(),
  provinceId: z.string().min(1).optional(),
  imageUrl: s3PublicUrlSchema.nullish(),
});

export const createStructureTypeSchema = z.object({
  name: z.string().min(1),
  imageUrl: s3PublicUrlSchema.optional(),
});

export const updateStructureTypeSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1).optional(),
  imageUrl: s3PublicUrlSchema.nullish(),
});

export const createRoadTypeSchema = z.object({
  name: z.string().min(1),
});

export const createFacePositionSchema = z.object({
  name: z.string().min(1),
});

export const createMountingTypeSchema = z.object({
  name: z.string().min(1),
});

export const createRestrictionTagSchema = z.object({
  code: z.string().min(1),
  label: z.string().min(1),
});

// ============================================================================
// Asset Schemas
// ============================================================================

export const createAssetSchema = z.object({
  code: z.string().min(1),
  structureTypeId: z.string().min(1),
  zoneId: z.string().min(1),
  roadTypeId: z.string().optional(),
  address: z.string().min(1),
  landmark: z.string().optional(),
  municipality: z.string().optional(),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
  landTenure: landTenureSchema.optional(),
  vehicleTrafficMonthly: z.number().int().min(0).optional(),
  pedestrianTrafficMonthly: z.number().int().min(0).optional(),
  landRentMonthly: z.number().min(0).optional(),
  electricityCostMonthly: z.number().min(0).optional(),
  assetTaxMonthly: z.number().min(0).optional(),
  illuminated: z.boolean().optional(),
  digital: z.boolean().optional(),
  powered: z.boolean().optional(),
  hasPrintService: z.boolean().optional(),
  status: assetStatusSchema.optional(),
  notes: z.string().optional(),
  installedDate: z.coerce.date().optional(),
  retiredDate: z.coerce.date().optional(),
  images: z.array(inventoryImageInputSchema).max(30).optional(),
});

export const updateAssetSchema = createAssetSchema.partial().extend({
  id: z.string().min(1),
});

// ============================================================================
// Asset Face Schemas
// ============================================================================

export const createAssetFaceSchema = z.object({
  assetId: z.string().min(1),
  code: z.string().min(1),
  positionId: z.string().optional(),
  width: z.number().min(0),
  height: z.number().min(0),
  productionCostMonthly: z.number().min(0).optional(),
  facing: assetFaceFacingSchema.optional(),
  visibilityNotes: z.string().optional(),
  status: assetFaceStatusSchema.optional(),
  restrictions: z.string().optional(),
  notes: z.string().optional(),
  images: z.array(inventoryImageInputSchema).max(30).optional(),
});

export const updateAssetFaceSchema = createAssetFaceSchema.partial().extend({
  id: z.string().min(1),
});

// ============================================================================
// Supporting Schemas
// ============================================================================

export const createAssetImageSchema = z.object({
  assetId: z.string().min(1),
  image: s3PublicUrlSchema,
  caption: z.string().optional(),
  isPrimary: z.boolean().optional(),
});

export const createAssetFaceImageSchema = z.object({
  faceId: z.string().min(1),
  image: s3PublicUrlSchema,
  caption: z.string().optional(),
  isPrimary: z.boolean().optional(),
});

export const upsertProductionSpecSchema = z.object({
  faceId: z.string().min(1),
  mountingTypeId: z.string().optional(),
  material: z.string().optional(),
  bleedCm: z.number().min(0).optional(),
  safeMarginCm: z.number().min(0).optional(),
  dpiRecommended: z.number().int().min(1).optional(),
  fileFormat: z.string().optional(),
  installNotes: z.string().optional(),
  uninstallNotes: z.string().optional(),
});

export const createPermitSchema = z.object({
  assetId: z.string().min(1),
  faceId: z.string().optional(),
  permitNumber: z.string().optional(),
  authority: z.string().optional(),
  issuedDate: z.coerce.date().optional(),
  expiresDate: z.coerce.date().optional(),
  document: z.string().url().optional(),
  notes: z.string().optional(),
});

export const createAssetFaceRestrictionSchema = z.object({
  faceId: z.string().min(1),
  tagId: z.string().min(1),
});

export const createMaintenanceWindowSchema = z.object({
  assetId: z.string().min(1),
  faceId: z.string().optional(),
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
  reason: z.string().min(1),
  notes: z.string().optional(),
});

export type CreateProvinceInput = z.infer<typeof createProvinceSchema>;
export type CreateZoneInput = z.infer<typeof createZoneSchema>;
export type UpdateZoneInput = z.infer<typeof updateZoneSchema>;
export type CreateStructureTypeInput = z.infer<typeof createStructureTypeSchema>;
export type UpdateStructureTypeInput = z.infer<typeof updateStructureTypeSchema>;
export type CreateRoadTypeInput = z.infer<typeof createRoadTypeSchema>;
export type CreateFacePositionInput = z.infer<typeof createFacePositionSchema>;
export type CreateMountingTypeInput = z.infer<typeof createMountingTypeSchema>;
export type CreateRestrictionTagInput = z.infer<typeof createRestrictionTagSchema>;
export type CreateAssetInput = z.infer<typeof createAssetSchema>;
export type UpdateAssetInput = z.infer<typeof updateAssetSchema>;
export type CreateAssetFaceInput = z.infer<typeof createAssetFaceSchema>;
export type UpdateAssetFaceInput = z.infer<typeof updateAssetFaceSchema>;
export type CreateAssetImageInput = z.infer<typeof createAssetImageSchema>;
export type CreateAssetFaceImageInput = z.infer<typeof createAssetFaceImageSchema>;
export type UpsertProductionSpecInput = z.infer<typeof upsertProductionSpecSchema>;
export type CreatePermitInput = z.infer<typeof createPermitSchema>;
export type CreateAssetFaceRestrictionInput = z.infer<
  typeof createAssetFaceRestrictionSchema
>;
export type CreateMaintenanceWindowInput = z.infer<
  typeof createMaintenanceWindowSchema
>;
type InventoryStatus = (typeof assetStatusValues)[number];

function buildStatusCounts(
  rows: Array<{ status: InventoryStatus; _count: { _all: number } }>
) {
  const initial = Object.fromEntries(
    assetStatusValues.map((status) => [status, 0])
  ) as Record<InventoryStatus, number>;

  for (const row of rows) {
    initial[row.status] = row._count._all;
  }

  return initial;
}

type InventoryImageInput = z.infer<typeof inventoryImageInputSchema>;

function normalizeInventoryImages(images: InventoryImageInput[] | undefined) {
  if (!images) {
    return undefined;
  }

  const normalized = images.map((image) => ({
    caption: image.caption?.trim() || null,
    image: image.image,
    isPrimary: Boolean(image.isPrimary),
  }));

  if (normalized.length === 0) {
    return [];
  }

  const currentPrimaryIndex = normalized.findIndex((image) => image.isPrimary);
  const primaryIndex = currentPrimaryIndex >= 0 ? currentPrimaryIndex : 0;

  return normalized.map((image, index) => ({
    ...image,
    isPrimary: index === primaryIndex,
  }));
}

const FEET_PER_METER = 3.28084;
const MS_PER_DAY = 24 * 60 * 60 * 1000;
const panamaDateFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: "America/Panama",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

function toNumber(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string") {
    const parsed = Number(value.trim());
    return Number.isFinite(parsed) ? parsed : null;
  }
  if (
    value &&
    typeof value === "object" &&
    "toString" in value &&
    typeof value.toString === "function"
  ) {
    const parsed = Number(value.toString());
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function toPanamaDateUtc(date: Date) {
  const parts = panamaDateFormatter.formatToParts(date);
  const year = Number(parts.find((part) => part.type === "year")?.value);
  const month = Number(parts.find((part) => part.type === "month")?.value);
  const day = Number(parts.find((part) => part.type === "day")?.value);
  return new Date(Date.UTC(year, month - 1, day));
}

function getDaysUntilPanama(date: Date | null) {
  if (!date) return null;
  const todayUtc = toPanamaDateUtc(new Date()).getTime();
  const targetUtc = toPanamaDateUtc(date).getTime();
  return Math.round((targetUtc - todayUtc) / MS_PER_DAY);
}

export async function getInventoryOverview() {
  const [
    totalAssets,
    totalFaces,
    digitalAssets,
    illuminatedAssets,
    assetsWithoutFaces,
    assetsByStatusRows,
    facesByStatusRows,
    latestAssets,
    latestFaces,
  ] = await Promise.all([
    db.asset.count(),
    db.assetFace.count(),
    db.asset.count({ where: { digital: true } }),
    db.asset.count({ where: { illuminated: true } }),
    db.asset.count({ where: { faces: { none: {} } } }),
    db.asset.groupBy({
      by: ["status"],
      _count: { _all: true },
    }),
    db.assetFace.groupBy({
      by: ["status"],
      _count: { _all: true },
    }),
    db.asset.findMany({
      orderBy: { createdAt: "desc" },
      take: 5,
      select: {
        id: true,
        code: true,
        status: true,
        createdAt: true,
      },
    }),
    db.assetFace.findMany({
      orderBy: { id: "desc" },
      take: 5,
      select: {
        id: true,
        code: true,
        status: true,
        asset: {
          select: {
            code: true,
          },
        },
      },
    }),
  ]);

  const assetsByStatus = buildStatusCounts(
    assetsByStatusRows as Array<{ status: InventoryStatus; _count: { _all: number } }>
  );
  const facesByStatus = buildStatusCounts(
    facesByStatusRows as Array<{ status: InventoryStatus; _count: { _all: number } }>
  );

  return {
    totalAssets,
    totalFaces,
    digitalAssets,
    illuminatedAssets,
    assetsWithoutFaces,
    assetsByStatus,
    facesByStatus,
    latestAssets,
    latestFaces,
  };
}

// ============================================================================
// Taxonomy Services
// ============================================================================

export async function listProvinces() {
  return db.province.findMany({ orderBy: { name: "asc" } });
}

export async function createProvince(input: CreateProvinceInput) {
  return db.province.create({ data: input });
}

export async function listZones(options?: { provinceId?: string }) {
  const where: Prisma.ZoneWhereInput = {};
  if (options?.provinceId) where.provinceId = options.provinceId;
  return db.zone.findMany({
    where,
    include: { province: true },
    orderBy: [{ province: { name: "asc" } }, { name: "asc" }],
  });
}

export async function createZone(input: CreateZoneInput) {
  return db.zone.create({
    data: {
      ...input,
      imageUrl: input.imageUrl || null,
    },
  });
}

export async function updateZone(input: UpdateZoneInput) {
  const { id, ...data } = input;
  return db.zone.update({
    where: { id },
    data: {
      ...data,
      imageUrl: data.imageUrl === null ? null : data.imageUrl || undefined,
    },
    include: { province: true },
  });
}

export async function listStructureTypes() {
  return db.structureType.findMany({ orderBy: { name: "asc" } });
}

export async function createStructureType(input: CreateStructureTypeInput) {
  return db.structureType.create({
    data: {
      ...input,
      imageUrl: input.imageUrl || null,
    },
  });
}

export async function updateStructureType(input: UpdateStructureTypeInput) {
  const { id, ...data } = input;
  return db.structureType.update({
    where: { id },
    data: {
      ...data,
      imageUrl: data.imageUrl === null ? null : data.imageUrl || undefined,
    },
  });
}

export async function listRoadTypes() {
  return db.roadType.findMany({ orderBy: { name: "asc" } });
}

export async function createRoadType(input: CreateRoadTypeInput) {
  return db.roadType.create({ data: input });
}

export async function listFacePositions() {
  return db.facePosition.findMany({ orderBy: { name: "asc" } });
}

export async function createFacePosition(input: CreateFacePositionInput) {
  return db.facePosition.create({ data: input });
}

export async function listMountingTypes() {
  return db.mountingType.findMany({ orderBy: { name: "asc" } });
}

export async function createMountingType(input: CreateMountingTypeInput) {
  return db.mountingType.create({ data: input });
}

export async function listRestrictionTags() {
  return db.restrictionTag.findMany({ orderBy: { code: "asc" } });
}

export async function createRestrictionTag(input: CreateRestrictionTagInput) {
  return db.restrictionTag.create({ data: input });
}

// ============================================================================
// Asset Services
// ============================================================================

export async function listAssets(options?: {
  status?: z.infer<typeof assetStatusSchema>;
  search?: string;
  structureTypeId?: string;
  zoneId?: string;
  roadTypeId?: string;
  skip?: number;
  take?: number;
}) {
  const {
    status,
    search,
    structureTypeId,
    zoneId,
    roadTypeId,
    skip = 0,
    take = 50,
  } = options ?? {};

  const where: Prisma.AssetWhereInput = {};
  if (status) where.status = status;
  if (structureTypeId) where.structureTypeId = structureTypeId;
  if (zoneId) where.zoneId = zoneId;
  if (roadTypeId) where.roadTypeId = roadTypeId;

  if (search) {
    where.OR = [
      { code: { contains: search, mode: "insensitive" } },
      { address: { contains: search, mode: "insensitive" } },
      { landmark: { contains: search, mode: "insensitive" } },
    ];
  }

  const [assets, total] = await Promise.all([
    db.asset.findMany({
      where,
      skip,
      take,
      orderBy: { code: "asc" },
      include: {
        structureType: true,
        zone: { include: { province: true } },
        roadType: true,
        _count: { select: { faces: true } },
      },
    }),
    db.asset.count({ where }),
  ]);

  return {
    assets,
    total,
    hasMore: skip + assets.length < total,
  };
}

type OccupancyStatus = z.infer<typeof occupancyStatusSchema>;

function pickLatestDate(dates: Array<Date | null | undefined>) {
  return dates.reduce<Date | null>((latest, current) => {
    if (!current) return latest;
    if (!latest) return current;
    return current.getTime() > latest.getTime() ? current : latest;
  }, null);
}

export async function listAssetControlRows(options?: {
  search?: string;
  structureTypeId?: string;
  zoneId?: string;
  provinceId?: string;
  occupancyStatus?: OccupancyStatus;
  skip?: number;
  take?: number;
}) {
  const {
    search,
    structureTypeId,
    zoneId,
    provinceId,
    occupancyStatus,
    skip = 0,
    take = 50,
  } = options ?? {};

  const todayPanama = toPanamaDateUtc(new Date());
  const activeOrderWhere: Prisma.OrderWhereInput = {
    status: "CONFIRMED",
    fromDate: { lte: todayPanama },
    toDate: { gte: todayPanama },
  };

  const where: Prisma.AssetFaceWhereInput = {};
  if (structureTypeId || zoneId || provinceId) {
    where.asset = {};
    if (structureTypeId) where.asset.structureTypeId = structureTypeId;
    if (zoneId) where.asset.zoneId = zoneId;
    if (provinceId) {
      where.asset.zone = {
        provinceId,
      };
    }
  }

  if (occupancyStatus === "OCUPADO") {
    where.orderLineItems = {
      some: {
        order: activeOrderWhere,
      },
    };
  }
  if (occupancyStatus === "DISPONIBLE") {
    where.orderLineItems = {
      none: {
        order: activeOrderWhere,
      },
    };
  }

  const searchTerm = search?.trim();
  if (searchTerm) {
    where.OR = [
      { code: { contains: searchTerm, mode: "insensitive" } },
      { asset: { code: { contains: searchTerm, mode: "insensitive" } } },
      { asset: { address: { contains: searchTerm, mode: "insensitive" } } },
      { asset: { landmark: { contains: searchTerm, mode: "insensitive" } } },
      { asset: { municipality: { contains: searchTerm, mode: "insensitive" } } },
      { asset: { zone: { name: { contains: searchTerm, mode: "insensitive" } } } },
      {
        asset: {
          zone: {
            province: {
              name: { contains: searchTerm, mode: "insensitive" },
            },
          },
        },
      },
    ];
  }

  const [faces, total] = await Promise.all([
    db.assetFace.findMany({
      where,
      skip,
      take,
      orderBy: [{ asset: { code: "asc" } }, { code: "asc" }],
      include: {
        productionSpec: {
          select: {
            material: true,
          },
        },
        maintenanceWindows: {
          select: {
            endDate: true,
          },
          orderBy: {
            endDate: "desc",
          },
          take: 1,
        },
        orderLineItems: {
          where: {
            order: activeOrderWhere,
          },
          orderBy: [{ order: { toDate: "asc" } }, { createdAt: "asc" }],
          take: 1,
          select: {
            priceDaily: true,
            order: {
              select: {
                id: true,
                code: true,
                clientName: true,
                currency: true,
                fromDate: true,
                toDate: true,
                brand: {
                  select: {
                    name: true,
                  },
                },
              },
            },
          },
        },
        asset: {
          include: {
            structureType: true,
            zone: {
              include: {
                province: true,
              },
            },
            maintenanceWindows: {
              select: {
                endDate: true,
              },
              orderBy: {
                endDate: "desc",
              },
              take: 1,
            },
          },
        },
      },
    }),
    db.assetFace.count({ where }),
  ]);

  const faceIds = Array.from(new Set(faces.map((face) => face.id)));
  const zoneIds = Array.from(new Set(faces.map((face) => face.asset.zoneId)));
  const structureTypeIds = Array.from(
    new Set(faces.map((face) => face.asset.structureTypeId))
  );
  const activeRuleOr: Prisma.CatalogPriceRuleWhereInput[] = [];
  if (faceIds.length > 0) activeRuleOr.push({ faceId: { in: faceIds } });
  if (zoneIds.length > 0) activeRuleOr.push({ zoneId: { in: zoneIds } });
  if (structureTypeIds.length > 0) {
    activeRuleOr.push({ structureTypeId: { in: structureTypeIds } });
  }

  const catalogRules =
    activeRuleOr.length > 0
      ? await db.catalogPriceRule.findMany({
          where: {
            brandId: null,
            isActive: true,
            startDate: { lte: todayPanama },
            OR: [{ endDate: null }, { endDate: { gte: todayPanama } }],
            AND: [{ OR: activeRuleOr }],
          },
          orderBy: [{ startDate: "desc" }, { createdAt: "desc" }],
          select: {
            id: true,
            faceId: true,
            zoneId: true,
            structureTypeId: true,
            priceDaily: true,
            currency: true,
          },
        })
      : [];

  const rows = faces.map((face) => {
    const activeLineItem = face.orderLineItems[0] ?? null;
    const activeOrder = activeLineItem?.order ?? null;
    const faceRule = catalogRules.find((rule) => rule.faceId === face.id);
    const zoneRule = catalogRules.find(
      (rule) => !rule.faceId && rule.zoneId === face.asset.zoneId
    );
    const structureRule = catalogRules.find(
      (rule) =>
        !rule.faceId &&
        !rule.zoneId &&
        rule.structureTypeId === face.asset.structureTypeId
    );
    const fallbackRule = faceRule ?? zoneRule ?? structureRule ?? null;

    const monthlyAmount = activeLineItem
      ? Number(activeLineItem.priceDaily) * 30
      : fallbackRule
        ? Number(fallbackRule.priceDaily) * 30
        : null;

    const widthMeters = toNumber(face.width);
    const heightMeters = toNumber(face.height);
    const latitude = toNumber(face.asset.latitude);
    const longitude = toNumber(face.asset.longitude);
    const latestMaintenanceDate = pickLatestDate([
      face.maintenanceWindows[0]?.endDate ?? null,
      face.asset.maintenanceWindows[0]?.endDate ?? null,
    ]);

    return {
      id: face.id,
      assetId: face.assetId,
      assetCode: face.asset.code,
      faceCode: face.code,
      rowCode: `${face.asset.code}-${face.code}`,
      province: face.asset.zone.province.name,
      sector: face.asset.zone.name,
      structureType: face.asset.structureType.name,
      terrain: face.asset.landTenure,
      illuminated: face.asset.illuminated,
      materialType: face.productionSpec?.material ?? null,
      occupancyStatus: activeOrder ? ("OCUPADO" as const) : ("DISPONIBLE" as const),
      clientName: activeOrder?.brand?.name || activeOrder?.clientName || null,
      checkIn: activeOrder?.fromDate ?? null,
      checkOut: activeOrder?.toDate ?? null,
      dueInDays: getDaysUntilPanama(activeOrder?.toDate ?? null),
      monthlyAmount,
      monthlyCurrency: activeOrder?.currency || fallbackRule?.currency || null,
      widthMeters,
      heightMeters,
      widthFeet: widthMeters === null ? null : widthMeters * FEET_PER_METER,
      heightFeet: heightMeters === null ? null : heightMeters * FEET_PER_METER,
      productionCostMonthly: toNumber(face.productionCostMonthly),
      address: face.asset.address,
      municipality: face.asset.municipality ?? null,
      latitude,
      longitude,
      mapsUrl:
        latitude !== null && longitude !== null
          ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${latitude},${longitude}`)}`
          : null,
      vehicleTrafficMonthly: face.asset.vehicleTrafficMonthly,
      pedestrianTrafficMonthly: face.asset.pedestrianTrafficMonthly,
      assetTaxMonthly: toNumber(face.asset.assetTaxMonthly),
      landRentMonthly: toNumber(face.asset.landRentMonthly),
      electricityCostMonthly: toNumber(face.asset.electricityCostMonthly),
      latestMaintenanceDate,
      assetOperationalStatus: face.asset.status,
      faceOperationalStatus: face.status,
    };
  });

  return {
    rows,
    total,
    hasMore: skip + rows.length < total,
  };
}

export async function getAssetById(id: string) {
  return db.asset.findUnique({
    where: { id },
    include: {
      structureType: true,
      zone: { include: { province: true } },
      roadType: true,
      images: {
        orderBy: [{ isPrimary: "desc" }, { createdAt: "asc" }],
      },
      _count: { select: { faces: true } },
    },
  });
}

export async function createAsset(input: CreateAssetInput) {
  const normalizedImages = normalizeInventoryImages(input.images);

  return db.asset.create({
    data: {
      address: input.address,
      assetTaxMonthly: input.assetTaxMonthly,
      code: input.code,
      digital: input.digital,
      electricityCostMonthly: input.electricityCostMonthly,
      hasPrintService: input.hasPrintService,
      illuminated: input.illuminated,
      landRentMonthly: input.landRentMonthly,
      landTenure: input.landTenure,
      latitude: input.latitude,
      municipality: input.municipality || null,
      pedestrianTrafficMonthly: input.pedestrianTrafficMonthly,
      roadTypeId: input.roadTypeId || null,
      longitude: input.longitude,
      landmark: input.landmark || null,
      notes: input.notes || null,
      powered: input.powered,
      vehicleTrafficMonthly: input.vehicleTrafficMonthly,
      installedDate: input.installedDate || null,
      retiredDate: input.retiredDate || null,
      status: input.status,
      structureTypeId: input.structureTypeId,
      zoneId: input.zoneId,
      ...(normalizedImages && normalizedImages.length > 0
        ? {
            images: {
              create: normalizedImages.map((image) => ({
                caption: image.caption,
                image: image.image,
                isPrimary: image.isPrimary,
              })),
            },
          }
        : {}),
    },
  });
}

export async function updateAsset(input: UpdateAssetInput) {
  const { id, images, ...data } = input;
  const normalizedImages = normalizeInventoryImages(images);
  const updateData: Prisma.AssetUncheckedUpdateInput = {
    ...data,
  };

  if ("roadTypeId" in data) {
    updateData.roadTypeId = data.roadTypeId ? data.roadTypeId : null;
  }
  if ("landmark" in data) {
    updateData.landmark = data.landmark ? data.landmark : null;
  }
  if ("municipality" in data) {
    updateData.municipality = data.municipality ? data.municipality : null;
  }
  if ("notes" in data) {
    updateData.notes = data.notes ? data.notes : null;
  }
  if ("installedDate" in data) {
    updateData.installedDate = data.installedDate ?? null;
  }
  if ("retiredDate" in data) {
    updateData.retiredDate = data.retiredDate ?? null;
  }
  if ("latitude" in data) {
    updateData.latitude = data.latitude ?? null;
  }
  if ("longitude" in data) {
    updateData.longitude = data.longitude ?? null;
  }
  if ("landRentMonthly" in data) {
    updateData.landRentMonthly = data.landRentMonthly ?? null;
  }
  if ("electricityCostMonthly" in data) {
    updateData.electricityCostMonthly = data.electricityCostMonthly ?? null;
  }
  if ("assetTaxMonthly" in data) {
    updateData.assetTaxMonthly = data.assetTaxMonthly ?? null;
  }
  if ("vehicleTrafficMonthly" in data) {
    updateData.vehicleTrafficMonthly = data.vehicleTrafficMonthly ?? null;
  }
  if ("pedestrianTrafficMonthly" in data) {
    updateData.pedestrianTrafficMonthly = data.pedestrianTrafficMonthly ?? null;
  }
  if ("landTenure" in data) {
    updateData.landTenure = data.landTenure ?? null;
  }

  return db.$transaction(async (transaction) => {
    const updatedAsset = await transaction.asset.update({
      where: { id },
      data: updateData,
    });

    if (images !== undefined) {
      await transaction.assetImage.deleteMany({
        where: { assetId: id },
      });

      if (normalizedImages && normalizedImages.length > 0) {
        await transaction.assetImage.createMany({
          data: normalizedImages.map((image) => ({
            assetId: id,
            caption: image.caption,
            image: image.image,
            isPrimary: image.isPrimary,
          })),
        });
      }
    }

    return updatedAsset;
  });
}

// ============================================================================
// Asset Face Services
// ============================================================================

export async function listAssetFaces(options?: {
  assetId?: string;
  status?: z.infer<typeof assetFaceStatusSchema>;
  skip?: number;
  take?: number;
}) {
  const { assetId, status, skip = 0, take = 50 } = options ?? {};
  const where: Prisma.AssetFaceWhereInput = {};
  if (assetId) where.assetId = assetId;
  if (status) where.status = status;

  const [faces, total] = await Promise.all([
    db.assetFace.findMany({
      where,
      skip,
      take,
      orderBy: [{ asset: { code: "asc" } }, { code: "asc" }],
      include: {
        asset: { select: { id: true, code: true } },
        position: true,
      },
    }),
    db.assetFace.count({ where }),
  ]);

  return {
    faces,
    total,
    hasMore: skip + faces.length < total,
  };
}

export async function getAssetFaceById(id: string) {
  return db.assetFace.findUnique({
    where: { id },
    include: {
      asset: {
        select: {
          id: true,
          code: true,
        },
      },
      productionSpec: true,
      images: {
        orderBy: [{ isPrimary: "desc" }, { createdAt: "asc" }],
      },
      position: true,
    },
  });
}

export async function createAssetFace(input: CreateAssetFaceInput) {
  const normalizedImages = normalizeInventoryImages(input.images);

  return db.assetFace.create({
    data: {
      assetId: input.assetId,
      code: input.code,
      facing: input.facing,
      height: input.height,
      productionCostMonthly: input.productionCostMonthly,
      status: input.status,
      width: input.width,
      positionId: input.positionId || null,
      visibilityNotes: input.visibilityNotes || null,
      restrictions: input.restrictions || null,
      notes: input.notes || null,
      ...(normalizedImages && normalizedImages.length > 0
        ? {
            images: {
              create: normalizedImages.map((image) => ({
                caption: image.caption,
                image: image.image,
                isPrimary: image.isPrimary,
              })),
            },
          }
        : {}),
    },
  });
}

export async function updateAssetFace(input: UpdateAssetFaceInput) {
  const { id, images, ...data } = input;
  const normalizedImages = normalizeInventoryImages(images);
  const updateData: Prisma.AssetFaceUncheckedUpdateInput = {
    ...data,
  };

  if ("positionId" in data) {
    updateData.positionId = data.positionId ? data.positionId : null;
  }
  if ("visibilityNotes" in data) {
    updateData.visibilityNotes = data.visibilityNotes ? data.visibilityNotes : null;
  }
  if ("restrictions" in data) {
    updateData.restrictions = data.restrictions ? data.restrictions : null;
  }
  if ("notes" in data) {
    updateData.notes = data.notes ? data.notes : null;
  }
  if ("productionCostMonthly" in data) {
    updateData.productionCostMonthly = data.productionCostMonthly ?? null;
  }

  return db.$transaction(async (transaction) => {
    const updatedFace = await transaction.assetFace.update({
      where: { id },
      data: updateData,
    });

    if (images !== undefined) {
      await transaction.assetFaceImage.deleteMany({
        where: { faceId: id },
      });

      if (normalizedImages && normalizedImages.length > 0) {
        await transaction.assetFaceImage.createMany({
          data: normalizedImages.map((image) => ({
            faceId: id,
            caption: image.caption,
            image: image.image,
            isPrimary: image.isPrimary,
          })),
        });
      }
    }

    return updatedFace;
  });
}

// ============================================================================
// Supporting Services
// ============================================================================

export async function createAssetImage(input: CreateAssetImageInput) {
  return db.assetImage.create({
    data: {
      ...input,
      caption: input.caption || null,
    },
  });
}

export async function createAssetFaceImage(input: CreateAssetFaceImageInput) {
  return db.assetFaceImage.create({
    data: {
      ...input,
      caption: input.caption || null,
    },
  });
}

export async function upsertProductionSpec(input: UpsertProductionSpecInput) {
  return db.productionSpec.upsert({
    where: { faceId: input.faceId },
    create: {
      ...input,
      mountingTypeId: input.mountingTypeId || null,
      material: input.material || null,
      bleedCm: input.bleedCm ?? null,
      safeMarginCm: input.safeMarginCm ?? null,
      dpiRecommended: input.dpiRecommended ?? null,
      fileFormat: input.fileFormat || null,
      installNotes: input.installNotes || null,
      uninstallNotes: input.uninstallNotes || null,
    },
    update: {
      mountingTypeId: input.mountingTypeId || null,
      material: input.material || null,
      bleedCm: input.bleedCm ?? null,
      safeMarginCm: input.safeMarginCm ?? null,
      dpiRecommended: input.dpiRecommended ?? null,
      fileFormat: input.fileFormat || null,
      installNotes: input.installNotes || null,
      uninstallNotes: input.uninstallNotes || null,
    },
  });
}

export async function listPermits(options?: {
  assetId?: string;
  faceId?: string;
  take?: number;
}) {
  const where: Prisma.PermitWhereInput = {};
  const take = options?.take ?? 50;

  if (options?.assetId && options?.faceId) {
    where.assetId = options.assetId;
    where.OR = [{ faceId: null }, { faceId: options.faceId }];
  } else if (options?.faceId) {
    where.faceId = options.faceId;
  } else if (options?.assetId) {
    where.assetId = options.assetId;
  }

  return db.permit.findMany({
    where,
    take,
    orderBy: [{ expiresDate: "asc" }, { issuedDate: "desc" }, { id: "asc" }],
  });
}

export async function listMaintenanceWindows(options?: {
  assetId?: string;
  faceId?: string;
  take?: number;
}) {
  const where: Prisma.MaintenanceWindowWhereInput = {};
  const take = options?.take ?? 50;

  if (options?.assetId && options?.faceId) {
    where.assetId = options.assetId;
    where.OR = [{ faceId: null }, { faceId: options.faceId }];
  } else if (options?.faceId) {
    where.faceId = options.faceId;
  } else if (options?.assetId) {
    where.assetId = options.assetId;
  }

  return db.maintenanceWindow.findMany({
    where,
    take,
    orderBy: [{ startDate: "desc" }, { endDate: "desc" }, { id: "asc" }],
  });
}

export async function createPermit(input: CreatePermitInput) {
  return db.permit.create({
    data: {
      ...input,
      faceId: input.faceId || null,
      permitNumber: input.permitNumber || null,
      authority: input.authority || null,
      issuedDate: input.issuedDate || null,
      expiresDate: input.expiresDate || null,
      document: input.document || null,
      notes: input.notes || null,
    },
  });
}

export async function createAssetFaceRestriction(
  input: CreateAssetFaceRestrictionInput
) {
  return db.assetFaceRestriction.create({ data: input });
}

export async function createMaintenanceWindow(
  input: CreateMaintenanceWindowInput
) {
  return db.maintenanceWindow.create({
    data: {
      ...input,
      faceId: input.faceId || null,
      notes: input.notes || null,
    },
  });
}
