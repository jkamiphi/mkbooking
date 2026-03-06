import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";

interface ActorDisplay {
  id?: string | null;
  name?: string | null;
  email?: string | null;
}

interface ReportLike {
  id: string;
  status: string;
  version: number;
  issuedAt: Date | string;
  reviewNotes?: string | null;
  supersededAt?: Date | string | null;
  issuedBy?: ActorDisplay | null;
  snapshot: unknown;
}

interface InstallationReportCardProps {
  report: ReportLike;
  publicView?: boolean;
  title?: string;
}

interface ParsedSnapshot {
  orderCode: string | null;
  faceCode: string | null;
  assetCode: string | null;
  address: string | null;
  zoneName: string | null;
  provinceName: string | null;
  structureTypeName: string | null;
  installerName: string | null;
  validatorName: string | null;
  requiredChecklistTotal: number;
  requiredChecklistCompleted: number;
  evidenceCount: number;
  validEvidenceCount: number;
  hasGeoOverride: boolean;
  geoOverrideReasons: string[];
  evidences: Array<{
    id: string;
    fileUrl: string;
    fileName: string;
    withinExpectedRadius: boolean | null;
    distanceMeters: number | null;
  }>;
}

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

function resolveActorLabel(actor?: ActorDisplay | null) {
  return actor?.name || actor?.email || "Sistema";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function toStringOrNull(value: unknown) {
  return typeof value === "string" && value.length > 0 ? value : null;
}

function toNumberOrZero(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function toNumberOrNull(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function toBoolean(value: unknown) {
  return value === true;
}

function parseSnapshot(snapshot: unknown): ParsedSnapshot {
  if (!isRecord(snapshot)) {
    return {
      orderCode: null,
      faceCode: null,
      assetCode: null,
      address: null,
      zoneName: null,
      provinceName: null,
      structureTypeName: null,
      installerName: null,
      validatorName: null,
      requiredChecklistTotal: 0,
      requiredChecklistCompleted: 0,
      evidenceCount: 0,
      validEvidenceCount: 0,
      hasGeoOverride: false,
      geoOverrideReasons: [],
      evidences: [],
    };
  }

  const order = isRecord(snapshot.order) ? snapshot.order : {};
  const face = isRecord(snapshot.face) ? snapshot.face : {};
  const zone = isRecord(snapshot.zone) ? snapshot.zone : {};
  const installer = isRecord(snapshot.installer) ? snapshot.installer : {};
  const validator = isRecord(snapshot.validator) ? snapshot.validator : {};
  const validation = isRecord(snapshot.validation) ? snapshot.validation : {};
  const rawEvidences = Array.isArray(snapshot.evidences) ? snapshot.evidences : [];

  const evidences = rawEvidences
    .map((item) => {
      if (!isRecord(item)) {
        return null;
      }

      return {
        id: toStringOrNull(item.id) ?? "",
        fileUrl: toStringOrNull(item.fileUrl) ?? "",
        fileName: toStringOrNull(item.fileName) ?? "Evidencia",
        withinExpectedRadius:
          typeof item.withinExpectedRadius === "boolean"
            ? item.withinExpectedRadius
            : null,
        distanceMeters: toNumberOrNull(item.distanceMeters),
        geoOverrideReason: toStringOrNull(item.geoOverrideReason),
      };
    })
    .filter((item): item is NonNullable<typeof item> => Boolean(item));

  return {
    orderCode: toStringOrNull(order.code),
    faceCode: toStringOrNull(face.code),
    assetCode: toStringOrNull(face.assetCode),
    address: toStringOrNull(face.address),
    zoneName: toStringOrNull(zone.name),
    provinceName: toStringOrNull(zone.provinceName),
    structureTypeName: toStringOrNull(face.structureTypeName),
    installerName: toStringOrNull(installer.name) ?? toStringOrNull(installer.email),
    validatorName: toStringOrNull(validator.name) ?? toStringOrNull(validator.email),
    requiredChecklistTotal: toNumberOrZero(validation.requiredChecklistTotal),
    requiredChecklistCompleted: toNumberOrZero(
      validation.requiredChecklistCompleted,
    ),
    evidenceCount: toNumberOrZero(validation.evidenceCount),
    validEvidenceCount: toNumberOrZero(validation.validEvidenceCount),
    hasGeoOverride: toBoolean(validation.hasGeoOverride),
    geoOverrideReasons: evidences
      .map((evidence) => evidence.geoOverrideReason)
      .filter((reason): reason is string => Boolean(reason)),
    evidences: evidences.map((evidence) => ({
      id: evidence.id,
      fileUrl: evidence.fileUrl,
      fileName: evidence.fileName,
      withinExpectedRadius: evidence.withinExpectedRadius,
      distanceMeters: evidence.distanceMeters,
    })),
  };
}

function ReportStatusBadge({ status }: { status: string }) {
  if (status === "ISSUED") {
    return <Badge variant="success">Vigente</Badge>;
  }

  return <Badge variant="secondary">Superado</Badge>;
}

function EvidenceBadge({
  withinExpectedRadius,
}: {
  withinExpectedRadius: boolean | null;
}) {
  if (withinExpectedRadius === true) {
    return <Badge variant="success">Dentro de radio</Badge>;
  }

  if (withinExpectedRadius === false) {
    return <Badge variant="destructive">Fuera de radio</Badge>;
  }

  return <Badge variant="secondary">Sin geo</Badge>;
}

export function InstallationReportCard({
  report,
  publicView = false,
  title,
}: InstallationReportCardProps) {
  const snapshot = parseSnapshot(report.snapshot);

  return (
    <Card className="rounded-2xl border-neutral-200 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-neutral-900">
            {title ?? `Reporte de instalación v${report.version}`}
          </h3>
          <p className="mt-1 text-xs text-neutral-500">
            Emitido el {formatDateTime(report.issuedAt)} por{" "}
            {resolveActorLabel(report.issuedBy)}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="secondary">v{report.version}</Badge>
          <ReportStatusBadge status={report.status} />
        </div>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <DetailLine
          label="Orden / cara"
          value={`${snapshot.orderCode || "N/D"} · Cara ${snapshot.faceCode || "N/D"}`}
        />
        <DetailLine
          label="Activo / zona"
          value={`${snapshot.assetCode || "N/D"} · ${snapshot.provinceName || "N/D"} / ${snapshot.zoneName || "N/D"}`}
        />
        <DetailLine
          label="Ubicación"
          value={snapshot.address || "Sin dirección"}
        />
        <DetailLine
          label="Estructura"
          value={snapshot.structureTypeName || "Sin estructura"}
        />
        <DetailLine
          label="Instalador"
          value={snapshot.installerName || "Sin asignar"}
        />
        <DetailLine
          label="Validado por"
          value={snapshot.validatorName || resolveActorLabel(report.issuedBy)}
        />
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-3">
        <SummaryStat
          label="Checklist"
          value={`${snapshot.requiredChecklistCompleted}/${snapshot.requiredChecklistTotal}`}
        />
        <SummaryStat label="Evidencias" value={`${snapshot.evidenceCount}`} />
        <SummaryStat
          label="Válidas en radio"
          value={`${snapshot.validEvidenceCount}`}
        />
      </div>

      {report.reviewNotes && !publicView ? (
        <div className="mt-4 rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-2 text-xs text-neutral-700">
          Notas de validación: {report.reviewNotes}
        </div>
      ) : null}

      {report.status === "SUPERSEDED" && report.supersededAt ? (
        <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
          Este reporte quedó superado el {formatDateTime(report.supersededAt)}.
        </div>
      ) : null}

      {!publicView && snapshot.hasGeoOverride && snapshot.geoOverrideReasons.length > 0 ? (
        <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
          Override geográfico: {snapshot.geoOverrideReasons.join(" · ")}
        </div>
      ) : null}

      <div className="mt-4">
        <p className="text-xs font-semibold uppercase tracking-[0.08em] text-neutral-500">
          Evidencias incluidas
        </p>
        {snapshot.evidences.length === 0 ? (
          <div className="mt-2 rounded-xl border border-dashed border-neutral-200 px-3 py-4 text-sm text-neutral-500">
            Sin evidencias en el snapshot.
          </div>
        ) : (
          <div className="mt-2 space-y-2">
            {snapshot.evidences.map((evidence) => (
              <div
                key={evidence.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-neutral-200 px-3 py-2"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-neutral-900">
                    {evidence.fileName}
                  </p>
                  <p className="text-xs text-neutral-500">
                    Distancia:{" "}
                    {evidence.distanceMeters !== null
                      ? `${evidence.distanceMeters.toFixed(1)} m`
                      : "N/D"}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <EvidenceBadge
                    withinExpectedRadius={evidence.withinExpectedRadius}
                  />
                  <a
                    href={evidence.fileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs font-medium text-[#0359A8]"
                  >
                    Ver
                  </a>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Card>
  );
}

function DetailLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-neutral-200 px-3 py-2">
      <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-neutral-500">
        {label}
      </p>
      <p className="mt-1 text-sm text-neutral-800">{value}</p>
    </div>
  );
}

function SummaryStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-2">
      <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-neutral-500">
        {label}
      </p>
      <p className="mt-1 text-sm font-semibold text-neutral-900">{value}</p>
    </div>
  );
}
