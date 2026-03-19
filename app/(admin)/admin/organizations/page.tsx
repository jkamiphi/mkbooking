import { AdminPageHeader, AdminPageShell } from "@/components/admin/page-shell";
import { OrganizationsContent } from "./organizations-content";

export const metadata = {
  title: "Organizaciones - Admin",
  description: "Gestión de clientes directos y agencias",
};

export default function OrganizationsPage() {
  return (
    <AdminPageShell>
      <AdminPageHeader
        title="Organizaciones"
        description="Administra clientes directos y agencias con sus datos comerciales."
      />
      <OrganizationsContent />
    </AdminPageShell>
  );
}
