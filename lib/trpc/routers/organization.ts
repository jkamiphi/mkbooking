import { z } from "zod";
import { router, protectedProcedure } from "../init";
import {
  getOrganizationById,
  getOrganizationsByUserProfileId,
  createOrganizationWithOwner,
  updateOrganization,
  registerNaturalPerson,
  registerBusiness,
  registerAgency,
  listOrganizations,
  searchOrganizations,
  checkCedulaExists,
  checkTaxIdExists,
  createAgencyClientRelationship,
  createAgencyClientRelationshipSchema,
  listAgencyClients,
  listClientAgencies,
  createOrganizationSchema,
  updateOrganizationSchema,
  naturalPersonRegistrationSchema,
  businessRegistrationSchema,
} from "@/lib/services/organization";
import { getOrCreateUserProfile } from "@/lib/services/user-profile";
import { TRPCError } from "@trpc/server";
import {
  LegalEntityType,
  OrganizationRelationshipStatus,
  OrganizationType,
} from "@prisma/client";
import {
  getDirectOrganizationMembership,
  listAccessibleOrganizationContextsForUser,
  resolveActiveOrganizationContextForUser,
} from "@/lib/services/organization-access";

export const organizationRouter = router({
  // Get organization by ID
  getById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input }) => {
      const organization = await getOrganizationById(input.id);
      if (!organization) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Organization not found",
        });
      }
      return organization;
    }),

  // Get current user's organizations
  myOrganizations: protectedProcedure.query(async ({ ctx }) => {
    const profile = await getOrCreateUserProfile(
      ctx.user.id,
      ctx.activeOrganizationContextKey,
    );
    if (!profile) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "User profile not found",
      });
    }
    return getOrganizationsByUserProfileId(profile.id);
  }),

  myContexts: protectedProcedure.query(async ({ ctx }) => {
    return resolveActiveOrganizationContextForUser(
      ctx.user.id,
      ctx.activeOrganizationContextKey,
    );
  }),

  // Create a new organization
  create: protectedProcedure
    .input(createOrganizationSchema)
    .mutation(async ({ ctx, input }) => {
      const profile = await getOrCreateUserProfile(
        ctx.user.id,
        ctx.activeOrganizationContextKey,
      );
      if (!profile) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "User profile not found",
        });
      }

      // Check for duplicate identifiers
      if (input.cedula) {
        const exists = await checkCedulaExists(input.cedula);
        if (exists) {
          throw new TRPCError({
            code: "CONFLICT",
            message: "An organization with this cedula already exists",
          });
        }
      }

      if (input.taxId) {
        const exists = await checkTaxIdExists(input.taxId);
        if (exists) {
          throw new TRPCError({
            code: "CONFLICT",
            message: "An organization with this tax ID already exists",
          });
        }
      }

      return createOrganizationWithOwner(input, profile.id);
    }),

  // Register as natural person (simplified flow)
  registerNaturalPerson: protectedProcedure
    .input(naturalPersonRegistrationSchema)
    .mutation(async ({ ctx, input }) => {
      const profile = await getOrCreateUserProfile(
        ctx.user.id,
        ctx.activeOrganizationContextKey,
      );
      if (!profile) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "User profile not found",
        });
      }

      // Check for duplicate cedula
      const exists = await checkCedulaExists(input.cedula);
      if (exists) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "An organization with this cedula already exists",
        });
      }

      return registerNaturalPerson(input, profile.id);
    }),

  // Register as business (simplified flow)
  registerBusiness: protectedProcedure
    .input(businessRegistrationSchema)
    .mutation(async ({ ctx, input }) => {
      const profile = await getOrCreateUserProfile(
        ctx.user.id,
        ctx.activeOrganizationContextKey,
      );
      if (!profile) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "User profile not found",
        });
      }

      // Check for duplicate tax ID
      const exists = await checkTaxIdExists(input.taxId);
      if (exists) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "An organization with this tax ID already exists",
        });
      }

      return registerBusiness(input, profile.id);
    }),

  registerAgency: protectedProcedure
    .input(businessRegistrationSchema)
    .mutation(async ({ ctx, input }) => {
      const profile = await getOrCreateUserProfile(
        ctx.user.id,
        ctx.activeOrganizationContextKey,
      );
      if (!profile) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "User profile not found",
        });
      }

      const exists = await checkTaxIdExists(input.taxId);
      if (exists) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "An organization with this tax ID already exists",
        });
      }

      return registerAgency(input, profile.id);
    }),

  // Update organization
  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        data: updateOrganizationSchema,
      })
    )
    .mutation(async ({ ctx, input }) => {
      const profile = await getOrCreateUserProfile(
        ctx.user.id,
        ctx.activeOrganizationContextKey,
      );
      if (!profile) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "User profile not found",
        });
      }

      // Verify user has access to this organization
      const organizations = await getOrganizationsByUserProfileId(profile.id);
      const hasAccess = organizations.some(
        (org) =>
          org.id === input.id && ["OWNER", "ADMIN"].includes(org.role)
      );

      if (!hasAccess) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You don't have permission to update this organization",
        });
      }

      return updateOrganization(input.id, input.data, profile.id);
    }),

  createAgencyClientRelationship: protectedProcedure
    .input(createAgencyClientRelationshipSchema)
    .mutation(async ({ ctx, input }) => {
      const profile = await getOrCreateUserProfile(
        ctx.user.id,
        ctx.activeOrganizationContextKey,
      );
      if (!profile) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "User profile not found",
        });
      }

      const agencyMembership = await getDirectOrganizationMembership(
        ctx.user.id,
        input.agencyOrganizationId,
      );

      if (
        !agencyMembership ||
        !["OWNER", "ADMIN"].includes(agencyMembership.role)
      ) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You need direct admin access to the agency",
        });
      }

      const advertiserAccess = await ctx.db.organization.findFirst({
        where: {
          id: input.advertiserOrganizationId,
          isActive: true,
          organizationType: OrganizationType.ADVERTISER,
          OR: [
            { createdById: profile.id },
            {
              members: {
                some: {
                  userProfileId: profile.id,
                  isActive: true,
                  role: { in: ["OWNER", "ADMIN"] },
                },
              },
            },
          ],
        },
        select: { id: true },
      });

      if (!advertiserAccess) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You need direct or owner access to the advertiser organization",
        });
      }

      try {
        return await createAgencyClientRelationship(input, profile.id);
      } catch (error) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message:
            error instanceof Error
              ? error.message
              : "Unable to create agency-client relationship",
        });
      }
    }),

  agencyClients: protectedProcedure
    .input(
      z.object({
        agencyOrganizationId: z.string().min(1),
        status: z.nativeEnum(OrganizationRelationshipStatus).optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const membership = await getDirectOrganizationMembership(
        ctx.user.id,
        input.agencyOrganizationId,
      );

      if (!membership) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You do not have access to this agency",
        });
      }

      const relationships = await listAgencyClients(input.agencyOrganizationId);

      if (!input.status) {
        return relationships;
      }

      return relationships.filter(
        (relationship) => relationship.status === input.status,
      );
    }),

  clientAgencies: protectedProcedure
    .input(
      z.object({
        advertiserOrganizationId: z.string().min(1),
        status: z.nativeEnum(OrganizationRelationshipStatus).optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const accessibleContexts = await listAccessibleOrganizationContextsForUser(
        ctx.user.id,
      );
      const hasAccess = accessibleContexts.some(
        (context) => context.organizationId === input.advertiserOrganizationId,
      );

      if (!hasAccess) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You do not have access to this advertiser",
        });
      }

      const relationships = await listClientAgencies(input.advertiserOrganizationId);

      if (!input.status) {
        return relationships;
      }

      return relationships.filter(
        (relationship) => relationship.status === input.status,
      );
    }),

  // List organizations (for admin)
  list: protectedProcedure
    .input(
      z.object({
        organizationType: z.nativeEnum(OrganizationType).optional(),
        legalEntityType: z.nativeEnum(LegalEntityType).optional(),
        isActive: z.boolean().optional(),
        isVerified: z.boolean().optional(),
        skip: z.number().optional(),
        take: z.number().optional(),
      })
    )
    .query(async ({ input }) => {
      return listOrganizations(input);
    }),

  // Search organizations
  search: protectedProcedure
    .input(
      z.object({
        query: z.string(),
        take: z.number().optional(),
      })
    )
    .query(async ({ input }) => {
      return searchOrganizations(input.query, input.take);
    }),

  // Check if cedula exists
  checkCedula: protectedProcedure
    .input(z.object({ cedula: z.string() }))
    .query(async ({ input }) => {
      return { exists: await checkCedulaExists(input.cedula) };
    }),

  // Check if tax ID exists
  checkTaxId: protectedProcedure
    .input(z.object({ taxId: z.string() }))
    .query(async ({ input }) => {
      return { exists: await checkTaxIdExists(input.taxId) };
    }),
});
