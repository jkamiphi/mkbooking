import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  CalendarDays,
  ChevronRight,
  Clock3,
  Hash,
  MapPin,
  MessageSquareText,
  PackageOpen,
  Shapes,
} from "lucide-react";
import { TRPCError } from "@trpc/server";
import { createServerTRPCCaller } from "@/lib/trpc/server";
import { CampaignRequestStatusBadge } from "@/components/user/campaign-request-status";

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

function formatCurrency(value: string | number, currency = "USD") {
  return new Intl.NumberFormat("es-PA", {
    style: "currency",
    currency,
  }).format(Number(value));
}

const STATUS_STEPS = [
  { key: "NEW", label: "Nueva" },
  { key: "IN_REVIEW", label: "En revisión" },
  { key: "PROPOSAL_SENT", label: "Propuesta" },
  { key: "CONFIRMED", label: "Confirmada" },
] as const;

function getStepIndex(status: string) {
  if (status === "QUOTATION_GENERATED") return 1; // Maps to "En revisión"
  const idx = STATUS_STEPS.findIndex((s) => s.key === status);
  return idx >= 0 ? idx : 0;
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

  const currentStep = getStepIndex(request.status);
  const isRejected = request.status === "REJECTED";

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <Link
          href="/campaign-requests"
          className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-neutral-500 transition hover:text-neutral-700"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Solicitudes
        </Link>
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-bold tracking-tight text-neutral-900">
            Solicitud #{request.id.slice(0, 8).toUpperCase()}
          </h1>
          <CampaignRequestStatusBadge status={request.status} />
        </div>
        <p className="mt-1 text-sm text-neutral-500">
          Creada el {formatDate(request.createdAt)} · Última actualización{" "}
          {formatDate(request.updatedAt)}
        </p>
      </div>

      {/* Progress steps */}
      {!isRejected && (
        <div className="mb-8 rounded-2xl border border-neutral-200/80 bg-white p-5">
          <div className="flex items-center justify-between">
            {STATUS_STEPS.map((step, i) => {
              const isDone = i <= currentStep;
              const isCurrent = i === currentStep;
              return (
                <div key={step.key} className="flex flex-1 items-center">
                  <div className="flex flex-col items-center gap-1.5">
                    <div
                      className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold transition ${isDone
                        ? "bg-[#0359A8] text-white"
                        : "bg-neutral-100 text-neutral-400"
                        } ${isCurrent ? "ring-2 ring-[#0359A8]/20 ring-offset-2" : ""}`}
                    >
                      {i + 1}
                    </div>
                    <span
                      className={`text-[11px] font-medium ${isDone ? "text-[#0359A8]" : "text-neutral-400"
                        }`}
                    >
                      {step.label}
                    </span>
                  </div>
                  {i < STATUS_STEPS.length - 1 && (
                    <div
                      className={`mx-2 h-px flex-1 ${i < currentStep ? "bg-[#0359A8]" : "bg-neutral-200"
                        }`}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="grid gap-5 lg:grid-cols-2">
        {/* Summary */}
        <section className="rounded-2xl border border-neutral-200/80 bg-white p-5">
          <h2 className="mb-4 text-sm font-semibold text-neutral-900">
            Resumen de solicitud
          </h2>
          <dl className="space-y-3 text-sm">
            <div className="flex items-center justify-between gap-3">
              <dt className="flex items-center gap-2 text-neutral-500">
                <Hash className="h-3.5 w-3.5" />
                Cantidad
              </dt>
              <dd className="font-medium text-neutral-900">
                {request.quantity} {request.quantity === 1 ? "cara" : "caras"}
              </dd>
            </div>
            <div className="flex items-center justify-between gap-3">
              <dt className="flex items-center gap-2 text-neutral-500">
                <Shapes className="h-3.5 w-3.5" />
                Tipo
              </dt>
              <dd className="font-medium text-neutral-900">
                {request.structureType?.name || "Cualquier tipo"}
              </dd>
            </div>
            <div className="flex items-center justify-between gap-3">
              <dt className="flex items-center gap-2 text-neutral-500">
                <MapPin className="h-3.5 w-3.5" />
                Zona
              </dt>
              <dd className="font-medium text-neutral-900">
                {request.zone
                  ? `${request.zone.name}, ${request.zone.province.name}`
                  : "Todas las zonas"}
              </dd>
            </div>
            <div className="flex items-center justify-between gap-3">
              <dt className="flex items-center gap-2 text-neutral-500">
                <CalendarDays className="h-3.5 w-3.5" />
                Fechas
              </dt>
              <dd className="font-medium text-neutral-900">
                {formatDate(request.fromDate)} – {formatDate(request.toDate)}
              </dd>
            </div>
          </dl>

          {request.notes && (
            <div className="mt-4 rounded-xl border border-neutral-100 bg-neutral-50/70 p-3">
              <div className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-neutral-500">
                <MessageSquareText className="h-3 w-3" />
                Notas
              </div>
              <p className="text-sm text-neutral-700">{request.notes}</p>
            </div>
          )}
        </section>

        {/* Timeline / tracking */}
        <section className="rounded-2xl border border-neutral-200/80 bg-white p-5">
          <h2 className="mb-4 text-sm font-semibold text-neutral-900">
            Seguimiento
          </h2>
          <div className="space-y-3">
            <div className="flex items-start gap-3 rounded-xl border border-neutral-100 bg-neutral-50/50 p-3">
              <Clock3 className="mt-0.5 h-4 w-4 shrink-0 text-neutral-400" />
              <div>
                <p className="text-sm font-medium text-neutral-900">
                  Última actualización
                </p>
                <p className="text-sm text-neutral-500">
                  {formatDate(request.updatedAt)}
                </p>
              </div>
            </div>

            {request.order ? (
              <div className="flex items-start gap-3 rounded-xl border border-neutral-200 bg-white p-3">
                <PackageOpen className="mt-0.5 h-4 w-4 shrink-0 text-[#0359A8]" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-neutral-900">
                    Orden generada
                  </p>
                  <p className="mt-0.5 text-xs text-neutral-500">
                    Se generó la Orden #{request.order.code} para esta solicitud.
                  </p>
                  <Link
                    href={`/orders/${request.order.id}`}
                    className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-[#0359A8] transition hover:text-[#024482]"
                  >
                    Ver Orden
                    <ChevronRight className="h-3 w-3" />
                  </Link>
                </div>
              </div>
            ) : (
              <div className="flex items-start gap-3 rounded-xl border border-dashed border-neutral-200 bg-white p-3">
                <PackageOpen className="mt-0.5 h-4 w-4 shrink-0 text-neutral-400" />
                <div>
                  <p className="text-sm font-medium text-neutral-900">
                    Conversión a orden
                  </p>
                  <p className="text-xs text-neutral-500">
                    Próximamente podrás confirmar y ver esta solicitud como orden.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Assignments preview */}
          {request.assignments.length > 0 && (
            <div className="mt-5">
              <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-neutral-400">
                Asignaciones sugeridas ({request.assignments.length})
              </h3>
              <div className="space-y-2">
                {request.assignments.slice(0, 4).map((assignment) => (
                  <Link
                    key={assignment.id}
                    href={`/faces/${assignment.faceId}`}
                    className="group flex items-center gap-3 rounded-xl border border-neutral-100 bg-white p-2.5 transition hover:border-neutral-200 hover:shadow-sm"
                  >
                    <div className="relative h-10 w-14 shrink-0 overflow-hidden rounded-lg bg-neutral-100">
                      {assignment.face?.asset?.structureType?.name && (
                        <div className="flex h-full w-full items-center justify-center bg-neutral-100">
                          <span className="text-[7px] font-semibold text-neutral-400">
                            {assignment.face.asset.structureType.name}
                          </span>
                        </div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-neutral-900">
                        {assignment.face?.asset?.structureType?.name || "Cara"} ·{" "}
                        {assignment.face?.asset?.zone?.name || ""}
                      </p>
                      <p className="truncate text-xs text-neutral-500">
                        {assignment.face?.asset?.zone?.province?.name || ""}
                      </p>
                    </div>
                    <ChevronRight className="h-4 w-4 shrink-0 text-neutral-300 transition group-hover:text-neutral-500" />
                  </Link>
                ))}
                {request.assignments.length > 4 && (
                  <p className="text-center text-xs text-neutral-500">
                    +{request.assignments.length - 4} más
                  </p>
                )}
              </div>
            </div>
          )}

          {request.services.length > 0 && (
            <div className="mt-5">
              <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-neutral-400">
                Servicios solicitados ({request.services.length})
              </h3>
              <div className="space-y-2">
                {request.services.map((serviceItem) => (
                  <div
                    key={serviceItem.id}
                    className="rounded-xl border border-neutral-100 bg-white p-3"
                  >
                    <p className="text-sm font-medium text-neutral-900">
                      {serviceItem.service?.name || "Servicio adicional"}
                    </p>
                    <p className="mt-1 text-xs text-neutral-500">
                      {serviceItem.quantity} x{" "}
                      {formatCurrency(
                        Number(serviceItem.unitPrice),
                        serviceItem.service?.currency || "USD"
                      )}{" "}
                      ={" "}
                      {formatCurrency(
                        Number(serviceItem.subtotal),
                        serviceItem.service?.currency || "USD"
                      )}
                    </p>
                  </div>
                ))}
                <div className="flex items-center justify-between rounded-xl border border-neutral-200 bg-neutral-50 p-3 text-sm">
                  <span className="text-neutral-600">Total servicios</span>
                  <span className="font-semibold text-neutral-900">
                    {formatCurrency(
                      request.services.reduce(
                        (sum, serviceItem) => sum + Number(serviceItem.subtotal),
                        0
                      ),
                      request.services[0]?.service?.currency || "USD"
                    )}
                  </span>
                </div>
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
