import { db } from "@/lib/db";
import type { SystemRole, Prisma } from "@prisma/client";
import { hashPassword } from "better-auth/crypto";
import crypto from "crypto";
import { z } from "zod";

// ============================================================================
// Schemas
// ============================================================================

const systemRoleSchema = z.enum([
  "SUPERADMIN",
  "STAFF",
  "DESIGNER",
  "SALES",
  "OPERATIONS_PRINT",
  "INSTALLER",
  "CUSTOMER",
]);

export const updateSystemRoleSchema = z.object({
  userId: z.string(),
  systemRole: systemRoleSchema,
});

export const createAdminUserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().min(1),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  systemRole: systemRoleSchema,
});

export const adminListUsersSchema = z.object({
  systemRole: systemRoleSchema.optional(),
  isActive: z.boolean().optional(),
  search: z.string().optional(),
  skip: z.number().min(0).default(0),
  take: z.number().min(1).max(100).default(20),
  orderBy: z.enum(["createdAt", "email", "name"]).optional(),
  orderDirection: z.enum(["asc", "desc"]).optional(),
});

export type UpdateSystemRoleInput = z.infer<typeof updateSystemRoleSchema>;
export type CreateAdminUserInput = z.infer<typeof createAdminUserSchema>;
export type AdminListUsersInput = z.infer<typeof adminListUsersSchema>;
export const ADMIN_USER_ERRORS = {
  EMAIL_ALREADY_EXISTS: "ADMIN_USER_EMAIL_ALREADY_EXISTS",
} as const;

// ============================================================================
// Authorization Functions
// ============================================================================

export async function getSystemRole(userId: string): Promise<SystemRole | null> {
  const profile = await db.userProfile.findUnique({
    where: { userId },
    select: { systemRole: true },
  });
  return profile?.systemRole ?? null;
}

export async function isAdmin(userId: string): Promise<boolean> {
  const role = await getSystemRole(userId);
  return role === "SUPERADMIN" || role === "STAFF";
}

export async function isSuperAdmin(userId: string): Promise<boolean> {
  const role = await getSystemRole(userId);
  return role === "SUPERADMIN";
}

export async function requireAdmin(userId: string): Promise<void> {
  const hasAccess = await isAdmin(userId);
  if (!hasAccess) {
    throw new Error("Admin access required");
  }
}

export async function requireSuperAdmin(userId: string): Promise<void> {
  const hasAccess = await isSuperAdmin(userId);
  if (!hasAccess) {
    throw new Error("Superadmin access required");
  }
}

// ============================================================================
// User Management Functions
// ============================================================================

export async function updateSystemRole(
  targetUserId: string,
  newRole: SystemRole,
  updatedBy: string
) {
  return db.userProfile.update({
    where: { userId: targetUserId },
    data: {
      systemRole: newRole,
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

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function normalizeOptional(value?: string): string | undefined {
  if (!value) {
    return undefined;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

export async function createAdminUser(input: CreateAdminUserInput, createdBy: string) {
  const email = normalizeEmail(input.email);
  const name = input.name.trim();
  const firstName = normalizeOptional(input.firstName);
  const lastName = normalizeOptional(input.lastName);

  const existingUser = await db.user.findUnique({
    where: { email },
    select: { id: true },
  });

  if (existingUser) {
    throw new Error(ADMIN_USER_ERRORS.EMAIL_ALREADY_EXISTS);
  }

  const passwordHash = await hashPassword(input.password);
  const now = new Date();

  return db.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: {
        id: crypto.randomUUID(),
        email,
        name,
        emailVerified: true,
        createdAt: now,
        updatedAt: now,
      },
    });

    await tx.account.create({
      data: {
        id: crypto.randomUUID(),
        accountId: user.id,
        providerId: "credential",
        userId: user.id,
        password: passwordHash,
        createdAt: now,
        updatedAt: now,
      },
    });

    return tx.userProfile.create({
      data: {
        userId: user.id,
        systemRole: input.systemRole,
        firstName,
        lastName,
        isVerified: true,
        createdBy,
        updatedBy: createdBy,
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
  });
}

export async function adminListUsers(input: AdminListUsersInput) {
  const { systemRole, isActive, search, skip, take, orderBy, orderDirection } = input;

  const where: Prisma.UserProfileWhereInput = {};

  if (systemRole) where.systemRole = systemRole;
  if (isActive !== undefined) where.isActive = isActive;

  if (search) {
    where.OR = [
      { firstName: { contains: search, mode: "insensitive" } },
      { lastName: { contains: search, mode: "insensitive" } },
      { user: { email: { contains: search, mode: "insensitive" } } },
      { user: { name: { contains: search, mode: "insensitive" } } },
    ];
  }

  const prismaOrderBy: Prisma.UserProfileOrderByWithRelationInput = {};
  if (orderBy === "email" || orderBy === "name") {
    prismaOrderBy.user = { [orderBy]: orderDirection ?? "asc" };
  } else {
    prismaOrderBy.createdAt = orderDirection ?? "desc";
  }

  const [profiles, total] = await Promise.all([
    db.userProfile.findMany({
      where,
      skip,
      take,
      orderBy: prismaOrderBy,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
            emailVerified: true,
            createdAt: true,
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
                legalEntityType: true,
              },
            },
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

export async function adminGetUserDetail(userId: string) {
  return db.userProfile.findUnique({
    where: { userId },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          image: true,
          emailVerified: true,
          createdAt: true,
          updatedAt: true,
        },
      },
      organizationRoles: {
        include: {
          organization: true,
        },
      },
      createdOrganizations: {
        select: {
          id: true,
          name: true,
          organizationType: true,
          legalEntityType: true,
          createdAt: true,
        },
      },
      auditLogs: {
        orderBy: { createdAt: "desc" },
        take: 20,
      },
    },
  });
}

export async function adminGetStats() {
  const [totalUsers, activeUsers, staffUsers, customersWithOrgs, recentUsers] = await Promise.all([
    db.userProfile.count(),
    db.userProfile.count({ where: { isActive: true } }),
    db.userProfile.count({
      where: {
        systemRole: {
          in: ["SUPERADMIN", "STAFF", "DESIGNER", "SALES", "OPERATIONS_PRINT", "INSTALLER"],
        },
      },
    }),
    db.userProfile.count({
      where: {
        organizationRoles: {
          some: { isActive: true },
        },
      },
    }),
    db.userProfile.count({
      where: {
        createdAt: {
          gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // Last 7 days
        },
      },
    }),
  ]);

  return {
    totalUsers,
    activeUsers,
    inactiveUsers: totalUsers - activeUsers,
    staffUsers,
    customerUsers: totalUsers - staffUsers,
    customersWithOrgs,
    recentUsers,
  };
}

export async function adminSearchUsers(query: string, take = 10) {
  return db.userProfile.findMany({
    where: {
      OR: [
        { firstName: { contains: query, mode: "insensitive" } },
        { lastName: { contains: query, mode: "insensitive" } },
        { user: { email: { contains: query, mode: "insensitive" } } },
        { user: { name: { contains: query, mode: "insensitive" } } },
      ],
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
