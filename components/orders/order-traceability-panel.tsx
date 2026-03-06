import type { inferRouterOutputs } from "@trpc/server";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import type { AppRouter } from "@/lib/trpc/routers";

type RouterOutputs = inferRouterOutputs<AppRouter>;
type OrderTraceability = RouterOutputs["orders"]["getTraceability"];

function formatDateTime(value: Date | string | null | undefined) {
  if (!value) {
    return "N/D";
  }

  return new Date(value).toLocaleString("es-PA", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function stageLabel(status: string) {
  if (status === "CONFIRMADA") return "Confirmada";
  if (status === "CANCELADA") return "Cancelada";
  if (status === "EN_PROCESO") return "En proceso";
  if (status === "APPROVED") return "Aprobada";
  if (status === "CHANGES_REQUESTED") return "Requiere cambios";
  if (status === "NOT_STARTED") return "Sin iniciar";
  if (status === "PENDING_REVIEW") return "Pendiente";
  if (status === "REVIEW") return "En revisión";
  if (status === "ADJUST") return "En ajustes";
  if (status === "CREATE_FROM_SCRATCH") return "Creación";
  if (status === "COLOR_PROOF_READY") return "Prueba lista";
  if (status === "READY") return "Lista";
  if (status === "IN_PROGRESS") return "En progreso";
  if (status === "COMPLETED") return "Completada";
  if (status === "PENDIENTE") return "Pendiente";
  if (status === "EN_EJECUCION") return "En ejecución";
  if (status === "EN_VALIDACION") return "En validación";
  if (status === "VALIDADA_PARCIAL") return "Validada parcial";
  if (status === "CERRADA") return "Cerrada";
  if (status === "ARCHIVADO") return "Archivado";
  return status;
}

function stageVariant(status: string) {
  if (
    status === "CONFIRMADA" ||
    status === "APPROVED" ||
    status === "COMPLETED" ||
    status === "CERRADA" ||
    status === "ARCHIVADO"
  ) {
    return "success" as const;
  }

  if (
    status === "PENDING_REVIEW" ||
    status === "EN_VALIDACION" ||
    status === "VALIDADA_PARCIAL" ||
    status === "READY"
  ) {
    return "warning" as const;
  }

  if (status === "CHANGES_REQUESTED" || status === "CANCELADA") {
    return "destructive" as const;
  }

  return "secondary" as const;
}

function resolveActorLabel(actor: { name?: string | null; email?: string | null }) {
  return actor.name || actor.email || "Sistema";
}

export function OrderTraceabilityPanel({
  traceability,
}: {
  traceability: OrderTraceability;
}) {
  const summary = traceability.operationsSummary;

  return (
    <section className="rounded-2xl border border-neutral-200/80 bg-white p-5">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3 border-b border-neutral-100 pb-3">
        <div>
          <h2 className="text-sm font-semibold text-neutral-900">Trazabilidad</h2>
          <p className="mt-1 text-xs text-neutral-500">
            Flujo consolidado de la orden desde confirmación hasta archivado del expediente.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge variant={summary.isOperationsClosed ? "success" : "secondary"}>
            Cierre ops {summary.isOperationsClosed ? "activo" : "pendiente"}
          </Badge>
          <Badge variant={summary.isCaseFileArchived ? "success" : "secondary"}>
            Expediente {summary.isCaseFileArchived ? "archivado" : "abierto"}
          </Badge>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {traceability.stages.map((stage) => (
          <Card key={stage.id} className="rounded-2xl border-neutral-200 p-4">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-semibold text-neutral-900">{stage.title}</p>
              <Badge variant={stageVariant(stage.status)}>{stageLabel(stage.status)}</Badge>
            </div>
            <p className="mt-2 text-xs text-neutral-500">
              Última actualización: {formatDateTime(stage.updatedAt)}
            </p>
          </Card>
        ))}
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <SummaryCard label="OTs activas" value={`${summary.activeWorkOrdersCount}`} />
        <SummaryCard label="En validación" value={`${summary.pendingReviewCount}`} />
        <SummaryCard
          label="Caras cerradas"
          value={`${summary.completedLineItemsCount}/${summary.totalLineItems}`}
        />
        <SummaryCard label="Reportes emitidos" value={`${summary.issuedReportsCount}`} />
      </div>

      <div className="mt-5">
        <h3 className="text-xs font-semibold uppercase tracking-[0.08em] text-neutral-500">
          Timeline consolidado
        </h3>
        <div className="mt-3 space-y-2">
          {traceability.timeline.length === 0 ? (
            <div className="rounded-xl border border-dashed border-neutral-200 px-3 py-4 text-sm text-neutral-500">
              Aún no hay eventos registrados.
            </div>
          ) : (
            traceability.timeline.map((event) => (
              <div key={event.id} className="rounded-xl border border-neutral-200 px-3 py-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="text-sm font-medium text-neutral-900">{event.title}</p>
                    <p className="text-xs text-neutral-500">
                      {event.domain} · {resolveActorLabel(event.actor)}
                    </p>
                  </div>
                  <span className="text-xs text-neutral-500">
                    {formatDateTime(event.occurredAt)}
                  </span>
                </div>
                {event.notes ? (
                  <p className="mt-2 text-xs text-neutral-700">{event.notes}</p>
                ) : null}
              </div>
            ))
          )}
        </div>
      </div>
    </section>
  );
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <Card className="rounded-2xl border-neutral-200 p-4">
      <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-neutral-500">
        {label}
      </p>
      <p className="mt-2 text-lg font-semibold text-neutral-900">{value}</p>
    </Card>
  );
}
