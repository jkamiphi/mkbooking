import Link from "next/link";
import { Metadata } from "next";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { AdminPageHeader, AdminPageShell } from "@/components/admin/page-shell";
import { createServerTRPCCaller } from "@/lib/trpc/server";
import { InstallersControlTable } from "../_components/installers-control-table";

export const metadata: Metadata = {
  title: "Control de Instaladores | Administración | MK Booking",
  description: "Configuración de capacidad y cobertura para instaladores.",
};

export default async function AdminInstallersControlPage() {
  const caller = await createServerTRPCCaller();
  const profile = await caller.userProfile.current();

  if (!profile || !["SUPERADMIN", "STAFF", "SALES"].includes(profile.systemRole)) {
    redirect("/admin/orders");
  }

  return (
    <AdminPageShell>
      <AdminPageHeader
        title="Control de Instaladores"
        description="Administra habilitación, capacidad máxima y cobertura por zona."
        actions={
          <Button variant="outline" asChild>
            <Link href="/admin/operations">Volver a bandeja operativa</Link>
          </Button>
        }
      />
      <InstallersControlTable />
    </AdminPageShell>
  );
}
