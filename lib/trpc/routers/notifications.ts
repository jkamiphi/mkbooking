import { z } from "zod";
import { protectedProcedure, router } from "../init";
import { db } from "@/lib/db";

const listNotificationsSchema = z.object({
  filter: z.enum(["ALL", "UNREAD"]).default("ALL"),
  skip: z.number().int().min(0).default(0),
  take: z.number().int().min(1).max(100).default(50),
});

async function resolveCurrentUserProfileId(userId: string) {
  const profile = await db.userProfile.upsert({
    where: { userId },
    update: {},
    create: { userId },
    select: { id: true },
  });

  return profile.id;
}

export const notificationsRouter = router({
  list: protectedProcedure
    .input(listNotificationsSchema.optional())
    .query(async ({ input, ctx }) => {
      const parsed = listNotificationsSchema.parse(input ?? {});
      const userProfileId = await resolveCurrentUserProfileId(ctx.user.id);

      const where = {
        userProfileId,
        ...(parsed.filter === "UNREAD" ? { isRead: false } : {}),
      };

      const [items, total] = await Promise.all([
        db.userNotification.findMany({
          where,
          skip: parsed.skip,
          take: parsed.take,
          orderBy: { createdAt: "desc" },
          include: {
            order: {
              select: {
                id: true,
                code: true,
              },
            },
          },
        }),
        db.userNotification.count({ where }),
      ]);

      return {
        items,
        total,
        hasMore: parsed.skip + items.length < total,
      };
    }),

  unreadCount: protectedProcedure.query(async ({ ctx }) => {
    const userProfileId = await resolveCurrentUserProfileId(ctx.user.id);

    const count = await db.userNotification.count({
      where: {
        userProfileId,
        isRead: false,
      },
    });

    return { count };
  }),

  markRead: protectedProcedure
    .input(
      z.object({
        notificationId: z.string().min(1),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const userProfileId = await resolveCurrentUserProfileId(ctx.user.id);

      const now = new Date();
      const result = await db.userNotification.updateMany({
        where: {
          id: input.notificationId,
          userProfileId,
          isRead: false,
        },
        data: {
          isRead: true,
          readAt: now,
        },
      });

      return { updated: result.count > 0 };
    }),

  markAllRead: protectedProcedure.mutation(async ({ ctx }) => {
    const userProfileId = await resolveCurrentUserProfileId(ctx.user.id);

    const now = new Date();
    const result = await db.userNotification.updateMany({
      where: {
        userProfileId,
        isRead: false,
      },
      data: {
        isRead: true,
        readAt: now,
      },
    });

    return { updatedCount: result.count };
  }),
});
