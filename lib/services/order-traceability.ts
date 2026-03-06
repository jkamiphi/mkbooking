import { db } from "@/lib/db";
import { Prisma, type OperationalWorkOrderStatus } from "@prisma/client";

type PrismaClientLike = Prisma.TransactionClient | typeof db;

const OPEN_WORK_ORDER_STATUSES: OperationalWorkOrderStatus[] = [
  "PENDING_ASSIGNMENT",
  "ASSIGNED",
  "IN_PROGRESS",
  "PENDING_REVIEW",
  "REOPENED",
];

function toNumberOrNull(value: Prisma.Decimal | number | null | undefined) {
  if (value === null || value === undefined) {
    return null;
  }

  const numericValue = Number(value);
  return Number.isFinite(numericValue) ? numericValue : null;
}

function toIsoStringOrNull(value: Date | null | undefined) {
  return value ? value.toISOString() : null;
}

function resolveProfileDisplay(profile?: {
  id?: string | null;
  user?: { name: string | null; email: string } | null;
} | null) {
  return {
    id: profile?.id ?? null,
    name: profile?.user?.name ?? null,
    email: profile?.user?.email ?? null,
  };
}

function resolveStageFromOperationsSummary(summary: {
  hasOperationalWork: boolean;
  isOperationsClosed: boolean;
  activeWorkOrdersCount: number;
  pendingReviewCount: number;
  completedLineItemsCount: number;
  totalLineItems: number;
  issuedReportsCount: number;
}) {
  if (!summary.hasOperationalWork) {
    return "PENDIENTE";
  }

  if (summary.isOperationsClosed) {
    return "CERRADA";
  }

  if (summary.pendingReviewCount > 0) {
    return "EN_VALIDACION";
  }

  if (summary.activeWorkOrdersCount > 0) {
    return "EN_EJECUCION";
  }

  if (
    summary.completedLineItemsCount > 0 ||
    summary.issuedReportsCount > 0
  ) {
    return "VALIDADA_PARCIAL";
  }

  return "PENDIENTE";
}

function salesEventTitle(eventType: string) {
  if (eventType === "ORDER_APPROVED") return "Validación comercial aprobada";
  if (eventType === "ORDER_CHANGES_REQUESTED")
    return "Validación comercial requiere cambios";
  if (eventType === "DOCUMENT_APPROVED") return "Documento comercial aprobado";
  if (eventType === "DOCUMENT_CHANGES_REQUESTED")
    return "Documento comercial requiere cambios";
  if (eventType === "REVIEW_REQUIRED") return "Validación comercial activada";
  if (eventType === "CRITICAL_CHANGE") return "Cambios relevantes en la orden";
  return `Validación comercial · ${eventType}`;
}

function designEventTitle(eventType: string) {
  if (eventType === "TASK_CREATED") return "Flujo de diseño activado";
  if (eventType === "PROOF_UPLOADED") return "Prueba de diseño publicada";
  if (eventType === "CLIENT_APPROVED") return "Prueba aprobada por cliente";
  if (eventType === "CLIENT_CHANGES_REQUESTED")
    return "Cliente solicitó ajustes de diseño";
  if (eventType === "DESIGNER_APPROVED") return "Diseño validado internamente";
  if (eventType === "DESIGNER_CHANGES_REQUESTED")
    return "Diseño requirió ajustes internos";
  if (eventType === "STATUS_CHANGED") return "Estado de diseño actualizado";
  return `Diseño · ${eventType}`;
}

function printEventTitle(eventType: string) {
  if (eventType === "TASK_ACTIVATED") return "Impresión habilitada";
  if (eventType === "TASK_CLAIMED") return "Impresión asignada";
  if (eventType === "FINAL_PRINT_CONFIRMED")
    return "Impresión final confirmada";
  if (eventType === "REOPENED_BY_DESIGN")
    return "Impresión reabierta por cambios de diseño";
  if (eventType === "STATUS_CHANGED") return "Estado de impresión actualizado";
  return `Impresión · ${eventType}`;
}

function operationsEventTitle(eventType: string, faceCode: string) {
  if (eventType === "WORK_ORDER_CREATED")
    return `Instalación creada · Cara ${faceCode}`;
  if (eventType === "AUTO_ASSIGNED" || eventType === "MANUAL_REASSIGNED")
    return `Instalación asignada · Cara ${faceCode}`;
  if (eventType === "STATUS_CHANGED")
    return `Instalación en ejecución · Cara ${faceCode}`;
  if (eventType === "SUBMITTED_FOR_REVIEW")
    return `Instalación enviada a validación · Cara ${faceCode}`;
  if (eventType === "REVIEW_APPROVED")
    return `Instalación validada · Cara ${faceCode}`;
  if (eventType === "REOPENED_FOR_REWORK")
    return `Instalación reabierta · Cara ${faceCode}`;
  if (eventType === "CANCELLED_BY_PRINT_REOPEN")
    return `Instalación cancelada por reapertura · Cara ${faceCode}`;
  return `Instalación ${faceCode} · ${eventType}`;
}

async function findActorProfile(
  client: PrismaClientLike,
  profileId: string | null | undefined,
) {
  if (!profileId) {
    return null;
  }

  return client.userProfile.findUnique({
    where: { id: profileId },
    include: {
      user: {
        select: {
          name: true,
          email: true,
        },
      },
    },
  });
}

export async function supersedeIssuedInstallationReports(
  client: PrismaClientLike,
  input: {
    workOrderId: string;
    actorId?: string | null;
    supersededAt?: Date;
  },
) {
  const supersededAt = input.supersededAt ?? new Date();

  return client.orderOperationalInstallationReport.updateMany({
    where: {
      workOrderId: input.workOrderId,
      status: "ISSUED",
    },
    data: {
      status: "SUPERSEDED",
      supersededAt,
      supersededById: input.actorId ?? null,
    },
  });
}

export async function synchronizeOrderOperationalClosure(
  client: PrismaClientLike,
  input: {
    orderId: string;
    actorId?: string | null;
    changedAt?: Date;
  },
) {
  const changedAt = input.changedAt ?? new Date();
  const order = await client.order.findUnique({
    where: { id: input.orderId },
    select: {
      id: true,
      operationsClosedAt: true,
      operationsClosedById: true,
      caseFileArchivedAt: true,
      caseFileArchivedById: true,
      lineItems: {
        select: {
          id: true,
        },
      },
      operationalWorkOrders: {
        where: {
          status: {
            not: "CANCELLED",
          },
        },
        select: {
          id: true,
          lineItemId: true,
          status: true,
          installationReports: {
            where: {
              status: "ISSUED",
            },
            select: {
              id: true,
            },
          },
        },
      },
    },
  });

  if (!order) {
    throw new Error("Orden no encontrada para recalcular cierre operativo.");
  }

  const totalLineItems = order.lineItems.length;
  const activeWorkOrders = order.operationalWorkOrders.filter((workOrder) =>
    OPEN_WORK_ORDER_STATUSES.includes(workOrder.status),
  );
  const completedLineItemIds = new Set(
    order.operationalWorkOrders
      .filter(
        (workOrder) =>
          workOrder.status === "COMPLETED" &&
          workOrder.installationReports.length > 0,
      )
      .map((workOrder) => workOrder.lineItemId),
  );

  const shouldClose =
    totalLineItems > 0 &&
    activeWorkOrders.length === 0 &&
    completedLineItemIds.size === totalLineItems;

  if (shouldClose) {
    const operationsClosedAt = order.operationsClosedAt ?? changedAt;
    const operationsClosedById =
      order.operationsClosedById ?? input.actorId ?? null;
    const caseFileArchivedAt = order.caseFileArchivedAt ?? changedAt;
    const caseFileArchivedById =
      order.caseFileArchivedById ?? input.actorId ?? null;

    await client.order.update({
      where: { id: order.id },
      data: {
        operationsClosedAt,
        operationsClosedById,
        caseFileArchivedAt,
        caseFileArchivedById,
      },
    });

    return {
      isOperationsClosed: true,
      isCaseFileArchived: true,
      operationsClosedAt,
      caseFileArchivedAt,
    };
  }

  if (
    order.operationsClosedAt ||
    order.operationsClosedById ||
    order.caseFileArchivedAt ||
    order.caseFileArchivedById
  ) {
    await client.order.update({
      where: { id: order.id },
      data: {
        operationsClosedAt: null,
        operationsClosedById: null,
        caseFileArchivedAt: null,
        caseFileArchivedById: null,
      },
    });
  }

  return {
    isOperationsClosed: false,
    isCaseFileArchived: false,
    operationsClosedAt: null,
    caseFileArchivedAt: null,
  };
}

export async function issueOperationalInstallationReport(
  client: PrismaClientLike,
  input: {
    workOrderId: string;
    actorId?: string | null;
    reviewNotes?: string | null;
    issuedAt?: Date;
  },
) {
  const workOrder = await client.orderOperationalWorkOrder.findUnique({
    where: { id: input.workOrderId },
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
              code: true,
              address: true,
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
        orderBy: [{ receivedAt: "asc" }],
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
      installationReports: {
        orderBy: [{ version: "desc" }],
        take: 1,
        select: {
          version: true,
        },
      },
    },
  });

  if (!workOrder) {
    throw new Error("OT operativa no encontrada para emitir reporte.");
  }

  const issuedAt = input.issuedAt ?? new Date();
  const validator = await findActorProfile(client, input.actorId);
  const nextVersion = (workOrder.installationReports[0]?.version ?? 0) + 1;
  const requiredChecklistItems = workOrder.checklistItems.filter(
    (item) => item.isRequired,
  );
  const requiredChecklistCompleted = requiredChecklistItems.filter(
    (item) => item.isChecked,
  ).length;
  const validEvidenceCount = workOrder.evidences.filter(
    (evidence) => evidence.withinExpectedRadius === true,
  ).length;
  const overrideEvidenceCount = workOrder.evidences.filter((evidence) =>
    Boolean(evidence.geoOverrideReason),
  ).length;

  await supersedeIssuedInstallationReports(client, {
    workOrderId: workOrder.id,
    actorId: input.actorId ?? null,
    supersededAt: issuedAt,
  });

  const snapshot = {
    order: {
      id: workOrder.order.id,
      code: workOrder.order.code,
      clientName: workOrder.order.clientName ?? null,
      clientEmail: workOrder.order.clientEmail ?? null,
      organizationName: workOrder.order.organization?.name ?? null,
    },
    face: {
      id: workOrder.face.id,
      code: workOrder.face.code,
      assetCode: workOrder.face.asset.code,
      address: workOrder.face.asset.address,
      structureTypeName: workOrder.face.asset.structureType.name,
    },
    zone: {
      id: workOrder.zone.id,
      name: workOrder.zone.name,
      provinceName: workOrder.zone.province.name,
    },
    installer: resolveProfileDisplay(workOrder.assignedInstaller),
    validator: resolveProfileDisplay(validator),
    workflow: {
      assignedAt: toIsoStringOrNull(workOrder.assignedAt),
      startedAt: toIsoStringOrNull(workOrder.startedAt),
      submittedAt: toIsoStringOrNull(workOrder.submittedAt),
      completedAt: toIsoStringOrNull(issuedAt),
      validatedAt: toIsoStringOrNull(issuedAt),
      reopenCount: workOrder.reopenCount,
    },
    checklist: workOrder.checklistItems.map((item) => ({
      id: item.id,
      code: item.code,
      label: item.label,
      isRequired: item.isRequired,
      isChecked: item.isChecked,
      checkedAt: toIsoStringOrNull(item.checkedAt),
      checkedBy: resolveProfileDisplay(item.checkedBy),
    })),
    evidences: workOrder.evidences.map((evidence) => ({
      id: evidence.id,
      fileUrl: evidence.fileUrl,
      fileName: evidence.fileName,
      fileType: evidence.fileType,
      fileSize: evidence.fileSize,
      receivedAt: toIsoStringOrNull(evidence.receivedAt),
      capturedAt: toIsoStringOrNull(evidence.capturedAt),
      capturedLatitude: toNumberOrNull(evidence.capturedLatitude),
      capturedLongitude: toNumberOrNull(evidence.capturedLongitude),
      expectedLatitude: toNumberOrNull(evidence.expectedLatitude),
      expectedLongitude: toNumberOrNull(evidence.expectedLongitude),
      distanceMeters: toNumberOrNull(evidence.distanceMeters),
      withinExpectedRadius: evidence.withinExpectedRadius ?? null,
      radiusMeters: evidence.radiusMeters,
      geoOverrideReason: evidence.geoOverrideReason ?? null,
      uploadedBy: resolveProfileDisplay(evidence.uploadedBy),
      notes: evidence.notes ?? null,
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
    reviewNotes: input.reviewNotes?.trim() || null,
    issuedAt: toIsoStringOrNull(issuedAt),
  } satisfies Prisma.InputJsonValue;

  return client.orderOperationalInstallationReport.create({
    data: {
      orderId: workOrder.order.id,
      workOrderId: workOrder.id,
      version: nextVersion,
      status: "ISSUED",
      reviewNotes: input.reviewNotes?.trim() || null,
      snapshot,
      issuedAt,
      issuedById: input.actorId ?? null,
    },
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
  });
}

export async function getOrderOperationsSummary(
  orderId: string,
  client: PrismaClientLike = db,
) {
  const order = await client.order.findUnique({
    where: { id: orderId },
    select: {
      id: true,
      operationsClosedAt: true,
      caseFileArchivedAt: true,
      lineItems: {
        select: {
          id: true,
        },
      },
      operationalWorkOrders: {
        select: {
          id: true,
          lineItemId: true,
          status: true,
          closedAt: true,
          submittedAt: true,
          reopenCount: true,
          installationReports: {
            where: {
              status: "ISSUED",
            },
            select: {
              id: true,
              issuedAt: true,
              version: true,
            },
          },
        },
      },
    },
  });

  if (!order) {
    throw new Error("Orden no encontrada para resumen operativo.");
  }

  const activeWorkOrdersCount = order.operationalWorkOrders.filter((workOrder) =>
    OPEN_WORK_ORDER_STATUSES.includes(workOrder.status),
  ).length;
  const pendingReviewCount = order.operationalWorkOrders.filter(
    (workOrder) => workOrder.status === "PENDING_REVIEW",
  ).length;
  const completedWorkOrdersCount = order.operationalWorkOrders.filter(
    (workOrder) => workOrder.status === "COMPLETED",
  ).length;
  const cancelledWorkOrdersCount = order.operationalWorkOrders.filter(
    (workOrder) => workOrder.status === "CANCELLED",
  ).length;
  const reopenedWorkOrdersCount = order.operationalWorkOrders.filter(
    (workOrder) => workOrder.reopenCount > 0,
  ).length;
  const currentIssuedReports = order.operationalWorkOrders.flatMap((workOrder) =>
    workOrder.installationReports,
  );
  const completedLineItemsCount = new Set(
    order.operationalWorkOrders
      .filter(
        (workOrder) =>
          workOrder.status === "COMPLETED" &&
          workOrder.installationReports.length > 0,
      )
      .map((workOrder) => workOrder.lineItemId),
  ).size;
  const latestIssuedReportAt = currentIssuedReports.reduce<Date | null>(
    (latest, report) =>
      !latest || report.issuedAt > latest ? report.issuedAt : latest,
    null,
  );

  const summary = {
    hasOperationalWork: order.operationalWorkOrders.length > 0,
    totalLineItems: order.lineItems.length,
    totalWorkOrders: order.operationalWorkOrders.length,
    activeWorkOrdersCount,
    pendingReviewCount,
    completedWorkOrdersCount,
    cancelledWorkOrdersCount,
    reopenedWorkOrdersCount,
    issuedReportsCount: currentIssuedReports.length,
    completedLineItemsCount,
    latestIssuedReportAt,
    isOperationsClosed: Boolean(order.operationsClosedAt),
    isCaseFileArchived: Boolean(order.caseFileArchivedAt),
  };

  return {
    ...summary,
    installationStage: resolveStageFromOperationsSummary(summary),
  };
}

export async function getOrderTraceability(
  orderId: string,
  options?: {
    includeInternalDetails?: boolean;
  },
) {
  const includeInternalDetails = options?.includeInternalDetails ?? false;
  const order = await db.order.findUnique({
    where: { id: orderId },
    include: {
      organization: true,
      companyConfirmBy: {
        include: {
          user: {
            select: {
              name: true,
              email: true,
            },
          },
        },
      },
      salesReviewBy: {
        include: {
          user: {
            select: {
              name: true,
              email: true,
            },
          },
        },
      },
      salesReviewEvents: {
        orderBy: [{ createdAt: "desc" }],
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
      lineItems: {
        select: {
          id: true,
          face: {
            select: {
              id: true,
              code: true,
              asset: {
                select: {
                  code: true,
                  address: true,
                  structureType: {
                    select: {
                      name: true,
                    },
                  },
                  zone: {
                    select: {
                      name: true,
                      province: {
                        select: {
                          name: true,
                        },
                      },
                    },
                  },
                },
              },
              catalogFace: {
                select: {
                  title: true,
                },
              },
            },
          },
        },
      },
      purchaseOrders: {
        orderBy: [{ createdAt: "desc" }],
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
        },
      },
      creatives: {
        orderBy: [{ createdAt: "desc" }],
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
          lineItem: {
            select: {
              id: true,
              face: {
                select: {
                  code: true,
                },
              },
            },
          },
        },
      },
      designTask: {
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
          events: {
            orderBy: [{ createdAt: "desc" }],
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
      },
      printTask: {
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
            orderBy: [{ createdAt: "desc" }],
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
            orderBy: [{ createdAt: "desc" }],
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
        },
      },
      operationalWorkOrders: {
        orderBy: [{ createdAt: "asc" }],
        include: {
          face: {
            select: {
              code: true,
              asset: {
                select: {
                  code: true,
                  address: true,
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
              name: true,
              province: {
                select: {
                  name: true,
                },
              },
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
          checklistItems: {
            orderBy: [{ createdAt: "asc" }],
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
            orderBy: [{ createdAt: "desc" }],
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
        },
      },
      operationsClosedBy: {
        include: {
          user: {
            select: {
              name: true,
              email: true,
            },
          },
        },
      },
      caseFileArchivedBy: {
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
  });

  if (!order) {
    throw new Error("Orden no encontrada.");
  }

  const operationsSummary = await getOrderOperationsSummary(orderId);
  const installationReports = order.operationalWorkOrders.flatMap((workOrder) =>
    workOrder.installationReports.map((report) => ({
      id: report.id,
      workOrderId: workOrder.id,
      lineItemId: workOrder.lineItemId,
      faceCode: workOrder.face.code,
      assetCode: workOrder.face.asset.code,
      zoneName: workOrder.zone.name,
      provinceName: workOrder.zone.province.name,
      status: report.status,
      version: report.version,
      issuedAt: report.issuedAt,
      reviewNotes: includeInternalDetails ? report.reviewNotes : null,
      issuedBy: resolveProfileDisplay(report.issuedBy),
      supersededAt: report.supersededAt,
      snapshot: report.snapshot,
    })),
  );

  const operationsTimeline = order.operationalWorkOrders.flatMap((workOrder) => {
    const reportEvents = workOrder.installationReports
      .filter((report) => report.status === "ISSUED")
      .map((report) => ({
        id: `report-${report.id}`,
        domain: "OPERATIONS" as const,
        title: `Reporte de instalación emitido · Cara ${workOrder.face.code}`,
        occurredAt: report.issuedAt,
        actor: resolveProfileDisplay(report.issuedBy),
        notes: includeInternalDetails ? report.reviewNotes : null,
      }));

    const workOrderEvents = workOrder.events
      .filter((event) => {
        if (includeInternalDetails) {
          return true;
        }

        return (
          event.eventType === "SUBMITTED_FOR_REVIEW" ||
          event.eventType === "REVIEW_APPROVED"
        );
      })
      .map((event) => ({
        id: event.id,
        domain: "OPERATIONS" as const,
        title: operationsEventTitle(event.eventType, workOrder.face.code),
        occurredAt: event.createdAt,
        actor: resolveProfileDisplay(event.actor),
        notes: includeInternalDetails ? event.notes : null,
      }));

    return [...reportEvents, ...workOrderEvents];
  });

  const consolidatedTimeline = [
    ...(order.companyConfirmedAt
      ? [
          {
            id: `order-confirmed-${order.id}`,
            domain: "ORDER" as const,
            title: "Orden confirmada",
            occurredAt: order.companyConfirmedAt,
            actor: resolveProfileDisplay(order.companyConfirmBy),
            notes: null,
          },
        ]
      : []),
    ...order.salesReviewEvents
      .filter((event) => {
        if (includeInternalDetails) {
          return true;
        }

        return (
          event.eventType === "ORDER_APPROVED" ||
          event.eventType === "ORDER_CHANGES_REQUESTED" ||
          event.eventType === "DOCUMENT_APPROVED" ||
          event.eventType === "DOCUMENT_CHANGES_REQUESTED"
        );
      })
      .map((event) => ({
        id: event.id,
        domain: "SALES" as const,
        title: salesEventTitle(event.eventType),
        occurredAt: event.createdAt,
        actor: resolveProfileDisplay(event.actor),
        notes: includeInternalDetails ? event.notes : null,
      })),
    ...(order.designTask?.events
      .filter((event) => {
        if (includeInternalDetails) {
          return true;
        }

        return (
          event.eventType === "PROOF_UPLOADED" ||
          event.eventType === "CLIENT_APPROVED" ||
          event.eventType === "CLIENT_CHANGES_REQUESTED"
        );
      })
      .map((event) => ({
        id: event.id,
        domain: "DESIGN" as const,
        title: designEventTitle(event.eventType),
        occurredAt: event.createdAt,
        actor: resolveProfileDisplay(event.actor),
        notes: includeInternalDetails ? event.notes : null,
      })) ?? []),
    ...(order.printTask?.events
      .filter((event) => {
        if (includeInternalDetails) {
          return true;
        }

        return event.eventType === "FINAL_PRINT_CONFIRMED";
      })
      .map((event) => ({
        id: event.id,
        domain: "PRINT" as const,
        title: printEventTitle(event.eventType),
        occurredAt: event.createdAt,
        actor: resolveProfileDisplay(event.actor),
        notes: includeInternalDetails ? event.notes : null,
      })) ?? []),
    ...operationsTimeline,
    ...(order.caseFileArchivedAt
      ? [
          {
            id: `case-file-${order.id}`,
            domain: "CASE_FILE" as const,
            title: "Expediente archivado",
            occurredAt: order.caseFileArchivedAt,
            actor: resolveProfileDisplay(order.caseFileArchivedBy),
            notes: null,
          },
        ]
      : []),
  ].sort((left, right) => right.occurredAt.getTime() - left.occurredAt.getTime());

  const stages = [
    {
      id: "order",
      title: "Orden",
      status:
        order.status === "CONFIRMED"
          ? "CONFIRMADA"
          : order.status === "CANCELLED"
            ? "CANCELADA"
            : "EN_PROCESO",
      updatedAt: order.companyConfirmedAt ?? order.updatedAt,
    },
    {
      id: "sales",
      title: "Validación Comercial",
      status: order.salesReviewStatus,
      updatedAt: order.salesReviewUpdatedAt ?? order.updatedAt,
    },
    {
      id: "design",
      title: "Diseño",
      status: order.designTask?.closedAt ? "CERRADO" : order.designTask?.status ?? "PENDIENTE",
      updatedAt: order.designTask?.updatedAt ?? null,
    },
    {
      id: "print",
      title: "Impresión",
      status: order.printTask?.status ?? "PENDIENTE",
      updatedAt: order.printTask?.updatedAt ?? null,
    },
    {
      id: "installation",
      title: "Instalación",
      status: operationsSummary.installationStage,
      updatedAt:
        operationsSummary.latestIssuedReportAt ??
        order.operationalWorkOrders.reduce<Date | null>(
          (latest, workOrder) =>
            !latest || workOrder.updatedAt > latest ? workOrder.updatedAt : latest,
          null,
        ),
    },
    {
      id: "case-file",
      title: "Expediente",
      status: order.caseFileArchivedAt ? "ARCHIVADO" : "PENDIENTE",
      updatedAt: order.caseFileArchivedAt ?? null,
    },
  ];

  return {
    order: {
      id: order.id,
      code: order.code,
      clientName: order.clientName,
      clientEmail: order.clientEmail,
      organizationName: order.organization?.name ?? null,
      operationsClosedAt: order.operationsClosedAt,
      caseFileArchivedAt: order.caseFileArchivedAt,
      operationsClosedBy: resolveProfileDisplay(order.operationsClosedBy),
      caseFileArchivedBy: resolveProfileDisplay(order.caseFileArchivedBy),
    },
    stages,
    operationsSummary,
    timeline: consolidatedTimeline,
    workOrders: order.operationalWorkOrders.map((workOrder) => ({
      id: workOrder.id,
      lineItemId: workOrder.lineItemId,
      faceCode: workOrder.face.code,
      assetCode: workOrder.face.asset.code,
      structureTypeName: workOrder.face.asset.structureType.name,
      address: workOrder.face.asset.address,
      zoneName: workOrder.zone.name,
      provinceName: workOrder.zone.province.name,
      status: workOrder.status,
      assignedInstaller: resolveProfileDisplay(workOrder.assignedInstaller),
      reviewedBy: resolveProfileDisplay(workOrder.reviewedBy),
      assignedAt: workOrder.assignedAt,
      startedAt: workOrder.startedAt,
      submittedAt: workOrder.submittedAt,
      completedAt: workOrder.completedAt,
      reviewedAt: workOrder.reviewedAt,
      reopenCount: workOrder.reopenCount,
      lastReopenReason: includeInternalDetails
        ? workOrder.lastReopenReason
        : null,
      reports: workOrder.installationReports.map((report) => ({
        id: report.id,
        status: report.status,
        version: report.version,
        issuedAt: report.issuedAt,
        issuedBy: resolveProfileDisplay(report.issuedBy),
        supersededAt: report.supersededAt,
        reviewNotes: includeInternalDetails ? report.reviewNotes : null,
        snapshot: report.snapshot,
      })),
    })),
    reports: installationReports,
    caseFile: {
      purchaseOrders: order.purchaseOrders.map((purchaseOrder) => ({
        id: purchaseOrder.id,
        fileUrl: purchaseOrder.fileUrl,
        fileName: purchaseOrder.fileName,
        fileType: purchaseOrder.fileType,
        fileSize: purchaseOrder.fileSize,
        version: purchaseOrder.version,
        reviewStatus: purchaseOrder.reviewStatus,
        createdAt: purchaseOrder.createdAt,
        reviewedAt: purchaseOrder.reviewedAt,
        reviewNotes: includeInternalDetails ? purchaseOrder.reviewNotes : null,
        uploadedBy: resolveProfileDisplay(purchaseOrder.uploadedBy),
        reviewedBy: resolveProfileDisplay(purchaseOrder.reviewedBy),
      })),
      clientArtworks: order.creatives
        .filter((creative) => creative.creativeKind === "CLIENT_ARTWORK")
        .map((creative) => ({
          id: creative.id,
          fileUrl: creative.fileUrl,
          fileName: creative.fileName,
          fileType: creative.fileType,
          fileSize: creative.fileSize,
          version: creative.version,
          status: creative.status,
          createdAt: creative.createdAt,
          lineItemId: creative.lineItemId,
          faceCode: creative.lineItem?.face?.code ?? null,
          notes: creative.notes,
          uploadedBy: resolveProfileDisplay(creative.uploadedBy),
          reviewedBy: resolveProfileDisplay(creative.reviewedBy),
          reviewedAt: creative.reviewedAt,
        })),
      designProofs: order.creatives
        .filter((creative) => creative.creativeKind === "DESIGN_PROOF")
        .map((creative) => ({
          id: creative.id,
          fileUrl: creative.fileUrl,
          fileName: creative.fileName,
          fileType: creative.fileType,
          fileSize: creative.fileSize,
          version: creative.version,
          status: creative.status,
          createdAt: creative.createdAt,
          notes: creative.notes,
          uploadedBy: resolveProfileDisplay(creative.uploadedBy),
          reviewedBy: resolveProfileDisplay(creative.reviewedBy),
          reviewedAt: creative.reviewedAt,
        })),
      printEvidences:
        order.printTask?.evidences.map((evidence) => ({
          id: evidence.id,
          fileUrl: evidence.fileUrl,
          fileName: evidence.fileName,
          fileType: evidence.fileType,
          fileSize: evidence.fileSize,
          createdAt: evidence.createdAt,
          notes: evidence.notes,
          uploadedBy: resolveProfileDisplay(evidence.uploadedBy),
        })) ?? [],
      operationalEvidences: includeInternalDetails
        ? order.operationalWorkOrders.flatMap((workOrder) =>
            workOrder.evidences.map((evidence) => ({
              id: evidence.id,
              workOrderId: workOrder.id,
              faceCode: workOrder.face.code,
              fileUrl: evidence.fileUrl,
              fileName: evidence.fileName,
              fileType: evidence.fileType,
              fileSize: evidence.fileSize,
              receivedAt: evidence.receivedAt,
              distanceMeters: toNumberOrNull(evidence.distanceMeters),
              withinExpectedRadius: evidence.withinExpectedRadius,
              geoOverrideReason: evidence.geoOverrideReason,
              uploadedBy: resolveProfileDisplay(evidence.uploadedBy),
            })),
          )
        : [],
      installationReports: installationReports.filter(
        (report) => includeInternalDetails || report.status === "ISSUED",
      ),
    },
  };
}
