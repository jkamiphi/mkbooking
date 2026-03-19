import assert from "node:assert/strict";
import test from "node:test";
import {
  filterClientBrandsForActiveContext,
  type OrganizationContextScopeLike,
} from "../../lib/organization-context-scope";

interface TestContext extends OrganizationContextScopeLike {
  contextKey: string;
  organizationName: string;
}

function createContext(input: TestContext): TestContext {
  return input;
}

const agencyA = createContext({
  contextKey: "direct:agency-a:",
  organizationId: "agency-a",
  organizationName: "Agency A",
  organizationType: "AGENCY",
  targetBrandOrganizationId: null,
  operatingAgencyOrganizationId: null,
});

const delegatedBrandA1 = createContext({
  contextKey: "delegated:brand-a1:agency-a",
  organizationId: "brand-a1",
  organizationName: "Brand A1",
  organizationType: "DIRECT_CLIENT",
  targetBrandOrganizationId: "brand-a1",
  operatingAgencyOrganizationId: "agency-a",
});

const delegatedBrandA2 = createContext({
  contextKey: "delegated:brand-a2:agency-a",
  organizationId: "brand-a2",
  organizationName: "Brand A2",
  organizationType: "DIRECT_CLIENT",
  targetBrandOrganizationId: "brand-a2",
  operatingAgencyOrganizationId: "agency-a",
});

const delegatedBrandB1 = createContext({
  contextKey: "delegated:brand-b1:agency-b",
  organizationId: "brand-b1",
  organizationName: "Brand B1",
  organizationType: "DIRECT_CLIENT",
  targetBrandOrganizationId: "brand-b1",
  operatingAgencyOrganizationId: "agency-b",
});

const directBrandWithoutAgency = createContext({
  contextKey: "direct:brand-own:",
  organizationId: "brand-own",
  organizationName: "Brand Own",
  organizationType: "DIRECT_CLIENT",
  targetBrandOrganizationId: "brand-own",
  operatingAgencyOrganizationId: null,
});

const unrelatedAccess = createContext({
  contextKey: "direct:media-owner:",
  organizationId: "media-owner-1",
  organizationName: "Media Owner",
  organizationType: "MEDIA_OWNER",
  targetBrandOrganizationId: null,
  operatingAgencyOrganizationId: null,
});

const allContexts = [
  agencyA,
  delegatedBrandA1,
  delegatedBrandA2,
  delegatedBrandB1,
  directBrandWithoutAgency,
  unrelatedAccess,
];

test("active agency context filters to brands of that agency", () => {
  const results = filterClientBrandsForActiveContext(allContexts, agencyA);
  assert.deepEqual(
    results.map((context) => context.contextKey),
    [delegatedBrandA1.contextKey, delegatedBrandA2.contextKey],
  );
});

test("active delegated brand context filters to brands of operating agency", () => {
  const results = filterClientBrandsForActiveContext(allContexts, delegatedBrandA1);
  assert.deepEqual(
    results.map((context) => context.contextKey),
    [delegatedBrandA1.contextKey, delegatedBrandA2.contextKey],
  );
});

test("active direct brand without agency filters to that single brand", () => {
  const results = filterClientBrandsForActiveContext(
    allContexts,
    directBrandWithoutAgency,
  );
  assert.deepEqual(
    results.map((context) => context.contextKey),
    [directBrandWithoutAgency.contextKey],
  );
});

test("unrelated active context without agency/brand scope returns empty list", () => {
  const results = filterClientBrandsForActiveContext(allContexts, unrelatedAccess);
  assert.deepEqual(results, []);
});
