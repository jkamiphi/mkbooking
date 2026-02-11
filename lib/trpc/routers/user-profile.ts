import { z } from "zod";
import { router, protectedProcedure } from "../init";
import {
  getUserProfileByUserId,
  getOrCreateUserProfile,
  updateUserProfile,
  updateUserProfileSchema,
  listUserProfiles,
  searchUserProfiles,
  verifyUserProfile,
  deactivateUserProfile,
  reactivateUserProfile,
} from "@/lib/services/user-profile";
import { TRPCError } from "@trpc/server";

export const userProfileRouter = router({
  // Get the current user's profile without creating one
  current: protectedProcedure.query(async ({ ctx }) => {
    return getUserProfileByUserId(ctx.user.id);
  }),

  // Get the current user's profile (creates if doesn't exist)
  me: protectedProcedure.query(async ({ ctx }) => {
    return getOrCreateUserProfile(ctx.user.id);
  }),

  // Get a profile by user ID
  getByUserId: protectedProcedure
    .input(z.object({ userId: z.string() }))
    .query(async ({ input }) => {
      const profile = await getUserProfileByUserId(input.userId);
      if (!profile) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "User profile not found",
        });
      }
      return profile;
    }),

  // Update the current user's profile
  update: protectedProcedure
    .input(updateUserProfileSchema)
    .mutation(async ({ ctx, input }) => {
      return updateUserProfile(ctx.user.id, input, ctx.user.id);
    }),

  // Update notification preferences
  updateNotifications: protectedProcedure
    .input(
      z.object({
        emailNotifications: z.boolean().optional(),
        whatsappNotifications: z.boolean().optional(),
        smsNotifications: z.boolean().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return updateUserProfile(ctx.user.id, input, ctx.user.id);
    }),

  // Update locale and timezone
  updateLocale: protectedProcedure
    .input(
      z.object({
        locale: z.string().optional(),
        timezone: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return updateUserProfile(ctx.user.id, input, ctx.user.id);
    }),

  // List all profiles (admin only - should add role check)
  list: protectedProcedure
    .input(
      z.object({
        isActive: z.boolean().optional(),
        isVerified: z.boolean().optional(),
        skip: z.number().min(0).default(0),
        take: z.number().min(1).max(100).default(50),
      })
    )
    .query(async ({ input }) => {
      return listUserProfiles(input);
    }),

  // Search profiles
  search: protectedProcedure
    .input(
      z.object({
        query: z.string().min(1),
        take: z.number().min(1).max(50).default(10),
      })
    )
    .query(async ({ input }) => {
      return searchUserProfiles(input.query, input.take);
    }),

  // Verify a user profile (admin only - should add role check)
  verify: protectedProcedure
    .input(z.object({ userId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return verifyUserProfile(input.userId, ctx.user.id);
    }),

  // Deactivate a user profile (admin only - should add role check)
  deactivate: protectedProcedure
    .input(z.object({ userId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return deactivateUserProfile(input.userId, ctx.user.id);
    }),

  // Reactivate a user profile (admin only - should add role check)
  reactivate: protectedProcedure
    .input(z.object({ userId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return reactivateUserProfile(input.userId, ctx.user.id);
    }),
});
