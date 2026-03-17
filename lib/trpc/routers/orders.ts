import { z } from "zod";
import {
  router,
  protectedProcedure,
  commercialProcedure,
  salesReviewProcedure,
  designProcedure,
} from "../init";
import { db } from "@/lib/db";
import { TRPCError } from "@trpc/server";
import {
  OrderStatus,
  CreativeStatus,
  CreativeSourceType,
  Prisma,
  SalesReviewResult,
  SalesReviewStatus,
  PurchaseOrderReviewStatus,
  SystemRole,
} from "@prisma/client";
import {
  calculateOrderTotals,
  recalculateOrderTotals,
} from "@/lib/services/order-financials";
import {
  createSalesReviewEvent,
  notifySalesReviewReopened,
  reopenOrderSalesReview,
  resolveDocumentEventType,
  resolveOrderEventType,
  resolveSalesReviewActor,
} from "@/lib/services/sales-review";
import {
  activateDesignTaskAfterSalesApproval,
  canUserAccessOrder,
  onClientArtworkUploaded,
} from "@/lib/services/design-task";
import {
  createOrderNotifications,
  NotificationType,
  sendPreparedNotificationEmails,
} from "@/lib/services/notifications";
import {
  getOrderOperationsSummary,
  getOrderTraceability,
} from "@/lib/services/order-traceability";
import { resolveEffectivePriceRuleMapForFaces } from "@/lib/services/catalog";
import {
  listAccessibleOrganizationIdsForUser,
  resolveActiveOrganizationContextForUser,
  resolveOrganizationOperationScope,
} from "@/lib/services/organization-access";

function resolveOrderDays(fromDate: Date | null, toDate: Date | null) {
  if (!fromDate || !toDate) return 30;

  const start = new Date(fromDate);
  const end = new Date(toDate);

  if (!Number.isFinite(start.getTime()) || !Number.isFinite(end.getTime())) {
    return 30;
  }

  return Math.max(
    1,
    Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1,
  );
}

function faceMatchesRequestCriteria(
  request: { zoneId?: string | null; structureTypeId?: string | null },
  face: { asset: { zoneId: string; structureTypeId: string } },
) {
  const matchesZone = !request.zoneId || request.zoneId === face.asset.zoneId;
  const matchesStructure =
    !request.structureTypeId ||
    request.structureTypeId === face.asset.structureTypeId;

  return matchesZone && matchesStructure;
}

async function resolveSystemRole(userId: string): Promise<SystemRole | null> {
  const profile = await db.userProfile.findUnique({
    where: { userId },
    select: { systemRole: true },
  });

  return profile?.systemRole ?? null;
}

function isInternalOrderViewerRole(systemRole: SystemRole | null) {
  return Boolean(
    systemRole &&
      [
        "SUPERADMIN",
        "STAFF",
        "DESIGNER",
        "SALES",
        "OPERATIONS_PRINT",
      ].includes(systemRole),
  );
}

async function assertOrderReadAccess(
  userId: string,
  orderId: string,
  activeContextKey?: string | null,
) {
  const systemRole = await resolveSystemRole(userId);
  if (
    systemRole &&
    ["SUPERADMIN", "STAFF", "DESIGNER", "SALES", "OPERATIONS_PRINT"].includes(
      systemRole,
    )
  ) {
    return;
  }

  const hasAccess = await canUserAccessOrder(userId, orderId, activeContextKey);
  if (!hasAccess) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "No tienes acceso a esta orden.",
    });
  }
}

export const ordersRouter = router({
  generateFromRequest: commercialProcedure
    .input(
      z.object({
        requestId: z.string(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const { requestId } = input;
      const { user } = ctx;

      const userProfile = await db.userProfile.findUnique({
        where: { userId: user.id },
      });

      if (!userProfile) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "User profile not found",
        });
      }

      const request = await db.campaignRequest.findUnique({
        where: { id: requestId },
        include: {
          assignments: {
            include: {
              face: {
                include: {
                  asset: {
                    select: {
                      zoneId: true,
                      structureTypeId: true,
                    },
                  },
                  catalogFace: {
                    include: {
                      priceRules: {
                        where: { isActive: true },
                      },
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
          },
        },
      });

      if (!request) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Request not found",
        });
      }

      if (request.status !== "IN_REVIEW") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message:
            "Request must be in IN_REVIEW state to generate a quotation.",
        });
      }

      const days = resolveOrderDays(request.fromDate, request.toDate);
      let currency = "USD";
      const priceRuleMap = await resolveEffectivePriceRuleMapForFaces(
        request.assignments.map((assignment) => ({
          id: assignment.faceId,
          asset: {
            zoneId: assignment.face.asset.zoneId,
            structureTypeId: assignment.face.asset.structureTypeId,
          },
        })),
        request.organizationId ?? undefined,
      );

      const lineItemsData = request.assignments.map((assignment) => {
        const priceRule = priceRuleMap.get(assignment.faceId) ?? null;
        const dailyRate = priceRule ? Number(priceRule.priceDaily) : 0;
        const lineSubtotal = dailyRate * days;
        if (priceRule?.currency) currency = priceRule.currency;

        return {
          faceId: assignment.faceId,
          priceDaily: dailyRate,
          days,
          subtotal: lineSubtotal,
        };
      });

      if (currency === "USD" && request.services.length > 0) {
        const serviceCurrency = request.services[0].service?.currency;
        if (serviceCurrency) {
          currency = serviceCurrency;
        }
      }

      const serviceItemsData = request.services.map((requestService) => {
        const quantity = Math.max(1, requestService.quantity);
        const unitPrice = Number(requestService.unitPrice);
        return {
          requestServiceId: requestService.id,
          serviceId: requestService.serviceId,
          serviceCodeSnapshot: requestService.service?.code || null,
          serviceNameSnapshot:
            requestService.service?.name || "Servicio adicional",
          quantity,
          unitPrice,
          subtotal: quantity * unitPrice,
          notes: requestService.notes || null,
        };
      });

      const lineItemsSubtotal = lineItemsData.reduce(
        (acc, item) => acc + item.subtotal,
        0,
      );
      const serviceItemsSubtotal = serviceItemsData.reduce(
        (acc, item) => acc + item.subtotal,
        0,
      );
      const totals = calculateOrderTotals({
        lineItemsSubtotal,
        serviceItemsSubtotal,
      });

      const assignedCount = request.assignments.length;
      const requestedCount = request.quantity;
      const outsideCriteriaCount = request.assignments.filter(
        (assignment) => !faceMatchesRequestCriteria(request, assignment.face),
      ).length;
      const warnings = {
        partialAssignment: assignedCount < requestedCount,
        requestedCount,
        assignedCount,
        outsideCriteriaCount,
      };

      const order = await db.$transaction(async (tx) => {
        const newOrder = await tx.order.create({
          data: {
            campaignRequestId: request.id,
            organizationId: request.organizationId,
            actingAgencyOrganizationId: request.actingAgencyOrganizationId,
            createdById: userProfile.id,
            clientName: request.contactName,
            clientEmail: request.contactEmail,
            currency,
            subTotal: totals.subTotal,
            tax: totals.tax,
            total: totals.total,
            fromDate: request.fromDate,
            toDate: request.toDate,
            status: "DRAFT",
            notes:
              "Cotización generada automáticamente desde la solicitud de campaña.",
            lineItems: {
              create: lineItemsData,
            },
            serviceItems: {
              create: serviceItemsData,
            },
          },
        });

        await tx.campaignRequest.update({
          where: { id: request.id },
          data: { status: "QUOTATION_GENERATED" },
        });

        return newOrder;
      });

      return {
        order,
        warnings,
      };
    }),

  list: commercialProcedure
    .input(
      z.object({
        status: z.nativeEnum(OrderStatus).optional(),
        skip: z.number().default(0),
        take: z.number().default(50),
      }),
    )
    .query(async ({ input }) => {
      const { status, skip, take } = input;
      const where = status ? { status } : {};

      const [orders, total] = await Promise.all([
        db.order.findMany({
          where,
          include: {
            organization: true,
            createdBy: {
              include: { user: true },
            },
            lineItems: true,
            serviceItems: true,
          },
          skip,
          take,
          orderBy: { createdAt: "desc" },
        }),
        db.order.count({ where }),
      ]);

      return { orders, total };
    }),

  mine: protectedProcedure
    .input(
      z.object({
        status: z.nativeEnum(OrderStatus).optional(),
        skip: z.number().default(0),
        take: z.number().default(50),
      }),
    )
    .query(async ({ input, ctx }) => {
      const { status, skip, take } = input;
      const { user } = ctx;

      const { activeContext } = await resolveActiveOrganizationContextForUser(
        user.id,
        ctx.activeOrganizationContextKey,
      );
      const scope = resolveOrganizationOperationScope(activeContext);
      const userProfile = await db.userProfile.findUnique({
        where: { userId: user.id },
        select: { id: true },
      });

      const where: Prisma.OrderWhereInput = {
        ...(status ? { status } : { status: { not: OrderStatus.DRAFT } }),
      };

      if (scope) {
        where.organizationId = scope.organizationId;
        if (scope.requiresActingAgencyMatch) {
          where.actingAgencyOrganizationId = scope.actingAgencyOrganizationId;
        }
      } else {
        const orgIds = await listAccessibleOrganizationIdsForUser(user.id);
        const orConditions: Prisma.OrderWhereInput[] = [];
        if (userProfile) orConditions.push({ createdById: userProfile.id });
        if (orgIds.length > 0) {
          orConditions.push({ organizationId: { in: orgIds } });
        }

        if (orConditions.length > 0) {
          where.OR = orConditions;
        } else {
          return { orders: [], total: 0 };
        }
      }

      const [orders, total] = await Promise.all([
        db.order.findMany({
          where,
          include: {
            organization: true,
            actingAgencyOrganization: true,
            lineItems: true,
            serviceItems: true,
          },
          skip,
          take,
          orderBy: { createdAt: "desc" },
        }),
        db.order.count({ where }),
      ]);

      return { orders, total };
    }),

  get: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input, ctx }) => {
      await assertOrderReadAccess(
        ctx.user.id,
        input.id,
        ctx.activeOrganizationContextKey,
      );

      const order = await db.order.findUnique({
        where: { id: input.id },
        include: {
          lineItems: {
            include: {
              face: {
                include: {
                  asset: {
                    include: {
                      structureType: true,
                      zone: { include: { province: true } },
                    },
                  },
                  catalogFace: true,
                },
              },
            },
          },
          serviceItems: {
            include: {
              service: true,
              requestService: {
                include: {
                  service: true,
                },
              },
            },
          },
          organization: true,
          campaignRequest: true,
          companyConfirmBy: true,
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
          designTask: {
            select: {
              status: true,
              closedAt: true,
              designerApprovedProofVersion: true,
              clientApprovedProofVersion: true,
              updatedAt: true,
            },
          },
          printTask: {
            select: {
              status: true,
              closedAt: true,
              completedAt: true,
              updatedAt: true,
            },
          },
        },
      });

      if (!order) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Order not found" });
      }

      const operationsSummary = await getOrderOperationsSummary(input.id);

      return {
        ...order,
        operationsSummary,
      };
    }),

  getTraceability: protectedProcedure
    .input(z.object({ orderId: z.string() }))
    .query(async ({ input, ctx }) => {
      await assertOrderReadAccess(
        ctx.user.id,
        input.orderId,
        ctx.activeOrganizationContextKey,
      );

      const systemRole = await resolveSystemRole(ctx.user.id);

      try {
        return await getOrderTraceability(input.orderId, {
          includeInternalDetails: isInternalOrderViewerRole(systemRole),
        });
      } catch (error) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message:
            error instanceof Error
              ? error.message
              : "No se pudo cargar la trazabilidad de la orden.",
        });
      }
    }),

  updateLineItem: commercialProcedure
    .input(
      z.object({
        orderId: z.string(),
        lineItemId: z.string(),
        priceDaily: z.number().min(0),
        days: z.number().min(1).int(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const { orderId, lineItemId, priceDaily, days } = input;
      const actor = await resolveSalesReviewActor(ctx.user.id);

      const order = await db.order.findUnique({
        where: { id: orderId },
        select: { id: true, code: true, status: true },
      });

      if (!order || order.status !== "DRAFT") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Solo se pueden editar órdenes en estado Borrador (DRAFT).",
        });
      }

      const itemToUpdate = await db.orderLineItem.findUnique({
        where: { id: lineItemId },
        select: { id: true, orderId: true },
      });
      if (!itemToUpdate) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Item no encontrado",
        });
      }
      if (itemToUpdate.orderId !== orderId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "El item no pertenece a la orden indicada.",
        });
      }

      const newSubtotal = priceDaily * days;
      let reopenedOrderCode = order.code;

      await db.$transaction(async (tx) => {
        await tx.orderLineItem.update({
          where: { id: lineItemId },
          data: {
            priceDaily,
            days,
            subtotal: newSubtotal,
          },
        });

        await recalculateOrderTotals(tx, orderId);

        const reopened = await reopenOrderSalesReview(tx, {
          orderId,
          actorId: actor.profileId,
          notes: "Se actualizaron montos de renta en el borrador.",
          eventType: "CRITICAL_CHANGE",
          targetType: "ORDER",
          metadata: {
            lineItemId,
            priceDaily,
            days,
          },
        });
        reopenedOrderCode = reopened.code;
      });

      await notifySalesReviewReopened({
        orderId,
        orderCode: reopenedOrderCode,
        eventType: "CRITICAL_CHANGE",
        actorName: actor.fullName,
        reason: "Cambio en montos o días de una cara en borrador.",
      });

      return { success: true };
    }),

  updateServiceItem: commercialProcedure
    .input(
      z.object({
        orderId: z.string(),
        serviceItemId: z.string(),
        quantity: z.number().int().min(1).max(999),
        unitPrice: z.number().min(0),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const { orderId, serviceItemId, quantity, unitPrice } = input;
      const actor = await resolveSalesReviewActor(ctx.user.id);

      const order = await db.order.findUnique({
        where: { id: orderId },
        select: { id: true, code: true, status: true },
      });

      if (!order || order.status !== "DRAFT") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Solo se pueden editar servicios en órdenes DRAFT.",
        });
      }

      const serviceItem = await db.orderServiceItem.findUnique({
        where: { id: serviceItemId },
        select: { id: true, orderId: true },
      });

      if (!serviceItem) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Servicio no encontrado en la orden.",
        });
      }

      if (serviceItem.orderId !== orderId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "El servicio no pertenece a la orden indicada.",
        });
      }

      let reopenedOrderCode = order.code;

      await db.$transaction(async (tx) => {
        await tx.orderServiceItem.update({
          where: { id: serviceItemId },
          data: {
            quantity,
            unitPrice,
            subtotal: quantity * unitPrice,
          },
        });

        await recalculateOrderTotals(tx, orderId);

        const reopened = await reopenOrderSalesReview(tx, {
          orderId,
          actorId: actor.profileId,
          notes: "Se actualizaron servicios facturables en el borrador.",
          eventType: "CRITICAL_CHANGE",
          targetType: "ORDER",
          metadata: {
            serviceItemId,
            quantity,
            unitPrice,
          },
        });
        reopenedOrderCode = reopened.code;
      });

      await notifySalesReviewReopened({
        orderId,
        orderCode: reopenedOrderCode,
        eventType: "CRITICAL_CHANGE",
        actorName: actor.fullName,
        reason: "Cambio en cantidad o precio de servicio facturable.",
      });

      return { success: true };
    }),

  sendQuotation: commercialProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input }) => {
      const order = await db.order.findUnique({ where: { id: input.id } });

      if (!order || order.status !== "DRAFT") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Solo los borradores pueden ser enviados como cotización.",
        });
      }

      return db.$transaction(async (tx) => {
        const updatedOrder = await tx.order.update({
          where: { id: order.id },
          data: {
            status: "QUOTATION_SENT",
          },
        });

        if (order.campaignRequestId) {
          await tx.campaignRequest.update({
            where: { id: order.campaignRequestId },
            data: { status: "PROPOSAL_SENT" },
          });
        }

        return updatedOrder;
      });
    }),

  clientApprove: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input }) => {
      const order = await db.order.findUnique({
        where: { id: input.id },
      });

      if (!order) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Order not found" });
      }

      if (order.status !== "DRAFT" && order.status !== "QUOTATION_SENT") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Orden no puede ser aprobada en su estado actual",
        });
      }

      return db.order.update({
        where: { id: order.id },
        data: {
          status: "CLIENT_APPROVED",
          clientApprovedAt: new Date(),
        },
      });
    }),

  companyConfirm: commercialProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const { user } = ctx;

      const userProfile = await db.userProfile.findUnique({
        where: { userId: user.id },
      });

      if (!userProfile) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "User profile not found",
        });
      }

      const order = await db.order.findUnique({
        where: { id: input.id },
        include: {
          lineItems: true,
        },
      });

      if (!order) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Order not found" });
      }

      if (order.status !== "CLIENT_APPROVED") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "La orden debe ser aprobada por el cliente primero",
        });
      }
      const now = new Date();
      // Default 30 days hold if order has no explicit dates
      const expiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

      const result = await db.$transaction(async (tx) => {
        let createdHolds = 0;
        let skippedActiveHolds = 0;

        for (const item of order.lineItems) {
          const catalogFace = await tx.catalogFace.upsert({
            where: { faceId: item.faceId },
            create: { faceId: item.faceId },
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
              organizationId: order.organizationId,
              createdById: userProfile.id,
              status: "ACTIVE",
              expiresAt: order.toDate || expiresAt,
            },
          });
          createdHolds += 1;
        }

        const confirmedOrder = await tx.order.update({
          where: { id: order.id },
          data: {
            status: "CONFIRMED",
            companyConfirmedAt: now,
            companyConfirmedById: userProfile.id,
          },
        });

        if (order.campaignRequestId) {
          await tx.campaignRequest.update({
            where: { id: order.campaignRequestId },
            data: { status: "CONFIRMED" },
          });
        }

        const notificationResult = await createOrderNotifications(tx, {
          orderId: order.id,
          type: NotificationType.ORDER_CONFIRMED,
          title: `Orden ${order.code} confirmada`,
          message:
            "Tu orden fue confirmada. Seguimos con validación comercial, diseño e impresión.",
          actionPath: `/orders/${order.id}?tab=tracking`,
          sourceKey: `order:${order.id}:confirmed`,
          metadata: {
            orderCode: order.code,
          },
        });

        return {
          order: confirmedOrder,
          createdHolds,
          skippedActiveHolds,
          emailDeliveries: notificationResult.emailDeliveries,
        };
      });

      await sendPreparedNotificationEmails(result.emailDeliveries);

      return {
        order: result.order,
        createdHolds: result.createdHolds,
        skippedActiveHolds: result.skippedActiveHolds,
      };
    }),

  updateStatus: commercialProcedure
    .input(
      z.object({
        id: z.string(),
        status: z.nativeEnum(OrderStatus),
      }),
    )
    .mutation(async ({ input }) => {
      // Basic status update. Deeper flow (like confirming -> creating holds) needs more complex logic
      return db.order.update({
        where: { id: input.id },
        data: { status: input.status },
      });
    }),

  getCreatives: protectedProcedure
    .input(z.object({ orderId: z.string() }))
    .query(async ({ input, ctx }) => {
      await assertOrderReadAccess(
        ctx.user.id,
        input.orderId,
        ctx.activeOrganizationContextKey,
      );

      const creatives = await db.orderCreative.findMany({
        where: { orderId: input.orderId },
        include: {
          uploadedBy: { include: { user: true } },
          reviewedBy: { include: { user: true } },
        },
        orderBy: { createdAt: "desc" },
      });
      return creatives;
    }),

  getPurchaseOrders: protectedProcedure
    .input(z.object({ orderId: z.string() }))
    .query(async ({ input, ctx }) => {
      await assertOrderReadAccess(
        ctx.user.id,
        input.orderId,
        ctx.activeOrganizationContextKey,
      );

      const purchaseOrders = await db.orderPurchaseOrder.findMany({
        where: { orderId: input.orderId },
        include: {
          uploadedBy: { include: { user: true } },
          reviewedBy: { include: { user: true } },
        },
        orderBy: { createdAt: "desc" },
      });

      return purchaseOrders;
    }),

  addPurchaseOrder: protectedProcedure
    .input(
      z.object({
        orderId: z.string(),
        fileUrl: z.string(),
        fileName: z.string(),
        fileType: z.string(),
        fileSize: z.number(),
        metadata: z.any().optional(),
        notes: z.string().optional(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const actor = await resolveSalesReviewActor(ctx.user.id);

      const order = await db.order.findUnique({
        where: { id: input.orderId },
        select: { id: true, code: true },
      });

      if (!order) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Order not found",
        });
      }

      const latestPurchaseOrder = await db.orderPurchaseOrder.findFirst({
        where: { orderId: input.orderId },
        orderBy: { version: "desc" },
        select: { version: true },
      });

      const nextVersion = (latestPurchaseOrder?.version ?? 0) + 1;
      let purchaseOrderId: string | null = null;

      await db.$transaction(async (tx) => {
        const createdPurchaseOrder = await tx.orderPurchaseOrder.create({
          data: {
            orderId: input.orderId,
            fileUrl: input.fileUrl,
            fileName: input.fileName,
            fileType: input.fileType,
            fileSize: input.fileSize,
            version: nextVersion,
            metadata: input.metadata || null,
            notes: input.notes,
            uploadedById: actor.profileId,
          },
        });
        purchaseOrderId = createdPurchaseOrder.id;

        await reopenOrderSalesReview(tx, {
          orderId: input.orderId,
          actorId: actor.profileId,
          notes: "Se subió una nueva OC del cliente.",
          eventType: "REVIEW_REQUIRED",
          targetType: "PURCHASE_ORDER",
          targetId: createdPurchaseOrder.id,
          metadata: {
            version: nextVersion,
            fileName: input.fileName,
          },
        });
      });

      await notifySalesReviewReopened({
        orderId: input.orderId,
        orderCode: order.code,
        eventType: "REVIEW_REQUIRED",
        actorName: actor.fullName,
        reason: "Se cargó una nueva Orden de Compra (OC).",
        notes: input.notes ?? null,
      });

      if (!purchaseOrderId) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "No se pudo guardar la OC.",
        });
      }

      const purchaseOrder = await db.orderPurchaseOrder.findUniqueOrThrow({
        where: { id: purchaseOrderId },
      });

      return purchaseOrder;
    }),

  addCreative: protectedProcedure
    .input(
      z.object({
        orderId: z.string(),
        lineItemId: z.string().optional().nullable(),
        fileUrl: z.string().url(),
        fileName: z.string(),
        fileType: z.string(),
        fileSize: z.number().min(0),
        sourceType: z.nativeEnum(CreativeSourceType).default("FILE_UPLOAD"),
        metadata: z.any().optional(),
        notes: z.string().optional(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const actor = await resolveSalesReviewActor(ctx.user.id);
      const actorProfile = await db.userProfile.findUnique({
        where: { id: actor.profileId },
        select: { systemRole: true },
      });

      if (!actorProfile) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "User profile not found",
        });
      }

      const order = await db.order.findUnique({
        where: { id: input.orderId },
        select: { id: true, code: true },
      });

      if (!order) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Order not found",
        });
      }

      const canOverrideClientArtworkLock =
        actorProfile.systemRole === "SUPERADMIN" ||
        actorProfile.systemRole === "STAFF" ||
        actorProfile.systemRole === "DESIGNER";

      if (!canOverrideClientArtworkLock) {
        const existingDesignProof = await db.orderCreative.findFirst({
          where: {
            orderId: input.orderId,
            creativeKind: "DESIGN_PROOF",
          },
          select: { id: true },
        });

        if (existingDesignProof) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message:
              "Ya existe una prueba de diseño. Desde aquí solo puedes aprobar o solicitar ajustes.",
          });
        }
      }

      const targetLineItemId = input.lineItemId ?? null;

      if (targetLineItemId) {
        const lineItem = await db.orderLineItem.findUnique({
          where: { id: targetLineItemId },
          select: { id: true, orderId: true },
        });

        if (!lineItem || lineItem.orderId !== input.orderId) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "El item indicado no pertenece a esta orden.",
          });
        }

        const existingCreativeForLineItem = await db.orderCreative.findFirst({
          where: {
            lineItemId: targetLineItemId,
            creativeKind: "CLIENT_ARTWORK",
          },
          select: { id: true },
        });

        if (existingCreativeForLineItem) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Esta cara ya tiene un arte asociado.",
          });
        }
      }

      const latestCreative = await db.orderCreative.findFirst({
        where: {
          orderId: input.orderId,
          lineItemId: targetLineItemId,
          creativeKind: "CLIENT_ARTWORK",
        },
        orderBy: { version: "desc" },
        select: { version: true },
      });

      const nextVersion = (latestCreative?.version ?? 0) + 1;

      let creativeId: string | null = null;
      try {
        await db.$transaction(async (tx) => {
          const createdCreative = await tx.orderCreative.create({
            data: {
              orderId: input.orderId,
              lineItemId: targetLineItemId,
              fileUrl: input.fileUrl,
              fileName: input.fileName,
              fileType: input.fileType,
              fileSize: input.fileSize,
              sourceType: input.sourceType,
              creativeKind: "CLIENT_ARTWORK",
              version: nextVersion,
              metadata: input.metadata || null,
              notes: input.notes,
              uploadedById: actor.profileId,
            },
          });
          creativeId = createdCreative.id;

          await onClientArtworkUploaded(tx, {
            orderId: input.orderId,
            actorId: actor.profileId,
          });
        });
      } catch (error) {
        if (
          targetLineItemId &&
          error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === "P2002"
        ) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Esta cara ya tiene un arte asociado.",
          });
        }

        throw error;
      }

      if (!creativeId) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "No se pudo guardar el arte.",
        });
      }

      const creative = await db.orderCreative.findUniqueOrThrow({
        where: { id: creativeId },
      });

      return creative;
    }),

  getSalesReviewTimeline: commercialProcedure
    .input(z.object({ orderId: z.string() }))
    .query(async ({ input }) => {
      const timeline = await db.orderSalesReviewEvent.findMany({
        where: { orderId: input.orderId },
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
        orderBy: { createdAt: "desc" },
      });

      return timeline;
    }),

  reviewCreative: designProcedure
    .input(
      z.object({
        creativeId: z.string(),
        result: z.nativeEnum(SalesReviewResult),
        notes: z.string().trim().max(2000).optional(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      if (
        input.result === SalesReviewResult.CHANGES_REQUESTED &&
        !input.notes?.trim()
      ) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Debes incluir notas cuando el resultado requiere cambios.",
        });
      }

      const actor = await resolveSalesReviewActor(ctx.user.id);
      const creative = await db.orderCreative.findUnique({
        where: { id: input.creativeId },
        select: {
          id: true,
          orderId: true,
          creativeKind: true,
          order: {
            select: {
              salesReviewStatus: true,
            },
          },
        },
      });

      if (!creative) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Arte no encontrado.",
        });
      }

      if (creative.creativeKind !== "CLIENT_ARTWORK") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Solo se pueden revisar artes enviados por el cliente.",
        });
      }

      if (creative.order.salesReviewStatus !== SalesReviewStatus.APPROVED) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message:
            "No puedes revisar arte mientras la validación de Ventas no esté aprobada.",
        });
      }

      const status =
        input.result === SalesReviewResult.APPROVED
          ? CreativeStatus.APPROVED
          : CreativeStatus.REJECTED;

      const updated = await db.orderCreative.update({
        where: { id: input.creativeId },
        data: {
          status,
          reviewedAt: new Date(),
          reviewedById: actor.profileId,
          reviewNotes: input.notes?.trim() || null,
        },
      });

      return updated;
    }),

  reviewPurchaseOrder: salesReviewProcedure
    .input(
      z.object({
        purchaseOrderId: z.string(),
        result: z.nativeEnum(SalesReviewResult),
        notes: z.string().trim().max(2000).optional(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      if (
        input.result === SalesReviewResult.CHANGES_REQUESTED &&
        !input.notes?.trim()
      ) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Debes incluir notas cuando el resultado requiere cambios.",
        });
      }

      const actor = await resolveSalesReviewActor(ctx.user.id);
      const purchaseOrder = await db.orderPurchaseOrder.findUnique({
        where: { id: input.purchaseOrderId },
        select: {
          id: true,
          orderId: true,
        },
      });

      if (!purchaseOrder) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "OC no encontrada.",
        });
      }

      const status =
        input.result === SalesReviewResult.APPROVED
          ? PurchaseOrderReviewStatus.APPROVED
          : PurchaseOrderReviewStatus.CHANGES_REQUESTED;

      const updated = await db.$transaction(async (tx) => {
        const updatedPurchaseOrder = await tx.orderPurchaseOrder.update({
          where: { id: input.purchaseOrderId },
          data: {
            reviewStatus: status,
            reviewedAt: new Date(),
            reviewedById: actor.profileId,
            reviewNotes: input.notes?.trim() || null,
          },
        });

        await createSalesReviewEvent(tx, {
          orderId: updatedPurchaseOrder.orderId,
          eventType: resolveDocumentEventType(input.result),
          targetType: "PURCHASE_ORDER",
          targetId: updatedPurchaseOrder.id,
          result: input.result,
          notes: input.notes?.trim() || null,
          actorId: actor.profileId,
        });

        return updatedPurchaseOrder;
      });

      return updated;
    }),

  confirmSalesReview: salesReviewProcedure
    .input(
      z.object({
        orderId: z.string(),
        result: z.nativeEnum(SalesReviewResult),
        notes: z.string().trim().max(2000).optional(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      if (
        input.result === SalesReviewResult.CHANGES_REQUESTED &&
        !input.notes?.trim()
      ) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Debes incluir notas cuando el resultado requiere cambios.",
        });
      }

      const actor = await resolveSalesReviewActor(ctx.user.id);
      const order = await db.order.findUnique({
        where: { id: input.orderId },
        select: {
          id: true,
          code: true,
          status: true,
          salesReviewStatus: true,
          serviceItems: {
            include: {
              service: {
                select: { code: true },
              },
            },
          },
        },
      });

      if (!order) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Order not found",
        });
      }

      if (order.status !== OrderStatus.CONFIRMED) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Debes confirmar la orden antes de validar comercialmente.",
        });
      }

      const nextStatus =
        input.result === SalesReviewResult.APPROVED
          ? SalesReviewStatus.APPROVED
          : SalesReviewStatus.CHANGES_REQUESTED;
      const shouldActivateDesignTask =
        nextStatus === SalesReviewStatus.APPROVED &&
        order.salesReviewStatus !== SalesReviewStatus.APPROVED;

      const transactionResult = await db.$transaction(async (tx) => {
        const updated = await tx.order.update({
          where: { id: input.orderId },
          data: {
            salesReviewStatus: nextStatus,
            salesReviewUpdatedAt: new Date(),
            salesReviewById: actor.profileId,
            salesReviewNotes: input.notes?.trim() || null,
          },
        });

        const reviewEvent = await createSalesReviewEvent(tx, {
          orderId: input.orderId,
          eventType: resolveOrderEventType(input.result),
          targetType: "ORDER",
          targetId: input.orderId,
          result: input.result,
          notes: input.notes?.trim() || null,
          actorId: actor.profileId,
        });

        if (shouldActivateDesignTask) {
          await activateDesignTaskAfterSalesApproval(tx, {
            orderId: input.orderId,
            actorId: actor.profileId,
            serviceItems: order.serviceItems,
          });
        }

        const notificationResult = await createOrderNotifications(tx, {
          orderId: input.orderId,
          type:
            nextStatus === SalesReviewStatus.APPROVED
              ? NotificationType.SALES_REVIEW_APPROVED
              : NotificationType.SALES_REVIEW_CHANGES_REQUESTED,
          title:
            nextStatus === SalesReviewStatus.APPROVED
              ? `Ventas aprobó la orden ${order.code}`
              : `Ventas solicitó cambios en ${order.code}`,
          message:
            nextStatus === SalesReviewStatus.APPROVED
              ? "La validacion comercial fue aprobada. Continuamos con la ejecucion de la orden."
              : "Ventas solicitó cambios para continuar con la orden.",
          actionPath: `/orders/${input.orderId}?tab=tracking`,
          sourceKey: `order:${input.orderId}:sales-review:${reviewEvent.id}`,
          metadata: {
            orderCode: order.code,
            salesReviewStatus: nextStatus,
          },
        });

        return {
          order: updated,
          emailDeliveries: notificationResult.emailDeliveries,
        };
      });

      await sendPreparedNotificationEmails(transactionResult.emailDeliveries);

      return transactionResult.order;
    }),

  updateCreativeStatus: salesReviewProcedure
    .input(
      z.object({
        id: z.string(),
        status: z.nativeEnum(CreativeStatus),
      }),
    )
    .mutation(async ({ input }) => {
      return db.orderCreative.update({
        where: { id: input.id },
        data: { status: input.status },
      });
    }),
});
