import { redirect } from "next/navigation";
import { DashboardContent } from "./dashboard-content";
import { AdminPageHeader, AdminPageShell } from "@/components/admin/page-shell";
import { createServerTRPCCaller } from "@/lib/trpc/server";

export const metadata = {
  title: "Panel de Administración - MKM Booking",
  description: "Panel de administración de la plataforma",
};

export default async function AdminDashboardPage() {
  const caller = await createServerTRPCCaller();
  const profile = await caller.userProfile.current();

  if (profile?.systemRole === "SALES") {
    redirect("/admin/orders");
  }

  if (profile?.systemRole === "DESIGNER") {
    redirect("/admin/design");
  }

  if (profile?.systemRole === "OPERATIONS_PRINT") {
    redirect("/admin/print");
  }

  return (
    <AdminPageShell>
      <AdminPageHeader
        title="Panel"
        description="Resumen operativo y métricas clave de la plataforma."
      />
      <DashboardContent />
    </AdminPageShell>
  );
}
