import { Suspense } from "react";
import { AdminPageHeader, AdminPageShell } from "@/components/admin/page-shell";
import { BrandsContent } from "./brands-content";

export const metadata = {
  title: "Marcas - Admin",
  description: "Gestión de marcas cliente y sus vínculos con agencias.",
};

export default function BrandsPage() {
  return (
    <AdminPageShell>
      <AdminPageHeader
        title="Marcas"
        description="Gestiona marcas cliente, sus datos comerciales y vínculos con agencias."
      />
      <Suspense fallback={null}>
        <BrandsContent />
      </Suspense>
    </AdminPageShell>
  );
}
