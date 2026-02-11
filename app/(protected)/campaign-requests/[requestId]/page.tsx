import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ClipboardCheck, Clock3, PackageOpen } from "lucide-react";
import { TRPCError } from "@trpc/server";
import { createServerTRPCCaller } from "@/lib/trpc/server";
import { CampaignRequestStatusBadge } from "@/components/user/campaign-request-status";
import { UserZoneNav } from "@/components/user/user-zone-nav";

type PageProps = {
  params: Promise<{ requestId: string }>;
};

function formatDate(value: Date | null) {
  if (!value) return "No definida";
  return value.toLocaleDateString("es-PA", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export default async function CampaignRequestDetailPage({ params }: PageProps) {
  const { requestId } = await params;
  const caller = await createServerTRPCCaller();
  const request = await caller.catalog.requests
    .mineById({ requestId })
    .catch((error: unknown) => {
      if (
        error instanceof TRPCError &&
        (error.code === "NOT_FOUND" || error.code === "FORBIDDEN")
      ) {
        notFound();
      }
      throw error;
    });

  return (
    <div className="relative mx-auto max-w-5xl px-6 pb-12">
      <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#0359A8] text-white shadow-lg shadow-[#0359A8]/30">
            <ClipboardCheck className="h-6 w-6" />
          </span>
          <div>
            <h1 className="text-3xl font-bold text-neutral-900">Detalle de solicitud</h1>
            <p className="text-sm text-neutral-500">
              Solicitud #{request.id.slice(0, 8).toUpperCase()} • creada el {formatDate(request.createdAt)}
            </p>
          </div>
        </div>
        <Link
          href="/campaign-requests"
          className="inline-flex items-center gap-2 rounded-full border border-neutral-200 bg-white px-4 py-2 text-sm font-medium text-neutral-700 transition hover:bg-neutral-50"
        >
          <ArrowLeft className="h-4 w-4" />
          Volver a solicitudes
        </Link>
      </div>

      <UserZoneNav />

      <section className="rounded-3xl border border-neutral-200 bg-white/90 p-6 shadow-lg backdrop-blur-xl">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-sm text-neutral-500">Estado actual</p>
            <div className="mt-2">
              <CampaignRequestStatusBadge status={request.status} />
            </div>
          </div>
          <div className="text-sm text-neutral-500">
            Rango solicitado: {formatDate(request.fromDate)} - {formatDate(request.toDate)}
          </div>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <div className="rounded-2xl border border-neutral-200 bg-white p-4">
            <h2 className="text-sm font-semibold text-neutral-900">Resumen de solicitud</h2>
            <dl className="mt-3 space-y-2 text-sm">
              <div className="flex items-center justify-between gap-3">
                <dt className="text-neutral-500">Cantidad</dt>
                <dd className="font-medium text-neutral-900">{request.quantity} caras</dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-neutral-500">Tipo de estructura</dt>
                <dd className="font-medium text-neutral-900">
                  {request.structureType?.name || "Cualquier tipo"}
                </dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-neutral-500">Zona</dt>
                <dd className="font-medium text-neutral-900">
                  {request.zone
                    ? `${request.zone.name}, ${request.zone.province.name}`
                    : "Todas las zonas"}
                </dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-neutral-500">Asignaciones sugeridas</dt>
                <dd className="font-medium text-neutral-900">{request.assignments.length}</dd>
              </div>
            </dl>
            {request.notes ? (
              <p className="mt-4 rounded-xl border border-neutral-200 bg-neutral-50/70 px-3 py-2 text-sm text-neutral-700">
                {request.notes}
              </p>
            ) : null}
          </div>

          <div className="rounded-2xl border border-neutral-200 bg-white p-4">
            <h2 className="text-sm font-semibold text-neutral-900">Seguimiento</h2>
            <div className="mt-3 space-y-3">
              <div className="flex items-start gap-3 rounded-xl border border-neutral-200 bg-neutral-50/70 p-3">
                <Clock3 className="mt-0.5 h-4 w-4 text-neutral-500" />
                <div>
                  <p className="text-sm font-medium text-neutral-900">Última actualización</p>
                  <p className="text-sm text-neutral-500">{formatDate(request.updatedAt)}</p>
                </div>
              </div>
              <div className="flex items-start gap-3 rounded-xl border border-dashed border-neutral-300 bg-white p-3">
                <PackageOpen className="mt-0.5 h-4 w-4 text-neutral-500" />
                <div>
                  <p className="text-sm font-medium text-neutral-900">Conversión a orden</p>
                  <p className="text-sm text-neutral-500">
                    Próximamente podrás confirmar esta solicitud y verla como orden.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
