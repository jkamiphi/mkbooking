import { Suspense } from "react";
import { AdminPageHeader, AdminPageShell } from "@/components/admin/page-shell";
import { AccountsContent } from "./accounts-content";

export const metadata = {
  title: "Cuentas - Admin",
  description: "Gestión unificada de usuarios, organizaciones y relaciones agencia-marca.",
};

export default function AccountsPage() {
  return (
    <AdminPageShell>
      <AdminPageHeader
        title="Cuentas"
        description="Gestiona en una sola vista el acceso de usuarios, sus organizaciones y los vínculos agencia-marca."
      />
      <Suspense fallback={null}>
        <AccountsContent />
      </Suspense>
    </AdminPageShell>
  );
}
