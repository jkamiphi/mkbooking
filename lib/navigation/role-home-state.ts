import type { SystemRole } from "@prisma/client";

export function resolvePostLoginPathByRole(
  systemRole: SystemRole | null | undefined,
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

export function resolveAuthenticatedEntryPathFromState(input: {
  systemRole: SystemRole | null | undefined;
  isActive: boolean | null | undefined;
  needsStarterSetup: boolean;
}) {
  const roleHome = resolvePostLoginPathByRole(input.systemRole);

  if (input.isActive === false) {
    return "/inactive";
  }

  if (
    input.systemRole &&
    input.systemRole !== "CUSTOMER"
  ) {
    return roleHome;
  }

  if (input.needsStarterSetup) {
    return "/onboarding";
  }

  return roleHome;
}
