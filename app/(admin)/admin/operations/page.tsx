import Link from "next/link";
import { Metadata } from "next";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { AdminPageHeader, AdminPageShell } from "@/components/admin/page-shell";
import { createServerTRPCCaller } from "@/lib/trpc/server";
import { OperationsWorkOrdersTable } from "./_components/operations-work-orders-table";

export const metadata: Metadata = {
  title: "Operativa | Administración | MK Booking",
  description: "Control de ejecución, revisión y seguimiento histórico de OTs operativas.",
};

export default async function AdminOperationsPage() {
  const caller = await createServerTRPCCaller();
  const profile = await caller.userProfile.current();

  if (!profile || !["SUPERADMIN", "STAFF", "SALES"].includes(profile.systemRole)) {
    redirect("/admin/orders");
  }

  return (
    <AdminPageShell>
      <AdminPageHeader
        title="Bandeja Operativa"
        description="Gestiona trabajo activo, revisión post-instalación y seguimiento histórico por cara."
        actions={
          <Button variant="outline" asChild>
            <Link href="/admin/operations/installers">Control de instaladores</Link>
          </Button>
        }
      />
      <OperationsWorkOrdersTable />
    </AdminPageShell>
  );
}
