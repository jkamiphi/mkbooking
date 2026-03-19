export interface OrganizationContextScopeLike {
  organizationId: string;
  organizationType: "DIRECT_CLIENT" | "AGENCY" | "MEDIA_OWNER" | "PLATFORM_ADMIN";
  targetBrandOrganizationId: string | null;
  operatingAgencyOrganizationId: string | null;
}

interface AgencyScope {
  type: "AGENCY";
  agencyOrganizationId: string;
}

interface BrandScope {
  type: "BRAND";
  brandOrganizationId: string;
}

interface EmptyScope {
  type: "NONE";
}

export type ActiveContextScope = AgencyScope | BrandScope | EmptyScope;

export function resolveActiveContextScope(
  activeContext: OrganizationContextScopeLike | null | undefined,
): ActiveContextScope {
  if (!activeContext) {
    return { type: "NONE" };
  }

  if (activeContext.operatingAgencyOrganizationId) {
    return {
      type: "AGENCY",
      agencyOrganizationId: activeContext.operatingAgencyOrganizationId,
    };
  }

  if (
    activeContext.organizationType === "AGENCY" &&
    !activeContext.targetBrandOrganizationId
  ) {
    return {
      type: "AGENCY",
      agencyOrganizationId: activeContext.organizationId,
    };
  }

  if (activeContext.targetBrandOrganizationId) {
    return {
      type: "BRAND",
      brandOrganizationId: activeContext.targetBrandOrganizationId,
    };
  }

  return { type: "NONE" };
}

export function hasActiveAgencyScope(
  activeContext: OrganizationContextScopeLike | null | undefined,
) {
  return resolveActiveContextScope(activeContext).type === "AGENCY";
}

export function filterClientBrandsForActiveContext<T extends OrganizationContextScopeLike>(
  contexts: T[],
  activeContext: OrganizationContextScopeLike | null | undefined,
) {
  const clientBrands = contexts.filter((context) =>
    Boolean(context.targetBrandOrganizationId),
  );
  const scope = resolveActiveContextScope(activeContext);

  if (scope.type === "AGENCY") {
    return clientBrands.filter(
      (context) =>
        context.operatingAgencyOrganizationId === scope.agencyOrganizationId,
    );
  }

  if (scope.type === "BRAND") {
    return clientBrands.filter(
      (context) => context.targetBrandOrganizationId === scope.brandOrganizationId,
    );
  }

  return [];
}
