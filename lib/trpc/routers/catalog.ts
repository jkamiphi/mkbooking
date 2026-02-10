import { z } from "zod";
import { router, adminProcedure, protectedProcedure } from "../init";
import {
  createPriceRule,
  createPriceRuleSchema,
  createHold,
  createHoldSchema,
  createPromo,
  createPromoSchema,
  getCatalogFaceByFaceId,
  listCatalogFaces,
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
  getCampaignRequestById,
  listCampaignRequests,
  listCampaignRequestsSchema,
  suggestCampaignRequestFacesSchema,
  suggestFacesForCampaignRequest,
  updateCampaignRequestStatus,
  updateCampaignRequestStatusSchema,
} from "@/lib/services/campaign-request";

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
    get: adminProcedure
      .input(z.object({ faceId: z.string() }))
      .query(async ({ input }) => {
        return getCatalogFaceByFaceId(input.faceId);
      }),
    upsert: adminProcedure
      .input(upsertCatalogFaceSchema)
      .mutation(async ({ input }) => {
        return upsertCatalogFace(input);
      }),
  }),

  priceRules: router({
    list: adminProcedure
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
    create: adminProcedure
      .input(createPriceRuleSchema)
      .mutation(async ({ input }) => {
        return createPriceRule(input);
      }),
  }),

  promos: router({
    list: adminProcedure.query(async () => {
      return listPromos();
    }),
    create: adminProcedure
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
  }),

  requests: router({
    create: protectedProcedure
      .input(createCampaignRequestSchema)
      .mutation(async ({ ctx, input }) => {
        return createCampaignRequest(
          {
            ...input,
            // Evita que el cliente publique organizationId arbitrario.
            organizationId: undefined,
          },
          {
            createdByUserId: ctx.user?.id,
          }
        );
      }),

    list: adminProcedure
      .input(listCampaignRequestsSchema.optional())
      .query(async ({ input }) => {
        return listCampaignRequests(
          input ?? listCampaignRequestsSchema.parse({})
        );
      }),

    get: adminProcedure
      .input(z.object({ requestId: z.string().min(1) }))
      .query(async ({ input }) => {
        return getCampaignRequestById(input.requestId);
      }),

    suggestFaces: adminProcedure
      .input(suggestCampaignRequestFacesSchema)
      .query(async ({ input }) => {
        return suggestFacesForCampaignRequest(input);
      }),

    assignFaces: adminProcedure
      .input(assignCampaignRequestFacesSchema)
      .mutation(async ({ input }) => {
        return assignCampaignRequestFaces(input);
      }),

    updateStatus: adminProcedure
      .input(updateCampaignRequestStatusSchema)
      .mutation(async ({ ctx, input }) => {
        return updateCampaignRequestStatus(input, ctx.user.id);
      }),

    confirm: adminProcedure
      .input(z.object({ requestId: z.string().min(1) }))
      .mutation(async ({ ctx, input }) => {
        return confirmCampaignRequest(input.requestId, ctx.user.id);
      }),
  }),
});
