import { z } from "zod";
import { TRPCError } from "@trpc/server";
import {
  router,
  adminProcedure,
  commercialProcedure,
  protectedProcedure,
  publicProcedure,
} from "../init";
import {
  createPriceRule,
  createPriceRuleSchema,
  createHold,
  createHoldSchema,
  createPromo,
  createPromoSchema,
  updateHold,
  updateHoldSchema,
  checkFacesAvailability,
  checkFacesAvailabilitySchema,
  getCatalogFaceByFaceId,
  getPublicCatalogFaceDetailById,
  listCatalogFaces,
  listCatalogPricingFaceOptions,
  listHolds,
  listPromos,
  listPriceRules,
  releaseHold,
  upsertCatalogFace,
  upsertCatalogFaceSchema,
  holdStatusSchema,
} from "@/lib/services/catalog";
import {
  assignCampaignRequestFaces,
  assignCampaignRequestFacesSchema,
  confirmCampaignRequest,
  createCampaignRequest,
  createCampaignRequestSchema,
  getCampaignRequestByIdForUser,
  getCampaignRequestById,
  listCampaignRequests,
  listCampaignRequestsForUser,
  listCampaignRequestsSchema,
  suggestCampaignRequestFacesSchema,
  suggestFacesForCampaignRequest,
  updateCampaignRequestStatus,
  updateCampaignRequestStatusSchema,
} from "@/lib/services/campaign-request";
import {
  createCampaignService,
  createCampaignServiceSchema,
  listAdminCampaignServices,
  listPublicCampaignServices,
  toggleCampaignServiceActive,
  toggleCampaignServiceActiveSchema,
  updateCampaignService,
  updateCampaignServiceSchema,
} from "@/lib/services/campaign-services";
import { resolveActiveOrganizationContextForUser } from "@/lib/services/organization-access";

const publicFaceListInputSchema = z
  .object({
    search: z.string().optional(),
    isPublished: z.boolean().optional(),
    structureTypeId: z.string().optional(),
    zoneId: z.string().optional(),
    organizationId: z.string().optional(),
    availableFrom: z.coerce.date().optional(),
    availableTo: z.coerce.date().optional(),
    skip: z.number().min(0).default(0),
    take: z.number().min(1).max(100).default(50),
  })
  .optional();

export const catalogRouter = router({
  faces: router({
    list: adminProcedure
      .input(
        z
          .object({
            search: z.string().optional(),
            isPublished: z.boolean().optional(),
            structureTypeId: z.string().optional(),
            zoneId: z.string().optional(),
            skip: z.number().min(0).default(0),
            take: z.number().min(1).max(100).default(50),
          })
          .optional()
      )
      .query(async ({ input }) => {
        return listCatalogFaces(input);
      }),
    publicList: publicProcedure
      .input(publicFaceListInputSchema)
      .query(async ({ input }) => {
        return listCatalogFaces(input);
      }),
    get: commercialProcedure
      .input(z.object({ faceId: z.string() }))
      .query(async ({ input }) => {
        return getCatalogFaceByFaceId(input.faceId);
      }),
    pricingOptions: commercialProcedure
      .input(
        z
          .object({
            search: z.string().optional(),
            take: z.number().min(1).max(200).default(100),
          })
          .optional()
      )
      .query(async ({ input }) => {
        return listCatalogPricingFaceOptions(input);
      }),
    publicDetail: publicProcedure
      .input(
        z.object({
          faceId: z.string().min(1),
          organizationId: z.string().optional(),
        })
      )
      .query(async ({ input }) => {
        return getPublicCatalogFaceDetailById(input.faceId, {
          organizationId: input.organizationId,
        });
      }),
    upsert: adminProcedure
      .input(upsertCatalogFaceSchema)
      .mutation(async ({ input }) => {
        return upsertCatalogFace(input);
      }),
    checkAvailability: protectedProcedure
      .input(checkFacesAvailabilitySchema)
      .query(async ({ input }) => {
        return checkFacesAvailability(input);
      }),
  }),

  priceRules: router({
    list: commercialProcedure
      .input(
        z
          .object({
            faceId: z.string().optional(),
            structureTypeId: z.string().optional(),
            zoneId: z.string().optional(),
            organizationId: z.string().optional(),
            isActive: z.boolean().optional(),
          })
          .optional()
      )
      .query(async ({ input }) => {
        return listPriceRules(input);
      }),
    create: commercialProcedure
      .input(createPriceRuleSchema)
      .mutation(async ({ input }) => {
        return createPriceRule(input);
      }),
  }),

  promos: router({
    list: commercialProcedure.query(async () => {
      return listPromos();
    }),
    create: commercialProcedure
      .input(createPromoSchema)
      .mutation(async ({ input }) => {
        return createPromo(input);
      }),
  }),

  holds: router({
    list: adminProcedure
      .input(
        z
          .object({
            status: holdStatusSchema.optional(),
          })
          .optional()
      )
      .query(async ({ input }) => {
        return listHolds(input?.status);
      }),
    create: adminProcedure
      .input(createHoldSchema)
      .mutation(async ({ ctx, input }) => {
        return createHold(input, ctx.user.id);
      }),
    release: adminProcedure
      .input(z.object({ holdId: z.string() }))
      .mutation(async ({ input }) => {
        return releaseHold(input.holdId);
      }),
    update: adminProcedure
      .input(updateHoldSchema)
      .mutation(async ({ input }) => {
        return updateHold(input);
      }),
  }),

  requests: router({
    create: protectedProcedure
      .input(createCampaignRequestSchema)
      .mutation(async ({ ctx, input }) => {
        const { activeContext } = await resolveActiveOrganizationContextForUser(
          ctx.user.id,
          ctx.activeOrganizationContextKey,
        );

        if (!activeContext) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Select an organization context before creating a request",
          });
        }

        if (!activeContext.permissions.canCreateRequests) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Your active organization context cannot create requests",
          });
        }

        return createCampaignRequest(
          {
            ...input,
            // Evita que el cliente publique organizationId arbitrario.
            organizationId: undefined,
          },
          {
            createdByUserId: ctx.user?.id,
            activeContextKey: ctx.activeOrganizationContextKey,
          }
        );
      }),

    list: commercialProcedure
      .input(listCampaignRequestsSchema.optional())
      .query(async ({ input }) => {
        return listCampaignRequests(
          input ?? listCampaignRequestsSchema.parse({})
        );
      }),

    get: commercialProcedure
      .input(z.object({ requestId: z.string().min(1) }))
      .query(async ({ input }) => {
        return getCampaignRequestById(input.requestId);
      }),
    mine: protectedProcedure
      .input(listCampaignRequestsSchema.optional())
      .query(async ({ ctx, input }) => {
        return listCampaignRequestsForUser(
          input ?? listCampaignRequestsSchema.parse({}),
          {
            userId: ctx.user.id,
            userEmail: ctx.user.email,
          }
        );
      }),
    mineById: protectedProcedure
      .input(z.object({ requestId: z.string().min(1) }))
      .query(async ({ ctx, input }) => {
        const request = await getCampaignRequestByIdForUser(input.requestId, {
          userId: ctx.user.id,
          userEmail: ctx.user.email,
        });

        if (!request) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Campaign request not found",
          });
        }

        return request;
      }),

    suggestFaces: commercialProcedure
      .input(suggestCampaignRequestFacesSchema)
      .query(async ({ input }) => {
        return suggestFacesForCampaignRequest(input);
      }),

    assignFaces: commercialProcedure
      .input(assignCampaignRequestFacesSchema)
      .mutation(async ({ input, ctx }) => {
        return assignCampaignRequestFaces(input, { actorUserId: ctx.user.id });
      }),

    updateStatus: commercialProcedure
      .input(updateCampaignRequestStatusSchema)
      .mutation(async ({ ctx, input }) => {
        return updateCampaignRequestStatus(input, ctx.user.id);
      }),

    confirm: commercialProcedure
      .input(z.object({ requestId: z.string().min(1) }))
      .mutation(async ({ ctx, input }) => {
        return confirmCampaignRequest(input.requestId, ctx.user.id);
      }),
  }),

  services: router({
    publicList: publicProcedure.query(async () => {
      return listPublicCampaignServices();
    }),
    adminList: adminProcedure.query(async () => {
      return listAdminCampaignServices();
    }),
    adminCreate: adminProcedure
      .input(createCampaignServiceSchema)
      .mutation(async ({ input }) => {
        return createCampaignService(input);
      }),
    adminUpdate: adminProcedure
      .input(updateCampaignServiceSchema)
      .mutation(async ({ input }) => {
        return updateCampaignService(input);
      }),
    adminToggleActive: adminProcedure
      .input(toggleCampaignServiceActiveSchema)
      .mutation(async ({ input }) => {
        return toggleCampaignServiceActive(input);
      }),
  }),
});
