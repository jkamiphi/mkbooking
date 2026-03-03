import { Prisma, OperationalWorkOrderStatus } from "@prisma/client";
import { z } from "zod";
import { db } from "@/lib/db";
import { ensureChecklistForWorkOrder } from "@/lib/services/installer-checklist";
import { createOperationalWorkOrderEvent } from "@/lib/services/operations";

type PrismaClientLike = Prisma.TransactionClient | typeof db;

const DEFAULT_GEO_RADIUS_METERS = 250;
const CLOSED_STATUSES: OperationalWorkOrderStatus[] = ["COMPLETED", "CANCELLED"];
const OPEN_STATUSES: OperationalWorkOrderStatus[] = [
  "PENDING_ASSIGNMENT",
  "ASSIGNED",
  "IN_PROGRESS",
];

export const installerTaskListSchema = z.object({
  status: z.nativeEnum(OperationalWorkOrderStatus).optional(),
  includeCompletedToday: z.boolean().default(true),
  take: z.number().int().min(1).max(100).default(50),
});

export const installerTaskByIdSchema = z.object({
  workOrderId: z.string().min(1),
});

export const installerStartTaskSchema = z.object({
  workOrderId: z.string().min(1),
  notes: z.string().trim().max(2000).optional(),
});

export const installerCompleteTaskSchema = z.object({
  workOrderId: z.string().min(1),
  notes: z.string().trim().max(2000).optional(),
  geoOverrideReason: z.string().trim().max(2000).optional(),
});

export const installerToggleChecklistItemSchema = z.object({
  workOrderId: z.string().min(1),
  checklistItemId: z.string().min(1),
  isChecked: z.boolean(),
});

export const installerAddEvidenceSchema = z.object({
  workOrderId: z.string().min(1),
  fileUrl: z.string().url(),
  fileName: z.string().trim().min(1).max(255),
  fileType: z.string().trim().min(1).max(120),
  fileSize: z.number().int().min(0),
  capturedAt: z.coerce.date().optional(),
  capturedLatitude: z.number().min(-90).max(90).optional(),
  capturedLongitude: z.number().min(-180).max(180).optional(),
  notes: z.string().trim().max(2000).optional(),
  metadata: z.any().optional(),
});

interface InstallerActor {
  profileId: string;
}

function toNumberOrNull(value: Prisma.Decimal | number | null | undefined): number | null {
  if (value === null || value === undefined) {
    return null;
  }

  const result = Number(value);
  return Number.isFinite(result) ? result : null;
}

function normalizeOptionalText(value?: string | null): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function startOfToday(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

function hasExpectedCoordinates(workOrder: {
  face: {
    asset: {
      latitude: Prisma.Decimal | null;
      longitude: Prisma.Decimal | null;
    };
  };
}) {
  return (
    toNumberOrNull(workOrder.face.asset.latitude) !== null &&
    toNumberOrNull(workOrder.face.asset.longitude) !== null
  );
}

function computeHaversineMeters(input: {
  lat1: number;
  lon1: number;
  lat2: number;
  lon2: number;
}) {
  const earthRadiusMeters = 6371000;
  const toRadians = (value: number) => (value * Math.PI) / 180;

  const dLat = toRadians(input.lat2 - input.lat1);
  const dLon = toRadians(input.lon2 - input.lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(input.lat1)) *
      Math.cos(toRadians(input.lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return earthRadiusMeters * c;
}

async function resolveInstallerActor(userId: string): Promise<InstallerActor> {
  const profile = await db.userProfile.findUnique({
    where: { userId },
    select: {
      id: true,
      systemRole: true,
      isActive: true,
    },
  });

  if (!profile || profile.systemRole !== "INSTALLER" || !profile.isActive) {
    throw new Error("Acceso restringido a instaladores activos.");
  }

  return { profileId: profile.id };
}

async function findOwnedWorkOrderOrThrow(
  client: PrismaClientLike,
  workOrderId: string,
  installerProfileId: string
) {
  const workOrder = await client.orderOperationalWorkOrder.findUnique({
    where: { id: workOrderId },
    include: {
      face: {
        select: {
          code: true,
          asset: {
            select: {
              address: true,
              latitude: true,
              longitude: true,
              structureType: {
                select: { name: true },
              },
            },
          },
        },
      },
      zone: {
        select: {
          id: true,
          name: true,
          province: {
            select: { name: true },
          },
        },
      },
      order: {
        select: {
          id: true,
          code: true,
          clientName: true,
          clientEmail: true,
          organization: {
            select: {
              name: true,
            },
          },
        },
      },
    },
  });

  if (!workOrder || workOrder.assignedInstallerId !== installerProfileId) {
    throw new Error("No tienes acceso a esta OT operativa.");
  }

  return workOrder;
}

export async function listInstallerTasksMine(
  actorUserId: string,
  input: z.infer<typeof installerTaskListSchema>
) {
  const actor = await resolveInstallerActor(actorUserId);
  const todayStart = startOfToday();

  const where: Prisma.OrderOperationalWorkOrderWhereInput = {
    assignedInstallerId: actor.profileId,
  };

  if (input.status) {
    where.status = input.status;
  } else {
    const filters: Prisma.OrderOperationalWorkOrderWhereInput[] = [
      {
        status: {
          in: OPEN_STATUSES,
        },
      },
    ];

    if (input.includeCompletedToday) {
      filters.push({
        status: "COMPLETED",
        completedAt: {
          gte: todayStart,
        },
      });
    }

    where.OR = filters;
  }

  const [workOrders, groupedCounts, completedTodayCount] = await Promise.all([
    db.orderOperationalWorkOrder.findMany({
      where,
      take: input.take,
      orderBy: [{ updatedAt: "desc" }],
      include: {
        order: {
          select: {
            id: true,
            code: true,
            clientName: true,
            clientEmail: true,
            organization: {
              select: { name: true },
            },
          },
        },
        face: {
          select: {
            id: true,
            code: true,
            asset: {
              select: {
                address: true,
              },
            },
          },
        },
        zone: {
          select: {
            id: true,
            name: true,
            province: {
              select: { name: true },
            },
          },
        },
      },
    }),
    db.orderOperationalWorkOrder.groupBy({
      by: ["status"],
      where: {
        assignedInstallerId: actor.profileId,
        status: {
          in: OPEN_STATUSES,
        },
      },
      _count: {
        _all: true,
      },
    }),
    db.orderOperationalWorkOrder.count({
      where: {
        assignedInstallerId: actor.profileId,
        status: "COMPLETED",
        completedAt: {
          gte: todayStart,
        },
      },
    }),
  ]);

  const countByStatus = new Map(
    groupedCounts.map((row) => [row.status, row._count._all])
  );

  return {
    tasks: workOrders.map((workOrder) => ({
      id: workOrder.id,
      orderId: workOrder.orderId,
      orderCode: workOrder.order.code,
      status: workOrder.status,
      faceCode: workOrder.face.code,
      assetAddress: workOrder.face.asset.address,
      zoneName: workOrder.zone.name,
      provinceName: workOrder.zone.province.name,
      organizationName: workOrder.order.organization?.name ?? null,
      clientName: workOrder.order.clientName ?? null,
      clientEmail: workOrder.order.clientEmail ?? null,
      assignedAt: workOrder.assignedAt,
      startedAt: workOrder.startedAt,
      completedAt: workOrder.completedAt,
      updatedAt: workOrder.updatedAt,
    })),
    stats: {
      pending:
        (countByStatus.get("ASSIGNED") ?? 0) +
        (countByStatus.get("PENDING_ASSIGNMENT") ?? 0),
      inProgress: countByStatus.get("IN_PROGRESS") ?? 0,
      completedToday: completedTodayCount,
      openTotal:
        (countByStatus.get("ASSIGNED") ?? 0) +
        (countByStatus.get("PENDING_ASSIGNMENT") ?? 0) +
        (countByStatus.get("IN_PROGRESS") ?? 0),
    },
  };
}

export async function getInstallerTaskById(actorUserId: string, workOrderId: string) {
  const actor = await resolveInstallerActor(actorUserId);

  await db.$transaction(async (tx) => {
    await findOwnedWorkOrderOrThrow(tx, workOrderId, actor.profileId);
    await ensureChecklistForWorkOrder(tx, workOrderId);
  });

  const workOrder = await db.orderOperationalWorkOrder.findUnique({
    where: { id: workOrderId },
    include: {
      order: {
        select: {
          id: true,
          code: true,
          clientName: true,
          clientEmail: true,
          organization: {
            select: {
              name: true,
            },
          },
        },
      },
      face: {
        select: {
          id: true,
          code: true,
          asset: {
            select: {
              address: true,
              latitude: true,
              longitude: true,
              structureType: {
                select: {
                  name: true,
                },
              },
            },
          },
        },
      },
      zone: {
        select: {
          id: true,
          name: true,
          province: {
            select: {
              name: true,
            },
          },
        },
      },
      checklistItems: {
        orderBy: [{ createdAt: "asc" }],
      },
      evidences: {
        orderBy: [{ receivedAt: "desc" }],
      },
      events: {
        orderBy: [{ createdAt: "desc" }],
        take: 20,
        include: {
          actor: {
            include: {
              user: {
                select: {
                  name: true,
                  email: true,
                },
              },
            },
          },
        },
      },
    },
  });

  if (!workOrder || workOrder.assignedInstallerId !== actor.profileId) {
    throw new Error("No tienes acceso a esta OT operativa.");
  }

  const expectedLatitude = toNumberOrNull(workOrder.face.asset.latitude);
  const expectedLongitude = toNumberOrNull(workOrder.face.asset.longitude);
  const expectedCoordinatesAvailable =
    expectedLatitude !== null && expectedLongitude !== null;

  const requiredChecklistItems = workOrder.checklistItems.filter((item) => item.isRequired);
  const requiredChecklistCompleted = requiredChecklistItems.filter((item) => item.isChecked).length;
  const hasEvidenceWithinRadius = workOrder.evidences.some(
    (evidence) => evidence.withinExpectedRadius === true
  );

  return {
    id: workOrder.id,
    orderId: workOrder.orderId,
    orderCode: workOrder.order.code,
    status: workOrder.status,
    face: {
      id: workOrder.faceId,
      code: workOrder.face.code,
      structureTypeName: workOrder.face.asset.structureType.name,
      address: workOrder.face.asset.address,
      expectedLatitude,
      expectedLongitude,
    },
    zone: {
      id: workOrder.zone.id,
      name: workOrder.zone.name,
      provinceName: workOrder.zone.province.name,
    },
    organizationName: workOrder.order.organization?.name ?? null,
    clientName: workOrder.order.clientName ?? null,
    clientEmail: workOrder.order.clientEmail ?? null,
    assignedAt: workOrder.assignedAt,
    startedAt: workOrder.startedAt,
    completedAt: workOrder.completedAt,
    closedAt: workOrder.closedAt,
    updatedAt: workOrder.updatedAt,
    checklistItems: workOrder.checklistItems,
    evidences: workOrder.evidences.map((evidence) => ({
      ...evidence,
      capturedLatitude: toNumberOrNull(evidence.capturedLatitude),
      capturedLongitude: toNumberOrNull(evidence.capturedLongitude),
      expectedLatitude: toNumberOrNull(evidence.expectedLatitude),
      expectedLongitude: toNumberOrNull(evidence.expectedLongitude),
      distanceMeters: toNumberOrNull(evidence.distanceMeters),
    })),
    events: workOrder.events,
    validation: {
      requiredChecklistTotal: requiredChecklistItems.length,
      requiredChecklistCompleted,
      evidenceCount: workOrder.evidences.length,
      hasExpectedCoordinates: expectedCoordinatesAvailable,
      hasEvidenceWithinRadius,
      requiresGeoOverride: expectedCoordinatesAvailable && !hasEvidenceWithinRadius,
      canStart: workOrder.status === "ASSIGNED",
      canComplete:
        workOrder.status === "IN_PROGRESS" &&
        requiredChecklistCompleted === requiredChecklistItems.length &&
        workOrder.evidences.length > 0,
    },
  };
}

export async function startInstallerTask(
  actorUserId: string,
  input: z.infer<typeof installerStartTaskSchema>
) {
  const actor = await resolveInstallerActor(actorUserId);

  return db.$transaction(async (tx) => {
    const workOrder = await tx.orderOperationalWorkOrder.findUnique({
      where: { id: input.workOrderId },
      select: {
        id: true,
        status: true,
        assignedInstallerId: true,
      },
    });

    if (!workOrder || workOrder.assignedInstallerId !== actor.profileId) {
      throw new Error("No tienes acceso a esta OT operativa.");
    }

    if (CLOSED_STATUSES.includes(workOrder.status)) {
      throw new Error("No puedes iniciar una OT cerrada.");
    }

    if (workOrder.status !== "ASSIGNED") {
      throw new Error("La OT debe estar asignada para iniciar trabajo.");
    }

    const now = new Date();
    const updated = await tx.orderOperationalWorkOrder.update({
      where: { id: workOrder.id },
      data: {
        status: "IN_PROGRESS",
        startedAt: now,
      },
    });

    await createOperationalWorkOrderEvent(tx, {
      workOrderId: workOrder.id,
      eventType: "STATUS_CHANGED",
      fromStatus: workOrder.status,
      toStatus: "IN_PROGRESS",
      fromInstallerId: actor.profileId,
      toInstallerId: actor.profileId,
      actorId: actor.profileId,
      notes: normalizeOptionalText(input.notes),
      metadata: {
        source: "installer-app",
      },
    });

    return updated;
  });
}

export async function toggleInstallerChecklistItem(
  actorUserId: string,
  input: z.infer<typeof installerToggleChecklistItemSchema>
) {
  const actor = await resolveInstallerActor(actorUserId);

  return db.$transaction(async (tx) => {
    const workOrder = await findOwnedWorkOrderOrThrow(
      tx,
      input.workOrderId,
      actor.profileId
    );

    if (CLOSED_STATUSES.includes(workOrder.status)) {
      throw new Error("No puedes modificar checklist en una OT cerrada.");
    }

    await ensureChecklistForWorkOrder(tx, workOrder.id);

    const checklistItem = await tx.orderOperationalChecklistItem.findUnique({
      where: { id: input.checklistItemId },
      select: {
        id: true,
        workOrderId: true,
      },
    });

    if (!checklistItem || checklistItem.workOrderId !== workOrder.id) {
      throw new Error("Ítem de checklist no encontrado para esta OT.");
    }

    return tx.orderOperationalChecklistItem.update({
      where: { id: checklistItem.id },
      data: {
        isChecked: input.isChecked,
        checkedAt: input.isChecked ? new Date() : null,
        checkedById: input.isChecked ? actor.profileId : null,
      },
    });
  });
}

export async function addInstallerTaskEvidence(
  actorUserId: string,
  input: z.infer<typeof installerAddEvidenceSchema>
) {
  const actor = await resolveInstallerActor(actorUserId);

  if (!input.fileType.toLowerCase().startsWith("image/")) {
    throw new Error("Solo se permiten evidencias fotográficas (image/*).");
  }

  return db.$transaction(async (tx) => {
    const workOrder = await findOwnedWorkOrderOrThrow(
      tx,
      input.workOrderId,
      actor.profileId
    );

    if (CLOSED_STATUSES.includes(workOrder.status)) {
      throw new Error("No puedes cargar evidencias en una OT cerrada.");
    }

    const expectedLatitude = toNumberOrNull(workOrder.face.asset.latitude);
    const expectedLongitude = toNumberOrNull(workOrder.face.asset.longitude);

    const hasExpectedCoordinates =
      expectedLatitude !== null && expectedLongitude !== null;
    const hasCapturedCoordinates =
      input.capturedLatitude !== undefined && input.capturedLongitude !== undefined;
    const metadataPayload =
      input.metadata && typeof input.metadata === "object" && !Array.isArray(input.metadata)
        ? input.metadata
        : null;

    let distanceMeters: number | null = null;
    let withinExpectedRadius: boolean | null = null;

    if (
      hasExpectedCoordinates &&
      input.capturedLatitude !== undefined &&
      input.capturedLongitude !== undefined
    ) {
      distanceMeters = computeHaversineMeters({
        lat1: expectedLatitude,
        lon1: expectedLongitude,
        lat2: input.capturedLatitude,
        lon2: input.capturedLongitude,
      });
      withinExpectedRadius = distanceMeters <= DEFAULT_GEO_RADIUS_METERS;
    }

    return tx.orderOperationalWorkOrderEvidence.create({
      data: {
        workOrderId: workOrder.id,
        fileUrl: input.fileUrl,
        fileName: input.fileName,
        fileType: input.fileType,
        fileSize: input.fileSize,
        capturedAt: input.capturedAt,
        capturedLatitude: input.capturedLatitude,
        capturedLongitude: input.capturedLongitude,
        expectedLatitude,
        expectedLongitude,
        distanceMeters,
        withinExpectedRadius,
        radiusMeters: DEFAULT_GEO_RADIUS_METERS,
        notes: normalizeOptionalText(input.notes),
        metadata: {
          source: "installer-app",
          hasExpectedCoordinates,
          hasCapturedCoordinates,
          clientMetadata: metadataPayload,
        },
        uploadedById: actor.profileId,
      },
    });
  });
}

export async function completeInstallerTask(
  actorUserId: string,
  input: z.infer<typeof installerCompleteTaskSchema>
) {
  const actor = await resolveInstallerActor(actorUserId);

  return db.$transaction(async (tx) => {
    const workOrder = await findOwnedWorkOrderOrThrow(
      tx,
      input.workOrderId,
      actor.profileId
    );

    if (CLOSED_STATUSES.includes(workOrder.status) || workOrder.closedAt) {
      throw new Error("No puedes completar una OT cerrada.");
    }

    if (workOrder.status !== "IN_PROGRESS") {
      throw new Error("La OT debe estar en progreso antes de completarse.");
    }

    await ensureChecklistForWorkOrder(tx, workOrder.id);

    const [requiredChecklistTotal, requiredChecklistCompleted, evidenceCount, evidenceWithinRadius] =
      await Promise.all([
        tx.orderOperationalChecklistItem.count({
          where: {
            workOrderId: workOrder.id,
            isRequired: true,
          },
        }),
        tx.orderOperationalChecklistItem.count({
          where: {
            workOrderId: workOrder.id,
            isRequired: true,
            isChecked: true,
          },
        }),
        tx.orderOperationalWorkOrderEvidence.count({
          where: {
            workOrderId: workOrder.id,
          },
        }),
        tx.orderOperationalWorkOrderEvidence.count({
          where: {
            workOrderId: workOrder.id,
            withinExpectedRadius: true,
          },
        }),
      ]);

    if (requiredChecklistCompleted < requiredChecklistTotal) {
      throw new Error("Debes completar todo el checklist obligatorio antes de cerrar la OT.");
    }

    if (evidenceCount < 1) {
      throw new Error("Debes subir al menos 1 evidencia fotográfica para completar la OT.");
    }

    const expectedCoordinatesAvailable = hasExpectedCoordinates(workOrder);
    const geoOverrideReason = normalizeOptionalText(input.geoOverrideReason);
    const requiresGeoOverride = expectedCoordinatesAvailable && evidenceWithinRadius < 1;

    if (requiresGeoOverride && !geoOverrideReason) {
      throw new Error(
        "Ninguna evidencia está dentro del radio esperado. Debes indicar motivo de override."
      );
    }

    const now = new Date();
    const updated = await tx.orderOperationalWorkOrder.update({
      where: { id: workOrder.id },
      data: {
        status: "COMPLETED",
        completedAt: now,
        closedAt: now,
      },
    });

    await createOperationalWorkOrderEvent(tx, {
      workOrderId: workOrder.id,
      eventType: "STATUS_CHANGED",
      fromStatus: workOrder.status,
      toStatus: "COMPLETED",
      fromInstallerId: actor.profileId,
      toInstallerId: actor.profileId,
      actorId: actor.profileId,
      notes: normalizeOptionalText(input.notes),
      metadata: {
        source: "installer-app",
        requiredChecklistTotal,
        requiredChecklistCompleted,
        evidenceCount,
        evidenceWithinRadius,
        expectedCoordinatesAvailable,
        geoOverrideApplied: requiresGeoOverride,
        geoOverrideReason,
      },
    });

    if (requiresGeoOverride && geoOverrideReason) {
      await tx.orderOperationalWorkOrderEvidence.updateMany({
        where: {
          workOrderId: workOrder.id,
        },
        data: {
          geoOverrideReason,
        },
      });
    }

    return updated;
  });
}
