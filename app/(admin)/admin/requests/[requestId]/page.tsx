import { Metadata } from "next";
import { AdminRequestDetail } from "./_components/admin-request-detail";

export const metadata: Metadata = {
    title: "Detalle de Solicitud | Administración | MK Booking",
    description: "Verifica requerimientos, asigna caras y genera cotizaciones.",
};

type PageProps = {
    params: Promise<{ requestId: string }>;
};

export default async function AdminRequestDetailPage({ params }: PageProps) {
    const { requestId } = await params;

    return <AdminRequestDetail requestId={requestId} />;
}
