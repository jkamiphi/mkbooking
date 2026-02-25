import Link from "next/link";
import {
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

function formatDate(value: Date | null) {
  if (!value) return "No definida";
  return value.toLocaleDateString("es-PA", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
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

export default async function CampaignRequestsPage() {
  const caller = await createServerTRPCCaller();
  const data = await caller.catalog.requests.mine({ take: 50, skip: 0 });

  return (
    <div>
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
        </div>
        <Link
          href="/campaign-requests/new"
          className="inline-flex items-center gap-2 rounded-xl bg-[#0359A8] px-4 py-2.5 text-sm font-semibold text-white shadow-sm shadow-[#0359A8]/20 transition hover:bg-[#024a8f]"
        >
          <Plus className="h-4 w-4" />
          Nueva solicitud
        </Link>
      </div>

      {data.requests.length === 0 ? (
        /* Empty state */
        <div className="flex flex-col items-center rounded-2xl border border-dashed border-neutral-300 bg-white py-16 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-neutral-100">
            <ClipboardList className="h-7 w-7 text-neutral-400" />
          </div>
          <h2 className="mt-4 text-base font-semibold text-neutral-900">
            Sin solicitudes activas
          </h2>
          <p className="mt-1 max-w-sm text-sm text-neutral-500">
            Explora el catálogo, selecciona las caras que te interesan y crea tu primera solicitud de campaña.
          </p>
          <div className="mt-5 flex gap-2">
            <Link
              href="/s/all"
              className="inline-flex items-center gap-2 rounded-xl border border-neutral-200 bg-white px-4 py-2 text-sm font-medium text-neutral-700 transition hover:bg-neutral-50"
            >
              Ver catálogo
            </Link>
            <Link
              href="/campaign-requests/new"
              className="inline-flex items-center gap-2 rounded-xl bg-[#0359A8] px-4 py-2 text-sm font-semibold text-white shadow-sm shadow-[#0359A8]/20 transition hover:bg-[#024a8f]"
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

            return (
              <Link
                key={request.id}
                href={`/campaign-requests/${request.id}`}
                className={`group flex items-center gap-4 rounded-2xl border border-neutral-200/80 border-l-[3px] bg-white p-5 transition hover:border-neutral-300 hover:shadow-sm ${edgeColor}`}
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

                  {/* Metrics row */}
                  <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1.5 text-sm">
                    <span className="inline-flex items-center gap-1.5 text-neutral-700">
                      <Hash className="h-3.5 w-3.5 text-neutral-400" />
                      {request.quantity} {request.quantity === 1 ? "cara" : "caras"}
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
                      {formatDate(request.fromDate)} – {formatDate(request.toDate)}
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
