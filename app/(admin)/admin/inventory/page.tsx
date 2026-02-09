import { AdminLinkCards } from "@/components/admin/link-cards";
import { AdminPageHeader, AdminPageShell } from "@/components/admin/page-shell";
import { InventoryOverview } from "./_components/inventory-overview";

export const metadata = {
  title: "Inventario - Admin",
  description: "Gestionar activos y caras del inventario",
};

export default function InventoryPage() {
  return (
    <AdminPageShell>
      <AdminPageHeader
        title="Inventario"
        description="Gestionar activos físicos, caras y taxonomía maestra."
      />
      <AdminLinkCards
        items={[
          {
            href: "/admin/inventory/assets",
            title: "Activos",
            description: "Estructuras, ubicaciones y estado operativo.",
          },
          {
            href: "/admin/inventory/faces",
            title: "Caras",
            description: "Superficies vendibles y su configuración.",
          },
          {
            href: "/admin/inventory/taxonomy",
            title: "Taxonomía",
            description: "Catálogos maestros para clasificación.",
          },
        ]}
      />
      <InventoryOverview />
    </AdminPageShell>
  );
}
