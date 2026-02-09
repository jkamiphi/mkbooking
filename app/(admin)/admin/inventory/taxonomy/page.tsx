import { AdminLinkCards } from "@/components/admin/link-cards";
import { AdminPageHeader, AdminPageShell } from "@/components/admin/page-shell";

export const metadata = {
  title: "Taxonomía del Inventario - Admin",
  description: "Gestionar taxonomía del inventario",
};

const items = [
  { href: "/admin/inventory/taxonomy/provinces", label: "Provincias" },
  { href: "/admin/inventory/taxonomy/zones", label: "Zonas" },
  { href: "/admin/inventory/taxonomy/structure-types", label: "Tipos de Estructura" },
  { href: "/admin/inventory/taxonomy/road-types", label: "Tipos de Vía" },
  { href: "/admin/inventory/taxonomy/face-positions", label: "Posiciones de Cara" },
  { href: "/admin/inventory/taxonomy/mounting-types", label: "Tipos de Montaje" },
  { href: "/admin/inventory/taxonomy/restriction-tags", label: "Etiquetas de Restricción" },
];

export default function InventoryTaxonomyPage() {
  return (
    <AdminPageShell>
      <AdminPageHeader
        title="Taxonomía"
        description="Administrar catálogos y parámetros maestros del inventario."
      />
      <AdminLinkCards
        items={items.map((item) => ({
          href: item.href,
          title: item.label,
          description: "Gestionar registros y consistencia de datos.",
        }))}
      />
    </AdminPageShell>
  );
}
