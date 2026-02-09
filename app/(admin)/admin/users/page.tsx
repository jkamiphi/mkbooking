import { UsersContent } from "./users-content";
import { AdminPageHeader, AdminPageShell } from "@/components/admin/page-shell";

export const metadata = {
  title: "Gestión de Usuarios - Admin",
  description: "Gestionar usuarios de la plataforma",
};

export default function UsersPage() {
  return (
    <AdminPageShell>
      <AdminPageHeader
        title="Gestión de usuarios"
        description="Administrar acceso, estado y roles de todas las cuentas."
      />
      <UsersContent />
    </AdminPageShell>
  );
}
