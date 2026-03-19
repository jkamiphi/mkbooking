import type { SystemRole } from "@prisma/client";
import { resolveActiveOrganizationContextForUser } from "@/lib/services/organization-access";
import {
  resolveAuthenticatedEntryPathFromState,
  resolvePostLoginPathByRole,
} from "./role-home-state";

export { resolveAuthenticatedEntryPathFromState, resolvePostLoginPathByRole };

export async function resolveAuthenticatedEntryPath(input: {
  userId: string;
  systemRole: SystemRole | null | undefined;
  isActive?: boolean | null;
}) {
  if (input.isActive === false) {
    return "/inactive";
  }

  if (
    input.systemRole &&
    input.systemRole !== "CUSTOMER"
  ) {
    return resolvePostLoginPathByRole(input.systemRole);
  }

  const starterState = await resolveActiveOrganizationContextForUser(input.userId);

  return resolveAuthenticatedEntryPathFromState({
    systemRole: input.systemRole,
    isActive: input.isActive,
    needsStarterSetup: starterState.needsStarterSetup,
  });
}
