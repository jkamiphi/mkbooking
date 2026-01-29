import { z } from "zod";
import { router, protectedProcedure } from "../init";
import {
  getOrganizationById,
  getOrganizationsByUserProfileId,
  createOrganizationWithOwner,
  updateOrganization,
  registerNaturalPerson,
  registerBusiness,
  listOrganizations,
  searchOrganizations,
  checkCedulaExists,
  checkTaxIdExists,
  createOrganizationSchema,
  updateOrganizationSchema,
  naturalPersonRegistrationSchema,
  businessRegistrationSchema,
} from "@/lib/services/organization";
import { getOrCreateUserProfile } from "@/lib/services/user-profile";
import { TRPCError } from "@trpc/server";
import { LegalEntityType, OrganizationType } from "@prisma/client";

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
    const profile = await getOrCreateUserProfile(ctx.user.id);
    if (!profile) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "User profile not found",
      });
    }
    return getOrganizationsByUserProfileId(profile.id);
  }),

  // Create a new organization
  create: protectedProcedure
    .input(createOrganizationSchema)
    .mutation(async ({ ctx, input }) => {
      const profile = await getOrCreateUserProfile(ctx.user.id);
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
      const profile = await getOrCreateUserProfile(ctx.user.id);
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
      const profile = await getOrCreateUserProfile(ctx.user.id);
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

  // Update organization
  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        data: updateOrganizationSchema,
      })
    )
    .mutation(async ({ ctx, input }) => {
      const profile = await getOrCreateUserProfile(ctx.user.id);
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
