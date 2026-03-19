import { AdminPageHeader, AdminPageShell } from "@/components/admin/page-shell";
import { OrganizationsContent } from "./organizations-content";

export const metadata = {
  title: "Organizaciones - Admin",
  description: "Gestión de clientes directos, agencias y sus relaciones con marcas",
};

export default function OrganizationsPage() {
  return (
    <AdminPageShell>
      <AdminPageHeader
        title="Organizaciones"
        description="Administra clientes directos y agencias; al filtrar por agencia puedes gestionar relaciones agencia-marca."
      />
      <OrganizationsContent />
    </AdminPageShell>
  );
}
