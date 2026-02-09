import { NewAssetForm } from "./new-asset-form";
import { AdminPageHeader, AdminPageShell } from "@/components/admin/page-shell";

export const metadata = {
  title: "Nuevo Activo - Admin",
  description: "Crear activo de inventario",
};

export default function NewAssetPage() {
  return (
    <AdminPageShell>
      <AdminPageHeader
        title="Nuevo activo"
        description="Registrar una nueva estructura en el inventario."
      />
      <NewAssetForm />
    </AdminPageShell>
  );
}
