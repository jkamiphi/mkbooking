"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { ChevronRight, FileSearch } from "lucide-react";

import { trpc } from "@/lib/trpc/client";
import {
  countActiveFilters,
  parseFilterState,
  serializeFilterState,
  toSummaryChips,
} from "@/lib/navigation/filter-state";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  FilterSheetPanel,
  FilterSheetSection,
  FilterSheetToolbar,
  FilterSheetTriggerButton,
} from "@/components/ui/filter-sheet";
import { Sheet, SheetTrigger } from "@/components/ui/sheet";

const statusOptions = [
  "NEW",
  "IN_REVIEW",
  "QUOTATION_GENERATED",
  "PROPOSAL_SENT",
  "CONFIRMED",
  "REJECTED",
] as const;
type RequestStatus = (typeof statusOptions)[number];

function statusLabel(status: string) {
    if (status === "NEW") return "Nueva";
    if (status === "IN_REVIEW") return "En revisión";
    if (status === "QUOTATION_GENERATED") return "Cotización Generada";
    if (status === "PROPOSAL_SENT") return "Propuesta enviada";
    if (status === "CONFIRMED") return "Confirmada";
    if (status === "REJECTED") return "Rechazada";
    return status;
}

function statusBadgeVariant(status: string) {
    if (status === "NEW") return "info" as const;
    if (status === "IN_REVIEW") return "warning" as const;
    if (status === "QUOTATION_GENERATED") return "warning" as const;
    if (status === "PROPOSAL_SENT") return "secondary" as const;
    if (status === "CONFIRMED") return "success" as const;
    return "destructive" as const;
}

function requestSummary(request: {
  quantity: number;
  structureType?: { name: string } | null;
  zone?: { name: string; province: { name: string } } | null;
}) {
    const parts = [
        `${request.quantity} cara${request.quantity === 1 ? "" : "s"}`,
        request.structureType?.name || "Cualquier tipo",
        request.zone ? `${request.zone.name}, ${request.zone.province.name}` : "Cualquier zona",
    ];
    return parts.join(" · ");
}

export function AdminRequestsTable() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const parsedFilters = parseFilterState(searchParams, ["status"] as const);
  const appliedStatus = parsedFilters.status ?? "";
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);
  const [draftStatus, setDraftStatus] = useState(appliedStatus);

  useEffect(() => {
    setDraftStatus(appliedStatus);
  }, [appliedStatus]);

  const { data, isLoading } = trpc.catalog.requests.list.useQuery({
    status: appliedStatus ? (appliedStatus as RequestStatus) : undefined,
    take: 50,
  });

  const activeCount = countActiveFilters({
    status: appliedStatus || undefined,
  });

  const summaryChips = useMemo(
    () =>
      toSummaryChips(
        { status: appliedStatus },
        [
          {
            key: "status",
            isActive: (state) => Boolean(state.status),
            getLabel: (state) => `Estado: ${statusLabel(state.status)}`,
          },
        ],
      ).map((chip) => ({
        ...chip,
        onRemove: () => {
          router.push(pathname);
        },
      })),
    [appliedStatus, pathname, router],
  );

  function navigateWithStatus(nextStatus: string) {
    const params = serializeFilterState({
      status: nextStatus || undefined,
    });
    const nextUrl = params.toString() ? `${pathname}?${params.toString()}` : pathname;
    router.push(nextUrl);
  }

  function applyFilters() {
    navigateWithStatus(draftStatus);
    setIsFiltersOpen(false);
  }

  function clearFilters() {
    setDraftStatus("");
    router.push(pathname);
    setIsFiltersOpen(false);
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <p className="pt-2 text-sm text-neutral-500">
          {data ? `${data.requests.length} solicitudes encontradas` : "Cargando solicitudes..."}
        </p>

        <Sheet open={isFiltersOpen} onOpenChange={setIsFiltersOpen}>
          <FilterSheetToolbar
            summaryChips={summaryChips}
            onClearAll={activeCount > 0 ? clearFilters : undefined}
            className="sm:items-end"
          >
            <SheetTrigger asChild>
              <FilterSheetTriggerButton activeCount={activeCount} />
            </SheetTrigger>
          </FilterSheetToolbar>

          <FilterSheetPanel
            title="Filtrar solicitudes"
            description="Ajusta los filtros para encontrar solicitudes específicas."
            onApply={applyFilters}
            onClear={clearFilters}
          >
            <FilterSheetSection title="Estado" description="Refina por etapa comercial actual.">
              <div className="space-y-2">
                <button
                  type="button"
                  onClick={() => setDraftStatus("")}
                  className={`block w-full rounded-xl border px-4 py-3 text-left text-sm transition ${
                    draftStatus === ""
                      ? "border-[#0359A8] bg-[#0359A8]/6 font-medium text-[#0359A8]"
                      : "border-neutral-200 bg-white text-neutral-600 hover:border-neutral-300 hover:bg-neutral-50"
                  }`}
                >
                  Todos los estados
                </button>
                {statusOptions.map((status) => (
                  <button
                    key={status}
                    type="button"
                    onClick={() => setDraftStatus(status)}
                    className={`block w-full rounded-xl border px-4 py-3 text-left text-sm transition ${
                      draftStatus === status
                        ? "border-[#0359A8] bg-[#0359A8]/6 font-medium text-[#0359A8]"
                        : "border-neutral-200 bg-white text-neutral-600 hover:border-neutral-300 hover:bg-neutral-50"
                    }`}
                  >
                    {statusLabel(status)}
                  </button>
                ))}
              </div>
            </FilterSheetSection>
          </FilterSheetPanel>
        </Sheet>
      </div>

      <Card>
        {isLoading ? (
          <div className="flex h-64 items-center justify-center">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-neutral-300 border-t-[#0359A8]" />
          </div>
        ) : !data || data.requests.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <FileSearch className="mb-4 h-10 w-10 text-neutral-300" />
            <h3 className="text-base font-medium text-neutral-900">
              No se encontraron solicitudes
            </h3>
            <p className="mt-1 text-sm text-neutral-500">
              Prueba cambiando los filtros de búsqueda.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-neutral-100 bg-neutral-50/50 text-neutral-500">
                <tr>
                  <th className="px-5 py-3 font-medium">ID Corto</th>
                  <th className="px-5 py-3 font-medium">Cliente/Contacto</th>
                  <th className="px-5 py-3 font-medium">Requerimiento</th>
                  <th className="px-5 py-3 font-medium">Fecha de Solicitud</th>
                  <th className="px-5 py-3 font-medium">Estado</th>
                  <th className="px-5 py-3 font-medium text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {data.requests.map((request) => (
                  <tr
                    key={request.id}
                    className="group transition hover:bg-neutral-50/50"
                  >
                    <td className="px-5 py-4">
                      <span className="font-mono text-xs font-medium text-neutral-500">
                        {request.id.slice(0, 8).toUpperCase()}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <span className="block font-medium text-neutral-900">
                        {request.createdBy?.user?.name || "Usuario no registrado"}
                      </span>
                      <span className="block text-xs text-neutral-500">
                        {request.createdBy?.user?.email || request.contactEmail}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <span className="block text-neutral-700">
                        {requestSummary(request)}
                      </span>
                      <span className="mt-1 flex items-center gap-1.5 text-xs text-neutral-400">
                        {request.fromDate && request.toDate
                          ? `${format(new Date(request.fromDate), "dd MMM yyyy", { locale: es })} - ${format(new Date(request.toDate), "dd MMM yyyy", { locale: es })}`
                          : "Fechas no definidas"}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-neutral-600">
                      {format(new Date(request.createdAt), "dd MMM, yyyy HH:mm", { locale: es })}
                    </td>
                    <td className="px-5 py-4">
                      <Badge variant={statusBadgeVariant(request.status)}>
                        {statusLabel(request.status)}
                      </Badge>
                    </td>
                    <td className="px-5 py-4 text-right">
                      <Link
                        href={`/admin/requests/${request.id}`}
                        className="inline-flex items-center justify-center rounded-lg p-2 text-neutral-400 transition hover:bg-neutral-100 hover:text-neutral-900"
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
