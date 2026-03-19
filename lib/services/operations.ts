import { db } from "@/lib/db";
import { Prisma, OperationalWorkOrderStatus } from "@prisma/client";
import { z } from "zod";
import { ensureChecklistForWorkOrder } from "@/lib/services/installer-checklist";
import {
  issueOperationalInstallationReport,
  supersedeIssuedInstallationReports,
  synchronizeOrderOperationalClosure,
} from "@/lib/services/order-traceability";
import {
  createOrderNotifications,
  NotificationType,
  sendPreparedNotificationEmails,
} from "@/lib/services/notifications";

type PrismaClientLike = Prisma.TransactionClient | typeof db;

const ACTIVE_WORK_ORDER_STATUSES: OperationalWorkOrderStatus[] = [
  "ASSIGNED",
  "IN_PROGRESS",
  "REOPENED",
];
const OPEN_WORK_ORDER_STATUSES: OperationalWorkOrderStatus[] = [
  "PENDING_ASSIGNMENT",
  "ASSIGNED",
  "IN_PROGRESS",
  "PENDING_REVIEW",
  "REOPENED",
];
const REVIEW_WORK_ORDER_STATUSES: OperationalWorkOrderStatus[] = ["PENDING_REVIEW"];
const HISTORY_WORK_ORDER_STATUSES: OperationalWorkOrderStatus[] = ["COMPLETED", "CANCELLED"];
const ACTIVE_VIEW_WORK_ORDER_STATUSES: OperationalWorkOrderStatus[] = [
  "PENDING_ASSIGNMENT",
  "ASSIGNED",
  "IN_PROGRESS",
  "REOPENED",
];
const operationViewSchema = z.enum(["ACTIVE", "REVIEW", "HISTORY"]);

export const operationalWorkOrderListSchema = z.object({
  view: operationViewSchema.default("ACTIVE"),
  status: z.nativeEnum(OperationalWorkOrderStatus).optional(),
  zoneId: z.string().min(1).optional(),
  installerId: z.string().min(1).optional(),
  unassignedOnly: z.boolean().optional(),
  search: z.string().trim().max(120).optional(),
  dateFrom: z.coerce.date().optional(),
  dateTo: z.coerce.date().optional(),
  skip: z.number().int().min(0).default(0),
  take: z.number().int().min(1).max(100).default(50),
});

export const operationalWorkOrderByOrderSchema = z.object({
  orderId: z.string().min(1),
});

export const operationalWorkOrderDetailSchema = z.object({
  workOrderId: z.string().min(1),
});

export const approveOperationalWorkOrderReviewSchema = z.object({
  workOrderId: z.string().min(1),
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

export const reopenOperationalWorkOrderSchema = z.object({
  workOrderId: z.string().min(1),
  reason: z.string().trim().min(1).max(2000),
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
      | "SUBMITTED_FOR_REVIEW"
      | "REVIEW_APPROVED"
      | "REOPENED_FOR_REWORK"
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

const operationalWorkOrderListInclude = {
  order: {
    select: {
      id: true,
      code: true,
      clientName: true,
      clientEmail: true,
      brand: {
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
      asset: {
        select: {
          address: true,
          structureType: {
            select: { name: true },
          },
        },
      },
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
  reviewedBy: {
    include: {
      user: {
        select: {
          name: true,
          email: true,
        },
      },
    },
  },
  installationReports: {
    where: {
      status: "ISSUED",
    },
    orderBy: [{ version: "desc" }],
    take: 1,
    include: {
      issuedBy: {
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
} satisfies Prisma.OrderOperationalWorkOrderInclude;

const operationalWorkOrderDetailInclude = {
  ...operationalWorkOrderListInclude,
  checklistItems: {
    orderBy: [{ createdAt: "asc" }],
    include: {
      checkedBy: {
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
  evidences: {
    orderBy: [{ receivedAt: "desc" }],
    include: {
      uploadedBy: {
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
  installationReports: {
    orderBy: [{ version: "desc" }],
    include: {
      issuedBy: {
        include: {
          user: {
            select: {
              name: true,
              email: true,
            },
          },
        },
      },
      supersededBy: {
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
} satisfies Prisma.OrderOperationalWorkOrderInclude;

function normalizeSearchTerm(search?: string) {
  const trimmed = search?.trim();
  return trimmed && trimmed.length > 0 ? trimmed : undefined;
}

function toNumberOrNull(value: Prisma.Decimal | number | null | undefined): number | null {
  if (value === null || value === undefined) {
    return null;
  }

  const result = Number(value);
  return Number.isFinite(result) ? result : null;
}

function endOfDay(value: Date) {
  const result = new Date(value);
  result.setHours(23, 59, 59, 999);
  return result;
}

function buildOperationalWorkOrderWhere(
  input: z.infer<typeof operationalWorkOrderListSchema>
): Prisma.OrderOperationalWorkOrderWhereInput {
  const where: Prisma.OrderOperationalWorkOrderWhereInput = {};

  if (input.status) {
    where.status = input.status;
  } else if (input.view === "ACTIVE") {
    where.status = { in: ACTIVE_VIEW_WORK_ORDER_STATUSES };
  } else if (input.view === "REVIEW") {
    where.status = { in: REVIEW_WORK_ORDER_STATUSES };
  } else {
    where.status = { in: HISTORY_WORK_ORDER_STATUSES };
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

  const search = normalizeSearchTerm(input.search);
  if (search) {
    where.OR = [
      {
        order: {
          code: {
            contains: search,
            mode: "insensitive",
          },
        },
      },
      {
        face: {
          code: {
            contains: search,
            mode: "insensitive",
          },
        },
      },
      {
        order: {
          clientName: {
            contains: search,
            mode: "insensitive",
          },
        },
      },
      {
        order: {
          brand: {
            name: {
              contains: search,
              mode: "insensitive",
            },
          },
        },
      },
    ];
  }

  if (input.view === "HISTORY") {
    if (input.dateFrom || input.dateTo) {
      where.closedAt = {};
      if (input.dateFrom) {
        where.closedAt.gte = input.dateFrom;
      }
      if (input.dateTo) {
        where.closedAt.lte = endOfDay(input.dateTo);
      }
    }
  }

  return where;
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
          submittedAt: null,
          completedAt: null,
          reviewedAt: null,
          reviewedById: null,
          reopenedAt: null,
          lastReopenReason: null,
          closedAt: null,
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
      submittedAt: null,
      completedAt: null,
      reviewedAt: null,
      reviewedById: null,
      reopenedAt: null,
      lastReopenReason: null,
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

    await ensureChecklistForWorkOrder(client, created.id);

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
  const relatedWorkOrders = await client.orderOperationalWorkOrder.findMany({
    where: {
      orderId: input.orderId,
      printTaskId: input.printTaskId,
    },
    select: {
      id: true,
      status: true,
      assignedInstallerId: true,
    },
  });

  if (relatedWorkOrders.length === 0) {
    return { cancelledCount: 0 };
  }

  const openWorkOrders = relatedWorkOrders.filter(
    (workOrder) =>
      OPEN_WORK_ORDER_STATUSES.includes(workOrder.status) &&
      workOrder.status !== "COMPLETED" &&
      workOrder.status !== "CANCELLED"
  );

  const now = new Date();
  for (const workOrder of openWorkOrders) {
    await client.orderOperationalWorkOrder.update({
      where: { id: workOrder.id },
      data: {
        status: "CANCELLED",
        reviewedAt: null,
        reviewedById: null,
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

  await client.orderOperationalInstallationReport.updateMany({
    where: {
      workOrderId: {
        in: relatedWorkOrders.map((workOrder) => workOrder.id),
      },
      status: {
        in: ["ISSUED"],
      },
    },
    data: {
      status: "SUPERSEDED",
      supersededAt: now,
      supersededById: input.actorId ?? null,
    },
  });

  await synchronizeOrderOperationalClosure(client, {
    orderId: input.orderId,
    actorId: input.actorId ?? null,
    changedAt: now,
  });

  return { cancelledCount: openWorkOrders.length };
}

export async function listOperationalWorkOrders(
  input: z.infer<typeof operationalWorkOrderListSchema>
) {
  const where = buildOperationalWorkOrderWhere(input);
  const orderBy: Prisma.OrderOperationalWorkOrderOrderByWithRelationInput[] =
    input.view === "HISTORY"
      ? [{ closedAt: "desc" }, { updatedAt: "desc" }]
      : input.view === "REVIEW"
        ? [{ submittedAt: "asc" }, { updatedAt: "asc" }]
        : [{ createdAt: "asc" }];

  const [workOrders, total] = await Promise.all([
    db.orderOperationalWorkOrder.findMany({
      where,
      skip: input.skip,
      take: input.take,
      orderBy,
      include: operationalWorkOrderListInclude,
    }),
    db.orderOperationalWorkOrder.count({ where }),
  ]);

  const summary =
    input.view === "ACTIVE"
      ? await (async () => {
          const [unassignedCount, reopenedCount, inProgressCount, oldestOpen] = await Promise.all([
            db.orderOperationalWorkOrder.count({
              where: {
                ...where,
                status: { in: ACTIVE_VIEW_WORK_ORDER_STATUSES },
                assignedInstallerId: null,
              },
            }),
            db.orderOperationalWorkOrder.count({
              where: {
                ...where,
                status: "REOPENED",
              },
            }),
            db.orderOperationalWorkOrder.count({
              where: {
                ...where,
                status: "IN_PROGRESS",
              },
            }),
            db.orderOperationalWorkOrder.findFirst({
              where: {
                ...where,
                status: { in: ACTIVE_VIEW_WORK_ORDER_STATUSES },
              },
              orderBy: [{ createdAt: "asc" }],
              select: {
                id: true,
                createdAt: true,
                order: {
                  select: {
                    code: true,
                  },
                },
                face: {
                  select: {
                    code: true,
                  },
                },
              },
            }),
          ]);

          return {
            unassignedCount,
            reopenedCount,
            inProgressCount,
            oldestOpen,
          };
        })()
      : input.view === "REVIEW"
        ? await (async () => {
            const [pendingCount, overrideCount, withoutValidEvidenceCount] = await Promise.all([
              db.orderOperationalWorkOrder.count({
                where: {
                  ...where,
                  status: "PENDING_REVIEW",
                },
              }),
              db.orderOperationalWorkOrder.count({
                where: {
                  ...where,
                  status: "PENDING_REVIEW",
                  evidences: {
                    some: {
                      geoOverrideReason: {
                        not: null,
                      },
                    },
                  },
                },
              }),
              db.orderOperationalWorkOrder.count({
                where: {
                  ...where,
                  status: "PENDING_REVIEW",
                  evidences: {
                    none: {
                      withinExpectedRadius: true,
                    },
                  },
                },
              }),
            ]);

            return {
              pendingCount,
              overrideCount,
              withoutValidEvidenceCount,
            };
          })()
        : await (async () => {
            const [completedTodayCount, cancelledCount, reopenedInRangeCount] = await Promise.all([
              db.orderOperationalWorkOrder.count({
                where: {
                  ...where,
                  status: "COMPLETED",
                  completedAt: {
                    gte: new Date(new Date().setHours(0, 0, 0, 0)),
                  },
                },
              }),
              db.orderOperationalWorkOrder.count({
                where: {
                  ...where,
                  status: "CANCELLED",
                },
              }),
              db.orderOperationalWorkOrder.count({
                where: {
                  ...where,
                  status: {
                    in: HISTORY_WORK_ORDER_STATUSES,
                  },
                  reopenCount: {
                    gt: 0,
                  },
                },
              }),
            ]);

            return {
              completedTodayCount,
              cancelledCount,
              reopenedInRangeCount,
            };
          })();

  return {
    workOrders,
    total,
    hasMore: input.skip + workOrders.length < total,
    summary,
  };
}

export async function getOperationalWorkOrdersByOrder(orderId: string) {
  return db.orderOperationalWorkOrder.findMany({
    where: { orderId },
    orderBy: [{ createdAt: "asc" }],
    include: operationalWorkOrderDetailInclude,
  });
}

export async function getOperationalWorkOrderDetail(
  input: z.infer<typeof operationalWorkOrderDetailSchema>
) {
  const workOrder = await db.orderOperationalWorkOrder.findUnique({
    where: { id: input.workOrderId },
    include: operationalWorkOrderDetailInclude,
  });

  if (!workOrder) {
    throw new Error("OT operativa no encontrada.");
  }

  const requiredChecklistItems = workOrder.checklistItems.filter((item) => item.isRequired);
  const requiredChecklistCompleted = requiredChecklistItems.filter((item) => item.isChecked).length;
  const validEvidenceCount = workOrder.evidences.filter(
    (evidence) => evidence.withinExpectedRadius === true
  ).length;
  const overrideEvidenceCount = workOrder.evidences.filter(
    (evidence) => Boolean(evidence.geoOverrideReason)
  ).length;
  const currentIssuedReport =
    workOrder.installationReports.find((report) => report.status === "ISSUED") ?? null;
  const latestReport =
    workOrder.installationReports.length > 0 ? workOrder.installationReports[0] : null;

  return {
    ...workOrder,
    evidences: workOrder.evidences.map((evidence) => ({
      ...evidence,
      capturedLatitude: toNumberOrNull(evidence.capturedLatitude),
      capturedLongitude: toNumberOrNull(evidence.capturedLongitude),
      expectedLatitude: toNumberOrNull(evidence.expectedLatitude),
      expectedLongitude: toNumberOrNull(evidence.expectedLongitude),
      distanceMeters: toNumberOrNull(evidence.distanceMeters),
    })),
    validation: {
      requiredChecklistTotal: requiredChecklistItems.length,
      requiredChecklistCompleted,
      evidenceCount: workOrder.evidences.length,
      validEvidenceCount,
      overrideEvidenceCount,
      hasValidEvidence: validEvidenceCount > 0,
      hasGeoOverride: overrideEvidenceCount > 0,
    },
    closure: {
      canApproveAndIssueReport:
        workOrder.status === "PENDING_REVIEW" &&
        requiredChecklistCompleted === requiredChecklistItems.length &&
        workOrder.evidences.length > 0,
      hasIssuedReport: Boolean(currentIssuedReport),
      reportVersion: currentIssuedReport?.version ?? latestReport?.version ?? null,
      isSuperseded:
        Boolean(latestReport) && latestReport?.status === "SUPERSEDED",
    },
    currentInstallationReport: currentIssuedReport,
    installationReportHistory: workOrder.installationReports,
  };
}

export async function approveOperationalWorkOrderReview(
  input: z.infer<typeof approveOperationalWorkOrderReviewSchema>,
  actorUserId: string
) {
  const actor = await resolveOperationsActor(actorUserId);

  const result = await db.$transaction(async (tx) => {
    const workOrder = await tx.orderOperationalWorkOrder.findUnique({
      where: { id: input.workOrderId },
      select: {
        id: true,
        status: true,
        assignedInstallerId: true,
        orderId: true,
        order: {
          select: {
            code: true,
          },
        },
      },
    });

    if (!workOrder) {
      throw new Error("OT operativa no encontrada.");
    }

    if (workOrder.status !== "PENDING_REVIEW") {
      throw new Error("Solo puedes aprobar OTs que estén pendientes de revisión.");
    }

    const now = new Date();
    const installationReport = await issueOperationalInstallationReport(tx, {
      workOrderId: input.workOrderId,
      actorId: actor.profileId,
      reviewNotes: input.notes?.trim() || null,
      issuedAt: now,
    });

    const updated = await tx.orderOperationalWorkOrder.update({
      where: { id: input.workOrderId },
      data: {
        status: "COMPLETED",
        completedAt: now,
        reviewedAt: now,
        reviewedById: actor.profileId,
        closedAt: now,
      },
    });

    await createOperationalWorkOrderEvent(tx, {
      workOrderId: input.workOrderId,
      eventType: "REVIEW_APPROVED",
      fromStatus: workOrder.status,
      toStatus: updated.status,
      fromInstallerId: workOrder.assignedInstallerId ?? null,
      toInstallerId: updated.assignedInstallerId ?? null,
      actorId: actor.profileId,
      notes: input.notes?.trim() || null,
      metadata: {
        reportId: installationReport.id,
        reportVersion: installationReport.version,
      },
    });

    const notificationResult = await createOrderNotifications(tx, {
      orderId: updated.orderId,
      type: NotificationType.INSTALLATION_REPORT_ISSUED,
      title: `Reporte de instalación emitido para ${workOrder.order.code}`,
      message:
        "Ops validó la instalación y emitió el reporte final de ejecución.",
      actionPath: `/orders/${updated.orderId}?tab=case-file`,
      sourceKey: `order:${updated.orderId}:installation-report:${installationReport.id}`,
      metadata: {
        workOrderId: updated.id,
        reportId: installationReport.id,
        reportVersion: installationReport.version,
      },
    });

    const closure = await synchronizeOrderOperationalClosure(tx, {
      orderId: updated.orderId,
      actorId: actor.profileId,
      changedAt: now,
    });

    return {
      workOrder: updated,
      installationReport,
      closure,
      emailDeliveries: notificationResult.emailDeliveries,
    };
  });

  await sendPreparedNotificationEmails(result.emailDeliveries);

  return {
    workOrder: result.workOrder,
    installationReport: result.installationReport,
    closure: result.closure,
  };
}

export async function reopenOperationalWorkOrderForRework(
  input: z.infer<typeof reopenOperationalWorkOrderSchema>,
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
      },
    });

    if (!workOrder) {
      throw new Error("OT operativa no encontrada.");
    }

    if (workOrder.status !== "PENDING_REVIEW" && workOrder.status !== "COMPLETED") {
      throw new Error("Solo puedes reabrir OTs en revisión o ya completadas.");
    }

    if (!workOrder.assignedInstallerId) {
      throw new Error("La OT no tiene instalador asignado para reabrirse.");
    }

    const now = new Date();
    const updated = await tx.orderOperationalWorkOrder.update({
      where: { id: input.workOrderId },
      data: {
        status: "REOPENED",
        startedAt: null,
        submittedAt: null,
        completedAt: null,
        reviewedAt: null,
        reviewedById: null,
        reopenedAt: now,
        lastReopenReason: input.reason.trim(),
        reopenCount: {
          increment: 1,
        },
        closedAt: null,
      },
    });

    await supersedeIssuedInstallationReports(tx, {
      workOrderId: input.workOrderId,
      actorId: actor.profileId,
      supersededAt: now,
    });

    await createOperationalWorkOrderEvent(tx, {
      workOrderId: input.workOrderId,
      eventType: "REOPENED_FOR_REWORK",
      fromStatus: workOrder.status,
      toStatus: "REOPENED",
      fromInstallerId: workOrder.assignedInstallerId,
      toInstallerId: workOrder.assignedInstallerId,
      actorId: actor.profileId,
      notes: input.reason.trim(),
      metadata: {
        source: "operations-review",
      },
    });

    const closure = await synchronizeOrderOperationalClosure(tx, {
      orderId: updated.orderId,
      actorId: actor.profileId,
      changedAt: now,
    });

    return {
      workOrder: updated,
      closure,
    };
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

    if (
      workOrder.status === "COMPLETED" ||
      workOrder.status === "CANCELLED" ||
      workOrder.status === "PENDING_REVIEW" ||
      workOrder.closedAt
    ) {
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
        submittedAt: null,
        completedAt: null,
        reviewedAt: null,
        reviewedById: null,
        reopenedAt: null,
        lastReopenReason: null,
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
