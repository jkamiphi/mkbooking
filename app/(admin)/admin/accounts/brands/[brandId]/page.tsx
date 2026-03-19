import { notFound } from "next/navigation";
import { AdminPageHeader, AdminPageShell } from "@/components/admin/page-shell";
import { db } from "@/lib/db";
import { BrandRelationshipsContent } from "./brand-relationships-content";

interface BrandRelationshipsPageProps {
  params: Promise<{ brandId: string }>;
  searchParams: Promise<{ returnTo?: string }>;
}

export default async function BrandRelationshipsPage({
  params,
  searchParams,
}: BrandRelationshipsPageProps) {
  const { brandId } = await params;
  const { returnTo } = await searchParams;

  const brand = await db.brand.findUnique({
    where: { id: brandId },
    select: {
      id: true,
      name: true,
      legalName: true,
      tradeName: true,
      taxId: true,
      isActive: true,
      isVerified: true,
      createdAt: true,
      accesses: {
        orderBy: [{ organization: { name: "asc" } }],
        select: {
          id: true,
          status: true,
          canCreateRequests: true,
          canCreateOrders: true,
          canViewBilling: true,
          canManageContacts: true,
          organization: {
            select: {
              id: true,
              name: true,
              isActive: true,
              organizationType: true,
            },
          },
        },
      },
    },
  });

  if (!brand) {
    notFound();
  }

  const fallbackReturnTo = "/admin/accounts/brands";
  const safeReturnTo =
    typeof returnTo === "string" && returnTo.startsWith("/admin/accounts/brands")
      ? returnTo
      : fallbackReturnTo;

  return (
    <AdminPageShell>
      <AdminPageHeader
        title="Relaciones de marca"
        description="Gestiona vínculos agencia-marca y permisos operativos para esta marca."
      />
      <BrandRelationshipsContent
        returnTo={safeReturnTo}
        brand={{
          id: brand.id,
          name: brand.name,
          legalName: brand.legalName,
          tradeName: brand.tradeName,
          taxId: brand.taxId,
          isActive: brand.isActive,
          isVerified: brand.isVerified,
          createdAt: brand.createdAt.toISOString(),
          relationships: brand.accesses.map((access) => ({
            id: access.id,
            status: access.status,
            canCreateRequests: access.canCreateRequests,
            canCreateOrders: access.canCreateOrders,
            canViewBilling: access.canViewBilling,
            canManageContacts: access.canManageContacts,
            sourceOrganization: access.organization,
          })),
        }}
      />
    </AdminPageShell>
  );
}
