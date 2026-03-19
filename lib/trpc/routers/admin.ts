import { z } from "zod";
import { router, adminProcedure, superAdminProcedure } from "../init";
import {
  addOrganizationMembership,
  addOrganizationMembershipSchema,
  adminGetAccountDetail,
  adminListUsers,
  adminListAccounts,
  adminListAccountsSchema,
  adminGetUserDetail,
  adminGetStats,
  adminSearchUsers,
  ADMIN_USER_ERRORS,
  createBrandAndLinkSchema,
  createBrandAndLinkToAgency,
  createAdminUser,
  createAdminUserSchema,
  removeOrganizationMembership,
  removeOrganizationMembershipSchema,
  updateAccountType,
  updateAccountTypeSchema,
  updateAgencyClientRelationshipStatusPermissions,
  updateAgencyClientRelationshipStatusPermissionsSchema,
  updateOrganizationMembershipRole,
  updateOrganizationMembershipRoleSchema,
  upsertAgencyClientRelationship,
  upsertAgencyClientRelationshipSchema,
  updateSystemRole,
  adminListUsersSchema,
  updateSystemRoleSchema,
} from "@/lib/services/admin";
import {
  verifyUserProfile,
  deactivateUserProfile,
  reactivateUserProfile,
} from "@/lib/services/user-profile";
import { TRPCError } from "@trpc/server";

function mapMutationError(error: unknown, fallbackMessage: string) {
  if (error instanceof TRPCError) {
    throw error;
  }

  if (error instanceof Error) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: error.message,
    });
  }

  throw new TRPCError({
    code: "INTERNAL_SERVER_ERROR",
    message: fallbackMessage,
  });
}

export const adminRouter = router({
  // Get dashboard stats
  stats: adminProcedure.query(async () => {
    return adminGetStats();
  }),

  // List all users with filtering and pagination
  listUsers: adminProcedure
    .input(adminListUsersSchema)
    .query(async ({ input }) => {
      return adminListUsers(input);
    }),

  listAccounts: adminProcedure
    .input(adminListAccountsSchema)
    .query(async ({ input }) => {
      return adminListAccounts(input);
    }),

  // Get detailed user info
  getUserDetail: adminProcedure
    .input(z.object({ userId: z.string() }))
    .query(async ({ input }) => {
      const user = await adminGetUserDetail(input.userId);
      if (!user) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "User not found",
        });
      }
      return user;
    }),

  getAccountDetail: adminProcedure
    .input(z.object({ userId: z.string() }))
    .query(async ({ input }) => {
      const account = await adminGetAccountDetail(input.userId);
      if (!account) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "No se encontró la cuenta.",
        });
      }
      return account;
    }),

  // Search users
  searchUsers: adminProcedure
    .input(
      z.object({
        query: z.string().min(1),
        take: z.number().min(1).max(50).default(10),
      })
    )
    .query(async ({ input }) => {
      return adminSearchUsers(input.query, input.take);
    }),

  // Create user (superadmin only)
  createUser: superAdminProcedure
    .input(createAdminUserSchema)
    .mutation(async ({ ctx, input }) => {
      try {
        return await createAdminUser(input, ctx.user.id);
      } catch (error) {
        if (
          error instanceof Error &&
          error.message === ADMIN_USER_ERRORS.EMAIL_ALREADY_EXISTS
        ) {
          throw new TRPCError({
            code: "CONFLICT",
            message: "Ya existe un usuario con este correo",
          });
        }
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "No se pudo crear el usuario",
        });
      }
    }),

  // Update user's system role (superadmin only)
  updateSystemRole: superAdminProcedure
    .input(updateSystemRoleSchema)
    .mutation(async ({ ctx, input }) => {
      // Prevent self-demotion
      if (input.userId === ctx.user.id && input.systemRole !== "SUPERADMIN") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Cannot demote yourself",
        });
      }
      return updateSystemRole(input.userId, input.systemRole, ctx.user.id);
    }),

  // Verify user profile
  verifyUser: adminProcedure
    .input(z.object({ userId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return verifyUserProfile(input.userId, ctx.user.id);
    }),

  // Deactivate user
  deactivateUser: adminProcedure
    .input(z.object({ userId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      // Prevent self-deactivation
      if (input.userId === ctx.user.id) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Cannot deactivate yourself",
        });
      }
      return deactivateUserProfile(input.userId, ctx.user.id);
    }),

  // Reactivate user
  reactivateUser: adminProcedure
    .input(z.object({ userId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return reactivateUserProfile(input.userId, ctx.user.id);
    }),

  updateAccountType: adminProcedure
    .input(updateAccountTypeSchema)
    .mutation(async ({ ctx, input }) => {
      try {
        return await updateAccountType(input, ctx.user.id);
      } catch (error) {
        mapMutationError(error, "No se pudo actualizar el tipo de cuenta.");
      }
    }),

  addOrganizationMembership: adminProcedure
    .input(addOrganizationMembershipSchema)
    .mutation(async ({ ctx, input }) => {
      try {
        return await addOrganizationMembership(input, ctx.user.id);
      } catch (error) {
        mapMutationError(error, "No se pudo agregar la membresía.");
      }
    }),

  updateOrganizationMembershipRole: adminProcedure
    .input(updateOrganizationMembershipRoleSchema)
    .mutation(async ({ ctx, input }) => {
      try {
        return await updateOrganizationMembershipRole(
          input.membershipId,
          input.role,
          ctx.user.id,
        );
      } catch (error) {
        mapMutationError(error, "No se pudo actualizar el rol.");
      }
    }),

  removeOrganizationMembership: adminProcedure
    .input(removeOrganizationMembershipSchema)
    .mutation(async ({ ctx, input }) => {
      try {
        return await removeOrganizationMembership(input.membershipId, ctx.user.id);
      } catch (error) {
        mapMutationError(error, "No se pudo remover la membresía.");
      }
    }),

  createBrandAndLinkToAgency: adminProcedure
    .input(createBrandAndLinkSchema)
    .mutation(async ({ ctx, input }) => {
      try {
        return await createBrandAndLinkToAgency(input, ctx.user.id);
      } catch (error) {
        mapMutationError(error, "No se pudo crear y vincular la marca.");
      }
    }),

  upsertAgencyClientRelationship: adminProcedure
    .input(upsertAgencyClientRelationshipSchema)
    .mutation(async ({ ctx, input }) => {
      try {
        return await upsertAgencyClientRelationship(input, ctx.user.id);
      } catch (error) {
        mapMutationError(error, "No se pudo vincular la marca con la agencia.");
      }
    }),

  updateAgencyClientRelationshipStatusPermissions: adminProcedure
    .input(updateAgencyClientRelationshipStatusPermissionsSchema)
    .mutation(async ({ ctx, input }) => {
      try {
        return await updateAgencyClientRelationshipStatusPermissions(
          input,
          ctx.user.id,
        );
      } catch (error) {
        mapMutationError(error, "No se pudo actualizar la relación.");
      }
    }),
});
