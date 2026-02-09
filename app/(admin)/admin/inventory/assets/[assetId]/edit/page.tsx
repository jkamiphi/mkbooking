import { EditAssetForm } from "./edit-asset-form";
import { AdminPageHeader, AdminPageShell } from "@/components/admin/page-shell";

export const metadata = {
  title: "Editar Activo - Admin",
  description: "Actualizar activo de inventario",
};

interface EditAssetPageProps {
  params: Promise<{
    assetId: string;
  }>;
}

export default async function EditAssetPage({ params }: EditAssetPageProps) {
  const { assetId } = await params;

  return (
    <AdminPageShell>
      <AdminPageHeader
        title="Editar activo"
        description="Actualiza datos operativos, ubicación y estado del activo."
      />
      <EditAssetForm assetId={assetId} />
    </AdminPageShell>
  );
}
