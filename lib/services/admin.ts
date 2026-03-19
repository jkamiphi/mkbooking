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

const brandAccessStatusSchema = z.enum([
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
  relationshipStatus: brandAccessStatusSchema.optional(),
  search: z.string().optional(),
  skip: z.number().min(0).default(0),
  take: z.number().min(1).max(100).default(20),
  orderBy: z.enum(["createdAt", "email", "name"]).optional(),
  orderDirection: z.enum(["asc", "desc"]).optional(),
});

const managedOrganizationTypeSchema = z.enum(["DIRECT_CLIENT", "AGENCY"]);

export const adminListManagedOrganizationsSchema = z.object({
  organizationType: managedOrganizationTypeSchema.optional(),
  legalEntityType: z.nativeEnum(LegalEntityType).optional(),
  isActive: z.boolean().optional(),
  isVerified: z.boolean().optional(),
  search: z.string().optional(),
  skip: z.number().min(0).default(0),
  take: z.number().min(1).max(100).default(20),
  orderBy: z.enum(["createdAt", "name"]).optional(),
  orderDirection: z.enum(["asc", "desc"]).optional(),
});

export const adminListBrandsSchema = z.object({
  isActive: z.boolean().optional(),
  isVerified: z.boolean().optional(),
  relationshipStatus: brandAccessStatusSchema.optional(),
  search: z.string().optional(),
  skip: z.number().min(0).default(0),
  take: z.number().min(1).max(100).default(20),
  orderBy: z.enum(["createdAt", "name"]).optional(),
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
  brandId: z.string().min(1),
  status: brandAccessStatusSchema.optional(),
  canCreateRequests: z.boolean().optional(),
  canCreateOrders: z.boolean().optional(),
  canViewBilling: z.boolean().optional(),
  canManageContacts: z.boolean().optional(),
});

export const updateAgencyClientRelationshipStatusPermissionsSchema = z
  .object({
    relationshipId: z.string().min(1),
    status: brandAccessStatusSchema.optional(),
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
export type AdminListManagedOrganizationsInput = z.infer<
  typeof adminListManagedOrganizationsSchema
>;
export type AdminListBrandsInput = z.infer<typeof adminListBrandsSchema>;
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

export interface AdminManagedOrganizationRow {
  id: string;
  name: string;
  legalName: string | null;
  tradeName: string | null;
  organizationType: OrganizationType;
  managedType: z.infer<typeof managedOrganizationTypeSchema>;
  legalEntityType: LegalEntityType;
  taxId: string | null;
  cedula: string | null;
  email: string | null;
  phone: string | null;
  website: string | null;
  industry: string | null;
  addressLine1: string | null;
  city: string | null;
  province: string | null;
  description: string | null;
  isActive: boolean;
  isVerified: boolean;
  createdAt: Date;
}

export interface AdminBrandAgencyLink {
  id: string;
  status: OrganizationRelationshipStatus;
  canCreateRequests: boolean;
  canCreateOrders: boolean;
  canViewBilling: boolean;
  canManageContacts: boolean;
  sourceOrganization: {
    id: string;
    name: string;
    isActive: boolean;
  };
}

export interface AdminBrandRow {
  id: string;
  name: string;
  legalName: string | null;
  tradeName: string | null;
  legalEntityType: LegalEntityType;
  taxId: string | null;
  isActive: boolean;
  isVerified: boolean;
  createdAt: Date;
  relationshipSummary: AdminAccountRelationshipSummary;
  linkedAgencies: AdminBrandAgencyLink[];
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

function getDirectClientWhereClause(): Prisma.OrganizationWhereInput {
  return {
    organizationType: OrganizationType.DIRECT_CLIENT,
  };
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
      ? await db.brandAccess.findMany({
          where: {
            organizationId: { in: agencyOrganizationIds },
          },
          select: {
            organizationId: true,
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
      relationshipStatusesByAgency.get(relationship.organizationId) ?? [];
    existing.push(relationship.status);
    relationshipStatusesByAgency.set(relationship.organizationId, existing);
  }

  let accounts: AdminAccountRow[] = profiles.map((profile) => {
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

  if (relationshipStatus) {
    accounts = accounts.filter((account) => {
      if (relationshipStatus === OrganizationRelationshipStatus.ACTIVE) {
        return account.relationshipSummary.active > 0;
      }
      if (relationshipStatus === OrganizationRelationshipStatus.PENDING) {
        return account.relationshipSummary.pending > 0;
      }
      return account.relationshipSummary.inactive > 0;
    });
  }

  return {
    accounts,
    total: relationshipStatus ? accounts.length : total,
    hasMore: relationshipStatus ? false : skip + accounts.length < total,
  };
}

export async function adminListManagedOrganizations(
  input: AdminListManagedOrganizationsInput,
): Promise<{
  managedOrganizations: AdminManagedOrganizationRow[];
  total: number;
  hasMore: boolean;
}> {
  const {
    organizationType,
    legalEntityType,
    isActive,
    isVerified,
    search,
    skip,
    take,
    orderBy,
    orderDirection,
  } = input;

  const andFilters: Prisma.OrganizationWhereInput[] = [];

  if (organizationType === "AGENCY") {
    andFilters.push({ organizationType: OrganizationType.AGENCY });
  } else if (organizationType === "DIRECT_CLIENT") {
    andFilters.push(getDirectClientWhereClause());
  } else {
    andFilters.push({
      OR: [
        { organizationType: OrganizationType.AGENCY },
        getDirectClientWhereClause(),
      ],
    });
  }

  if (legalEntityType) {
    andFilters.push({ legalEntityType });
  }
  if (isActive !== undefined) {
    andFilters.push({ isActive });
  }
  if (isVerified !== undefined) {
    andFilters.push({ isVerified });
  }
  if (search?.trim()) {
    const normalizedSearch = search.trim();
    andFilters.push({
      OR: [
        { name: { contains: normalizedSearch, mode: "insensitive" } },
        { legalName: { contains: normalizedSearch, mode: "insensitive" } },
        { tradeName: { contains: normalizedSearch, mode: "insensitive" } },
        { taxId: { contains: normalizedSearch, mode: "insensitive" } },
        { cedula: { contains: normalizedSearch, mode: "insensitive" } },
      ],
    });
  }

  const where: Prisma.OrganizationWhereInput =
    andFilters.length > 0 ? { AND: andFilters } : {};

  const prismaOrderBy: Prisma.OrganizationOrderByWithRelationInput =
    orderBy === "name"
      ? { name: orderDirection ?? "asc" }
      : { createdAt: orderDirection ?? "desc" };

  const [organizations, total] = await Promise.all([
    db.organization.findMany({
      where,
      skip,
      take,
      orderBy: orderBy ? prismaOrderBy : { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        legalName: true,
        tradeName: true,
        organizationType: true,
        legalEntityType: true,
        taxId: true,
        cedula: true,
        email: true,
        phone: true,
        website: true,
        industry: true,
        addressLine1: true,
        city: true,
        province: true,
        description: true,
        isActive: true,
        isVerified: true,
        createdAt: true,
      },
    }),
    db.organization.count({ where }),
  ]);

  return {
    managedOrganizations: organizations.map((organization) => ({
      ...organization,
      managedType:
        organization.organizationType === OrganizationType.AGENCY
          ? "AGENCY"
          : "DIRECT_CLIENT",
    })),
    total,
    hasMore: skip + organizations.length < total,
  };
}

export async function adminListBrands(
  input: AdminListBrandsInput,
): Promise<{ brands: AdminBrandRow[]; total: number; hasMore: boolean }> {
  const {
    isActive,
    isVerified,
    relationshipStatus,
    search,
    skip,
    take,
    orderBy,
    orderDirection,
  } = input;

  const andFilters: Prisma.BrandWhereInput[] = [];

  if (relationshipStatus) {
    andFilters.push({
      accesses: {
        some: {
          status: relationshipStatus,
        },
      },
    });
  }
  if (isActive !== undefined) {
    andFilters.push({ isActive });
  }
  if (isVerified !== undefined) {
    andFilters.push({ isVerified });
  }
  if (search?.trim()) {
    const normalizedSearch = search.trim();
    andFilters.push({
      OR: [
        { name: { contains: normalizedSearch, mode: "insensitive" } },
        { legalName: { contains: normalizedSearch, mode: "insensitive" } },
        { tradeName: { contains: normalizedSearch, mode: "insensitive" } },
        { taxId: { contains: normalizedSearch, mode: "insensitive" } },
      ],
    });
  }

  const where: Prisma.BrandWhereInput = andFilters.length > 0 ? { AND: andFilters } : {};
  const prismaOrderBy: Prisma.BrandOrderByWithRelationInput =
    orderBy === "name"
      ? { name: orderDirection ?? "asc" }
      : { createdAt: orderDirection ?? "desc" };

  const [brands, total] = await Promise.all([
    db.brand.findMany({
      where,
      skip,
      take,
      orderBy: orderBy ? prismaOrderBy : { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        legalName: true,
        tradeName: true,
        legalEntityType: true,
        taxId: true,
        isActive: true,
        isVerified: true,
        createdAt: true,
        accesses: {
          orderBy: [
            { status: "asc" },
            { organization: { name: "asc" } },
          ],
          select: {
            id: true,
            status: true,
            canCreateRequests: true,
            canCreateOrders: true,
            canViewBilling: true,
            canManageContacts: true,
            organization: {
              select: {
                id: true,
                name: true,
                isActive: true,
              },
            },
          },
        },
      },
    }),
    db.brand.count({ where }),
  ]);

  const mappedBrands: AdminBrandRow[] = brands.map((brand) => ({
    id: brand.id,
    name: brand.name,
    legalName: brand.legalName,
    tradeName: brand.tradeName,
    legalEntityType: brand.legalEntityType,
    taxId: brand.taxId,
    isActive: brand.isActive,
    isVerified: brand.isVerified,
    createdAt: brand.createdAt,
    relationshipSummary: buildRelationshipSummary(
      brand.accesses.map((relationship) => relationship.status),
    ),
    linkedAgencies: brand.accesses.map((relationship) => ({
      id: relationship.id,
      status: relationship.status,
      canCreateRequests: relationship.canCreateRequests,
      canCreateOrders: relationship.canCreateOrders,
      canViewBilling: relationship.canViewBilling,
      canManageContacts: relationship.canManageContacts,
      sourceOrganization: relationship.organization,
    })),
  }));

  return {
    brands: mappedBrands,
    total,
    hasMore: skip + mappedBrands.length < total,
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

  const organizationIds = profile.organizationRoles.map(
    (membership) => membership.organization.id,
  );

  const [managedAccesses, clientAccesses] = await Promise.all([
    agencyOrganizationIds.length > 0
      ? db.brandAccess.findMany({
          where: {
            organizationId: { in: agencyOrganizationIds },
          },
          orderBy: [{ status: "asc" }, { brand: { name: "asc" } }],
          select: {
            id: true,
            status: true,
            canCreateRequests: true,
            canCreateOrders: true,
            canViewBilling: true,
            canManageContacts: true,
            organization: {
              select: {
                id: true,
                name: true,
                organizationType: true,
              },
            },
            brand: {
              select: {
                id: true,
                name: true,
                ownerOrganization: {
                  select: {
                    organizationType: true,
                  },
                },
              },
            },
          },
        })
      : Promise.resolve([]),
    organizationIds.length > 0
      ? db.brandAccess.findMany({
          where: {
            brand: {
              ownerOrganizationId: { in: organizationIds },
            },
          },
          orderBy: [{ status: "asc" }, { organization: { name: "asc" } }],
          select: {
            id: true,
            status: true,
            canCreateRequests: true,
            canCreateOrders: true,
            canViewBilling: true,
            canManageContacts: true,
            organization: {
              select: {
                id: true,
                name: true,
                organizationType: true,
              },
            },
            brand: {
              select: {
                id: true,
                name: true,
                ownerOrganization: {
                  select: {
                    organizationType: true,
                  },
                },
              },
            },
          },
        })
      : Promise.resolve([]),
  ]);

  const managedRelationships = managedAccesses.map((relationship) => ({
    id: relationship.id,
    status: relationship.status,
    canCreateRequests: relationship.canCreateRequests,
    canCreateOrders: relationship.canCreateOrders,
    canViewBilling: relationship.canViewBilling,
    canManageContacts: relationship.canManageContacts,
    sourceOrganization: relationship.organization,
    targetOrganization: {
      id: relationship.brand.id,
      name: relationship.brand.name,
      organizationType:
        relationship.brand.ownerOrganization?.organizationType ??
        OrganizationType.DIRECT_CLIENT,
    },
  }));

  const clientRelationships = clientAccesses.map((relationship) => ({
    id: relationship.id,
    status: relationship.status,
    canCreateRequests: relationship.canCreateRequests,
    canCreateOrders: relationship.canCreateOrders,
    canViewBilling: relationship.canViewBilling,
    canManageContacts: relationship.canManageContacts,
    sourceOrganization: relationship.organization,
    targetOrganization: {
      id: relationship.brand.id,
      name: relationship.brand.name,
      organizationType:
        relationship.brand.ownerOrganization?.organizationType ??
        OrganizationType.DIRECT_CLIENT,
    },
  }));

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

  const assigneeOwnerOrganizationId = assigneeProfile
    ? (
        await db.organizationMember.findFirst({
          where: {
            userProfileId: assigneeProfile.id,
            isActive: true,
            role: { in: [OrganizationRole.OWNER, OrganizationRole.ADMIN] },
            organization: {
              isActive: true,
              organizationType: OrganizationType.DIRECT_CLIENT,
            },
          },
          select: { organizationId: true },
        })
      )?.organizationId ?? null
    : null;

  return db.$transaction(async (tx) => {
    const brand = await tx.brand.create({
      data: {
        ownerOrganizationId: assigneeOwnerOrganizationId,
        name: input.name.trim(),
        legalName: normalizeOptional(input.legalName) ?? input.name.trim(),
        tradeName: normalizeOptional(input.tradeName),
        taxId: normalizeOptional(input.taxId),
        legalEntityType: LegalEntityType.LEGAL_ENTITY,
        createdBy: actorProfile.id,
        updatedBy: actorProfile.id,
      },
      select: {
        id: true,
        name: true,
        legalName: true,
        tradeName: true,
        taxId: true,
        legalEntityType: true,
        isActive: true,
        isVerified: true,
      },
    });

    const relationship = await tx.brandAccess.upsert({
      where: {
        organizationId_brandId: {
          organizationId: input.agencyOrganizationId,
          brandId: brand.id,
        },
      },
      create: {
        organizationId: input.agencyOrganizationId,
        brandId: brand.id,
        accessType: "DELEGATED",
        status: OrganizationRelationshipStatus.ACTIVE,
        createdBy: actorProfile.id,
        updatedBy: actorProfile.id,
        ...resolveRelationshipPermissions({}),
      },
      update: {
        accessType: "DELEGATED",
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

    if (assigneeOwnerOrganizationId) {
      await tx.brandAccess.upsert({
        where: {
          organizationId_brandId: {
            organizationId: assigneeOwnerOrganizationId,
            brandId: brand.id,
          },
        },
        create: {
          organizationId: assigneeOwnerOrganizationId,
          brandId: brand.id,
          accessType: "OWNER",
          status: OrganizationRelationshipStatus.ACTIVE,
          canCreateRequests: true,
          canCreateOrders: true,
          canViewBilling: true,
          canManageContacts: true,
          createdBy: actorProfile.id,
          updatedBy: actorProfile.id,
        },
        update: {
          accessType: "OWNER",
          status: OrganizationRelationshipStatus.ACTIVE,
          canCreateRequests: true,
          canCreateOrders: true,
          canViewBilling: true,
          canManageContacts: true,
          updatedBy: actorProfile.id,
        },
      });
    }

    return { brand, relationship, membership: null };
  });
}

export async function upsertAgencyClientRelationship(
  input: z.infer<typeof upsertAgencyClientRelationshipSchema>,
  actorUserId: string,
) {
  if (input.agencyOrganizationId === input.brandId) {
    throw new Error("La agencia y la marca no pueden ser la misma organización.");
  }

  const actorProfile = await db.userProfile.findUnique({
    where: { userId: actorUserId },
    select: { id: true },
  });
  if (!actorProfile) {
    throw new Error("No se encontró el perfil del usuario administrador.");
  }

  const [agency, brand] = await Promise.all([
    db.organization.findUnique({
      where: { id: input.agencyOrganizationId },
      select: { id: true, isActive: true, organizationType: true },
    }),
    db.brand.findUnique({
      where: { id: input.brandId },
      select: {
        id: true,
        isActive: true,
        name: true,
        ownerOrganization: {
          select: {
            organizationType: true,
          },
        },
      },
    }),
  ]);

  if (!agency || !agency.isActive || agency.organizationType !== OrganizationType.AGENCY) {
    throw new Error("La organización origen debe ser una agencia activa.");
  }

  if (
    !brand ||
    !brand.isActive
  ) {
    throw new Error("La organización destino debe ser una marca activa.");
  }

  const permissions = resolveRelationshipPermissions(input);

  const relationship = await db.brandAccess.upsert({
    where: {
      organizationId_brandId: {
        organizationId: input.agencyOrganizationId,
        brandId: input.brandId,
      },
    },
    create: {
      organizationId: input.agencyOrganizationId,
      brandId: input.brandId,
      accessType: "DELEGATED",
      status: input.status ?? OrganizationRelationshipStatus.ACTIVE,
      createdBy: actorProfile.id,
      updatedBy: actorProfile.id,
      ...permissions,
    },
    update: {
      accessType: "DELEGATED",
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
      organization: {
        select: { id: true, name: true, organizationType: true },
      },
      brand: {
        select: {
          id: true,
          name: true,
          ownerOrganization: {
            select: { organizationType: true },
          },
        },
      },
    },
  });

  return {
    ...relationship,
    sourceOrganization: relationship.organization,
    targetOrganization: {
      id: relationship.brand.id,
      name: relationship.brand.name,
      organizationType:
        relationship.brand.ownerOrganization?.organizationType ??
        OrganizationType.DIRECT_CLIENT,
    },
  };
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

  const relationship = await db.brandAccess.findUnique({
    where: { id: input.relationshipId },
    select: { id: true },
  });

  if (!relationship) {
    throw new Error("La relación agencia-marca no existe.");
  }

  const updated = await db.brandAccess.update({
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
      organization: {
        select: { id: true, name: true, organizationType: true },
      },
      brand: {
        select: {
          id: true,
          name: true,
          ownerOrganization: {
            select: { organizationType: true },
          },
        },
      },
    },
  });

  return {
    ...updated,
    sourceOrganization: updated.organization,
    targetOrganization: {
      id: updated.brand.id,
      name: updated.brand.name,
      organizationType:
        updated.brand.ownerOrganization?.organizationType ??
        OrganizationType.DIRECT_CLIENT,
    },
  };
}
