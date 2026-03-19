import { Suspense } from "react";
import { AdminPageHeader, AdminPageShell } from "@/components/admin/page-shell";
import { AccountsContent } from "./accounts-content";

export const metadata = {
  title: "Cuentas - Admin",
  description: "Gestión de usuarios, roles y membresías organizacionales.",
};

export default function AccountsPage() {
  return (
    <AdminPageShell>
      <AdminPageHeader
        title="Cuentas"
        description="Gestiona cuentas de usuario, roles de sistema y membresías en organizaciones."
      />
      <Suspense fallback={null}>
        <AccountsContent />
      </Suspense>
    </AdminPageShell>
  );
}
