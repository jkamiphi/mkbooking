import { db } from "@/lib/db";
import {
  OrderPrintTaskEventType,
  OrderPrintTaskStatus,
  Prisma,
} from "@prisma/client";
import { z } from "zod";
import {
  createOrderNotifications,
  NotificationType,
} from "@/lib/services/notifications";
import {
  cancelOperationalWorkOrdersByPrintReopen,
  createOperationalWorkOrdersForPrintCompletion,
} from "@/lib/services/operations";

type PrismaClientLike = Prisma.TransactionClient | typeof db;

export const printInboxListSchema = z.object({
  status: z.nativeEnum(OrderPrintTaskStatus).optional(),
  mineOnly: z.boolean().optional(),
  unassignedOnly: z.boolean().optional(),
  skip: z.number().int().min(0).default(0),
  take: z.number().int().min(1).max(100).default(50),
});

export const claimPrintTaskSchema = z.object({
  taskId: z.string().min(1),
});

export const updatePrintTaskStatusSchema = z.object({
  taskId: z.string().min(1),
  status: z.nativeEnum(OrderPrintTaskStatus),
  notes: z.string().trim().max(2000).optional(),
});

export const addPrintEvidenceSchema = z.object({
  orderId: z.string().min(1),
  fileUrl: z.string().url(),
  fileName: z.string().trim().min(1).max(255),
  fileType: z.string().trim().min(1).max(120),
  fileSize: z.number().int().min(0),
  metadata: z.any().optional(),
  notes: z.string().trim().max(2000).optional(),
});

export const confirmFinalPrintSchema = z.object({
  orderId: z.string().min(1),
  notes: z.string().trim().max(2000).optional(),
});

export const getPrintTaskByOrderSchema = z.object({
  orderId: z.string().min(1),
});

interface PrintTaskActor {
  profileId: string;
}

async function resolvePrintActor(userId: string): Promise<PrintTaskActor> {
  const profile = await db.userProfile.findUnique({
    where: { userId },
    select: { id: true },
  });

  if (!profile) {
    throw new Error("Perfil de usuario no encontrado.");
  }

  return { profileId: profile.id };
}

export async function createPrintTaskEvent(
  client: PrismaClientLike,
  input: {
    taskId: string;
    eventType: OrderPrintTaskEventType;
    fromStatus?: OrderPrintTaskStatus | null;
    toStatus?: OrderPrintTaskStatus | null;
    actorId?: string | null;
    notes?: string | null;
    metadata?: Prisma.InputJsonValue | null;
  },
) {
  return client.orderPrintTaskEvent.create({
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

export async function activatePrintTaskAfterDesignClosure(
  client: PrismaClientLike,
  input: {
    orderId: string;
    actorId?: string | null;
    proofVersion?: number | null;
  },
) {
  const existingTask = await client.orderPrintTask.findUnique({
    where: { orderId: input.orderId },
    select: {
      id: true,
      status: true,
      closedAt: true,
      activatedProofVersion: true,
    },
  });

  if (!existingTask) {
    const createdTask = await client.orderPrintTask.create({
      data: {
        orderId: input.orderId,
        status: "READY",
        activatedProofVersion: input.proofVersion ?? null,
      },
    });

    await createPrintTaskEvent(client, {
      taskId: createdTask.id,
      eventType: "TASK_ACTIVATED",
      toStatus: "READY",
      actorId: input.actorId ?? null,
      notes: "Tarea de impresión final activada al cerrar diseño.",
      metadata: {
        proofVersion: input.proofVersion ?? null,
      },
    });

    return createdTask;
  }

  const nextProofVersion =
    input.proofVersion ?? existingTask.activatedProofVersion ?? null;
  if (
    existingTask.status === "READY" &&
    !existingTask.closedAt &&
    existingTask.activatedProofVersion === nextProofVersion
  ) {
    return client.orderPrintTask.findUniqueOrThrow({
      where: { id: existingTask.id },
    });
  }

  const updatedTask = await client.orderPrintTask.update({
    where: { id: existingTask.id },
    data: {
      status: "READY",
      assignedToId: null,
      assignedAt: null,
      closedAt: null,
      completedAt: null,
      completedById: null,
      activatedProofVersion: nextProofVersion,
    },
  });

  await createPrintTaskEvent(client, {
    taskId: existingTask.id,
    eventType: "TASK_ACTIVATED",
    fromStatus: existingTask.status,
    toStatus: "READY",
    actorId: input.actorId ?? null,
    notes: "Tarea de impresión final activada al cerrar diseño.",
    metadata: {
      proofVersion: nextProofVersion,
    },
  });

  return updatedTask;
}

export async function reopenPrintTaskAfterDesignReopened(
  client: PrismaClientLike,
  input: {
    orderId: string;
    actorId?: string | null;
    reason?: string | null;
    proofVersion?: number | null;
  },
) {
  const task = await client.orderPrintTask.findUnique({
    where: { orderId: input.orderId },
    select: {
      id: true,
      status: true,
      assignedToId: true,
      closedAt: true,
      completedAt: true,
      activatedProofVersion: true,
    },
  });

  if (!task) {
    return null;
  }

  const nextProofVersion =
    input.proofVersion ?? task.activatedProofVersion ?? null;
  if (
    task.status === "READY" &&
    !task.assignedToId &&
    !task.closedAt &&
    !task.completedAt &&
    task.activatedProofVersion === nextProofVersion
  ) {
    return client.orderPrintTask.findUniqueOrThrow({ where: { id: task.id } });
  }

  const updatedTask = await client.orderPrintTask.update({
    where: { id: task.id },
    data: {
      status: "READY",
      assignedToId: null,
      assignedAt: null,
      closedAt: null,
      completedAt: null,
      completedById: null,
      activatedProofVersion: nextProofVersion,
    },
  });

  await createPrintTaskEvent(client, {
    taskId: task.id,
    eventType: "REOPENED_BY_DESIGN",
    fromStatus: task.status,
    toStatus: "READY",
    actorId: input.actorId ?? null,
    notes:
      input.reason ??
      "La tarea de impresión se reabre porque la etapa de diseño fue reactivada.",
    metadata: {
      proofVersion: nextProofVersion,
    },
  });

  await cancelOperationalWorkOrdersByPrintReopen(client, {
    orderId: input.orderId,
    printTaskId: task.id,
    actorId: input.actorId ?? null,
    reason: input.reason ?? null,
    source: "print-reopened-by-design",
  });

  return updatedTask;
}

export async function listPrintInbox(
  input: z.infer<typeof printInboxListSchema>,
  options?: { actorUserId?: string },
) {
  let actorProfileId: string | null = null;
  if (input.mineOnly) {
    if (!options?.actorUserId) {
      throw new Error("No se pudo resolver el usuario actual.");
    }
    actorProfileId = (await resolvePrintActor(options.actorUserId)).profileId;
  }

  const where: Prisma.OrderPrintTaskWhereInput = {
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

  const [tasks, total] = await Promise.all([
    db.orderPrintTask.findMany({
      where,
      skip: input.skip,
      take: input.take,
      orderBy: [{ createdAt: "asc" }],
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
            organization: {
              select: {
                name: true,
              },
            },
            clientName: true,
            clientEmail: true,
            designTask: {
              select: {
                closedAt: true,
              },
            },
          },
        },
      },
    }),
    db.orderPrintTask.count({ where }),
  ]);

  return {
    tasks: tasks.map((task) => ({
      ...task,
      isBlockedByDesign: !task.order.designTask?.closedAt,
    })),
    total,
    hasMore: input.skip + tasks.length < total,
  };
}

export async function claimPrintTask(taskId: string, actorUserId: string) {
  const actor = await resolvePrintActor(actorUserId);
  const now = new Date();

  return db.$transaction(async (tx) => {
    const task = await tx.orderPrintTask.findUnique({
      where: { id: taskId },
      select: {
        id: true,
        status: true,
        assignedToId: true,
        closedAt: true,
        order: {
          select: {
            designTask: {
              select: {
                closedAt: true,
              },
            },
          },
        },
      },
    });

    if (!task) {
      throw new Error("Tarea de impresión no encontrada.");
    }

    if (!task.order.designTask?.closedAt) {
      throw new Error(
        "La impresión final se habilita cuando diseño está cerrado.",
      );
    }

    if (task.closedAt || task.status === "COMPLETED") {
      throw new Error("La tarea de impresión ya fue cerrada.");
    }

    if (task.assignedToId && task.assignedToId !== actor.profileId) {
      throw new Error("La tarea ya está asignada a otro responsable.");
    }

    const updatedTask = await tx.orderPrintTask.update({
      where: { id: taskId },
      data: {
        assignedToId: actor.profileId,
        assignedAt: now,
      },
    });

    await createPrintTaskEvent(tx, {
      taskId,
      eventType: "TASK_CLAIMED",
      actorId: actor.profileId,
      notes: "Tarea tomada desde la bandeja de impresión.",
    });

    return updatedTask;
  });
}

export async function updatePrintTaskStatus(
  input: z.infer<typeof updatePrintTaskStatusSchema>,
  actorUserId: string,
) {
  const actor = await resolvePrintActor(actorUserId);

  if (input.status === "COMPLETED") {
    throw new Error(
      "Debes usar la confirmación final para cerrar la impresión.",
    );
  }

  return db.$transaction(async (tx) => {
    const task = await tx.orderPrintTask.findUnique({
      where: { id: input.taskId },
      select: {
        id: true,
        status: true,
        closedAt: true,
        order: {
          select: {
            id: true,
            code: true,
            designTask: {
              select: {
                closedAt: true,
              },
            },
          },
        },
      },
    });

    if (!task) {
      throw new Error("Tarea de impresión no encontrada.");
    }

    if (!task.order.designTask?.closedAt) {
      throw new Error(
        "La impresión final se habilita cuando diseño está cerrado.",
      );
    }

    if (task.status === "COMPLETED" || task.closedAt) {
      throw new Error("La tarea de impresión ya está cerrada.");
    }

    if (task.status === input.status) {
      return tx.orderPrintTask.findUniqueOrThrow({
        where: { id: input.taskId },
      });
    }

    const updatedTask = await tx.orderPrintTask.update({
      where: { id: input.taskId },
      data: {
        status: input.status,
      },
    });

    const statusEvent = await createPrintTaskEvent(tx, {
      taskId: input.taskId,
      eventType: "STATUS_CHANGED",
      fromStatus: task.status,
      toStatus: input.status,
      actorId: actor.profileId,
      notes: input.notes?.trim() || null,
    });

    if (input.status === "IN_PROGRESS") {
      await createOrderNotifications(tx, {
        orderId: task.order.id,
        type: NotificationType.PRINT_STARTED,
        title: `Impresión iniciada para ${task.order.code}`,
        message: "La etapa de impresión final ya está en progreso.",
        actionPath: `/orders/${task.order.id}?tab=tracking`,
        sourceKey: `order:${task.order.id}:print:${statusEvent.id}`,
        metadata: {
          status: input.status,
        },
      });
    }

    return updatedTask;
  });
}

export async function addPrintEvidence(
  input: z.infer<typeof addPrintEvidenceSchema>,
  actorUserId: string,
) {
  const actor = await resolvePrintActor(actorUserId);

  return db.$transaction(async (tx) => {
    const task = await tx.orderPrintTask.findUnique({
      where: { orderId: input.orderId },
      select: {
        id: true,
        order: {
          select: {
            designTask: {
              select: {
                closedAt: true,
              },
            },
          },
        },
      },
    });

    if (!task) {
      throw new Error("No hay tarea de impresión asociada a esta orden.");
    }

    if (!task.order.designTask?.closedAt) {
      throw new Error(
        "La impresión final se habilita cuando diseño está cerrado.",
      );
    }

    return tx.orderPrintEvidence.create({
      data: {
        taskId: task.id,
        fileUrl: input.fileUrl,
        fileName: input.fileName,
        fileType: input.fileType,
        fileSize: input.fileSize,
        notes: input.notes || null,
        metadata: input.metadata || null,
        uploadedById: actor.profileId,
      },
    });
  });
}

export async function confirmFinalPrint(
  input: z.infer<typeof confirmFinalPrintSchema>,
  actorUserId: string,
) {
  const actor = await resolvePrintActor(actorUserId);

  return db.$transaction(async (tx) => {
    const task = await tx.orderPrintTask.findUnique({
      where: { orderId: input.orderId },
      select: {
        id: true,
        status: true,
        closedAt: true,
        order: {
          select: {
            id: true,
            code: true,
            designTask: {
              select: {
                closedAt: true,
              },
            },
          },
        },
      },
    });

    if (!task) {
      throw new Error("No hay tarea de impresión asociada a esta orden.");
    }

    if (!task.order.designTask?.closedAt) {
      throw new Error(
        "No puedes cerrar impresión mientras diseño esté abierto.",
      );
    }

    if (task.status === "COMPLETED" && task.closedAt) {
      return tx.orderPrintTask.findUniqueOrThrow({ where: { id: task.id } });
    }

    const now = new Date();
    const updatedTask = await tx.orderPrintTask.update({
      where: { id: task.id },
      data: {
        status: "COMPLETED",
        closedAt: now,
        completedAt: now,
        completedById: actor.profileId,
      },
    });

    const completionEvent = await createPrintTaskEvent(tx, {
      taskId: task.id,
      eventType: "FINAL_PRINT_CONFIRMED",
      fromStatus: task.status,
      toStatus: "COMPLETED",
      actorId: actor.profileId,
      notes: input.notes?.trim() || null,
    });

    await createOperationalWorkOrdersForPrintCompletion(tx, {
      orderId: task.order.id,
      printTaskId: task.id,
      printTaskCompletedAt: now,
      actorId: actor.profileId,
      source: "print-confirmation",
    });

    await createOrderNotifications(tx, {
      orderId: task.order.id,
      type: NotificationType.PRINT_COMPLETED,
      title: `Impresión completada para ${task.order.code}`,
      message: "La impresión final de tu orden fue confirmada como completada.",
      actionPath: `/orders/${task.order.id}?tab=tracking`,
      sourceKey: `order:${task.order.id}:print:${completionEvent.id}`,
      metadata: {
        status: "COMPLETED",
      },
    });

    return updatedTask;
  });
}

export async function getPrintTaskByOrder(orderId: string) {
  const task = await db.orderPrintTask.findUnique({
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
      completedBy: {
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
      evidences: {
        orderBy: { createdAt: "desc" },
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
      order: {
        select: {
          id: true,
          code: true,
          status: true,
          designTask: {
            select: {
              closedAt: true,
              designerApprovedProofVersion: true,
              clientApprovedProofVersion: true,
            },
          },
        },
      },
    },
  });

  if (!task) {
    return null;
  }

  return {
    ...task,
    isBlockedByDesign: !task.order.designTask?.closedAt,
  };
}
