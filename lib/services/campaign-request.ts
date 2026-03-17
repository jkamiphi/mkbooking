import { db } from "@/lib/db";
import { z } from "zod";
import { listCatalogFaces } from "@/lib/services/catalog";
import { getCampaignRequestStartGapDays } from "@/lib/server-config";
import {
  addDays,
  clampDate,
  computeMinimumStartDate,
  parseDateInputValue,
} from "@/lib/date/campaign-date-range";
import {
  notifySalesReviewReopened,
  reopenOrderSalesReview,
  resolveSalesReviewActor,
} from "@/lib/services/sales-review";
import {
  resolveActiveOrganizationContextForUser,
  resolveOrganizationOperationScope,
} from "@/lib/services/organization-access";

const DAY_IN_MS = 24 * 60 * 60 * 1000;

const campaignRequestStatusValues = [
  "NEW",
  "IN_REVIEW",
  "QUOTATION_GENERATED",
  "PROPOSAL_SENT",
  "CONFIRMED",
  "REJECTED",
] as const;

export const campaignRequestStatusSchema = z.enum(campaignRequestStatusValues);

const selectedServiceSchema = z.object({
  serviceId: z.string().min(1),
  quantity: z.number().int().min(1).max(999).optional(),
  notes: z.string().trim().max(500).optional(),
});

const campaignDateFieldSchema = z
  .union([z.string(), z.date()])
  .transform((value, ctx) => {
    if (value instanceof Date) {
      if (!Number.isFinite(value.getTime())) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Fecha inválida.",
        });
        return z.NEVER;
      }

      return clampDate(value);
    }

    const parsed = parseDateInputValue(value);
    if (!parsed) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Fecha inválida.",
      });
      return z.NEVER;
    }

    return parsed;
  });

export const createCampaignRequestSchema = z
  .object({
    query: z.string().trim().min(1).max(200).optional(),
    zoneId: z.string().optional(),
    structureTypeId: z.string().optional(),
    quantity: z.number().int().min(1).max(500),
    fromDate: campaignDateFieldSchema,
    toDate: campaignDateFieldSchema,
    notes: z.string().trim().max(2000).optional(),
    contactName: z.string().trim().max(120).optional(),
    contactEmail: z.string().trim().email().max(160).optional(),
    contactPhone: z.string().trim().max(40).optional(),
    organizationId: z.string().optional(),
    selectedFaceIds: z.array(z.string().min(1)).max(200).optional(),
    selectedServices: z.array(selectedServiceSchema).max(50).optional(),
  })
  .superRefine((value, ctx) => {
    const minimumStartDate = computeMinimumStartDate(
      getCampaignRequestStartGapDays(),
    );
    const normalizedFromDate = clampDate(value.fromDate);
    const normalizedToDate = clampDate(value.toDate);

    if (normalizedFromDate < minimumStartDate) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "La fecha inicial no puede ser anterior al inicio permitido.",
        path: ["fromDate"],
      });
    }

    if (normalizedToDate < addDays(normalizedFromDate, 1)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          "La fecha final debe ser al menos 1 día posterior a la fecha inicial.",
        path: ["toDate"],
      });
    }
  });

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
  includeOutsideCriteria: z.boolean().optional(),
  search: z.string().trim().max(200).optional(),
  zoneId: z.string().optional(),
  structureTypeId: z.string().optional(),
  skip: z.number().int().min(0).max(1000).default(0),
  take: z.number().int().min(1).max(200).default(30),
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

function dedupeSelectedServices(input: CreateCampaignRequestInput["selectedServices"]) {
  if (!input?.length) {
    return [];
  }

  const serviceMap = new Map<
    string,
    { serviceId: string; quantity: number; notes: string | null }
  >();

  for (const selected of input) {
    if (!selected?.serviceId) continue;
    serviceMap.set(selected.serviceId, {
      serviceId: selected.serviceId,
      quantity: selected.quantity ?? 1,
      notes: selected.notes?.trim() || null,
    });
  }

  return Array.from(serviceMap.values());
}

function faceMatchesRequestCriteria(request: { zoneId?: string | null; structureTypeId?: string | null }, face: { asset: { zoneId: string; structureTypeId: string } }) {
  const matchesZone = !request.zoneId || request.zoneId === face.asset.zoneId;
  const matchesStructure =
    !request.structureTypeId || request.structureTypeId === face.asset.structureTypeId;

  return matchesZone && matchesStructure;
}

export async function createCampaignRequest(
  input: CreateCampaignRequestInput,
  options?: { createdByUserId?: string; activeContextKey?: string | null }
) {
  const profile = await resolveUserProfile(options?.createdByUserId);
  const { activeContext } = options?.createdByUserId
    ? await resolveActiveOrganizationContextForUser(
        options.createdByUserId,
        options.activeContextKey,
      )
    : { activeContext: null };
  const operationScope = resolveOrganizationOperationScope(activeContext);
  const resolvedDates = normalizeDateRange(input.fromDate, input.toDate);
  const organizationId =
    operationScope?.organizationId ??
    input.organizationId ??
    activeContext?.organizationId ??
    null;
  const actingAgencyOrganizationId =
    operationScope?.actingAgencyOrganizationId ?? null;

  const profileName =
    [profile?.firstName, profile?.lastName]
      .filter(Boolean)
      .join(" ")
      .trim() || profile?.user?.name || null;
  const profileEmail = profile?.user?.email || null;

  const uniqueFaceIds = input.selectedFaceIds
    ? Array.from(new Set(input.selectedFaceIds))
    : [];
  const selectedServices = dedupeSelectedServices(input.selectedServices);

  const result = await db.$transaction(async (tx) => {
    const request = await tx.campaignRequest.create({
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
        actingAgencyOrganizationId: actingAgencyOrganizationId || null,
        createdById: profile?.id || null,
        status: "NEW",
      },
    });

    if (uniqueFaceIds.length > 0) {
      await tx.campaignRequestFaceAssignment.createMany({
        data: uniqueFaceIds.map((faceId) => ({
          requestId: request.id,
          faceId,
        })),
      });
    }

    if (selectedServices.length > 0) {
      const requestedServiceIds = selectedServices.map((service) => service.serviceId);
      const availableServices = await tx.campaignService.findMany({
        where: {
          id: { in: requestedServiceIds },
          isActive: true,
        },
        select: {
          id: true,
          basePrice: true,
        },
      });
      const availableServiceMap = new Map(
        availableServices.map((service) => [service.id, service])
      );

      if (availableServices.length !== requestedServiceIds.length) {
        throw new Error(
          "Uno o más servicios seleccionados no están disponibles en este momento."
        );
      }

      await tx.campaignRequestService.createMany({
        data: selectedServices.map((selected) => {
          const service = availableServiceMap.get(selected.serviceId);
          if (!service) {
            throw new Error("Servicio inválido en la solicitud.");
          }

          const quantity = selected.quantity;
          const unitPrice = Number(service.basePrice);

          return {
            requestId: request.id,
            serviceId: selected.serviceId,
            quantity,
            unitPrice,
            subtotal: quantity * unitPrice,
            notes: selected.notes,
          };
        }),
      });
    }

    return request;
  });

  return db.campaignRequest.findUniqueOrThrow({
    where: { id: result.id },
    include: {
      zone: { include: { province: true } },
      structureType: true,
      organization: true,
      actingAgencyOrganization: true,
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
      },
      services: {
        include: {
          service: true,
        },
        orderBy: { createdAt: "asc" },
      },
    },
  });
}

const requestInclude = {
  zone: { include: { province: true } },
  structureType: true,
  organization: true,
  actingAgencyOrganization: true,
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
  services: {
    include: {
      service: true,
    },
    orderBy: { createdAt: "asc" },
  },
  order: true,
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

export async function listCampaignRequestsForUser(
  input: z.infer<typeof listCampaignRequestsSchema>,
  options: {
    userId: string;
    userEmail?: string | null;
    activeContextKey?: string | null;
  }
) {
  const ownershipScope = await resolveCampaignRequestOwnershipScope(
    options.userId,
    options.activeContextKey,
  );

  if (ownershipScope) {
    const where = {
      ...(input.status ? { status: input.status } : {}),
      ...ownershipScope,
    };

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

  const profile = await resolveUserProfile(options.userId);
  const fallbackOwnershipFilters = buildCampaignRequestFallbackFilters(
    profile,
    options.userEmail,
  );

  if (!fallbackOwnershipFilters.length) {
    return {
      requests: [],
      total: 0,
      hasMore: false,
    };
  }

  const where = {
    ...(input.status ? { status: input.status } : {}),
    OR: fallbackOwnershipFilters,
  };

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

async function resolveCampaignRequestOwnershipScope(
  userId: string,
  activeContextKey?: string | null,
) {
  const { activeContext } = await resolveActiveOrganizationContextForUser(
    userId,
    activeContextKey,
  );
  const scope = resolveOrganizationOperationScope(activeContext);

  if (!scope) {
    return null;
  }

  return {
    organizationId: scope.organizationId,
    ...(scope.requiresActingAgencyMatch
      ? { actingAgencyOrganizationId: scope.actingAgencyOrganizationId }
      : {}),
  };
}

function buildCampaignRequestFallbackFilters(
  profile: Awaited<ReturnType<typeof resolveUserProfile>>,
  userEmail?: string | null,
) {
  return [
    profile?.id ? { createdById: profile.id } : null,
    userEmail
      ? {
          contactEmail: {
            equals: userEmail,
            mode: "insensitive" as const,
          },
        }
      : null,
  ].filter((entry): entry is NonNullable<typeof entry> => Boolean(entry));
}

export async function getCampaignRequestByIdForUser(
  requestId: string,
  options: {
    userId: string;
    userEmail?: string | null;
    activeContextKey?: string | null;
  }
) {
  const ownershipScope = await resolveCampaignRequestOwnershipScope(
    options.userId,
    options.activeContextKey,
  );

  if (ownershipScope) {
    return db.campaignRequest.findFirst({
      where: {
        id: requestId,
        ...ownershipScope,
      },
      include: requestInclude,
    });
  }

  const profile = await resolveUserProfile(options.userId);
  const fallbackOwnershipFilters = buildCampaignRequestFallbackFilters(
    profile,
    options.userEmail,
  );
  if (!fallbackOwnershipFilters.length) {
    return null;
  }

  return db.campaignRequest.findFirst({
    where: {
      id: requestId,
      OR: fallbackOwnershipFilters,
    },
    include: requestInclude,
  });
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
  input: z.infer<typeof assignCampaignRequestFacesSchema>,
  options?: { actorUserId?: string }
) {
  const uniqueFaceIds = Array.from(new Set(input.faceIds));
  let outsideCriteriaCount = 0;
  let requestedCount = 0;

  const actor = options?.actorUserId
    ? await resolveSalesReviewActor(options.actorUserId)
    : null;

  await db.$transaction(async (tx) => {
    const request = await tx.campaignRequest.findUniqueOrThrow({
      where: { id: input.requestId },
      select: { id: true, quantity: true, zoneId: true, structureTypeId: true },
    });
    requestedCount = request.quantity;

    if (uniqueFaceIds.length > request.quantity) {
      throw new Error(
        `No puedes asignar más de ${request.quantity} cara(s) para esta solicitud.`
      );
    }

    if (uniqueFaceIds.length > 0) {
      const faces = await tx.assetFace.findMany({
        where: { id: { in: uniqueFaceIds } },
        select: {
          id: true,
          asset: {
            select: {
              zoneId: true,
              structureTypeId: true,
            },
          },
        },
      });

      if (faces.length !== uniqueFaceIds.length) {
        throw new Error("Una o más caras seleccionadas no existen.");
      }

      outsideCriteriaCount = faces.filter(
        (face) => !faceMatchesRequestCriteria(request, face)
      ).length;
    }

    await tx.campaignRequestFaceAssignment.deleteMany({
      where: { requestId: input.requestId },
    });

    if (uniqueFaceIds.length) {
      await tx.campaignRequestFaceAssignment.createMany({
        data: uniqueFaceIds.map((faceId) => ({ requestId: input.requestId, faceId })),
      });
    }

    const linkedOrder = await tx.order.findUnique({
      where: { campaignRequestId: input.requestId },
      select: { id: true, code: true },
    });

    if (linkedOrder) {
      await reopenOrderSalesReview(tx, {
        orderId: linkedOrder.id,
        actorId: actor?.profileId ?? null,
        notes: "Asignación de caras actualizada desde la solicitud.",
        eventType: "CRITICAL_CHANGE",
        targetType: "ORDER",
        metadata: {
          requestId: input.requestId,
          assignedCount: uniqueFaceIds.length,
          requestedCount: request.quantity,
          outsideCriteriaCount,
        },
      });
    }
  });

  const request = await getCampaignRequestById(input.requestId);
  const linkedOrder = await db.order.findUnique({
    where: { campaignRequestId: input.requestId },
    select: { id: true, code: true },
  });

  if (linkedOrder) {
    await notifySalesReviewReopened({
      orderId: linkedOrder.id,
      orderCode: linkedOrder.code,
      eventType: "CRITICAL_CHANGE",
      actorName: actor?.fullName || "Sistema",
      reason: "Se modificaron las caras asignadas en la solicitud.",
      notes: `Asignadas ${uniqueFaceIds.length} de ${requestedCount}.`,
    });
  }

  return {
    request,
    assignedCount: uniqueFaceIds.length,
    requestedCount,
    outsideCriteriaCount,
    salesReviewReopenedForOrder: linkedOrder
      ? {
          orderId: linkedOrder.id,
          orderCode: linkedOrder.code,
        }
      : null,
  };
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

  const take = Math.min(Math.max(input.take, request.quantity * 3), 200);
  const includeOutsideCriteria = input.includeOutsideCriteria ?? false;
  const zoneId =
    input.zoneId ??
    (includeOutsideCriteria ? undefined : (request.zoneId ?? undefined));
  const structureTypeId =
    input.structureTypeId ??
    (includeOutsideCriteria ? undefined : (request.structureTypeId ?? undefined));

  const catalog = await listCatalogFaces({
    search: input.search || request.query || undefined,
    isPublished: true,
    structureTypeId,
    zoneId,
    availableFrom: request.fromDate || undefined,
    availableTo: request.toDate || undefined,
    skip: input.skip,
    take,
  });

  const assignedFaceIds = new Set(request.assignments.map((assignment) => assignment.faceId));

  const normalized = catalog.faces.map((face) => {
    const matchesCriteria = faceMatchesRequestCriteria(request, {
      asset: {
        zoneId: face.asset.zoneId,
        structureTypeId: face.asset.structureTypeId,
      },
    });

    return {
      id: face.id,
      code: face.code,
      assetCode: face.asset.code,
      title: face.catalogFace?.title || `${face.asset.structureType.name} · Cara ${face.code}`,
      zone: face.asset.zone.name,
      province: face.asset.zone.province.name,
      structureType: face.asset.structureType.name,
      imageUrl: face.resolvedImageUrl ?? null,
      latitude: face.asset.latitude ? Number(face.asset.latitude) : null,
      longitude: face.asset.longitude ? Number(face.asset.longitude) : null,
      matchesCriteria,
      isAssigned: assignedFaceIds.has(face.id),
    };
  });

  return normalized
    .filter((face) => includeOutsideCriteria || face.matchesCriteria)
    .slice(0, input.take);
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
          actingAgencyOrganizationId: request.actingAgencyOrganizationId,
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
