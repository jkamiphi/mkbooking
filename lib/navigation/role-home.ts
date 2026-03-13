import type { SystemRole } from "@prisma/client";
import { resolveActiveOrganizationContextForUser } from "@/lib/services/organization-access";

export function resolvePostLoginPathByRole(
  systemRole: SystemRole | null | undefined
): string {
  if (systemRole === "INSTALLER") {
    return "/installers/tasks";
  }

  if (systemRole === "SALES") {
    return "/admin/orders";
  }

  if (systemRole === "DESIGNER") {
    return "/admin/design";
  }

  if (systemRole === "OPERATIONS_PRINT") {
    return "/admin/print";
  }

  if (systemRole === "SUPERADMIN" || systemRole === "STAFF") {
    return "/admin";
  }

  return "/profile";
}

export async function resolveAuthenticatedEntryPath(input: {
  userId: string;
  systemRole: SystemRole | null | undefined;
}) {
  const roleHome = resolvePostLoginPathByRole(input.systemRole);

  if (
    input.systemRole &&
    input.systemRole !== "CUSTOMER"
  ) {
    return roleHome;
  }

  const starterState = await resolveActiveOrganizationContextForUser(input.userId);

  if (starterState.needsStarterSetup) {
    return "/onboarding";
  }

  return roleHome;
}
