import { db } from "@/lib/db";
import {
  Prisma,
  OrderDesignTaskStatus,
  OrderDesignTaskEventType,
  CreativeSourceType,
  SalesReviewStatus,
} from "@prisma/client";
import { z } from "zod";
import {
  activatePrintTaskAfterDesignClosure,
  reopenPrintTaskAfterDesignReopened,
} from "@/lib/services/print-task";

type PrismaClientLike = Prisma.TransactionClient | typeof db;

const DESIGN_SERVICE_CODE = "DISENO_ARTE";
const DESIGN_SLA_HOURS = 48;

export const designInboxListSchema = z.object({
  status: z.nativeEnum(OrderDesignTaskStatus).optional(),
  mineOnly: z.boolean().optional(),
  unassignedOnly: z.boolean().optional(),
  overdueOnly: z.boolean().optional(),
  skip: z.number().int().min(0).default(0),
  take: z.number().int().min(1).max(100).default(50),
});

export const claimDesignTaskSchema = z.object({
  taskId: z.string().min(1),
});

export const updateDesignTaskStatusSchema = z.object({
  taskId: z.string().min(1),
  status: z.nativeEnum(OrderDesignTaskStatus),
  notes: z.string().trim().max(2000).optional(),
});

export const uploadDesignProofSchema = z.object({
  orderId: z.string().min(1),
  fileUrl: z.string().url(),
  fileName: z.string().trim().min(1).max(255),
  fileType: z.string().trim().min(1).max(120),
  fileSize: z.number().int().min(0),
  sourceType: z.nativeEnum(CreativeSourceType).default("EXTERNAL_URL"),
  metadata: z.any().optional(),
  notes: z.string().trim().max(2000).optional(),
});

export const designerProofDecisionSchema = z.object({
  orderId: z.string().min(1),
  decision: z.enum(["APPROVED", "CHANGES_REQUESTED"]),
  notes: z.string().trim().max(2000).optional(),
});

export const clientProofDecisionSchema = z.object({
  orderId: z.string().min(1),
  decision: z.enum(["APPROVED", "CHANGES_REQUESTED"]),
  notes: z.string().trim().max(2000).optional(),
});

export const getDesignTaskByOrderSchema = z.object({
  orderId: z.string().min(1),
});

interface DesignTaskActor {
  profileId: string;
}

interface CreateOrEnsureOrderDesignTaskInput {
  orderId: string;
  companyConfirmedAt?: Date | null;
  createdById?: string | null;
  serviceItems: Array<{
    serviceCodeSnapshot?: string | null;
    service?: { code?: string | null } | null;
  }>;
}

function resolveInitialTaskStatus(
  serviceItems: CreateOrEnsureOrderDesignTaskInput["serviceItems"]
): OrderDesignTaskStatus {
  const hasDesignService = serviceItems.some(
    (item) =>
      item.serviceCodeSnapshot === DESIGN_SERVICE_CODE ||
      item.service?.code === DESIGN_SERVICE_CODE
  );

  return hasDesignService ? "CREATE_FROM_SCRATCH" : "REVIEW";
}

function resolveSlaDueAt(companyConfirmedAt?: Date | null) {
  const baseDate = companyConfirmedAt ?? new Date();
  return new Date(baseDate.getTime() + DESIGN_SLA_HOURS * 60 * 60 * 1000);
}

function isDesignTaskBlockedBySalesReviewStatus(status: SalesReviewStatus) {
  return status !== "APPROVED";
}

function assertDesignTaskNotBlockedBySales(status: SalesReviewStatus) {
  if (isDesignTaskBlockedBySalesReviewStatus(status)) {
    throw new Error(
      "La tarea de diseno esta bloqueada hasta que Ventas apruebe la validacion de la orden."
    );
  }
}

function assertHttpsUrl(url: string) {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "https:") {
      throw new Error();
    }
  } catch {
    throw new Error("La prueba de color debe ser una URL publica valida con https://.");
  }
}

async function resolveDesignActor(userId: string): Promise<DesignTaskActor> {
  const profile = await db.userProfile.findUnique({
    where: { userId },
    select: { id: true },
  });

  if (!profile) {
    throw new Error("Perfil de usuario no encontrado.");
  }

  return { profileId: profile.id };
}

export async function createDesignTaskEvent(
  client: PrismaClientLike,
  input: {
    taskId: string;
    eventType: OrderDesignTaskEventType;
    fromStatus?: OrderDesignTaskStatus | null;
    toStatus?: OrderDesignTaskStatus | null;
    actorId?: string | null;
    notes?: string | null;
    metadata?: Prisma.InputJsonValue | null;
  }
) {
  return client.orderDesignTaskEvent.create({
    data: {
      taskId: input.taskId,
      eventType: input.eventType,
      fromStatus: input.fromStatus ?? null,
      toStatus: input.toStatus ?? null,
      actorId: input.actorId ?? null,
      notes: input.notes ?? null,
      metadata: input.metadata ?? undefined,
    },
  });
}

export async function ensureOrderDesignTask(
  client: PrismaClientLike,
  input: CreateOrEnsureOrderDesignTaskInput
) {
  const existingTask = await client.orderDesignTask.findUnique({
    where: { orderId: input.orderId },
    select: { id: true },
  });

  if (existingTask) {
    return client.orderDesignTask.findUniqueOrThrow({
      where: { id: existingTask.id },
    });
  }

  const initialStatus = resolveInitialTaskStatus(input.serviceItems);
  const createdTask = await client.orderDesignTask.create({
    data: {
      orderId: input.orderId,
      status: initialStatus,
      slaDueAt: resolveSlaDueAt(input.companyConfirmedAt),
      createdById: input.createdById ?? null,
    },
  });

  await createDesignTaskEvent(client, {
    taskId: createdTask.id,
    eventType: "TASK_CREATED",
    toStatus: initialStatus,
    actorId: input.createdById ?? null,
    notes: "Tarea de diseno creada automaticamente al habilitar el flujo de diseno.",
  });

  return createdTask;
}

export async function activateDesignTaskAfterSalesApproval(
  client: PrismaClientLike,
  input: {
    orderId: string;
    actorId?: string | null;
    serviceItems: CreateOrEnsureOrderDesignTaskInput["serviceItems"];
  }
) {
  const now = new Date();
  const existingTask = await client.orderDesignTask.findUnique({
    where: { orderId: input.orderId },
    select: {
      id: true,
      status: true,
    },
  });

  if (!existingTask) {
    return ensureOrderDesignTask(client, {
      orderId: input.orderId,
      companyConfirmedAt: now,
      createdById: input.actorId ?? null,
      serviceItems: input.serviceItems,
    });
  }

  const updatedTask = await client.orderDesignTask.update({
    where: { id: existingTask.id },
    data: {
      slaDueAt: resolveSlaDueAt(now),
      closedAt: null,
      designerApprovedProofVersion: null,
      clientApprovedProofVersion: null,
    },
  });

  await createDesignTaskEvent(client, {
    taskId: existingTask.id,
    eventType: "STATUS_CHANGED",
    fromStatus: existingTask.status,
    toStatus: existingTask.status,
    actorId: input.actorId ?? null,
    notes:
      "Tarea de diseno habilitada por aprobacion de Ventas. SLA reiniciado a 48 horas.",
  });

  return updatedTask;
}

async function resolveLatestProofVersion(
  client: PrismaClientLike,
  orderId: string
): Promise<{ id: string; version: number }> {
  const latestProof = await client.orderCreative.findFirst({
    where: {
      orderId,
      creativeKind: "DESIGN_PROOF",
      lineItemId: null,
    },
    orderBy: { version: "desc" },
    select: {
      id: true,
      version: true,
    },
  });

  if (!latestProof) {
    throw new Error("No hay prueba de color publicada para esta orden.");
  }

  return latestProof;
}

async function applyDesignerDecision(
  client: PrismaClientLike,
  input: z.infer<typeof designerProofDecisionSchema>,
  actorProfileId: string
) {
  const task = await client.orderDesignTask.findUnique({
    where: { orderId: input.orderId },
    select: {
      id: true,
      status: true,
      clientApprovedProofVersion: true,
      order: {
        select: {
          salesReviewStatus: true,
        },
      },
    },
  });

  if (!task) {
    throw new Error("No hay tarea de diseno asociada a esta orden.");
  }

  assertDesignTaskNotBlockedBySales(task.order.salesReviewStatus);

  if (input.decision === "CHANGES_REQUESTED") {
    const latestProof = await client.orderCreative.findFirst({
      where: {
        orderId: input.orderId,
        creativeKind: "DESIGN_PROOF",
        lineItemId: null,
      },
      orderBy: { version: "desc" },
      select: { id: true },
    });

    const updatedTask = await client.orderDesignTask.update({
      where: { id: task.id },
      data: {
        status: "ADJUST",
        closedAt: null,
        designerApprovedProofVersion: null,
        clientApprovedProofVersion: null,
      },
    });

    if (latestProof) {
      await client.orderCreative.update({
        where: { id: latestProof.id },
        data: { status: "REJECTED" },
      });
    }

    await reopenPrintTaskAfterDesignReopened(client, {
      orderId: input.orderId,
      actorId: actorProfileId,
      reason: "Diseno solicito cambios en la prueba final.",
    });

    await createDesignTaskEvent(client, {
      taskId: task.id,
      eventType: "DESIGNER_CHANGES_REQUESTED",
      fromStatus: task.status,
      toStatus: "ADJUST",
      actorId: actorProfileId,
      notes: input.notes?.trim() || null,
    });

    return updatedTask;
  }

  const latestProof = await resolveLatestProofVersion(client, input.orderId);
  const shouldClose = task.clientApprovedProofVersion === latestProof.version;
  const now = new Date();

  const updatedTask = await client.orderDesignTask.update({
    where: { id: task.id },
    data: {
      status: "COLOR_PROOF_READY",
      closedAt: shouldClose ? now : null,
      designerApprovedProofVersion: latestProof.version,
    },
  });

  if (shouldClose) {
    await client.orderCreative.update({
      where: { id: latestProof.id },
      data: { status: "APPROVED" },
    });

    await activatePrintTaskAfterDesignClosure(client, {
      orderId: input.orderId,
      actorId: actorProfileId,
      proofVersion: latestProof.version,
    });
  }

  await createDesignTaskEvent(client, {
    taskId: task.id,
    eventType: "DESIGNER_APPROVED",
    fromStatus: task.status,
    toStatus: updatedTask.status,
    actorId: actorProfileId,
    notes: input.notes?.trim() || null,
    metadata: {
      proofVersion: latestProof.version,
      closedAt: shouldClose ? now.toISOString() : null,
    },
  });

  return updatedTask;
}

async function applyClientDecision(
  client: PrismaClientLike,
  input: z.infer<typeof clientProofDecisionSchema>,
  actorProfileId: string
) {
  const task = await client.orderDesignTask.findUnique({
    where: { orderId: input.orderId },
    select: {
      id: true,
      status: true,
      designerApprovedProofVersion: true,
      order: {
        select: {
          salesReviewStatus: true,
        },
      },
    },
  });

  if (!task) {
    throw new Error("No hay tarea de diseno asociada a esta orden.");
  }

  assertDesignTaskNotBlockedBySales(task.order.salesReviewStatus);

  if (input.decision === "CHANGES_REQUESTED") {
    const latestProof = await client.orderCreative.findFirst({
      where: {
        orderId: input.orderId,
        creativeKind: "DESIGN_PROOF",
        lineItemId: null,
      },
      orderBy: { version: "desc" },
      select: { id: true },
    });

    const updatedTask = await client.orderDesignTask.update({
      where: { id: task.id },
      data: {
        status: "ADJUST",
        closedAt: null,
        clientApprovedProofVersion: null,
      },
    });

    if (latestProof) {
      await client.orderCreative.update({
        where: { id: latestProof.id },
        data: { status: "REJECTED" },
      });
    }

    await reopenPrintTaskAfterDesignReopened(client, {
      orderId: input.orderId,
      actorId: actorProfileId,
      reason: "Cliente solicito cambios en la prueba final.",
    });

    await createDesignTaskEvent(client, {
      taskId: task.id,
      eventType: "CLIENT_CHANGES_REQUESTED",
      fromStatus: task.status,
      toStatus: "ADJUST",
      actorId: actorProfileId,
      notes: input.notes?.trim() || null,
    });

    return updatedTask;
  }

  const latestProof = await resolveLatestProofVersion(client, input.orderId);
  const shouldClose = task.designerApprovedProofVersion === latestProof.version;
  const now = new Date();

  const updatedTask = await client.orderDesignTask.update({
    where: { id: task.id },
    data: {
      status: "COLOR_PROOF_READY",
      closedAt: shouldClose ? now : null,
      clientApprovedProofVersion: latestProof.version,
    },
  });

  if (shouldClose) {
    await client.orderCreative.update({
      where: { id: latestProof.id },
      data: { status: "APPROVED" },
    });

    await activatePrintTaskAfterDesignClosure(client, {
      orderId: input.orderId,
      actorId: actorProfileId,
      proofVersion: latestProof.version,
    });
  }

  await createDesignTaskEvent(client, {
    taskId: task.id,
    eventType: "CLIENT_APPROVED",
    fromStatus: task.status,
    toStatus: updatedTask.status,
    actorId: actorProfileId,
    notes: input.notes?.trim() || null,
    metadata: {
      proofVersion: latestProof.version,
      closedAt: shouldClose ? now.toISOString() : null,
    },
  });

  return updatedTask;
}

export async function listDesignInbox(
  input: z.infer<typeof designInboxListSchema>,
  options?: { actorUserId?: string }
) {
  let actorProfileId: string | null = null;
  if (input.mineOnly) {
    if (!options?.actorUserId) {
      throw new Error("No se pudo resolver el usuario actual.");
    }
    actorProfileId = (await resolveDesignActor(options.actorUserId)).profileId;
  }

  const where: Prisma.OrderDesignTaskWhereInput = {
    closedAt: null,
  };

  if (input.status) {
    where.status = input.status;
  }

  if (input.unassignedOnly) {
    where.assignedToId = null;
  }

  if (actorProfileId) {
    where.assignedToId = actorProfileId;
  }

  if (input.overdueOnly) {
    where.slaDueAt = { lt: new Date() };
    where.order = {
      salesReviewStatus: "APPROVED",
    };
  }

  const [tasks, total] = await Promise.all([
    db.orderDesignTask.findMany({
      where,
      skip: input.skip,
      take: input.take,
      orderBy: [{ slaDueAt: "asc" }, { createdAt: "asc" }],
      include: {
        assignedTo: {
          include: {
            user: {
              select: {
                name: true,
                email: true,
              },
            },
          },
        },
        order: {
          select: {
            id: true,
            code: true,
            status: true,
            salesReviewStatus: true,
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
    }),
    db.orderDesignTask.count({ where }),
  ]);

  const now = Date.now();
  const normalizedTasks = tasks.map((task) => ({
    ...task,
    isBlockedBySales: isDesignTaskBlockedBySalesReviewStatus(task.order.salesReviewStatus),
    isOverdue:
      !task.closedAt &&
      !isDesignTaskBlockedBySalesReviewStatus(task.order.salesReviewStatus) &&
      task.slaDueAt.getTime() < now,
  }));

  return {
    tasks: normalizedTasks,
    total,
    hasMore: input.skip + normalizedTasks.length < total,
  };
}

export async function claimDesignTask(taskId: string, actorUserId: string) {
  const actor = await resolveDesignActor(actorUserId);
  const now = new Date();

  return db.$transaction(async (tx) => {
    const task = await tx.orderDesignTask.findUnique({
      where: { id: taskId },
      select: {
        id: true,
        assignedToId: true,
        closedAt: true,
        order: {
          select: {
            salesReviewStatus: true,
          },
        },
      },
    });

    if (!task) {
      throw new Error("Tarea de diseno no encontrada.");
    }

    if (task.closedAt) {
      throw new Error("La tarea ya fue cerrada.");
    }

    assertDesignTaskNotBlockedBySales(task.order.salesReviewStatus);

    if (task.assignedToId && task.assignedToId !== actor.profileId) {
      throw new Error("La tarea ya esta asignada a otro dissenador.");
    }

    const updatedTask = await tx.orderDesignTask.update({
      where: { id: taskId },
      data: {
        assignedToId: actor.profileId,
        assignedAt: now,
      },
    });

    await createDesignTaskEvent(tx, {
      taskId,
      eventType: "TASK_CLAIMED",
      actorId: actor.profileId,
      notes: "Tarea tomada desde la bandeja de diseno.",
    });

    return updatedTask;
  });
}

export async function updateDesignTaskStatus(
  input: z.infer<typeof updateDesignTaskStatusSchema>,
  actorUserId: string
) {
  const actor = await resolveDesignActor(actorUserId);

  return db.$transaction(async (tx) => {
    const task = await tx.orderDesignTask.findUnique({
      where: { id: input.taskId },
      select: {
        id: true,
        status: true,
        order: {
          select: {
            salesReviewStatus: true,
          },
        },
      },
    });

    if (!task) {
      throw new Error("Tarea de diseno no encontrada.");
    }

    assertDesignTaskNotBlockedBySales(task.order.salesReviewStatus);

    if (task.status === input.status) {
      return tx.orderDesignTask.findUniqueOrThrow({ where: { id: input.taskId } });
    }

    const updatedTask = await tx.orderDesignTask.update({
      where: { id: input.taskId },
      data: {
        status: input.status,
        closedAt: null,
      },
    });

    if (input.status !== "COLOR_PROOF_READY") {
      await reopenPrintTaskAfterDesignReopened(tx, {
        orderId: updatedTask.orderId,
        actorId: actor.profileId,
        reason: "La tarea de diseno cambio de estado y requiere nueva impresion final.",
      });
    }

    await createDesignTaskEvent(tx, {
      taskId: input.taskId,
      eventType: "STATUS_CHANGED",
      fromStatus: task.status,
      toStatus: input.status,
      actorId: actor.profileId,
      notes: input.notes?.trim() || null,
    });

    return updatedTask;
  });
}

export async function uploadDesignProof(
  input: z.infer<typeof uploadDesignProofSchema>,
  actorUserId: string
) {
  const actor = await resolveDesignActor(actorUserId);
  if (input.sourceType !== "EXTERNAL_URL") {
    throw new Error("La prueba de color del diseno se registra solo mediante URL externa.");
  }
  assertHttpsUrl(input.fileUrl);

  if (input.fileType !== "text/uri-list" || input.fileSize !== 0) {
    throw new Error(
      "Para pruebas por URL debes enviar fileType=\"text/uri-list\" y fileSize=0."
    );
  }

  return db.$transaction(async (tx) => {
    const order = await tx.order.findUnique({
      where: { id: input.orderId },
      select: {
        id: true,
        salesReviewStatus: true,
        serviceItems: {
          include: {
            service: {
              select: { code: true },
            },
          },
        },
        designTask: {
          select: {
            id: true,
            status: true,
            assignedToId: true,
            assignedAt: true,
          },
        },
      },
    });

    if (!order) {
      throw new Error("Orden no encontrada.");
    }

    assertDesignTaskNotBlockedBySales(order.salesReviewStatus);

    const task =
      order.designTask ??
      (await ensureOrderDesignTask(tx, {
        orderId: order.id,
        companyConfirmedAt: new Date(),
        createdById: actor.profileId,
        serviceItems: order.serviceItems,
      }));

    const latestProof = await tx.orderCreative.findFirst({
      where: {
        orderId: input.orderId,
        creativeKind: "DESIGN_PROOF",
        lineItemId: null,
      },
      orderBy: { version: "desc" },
      select: { version: true },
    });

    const nextVersion = (latestProof?.version ?? 0) + 1;
    const updatedTask = await tx.orderDesignTask.update({
      where: { id: task.id },
      data: {
        status: "COLOR_PROOF_READY",
        closedAt: null,
        designerApprovedProofVersion: null,
        clientApprovedProofVersion: null,
        assignedToId: task.assignedToId ?? actor.profileId,
        assignedAt: task.assignedAt ?? new Date(),
      },
    });

    const proof = await tx.orderCreative.create({
      data: {
        orderId: input.orderId,
        lineItemId: null,
        fileUrl: input.fileUrl,
        fileName: input.fileName,
        fileType: input.fileType,
        fileSize: input.fileSize,
        sourceType: input.sourceType,
        creativeKind: "DESIGN_PROOF",
        version: nextVersion,
        status: "PENDING",
        metadata: input.metadata || null,
        notes: input.notes || null,
        uploadedById: actor.profileId,
      },
    });

    await reopenPrintTaskAfterDesignReopened(tx, {
      orderId: input.orderId,
      actorId: actor.profileId,
      reason: "Se publico una nueva prueba de diseno; impresion final debe revalidarse.",
      proofVersion: nextVersion,
    });

    await createDesignTaskEvent(tx, {
      taskId: task.id,
      eventType: "PROOF_UPLOADED",
      fromStatus: task.status,
      toStatus: updatedTask.status,
      actorId: actor.profileId,
      notes: "Se subio una nueva prueba de color para revision del cliente.",
      metadata: {
        proofId: proof.id,
        proofVersion: nextVersion,
        sourceType: input.sourceType,
        url: input.fileUrl,
      },
    });

    return proof;
  });
}

export async function registerClientProofDecision(
  input: z.infer<typeof clientProofDecisionSchema>,
  actorUserId: string
) {
  const actor = await resolveDesignActor(actorUserId);
  return db.$transaction((tx) => applyClientDecision(tx, input, actor.profileId));
}

export async function registerDesignerProofDecision(
  input: z.infer<typeof designerProofDecisionSchema>,
  actorUserId: string
) {
  const actor = await resolveDesignActor(actorUserId);
  return db.$transaction((tx) => applyDesignerDecision(tx, input, actor.profileId));
}

export async function onClientArtworkUploaded(
  client: PrismaClientLike,
  input: {
    orderId: string;
    actorId?: string | null;
  }
) {
  const task = await client.orderDesignTask.findUnique({
    where: { orderId: input.orderId },
    select: {
      id: true,
      status: true,
      closedAt: true,
    },
  });

  if (!task) {
    return null;
  }

  if (task.status !== "ADJUST" && !task.closedAt) {
    return task;
  }

  const updatedTask = await client.orderDesignTask.update({
    where: { id: task.id },
    data: {
      status: "REVIEW",
      closedAt: null,
      designerApprovedProofVersion: null,
      clientApprovedProofVersion: null,
    },
  });

  await reopenPrintTaskAfterDesignReopened(client, {
    orderId: input.orderId,
    actorId: input.actorId ?? null,
    reason: "Nuevo arte del cliente cargado. Se reactiva diseno y se invalida impresion previa.",
  });

  await createDesignTaskEvent(client, {
    taskId: task.id,
    eventType: "STATUS_CHANGED",
    fromStatus: task.status,
    toStatus: "REVIEW",
    actorId: input.actorId ?? null,
    notes: "Nuevo arte del cliente cargado. Se reactiva revision de diseno.",
  });

  return updatedTask;
}

export async function getDesignTaskByOrder(orderId: string) {
  const task = await db.orderDesignTask.findUnique({
    where: { orderId },
    include: {
      assignedTo: {
        include: {
          user: {
            select: {
              name: true,
              email: true,
            },
          },
        },
      },
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
        },
      },
      order: {
        select: {
          id: true,
          code: true,
          status: true,
          salesReviewStatus: true,
          organization: {
            select: {
              name: true,
            },
          },
          clientName: true,
          clientEmail: true,
        },
      },
    },
  });

  if (!task) {
    return null;
  }

  const latestProof = await db.orderCreative.findFirst({
    where: {
      orderId,
      creativeKind: "DESIGN_PROOF",
    },
    orderBy: {
      version: "desc",
    },
    select: {
      version: true,
    },
  });

  const latestProofVersion = latestProof?.version ?? null;
  const clientArtworkLocked = latestProofVersion !== null;

  return {
    ...task,
    latestProofVersion,
    clientArtworkLocked,
    canClientUploadArtwork: !clientArtworkLocked,
    isBlockedBySales: isDesignTaskBlockedBySalesReviewStatus(task.order.salesReviewStatus),
  };
}

export async function canUserAccessOrder(userId: string, orderId: string) {
  const profile = await db.userProfile.findUnique({
    where: { userId },
    include: {
      organizationRoles: {
        where: { isActive: true },
        select: { organizationId: true },
      },
    },
  });

  if (!profile) {
    return false;
  }

  const orgIds = profile.organizationRoles.map((role) => role.organizationId);
  const orderAccessFilters: Prisma.OrderWhereInput[] = [{ createdById: profile.id }];
  if (orgIds.length > 0) {
    orderAccessFilters.push({ organizationId: { in: orgIds } });
  }

  const order = await db.order.findFirst({
    where: {
      id: orderId,
      OR: orderAccessFilters,
    },
    select: { id: true },
  });

  return Boolean(order);
}
