import { CatalogFacesContent } from "./faces-content";
import { AdminPageHeader, AdminPageShell } from "@/components/admin/page-shell";

export const metadata = {
  title: "Caras del Catálogo - Admin",
  description: "Gestionar caras del catálogo",
};

export default function CatalogFacesPage() {
  return (
    <AdminPageShell>
      <AdminPageHeader
        title="Caras del catálogo"
        description="Publicación y contenido comercial de cada cara vendible."
      />
      <CatalogFacesContent />
    </AdminPageShell>
  );
}
