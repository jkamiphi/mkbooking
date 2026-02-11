import Link from "next/link";
import { headers } from "next/headers";
import { ClipboardList, Plus, Shapes, MapPin, CalendarDays, Hash } from "lucide-react";
import { auth } from "@/lib/auth";
import {
  listCampaignRequestsForUser,
  listCampaignRequestsSchema,
} from "@/lib/services/campaign-request";
import { CampaignRequestStatusBadge } from "@/components/user/campaign-request-status";
import { UserZoneNav } from "@/components/user/user-zone-nav";

function formatDate(value: Date | null) {
  if (!value) return "No definida";
  return value.toLocaleDateString("es-PA", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export const metadata = {
  title: "Mis solicitudes - MK Booking",
  description: "Da seguimiento al estado de tus solicitudes de campaña.",
};

export default async function CampaignRequestsPage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  const data = await listCampaignRequestsForUser(
    listCampaignRequestsSchema.parse({ take: 50, skip: 0 }),
    {
      userId: session?.user.id ?? "",
      userEmail: session?.user.email,
    }
  );

  return (
    <div className="relative mx-auto max-w-5xl px-6 pb-12">
      <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#0359A8] text-white shadow-lg shadow-[#0359A8]/30">
            <ClipboardList className="h-6 w-6" />
          </span>
          <div>
            <h1 className="text-3xl font-bold text-neutral-900">Mis solicitudes de campaña</h1>
            <p className="text-sm text-neutral-500">
              Revisa estado, criterios solicitados y asignaciones propuestas por el equipo.
            </p>
          </div>
        </div>

        <Link
          href="/campaign-requests/new"
          className="inline-flex items-center gap-2 rounded-full bg-[#0359A8] px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-[#0359A8]/30 transition hover:bg-[#024a8f]"
        >
          <Plus className="h-4 w-4" />
          Nueva solicitud
        </Link>
      </div>

      <UserZoneNav />

      {data.requests.length === 0 ? (
        <section className="rounded-3xl border border-dashed border-neutral-300 bg-white/80 p-8 text-center shadow-sm">
          <h2 className="text-lg font-semibold text-neutral-900">Aún no tienes solicitudes</h2>
          <p className="mt-1 text-sm text-neutral-500">
            Crea tu primera solicitud para que el equipo prepare una propuesta de campaña.
          </p>
          <Link
            href="/campaign-requests/new"
            className="mt-5 inline-flex items-center gap-2 rounded-full border border-neutral-200 bg-white px-4 py-2 text-sm font-medium text-neutral-700 transition hover:bg-neutral-50"
          >
            <Plus className="h-4 w-4" />
            Crear solicitud
          </Link>
        </section>
      ) : (
        <div className="space-y-4">
          {data.requests.map((request) => (
            <article
              key={request.id}
              className="rounded-3xl border border-neutral-200 bg-white/90 p-6 shadow-lg backdrop-blur-xl"
            >
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <div className="space-y-1">
                  <p className="text-xs uppercase tracking-[0.18em] text-neutral-500">
                    Solicitud #{request.id.slice(0, 8).toUpperCase()}
                  </p>
                  <p className="text-sm text-neutral-500">
                    Creada el {formatDate(request.createdAt)} • Actualizada el {formatDate(request.updatedAt)}
                  </p>
                </div>
                <CampaignRequestStatusBadge status={request.status} />
              </div>

              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <div className="rounded-2xl border border-neutral-200 bg-white px-4 py-3">
                  <p className="text-xs text-neutral-500">Cantidad</p>
                  <p className="mt-1 flex items-center gap-1.5 text-sm font-semibold text-neutral-900">
                    <Hash className="h-4 w-4 text-neutral-500" />
                    {request.quantity} caras
                  </p>
                </div>
                <div className="rounded-2xl border border-neutral-200 bg-white px-4 py-3">
                  <p className="text-xs text-neutral-500">Tipo</p>
                  <p className="mt-1 flex items-center gap-1.5 text-sm font-semibold text-neutral-900">
                    <Shapes className="h-4 w-4 text-neutral-500" />
                    {request.structureType?.name || "Cualquier tipo"}
                  </p>
                </div>
                <div className="rounded-2xl border border-neutral-200 bg-white px-4 py-3">
                  <p className="text-xs text-neutral-500">Zona</p>
                  <p className="mt-1 flex items-center gap-1.5 text-sm font-semibold text-neutral-900">
                    <MapPin className="h-4 w-4 text-neutral-500" />
                    {request.zone
                      ? `${request.zone.name}, ${request.zone.province.name}`
                      : "Todas las zonas"}
                  </p>
                </div>
                <div className="rounded-2xl border border-neutral-200 bg-white px-4 py-3">
                  <p className="text-xs text-neutral-500">Fechas</p>
                  <p className="mt-1 flex items-center gap-1.5 text-sm font-semibold text-neutral-900">
                    <CalendarDays className="h-4 w-4 text-neutral-500" />
                    {formatDate(request.fromDate)} - {formatDate(request.toDate)}
                  </p>
                </div>
              </div>

              {request.notes ? (
                <p className="mt-4 rounded-2xl border border-neutral-200 bg-neutral-50/70 px-4 py-3 text-sm text-neutral-700">
                  {request.notes}
                </p>
              ) : null}

              <div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-sm">
                <p className="text-neutral-500">
                  Asignaciones sugeridas:{" "}
                  <span className="font-semibold text-neutral-900">
                    {request.assignments.length}
                  </span>
                </p>
                <Link
                  href={`/campaign-requests/${request.id}`}
                  className="inline-flex items-center rounded-full border border-neutral-200 bg-white px-4 py-2 font-medium text-neutral-700 transition hover:bg-neutral-50"
                >
                  Ver detalle
                </Link>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
