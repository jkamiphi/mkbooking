import { z } from "zod";
import { router, protectedProcedure } from "../init";
import { db } from "@/lib/db";
import { TRPCError } from "@trpc/server";
import { OrderStatus, CampaignRequestStatus } from "@prisma/client";

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
                        createdById: user.id,
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
                where: { id: user.id },
                include: { organizationRoles: true },
            });

            const orgIds = userProfile?.organizationRoles.map(r => r.organizationId) || [];

            const where = {
                ...(status ? { status } : {}),
                OR: [
                    { createdById: user.id },
                    ...(orgIds.length > 0 ? [{ organizationId: { in: orgIds } }] : []),
                ]
            };

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
                            createdById: user.id,
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
                        companyConfirmedById: user.id,
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
});
