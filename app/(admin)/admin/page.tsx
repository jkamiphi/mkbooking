import { DashboardContent } from "./dashboard-content";
import { AdminPageHeader, AdminPageShell } from "@/components/admin/page-shell";

export const metadata = {
  title: "Panel de Administración - MK Booking",
  description: "Panel de administración de la plataforma",
};

export default function AdminDashboardPage() {
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
