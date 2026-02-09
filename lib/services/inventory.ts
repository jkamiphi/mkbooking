import { db } from "@/lib/db";
import { z } from "zod";
import type { Prisma } from "@prisma/client";

const assetStatusValues = ["ACTIVE", "INACTIVE", "MAINTENANCE", "RETIRED"] as const;
const assetFaceStatusValues = ["ACTIVE", "INACTIVE", "MAINTENANCE", "RETIRED"] as const;
const assetFaceFacingValues = ["TRAFFIC", "OPPOSITE_TRAFFIC"] as const;

export const assetStatusSchema = z.enum(assetStatusValues);
export const assetFaceStatusSchema = z.enum(assetFaceStatusValues);
export const assetFaceFacingSchema = z.enum(assetFaceFacingValues);

// ============================================================================
// Taxonomy Schemas
// ============================================================================

export const createProvinceSchema = z.object({
  name: z.string().min(1),
});

export const createZoneSchema = z.object({
  name: z.string().min(1),
  provinceId: z.string().min(1),
  imageUrl: z.string().url().optional(),
});

export const updateZoneSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1).optional(),
  provinceId: z.string().min(1).optional(),
  imageUrl: z.string().url().nullish(),
});

export const createStructureTypeSchema = z.object({
  name: z.string().min(1),
  imageUrl: z.string().url().optional(),
});

export const updateStructureTypeSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1).optional(),
  imageUrl: z.string().url().nullish(),
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
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
  illuminated: z.boolean().optional(),
  digital: z.boolean().optional(),
  powered: z.boolean().optional(),
  hasPrintService: z.boolean().optional(),
  status: assetStatusSchema.optional(),
  notes: z.string().optional(),
  installedDate: z.coerce.date().optional(),
  retiredDate: z.coerce.date().optional(),
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
  facing: assetFaceFacingSchema.optional(),
  visibilityNotes: z.string().optional(),
  status: assetFaceStatusSchema.optional(),
  restrictions: z.string().optional(),
  notes: z.string().optional(),
});

export const updateAssetFaceSchema = createAssetFaceSchema.partial().extend({
  id: z.string().min(1),
});

// ============================================================================
// Supporting Schemas
// ============================================================================

export const createAssetImageSchema = z.object({
  assetId: z.string().min(1),
  image: z.string().url(),
  caption: z.string().optional(),
  isPrimary: z.boolean().optional(),
});

export const createAssetFaceImageSchema = z.object({
  faceId: z.string().min(1),
  image: z.string().url(),
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

export async function getAssetById(id: string) {
  return db.asset.findUnique({
    where: { id },
    include: {
      structureType: true,
      zone: { include: { province: true } },
      roadType: true,
      _count: { select: { faces: true } },
    },
  });
}

export async function createAsset(input: CreateAssetInput) {
  return db.asset.create({
    data: {
      ...input,
      roadTypeId: input.roadTypeId || null,
      landmark: input.landmark || null,
      notes: input.notes || null,
      installedDate: input.installedDate || null,
      retiredDate: input.retiredDate || null,
    },
  });
}

export async function updateAsset(input: UpdateAssetInput) {
  const { id, ...data } = input;
  const updateData: Prisma.AssetUncheckedUpdateInput = {
    ...data,
  };

  if ("roadTypeId" in data) {
    updateData.roadTypeId = data.roadTypeId ? data.roadTypeId : null;
  }
  if ("landmark" in data) {
    updateData.landmark = data.landmark ? data.landmark : null;
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

  return db.asset.update({
    where: { id },
    data: updateData,
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
      asset: { select: { id: true, code: true } },
      position: true,
    },
  });
}

export async function createAssetFace(input: CreateAssetFaceInput) {
  return db.assetFace.create({
    data: {
      ...input,
      positionId: input.positionId || null,
      visibilityNotes: input.visibilityNotes || null,
      restrictions: input.restrictions || null,
      notes: input.notes || null,
    },
  });
}

export async function updateAssetFace(input: UpdateAssetFaceInput) {
  const { id, ...data } = input;
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

  return db.assetFace.update({
    where: { id },
    data: updateData,
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
