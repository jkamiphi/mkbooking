import { Metadata } from "next";
import { AdminPageHeader, AdminPageShell } from "@/components/admin/page-shell";
import { AdminRequestsTable } from "./_components/admin-requests-table";

export const metadata: Metadata = {
  title: "Solicitudes masivas | Administración | MK Booking",
  description: "Gestiona solicitudes por zona/tipo/cantidad y asígnalas.",
};

export default function CampaignRequestsPage() {
  return (
    <AdminPageShell>
      <AdminPageHeader
        title="Solicitudes masivas"
        description="Gestiona las solicitudes de campañas ingresadas por los usuarios y asígnales un cotización."
      />

      <AdminRequestsTable />
    </AdminPageShell>
  );
}
