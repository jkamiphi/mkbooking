import { Metadata } from "next";
import { redirect } from "next/navigation";
import { AdminPageHeader, AdminPageShell } from "@/components/admin/page-shell";
import { createServerTRPCCaller } from "@/lib/trpc/server";
import { PrintInboxTable } from "./_components/print-inbox-table";

export const metadata: Metadata = {
  title: "Impresión | Administración | MK Booking",
  description: "Bandeja de trabajo para la etapa final de impresión.",
};

export default async function AdminPrintPage() {
  const caller = await createServerTRPCCaller();
  const profile = await caller.userProfile.current();

  if (!profile || !["SUPERADMIN", "STAFF", "OPERATIONS_PRINT"].includes(profile.systemRole)) {
    redirect("/admin/orders");
  }

  return (
    <AdminPageShell>
      <AdminPageHeader
        title="Bandeja de Impresión"
        description="Gestiona impresión final, responsables y cierre con evidencias opcionales."
      />
      <PrintInboxTable />
    </AdminPageShell>
  );
}
