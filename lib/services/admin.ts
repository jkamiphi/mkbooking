import { db } from "@/lib/db";
import {
  LegalEntityType,
  OrganizationRelationshipStatus,
  OrganizationRole,
  OrganizationType,
  Prisma,
  SystemRole,
  UserAccountType,
} from "@prisma/client";
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

const userAccountTypeSchema = z.enum(["DIRECT_CLIENT", "AGENCY"]);

const organizationRelationshipStatusSchema = z.enum([
  "PENDING",
  "ACTIVE",
  "INACTIVE",
]);

const organizationRoleSchema = z.enum([
  "OWNER",
  "ADMIN",
  "SALES",
  "OPERATIONS",
  "FINANCE",
  "VIEWER",
  "CLIENT_VIEWER",
]);

export const adminListAccountsSchema = z.object({
  systemRole: systemRoleSchema.optional(),
  accountType: userAccountTypeSchema.optional(),
  isActive: z.boolean().optional(),
  organizationType: z.nativeEnum(OrganizationType).optional(),
  relationshipStatus: organizationRelationshipStatusSchema.optional(),
  search: z.string().optional(),
  skip: z.number().min(0).default(0),
  take: z.number().min(1).max(100).default(20),
  orderBy: z.enum(["createdAt", "email", "name"]).optional(),
  orderDirection: z.enum(["asc", "desc"]).optional(),
});

export const updateAccountTypeSchema = z.object({
  userId: z.string().min(1),
  accountType: userAccountTypeSchema,
});

export const addOrganizationMembershipSchema = z.object({
  userId: z.string().min(1),
  organizationId: z.string().min(1),
  role: organizationRoleSchema,
});

export const updateOrganizationMembershipRoleSchema = z.object({
  membershipId: z.string().min(1),
  role: organizationRoleSchema,
});

export const removeOrganizationMembershipSchema = z.object({
  membershipId: z.string().min(1),
});

export const createBrandAndLinkSchema = z.object({
  agencyOrganizationId: z.string().min(1),
  name: z.string().trim().min(1).max(120),
  legalName: z.string().trim().optional(),
  tradeName: z.string().trim().optional(),
  taxId: z.string().trim().optional(),
  assignUserId: z.string().optional(),
});

export const upsertAgencyClientRelationshipSchema = z.object({
  agencyOrganizationId: z.string().min(1),
  advertiserOrganizationId: z.string().min(1),
  status: organizationRelationshipStatusSchema.optional(),
  canCreateRequests: z.boolean().optional(),
  canCreateOrders: z.boolean().optional(),
  canViewBilling: z.boolean().optional(),
  canManageContacts: z.boolean().optional(),
});

export const updateAgencyClientRelationshipStatusPermissionsSchema = z
  .object({
    relationshipId: z.string().min(1),
    status: organizationRelationshipStatusSchema.optional(),
    canCreateRequests: z.boolean().optional(),
    canCreateOrders: z.boolean().optional(),
    canViewBilling: z.boolean().optional(),
    canManageContacts: z.boolean().optional(),
  })
  .refine(
    (input) =>
      input.status !== undefined ||
      input.canCreateRequests !== undefined ||
      input.canCreateOrders !== undefined ||
      input.canViewBilling !== undefined ||
      input.canManageContacts !== undefined,
    { message: "Debes indicar al menos un campo para actualizar." },
  );

export type UpdateSystemRoleInput = z.infer<typeof updateSystemRoleSchema>;
export type CreateAdminUserInput = z.infer<typeof createAdminUserSchema>;
export type AdminListUsersInput = z.infer<typeof adminListUsersSchema>;
export type AdminListAccountsInput = z.infer<typeof adminListAccountsSchema>;
export type UpdateAccountTypeInput = z.infer<typeof updateAccountTypeSchema>;
export type OrganizationMembershipMutationInput = z.infer<
  typeof addOrganizationMembershipSchema
>;
export type CreateBrandAndLinkInput = z.infer<typeof createBrandAndLinkSchema>;
export type UpdateAgencyClientRelationshipInput = z.infer<
  typeof updateAgencyClientRelationshipStatusPermissionsSchema
>;
export const ADMIN_USER_ERRORS = {
  EMAIL_ALREADY_EXISTS: "ADMIN_USER_EMAIL_ALREADY_EXISTS",
} as const;

export interface AdminAccountRelationshipSummary {
  total: number;
  active: number;
  pending: number;
  inactive: number;
}

export interface AdminAccountOrganizationMembership {
  membershipId: string;
  role: OrganizationRole;
  isActive: boolean;
  acceptedAt: Date | null;
  organization: {
    id: string;
    name: string;
    organizationType: OrganizationType;
    legalEntityType: LegalEntityType;
    isActive: boolean;
    isVerified: boolean;
  };
}

export interface AdminAccountRow {
  id: string;
  userId: string;
  accountType: UserAccountType;
  systemRole: SystemRole;
  isActive: boolean;
  isVerified: boolean;
  createdAt: Date;
  user: {
    id: string;
    name: string;
    email: string;
    image: string | null;
    emailVerified: boolean;
  };
  displayName: string;
  organizationRoles: AdminAccountOrganizationMembership[];
  relationshipSummary: AdminAccountRelationshipSummary;
}

export interface AdminAccountDetail {
  id: string;
  userId: string;
  systemRole: SystemRole;
  accountType: UserAccountType;
  firstName: string | null;
  lastName: string | null;
  phone: string | null;
  locale: string;
  timezone: string;
  isActive: boolean;
  isVerified: boolean;
  createdAt: Date;
  updatedAt: Date;
  user: {
    id: string;
    name: string;
    email: string;
    image: string | null;
    emailVerified: boolean;
    createdAt: Date;
    updatedAt: Date;
  };
  organizationRoles: AdminAccountOrganizationMembership[];
  managedRelationships: Array<{
    id: string;
    status: OrganizationRelationshipStatus;
    canCreateRequests: boolean;
    canCreateOrders: boolean;
    canViewBilling: boolean;
    canManageContacts: boolean;
    sourceOrganization: {
      id: string;
      name: string;
      organizationType: OrganizationType;
    };
    targetOrganization: {
      id: string;
      name: string;
      organizationType: OrganizationType;
    };
  }>;
  clientRelationships: Array<{
    id: string;
    status: OrganizationRelationshipStatus;
    canCreateRequests: boolean;
    canCreateOrders: boolean;
    canViewBilling: boolean;
    canManageContacts: boolean;
    sourceOrganization: {
      id: string;
      name: string;
      organizationType: OrganizationType;
    };
    targetOrganization: {
      id: string;
      name: string;
      organizationType: OrganizationType;
    };
  }>;
}

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

function resolveRelationshipPermissions(input: {
  canCreateRequests?: boolean;
  canCreateOrders?: boolean;
  canViewBilling?: boolean;
  canManageContacts?: boolean;
}) {
  return {
    canCreateRequests: input.canCreateRequests ?? true,
    canCreateOrders: input.canCreateOrders ?? true,
    canViewBilling: input.canViewBilling ?? false,
    canManageContacts: input.canManageContacts ?? false,
  };
}

function buildRelationshipSummary(
  statuses: OrganizationRelationshipStatus[],
): AdminAccountRelationshipSummary {
  return statuses.reduce<AdminAccountRelationshipSummary>(
    (summary, status) => {
      summary.total += 1;
      if (status === OrganizationRelationshipStatus.ACTIVE) {
        summary.active += 1;
      } else if (status === OrganizationRelationshipStatus.PENDING) {
        summary.pending += 1;
      } else {
        summary.inactive += 1;
      }
      return summary;
    },
    { total: 0, active: 0, pending: 0, inactive: 0 },
  );
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

export async function adminListAccounts(
  input: AdminListAccountsInput,
): Promise<{ accounts: AdminAccountRow[]; total: number; hasMore: boolean }> {
  const {
    systemRole,
    accountType,
    isActive,
    organizationType,
    relationshipStatus,
    search,
    skip,
    take,
    orderBy,
    orderDirection,
  } = input;

  const where: Prisma.UserProfileWhereInput = {};
  const andFilters: Prisma.UserProfileWhereInput[] = [];

  if (systemRole) andFilters.push({ systemRole });
  if (accountType) andFilters.push({ accountType });
  if (isActive !== undefined) andFilters.push({ isActive });

  if (organizationType) {
    andFilters.push({
      organizationRoles: {
        some: {
          isActive: true,
          organization: { organizationType },
        },
      },
    });
  }

  if (relationshipStatus) {
    andFilters.push({
      organizationRoles: {
        some: {
          isActive: true,
          organization: {
            organizationType: OrganizationType.AGENCY,
            outgoingRelationships: {
              some: {
                relationshipType: "AGENCY_CLIENT",
                status: relationshipStatus,
              },
            },
          },
        },
      },
    });
  }

  if (search?.trim()) {
    const normalizedSearch = search.trim();
    where.OR = [
      { firstName: { contains: normalizedSearch, mode: "insensitive" } },
      { lastName: { contains: normalizedSearch, mode: "insensitive" } },
      { user: { email: { contains: normalizedSearch, mode: "insensitive" } } },
      { user: { name: { contains: normalizedSearch, mode: "insensitive" } } },
      {
        organizationRoles: {
          some: {
            isActive: true,
            organization: {
              name: { contains: normalizedSearch, mode: "insensitive" },
            },
          },
        },
      },
    ];
  }

  if (andFilters.length > 0) {
    where.AND = andFilters;
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
      select: {
        id: true,
        userId: true,
        firstName: true,
        lastName: true,
        accountType: true,
        systemRole: true,
        isActive: true,
        isVerified: true,
        createdAt: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
            emailVerified: true,
          },
        },
        organizationRoles: {
          where: { isActive: true },
          select: {
            id: true,
            role: true,
            isActive: true,
            acceptedAt: true,
            organization: {
              select: {
                id: true,
                name: true,
                organizationType: true,
                legalEntityType: true,
                isActive: true,
                isVerified: true,
              },
            },
          },
        },
      },
    }),
    db.userProfile.count({ where }),
  ]);

  const agencyOrganizationIds = Array.from(
    new Set(
      profiles.flatMap((profile) =>
        profile.organizationRoles
          .filter(
            (membership) =>
              membership.organization.organizationType ===
              OrganizationType.AGENCY,
          )
          .map((membership) => membership.organization.id),
      ),
    ),
  );

  const relationships =
    agencyOrganizationIds.length > 0
      ? await db.organizationRelationship.findMany({
          where: {
            sourceOrganizationId: { in: agencyOrganizationIds },
            relationshipType: "AGENCY_CLIENT",
          },
          select: {
            sourceOrganizationId: true,
            status: true,
          },
        })
      : [];

  const relationshipStatusesByAgency = new Map<
    string,
    OrganizationRelationshipStatus[]
  >();

  for (const relationship of relationships) {
    const existing =
      relationshipStatusesByAgency.get(relationship.sourceOrganizationId) ?? [];
    existing.push(relationship.status);
    relationshipStatusesByAgency.set(relationship.sourceOrganizationId, existing);
  }

  const accounts: AdminAccountRow[] = profiles.map((profile) => {
    const agencyStatuses = profile.organizationRoles
      .filter(
        (membership) =>
          membership.organization.organizationType === OrganizationType.AGENCY,
      )
      .flatMap(
        (membership) =>
          relationshipStatusesByAgency.get(membership.organization.id) ?? [],
      );
    const displayName =
      profile.firstName && profile.lastName
        ? `${profile.firstName} ${profile.lastName}`
        : profile.user.name;

    return {
      id: profile.id,
      userId: profile.userId,
      accountType: profile.accountType,
      systemRole: profile.systemRole,
      isActive: profile.isActive,
      isVerified: profile.isVerified,
      createdAt: profile.createdAt,
      user: profile.user,
      displayName,
      relationshipSummary: buildRelationshipSummary(agencyStatuses),
      organizationRoles: profile.organizationRoles.map((membership) => ({
        membershipId: membership.id,
        role: membership.role,
        isActive: membership.isActive,
        acceptedAt: membership.acceptedAt,
        organization: membership.organization,
      })),
    };
  });

  return {
    accounts,
    total,
    hasMore: skip + accounts.length < total,
  };
}

export async function adminGetAccountDetail(
  userId: string,
): Promise<AdminAccountDetail | null> {
  const profile = await db.userProfile.findUnique({
    where: { userId },
    select: {
      id: true,
      userId: true,
      systemRole: true,
      accountType: true,
      firstName: true,
      lastName: true,
      phone: true,
      locale: true,
      timezone: true,
      isActive: true,
      isVerified: true,
      createdAt: true,
      updatedAt: true,
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
        where: { isActive: true },
        select: {
          id: true,
          role: true,
          isActive: true,
          acceptedAt: true,
          organization: {
            select: {
              id: true,
              name: true,
              organizationType: true,
              legalEntityType: true,
              isActive: true,
              isVerified: true,
            },
          },
        },
      },
    },
  });

  if (!profile) {
    return null;
  }

  const agencyOrganizationIds = profile.organizationRoles
    .filter(
      (membership) =>
        membership.organization.organizationType === OrganizationType.AGENCY,
    )
    .map((membership) => membership.organization.id);

  const advertiserOrganizationIds = profile.organizationRoles
    .filter(
      (membership) =>
        membership.organization.organizationType ===
        OrganizationType.ADVERTISER,
    )
    .map((membership) => membership.organization.id);

  const [managedRelationships, clientRelationships] = await Promise.all([
    agencyOrganizationIds.length > 0
      ? db.organizationRelationship.findMany({
          where: {
            sourceOrganizationId: { in: agencyOrganizationIds },
            relationshipType: "AGENCY_CLIENT",
          },
          orderBy: [{ status: "asc" }, { targetOrganization: { name: "asc" } }],
          select: {
            id: true,
            status: true,
            canCreateRequests: true,
            canCreateOrders: true,
            canViewBilling: true,
            canManageContacts: true,
            sourceOrganization: {
              select: {
                id: true,
                name: true,
                organizationType: true,
              },
            },
            targetOrganization: {
              select: {
                id: true,
                name: true,
                organizationType: true,
              },
            },
          },
        })
      : Promise.resolve([]),
    advertiserOrganizationIds.length > 0
      ? db.organizationRelationship.findMany({
          where: {
            targetOrganizationId: { in: advertiserOrganizationIds },
            relationshipType: "AGENCY_CLIENT",
          },
          orderBy: [{ status: "asc" }, { sourceOrganization: { name: "asc" } }],
          select: {
            id: true,
            status: true,
            canCreateRequests: true,
            canCreateOrders: true,
            canViewBilling: true,
            canManageContacts: true,
            sourceOrganization: {
              select: {
                id: true,
                name: true,
                organizationType: true,
              },
            },
            targetOrganization: {
              select: {
                id: true,
                name: true,
                organizationType: true,
              },
            },
          },
        })
      : Promise.resolve([]),
  ]);

  return {
    ...profile,
    organizationRoles: profile.organizationRoles.map((membership) => ({
      membershipId: membership.id,
      role: membership.role,
      isActive: membership.isActive,
      acceptedAt: membership.acceptedAt,
      organization: membership.organization,
    })),
    managedRelationships,
    clientRelationships,
  };
}

export async function updateAccountType(
  input: UpdateAccountTypeInput,
  updatedBy: string,
) {
  const profile = await db.userProfile.findUnique({
    where: { userId: input.userId },
    select: {
      id: true,
      accountType: true,
      organizationRoles: {
        where: { isActive: true },
        select: {
          organizationId: true,
          organization: {
            select: {
              organizationType: true,
            },
          },
        },
      },
    },
  });

  if (!profile) {
    throw new Error("No se encontró el usuario.");
  }

  const agencyMemberships = profile.organizationRoles.filter(
    (membership) =>
      membership.organization.organizationType === OrganizationType.AGENCY,
  );

  if (input.accountType === UserAccountType.AGENCY && agencyMemberships.length === 0) {
    throw new Error(
      "Para convertir esta cuenta en agencia, debe tener al menos una membresía activa en una organización tipo agencia.",
    );
  }

  if (
    input.accountType === UserAccountType.DIRECT_CLIENT &&
    agencyMemberships.length > 0
  ) {
    throw new Error(
      "No se puede convertir en cliente directo mientras tenga membresías activas en agencias.",
    );
  }

  return db.userProfile.update({
    where: { userId: input.userId },
    data: {
      accountType: input.accountType,
      updatedBy,
    },
    select: {
      userId: true,
      accountType: true,
      updatedAt: true,
    },
  });
}

export async function addOrganizationMembership(
  input: OrganizationMembershipMutationInput,
  updatedBy: string,
) {
  const [profile, organization] = await Promise.all([
    db.userProfile.findUnique({
      where: { userId: input.userId },
      select: { id: true },
    }),
    db.organization.findUnique({
      where: { id: input.organizationId },
      select: { id: true, isActive: true },
    }),
  ]);

  if (!profile) {
    throw new Error("No se encontró el usuario.");
  }

  if (!organization || !organization.isActive) {
    throw new Error("La organización no existe o está inactiva.");
  }

  return db.$transaction(async (tx) => {
    const membership = await tx.organizationMember.upsert({
      where: {
        organizationId_userProfileId: {
          organizationId: input.organizationId,
          userProfileId: profile.id,
        },
      },
      create: {
        organizationId: input.organizationId,
        userProfileId: profile.id,
        role: input.role,
        acceptedAt: new Date(),
        invitedBy: updatedBy,
      },
      update: {
        role: input.role,
        isActive: true,
        acceptedAt: new Date(),
        invitedBy: updatedBy,
      },
      select: {
        id: true,
        role: true,
        isActive: true,
        acceptedAt: true,
        organization: {
          select: {
            id: true,
            name: true,
            organizationType: true,
            legalEntityType: true,
            isActive: true,
            isVerified: true,
          },
        },
      },
    });

    await tx.userProfile.update({
      where: { id: profile.id },
      data: { updatedBy },
    });

    return membership;
  });
}

export async function updateOrganizationMembershipRole(
  membershipId: string,
  role: OrganizationRole,
  updatedBy: string,
) {
  return db.$transaction(async (tx) => {
    const membership = await tx.organizationMember.update({
      where: { id: membershipId },
      data: { role },
      select: {
        id: true,
        userProfileId: true,
        role: true,
        isActive: true,
        acceptedAt: true,
        organization: {
          select: {
            id: true,
            name: true,
            organizationType: true,
            legalEntityType: true,
            isActive: true,
            isVerified: true,
          },
        },
      },
    });

    await tx.userProfile.update({
      where: { id: membership.userProfileId },
      data: { updatedBy },
    });

    return membership;
  });
}

export async function removeOrganizationMembership(
  membershipId: string,
  updatedBy: string,
) {
  return db.$transaction(async (tx) => {
    const membership = await tx.organizationMember.update({
      where: { id: membershipId },
      data: { isActive: false },
      select: {
        id: true,
        userProfileId: true,
        isActive: true,
      },
    });

    await tx.userProfile.update({
      where: { id: membership.userProfileId },
      data: { updatedBy },
    });

    return membership;
  });
}

export async function createBrandAndLinkToAgency(
  input: CreateBrandAndLinkInput,
  actorUserId: string,
) {
  const actorProfile = await db.userProfile.findUnique({
    where: { userId: actorUserId },
    select: { id: true },
  });
  if (!actorProfile) {
    throw new Error("No se encontró el perfil del usuario administrador.");
  }

  const agency = await db.organization.findUnique({
    where: { id: input.agencyOrganizationId },
    select: {
      id: true,
      isActive: true,
      organizationType: true,
    },
  });

  if (!agency || !agency.isActive) {
    throw new Error("La agencia no existe o está inactiva.");
  }

  if (agency.organizationType !== OrganizationType.AGENCY) {
    throw new Error("La organización seleccionada no es una agencia.");
  }

  const assigneeProfile = input.assignUserId
    ? await db.userProfile.findUnique({
        where: { userId: input.assignUserId },
        select: { id: true },
      })
    : null;

  if (input.assignUserId && !assigneeProfile) {
    throw new Error("No se encontró el usuario para asignar la marca.");
  }

  return db.$transaction(async (tx) => {
    const brand = await tx.organization.create({
      data: {
        name: input.name.trim(),
        legalName: normalizeOptional(input.legalName) ?? input.name.trim(),
        tradeName: normalizeOptional(input.tradeName),
        taxId: normalizeOptional(input.taxId),
        organizationType: OrganizationType.ADVERTISER,
        legalEntityType: LegalEntityType.LEGAL_ENTITY,
        createdById: actorProfile.id,
      },
      select: {
        id: true,
        name: true,
        legalName: true,
        tradeName: true,
        taxId: true,
        organizationType: true,
        legalEntityType: true,
        isActive: true,
        isVerified: true,
      },
    });

    const relationship = await tx.organizationRelationship.upsert({
      where: {
        sourceOrganizationId_targetOrganizationId_relationshipType: {
          sourceOrganizationId: input.agencyOrganizationId,
          targetOrganizationId: brand.id,
          relationshipType: "AGENCY_CLIENT",
        },
      },
      create: {
        sourceOrganizationId: input.agencyOrganizationId,
        targetOrganizationId: brand.id,
        relationshipType: "AGENCY_CLIENT",
        status: OrganizationRelationshipStatus.ACTIVE,
        createdById: actorProfile.id,
        updatedBy: actorProfile.id,
        ...resolveRelationshipPermissions({}),
      },
      update: {
        status: OrganizationRelationshipStatus.ACTIVE,
        updatedBy: actorProfile.id,
        ...resolveRelationshipPermissions({}),
      },
      select: {
        id: true,
        status: true,
        canCreateRequests: true,
        canCreateOrders: true,
        canViewBilling: true,
        canManageContacts: true,
      },
    });

    const membership =
      assigneeProfile === null
        ? null
        : await tx.organizationMember.upsert({
            where: {
              organizationId_userProfileId: {
                organizationId: brand.id,
                userProfileId: assigneeProfile.id,
              },
            },
            create: {
              organizationId: brand.id,
              userProfileId: assigneeProfile.id,
              role: OrganizationRole.OWNER,
              acceptedAt: new Date(),
              invitedBy: actorUserId,
            },
            update: {
              role: OrganizationRole.OWNER,
              isActive: true,
              acceptedAt: new Date(),
              invitedBy: actorUserId,
            },
            select: {
              id: true,
              role: true,
              isActive: true,
              acceptedAt: true,
            },
          });

    return { brand, relationship, membership };
  });
}

export async function upsertAgencyClientRelationship(
  input: z.infer<typeof upsertAgencyClientRelationshipSchema>,
  actorUserId: string,
) {
  if (input.agencyOrganizationId === input.advertiserOrganizationId) {
    throw new Error("La agencia y la marca no pueden ser la misma organización.");
  }

  const actorProfile = await db.userProfile.findUnique({
    where: { userId: actorUserId },
    select: { id: true },
  });
  if (!actorProfile) {
    throw new Error("No se encontró el perfil del usuario administrador.");
  }

  const [agency, advertiser] = await Promise.all([
    db.organization.findUnique({
      where: { id: input.agencyOrganizationId },
      select: { id: true, isActive: true, organizationType: true },
    }),
    db.organization.findUnique({
      where: { id: input.advertiserOrganizationId },
      select: { id: true, isActive: true, organizationType: true },
    }),
  ]);

  if (!agency || !agency.isActive || agency.organizationType !== OrganizationType.AGENCY) {
    throw new Error("La organización origen debe ser una agencia activa.");
  }

  if (
    !advertiser ||
    !advertiser.isActive ||
    advertiser.organizationType !== OrganizationType.ADVERTISER
  ) {
    throw new Error("La organización destino debe ser una marca activa.");
  }

  const permissions = resolveRelationshipPermissions(input);

  return db.organizationRelationship.upsert({
    where: {
      sourceOrganizationId_targetOrganizationId_relationshipType: {
        sourceOrganizationId: input.agencyOrganizationId,
        targetOrganizationId: input.advertiserOrganizationId,
        relationshipType: "AGENCY_CLIENT",
      },
    },
    create: {
      sourceOrganizationId: input.agencyOrganizationId,
      targetOrganizationId: input.advertiserOrganizationId,
      relationshipType: "AGENCY_CLIENT",
      status: input.status ?? OrganizationRelationshipStatus.ACTIVE,
      createdById: actorProfile.id,
      updatedBy: actorProfile.id,
      ...permissions,
    },
    update: {
      status: input.status ?? OrganizationRelationshipStatus.ACTIVE,
      updatedBy: actorProfile.id,
      ...permissions,
    },
    select: {
      id: true,
      status: true,
      canCreateRequests: true,
      canCreateOrders: true,
      canViewBilling: true,
      canManageContacts: true,
      sourceOrganization: {
        select: { id: true, name: true, organizationType: true },
      },
      targetOrganization: {
        select: { id: true, name: true, organizationType: true },
      },
    },
  });
}

export async function updateAgencyClientRelationshipStatusPermissions(
  input: UpdateAgencyClientRelationshipInput,
  actorUserId: string,
) {
  const actorProfile = await db.userProfile.findUnique({
    where: { userId: actorUserId },
    select: { id: true },
  });
  if (!actorProfile) {
    throw new Error("No se encontró el perfil del usuario administrador.");
  }

  const relationship = await db.organizationRelationship.findUnique({
    where: { id: input.relationshipId },
    select: { id: true, relationshipType: true },
  });

  if (!relationship) {
    throw new Error("La relación agencia-marca no existe.");
  }

  if (relationship.relationshipType !== "AGENCY_CLIENT") {
    throw new Error("Solo se pueden actualizar relaciones de tipo agencia-marca.");
  }

  return db.organizationRelationship.update({
    where: { id: input.relationshipId },
    data: {
      status: input.status,
      canCreateRequests: input.canCreateRequests,
      canCreateOrders: input.canCreateOrders,
      canViewBilling: input.canViewBilling,
      canManageContacts: input.canManageContacts,
      updatedBy: actorProfile.id,
    },
    select: {
      id: true,
      status: true,
      canCreateRequests: true,
      canCreateOrders: true,
      canViewBilling: true,
      canManageContacts: true,
      sourceOrganization: {
        select: { id: true, name: true, organizationType: true },
      },
      targetOrganization: {
        select: { id: true, name: true, organizationType: true },
      },
    },
  });
}
