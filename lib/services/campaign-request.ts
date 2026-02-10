import { db } from "@/lib/db";
import { z } from "zod";
import { listCatalogFaces } from "@/lib/services/catalog";

const DAY_IN_MS = 24 * 60 * 60 * 1000;

const campaignRequestStatusValues = [
  "NEW",
  "IN_REVIEW",
  "PROPOSAL_SENT",
  "CONFIRMED",
  "REJECTED",
] as const;

export const campaignRequestStatusSchema = z.enum(campaignRequestStatusValues);

export const createCampaignRequestSchema = z
  .object({
    query: z.string().trim().min(1).max(200).optional(),
    zoneId: z.string().optional(),
    structureTypeId: z.string().optional(),
    quantity: z.number().int().min(1).max(500),
    fromDate: z.coerce.date().optional(),
    toDate: z.coerce.date().optional(),
    notes: z.string().trim().max(2000).optional(),
    contactName: z.string().trim().max(120).optional(),
    contactEmail: z.string().trim().email().max(160).optional(),
    contactPhone: z.string().trim().max(40).optional(),
    organizationId: z.string().optional(),
  })
  .refine(
    (value) => {
      if (!value.fromDate || !value.toDate) return true;
      return value.toDate >= value.fromDate;
    },
    { message: "La fecha final debe ser mayor o igual a la fecha inicial", path: ["toDate"] }
  );

export const updateCampaignRequestStatusSchema = z.object({
  requestId: z.string().min(1),
  status: campaignRequestStatusSchema,
});

export const assignCampaignRequestFacesSchema = z.object({
  requestId: z.string().min(1),
  faceIds: z.array(z.string().min(1)).max(200),
});

export const suggestCampaignRequestFacesSchema = z.object({
  requestId: z.string().min(1),
  take: z.number().int().min(1).max(100).default(30),
});

export const listCampaignRequestsSchema = z.object({
  status: campaignRequestStatusSchema.optional(),
  skip: z.number().int().min(0).default(0),
  take: z.number().int().min(1).max(100).default(50),
});

export type CreateCampaignRequestInput = z.infer<typeof createCampaignRequestSchema>;

async function resolveUserProfile(userId?: string) {
  if (!userId) return null;

  return db.userProfile.findUnique({
    where: { userId },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      user: {
        select: {
          name: true,
          email: true,
        },
      },
      organizationRoles: {
        where: { isActive: true },
        take: 1,
        select: {
          organizationId: true,
          organization: { select: { id: true, isActive: true } },
        },
      },
    },
  });
}

function normalizeDateRange(fromDate?: Date | null, toDate?: Date | null) {
  if (!fromDate && !toDate) {
    return { fromDate: null, toDate: null };
  }

  const requestedFrom = fromDate ?? toDate ?? null;
  const requestedTo = toDate ?? fromDate ?? null;

  if (!requestedFrom || !requestedTo) {
    return { fromDate: requestedFrom, toDate: requestedTo };
  }

  return requestedFrom <= requestedTo
    ? { fromDate: requestedFrom, toDate: requestedTo }
    : { fromDate: requestedTo, toDate: requestedFrom };
}

export async function createCampaignRequest(
  input: CreateCampaignRequestInput,
  options?: { createdByUserId?: string }
) {
  const profile = await resolveUserProfile(options?.createdByUserId);
  const resolvedDates = normalizeDateRange(input.fromDate, input.toDate);
  const profileOrganizationId = profile?.organizationRoles?.[0]?.organization?.isActive
    ? profile.organizationRoles[0].organizationId
    : null;
  const organizationId = input.organizationId || profileOrganizationId || null;

  const profileName =
    [profile?.firstName, profile?.lastName]
      .filter(Boolean)
      .join(" ")
      .trim() || profile?.user?.name || null;
  const profileEmail = profile?.user?.email || null;

  return db.campaignRequest.create({
    data: {
      query: input.query || null,
      zoneId: input.zoneId || null,
      structureTypeId: input.structureTypeId || null,
      quantity: input.quantity,
      fromDate: resolvedDates.fromDate,
      toDate: resolvedDates.toDate,
      notes: input.notes || null,
      contactName: input.contactName || profileName || null,
      contactEmail: input.contactEmail || profileEmail || null,
      contactPhone: input.contactPhone || null,
      organizationId: organizationId || null,
      createdById: profile?.id || null,
      status: "NEW",
    },
    include: {
      zone: { include: { province: true } },
      structureType: true,
      organization: true,
    },
  });
}

const requestInclude = {
  zone: { include: { province: true } },
  structureType: true,
  organization: true,
  createdBy: {
    include: {
      user: {
        select: {
          name: true,
          email: true,
        },
      },
    },
  },
  resolvedBy: {
    include: {
      user: {
        select: {
          name: true,
          email: true,
        },
      },
    },
  },
  assignments: {
    include: {
      face: {
        include: {
          asset: {
            include: {
              structureType: true,
              zone: { include: { province: true } },
            },
          },
        },
      },
    },
    orderBy: { createdAt: "asc" },
  },
} as const;

export async function listCampaignRequests(
  input: z.infer<typeof listCampaignRequestsSchema>
) {
  const where = input.status ? { status: input.status } : undefined;

  const [requests, total] = await Promise.all([
    db.campaignRequest.findMany({
      where,
      orderBy: [{ createdAt: "desc" }],
      skip: input.skip,
      take: input.take,
      include: requestInclude,
    }),
    db.campaignRequest.count({ where }),
  ]);

  return {
    requests,
    total,
    hasMore: input.skip + requests.length < total,
  };
}

export async function getCampaignRequestById(requestId: string) {
  return db.campaignRequest.findUnique({
    where: { id: requestId },
    include: requestInclude,
  });
}

export async function updateCampaignRequestStatus(
  input: z.infer<typeof updateCampaignRequestStatusSchema>,
  resolvedByUserId?: string
) {
  const profile = await resolveUserProfile(resolvedByUserId);
  const isTerminalStatus = input.status === "CONFIRMED" || input.status === "REJECTED";

  return db.campaignRequest.update({
    where: { id: input.requestId },
    data: {
      status: input.status,
      resolvedAt: isTerminalStatus ? new Date() : null,
      resolvedById: isTerminalStatus ? profile?.id || null : null,
    },
    include: requestInclude,
  });
}

export async function assignCampaignRequestFaces(
  input: z.infer<typeof assignCampaignRequestFacesSchema>
) {
  const uniqueFaceIds = Array.from(new Set(input.faceIds));

  await db.$transaction(async (tx) => {
    await tx.campaignRequest.findUniqueOrThrow({
      where: { id: input.requestId },
      select: { id: true },
    });

    await tx.campaignRequestFaceAssignment.deleteMany({
      where: { requestId: input.requestId },
    });

    if (uniqueFaceIds.length) {
      await tx.campaignRequestFaceAssignment.createMany({
        data: uniqueFaceIds.map((faceId) => ({ requestId: input.requestId, faceId })),
      });
    }
  });

  return getCampaignRequestById(input.requestId);
}

export async function suggestFacesForCampaignRequest(
  input: z.infer<typeof suggestCampaignRequestFacesSchema>
) {
  const request = await db.campaignRequest.findUnique({
    where: { id: input.requestId },
    include: {
      assignments: {
        select: { faceId: true },
      },
    },
  });

  if (!request) {
    throw new Error("Solicitud no encontrada");
  }

  const take = Math.min(Math.max(input.take, request.quantity * 3), 100);
  const catalog = await listCatalogFaces({
    search: request.query || undefined,
    isPublished: true,
    structureTypeId: request.structureTypeId || undefined,
    zoneId: request.zoneId || undefined,
    availableFrom: request.fromDate || undefined,
    availableTo: request.toDate || undefined,
    take,
    skip: 0,
  });

  const assignedFaceIds = new Set(request.assignments.map((assignment) => assignment.faceId));

  return catalog.faces.slice(0, input.take).map((face) => ({
    id: face.id,
    code: face.code,
    assetCode: face.asset.code,
    title: face.catalogFace?.title || `${face.asset.structureType.name} · Cara ${face.code}`,
    zone: face.asset.zone.name,
    province: face.asset.zone.province.name,
    structureType: face.asset.structureType.name,
    isAssigned: assignedFaceIds.has(face.id),
  }));
}

export async function confirmCampaignRequest(
  requestId: string,
  resolvedByUserId?: string
) {
  const now = new Date();
  const expiresAt = new Date(now.getTime() + DAY_IN_MS);
  const profile = await resolveUserProfile(resolvedByUserId);

  const request = await db.campaignRequest.findUnique({
    where: { id: requestId },
    include: {
      assignments: {
        include: {
          face: {
            select: { id: true },
          },
        },
      },
    },
  });

  if (!request) {
    throw new Error("Solicitud no encontrada");
  }

  if (!request.assignments.length) {
    throw new Error("No hay caras asignadas para confirmar");
  }

  const result = await db.$transaction(async (tx) => {
    let createdHolds = 0;
    let skippedActiveHolds = 0;

    for (const assignment of request.assignments) {
      const catalogFace = await tx.catalogFace.upsert({
        where: { faceId: assignment.face.id },
        create: { faceId: assignment.face.id },
        update: {},
      });

      const activeHold = await tx.catalogHold.findFirst({
        where: {
          faceId: catalogFace.id,
          status: "ACTIVE",
          expiresAt: { gte: now },
        },
        select: { id: true },
      });

      if (activeHold) {
        skippedActiveHolds += 1;
        continue;
      }

      await tx.catalogHold.create({
        data: {
          faceId: catalogFace.id,
          organizationId: request.organizationId,
          createdById: profile?.id || null,
          status: "ACTIVE",
          expiresAt,
        },
      });
      createdHolds += 1;
    }

    await tx.campaignRequest.update({
      where: { id: requestId },
      data: {
        status: "CONFIRMED",
        resolvedAt: new Date(),
        resolvedById: profile?.id || null,
      },
    });

    return {
      requestId,
      totalAssigned: request.assignments.length,
      createdHolds,
      skippedActiveHolds,
    };
  });

  return result;
}
