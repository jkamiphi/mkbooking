import { FacesContent } from "./faces-content";
import { AdminPageHeader, AdminPageShell } from "@/components/admin/page-shell";

export const metadata = {
  title: "Caras de Inventario - Admin",
  description: "Gestionar caras del inventario",
};

export default function FacesPage() {
  return (
    <AdminPageShell>
      <AdminPageHeader
        title="Caras"
        description="Superficies vendibles y atributos de comercialización."
      />
      <FacesContent />
    </AdminPageShell>
  );
}
