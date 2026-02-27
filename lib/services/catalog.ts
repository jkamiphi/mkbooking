import { db } from "@/lib/db";
import { z } from "zod";
import type { Prisma } from "@prisma/client";
import { isExpectedS3PublicUrl } from "@/lib/storage/s3";

const promoTypeValues = ["PERCENT", "FIXED"] as const;
const holdStatusValues = ["ACTIVE", "EXPIRED", "RELEASED", "CONVERTED"] as const;

export const promoTypeSchema = z.enum(promoTypeValues);
export const holdStatusSchema = z.enum(holdStatusValues);

const s3OnlyImageErrorMessage =
  "Image URLs must use the configured public S3 domain.";

const s3PublicUrlSchema = z.string().url().refine(isExpectedS3PublicUrl, {
  message: s3OnlyImageErrorMessage,
});

export const upsertCatalogFaceSchema = z.object({
  faceId: z.string().min(1),
  title: z.string().optional(),
  summary: z.string().optional(),
  highlight: z.string().optional(),
  primaryImageUrl: s3PublicUrlSchema.nullish(),
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
      primaryImageUrl:
        data.primaryImageUrl === null ? null : data.primaryImageUrl ?? undefined,
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
              images: {
                orderBy: [{ isPrimary: "desc" }, { createdAt: "asc" }],
              },
              structureType: true,
              zone: { include: { province: true } },
              roadType: true,
            },
          },
          images: {
            orderBy: [{ isPrimary: "desc" }, { createdAt: "asc" }],
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
              images: {
                orderBy: [{ isPrimary: "desc" }, { createdAt: "asc" }],
              },
              structureType: true,
              zone: { include: { province: true } },
              roadType: true,
            },
          },
          images: {
            orderBy: [{ isPrimary: "desc" }, { createdAt: "asc" }],
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

type FacePricingContext = {
  id: string;
  asset: {
    zoneId: string;
    structureTypeId: string;
  };
};

async function findActiveRulesForFaces(
  faces: FacePricingContext[],
  organizationId?: string
) {
  if (!faces.length) return [];

  const now = new Date();
  const faceIds = faces.map((face) => face.id);
  const structureTypeIds = Array.from(
    new Set(faces.map((face) => face.asset.structureTypeId))
  );
  const zoneIds = Array.from(new Set(faces.map((face) => face.asset.zoneId)));

  const ruleOr: Prisma.CatalogPriceRuleWhereInput[] = [
    { faceId: null, structureTypeId: null, zoneId: null },
  ];
  if (faceIds.length) ruleOr.push({ faceId: { in: faceIds } });
  if (structureTypeIds.length) {
    ruleOr.push({ structureTypeId: { in: structureTypeIds } });
  }
  if (zoneIds.length) ruleOr.push({ zoneId: { in: zoneIds } });

  return db.catalogPriceRule.findMany({
    where: {
      isActive: true,
      startDate: { lte: now },
      AND: [
        { OR: [{ endDate: null }, { endDate: { gte: now } }] },
        organizationId
          ? { OR: [{ organizationId }, { organizationId: null }] }
          : { organizationId: null },
        { OR: ruleOr },
      ],
    },
    orderBy: { createdAt: "desc" },
  });
}

function mapFacesWithEffectivePrice<T extends FacePricingContext>({
  faces,
  rules,
  organizationId,
}: {
  faces: T[];
  rules: Array<{
    id: string;
    faceId: string | null;
    zoneId: string | null;
    structureTypeId: string | null;
    organizationId: string | null;
    priceDaily: Prisma.Decimal;
    currency: string;
    createdAt: Date;
    startDate: Date;
    endDate: Date | null;
  }>;
  organizationId?: string;
}) {
  return faces.map((face) => {
    const rule = pickEffectiveRule({
      rules,
      faceId: face.id,
      zoneId: face.asset.zoneId,
      structureTypeId: face.asset.structureTypeId,
      organizationId: organizationId ?? undefined,
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
}

type FaceWithImageFallback = {
  asset: {
    images?: Array<{
      image: string;
      isPrimary: boolean;
      createdAt: Date;
    }>;
  };
  catalogFace?: {
    primaryImageUrl: string | null;
  } | null;
  images?: Array<{
    image: string;
    isPrimary: boolean;
    createdAt: Date;
  }>;
};

function pickPrimaryImageUrl(
  images: Array<{ image: string; isPrimary: boolean; createdAt: Date }> | undefined
): string | null {
  if (!images || images.length === 0) {
    return null;
  }

  const orderedImages = [...images]
    .filter((image) => isExpectedS3PublicUrl(image.image))
    .sort((first, second) => {
      if (first.isPrimary === second.isPrimary) {
        return first.createdAt.getTime() - second.createdAt.getTime();
      }

      return first.isPrimary ? -1 : 1;
    });

  return orderedImages[0]?.image || null;
}

export function resolveCatalogFaceImageUrl(face: FaceWithImageFallback): string | null {
  return (
    (face.catalogFace?.primaryImageUrl &&
    isExpectedS3PublicUrl(face.catalogFace.primaryImageUrl)
      ? face.catalogFace.primaryImageUrl
      : null) ||
    pickPrimaryImageUrl(face.images) ||
    pickPrimaryImageUrl(face.asset.images) ||
    null
  );
}

export async function listCatalogFaces(options?: {
  search?: string;
  isPublished?: boolean;
  structureTypeId?: string;
  zoneId?: string;
  organizationId?: string;
  availableFrom?: Date;
  availableTo?: Date;
  skip?: number;
  take?: number;
}) {
  const {
    search,
    isPublished,
    structureTypeId,
    zoneId,
    organizationId,
    availableFrom,
    availableTo,
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

  if (availableFrom || availableTo) {
    const requestedFrom = availableFrom ?? availableTo ?? new Date();
    const requestedTo = availableTo ?? availableFrom ?? requestedFrom;
    const rangeStart =
      requestedFrom <= requestedTo ? requestedFrom : requestedTo;
    const rangeEnd =
      requestedFrom <= requestedTo ? requestedTo : requestedFrom;

    andFilters.push({
      maintenanceWindows: {
        none: {
          startDate: { lte: rangeEnd },
          endDate: { gte: rangeStart },
        },
      },
    });
    andFilters.push({
      asset: {
        maintenanceWindows: {
          none: {
            faceId: null,
            startDate: { lte: rangeEnd },
            endDate: { gte: rangeStart },
          },
        },
      },
    });
    andFilters.push({
      OR: [
        { catalogFace: null },
        {
          catalogFace: {
            holds: {
              none: {
                status: "ACTIVE",
                expiresAt: { gte: rangeStart },
              },
            },
          },
        },
      ],
    });
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
            images: {
              orderBy: [{ isPrimary: "desc" }, { createdAt: "asc" }],
            },
            structureType: true,
            zone: { include: { province: true } },
          },
        },
        images: {
          orderBy: [{ isPrimary: "desc" }, { createdAt: "asc" }],
        },
        position: true,
        catalogFace: true,
      },
    }),
    db.assetFace.count({ where }),
    getActivePromo(),
  ]);

  const activeRules = await findActiveRulesForFaces(faces, organizationId);
  const facesWithPrice = mapFacesWithEffectivePrice({
    faces,
    rules: activeRules,
    organizationId,
  });
  const facesWithResolvedImage = facesWithPrice.map((face) => ({
    ...face,
    resolvedImageUrl: resolveCatalogFaceImageUrl(face),
  }));

  return {
    faces: facesWithResolvedImage,
    total,
    hasMore: skip + faces.length < total,
    promo,
  };
}

export async function getPublicCatalogFaceDetailById(
  faceId: string,
  options?: { organizationId?: string }
) {
  const now = new Date();
  const face = await db.assetFace.findFirst({
    where: {
      id: faceId,
      catalogFace: { isPublished: true },
    },
    include: {
      asset: {
        include: {
          structureType: true,
          zone: { include: { province: true } },
          roadType: true,
          images: {
            orderBy: [{ isPrimary: "desc" }, { createdAt: "asc" }],
          },
          permits: {
            orderBy: [{ expiresDate: "asc" }, { issuedDate: "desc" }],
          },
          maintenanceWindows: {
            orderBy: { startDate: "asc" },
          },
        },
      },
      position: true,
      images: {
        orderBy: [{ isPrimary: "desc" }, { createdAt: "asc" }],
      },
      productionSpec: {
        include: { mountingType: true },
      },
      permits: {
        orderBy: [{ expiresDate: "asc" }, { issuedDate: "desc" }],
      },
      restrictionTags: {
        include: { tag: true },
      },
      maintenanceWindows: {
        orderBy: { startDate: "asc" },
      },
      catalogFace: {
        include: {
          holds: {
            where: {
              status: "ACTIVE",
              expiresAt: { gte: now },
            },
            orderBy: { expiresAt: "asc" },
            include: {
              organization: true,
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
      },
    },
  });

  if (!face || !face.catalogFace) {
    return null;
  }

  const [activeRules, promo, rawRelatedFaces] = await Promise.all([
    findActiveRulesForFaces([face], options?.organizationId),
    getActivePromo(),
    db.assetFace.findMany({
      where: {
        id: { not: face.id },
        catalogFace: { isPublished: true },
        asset: { zoneId: face.asset.zoneId },
      },
      take: 6,
      orderBy: [{ asset: { code: "asc" } }, { code: "asc" }],
      include: {
        asset: {
          include: {
            images: {
              orderBy: [{ isPrimary: "desc" }, { createdAt: "asc" }],
            },
            structureType: true,
            zone: { include: { province: true } },
          },
        },
        images: {
          orderBy: [{ isPrimary: "desc" }, { createdAt: "asc" }],
        },
        position: true,
        catalogFace: true,
      },
    }),
  ]);

  const relatedRules = await findActiveRulesForFaces(
    rawRelatedFaces,
    options?.organizationId
  );
  const relatedFaces = mapFacesWithEffectivePrice({
    faces: rawRelatedFaces,
    rules: relatedRules,
    organizationId: options?.organizationId,
  }).map((relatedFace) => ({
    ...relatedFace,
    resolvedImageUrl: resolveCatalogFaceImageUrl(relatedFace),
  }));

  const effectiveRule = pickEffectiveRule({
    rules: activeRules,
    faceId: face.id,
    zoneId: face.asset.zoneId,
    structureTypeId: face.asset.structureTypeId,
    organizationId: options?.organizationId ?? undefined,
  });

  return {
    face,
    promo,
    relatedFaces,
    resolvedImageUrl: resolveCatalogFaceImageUrl(face),
    effectivePrice: effectiveRule
      ? {
        priceDaily: effectiveRule.priceDaily,
        currency: effectiveRule.currency,
        ruleId: effectiveRule.id,
      }
      : null,
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
  const catalogFace = await upsertCatalogFace({ faceId: input.faceId });
  const expiresAt = new Date(Date.now() + DAY_IN_MS);
  const profile = createdByUserId
    ? await db.userProfile.findUnique({
      where: { userId: createdByUserId },
      select: { id: true },
    })
    : null;

  return db.catalogHold.create({
    data: {
      faceId: catalogFace.id,
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

// ---------------------------------------------------------------------------
// Availability check for pre-reservation
// ---------------------------------------------------------------------------

export const checkFacesAvailabilitySchema = z.object({
  faceIds: z.array(z.string().min(1)).min(1).max(200),
  fromDate: z.coerce.date().optional(),
  toDate: z.coerce.date().optional(),
});

export type FaceAvailabilityResult = {
  faceId: string;
  code: string;
  title: string;
};

export type FaceUnavailableResult = FaceAvailabilityResult & {
  reason: string;
};

export async function checkFacesAvailability(
  input: z.infer<typeof checkFacesAvailabilitySchema>
) {
  const now = new Date();
  const uniqueIds = Array.from(new Set(input.faceIds));

  // Fetch all faces with their related availability data in a single query
  const faces = await db.assetFace.findMany({
    where: { id: { in: uniqueIds } },
    include: {
      asset: {
        include: {
          structureType: true,
          maintenanceWindows: true,
        },
      },
      catalogFace: {
        include: {
          holds: {
            where: {
              status: "ACTIVE",
              expiresAt: { gte: now },
            },
          },
        },
      },
      maintenanceWindows: true,
    },
  });

  const faceMap = new Map(faces.map((f) => [f.id, f]));

  const available: FaceAvailabilityResult[] = [];
  const unavailable: FaceUnavailableResult[] = [];

  for (const id of uniqueIds) {
    const face = faceMap.get(id);

    if (!face) {
      unavailable.push({
        faceId: id,
        code: "—",
        title: "Cara no encontrada",
        reason: "La cara ya no existe en el sistema.",
      });
      continue;
    }

    const title =
      face.catalogFace?.title ||
      `${face.asset.structureType.name} · Cara ${face.code}`;
    const base = { faceId: id, code: face.code, title };

    // 1. Face or asset not active
    if (face.status !== "ACTIVE") {
      unavailable.push({
        ...base,
        reason: `Cara en estado ${face.status.toLowerCase()}.`,
      });
      continue;
    }
    if (face.asset.status !== "ACTIVE") {
      unavailable.push({
        ...base,
        reason: `Activo en estado ${face.asset.status.toLowerCase()}.`,
      });
      continue;
    }

    // 2. CatalogFace must exist and be published
    if (!face.catalogFace || !face.catalogFace.isPublished) {
      unavailable.push({
        ...base,
        reason: "Cara no publicada en el catálogo.",
      });
      continue;
    }

    // 3. Active holds
    if (face.catalogFace.holds.length > 0) {
      unavailable.push({
        ...base,
        reason: "Cara reservada (hold activo).",
      });
      continue;
    }

    // 4. Maintenance windows overlapping requested date range
    if (input.fromDate || input.toDate) {
      const rangeStart = input.fromDate ?? input.toDate ?? now;
      const rangeEnd = input.toDate ?? input.fromDate ?? now;

      const hasOverlappingFaceMaintenance = face.maintenanceWindows.some(
        (w) => w.startDate <= rangeEnd && w.endDate >= rangeStart
      );

      const hasOverlappingAssetMaintenance =
        face.asset.maintenanceWindows.some(
          (w) =>
            w.faceId === null &&
            w.startDate <= rangeEnd &&
            w.endDate >= rangeStart
        );

      if (hasOverlappingFaceMaintenance || hasOverlappingAssetMaintenance) {
        unavailable.push({
          ...base,
          reason: "Cara en mantenimiento durante el período solicitado.",
        });
        continue;
      }
    }

    available.push(base);
  }

  return { available, unavailable };
}
