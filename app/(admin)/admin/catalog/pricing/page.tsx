import { AdminLinkCards } from "@/components/admin/link-cards";
import { AdminPageHeader, AdminPageShell } from "@/components/admin/page-shell";

export const metadata = {
  title: "Precios del Catálogo - Admin",
  description: "Gestionar precios del catálogo",
};

const items = [
  { href: "/admin/catalog/pricing/rules", label: "Reglas de Precio" },
  { href: "/admin/catalog/pricing/promos", label: "Promociones" },
];

export default function PricingPage() {
  return (
    <AdminPageShell>
      <AdminPageHeader
        title="Precios"
        description="Configurar reglas y promociones para el catálogo."
      />
      <AdminLinkCards
        items={items.map((item) => ({
          href: item.href,
          title: item.label,
          description: "Gestionar vigencias, segmentación y valores.",
        }))}
        columns="2"
      />
    </AdminPageShell>
  );
}
