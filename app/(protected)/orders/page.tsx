import Link from "next/link";
import {
  BriefcaseBusiness,
  Building2,
  CalendarDays,
  FileText,
  PackageCheck,
  Plus,
  ArrowRight,
} from "lucide-react";
import { createServerTRPCCaller } from "@/lib/trpc/server";
import { Badge } from "@/components/ui/badge";

type PageProps = {
  searchParams: Promise<{ view?: string | string[] }>;
};

type ActiveContextLike = {
  organizationName: string;
  organizationType: "DIRECT_CLIENT" | "AGENCY" | "MEDIA_OWNER" | "PLATFORM_ADMIN";
  operatingAgencyOrganizationName: string | null;
  targetBrandOrganizationId: string | null;
};

function getParam(value?: string | string[]) {
  if (Array.isArray(value)) return value[0];
  return value;
}

export const metadata = {
  title: "Mis Órdenes - MK Booking",
  description: "Consulta el estado de tus órdenes y cotizaciones.",
};

function formatDate(value: Date | null) {
  if (!value) return "N/D";
  return value.toLocaleDateString("es-PA", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatCurrency(value: string | number) {
  return new Intl.NumberFormat("es-PA", {
    style: "currency",
    currency: "USD",
  }).format(Number(value));
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

const STATUS_CONFIG: Record<
  string,
  {
    label: string;
    variant: "info" | "warning" | "success" | "destructive" | "secondary";
    border: string;
  }
> = {
  DRAFT: { label: "Borrador", variant: "info", border: "border-l-neutral-300" },
  QUOTATION_SENT: {
    label: "Cotización enviada",
    variant: "warning",
    border: "border-l-amber-400",
  },
  CLIENT_APPROVED: {
    label: "Aprobada por ti",
    variant: "secondary",
    border: "border-l-violet-400",
  },
  CONFIRMED: {
    label: "Confirmada",
    variant: "success",
    border: "border-l-emerald-400",
  },
  CANCELLED: {
    label: "Cancelada",
    variant: "destructive",
    border: "border-l-red-400",
  },
};

export default async function OrdersPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const requestedView = resolveViewMode(getParam(params.view));
  const caller = await createServerTRPCCaller();
  const contextState = await caller.organization.myContexts();
  const isDirectClient = contextState.accountType === "DIRECT_CLIENT";
  const resolvedView = isDirectClient ? requestedView : "context";
  const viewScope = resolvedView === "all" ? "ALL" : "CONTEXT";
  const data = await caller.orders.mine({ take: 50, skip: 0, viewScope });
  const agencyReadScopeLabel =
    contextState.accountType === "AGENCY"
      ? buildAgencyReadScopeLabel(
          (contextState.activeContext as ActiveContextLike | null) ?? null,
        )
      : null;

  return (
    <div>
      {/* Header */}
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-neutral-900">
            Mis Órdenes y Cotizaciones
          </h1>
          <p className="mt-1 text-sm text-neutral-500">
            {data.orders.length > 0
              ? `${data.orders.length} ${data.orders.length === 1 ? "registro" : "registros"} en tu cuenta`
              : "Aún no tienes órdenes"}
          </p>
          {agencyReadScopeLabel ? (
            <p className="mt-1 text-xs font-medium text-[#0359A8]">
              {agencyReadScopeLabel}
            </p>
          ) : null}
          {isDirectClient ? (
            <div className="mt-3 inline-flex rounded-xs border border-neutral-200 bg-white p-1">
              <Link
                href="/orders?view=all"
                className={`rounded-[2px] px-3 py-1.5 text-xs font-medium transition ${
                  resolvedView === "all"
                    ? "bg-[#0359A8] text-white"
                    : "text-neutral-600 hover:bg-neutral-100"
                }`}
              >
                Ver todo
              </Link>
              <Link
                href="/orders?view=context"
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

      {data.orders.length === 0 ? (
        /* Empty state */
        <div className="flex flex-col items-center rounded-md border border-dashed border-neutral-300 bg-white py-16 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-md bg-neutral-100">
            <PackageCheck className="h-7 w-7 text-neutral-400" />
          </div>
          <h2 className="mt-4 text-base font-semibold text-neutral-900">
            Sin órdenes registradas
          </h2>
          <p className="mt-1 max-w-sm text-sm text-neutral-500">
            Crea una solicitud de campaña o pídele a tu asesor que genere una
            cotización para ti.
          </p>
          <div className="mt-5 flex gap-2">
            <Link
              href="/campaign-requests/new"
              className="inline-flex items-center gap-2 rounded-xs bg-[#0359A8] px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-[#024a8f]"
            >
              Crear solicitud
            </Link>
          </div>
        </div>
      ) : (
        /* Order list */
        <div className="space-y-3">
          {data.orders.map((order) => {
            const config =
              STATUS_CONFIG[order.status] || STATUS_CONFIG["DRAFT"];
            const operationContextLabel = buildOperationContextLabel({
              brandName: order.brand?.name,
              actingAgencyName: order.actingAgencyOrganization?.name,
            });

            return (
              <div
                key={order.id}
                className={`group flex items-center justify-between gap-4 rounded-md border border-neutral-200/80 border-l-[3px] bg-white p-5 transition hover:border-neutral-300 hover:shadow-sm ${config.border}`}
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-mono font-medium text-neutral-400">
                      {order.code}
                    </span>
                    <Badge variant={config.variant}>{config.label}</Badge>
                    <span className="text-xs text-neutral-400">
                      · {formatDate(order.createdAt)}
                    </span>
                  </div>

                  <p className="mt-2 inline-flex items-center gap-1.5 text-xs text-neutral-600">
                    {order.actingAgencyOrganization ? (
                      <BriefcaseBusiness className="h-3.5 w-3.5 text-[#0359A8]" />
                    ) : (
                      <Building2 className="h-3.5 w-3.5 text-[#0359A8]" />
                    )}
                    {operationContextLabel}
                  </p>

                  <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1.5 text-sm">
                    <span className="inline-flex items-center font-medium text-neutral-900">
                      {formatCurrency(Number(order.total))}
                    </span>
                    <span className="inline-flex items-center gap-1.5 text-neutral-700">
                      <FileText className="h-3.5 w-3.5 text-neutral-400" />
                      {order.lineItems.length} items
                    </span>
                    <span className="inline-flex items-center gap-1.5 text-neutral-700">
                      <CalendarDays className="h-3.5 w-3.5 text-neutral-400" />
                      {formatDate(order.fromDate)} – {formatDate(order.toDate)}
                    </span>
                  </div>
                </div>

                <div className="hidden sm:block">
                  <Link
                    href={`/orders/${order.id}?view=${resolvedView}`}
                    className="inline-flex items-center gap-2 rounded-xs border border-neutral-200 bg-white px-4 py-2 text-sm font-medium text-neutral-700 transition hover:bg-neutral-50"
                  >
                    Ver detalles
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
