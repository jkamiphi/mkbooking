import { db } from "@/lib/db";
import {
  OrganizationRelationshipStatus,
  BrandAccessType,
  OrganizationRole,
  OrganizationType,
  UserAccountType,
} from "@prisma/client";

export const ORGANIZATION_CONTEXT_COOKIE_NAME = "mk_active_org_ctx";

export type OrganizationAccessType = "DIRECT" | "DELEGATED";
export type OrganizationContextDisplayCategory =
  | "OWN_BRAND"
  | "OWN_AGENCY"
  | "CLIENT_BRAND"
  | "DIRECT_ACCESS";

export type OrganizationOperatingEntityType = "DIRECT_CLIENT" | "AGENCY";

export interface OrganizationContextPermissions {
  canCreateRequests: boolean;
  canCreateOrders: boolean;
  canViewBilling: boolean;
  canManageContacts: boolean;
}

export interface AccessibleOrganizationContext {
  contextKey: string;
  organizationId: string;
  brandId: string | null;
  organizationName: string;
  organizationType: OrganizationType;
  logoUrl: string | null;
  accessType: OrganizationAccessType;
  viaOrganizationId: string | null;
  viaOrganizationName: string | null;
  viaOrganizationType: OrganizationType | null;
  role: OrganizationRole;
  permissions: OrganizationContextPermissions;
  displayCategory: OrganizationContextDisplayCategory;
  displayLabel: string;
  displayMeta: string;
  operatingEntityType: OrganizationOperatingEntityType;
  operatingAgencyOrganizationId: string | null;
  operatingAgencyOrganizationName: string | null;
  targetBrandOrganizationId: string | null;
  operatingSummary: string;
  isOwnedWorkspace: boolean;
}

export interface OrganizationOperationScope {
  organizationId: string;
  actingAgencyOrganizationId: string | null;
  requiresActingAgencyMatch: boolean;
}

export type OrganizationReadViewScope = "CONTEXT" | "ALL";
export type OrganizationReadScopeMode =
  | "CONTEXT_BRAND"
  | "AGENCY_AGGREGATE"
  | "ALL_ACCESS";

export interface OrganizationReadScopeCondition {
  organizationId?: string;
  actingAgencyOrganizationId?: string | null;
}

export interface ResolvedOrganizationReadScope {
  mode: OrganizationReadScopeMode;
  accountType: UserAccountType;
  activeContext: AccessibleOrganizationContext | null;
  contexts: AccessibleOrganizationContext[];
  conditions: OrganizationReadScopeCondition[];
}

export type OrganizationPermissionKey = keyof OrganizationContextPermissions;

type RequestedOrganizationContext = {
  accessType: OrganizationAccessType;
  organizationId: string;
  viaOrganizationId: string | null;
};

const directPermissionMatrix: Record<
  OrganizationRole,
  OrganizationContextPermissions
> = {
  OWNER: {
    canCreateRequests: true,
    canCreateOrders: true,
    canViewBilling: true,
    canManageContacts: true,
  },
  ADMIN: {
    canCreateRequests: true,
    canCreateOrders: true,
    canViewBilling: true,
    canManageContacts: true,
  },
  SALES: {
    canCreateRequests: true,
    canCreateOrders: true,
    canViewBilling: false,
    canManageContacts: false,
  },
  OPERATIONS: {
    canCreateRequests: false,
    canCreateOrders: false,
    canViewBilling: false,
    canManageContacts: true,
  },
  FINANCE: {
    canCreateRequests: false,
    canCreateOrders: false,
    canViewBilling: true,
    canManageContacts: false,
  },
  VIEWER: {
    canCreateRequests: false,
    canCreateOrders: false,
    canViewBilling: false,
    canManageContacts: false,
  },
  CLIENT_VIEWER: {
    canCreateRequests: false,
    canCreateOrders: false,
    canViewBilling: false,
    canManageContacts: false,
  },
};

function intersectPermissions(
  basePermissions: OrganizationContextPermissions,
  grantPermissions: OrganizationContextPermissions,
): OrganizationContextPermissions {
  return {
    canCreateRequests:
      basePermissions.canCreateRequests && grantPermissions.canCreateRequests,
    canCreateOrders:
      basePermissions.canCreateOrders && grantPermissions.canCreateOrders,
    canViewBilling:
      basePermissions.canViewBilling && grantPermissions.canViewBilling,
    canManageContacts:
      basePermissions.canManageContacts && grantPermissions.canManageContacts,
  };
}

export function createOrganizationContextKey(
  context: RequestedOrganizationContext,
) {
  return [
    context.accessType.toLowerCase(),
    context.organizationId,
    context.viaOrganizationId ?? "",
  ].join(":");
}

export function parseOrganizationContextKey(
  value?: string | null,
): RequestedOrganizationContext | null {
  if (!value) {
    return null;
  }

  const [rawAccessType, organizationId, rawViaOrganizationId = ""] =
    value.split(":");

  if (!organizationId) {
    return null;
  }

  if (rawAccessType !== "direct" && rawAccessType !== "delegated") {
    return null;
  }

  if (rawAccessType === "delegated" && !rawViaOrganizationId) {
    return null;
  }

  return {
    accessType: rawAccessType === "direct" ? "DIRECT" : "DELEGATED",
    organizationId,
    viaOrganizationId: rawViaOrganizationId || null,
  };
}

function readCookieValue(
  cookieHeader: string | null | undefined,
  cookieName: string,
) {
  if (!cookieHeader) {
    return null;
  }

  const cookies = cookieHeader.split(";");
  for (const cookie of cookies) {
    const [rawName, ...rawValueParts] = cookie.trim().split("=");
    if (rawName !== cookieName) {
      continue;
    }

    const rawValue = rawValueParts.join("=");
    if (!rawValue) {
      return null;
    }

    try {
      return decodeURIComponent(rawValue);
    } catch {
      return rawValue;
    }
  }

  return null;
}

export function parseOrganizationContextCookieHeader(
  cookieHeader?: string | null,
) {
  return readCookieValue(cookieHeader, ORGANIZATION_CONTEXT_COOKIE_NAME);
}

function buildDelegatedPermissions(
  role: OrganizationRole,
  relationship: {
    canCreateRequests: boolean;
    canCreateOrders: boolean;
    canViewBilling: boolean;
    canManageContacts: boolean;
  },
) {
  return intersectPermissions(directPermissionMatrix[role], {
    canCreateRequests: relationship.canCreateRequests,
    canCreateOrders: relationship.canCreateOrders,
    canViewBilling: relationship.canViewBilling,
    canManageContacts: relationship.canManageContacts,
  });
}

function resolveContextDisplayMetadata(input: {
  accessType: OrganizationAccessType;
  organizationType: OrganizationType;
  organizationName: string;
  role: OrganizationRole;
  operatingAgencyOrganizationName: string | null;
  hasBrandTarget: boolean;
}) {
  const isOwnedWorkspace =
    input.accessType === "DIRECT" && input.role === OrganizationRole.OWNER;
  const hasOperatingAgency = Boolean(input.operatingAgencyOrganizationName);

  if (input.hasBrandTarget && hasOperatingAgency) {
    const agencyName = input.operatingAgencyOrganizationName as string;
    return {
      displayCategory: "CLIENT_BRAND" as const,
      displayMeta: `Operas como ${agencyName}`,
      operatingEntityType: "AGENCY" as const,
      operatingSummary: `${agencyName} operando para ${input.organizationName}`,
      isOwnedWorkspace: false,
    };
  }

  if (
    input.accessType === "DIRECT" &&
    input.organizationType === OrganizationType.DIRECT_CLIENT &&
    input.hasBrandTarget &&
    isOwnedWorkspace
  ) {
    return {
      displayCategory: "OWN_BRAND" as const,
      displayMeta: "Propio",
      operatingEntityType: "DIRECT_CLIENT" as const,
      operatingSummary: input.organizationName,
      isOwnedWorkspace,
    };
  }

  if (
    input.accessType === "DIRECT" &&
    input.organizationType === OrganizationType.AGENCY &&
    !input.hasBrandTarget &&
    isOwnedWorkspace
  ) {
    return {
      displayCategory: "OWN_AGENCY" as const,
      displayMeta: "Agencia propia",
      operatingEntityType: "AGENCY" as const,
      operatingSummary: input.organizationName,
      isOwnedWorkspace,
    };
  }

  if (input.accessType === "DELEGATED") {
    return {
      displayCategory: "CLIENT_BRAND" as const,
      displayMeta: "Acceso delegado",
      operatingEntityType: "AGENCY" as const,
      operatingSummary: input.organizationName,
      isOwnedWorkspace: false,
    };
  }

  return {
    displayCategory: "DIRECT_ACCESS" as const,
    displayMeta: "Acceso directo compartido",
    operatingEntityType:
      input.organizationType === OrganizationType.AGENCY
        ? ("AGENCY" as const)
        : ("DIRECT_CLIENT" as const),
    operatingSummary: input.organizationName,
    isOwnedWorkspace,
  };
}

function sortOrganizationContexts(contexts: AccessibleOrganizationContext[]) {
  return [...contexts].sort((first, second) => {
    if (first.accessType !== second.accessType) {
      return first.accessType === "DIRECT" ? -1 : 1;
    }

    const organizationOrder = first.organizationName.localeCompare(
      second.organizationName,
      "es",
      { sensitivity: "base" },
    );
    if (organizationOrder !== 0) {
      return organizationOrder;
    }

    return (first.viaOrganizationName ?? "").localeCompare(
      second.viaOrganizationName ?? "",
      "es",
      { sensitivity: "base" },
    );
  });
}

export async function listAccessibleOrganizationContextsForUser(userId: string) {
  const profile = await db.userProfile.findUnique({
    where: { userId },
    select: {
      accountType: true,
      organizationRoles: {
        where: {
          isActive: true,
          organization: {
            isActive: true,
          },
        },
        select: {
          role: true,
          organizationId: true,
          organization: {
            select: {
              id: true,
              name: true,
              organizationType: true,
              logoUrl: true,
              ownedBrands: {
                where: { isActive: true },
                select: {
                  id: true,
                  name: true,
                  logoUrl: true,
                  ownerOrganization: {
                    select: {
                      organizationType: true,
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  });

  if (!profile) {
    return [];
  }

  const agencyMemberships = profile.organizationRoles.filter(
    (membership) =>
      membership.organization.organizationType === OrganizationType.AGENCY,
  );

  const directContexts: AccessibleOrganizationContext[] = [];

  for (const membership of profile.organizationRoles) {
    const organization = membership.organization;

    const pushBrandContext = (input: {
      brandId: string;
      brandName: string;
      brandLogoUrl: string | null;
      ownerOrganizationType: OrganizationType;
      accessType: OrganizationAccessType;
      viaOrganizationId: string | null;
      viaOrganizationName: string | null;
      viaOrganizationType: OrganizationType | null;
      operatingAgencyOrganizationId: string | null;
      operatingAgencyOrganizationName: string | null;
      delegatedPermissions?: OrganizationContextPermissions;
    }) => {
      const metadata = resolveContextDisplayMetadata({
        accessType: input.accessType,
        organizationType: input.ownerOrganizationType,
        organizationName: input.brandName,
        role: membership.role,
        operatingAgencyOrganizationName: input.operatingAgencyOrganizationName,
        hasBrandTarget: true,
      });

      directContexts.push({
        ...metadata,
        contextKey: createOrganizationContextKey({
          accessType: input.accessType,
          organizationId: input.brandId,
          viaOrganizationId: input.viaOrganizationId,
        }),
        organizationId: input.brandId,
        brandId: input.brandId,
        organizationName: input.brandName,
        organizationType: input.ownerOrganizationType,
        logoUrl: input.brandLogoUrl,
        accessType: input.accessType,
        viaOrganizationId: input.viaOrganizationId,
        viaOrganizationName: input.viaOrganizationName,
        viaOrganizationType: input.viaOrganizationType,
        role: membership.role,
        permissions:
          input.delegatedPermissions ?? directPermissionMatrix[membership.role],
        displayLabel: input.brandName,
        operatingAgencyOrganizationId: input.operatingAgencyOrganizationId,
        operatingAgencyOrganizationName: input.operatingAgencyOrganizationName,
        targetBrandOrganizationId: input.brandId,
      });
    };

    if (
      organization.organizationType === OrganizationType.DIRECT_CLIENT ||
      organization.organizationType === OrganizationType.AGENCY
    ) {
      for (const ownedBrand of organization.ownedBrands) {
        pushBrandContext({
          brandId: ownedBrand.id,
          brandName: ownedBrand.name,
          brandLogoUrl: ownedBrand.logoUrl,
          ownerOrganizationType:
            ownedBrand.ownerOrganization?.organizationType ??
            organization.organizationType,
          accessType: "DIRECT",
          viaOrganizationId: null,
          viaOrganizationName: null,
          viaOrganizationType: null,
          operatingAgencyOrganizationId:
            organization.organizationType === OrganizationType.AGENCY
              ? organization.id
              : null,
          operatingAgencyOrganizationName:
            organization.organizationType === OrganizationType.AGENCY
              ? organization.name
              : null,
        });
      }
    }

    if (organization.organizationType === OrganizationType.AGENCY) {
      const metadata = resolveContextDisplayMetadata({
        accessType: "DIRECT",
        organizationType: OrganizationType.AGENCY,
        organizationName: organization.name,
        role: membership.role,
        operatingAgencyOrganizationName: null,
        hasBrandTarget: false,
      });

      directContexts.push({
        ...metadata,
        contextKey: createOrganizationContextKey({
          accessType: "DIRECT",
          organizationId: organization.id,
          viaOrganizationId: null,
        }),
        organizationId: organization.id,
        brandId: null,
        organizationName: organization.name,
        organizationType: organization.organizationType,
        logoUrl: organization.logoUrl,
        accessType: "DIRECT",
        viaOrganizationId: null,
        viaOrganizationName: null,
        viaOrganizationType: null,
        role: membership.role,
        permissions: directPermissionMatrix[membership.role],
        displayLabel: organization.name,
        operatingAgencyOrganizationId: null,
        operatingAgencyOrganizationName: null,
        targetBrandOrganizationId: null,
      });
      continue;
    }

    if (
      organization.organizationType !== OrganizationType.DIRECT_CLIENT
    ) {
      const metadata = resolveContextDisplayMetadata({
        accessType: "DIRECT",
        organizationType: organization.organizationType,
        organizationName: organization.name,
        role: membership.role,
        operatingAgencyOrganizationName: null,
        hasBrandTarget: false,
      });

      directContexts.push({
        ...metadata,
        contextKey: createOrganizationContextKey({
          accessType: "DIRECT",
          organizationId: organization.id,
          viaOrganizationId: null,
        }),
        organizationId: organization.id,
        brandId: null,
        organizationName: organization.name,
        organizationType: organization.organizationType,
        logoUrl: organization.logoUrl,
        accessType: "DIRECT",
        viaOrganizationId: null,
        viaOrganizationName: null,
        viaOrganizationType: null,
        role: membership.role,
        permissions: directPermissionMatrix[membership.role],
        displayLabel: organization.name,
        operatingAgencyOrganizationId: null,
        operatingAgencyOrganizationName: null,
        targetBrandOrganizationId: null,
      });
    }
  }

  if (agencyMemberships.length === 0) {
    return sortOrganizationContexts(directContexts);
  }

  const agencyRoleById = new Map(
    agencyMemberships.map((membership) => [
      membership.organizationId,
      {
        role: membership.role,
        sourceOrganizationName: membership.organization.name,
        sourceOrganizationType: membership.organization.organizationType,
      },
    ]),
  );

  const delegatedAccesses = await db.brandAccess.findMany({
    where: {
      organizationId: {
        in: agencyMemberships.map((membership) => membership.organizationId),
      },
      status: OrganizationRelationshipStatus.ACTIVE,
      accessType: {
        in: [BrandAccessType.DELEGATED, BrandAccessType.OWNER],
      },
      organization: {
        isActive: true,
        organizationType: OrganizationType.AGENCY,
      },
      brand: {
        isActive: true,
      },
    },
    select: {
      organizationId: true,
      brandId: true,
      canCreateRequests: true,
      canCreateOrders: true,
      canViewBilling: true,
      canManageContacts: true,
      brand: {
        select: {
          id: true,
          name: true,
          logoUrl: true,
          ownerOrganization: {
            select: {
              organizationType: true,
            },
          },
        },
      },
    },
  });

  const delegatedContexts: AccessibleOrganizationContext[] = [];
  for (const access of delegatedAccesses) {
    const agencyMembership = agencyRoleById.get(access.organizationId);
    if (!agencyMembership) {
      continue;
    }

    delegatedContexts.push({
      ...resolveContextDisplayMetadata({
        accessType: "DELEGATED",
        organizationType:
          access.brand.ownerOrganization?.organizationType ??
          OrganizationType.DIRECT_CLIENT,
        organizationName: access.brand.name,
        role: agencyMembership.role,
        operatingAgencyOrganizationName: agencyMembership.sourceOrganizationName,
        hasBrandTarget: true,
      }),
      contextKey: createOrganizationContextKey({
        accessType: "DELEGATED",
        organizationId: access.brandId,
        viaOrganizationId: access.organizationId,
      }),
      organizationId: access.brand.id,
      brandId: access.brand.id,
      organizationName: access.brand.name,
      organizationType:
        access.brand.ownerOrganization?.organizationType ??
        OrganizationType.DIRECT_CLIENT,
      logoUrl: access.brand.logoUrl,
      accessType: "DELEGATED",
      viaOrganizationId: access.organizationId,
      viaOrganizationName: agencyMembership.sourceOrganizationName,
      viaOrganizationType: agencyMembership.sourceOrganizationType,
      role: agencyMembership.role,
      permissions: buildDelegatedPermissions(agencyMembership.role, access),
      displayLabel: access.brand.name,
      operatingAgencyOrganizationId: access.organizationId,
      operatingAgencyOrganizationName: agencyMembership.sourceOrganizationName,
      targetBrandOrganizationId: access.brand.id,
    });
  }

  const dedupedByContextKey = new Map<string, AccessibleOrganizationContext>();
  for (const context of [...directContexts, ...delegatedContexts]) {
    if (!dedupedByContextKey.has(context.contextKey)) {
      dedupedByContextKey.set(context.contextKey, context);
    }
  }

  return sortOrganizationContexts(Array.from(dedupedByContextKey.values()));
}

export async function resolveActiveOrganizationContextForUser(
  userId: string,
  requestedContextKey?: string | null,
) {
  const profile = await db.userProfile.findUnique({
    where: { userId },
    select: { accountType: true },
  });
  const persistedAccountType =
    profile?.accountType ?? UserAccountType.DIRECT_CLIENT;
  const contexts = await listAccessibleOrganizationContextsForUser(userId);
  const hasDirectAgencyContext = contexts.some(
    (context) =>
      context.organizationType === OrganizationType.AGENCY &&
      context.accessType === "DIRECT",
  );
  const accountType =
    persistedAccountType === UserAccountType.AGENCY || hasDirectAgencyContext
      ? UserAccountType.AGENCY
      : UserAccountType.DIRECT_CLIENT;
  const hasAccessibleContexts = contexts.length > 0;
  const hasDirectOrganizations = contexts.some(
    (context) => context.accessType === "DIRECT",
  );
  if (contexts.length === 0) {
    return {
      contexts,
      activeContext: null,
      hasAccessibleContexts,
      hasDirectOrganizations,
      needsStarterSetup: true,
      canSkipStarterSetup: false,
      accountType,
      activeOrganization: null,
      activeBrand: null,
    };
  }

  const activeContext =
    contexts.find((context) => context.contextKey === requestedContextKey) ??
    contexts[0];

  const activeBrand = activeContext.targetBrandOrganizationId
    ? await db.brand.findUnique({
        where: { id: activeContext.targetBrandOrganizationId },
        select: {
          id: true,
          name: true,
          ownerOrganizationId: true,
        },
      })
    : null;

  const activeOrganization = activeContext.viaOrganizationId
    ? await db.organization.findUnique({
        where: { id: activeContext.viaOrganizationId },
        select: {
          id: true,
          name: true,
          organizationType: true,
        },
      })
    : activeBrand?.ownerOrganizationId
      ? await db.organization.findUnique({
          where: { id: activeBrand.ownerOrganizationId },
          select: {
            id: true,
            name: true,
            organizationType: true,
          },
        })
      : await db.organization.findUnique({
          where: { id: activeContext.organizationId },
          select: {
            id: true,
            name: true,
            organizationType: true,
          },
        });

  return {
    contexts,
    activeContext,
    hasAccessibleContexts,
    hasDirectOrganizations,
    needsStarterSetup: false,
    canSkipStarterSetup: true,
    accountType,
    activeOrganization,
    activeBrand,
  };
}

export function resolveOrganizationOperationScope(
  context: AccessibleOrganizationContext | null | undefined,
): OrganizationOperationScope | null {
  if (!context) {
    return null;
  }

  if (context.targetBrandOrganizationId) {
    return {
      organizationId: context.targetBrandOrganizationId,
      actingAgencyOrganizationId: context.operatingAgencyOrganizationId,
      requiresActingAgencyMatch: Boolean(context.operatingAgencyOrganizationId),
    };
  }

  return {
    organizationId: context.organizationId,
    actingAgencyOrganizationId: null,
    requiresActingAgencyMatch: false,
  };
}

function buildReadScopeConditionForContext(
  context: AccessibleOrganizationContext,
): OrganizationReadScopeCondition {
  if (context.targetBrandOrganizationId) {
    if (context.operatingAgencyOrganizationId) {
      return {
        organizationId: context.targetBrandOrganizationId,
        actingAgencyOrganizationId: context.operatingAgencyOrganizationId,
      };
    }

    return {
      organizationId: context.targetBrandOrganizationId,
    };
  }

  return {
    organizationId: context.organizationId,
  };
}

function dedupeReadScopeConditions(
  conditions: OrganizationReadScopeCondition[],
): OrganizationReadScopeCondition[] {
  const seen = new Set<string>();
  const deduped: OrganizationReadScopeCondition[] = [];

  for (const condition of conditions) {
    const key = [
      condition.organizationId ?? "*",
      condition.actingAgencyOrganizationId === undefined
        ? "*"
        : (condition.actingAgencyOrganizationId ?? "null"),
    ].join("|");

    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    deduped.push(condition);
  }

  return deduped;
}

export async function resolveOrganizationReadScopeForUser(
  userId: string,
  activeContextKey?: string | null,
  viewScope: OrganizationReadViewScope = "CONTEXT",
): Promise<ResolvedOrganizationReadScope> {
  const { contexts, activeContext, accountType } =
    await resolveActiveOrganizationContextForUser(userId, activeContextKey);

  if (!activeContext) {
    return {
      mode: "ALL_ACCESS",
      accountType,
      activeContext: null,
      contexts,
      conditions: [],
    };
  }

  if (accountType === UserAccountType.AGENCY) {
    const isOwnAgencyContext =
      activeContext.organizationType === OrganizationType.AGENCY &&
      !activeContext.targetBrandOrganizationId;

    if (isOwnAgencyContext) {
      return {
        mode: "AGENCY_AGGREGATE",
        accountType,
        activeContext,
        contexts,
        conditions: dedupeReadScopeConditions([
          {
            actingAgencyOrganizationId: activeContext.organizationId,
          },
          ...contexts
            .filter(
              (context) =>
                context.targetBrandOrganizationId &&
                context.operatingAgencyOrganizationId ===
                  activeContext.organizationId,
            )
            .map((context) => buildReadScopeConditionForContext(context)),
        ]),
      };
    }

    return {
      mode: "CONTEXT_BRAND",
      accountType,
      activeContext,
      contexts,
      conditions: [buildReadScopeConditionForContext(activeContext)],
    };
  }

  if (viewScope === "ALL") {
    return {
      mode: "ALL_ACCESS",
      accountType,
      activeContext,
      contexts,
      conditions: dedupeReadScopeConditions(
        contexts.map((context) => buildReadScopeConditionForContext(context)),
      ),
    };
  }

  return {
    mode: "CONTEXT_BRAND",
    accountType,
    activeContext,
    contexts,
    conditions: [buildReadScopeConditionForContext(activeContext)],
  };
}

export async function listAccessibleOrganizationIdsForUser(
  userId: string,
  requiredPermission?: OrganizationPermissionKey,
) {
  const contexts = await listAccessibleOrganizationContextsForUser(userId);
  const filteredContexts = requiredPermission
    ? contexts.filter((context) => context.permissions[requiredPermission])
    : contexts;

  return Array.from(
    new Set(filteredContexts.map((context) => context.organizationId)),
  );
}

export async function getDirectOrganizationMembership(
  userId: string,
  organizationId: string,
) {
  return db.organizationMember.findFirst({
    where: {
      organizationId,
      isActive: true,
      userProfile: {
        userId,
        isActive: true,
      },
    },
    include: {
      organization: {
        select: {
          id: true,
          name: true,
          organizationType: true,
          isActive: true,
        },
      },
    },
  });
}
