import Link from "next/link";
import {
  BriefcaseBusiness,
  Building2,
  CalendarDays,
  ChevronRight,
  ClipboardList,
  Hash,
  MapPin,
  Plus,
  Shapes,
} from "lucide-react";
import { createServerTRPCCaller } from "@/lib/trpc/server";
import { CampaignRequestStatusBadge } from "@/components/user/campaign-request-status";
import { SelectionEstimateBanner } from "./_components/selection-estimate-banner";

type PageProps = {
  searchParams: Promise<{ view?: string | string[] }>;
};

type ActiveContextLike = {
  organizationName: string;
  organizationType: "ADVERTISER" | "AGENCY" | "MEDIA_OWNER" | "PLATFORM_ADMIN";
  operatingAgencyOrganizationName: string | null;
  targetBrandOrganizationId: string | null;
};

function getParam(value?: string | string[]) {
  if (Array.isArray(value)) return value[0];
  return value;
}

function formatDate(value: Date | null) {
  if (!value) return "No definida";
  return value.toLocaleDateString("es-PA", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function buildOperationContextLabel(input: {
  brandName?: string | null;
  actingAgencyName?: string | null;
}) {
  if (input.actingAgencyName && input.brandName) {
    return `Agencia ${input.actingAgencyName} para ${input.brandName}`;
  }

  if (input.brandName) {
    return `Marca ${input.brandName}`;
  }

  if (input.actingAgencyName) {
    return `Agencia ${input.actingAgencyName}`;
  }

  return "Contexto no disponible";
}

function resolveViewMode(value?: string): "all" | "context" {
  return value === "context" ? "context" : "all";
}

function buildAgencyReadScopeLabel(
  activeContext: ActiveContextLike | null,
): string | null {
  if (!activeContext) {
    return null;
  }

  const isAgencyAggregate =
    activeContext.organizationType === "AGENCY" &&
    !activeContext.targetBrandOrganizationId;

  if (isAgencyAggregate) {
    return `Mostrando todo lo operado por ${activeContext.organizationName}.`;
  }

  if (activeContext.targetBrandOrganizationId) {
    const agencyName =
      activeContext.operatingAgencyOrganizationName ?? "tu agencia";
    return `Mostrando ${activeContext.organizationName} operada por ${agencyName}.`;
  }

  return `Mostrando contexto activo: ${activeContext.organizationName}.`;
}

const STATUS_EDGE_COLORS: Record<string, string> = {
  NEW: "border-l-[#0359A8]",
  IN_REVIEW: "border-l-amber-400",
  PROPOSAL_SENT: "border-l-violet-400",
  CONFIRMED: "border-l-emerald-400",
  REJECTED: "border-l-red-400",
};

export const metadata = {
  title: "Mis solicitudes - MK Booking",
  description: "Da seguimiento al estado de tus solicitudes de campaña.",
};

export default async function CampaignRequestsPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const requestedView = resolveViewMode(getParam(params.view));
  const caller = await createServerTRPCCaller();
  const contextState = await caller.organization.myContexts();
  const isDirectClient = contextState.accountType === "DIRECT_CLIENT";
  const resolvedView = isDirectClient ? requestedView : "context";
  const viewScope = resolvedView === "all" ? "ALL" : "CONTEXT";
  const data = await caller.catalog.requests.mine({
    take: 50,
    skip: 0,
    viewScope,
  });
  const agencyReadScopeLabel =
    contextState.accountType === "AGENCY"
      ? buildAgencyReadScopeLabel(
          (contextState.activeContext as ActiveContextLike | null) ?? null,
        )
      : null;

  return (
    <div>
      {/* Selection estimation banner */}
      <SelectionEstimateBanner />

      {/* Header */}
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-neutral-900">
            Solicitudes de campaña
          </h1>
          <p className="mt-1 text-sm text-neutral-500">
            {data.requests.length > 0
              ? `${data.requests.length} ${data.requests.length === 1 ? "solicitud" : "solicitudes"} registradas`
              : "Aún no tienes solicitudes"}
          </p>
          {agencyReadScopeLabel ? (
            <p className="mt-1 text-xs font-medium text-[#0359A8]">
              {agencyReadScopeLabel}
            </p>
          ) : null}
          {isDirectClient ? (
            <div className="mt-3 inline-flex rounded-xs border border-neutral-200 bg-white p-1">
              <Link
                href="/campaign-requests?view=all"
                className={`rounded-[2px] px-3 py-1.5 text-xs font-medium transition ${
                  resolvedView === "all"
                    ? "bg-[#0359A8] text-white"
                    : "text-neutral-600 hover:bg-neutral-100"
                }`}
              >
                Ver todo
              </Link>
              <Link
                href="/campaign-requests?view=context"
                className={`rounded-[2px] px-3 py-1.5 text-xs font-medium transition ${
                  resolvedView === "context"
                    ? "bg-[#0359A8] text-white"
                    : "text-neutral-600 hover:bg-neutral-100"
                }`}
              >
                Contexto activo
              </Link>
            </div>
          ) : null}
        </div>
        <Link
          href="/campaign-requests/new"
          className="inline-flex items-center gap-2 rounded-xs bg-[#0359A8] px-4 py-2.5 text-sm font-semibold text-white shadow-sm shadow-[#0359A8]/20 transition hover:bg-[#024a8f]"
        >
          <Plus className="h-4 w-4" />
          Nueva solicitud
        </Link>
      </div>

      {data.requests.length === 0 ? (
        /* Empty state */
        <div className="flex flex-col items-center rounded-md border border-dashed border-neutral-300 bg-white py-16 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-neutral-100">
            <ClipboardList className="h-7 w-7 text-neutral-400" />
          </div>
          <h2 className="mt-4 text-base font-semibold text-neutral-900">
            Sin solicitudes activas
          </h2>
          <p className="mt-1 max-w-sm text-sm text-neutral-500">
            Explora el catálogo, selecciona las caras que te interesan y crea tu
            primera solicitud de campaña.
          </p>
          <div className="mt-5 flex gap-2">
            <Link
              href="/s/all"
              className="inline-flex items-center gap-2 rounded-xs border border-neutral-200 bg-white px-4 py-2 text-sm font-medium text-neutral-700 transition hover:bg-neutral-50"
            >
              Ver catálogo
            </Link>
            <Link
              href="/campaign-requests/new"
              className="inline-flex items-center gap-2 rounded-xs bg-[#0359A8] px-4 py-2 text-sm font-semibold text-white shadow-sm shadow-[#0359A8]/20 transition hover:bg-[#024a8f]"
            >
              <Plus className="h-4 w-4" />
              Crear solicitud
            </Link>
          </div>
        </div>
      ) : (
        /* Request list */
        <div className="space-y-3">
          {data.requests.map((request) => {
            const edgeColor =
              STATUS_EDGE_COLORS[request.status] || "border-l-neutral-300";
            const operationContextLabel = buildOperationContextLabel({
              brandName: request.organization?.name,
              actingAgencyName: request.actingAgencyOrganization?.name,
            });

            return (
              <Link
                key={request.id}
                href={`/campaign-requests/${request.id}?view=${resolvedView}`}
                className={`group flex items-center gap-4 rounded-md border border-neutral-200/80 border-l-[3px] bg-white p-5 transition hover:border-neutral-300 hover:shadow-sm ${edgeColor}`}
              >
                <div className="min-w-0 flex-1">
                  {/* Top row: ID + status */}
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-mono font-medium text-neutral-400">
                      #{request.id.slice(0, 8).toUpperCase()}
                    </span>
                    <CampaignRequestStatusBadge status={request.status} />
                    <span className="text-xs text-neutral-400">
                      · {formatDate(request.createdAt)}
                    </span>
                  </div>

                  <p className="mt-2 inline-flex items-center gap-1.5 text-xs text-neutral-600">
                    {request.actingAgencyOrganization ? (
                      <BriefcaseBusiness className="h-3.5 w-3.5 text-[#0359A8]" />
                    ) : (
                      <Building2 className="h-3.5 w-3.5 text-[#0359A8]" />
                    )}
                    {operationContextLabel}
                  </p>

                  {/* Metrics row */}
                  <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1.5 text-sm">
                    <span className="inline-flex items-center gap-1.5 text-neutral-700">
                      <Hash className="h-3.5 w-3.5 text-neutral-400" />
                      {request.quantity}{" "}
                      {request.quantity === 1 ? "cara" : "caras"}
                    </span>
                    <span className="inline-flex items-center gap-1.5 text-neutral-700">
                      <Shapes className="h-3.5 w-3.5 text-neutral-400" />
                      {request.structureType?.name || "Cualquier tipo"}
                    </span>
                    <span className="inline-flex items-center gap-1.5 text-neutral-700">
                      <MapPin className="h-3.5 w-3.5 text-neutral-400" />
                      {request.zone
                        ? `${request.zone.name}, ${request.zone.province.name}`
                        : "Todas"}
                    </span>
                    <span className="inline-flex items-center gap-1.5 text-neutral-700">
                      <CalendarDays className="h-3.5 w-3.5 text-neutral-400" />
                      {formatDate(request.fromDate)} –{" "}
                      {formatDate(request.toDate)}
                    </span>
                  </div>

                  {/* Assignments */}
                  {request.assignments.length > 0 && (
                    <p className="mt-2 text-xs text-neutral-500">
                      {request.assignments.length}{" "}
                      {request.assignments.length === 1
                        ? "asignación sugerida"
                        : "asignaciones sugeridas"}
                    </p>
                  )}
                  {request.services.length > 0 && (
                    <p className="mt-1 text-xs text-neutral-500">
                      {request.services.length}{" "}
                      {request.services.length === 1
                        ? "servicio adicional"
                        : "servicios adicionales"}
                    </p>
                  )}
                </div>

                <ChevronRight className="h-5 w-5 shrink-0 text-neutral-300 transition group-hover:text-neutral-500" />
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
