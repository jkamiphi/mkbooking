import { db } from "@/lib/db";
import { Prisma } from "@prisma/client";
import { z } from "zod";

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

// ============================================================================
// Service Functions
// ============================================================================

export async function getUserProfileByUserId(userId: string) {
  return db.userProfile.findUnique({
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
    },
  });
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
    },
  });
}

export async function createUserProfile(input: CreateUserProfileInput) {
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

export async function getOrCreateUserProfile(userId: string) {
  let profile = await getUserProfileByUserId(userId);

  if (!profile) {
    await createUserProfile({ userId });
    profile = await getUserProfileByUserId(userId);
  }

  return profile;
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
  return db.userProfile.update({
    where: { userId },
    data: {
      isActive: false,
      updatedBy,
    },
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
