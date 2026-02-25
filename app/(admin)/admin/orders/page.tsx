import { Metadata } from "next";
import { AdminPageHeader, AdminPageShell } from "@/components/admin/page-shell";
import { AdminOrdersTable } from "./_components/admin-orders-table";

export const metadata: Metadata = {
    title: "Órdenes | Administración | MK Booking",
    description: "Gestiona las órdenes y cotizaciones generadas.",
};

export default function AdminOrdersPage() {
    return (
        <AdminPageShell>
            <AdminPageHeader
                title="Órdenes de Campaña"
                description="Revisa cotizaciones enviadas, aprobaciones de clientes y confirma órdenes para generar bloqueos de inventario."
            />

            <AdminOrdersTable />
        </AdminPageShell>
    );
}
