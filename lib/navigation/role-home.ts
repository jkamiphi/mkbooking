import type { SystemRole } from "@prisma/client";

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
