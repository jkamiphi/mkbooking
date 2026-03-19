import { db } from "@/lib/db";
import { NotificationType, Prisma } from "@prisma/client";
import { z } from "zod";
import { resolveActiveOrganizationContextForUser } from "@/lib/services/organization-access";

// ============================================================================
// Schemas
// ============================================================================

export const createUserProfileSchema = z.object({
  userId: z.string(),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  phone: z.string().optional(),
  locale: z.string().optional(),
  timezone: z.string().optional(),
  emailNotifications: z.boolean().optional(),
  whatsappNotifications: z.boolean().optional(),
  smsNotifications: z.boolean().optional(),
});

export const updateUserProfileSchema = z.object({
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  phone: z.string().optional(),
  locale: z.string().optional(),
  timezone: z.string().optional(),
  emailNotifications: z.boolean().optional(),
  whatsappNotifications: z.boolean().optional(),
  smsNotifications: z.boolean().optional(),
});

export type CreateUserProfileInput = z.infer<typeof createUserProfileSchema>;
export type UpdateUserProfileInput = z.infer<typeof updateUserProfileSchema>;

type PrismaClientLike = Prisma.TransactionClient | typeof db;

const ALL_NOTIFICATION_TYPES = Object.values(NotificationType) as NotificationType[];

function buildMissingNotificationPreferences(input: {
  userProfileId: string;
  emailEnabled: boolean;
  existingTypes: NotificationType[];
}) {
  const existingTypeSet = new Set(input.existingTypes);

  return ALL_NOTIFICATION_TYPES.filter((type) => !existingTypeSet.has(type)).map(
    (type) => ({
      userProfileId: input.userProfileId,
      type,
      emailEnabled: input.emailEnabled,
      inAppEnabled: true,
    }),
  );
}

export async function ensureUserNotificationPreferences(
  client: PrismaClientLike,
  input: {
    userProfileId: string;
    emailEnabled: boolean;
    existingTypes?: NotificationType[];
  },
) {
  const existingTypes =
    input.existingTypes ??
    (
      await client.userNotificationPreference.findMany({
        where: { userProfileId: input.userProfileId },
        select: { type: true },
      })
    ).map((preference) => preference.type);

  const missingPreferences = buildMissingNotificationPreferences({
    userProfileId: input.userProfileId,
    emailEnabled: input.emailEnabled,
    existingTypes,
  });

  if (missingPreferences.length === 0) {
    return 0;
  }

  const result = await client.userNotificationPreference.createMany({
    data: missingPreferences,
    skipDuplicates: true,
  });

  return result.count;
}

async function enrichUserProfileWithOrganizationContext<
  T extends { userId: string } | null,
>(profile: T, activeContextKey?: string | null) {
  if (!profile) {
    return null;
  }

  const { contexts, activeContext, accountType } =
    await resolveActiveOrganizationContextForUser(
      profile.userId,
      activeContextKey,
    );

  return {
    ...profile,
    accountType,
    organizationContexts: contexts,
    activeOrganizationContext: activeContext,
  };
}

// ============================================================================
// Service Functions
// ============================================================================

export async function getUserProfileByUserId(
  userId: string,
  activeContextKey?: string | null,
) {
  const profile = await db.userProfile.findUnique({
    where: { userId },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          image: true,
        },
      },
      organizationRoles: {
        where: { isActive: true },
        include: {
          organization: {
            select: {
              id: true,
              name: true,
              organizationType: true,
              logoUrl: true,
            },
          },
        },
      },
      notificationPreferences: {
        orderBy: { type: "asc" },
      },
    },
  });

  return enrichUserProfileWithOrganizationContext(profile, activeContextKey);
}

export async function getUserProfileById(id: string) {
  return db.userProfile.findUnique({
    where: { id },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          image: true,
        },
      },
      notificationPreferences: {
        orderBy: { type: "asc" },
      },
    },
  });
}

export async function createUserProfile(input: CreateUserProfileInput) {
  const emailEnabled = input.emailNotifications ?? true;

  return db.userProfile.create({
    data: {
      userId: input.userId,
      firstName: input.firstName,
      lastName: input.lastName,
      phone: input.phone,
      locale: input.locale,
      timezone: input.timezone,
      emailNotifications: input.emailNotifications,
      whatsappNotifications: input.whatsappNotifications,
      smsNotifications: input.smsNotifications,
      notificationPreferences: {
        create: ALL_NOTIFICATION_TYPES.map((type) => ({
          type,
          emailEnabled,
          inAppEnabled: true,
        })),
      },
    },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          image: true,
        },
      },
      notificationPreferences: {
        orderBy: { type: "asc" },
      },
    },
  });
}

export async function updateUserProfile(
  userId: string,
  input: UpdateUserProfileInput,
  updatedBy?: string
) {
  return db.userProfile.update({
    where: { userId },
    data: {
      ...input,
      updatedBy,
    },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          image: true,
        },
      },
    },
  });
}

export async function getOrCreateUserProfile(
  userId: string,
  activeContextKey?: string | null,
) {
  let profile = await getUserProfileByUserId(userId, activeContextKey);

  if (!profile) {
    await createUserProfile({ userId });
    profile = await getUserProfileByUserId(userId, activeContextKey);
  }

  if (!profile) {
    return null;
  }

  const ensuredCount = await ensureUserNotificationPreferences(db, {
    userProfileId: profile.id,
    emailEnabled: profile.emailNotifications,
    existingTypes: profile.notificationPreferences.map((preference) => preference.type),
  });

  if (ensuredCount > 0) {
    profile = await getUserProfileByUserId(userId, activeContextKey);
  }

  return profile;
}

export async function updateUserNotificationPreferences(
  userId: string,
  preferences: Array<{
    type: NotificationType;
    emailEnabled: boolean;
    inAppEnabled: boolean;
  }>,
  updatedBy?: string,
  activeContextKey?: string | null,
) {
  return db.$transaction(async (tx) => {
    const profile = await tx.userProfile.findUnique({
      where: { userId },
      select: {
        id: true,
        emailNotifications: true,
        notificationPreferences: {
          select: { type: true },
        },
      },
    });

    if (!profile) {
      throw new Error("Perfil de usuario no encontrado.");
    }

    await ensureUserNotificationPreferences(tx, {
      userProfileId: profile.id,
      emailEnabled: profile.emailNotifications,
      existingTypes: profile.notificationPreferences.map((preference) => preference.type),
    });

    await Promise.all(
      preferences.map((preference) =>
        tx.userNotificationPreference.upsert({
          where: {
            userProfileId_type: {
              userProfileId: profile.id,
              type: preference.type,
            },
          },
          create: {
            userProfileId: profile.id,
            type: preference.type,
            emailEnabled: preference.emailEnabled,
            inAppEnabled: preference.inAppEnabled,
          },
          update: {
            emailEnabled: preference.emailEnabled,
            inAppEnabled: preference.inAppEnabled,
          },
        }),
      ),
    );

    await tx.userProfile.update({
      where: { userId },
      data: { updatedBy },
    });

    const updatedProfile = await tx.userProfile.findUnique({
      where: { userId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
          },
        },
        organizationRoles: {
          where: { isActive: true },
          include: {
            organization: {
              select: {
                id: true,
                name: true,
                organizationType: true,
                logoUrl: true,
              },
            },
          },
        },
        notificationPreferences: {
          orderBy: { type: "asc" },
        },
      },
    });

    return enrichUserProfileWithOrganizationContext(
      updatedProfile,
      activeContextKey,
    );
  });
}

export async function deleteUserProfile(userId: string) {
  return db.userProfile.delete({
    where: { userId },
  });
}

export async function verifyUserProfile(userId: string, verifiedBy: string) {
  return db.userProfile.update({
    where: { userId },
    data: {
      isVerified: true,
      updatedBy: verifiedBy,
    },
  });
}

export async function deactivateUserProfile(userId: string, updatedBy: string) {
  return db.$transaction(async (tx) => {
    const profile = await tx.userProfile.update({
      where: { userId },
      data: {
        isActive: false,
        updatedBy,
      },
    });

    // Invalidate active sessions immediately after deactivation.
    await tx.session.deleteMany({
      where: { userId },
    });

    return profile;
  });
}

export async function reactivateUserProfile(userId: string, updatedBy: string) {
  return db.userProfile.update({
    where: { userId },
    data: {
      isActive: true,
      updatedBy,
    },
  });
}

export async function listUserProfiles(options?: {
  isActive?: boolean;
  isVerified?: boolean;
  skip?: number;
  take?: number;
  orderBy?: Prisma.UserProfileOrderByWithRelationInput;
}) {
  const { isActive, isVerified, skip = 0, take = 50, orderBy } = options ?? {};

  const where: Prisma.UserProfileWhereInput = {};
  if (isActive !== undefined) where.isActive = isActive;
  if (isVerified !== undefined) where.isVerified = isVerified;

  const [profiles, total] = await Promise.all([
    db.userProfile.findMany({
      where,
      skip,
      take,
      orderBy: orderBy ?? { createdAt: "desc" },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
          },
        },
      },
    }),
    db.userProfile.count({ where }),
  ]);

  return {
    profiles,
    total,
    hasMore: skip + profiles.length < total,
  };
}

export async function searchUserProfiles(query: string, take = 10) {
  return db.userProfile.findMany({
    where: {
      OR: [
        { firstName: { contains: query, mode: "insensitive" } },
        { lastName: { contains: query, mode: "insensitive" } },
        { user: { email: { contains: query, mode: "insensitive" } } },
        { user: { name: { contains: query, mode: "insensitive" } } },
      ],
      isActive: true,
    },
    take,
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          image: true,
        },
      },
    },
  });
}
