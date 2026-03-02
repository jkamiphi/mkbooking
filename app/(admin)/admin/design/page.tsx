import { Metadata } from "next";
import { redirect } from "next/navigation";
import { AdminPageHeader, AdminPageShell } from "@/components/admin/page-shell";
import { DesignInboxTable } from "./_components/design-inbox-table";
import { createServerTRPCCaller } from "@/lib/trpc/server";

export const metadata: Metadata = {
  title: "Diseño | Administración | MK Booking",
  description: "Bandeja de trabajo para revisión de artes y pruebas de color.",
};

export default async function AdminDesignPage() {
  const caller = await createServerTRPCCaller();
  const profile = await caller.userProfile.current();

  if (!profile || !["SUPERADMIN", "STAFF", "DESIGNER"].includes(profile.systemRole)) {
    redirect("/admin/orders");
  }

  return (
    <AdminPageShell>
      <AdminPageHeader
        title="Bandeja de Diseño"
        description="Gestiona tareas de diseño abiertas por confirmación de orden, con SLA y responsable."
      />
      <DesignInboxTable />
    </AdminPageShell>
  );
}
