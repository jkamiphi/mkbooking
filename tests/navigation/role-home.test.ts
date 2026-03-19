import assert from "node:assert/strict";
import test from "node:test";
import {
  resolveAuthenticatedEntryPathFromState,
  resolvePostLoginPathByRole,
} from "../../lib/navigation/role-home-state";

test("resolvePostLoginPathByRole maps system roles to expected homes", () => {
  assert.equal(resolvePostLoginPathByRole("SUPERADMIN"), "/admin");
  assert.equal(resolvePostLoginPathByRole("SALES"), "/admin/orders");
  assert.equal(resolvePostLoginPathByRole("DESIGNER"), "/admin/design");
  assert.equal(resolvePostLoginPathByRole("OPERATIONS_PRINT"), "/admin/print");
  assert.equal(resolvePostLoginPathByRole("INSTALLER"), "/installers/tasks");
  assert.equal(resolvePostLoginPathByRole("CUSTOMER"), "/profile");
});

test("inactive account always resolves to /inactive", () => {
  assert.equal(
    resolveAuthenticatedEntryPathFromState({
      systemRole: "SUPERADMIN",
      isActive: false,
      needsStarterSetup: false,
    }),
    "/inactive",
  );

  assert.equal(
    resolveAuthenticatedEntryPathFromState({
      systemRole: "CUSTOMER",
      isActive: false,
      needsStarterSetup: true,
    }),
    "/inactive",
  );
});

test("active customer is routed to onboarding when starter setup is required", () => {
  assert.equal(
    resolveAuthenticatedEntryPathFromState({
      systemRole: "CUSTOMER",
      isActive: true,
      needsStarterSetup: true,
    }),
    "/onboarding",
  );
});

test("active non-customer role uses role home path", () => {
  assert.equal(
    resolveAuthenticatedEntryPathFromState({
      systemRole: "STAFF",
      isActive: true,
      needsStarterSetup: true,
    }),
    "/admin",
  );
});
