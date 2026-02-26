import { z } from "zod";
import { router, protectedProcedure } from "../init";
import { db } from "@/lib/db";
import { TRPCError } from "@trpc/server";
import { OrderStatus, CreativeStatus, Prisma } from "@prisma/client";

export const ordersRouter = router({
    generateFromRequest: protectedProcedure
        .input(
            z.object({
                requestId: z.string(),
            })
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
                    message: "Request must be in IN_REVIEW state to generate a quotation.",
                });
            }

            // Default duration to 30 days if not set
            let days = 30;
            if (request.fromDate && request.toDate) {
                const start = new Date(request.fromDate);
                const end = new Date(request.toDate);
                if (Number.isFinite(start.getTime()) && Number.isFinite(end.getTime())) {
                    days = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1);
                }
            }

            let subTotal = 0;
            let currency = "USD";

            const lineItemsData = request.assignments.map((assignment) => {
                // Find price
                const priceRule = assignment.face.catalogFace?.priceRules[0];
                const dailyRate = priceRule ? Number(priceRule.priceDaily) : 0;
                const lineSubtotal = dailyRate * days;
                if (priceRule?.currency) currency = priceRule.currency;
                subTotal += lineSubtotal;

                return {
                    faceId: assignment.faceId,
                    priceDaily: dailyRate,
                    days,
                    subtotal: lineSubtotal,
                };
            });

            const taxRate = 0.07; // ITBMS or standard tax
            const tax = subTotal * taxRate;
            const total = subTotal + tax;

            const order = await db.$transaction(async (tx) => {
                const newOrder = await tx.order.create({
                    data: {
                        campaignRequestId: request.id,
                        organizationId: request.organizationId,
                        createdById: userProfile.id,
                        clientName: request.contactName,
                        clientEmail: request.contactEmail,
                        currency,
                        subTotal,
                        tax,
                        total,
                        fromDate: request.fromDate,
                        toDate: request.toDate,
                        status: "DRAFT",
                        notes: "Cotización generada automáticamente desde la solicitud de campaña.",
                        lineItems: {
                            create: lineItemsData,
                        },
                    },
                });

                await tx.campaignRequest.update({
                    where: { id: request.id },
                    data: { status: "QUOTATION_GENERATED" },
                });

                return newOrder;
            });

            return order;
        }),

    list: protectedProcedure
        .input(
            z.object({
                status: z.nativeEnum(OrderStatus).optional(),
                skip: z.number().default(0),
                take: z.number().default(50),
            })
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
            })
        )
        .query(async ({ input, ctx }) => {
            const { status, skip, take } = input;
            const { user } = ctx;

            // Fetch based on user's current organization or createdBy
            // Assuming standard flow: The order has the organizationId of the user.
            const userProfile = await db.userProfile.findUnique({
                where: { userId: user.id },
                include: { organizationRoles: true },
            });

            const orgIds = userProfile?.organizationRoles.map(r => r.organizationId) || [];

            const where: any = {
                ...(status ? { status } : { status: { not: "DRAFT" as const } }), // Do not show drafts to clients by default 
            };

            const orConditions = [];
            if (userProfile) orConditions.push({ createdById: userProfile.id });
            if (orgIds.length > 0) orConditions.push({ organizationId: { in: orgIds } });

            if (orConditions.length > 0) {
                where.OR = orConditions;
            } else {
                // If user has no profile and no organizations, they can't have orders
                return { orders: [], total: 0 };
            }

            const [orders, total] = await Promise.all([
                db.order.findMany({
                    where,
                    include: {
                        organization: true,
                        lineItems: true,
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
        .query(async ({ input }) => {
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
                    organization: true,
                    campaignRequest: true,
                    companyConfirmBy: true,
                },
            });

            if (!order) {
                throw new TRPCError({ code: "NOT_FOUND", message: "Order not found" });
            }

            return order;
        }),

    updateLineItem: protectedProcedure
        .input(
            z.object({
                orderId: z.string(),
                lineItemId: z.string(),
                priceDaily: z.number().min(0),
                days: z.number().min(1).int(),
            })
        )
        .mutation(async ({ input }) => {
            const { orderId, lineItemId, priceDaily, days } = input;

            const order = await db.order.findUnique({
                where: { id: orderId },
                include: { lineItems: true },
            });

            if (!order || order.status !== "DRAFT") {
                throw new TRPCError({
                    code: "BAD_REQUEST",
                    message: "Solo se pueden editar órdenes en estado Borrador (DRAFT).",
                });
            }

            const itemToUpdate = order.lineItems.find(li => li.id === lineItemId);
            if (!itemToUpdate) {
                throw new TRPCError({ code: "NOT_FOUND", message: "Item no encontrado" });
            }

            const newSubtotal = priceDaily * days;

            await db.$transaction(async (tx) => {
                await tx.orderLineItem.update({
                    where: { id: lineItemId },
                    data: {
                        priceDaily,
                        days,
                        subtotal: newSubtotal,
                    },
                });

                // Recalculate order totals
                const allItems = await tx.orderLineItem.findMany({ where: { orderId } });
                const orderSubTotal = allItems.reduce((acc: number, curr: any) => acc + Number(curr.subtotal), 0);
                const taxRate = 0.07;
                const orderTax = orderSubTotal * taxRate;
                const orderTotal = orderSubTotal + orderTax;

                await tx.order.update({
                    where: { id: orderId },
                    data: {
                        subTotal: orderSubTotal,
                        tax: orderTax,
                        total: orderTotal,
                    },
                });
            });

            return { success: true };
        }),

    sendQuotation: protectedProcedure
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

    companyConfirm: protectedProcedure
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

                return {
                    order: confirmedOrder,
                    createdHolds,
                    skippedActiveHolds,
                };
            });

            return result;
        }),

    updateStatus: protectedProcedure
        .input(
            z.object({
                id: z.string(),
                status: z.nativeEnum(OrderStatus),
            })
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
        .query(async ({ input }) => {
            const creatives = await db.orderCreative.findMany({
                where: { orderId: input.orderId },
                include: { uploadedBy: { include: { user: true } } },
                orderBy: { createdAt: "desc" },
            });
            return creatives;
        }),

    getPurchaseOrders: protectedProcedure
        .input(z.object({ orderId: z.string() }))
        .query(async ({ input }) => {
            const purchaseOrders = await db.orderPurchaseOrder.findMany({
                where: { orderId: input.orderId },
                include: { uploadedBy: { include: { user: true } } },
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
            })
        )
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
                where: { id: input.orderId },
                select: { id: true },
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

            const purchaseOrder = await db.orderPurchaseOrder.create({
                data: {
                    orderId: input.orderId,
                    fileUrl: input.fileUrl,
                    fileName: input.fileName,
                    fileType: input.fileType,
                    fileSize: input.fileSize,
                    version: nextVersion,
                    metadata: input.metadata || null,
                    notes: input.notes,
                    uploadedById: userProfile.id,
                },
            });

            return purchaseOrder;
        }),

    addCreative: protectedProcedure
        .input(
            z.object({
                orderId: z.string(),
                lineItemId: z.string().optional().nullable(),
                fileUrl: z.string(),
                fileName: z.string(),
                fileType: z.string(),
                fileSize: z.number(),
                metadata: z.any().optional(),
                notes: z.string().optional(),
            })
        )
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
                where: { id: input.orderId },
                select: { id: true },
            });

            if (!order) {
                throw new TRPCError({
                    code: "NOT_FOUND",
                    message: "Order not found",
                });
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
                        message: "Line item does not belong to the order",
                    });
                }

                const existingCreativeForLineItem = await db.orderCreative.findFirst({
                    where: { lineItemId: targetLineItemId },
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
                where: { orderId: input.orderId, lineItemId: targetLineItemId },
                orderBy: { version: "desc" },
                select: { version: true },
            });

            const nextVersion = (latestCreative?.version ?? 0) + 1;

            let creative;
            try {
                creative = await db.orderCreative.create({
                    data: {
                        orderId: input.orderId,
                        lineItemId: targetLineItemId,
                        fileUrl: input.fileUrl,
                        fileName: input.fileName,
                        fileType: input.fileType,
                        fileSize: input.fileSize,
                        version: nextVersion,
                        metadata: input.metadata || null,
                        notes: input.notes,
                        uploadedById: userProfile.id,
                    },
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

            return creative;
        }),

    updateCreativeStatus: protectedProcedure
        .input(
            z.object({
                id: z.string(),
                status: z.nativeEnum(CreativeStatus),
            })
        )
        .mutation(async ({ input }) => {
            return db.orderCreative.update({
                where: { id: input.id },
                data: { status: input.status },
            });
        }),
});
