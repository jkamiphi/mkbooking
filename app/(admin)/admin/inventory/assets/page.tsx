import { AssetsTabsContent } from "./assets-tabs-content";
import { AdminPageHeader, AdminPageShell } from "@/components/admin/page-shell";

export const metadata = {
  title: "Activos de Inventario - Admin",
  description: "Gestionar activos del inventario",
};

export default function AssetsPage() {
  return (
    <AdminPageShell>
      <AdminPageHeader
        title="Activos"
        description="Estructuras físicas, ubicación y estado operativo."
      />
      <AssetsTabsContent />
    </AdminPageShell>
  );
}
