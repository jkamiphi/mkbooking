import { db } from "@/lib/db";
import { z } from "zod";
import type { Prisma } from "@prisma/client";

const promoTypeValues = ["PERCENT", "FIXED"] as const;
const holdStatusValues = ["ACTIVE", "EXPIRED", "RELEASED", "CONVERTED"] as const;

export const promoTypeSchema = z.enum(promoTypeValues);
export const holdStatusSchema = z.enum(holdStatusValues);

export const upsertCatalogFaceSchema = z.object({
  faceId: z.string().min(1),
  title: z.string().optional(),
  summary: z.string().optional(),
  highlight: z.string().optional(),
  primaryImageUrl: z.string().url().optional(),
  isPublished: z.boolean().optional(),
});

export const createPriceRuleSchema = z
  .object({
    faceId: z.string().optional(),
    structureTypeId: z.string().optional(),
    zoneId: z.string().optional(),
    organizationId: z.string().optional(),
    priceDaily: z.number().min(0),
    currency: z.string().optional(),
    startDate: z.coerce.date().optional(),
    endDate: z.coerce.date().optional(),
    isActive: z.boolean().optional(),
  })
  .refine(
    (value) => {
      if (value.startDate && value.endDate) {
        return value.endDate >= value.startDate;
      }
      return true;
    },
    { message: "End date must be after start date", path: ["endDate"] }
  );

export const createPromoSchema = z.object({
  name: z.string().min(1),
  type: promoTypeSchema,
  value: z.number().min(0),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
  isActive: z.boolean().optional(),
});

export const createHoldSchema = z.object({
  faceId: z.string().min(1),
  organizationId: z.string().optional(),
});

export type UpsertCatalogFaceInput = z.infer<typeof upsertCatalogFaceSchema>;
export type CreatePriceRuleInput = z.infer<typeof createPriceRuleSchema>;
export type CreatePromoInput = z.infer<typeof createPromoSchema>;
export type CreateHoldInput = z.infer<typeof createHoldSchema>;

const DAY_IN_MS = 24 * 60 * 60 * 1000;

function toDate(value?: Date) {
  return value ?? undefined;
}

export async function upsertCatalogFace(input: UpsertCatalogFaceInput) {
  const { faceId, ...data } = input;
  return db.catalogFace.upsert({
    where: { faceId },
    create: {
      faceId,
      title: data.title || null,
      summary: data.summary || null,
      highlight: data.highlight || null,
      primaryImageUrl: data.primaryImageUrl || null,
      isPublished: data.isPublished ?? false,
    },
    update: {
      title: data.title ?? undefined,
      summary: data.summary ?? undefined,
      highlight: data.highlight ?? undefined,
      primaryImageUrl: data.primaryImageUrl ?? undefined,
      isPublished: data.isPublished ?? undefined,
    },
  });
}

export async function getCatalogFaceByFaceId(faceId: string) {
  const existing = await db.catalogFace.findUnique({
    where: { faceId },
    include: {
      face: {
        include: {
          asset: {
            include: {
              structureType: true,
              zone: { include: { province: true } },
              roadType: true,
            },
          },
          position: true,
        },
      },
      priceRules: {
        orderBy: { createdAt: "desc" },
        include: {
          organization: true,
          structureType: true,
          zone: { include: { province: true } },
        },
      },
    },
  });

  if (existing) return existing;

  await upsertCatalogFace({ faceId });
  return db.catalogFace.findUnique({
    where: { faceId },
    include: {
      face: {
        include: {
          asset: {
            include: {
              structureType: true,
              zone: { include: { province: true } },
              roadType: true,
            },
          },
          position: true,
        },
      },
      priceRules: {
        orderBy: { createdAt: "desc" },
        include: {
          organization: true,
          structureType: true,
          zone: { include: { province: true } },
        },
      },
    },
  });
}

function ruleRank(rule: {
  faceId: string | null;
  zoneId: string | null;
  structureTypeId: string | null;
  organizationId: string | null;
}) {
  const hasFace = !!rule.faceId;
  const hasZone = !!rule.zoneId;
  const hasStructure = !!rule.structureTypeId;
  const hasOrg = !!rule.organizationId;

  if (hasFace && hasOrg) return 1;
  if (hasFace) return 2;
  if (hasZone && hasOrg) return 3;
  if (hasStructure && hasOrg) return 4;
  if (hasZone) return 5;
  if (hasStructure) return 6;
  if (hasOrg) return 7;
  return 8;
}

function ruleMatches(
  rule: {
    faceId: string | null;
    zoneId: string | null;
    structureTypeId: string | null;
    organizationId: string | null;
  },
  params: {
    faceId: string;
    zoneId: string;
    structureTypeId: string;
    organizationId?: string | null;
  }
) {
  if (rule.faceId && rule.faceId !== params.faceId) return false;
  if (rule.zoneId && rule.zoneId !== params.zoneId) return false;
  if (rule.structureTypeId && rule.structureTypeId !== params.structureTypeId) {
    return false;
  }
  if (rule.organizationId && rule.organizationId !== params.organizationId) {
    return false;
  }
  return true;
}

function pickEffectiveRule<T extends { id: string; createdAt: Date }>({
  rules,
  faceId,
  zoneId,
  structureTypeId,
  organizationId,
}: {
  rules: Array<
    T & {
      faceId: string | null;
      zoneId: string | null;
      structureTypeId: string | null;
      organizationId: string | null;
      startDate: Date;
      endDate: Date | null;
    }
  >;
  faceId: string;
  zoneId: string;
  structureTypeId: string;
  organizationId?: string | null;
}) {
  const matches = rules.filter((rule) =>
    ruleMatches(rule, { faceId, zoneId, structureTypeId, organizationId })
  );
  if (!matches.length) return null;
  return matches.sort((a, b) => {
    const rankA = ruleRank(a);
    const rankB = ruleRank(b);
    if (rankA !== rankB) return rankA - rankB;
    if (a.startDate.getTime() !== b.startDate.getTime()) {
      return b.startDate.getTime() - a.startDate.getTime();
    }
    return b.createdAt.getTime() - a.createdAt.getTime();
  })[0];
}

export async function listCatalogFaces(options?: {
  search?: string;
  isPublished?: boolean;
  structureTypeId?: string;
  zoneId?: string;
  skip?: number;
  take?: number;
}) {
  const {
    search,
    isPublished,
    structureTypeId,
    zoneId,
    skip = 0,
    take = 50,
  } = options ?? {};

  const where: Prisma.AssetFaceWhereInput = {};
  const assetWhere: Prisma.AssetWhereInput = {};
  const andFilters: Prisma.AssetFaceWhereInput[] = [];

  if (search) {
    andFilters.push({
      OR: [
        { code: { contains: search, mode: "insensitive" } },
        { asset: { code: { contains: search, mode: "insensitive" } } },
        { asset: { address: { contains: search, mode: "insensitive" } } },
      ],
    });
  }

  if (structureTypeId) assetWhere.structureTypeId = structureTypeId;
  if (zoneId) assetWhere.zoneId = zoneId;
  if (Object.keys(assetWhere).length > 0) {
    andFilters.push({ asset: assetWhere });
  }

  if (isPublished !== undefined) {
    if (isPublished) {
      andFilters.push({ catalogFace: { isPublished: true } });
    } else {
      andFilters.push({
        OR: [{ catalogFace: { isPublished: false } }, { catalogFace: null }],
      });
    }
  }

  if (andFilters.length > 0) {
    where.AND = andFilters;
  }

  const [faces, total, promo] = await Promise.all([
    db.assetFace.findMany({
      where,
      skip,
      take,
      orderBy: [{ asset: { code: "asc" } }, { code: "asc" }],
      include: {
        asset: {
          include: {
            structureType: true,
            zone: { include: { province: true } },
          },
        },
        position: true,
        catalogFace: true,
      },
    }),
    db.assetFace.count({ where }),
    getActivePromo(),
  ]);

  const now = new Date();
  const faceIds = faces.map((face) => face.id);
  const structureTypeIds = Array.from(
    new Set(faces.map((face) => face.asset.structureTypeId))
  );
  const zoneIds = Array.from(new Set(faces.map((face) => face.asset.zoneId)));

  const ruleOr: Prisma.CatalogPriceRuleWhereInput[] = [];
  if (faceIds.length) ruleOr.push({ faceId: { in: faceIds } });
  if (structureTypeIds.length) {
    ruleOr.push({ structureTypeId: { in: structureTypeIds } });
  }
  if (zoneIds.length) ruleOr.push({ zoneId: { in: zoneIds } });
  ruleOr.push({ faceId: null, structureTypeId: null, zoneId: null });

  const activeRules =
    ruleOr.length === 0
      ? []
      : await db.catalogPriceRule.findMany({
          where: {
            isActive: true,
            startDate: { lte: now },
            AND: [
              { OR: [{ endDate: null }, { endDate: { gte: now } }] },
              { organizationId: null },
              { OR: ruleOr },
            ],
          },
          orderBy: { createdAt: "desc" },
        });

  const facesWithPrice = faces.map((face) => {
    const rule = pickEffectiveRule({
      rules: activeRules,
      faceId: face.id,
      zoneId: face.asset.zoneId,
      structureTypeId: face.asset.structureTypeId,
    });
    return {
      ...face,
      effectivePrice: rule
        ? {
            priceDaily: rule.priceDaily,
            currency: rule.currency,
            ruleId: rule.id,
          }
        : null,
    };
  });

  return {
    faces: facesWithPrice,
    total,
    hasMore: skip + faces.length < total,
    promo,
  };
}

export async function createPriceRule(input: CreatePriceRuleInput) {
  if (input.faceId) {
    await upsertCatalogFace({ faceId: input.faceId });
  }
  return db.catalogPriceRule.create({
    data: {
      faceId: input.faceId ?? null,
      structureTypeId: input.structureTypeId ?? null,
      zoneId: input.zoneId ?? null,
      organizationId: input.organizationId ?? null,
      priceDaily: input.priceDaily,
      currency: input.currency ?? "USD",
      startDate: toDate(input.startDate) ?? new Date(),
      endDate: toDate(input.endDate) ?? null,
      isActive: input.isActive ?? true,
    },
  });
}

export async function listPriceRules(options?: {
  faceId?: string;
  structureTypeId?: string;
  zoneId?: string;
  organizationId?: string;
  isActive?: boolean;
}) {
  const where: Prisma.CatalogPriceRuleWhereInput = {};
  if (options?.faceId) where.faceId = options.faceId;
  if (options?.structureTypeId) where.structureTypeId = options.structureTypeId;
  if (options?.zoneId) where.zoneId = options.zoneId;
  if (options?.organizationId) where.organizationId = options.organizationId;
  if (options?.isActive !== undefined) where.isActive = options.isActive;

  return db.catalogPriceRule.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: {
      organization: true,
      structureType: true,
      zone: { include: { province: true } },
      face: { include: { face: { include: { asset: true } } } },
    },
  });
}

export async function getActivePromo() {
  const now = new Date();
  return db.catalogPromo.findFirst({
    where: {
      isActive: true,
      startDate: { lte: now },
      OR: [{ endDate: null }, { endDate: { gte: now } }],
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function createPromo(input: CreatePromoInput) {
  if (input.isActive ?? true) {
    await db.catalogPromo.updateMany({
      data: { isActive: false },
      where: { isActive: true },
    });
  }
  return db.catalogPromo.create({
    data: {
      name: input.name,
      type: input.type,
      value: input.value,
      startDate: toDate(input.startDate) ?? new Date(),
      endDate: toDate(input.endDate) ?? null,
      isActive: input.isActive ?? true,
    },
  });
}

export async function listPromos() {
  return db.catalogPromo.findMany({
    orderBy: { createdAt: "desc" },
  });
}

export async function listHolds(status?: z.infer<typeof holdStatusSchema>) {
  const now = new Date();
  await db.catalogHold.updateMany({
    data: { status: "EXPIRED" },
    where: { status: "ACTIVE", expiresAt: { lt: now } },
  });

  const where: Prisma.CatalogHoldWhereInput = {};
  if (status) where.status = status;

  return db.catalogHold.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: {
      face: { include: { face: { include: { asset: true } } } },
      organization: true,
    },
  });
}

export async function createHold(
  input: CreateHoldInput,
  createdByUserId?: string
) {
  await upsertCatalogFace({ faceId: input.faceId });
  const expiresAt = new Date(Date.now() + DAY_IN_MS);
  const profile = createdByUserId
    ? await db.userProfile.findUnique({
        where: { userId: createdByUserId },
        select: { id: true },
      })
    : null;

  return db.catalogHold.create({
    data: {
      faceId: input.faceId,
      organizationId: input.organizationId ?? null,
      createdById: profile?.id ?? null,
      expiresAt,
      status: "ACTIVE",
    },
  });
}

export async function releaseHold(holdId: string) {
  return db.catalogHold.update({
    where: { id: holdId },
    data: { status: "RELEASED", releasedAt: new Date() },
  });
}
