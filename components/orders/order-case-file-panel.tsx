import type { inferRouterOutputs } from "@trpc/server";
import { Card } from "@/components/ui/card";
import type { AppRouter } from "@/lib/trpc/routers";
import { InstallationReportCard } from "@/components/orders/installation-report-card";

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

function resolveActorLabel(actor: { name?: string | null; email?: string | null }) {
  return actor.name || actor.email || "Sistema";
}

export function OrderCaseFilePanel({
  traceability,
  publicView = false,
}: {
  traceability: OrderTraceability;
  publicView?: boolean;
}) {
  const caseFile = traceability.caseFile;

  return (
    <section className="rounded-2xl border border-neutral-200/80 bg-white p-5">
      <div className="mb-4 border-b border-neutral-100 pb-3">
        <h2 className="text-sm font-semibold text-neutral-900">Expediente</h2>
        <p className="mt-1 text-xs text-neutral-500">
          Consolidado documental de la orden, con versión final de instalación y respaldo histórico.
        </p>
      </div>

      <div className="space-y-5">
        <DocumentSection
          title="OC del cliente"
          emptyLabel="Sin OCs registradas."
          items={caseFile.purchaseOrders.map((purchaseOrder) => ({
            id: purchaseOrder.id,
            title: `${purchaseOrder.fileName} · v${purchaseOrder.version}`,
            meta: `${formatDateTime(purchaseOrder.createdAt)} · ${resolveActorLabel(
              purchaseOrder.uploadedBy,
            )}`,
            note: purchaseOrder.reviewNotes ?? null,
            href: purchaseOrder.fileUrl,
          }))}
        />

        <DocumentSection
          title="Artes del cliente"
          emptyLabel="Sin artes cargados."
          items={caseFile.clientArtworks.map((creative) => ({
            id: creative.id,
            title: `${creative.fileName}${creative.faceCode ? ` · Cara ${creative.faceCode}` : ""}`,
            meta: `${formatDateTime(creative.createdAt)} · ${resolveActorLabel(
              creative.uploadedBy,
            )}`,
            note: creative.notes ?? null,
            href: creative.fileUrl,
          }))}
        />

        <DocumentSection
          title="Pruebas de diseño"
          emptyLabel="Sin pruebas publicadas."
          items={caseFile.designProofs.map((proof) => ({
            id: proof.id,
            title: `${proof.fileName} · v${proof.version}`,
            meta: `${formatDateTime(proof.createdAt)} · ${resolveActorLabel(
              proof.uploadedBy,
            )}`,
            note: proof.notes ?? null,
            href: proof.fileUrl,
          }))}
        />

        <DocumentSection
          title="Evidencias de impresión"
          emptyLabel="Sin evidencias de impresión."
          items={caseFile.printEvidences.map((evidence) => ({
            id: evidence.id,
            title: evidence.fileName,
            meta: `${formatDateTime(evidence.createdAt)} · ${resolveActorLabel(
              evidence.uploadedBy,
            )}`,
            note: evidence.notes ?? null,
            href: evidence.fileUrl,
          }))}
        />

        {!publicView ? (
          <DocumentSection
            title="Evidencias operativas"
            emptyLabel="Sin evidencias operativas."
            items={caseFile.operationalEvidences.map((evidence) => ({
              id: evidence.id,
              title: `${evidence.fileName} · Cara ${evidence.faceCode}`,
              meta: `${formatDateTime(evidence.receivedAt)} · ${resolveActorLabel(
                evidence.uploadedBy,
              )}`,
              note: evidence.geoOverrideReason ?? null,
              href: evidence.fileUrl,
            }))}
          />
        ) : null}

        <div>
          <h3 className="text-xs font-semibold uppercase tracking-[0.08em] text-neutral-500">
            Reportes finales de instalación
          </h3>
          <div className="mt-3 space-y-3">
            {caseFile.installationReports.length === 0 ? (
              <div className="rounded-xl border border-dashed border-neutral-200 px-3 py-4 text-sm text-neutral-500">
                Sin reportes de instalación emitidos.
              </div>
            ) : (
              caseFile.installationReports.map((report) => (
                <InstallationReportCard
                  key={report.id}
                  report={report}
                  publicView={publicView}
                />
              ))
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

function DocumentSection({
  title,
  emptyLabel,
  items,
}: {
  title: string;
  emptyLabel: string;
  items: Array<{
    id: string;
    title: string;
    meta: string;
    note: string | null;
    href: string;
  }>;
}) {
  return (
    <div>
      <h3 className="text-xs font-semibold uppercase tracking-[0.08em] text-neutral-500">
        {title}
      </h3>
      <div className="mt-3 space-y-2">
        {items.length === 0 ? (
          <div className="rounded-xl border border-dashed border-neutral-200 px-3 py-4 text-sm text-neutral-500">
            {emptyLabel}
          </div>
        ) : (
          items.map((item) => (
            <Card key={item.id} className="rounded-2xl border-neutral-200 p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-neutral-900">
                    {item.title}
                  </p>
                  <p className="mt-1 text-xs text-neutral-500">{item.meta}</p>
                  {item.note ? (
                    <p className="mt-2 text-xs text-neutral-700">{item.note}</p>
                  ) : null}
                </div>
                <a
                  href={item.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs font-medium text-[#0359A8]"
                >
                  Ver
                </a>
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
