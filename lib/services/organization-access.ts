import { db } from "@/lib/db";
import {
  OrganizationRelationshipStatus,
  OrganizationRole,
  OrganizationType,
} from "@prisma/client";

export const ORGANIZATION_CONTEXT_COOKIE_NAME = "mk_active_org_ctx";

export type OrganizationAccessType = "DIRECT" | "DELEGATED";
export type OrganizationContextDisplayCategory =
  | "OWN_BRAND"
  | "OWN_AGENCY"
  | "DELEGATED_BRAND"
  | "DIRECT_ACCESS";

export interface OrganizationContextPermissions {
  canCreateRequests: boolean;
  canCreateOrders: boolean;
  canViewBilling: boolean;
  canManageContacts: boolean;
}

export interface AccessibleOrganizationContext {
  contextKey: string;
  organizationId: string;
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
  isOwnedWorkspace: boolean;
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
  role: OrganizationRole;
  viaOrganizationName: string | null;
}) {
  const isOwnedWorkspace =
    input.accessType === "DIRECT" && input.role === OrganizationRole.OWNER;

  if (
    input.accessType === "DIRECT" &&
    input.organizationType === OrganizationType.ADVERTISER &&
    isOwnedWorkspace
  ) {
    return {
      displayCategory: "OWN_BRAND" as const,
      displayMeta: "Propio",
      isOwnedWorkspace,
    };
  }

  if (
    input.accessType === "DIRECT" &&
    input.organizationType === OrganizationType.AGENCY &&
    isOwnedWorkspace
  ) {
    return {
      displayCategory: "OWN_AGENCY" as const,
      displayMeta: "Agencia propia",
      isOwnedWorkspace,
    };
  }

  if (input.accessType === "DELEGATED") {
    return {
      displayCategory: "DELEGATED_BRAND" as const,
      displayMeta: input.viaOrganizationName
        ? `Via ${input.viaOrganizationName}`
        : "Acceso delegado",
      isOwnedWorkspace: false,
    };
  }

  return {
    displayCategory: "DIRECT_ACCESS" as const,
    displayMeta: "Acceso directo compartido",
    isOwnedWorkspace,
  };
}

function sortOrganizationContexts(
  contexts: AccessibleOrganizationContext[],
) {
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
            },
          },
        },
      },
    },
  });

  if (!profile) {
    return [];
  }

  const directContexts = profile.organizationRoles.map((membership) => ({
    ...resolveContextDisplayMetadata({
      accessType: "DIRECT",
      organizationType: membership.organization.organizationType,
      role: membership.role,
      viaOrganizationName: null,
    }),
    contextKey: createOrganizationContextKey({
      accessType: "DIRECT",
      organizationId: membership.organizationId,
      viaOrganizationId: null,
    }),
    organizationId: membership.organization.id,
    organizationName: membership.organization.name,
    organizationType: membership.organization.organizationType,
    logoUrl: membership.organization.logoUrl,
    accessType: "DIRECT" as const,
    viaOrganizationId: null,
    viaOrganizationName: null,
    viaOrganizationType: null,
    role: membership.role,
    permissions: directPermissionMatrix[membership.role],
    displayLabel: membership.organization.name,
  }));

  const agencyMemberships = profile.organizationRoles.filter(
    (membership) =>
      membership.organization.organizationType === OrganizationType.AGENCY,
  );

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

  const delegatedRelationships = await db.organizationRelationship.findMany({
    where: {
      sourceOrganizationId: {
        in: agencyMemberships.map((membership) => membership.organizationId),
      },
      relationshipType: "AGENCY_CLIENT",
      status: OrganizationRelationshipStatus.ACTIVE,
      sourceOrganization: {
        isActive: true,
        organizationType: OrganizationType.AGENCY,
      },
      targetOrganization: {
        isActive: true,
      },
    },
    select: {
      sourceOrganizationId: true,
      targetOrganizationId: true,
      canCreateRequests: true,
      canCreateOrders: true,
      canViewBilling: true,
      canManageContacts: true,
      targetOrganization: {
        select: {
          id: true,
          name: true,
          organizationType: true,
          logoUrl: true,
        },
      },
    },
  });

  const delegatedContexts: AccessibleOrganizationContext[] = [];
  for (const relationship of delegatedRelationships) {
    const agencyMembership = agencyRoleById.get(relationship.sourceOrganizationId);
    if (!agencyMembership) {
      continue;
    }

    delegatedContexts.push({
      ...resolveContextDisplayMetadata({
        accessType: "DELEGATED",
        organizationType: relationship.targetOrganization.organizationType,
        role: agencyMembership.role,
        viaOrganizationName: agencyMembership.sourceOrganizationName,
      }),
      contextKey: createOrganizationContextKey({
        accessType: "DELEGATED",
        organizationId: relationship.targetOrganizationId,
        viaOrganizationId: relationship.sourceOrganizationId,
      }),
      organizationId: relationship.targetOrganization.id,
      organizationName: relationship.targetOrganization.name,
      organizationType: relationship.targetOrganization.organizationType,
      logoUrl: relationship.targetOrganization.logoUrl,
      accessType: "DELEGATED",
      viaOrganizationId: relationship.sourceOrganizationId,
      viaOrganizationName: agencyMembership.sourceOrganizationName,
      viaOrganizationType: agencyMembership.sourceOrganizationType,
      role: agencyMembership.role,
      permissions: buildDelegatedPermissions(
        agencyMembership.role,
        relationship,
      ),
      displayLabel: relationship.targetOrganization.name,
    });
  }

  return sortOrganizationContexts([...directContexts, ...delegatedContexts]);
}

export async function resolveActiveOrganizationContextForUser(
  userId: string,
  requestedContextKey?: string | null,
) {
  const contexts = await listAccessibleOrganizationContextsForUser(userId);
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
    };
  }

  const activeContext =
    contexts.find((context) => context.contextKey === requestedContextKey) ??
    contexts[0];

  return {
    contexts,
    activeContext,
    hasAccessibleContexts,
    hasDirectOrganizations,
    needsStarterSetup: false,
    canSkipStarterSetup: true,
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
