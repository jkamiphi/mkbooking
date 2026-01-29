import { z } from "zod";
import { router, adminProcedure, superAdminProcedure } from "../init";
import {
  adminListUsers,
  adminGetUserDetail,
  adminGetStats,
  adminSearchUsers,
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
});
