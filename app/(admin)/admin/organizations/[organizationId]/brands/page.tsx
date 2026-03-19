import { OrganizationType } from "@prisma/client";
import { notFound } from "next/navigation";
import { AdminPageHeader, AdminPageShell } from "@/components/admin/page-shell";
import { db } from "@/lib/db";
import { AgencyBrandsContent } from "./agency-brands-content";

interface AgencyBrandsPageProps {
  params: Promise<{ organizationId: string }>;
  searchParams: Promise<{ returnTo?: string }>;
}

export default async function AgencyBrandsPage({
  params,
  searchParams,
}: AgencyBrandsPageProps) {
  const { organizationId } = await params;
  const { returnTo } = await searchParams;

  const organization = await db.organization.findUnique({
    where: { id: organizationId },
    select: {
      id: true,
      name: true,
      legalName: true,
      tradeName: true,
      taxId: true,
      isActive: true,
      isVerified: true,
      createdAt: true,
      organizationType: true,
      brandAccesses: {
        orderBy: [{ brand: { name: "asc" } }],
        select: {
          id: true,
          status: true,
          canCreateRequests: true,
          canCreateOrders: true,
          canViewBilling: true,
          canManageContacts: true,
          brand: {
            select: {
              id: true,
              name: true,
              legalName: true,
              tradeName: true,
              taxId: true,
              isActive: true,
              isVerified: true,
            },
          },
        },
      },
    },
  });

  if (!organization || organization.organizationType !== OrganizationType.AGENCY) {
    notFound();
  }

  const fallbackReturnTo = "/admin/organizations";
  const safeReturnTo =
    typeof returnTo === "string" && returnTo.startsWith("/admin/organizations")
      ? returnTo
      : fallbackReturnTo;

  return (
    <AdminPageShell>
      <AdminPageHeader
        title="Marcas de agencia"
        description="Gestiona vínculos agencia-marca y permisos operativos para esta agencia."
      />
      <AgencyBrandsContent
        returnTo={safeReturnTo}
        agency={{
          id: organization.id,
          name: organization.name,
          legalName: organization.legalName,
          tradeName: organization.tradeName,
          taxId: organization.taxId,
          isActive: organization.isActive,
          isVerified: organization.isVerified,
          createdAt: organization.createdAt.toISOString(),
          relationships: organization.brandAccesses.map((access) => ({
            id: access.id,
            status: access.status,
            canCreateRequests: access.canCreateRequests,
            canCreateOrders: access.canCreateOrders,
            canViewBilling: access.canViewBilling,
            canManageContacts: access.canManageContacts,
            brand: access.brand,
          })),
        }}
      />
    </AdminPageShell>
  );
}
