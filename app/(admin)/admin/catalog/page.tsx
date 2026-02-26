import { AdminLinkCards } from "@/components/admin/link-cards";
import { AdminPageHeader, AdminPageShell } from "@/components/admin/page-shell";

export const metadata = {
  title: "Catálogo - Admin",
  description: "Gestionar catálogo y precios",
};

const cards = [
  {
    href: "/admin/catalog/faces",
    title: "Caras",
    description: "Publicar caras y gestionar detalles del catálogo.",
  },
  {
    href: "/admin/catalog/pricing",
    title: "Precios",
    description: "Precios globales, promociones y precios especiales.",
  },
  {
    href: "/admin/catalog/services",
    title: "Servicios",
    description: "Configurar servicios adicionales facturables por campaña.",
  },
  {
    href: "/admin/catalog/holds",
    title: "Reservas",
    description: "Gestionar reservas activas y bloqueos de disponibilidad.",
  },
];

export default function CatalogPage() {
  return (
    <AdminPageShell>
      <AdminPageHeader
        title="Catálogo"
        description="Publicar caras, definir precios y controlar reservas."
      />
      <AdminLinkCards items={cards} />
    </AdminPageShell>
  );
}
