import { AdminPageHeader, AdminPageShell } from "@/components/admin/page-shell";
import { OrganizationsContent } from "./organizations-content";

export const metadata = {
  title: "Organizaciones - Admin",
  description: "Gestionar organizaciones de la plataforma",
};

export default function OrganizationsPage() {
  return (
    <AdminPageShell>
      <AdminPageHeader
        title="Organizaciones"
        description="Crear, buscar y administrar organizaciones comerciales."
      />
      <OrganizationsContent />
    </AdminPageShell>
  );
}
