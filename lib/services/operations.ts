import { db } from "@/lib/db";
import { Prisma, OperationalWorkOrderStatus } from "@prisma/client";
import { z } from "zod";

type PrismaClientLike = Prisma.TransactionClient | typeof db;

const ACTIVE_WORK_ORDER_STATUSES: OperationalWorkOrderStatus[] = ["ASSIGNED", "IN_PROGRESS"];
const OPEN_WORK_ORDER_STATUSES: OperationalWorkOrderStatus[] = [
  "PENDING_ASSIGNMENT",
  "ASSIGNED",
  "IN_PROGRESS",
];

export const operationalWorkOrderListSchema = z.object({
  status: z.nativeEnum(OperationalWorkOrderStatus).optional(),
  zoneId: z.string().min(1).optional(),
  installerId: z.string().min(1).optional(),
  unassignedOnly: z.boolean().optional(),
  skip: z.number().int().min(0).default(0),
  take: z.number().int().min(1).max(100).default(50),
});

export const operationalWorkOrderByOrderSchema = z.object({
  orderId: z.string().min(1),
});

export const updateOperationalWorkOrderStatusSchema = z.object({
  workOrderId: z.string().min(1),
  status: z.nativeEnum(OperationalWorkOrderStatus),
  notes: z.string().trim().max(2000).optional(),
});

export const reassignOperationalWorkOrderSchema = z.object({
  workOrderId: z.string().min(1),
  installerId: z.string().min(1),
  notes: z.string().trim().max(2000).optional(),
  allowCapacityOverride: z.boolean().optional().default(true),
});

export const retryOperationalWorkOrderAutoAssignSchema = z.object({
  workOrderId: z.string().min(1),
});

export const upsertInstallerConfigSchema = z.object({
  installerId: z.string().min(1),
  isEnabled: z.boolean().optional(),
  maxActiveWorkOrders: z.number().int().min(1).max(100).optional(),
  notes: z.string().trim().max(2000).optional().nullable(),
});

export const updateInstallerCoverageSchema = z.object({
  installerId: z.string().min(1),
  zoneIds: z.array(z.string().min(1)).max(500),
});

interface OperationsActor {
  profileId: string;
}

interface EligibleInstaller {
  installerId: string;
  currentLoad: number;
  maxActiveWorkOrders: number;
}

function normalizeOptionalNotes(notes?: string | null) {
  const trimmed = notes?.trim();
  return trimmed && trimmed.length > 0 ? trimmed : null;
}

async function resolveOperationsActor(userId: string): Promise<OperationsActor> {
  const profile = await db.userProfile.findUnique({
    where: { userId },
    select: { id: true },
  });

  if (!profile) {
    throw new Error("Perfil de usuario no encontrado.");
  }

  return { profileId: profile.id };
}

async function assertInstallerProfile(
  client: PrismaClientLike,
  installerId: string
) {
  const profile = await client.userProfile.findUnique({
    where: { id: installerId },
    select: {
      id: true,
      systemRole: true,
      isActive: true,
    },
  });

  if (!profile || profile.systemRole !== "INSTALLER") {
    throw new Error("El usuario seleccionado no es un instalador válido.");
  }

  return profile;
}

export async function createOperationalWorkOrderEvent(
  client: PrismaClientLike,
  input: {
    workOrderId: string;
    eventType:
      | "WORK_ORDER_CREATED"
      | "AUTO_ASSIGNED"
      | "AUTO_ASSIGNMENT_SKIPPED"
      | "MANUAL_REASSIGNED"
      | "STATUS_CHANGED"
      | "CANCELLED_BY_PRINT_REOPEN"
      | "AUTO_ASSIGNMENT_RETRIED";
    fromStatus?: OperationalWorkOrderStatus | null;
    toStatus?: OperationalWorkOrderStatus | null;
    fromInstallerId?: string | null;
    toInstallerId?: string | null;
    notes?: string | null;
    metadata?: Prisma.InputJsonValue | null;
    actorId?: string | null;
  }
) {
  return client.orderOperationalWorkOrderEvent.create({
    data: {
      workOrderId: input.workOrderId,
      eventType: input.eventType,
      fromStatus: input.fromStatus ?? null,
      toStatus: input.toStatus ?? null,
      fromInstallerId: input.fromInstallerId ?? null,
      toInstallerId: input.toInstallerId ?? null,
      notes: normalizeOptionalNotes(input.notes) ?? null,
      metadata: input.metadata ?? undefined,
      actorId: input.actorId ?? null,
    },
  });
}

async function countInstallerActiveLoads(
  client: PrismaClientLike,
  installerIds: string[]
) {
  if (installerIds.length === 0) {
    return new Map<string, number>();
  }

  const grouped = await client.orderOperationalWorkOrder.groupBy({
    by: ["assignedInstallerId"],
    where: {
      assignedInstallerId: {
        in: installerIds,
      },
      status: {
        in: ACTIVE_WORK_ORDER_STATUSES,
      },
    },
    _count: {
      _all: true,
    },
  });

  const result = new Map<string, number>();
  for (const row of grouped) {
    if (row.assignedInstallerId) {
      result.set(row.assignedInstallerId, row._count._all);
    }
  }

  return result;
}

async function resolveEligibleInstallerForZone(
  client: PrismaClientLike,
  zoneId: string
): Promise<EligibleInstaller | null> {
  const installers = await client.installerConfig.findMany({
    where: {
      isEnabled: true,
      userProfile: {
        systemRole: "INSTALLER",
        isActive: true,
        installerCoverageZones: {
          some: {
            zoneId,
          },
        },
      },
    },
    select: {
      userProfileId: true,
      maxActiveWorkOrders: true,
    },
    orderBy: {
      userProfileId: "asc",
    },
  });

  if (installers.length === 0) {
    return null;
  }

  const loadMap = await countInstallerActiveLoads(
    client,
    installers.map((installer) => installer.userProfileId)
  );

  let selected: EligibleInstaller | null = null;
  for (const installer of installers) {
    const currentLoad = loadMap.get(installer.userProfileId) ?? 0;
    if (currentLoad >= installer.maxActiveWorkOrders) {
      continue;
    }

    if (
      !selected ||
      currentLoad < selected.currentLoad ||
      (currentLoad === selected.currentLoad &&
        installer.userProfileId < selected.installerId)
    ) {
      selected = {
        installerId: installer.userProfileId,
        currentLoad,
        maxActiveWorkOrders: installer.maxActiveWorkOrders,
      };
    }
  }

  return selected;
}

async function assignOperationalWorkOrderAutomatically(
  client: PrismaClientLike,
  input: {
    workOrderId: string;
    actorId?: string | null;
    source?: string;
    mode: "create" | "retry";
  }
) {
  const task = await client.orderOperationalWorkOrder.findUnique({
    where: { id: input.workOrderId },
    select: {
      id: true,
      status: true,
      zoneId: true,
      assignedInstallerId: true,
      closedAt: true,
    },
  });

  if (!task) {
    throw new Error("OT operativa no encontrada.");
  }

  if (task.closedAt || task.status === "COMPLETED" || task.status === "CANCELLED") {
    throw new Error("No se puede autoasignar una OT cerrada.");
  }

  if (input.mode === "retry" && task.assignedInstallerId) {
    throw new Error("La OT ya tiene instalador asignado.");
  }

  const eligible = await resolveEligibleInstallerForZone(client, task.zoneId);
  const now = new Date();

  if (!eligible) {
    if (task.assignedInstallerId || task.status !== "PENDING_ASSIGNMENT") {
      await client.orderOperationalWorkOrder.update({
        where: { id: task.id },
        data: {
          status: "PENDING_ASSIGNMENT",
          assignedInstallerId: null,
          assignedAt: null,
          startedAt: null,
        },
      });
    }

    if (input.mode === "retry") {
      await createOperationalWorkOrderEvent(client, {
        workOrderId: task.id,
        eventType: "AUTO_ASSIGNMENT_RETRIED",
        fromStatus: task.status,
        toStatus: "PENDING_ASSIGNMENT",
        fromInstallerId: task.assignedInstallerId ?? null,
        actorId: input.actorId ?? null,
        metadata: {
          assigned: false,
          source: input.source ?? "operations",
          reason: "NO_ELIGIBLE_INSTALLER",
        },
      });
    } else {
      await createOperationalWorkOrderEvent(client, {
        workOrderId: task.id,
        eventType: "AUTO_ASSIGNMENT_SKIPPED",
        fromStatus: task.status,
        toStatus: "PENDING_ASSIGNMENT",
        fromInstallerId: task.assignedInstallerId ?? null,
        actorId: input.actorId ?? null,
        metadata: {
          source: input.source ?? "operations",
          reason: "NO_ELIGIBLE_INSTALLER",
        },
      });
    }

    return client.orderOperationalWorkOrder.findUniqueOrThrow({
      where: { id: task.id },
    });
  }

  const updated = await client.orderOperationalWorkOrder.update({
    where: { id: task.id },
    data: {
      status: "ASSIGNED",
      assignedInstallerId: eligible.installerId,
      assignedAt: now,
      startedAt: null,
      completedAt: null,
      closedAt: null,
    },
  });

  if (input.mode === "retry") {
    await createOperationalWorkOrderEvent(client, {
      workOrderId: task.id,
      eventType: "AUTO_ASSIGNMENT_RETRIED",
      fromStatus: task.status,
      toStatus: "ASSIGNED",
      fromInstallerId: task.assignedInstallerId ?? null,
      toInstallerId: eligible.installerId,
      actorId: input.actorId ?? null,
      metadata: {
        assigned: true,
        source: input.source ?? "operations",
        selectedInstallerId: eligible.installerId,
        selectedInstallerLoad: eligible.currentLoad,
        selectedInstallerCapacity: eligible.maxActiveWorkOrders,
      },
    });
  } else {
    await createOperationalWorkOrderEvent(client, {
      workOrderId: task.id,
      eventType: "AUTO_ASSIGNED",
      fromStatus: task.status,
      toStatus: "ASSIGNED",
      fromInstallerId: task.assignedInstallerId ?? null,
      toInstallerId: eligible.installerId,
      actorId: input.actorId ?? null,
      metadata: {
        source: input.source ?? "operations",
        selectedInstallerId: eligible.installerId,
        selectedInstallerLoad: eligible.currentLoad,
        selectedInstallerCapacity: eligible.maxActiveWorkOrders,
      },
    });
  }

  return updated;
}

export async function createOperationalWorkOrdersForPrintCompletion(
  client: PrismaClientLike,
  input: {
    orderId: string;
    printTaskId: string;
    printTaskCompletedAt: Date;
    actorId?: string | null;
    source?: string;
  }
) {
  const lineItems = await client.orderLineItem.findMany({
    where: { orderId: input.orderId },
    select: {
      id: true,
      faceId: true,
      face: {
        select: {
          asset: {
            select: {
              zoneId: true,
            },
          },
        },
      },
    },
  });

  let createdCount = 0;
  let autoAssignedCount = 0;
  let pendingCount = 0;

  for (const lineItem of lineItems) {
    const zoneId = lineItem.face.asset.zoneId;

    const existing = await client.orderOperationalWorkOrder.findFirst({
      where: {
        printTaskId: input.printTaskId,
        lineItemId: lineItem.id,
        printTaskCompletedAt: input.printTaskCompletedAt,
      },
      select: { id: true },
    });

    if (existing) {
      continue;
    }

    const created = await client.orderOperationalWorkOrder.create({
      data: {
        orderId: input.orderId,
        lineItemId: lineItem.id,
        faceId: lineItem.faceId,
        zoneId,
        printTaskId: input.printTaskId,
        printTaskCompletedAt: input.printTaskCompletedAt,
        status: "PENDING_ASSIGNMENT",
        createdById: input.actorId ?? null,
      },
    });
    createdCount += 1;

    await createOperationalWorkOrderEvent(client, {
      workOrderId: created.id,
      eventType: "WORK_ORDER_CREATED",
      toStatus: "PENDING_ASSIGNMENT",
      actorId: input.actorId ?? null,
      notes: "OT operativa creada automáticamente al cerrar impresión.",
      metadata: {
        source: input.source ?? "print-confirmation",
        printTaskId: input.printTaskId,
        lineItemId: lineItem.id,
      },
    });

    const autoAssigned = await assignOperationalWorkOrderAutomatically(client, {
      workOrderId: created.id,
      actorId: input.actorId ?? null,
      source: input.source ?? "print-confirmation",
      mode: "create",
    });

    if (autoAssigned.status === "ASSIGNED") {
      autoAssignedCount += 1;
    } else {
      pendingCount += 1;
    }
  }

  return {
    createdCount,
    autoAssignedCount,
    pendingCount,
  };
}

export async function cancelOperationalWorkOrdersByPrintReopen(
  client: PrismaClientLike,
  input: {
    orderId: string;
    printTaskId: string;
    actorId?: string | null;
    reason?: string | null;
    source?: string;
  }
) {
  const openWorkOrders = await client.orderOperationalWorkOrder.findMany({
    where: {
      orderId: input.orderId,
      printTaskId: input.printTaskId,
      status: {
        in: OPEN_WORK_ORDER_STATUSES,
      },
      closedAt: null,
    },
    select: {
      id: true,
      status: true,
      assignedInstallerId: true,
    },
  });

  if (openWorkOrders.length === 0) {
    return { cancelledCount: 0 };
  }

  const now = new Date();
  for (const workOrder of openWorkOrders) {
    await client.orderOperationalWorkOrder.update({
      where: { id: workOrder.id },
      data: {
        status: "CANCELLED",
        closedAt: now,
      },
    });

    await createOperationalWorkOrderEvent(client, {
      workOrderId: workOrder.id,
      eventType: "CANCELLED_BY_PRINT_REOPEN",
      fromStatus: workOrder.status,
      toStatus: "CANCELLED",
      fromInstallerId: workOrder.assignedInstallerId ?? null,
      actorId: input.actorId ?? null,
      notes:
        normalizeOptionalNotes(input.reason) ??
        "OT operativa cancelada por reapertura del flujo de impresión.",
      metadata: {
        source: input.source ?? "design-reopen",
        reason: "PRINT_REOPENED",
      },
    });
  }

  return { cancelledCount: openWorkOrders.length };
}

export async function listOperationalWorkOrders(
  input: z.infer<typeof operationalWorkOrderListSchema>
) {
  const where: Prisma.OrderOperationalWorkOrderWhereInput = {};
  if (input.status) {
    where.status = input.status;
  } else {
    where.closedAt = null;
  }

  if (input.zoneId) {
    where.zoneId = input.zoneId;
  }

  if (input.installerId) {
    where.assignedInstallerId = input.installerId;
  }

  if (input.unassignedOnly) {
    where.assignedInstallerId = null;
  }

  const [workOrders, total] = await Promise.all([
    db.orderOperationalWorkOrder.findMany({
      where,
      skip: input.skip,
      take: input.take,
      orderBy: [{ createdAt: "asc" }],
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
        zone: {
          select: {
            id: true,
            name: true,
            province: {
              select: { name: true },
            },
          },
        },
        face: {
          select: {
            id: true,
            code: true,
          },
        },
        lineItem: {
          select: {
            id: true,
          },
        },
        assignedInstaller: {
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
    }),
    db.orderOperationalWorkOrder.count({ where }),
  ]);

  return {
    workOrders,
    total,
    hasMore: input.skip + workOrders.length < total,
  };
}

export async function getOperationalWorkOrdersByOrder(orderId: string) {
  return db.orderOperationalWorkOrder.findMany({
    where: { orderId },
    orderBy: [{ createdAt: "asc" }],
    include: {
      zone: {
        select: {
          id: true,
          name: true,
          province: {
            select: { name: true },
          },
        },
      },
      face: {
        select: {
          id: true,
          code: true,
        },
      },
      lineItem: {
        select: {
          id: true,
        },
      },
      assignedInstaller: {
        include: {
          user: {
            select: {
              name: true,
              email: true,
            },
          },
        },
      },
      events: {
        orderBy: { createdAt: "desc" },
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
          fromInstaller: {
            include: {
              user: {
                select: {
                  name: true,
                  email: true,
                },
              },
            },
          },
          toInstaller: {
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
}

export async function updateOperationalWorkOrderStatus(
  input: z.infer<typeof updateOperationalWorkOrderStatusSchema>,
  actorUserId: string
) {
  const actor = await resolveOperationsActor(actorUserId);

  return db.$transaction(async (tx) => {
    const workOrder = await tx.orderOperationalWorkOrder.findUnique({
      where: { id: input.workOrderId },
      select: {
        id: true,
        status: true,
        assignedInstallerId: true,
        assignedAt: true,
        startedAt: true,
        closedAt: true,
      },
    });

    if (!workOrder) {
      throw new Error("OT operativa no encontrada.");
    }

    if (workOrder.status === input.status) {
      return tx.orderOperationalWorkOrder.findUniqueOrThrow({
        where: { id: input.workOrderId },
      });
    }

    if (workOrder.closedAt && workOrder.status !== "CANCELLED" && workOrder.status !== "COMPLETED") {
      throw new Error("La OT está cerrada y no puede cambiar de estado.");
    }

    if ((input.status === "ASSIGNED" || input.status === "IN_PROGRESS") && !workOrder.assignedInstallerId) {
      throw new Error("No puedes avanzar estado sin instalador asignado.");
    }

    const now = new Date();
    const data: Prisma.OrderOperationalWorkOrderUpdateInput = {
      status: input.status,
    };

    if (input.status === "PENDING_ASSIGNMENT") {
      data.assignedInstaller = { disconnect: true };
      data.assignedAt = null;
      data.startedAt = null;
      data.completedAt = null;
      data.closedAt = null;
    } else if (input.status === "ASSIGNED") {
      data.assignedAt = workOrder.assignedAt ?? now;
      data.startedAt = null;
      data.completedAt = null;
      data.closedAt = null;
    } else if (input.status === "IN_PROGRESS") {
      data.startedAt = workOrder.startedAt ?? now;
      data.completedAt = null;
      data.closedAt = null;
    } else if (input.status === "COMPLETED") {
      data.completedAt = now;
      data.closedAt = now;
    } else if (input.status === "CANCELLED") {
      data.closedAt = now;
    }

    const updated = await tx.orderOperationalWorkOrder.update({
      where: { id: input.workOrderId },
      data,
    });

    await createOperationalWorkOrderEvent(tx, {
      workOrderId: input.workOrderId,
      eventType: "STATUS_CHANGED",
      fromStatus: workOrder.status,
      toStatus: updated.status,
      fromInstallerId: workOrder.assignedInstallerId ?? null,
      toInstallerId: updated.assignedInstallerId ?? null,
      actorId: actor.profileId,
      notes: input.notes?.trim() || null,
    });

    return updated;
  });
}

export async function reassignOperationalWorkOrderManual(
  input: z.infer<typeof reassignOperationalWorkOrderSchema>,
  actorUserId: string
) {
  const actor = await resolveOperationsActor(actorUserId);

  return db.$transaction(async (tx) => {
    const workOrder = await tx.orderOperationalWorkOrder.findUnique({
      where: { id: input.workOrderId },
      select: {
        id: true,
        status: true,
        zoneId: true,
        assignedInstallerId: true,
        closedAt: true,
      },
    });

    if (!workOrder) {
      throw new Error("OT operativa no encontrada.");
    }

    if (workOrder.status === "COMPLETED" || workOrder.status === "CANCELLED" || workOrder.closedAt) {
      throw new Error("No puedes reasignar una OT cerrada.");
    }

    if (workOrder.assignedInstallerId === input.installerId) {
      throw new Error("La OT ya está asignada a este instalador.");
    }

    await assertInstallerProfile(tx, input.installerId);

    const targetConfig = await tx.installerConfig.findUnique({
      where: { userProfileId: input.installerId },
      select: {
        isEnabled: true,
        maxActiveWorkOrders: true,
        userProfileId: true,
      },
    });

    if (!targetConfig || !targetConfig.isEnabled) {
      throw new Error("El instalador destino no está habilitado.");
    }

    const targetCoverage = await tx.installerCoverageZone.findFirst({
      where: {
        installerId: input.installerId,
        zoneId: workOrder.zoneId,
      },
      select: { id: true },
    });

    if (!targetCoverage) {
      throw new Error("El instalador destino no tiene cobertura en la zona de esta OT.");
    }

    const activeLoad = await tx.orderOperationalWorkOrder.count({
      where: {
        id: { not: workOrder.id },
        assignedInstallerId: input.installerId,
        status: {
          in: ACTIVE_WORK_ORDER_STATUSES,
        },
      },
    });

    const capacityExceeded = activeLoad >= targetConfig.maxActiveWorkOrders;
    if (capacityExceeded && !input.allowCapacityOverride) {
      throw new Error("El instalador destino alcanzó su capacidad máxima.");
    }

    const now = new Date();
    const updated = await tx.orderOperationalWorkOrder.update({
      where: { id: input.workOrderId },
      data: {
        status: "ASSIGNED",
        assignedInstallerId: input.installerId,
        assignedAt: now,
        startedAt: null,
        completedAt: null,
        closedAt: null,
      },
    });

    await createOperationalWorkOrderEvent(tx, {
      workOrderId: input.workOrderId,
      eventType: "MANUAL_REASSIGNED",
      fromStatus: workOrder.status,
      toStatus: "ASSIGNED",
      fromInstallerId: workOrder.assignedInstallerId ?? null,
      toInstallerId: input.installerId,
      notes: input.notes?.trim() || null,
      actorId: actor.profileId,
      metadata: {
        capacityExceeded,
        targetCurrentLoad: activeLoad,
        targetMaxCapacity: targetConfig.maxActiveWorkOrders,
      },
    });

    return {
      workOrder: updated,
      capacityExceeded,
    };
  });
}

export async function retryOperationalWorkOrderAutoAssign(
  input: z.infer<typeof retryOperationalWorkOrderAutoAssignSchema>,
  actorUserId: string
) {
  const actor = await resolveOperationsActor(actorUserId);

  return db.$transaction(async (tx) => {
    const workOrder = await tx.orderOperationalWorkOrder.findUnique({
      where: { id: input.workOrderId },
      select: {
        id: true,
        status: true,
        assignedInstallerId: true,
        closedAt: true,
      },
    });

    if (!workOrder) {
      throw new Error("OT operativa no encontrada.");
    }

    if (workOrder.status === "COMPLETED" || workOrder.status === "CANCELLED" || workOrder.closedAt) {
      throw new Error("No puedes reintentar autoasignación en una OT cerrada.");
    }

    if (workOrder.assignedInstallerId) {
      throw new Error("La OT ya tiene un instalador asignado.");
    }

    return assignOperationalWorkOrderAutomatically(tx, {
      workOrderId: workOrder.id,
      actorId: actor.profileId,
      source: "manual-retry",
      mode: "retry",
    });
  });
}

export async function listInstallersWithControl() {
  const installers = await db.userProfile.findMany({
    where: {
      systemRole: "INSTALLER",
    },
    orderBy: {
      user: {
        email: "asc",
      },
    },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      installerConfig: true,
      installerCoverageZones: {
        include: {
          zone: {
            include: {
              province: true,
            },
          },
        },
        orderBy: {
          zone: {
            name: "asc",
          },
        },
      },
    },
  });

  const loadMap = await countInstallerActiveLoads(
    db,
    installers.map((installer) => installer.id)
  );

  return installers.map((installer) => ({
    ...installer,
    activeLoad: loadMap.get(installer.id) ?? 0,
    control: {
      isEnabled: installer.installerConfig?.isEnabled ?? false,
      maxActiveWorkOrders: installer.installerConfig?.maxActiveWorkOrders ?? 5,
      notes: installer.installerConfig?.notes ?? null,
      isConfigured: Boolean(installer.installerConfig),
    },
  }));
}

export async function upsertInstallerConfig(
  input: z.infer<typeof upsertInstallerConfigSchema>
) {
  await assertInstallerProfile(db, input.installerId);

  const notes =
    input.notes === undefined ? undefined : normalizeOptionalNotes(input.notes ?? undefined);
  return db.installerConfig.upsert({
    where: {
      userProfileId: input.installerId,
    },
    create: {
      userProfileId: input.installerId,
      isEnabled: input.isEnabled ?? true,
      maxActiveWorkOrders: input.maxActiveWorkOrders ?? 5,
      notes: notes ?? null,
    },
    update: {
      isEnabled: input.isEnabled,
      maxActiveWorkOrders: input.maxActiveWorkOrders,
      notes,
    },
  });
}

export async function updateInstallerCoverage(
  input: z.infer<typeof updateInstallerCoverageSchema>
) {
  await assertInstallerProfile(db, input.installerId);

  const uniqueZoneIds = [...new Set(input.zoneIds)];
  if (uniqueZoneIds.length > 0) {
    const existingZoneCount = await db.zone.count({
      where: {
        id: {
          in: uniqueZoneIds,
        },
      },
    });

    if (existingZoneCount !== uniqueZoneIds.length) {
      throw new Error("Una o más zonas seleccionadas no existen.");
    }
  }

  return db.$transaction(async (tx) => {
    await tx.installerConfig.upsert({
      where: {
        userProfileId: input.installerId,
      },
      create: {
        userProfileId: input.installerId,
        isEnabled: true,
        maxActiveWorkOrders: 5,
      },
      update: {},
    });

    await tx.installerCoverageZone.deleteMany({
      where: {
        installerId: input.installerId,
      },
    });

    if (uniqueZoneIds.length > 0) {
      await tx.installerCoverageZone.createMany({
        data: uniqueZoneIds.map((zoneId) => ({
          installerId: input.installerId,
          zoneId,
        })),
        skipDuplicates: true,
      });
    }

    return tx.installerCoverageZone.findMany({
      where: {
        installerId: input.installerId,
      },
      include: {
        zone: {
          include: {
            province: true,
          },
        },
      },
      orderBy: {
        zone: {
          name: "asc",
        },
      },
    });
  });
}
