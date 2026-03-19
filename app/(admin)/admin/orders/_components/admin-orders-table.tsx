"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ChevronRight, FileText, PackageSearch, RefreshCw } from "lucide-react";
import { Card } from "@/components/ui/card";
import { trpc } from "@/lib/trpc/client";
import { Badge } from "@/components/ui/badge";
import {
  countActiveFilters,
  parseFilterState,
  serializeFilterState,
  toSummaryChips,
} from "@/lib/navigation/filter-state";
import {
  FilterSheetPanel,
  FilterSheetSection,
  FilterSheetToolbar,
  FilterSheetTriggerButton,
} from "@/components/ui/filter-sheet";
import { Sheet, SheetTrigger } from "@/components/ui/sheet";

export function AdminOrdersTable() {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const parsedFilters = parseFilterState(searchParams, ["status"] as const);
    const appliedStatus = parsedFilters.status ?? "";
    const [isFiltersOpen, setIsFiltersOpen] = useState(false);
    const [draftStatus, setDraftStatus] = useState(appliedStatus);

    const statusOptions = [
        "DRAFT",
        "QUOTATION_SENT",
        "CLIENT_APPROVED",
        "CONFIRMED",
        "CANCELLED",
    ] as const;
    type OrderStatus = (typeof statusOptions)[number];

    useEffect(() => {
        setDraftStatus(appliedStatus);
    }, [appliedStatus]);

    const { data, isLoading } = trpc.orders.list.useQuery({
        status: appliedStatus ? (appliedStatus as OrderStatus) : undefined,
        take: 50,
    });

    function statusLabel(status: string) {
        if (status === "DRAFT") return "Borrador";
        if (status === "QUOTATION_SENT") return "Enviada al Cliente";
        if (status === "CLIENT_APPROVED") return "Aprobada por Cliente";
        if (status === "CONFIRMED") return "Confirmada";
        if (status === "CANCELLED") return "Cancelada";
        return status;
    }

    function statusVariant(status: string) {
        if (status === "DRAFT") return "info" as const;
        if (status === "QUOTATION_SENT") return "warning" as const;
        if (status === "CLIENT_APPROVED") return "secondary" as const;
        if (status === "CONFIRMED") return "success" as const;
        return "destructive" as const;
    }

    function formatCurrency(value: string | number) {
        return new Intl.NumberFormat("es-PA", {
            style: "currency",
            currency: "USD",
        }).format(Number(value));
    }

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
                    {data ? `${data.orders.length} órdenes encontradas` : "Cargando órdenes..."}
                </p>

                <Sheet open={isFiltersOpen} onOpenChange={setIsFiltersOpen}>
                    <FilterSheetToolbar
                        summaryChips={summaryChips}
                        onClearAll={activeCount > 0 ? clearFilters : undefined}
                    >
                        <SheetTrigger asChild>
                            <FilterSheetTriggerButton activeCount={activeCount} />
                        </SheetTrigger>
                    </FilterSheetToolbar>

                    <FilterSheetPanel
                        title="Filtrar órdenes"
                        description="Refina la bandeja por estado comercial."
                        onApply={applyFilters}
                        onClear={clearFilters}
                    >
                        <FilterSheetSection
                            title="Estado"
                            description="Muestra únicamente las órdenes en la etapa seleccionada."
                        >
                            <div className="space-y-2">
                                <button
                                    type="button"
                                    onClick={() => setDraftStatus("")}
                                    className={`block w-full rounded-xl border px-4 py-3 text-left text-sm transition ${draftStatus === ""
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
                                        className={`block w-full rounded-xl border px-4 py-3 text-left text-sm transition ${draftStatus === status
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
                        <RefreshCw className="h-6 w-6 animate-spin text-neutral-300" />
                    </div>
                ) : !data || data.orders.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 text-center">
                        <PackageSearch className="mb-4 h-10 w-10 text-neutral-300" />
                        <h3 className="text-base font-medium text-neutral-900">
                            No se encontraron órdenes
                        </h3>
                        <p className="mt-1 text-sm text-neutral-500">
                            Prueba cambiar los filtros de búsqueda.
                        </p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead className="border-b border-neutral-100 bg-neutral-50/50 text-neutral-500">
                                <tr>
                                    <th className="px-5 py-3 font-medium">Código</th>
                                    <th className="px-5 py-3 font-medium">Cliente</th>
                                    <th className="px-5 py-3 font-medium">Cant. Items</th>
                                    <th className="px-5 py-3 font-medium">Total</th>
                                    <th className="px-5 py-3 font-medium">Estado</th>
                                    <th className="px-5 py-3 font-medium text-right">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-neutral-100">
                                {data.orders.map((order) => (
                                    <tr
                                        key={order.id}
                                        className="group transition hover:bg-neutral-50/50"
                                    >
                                        <td className="px-5 py-4">
                                            <span className="font-mono font-medium text-neutral-900">
                                                {order.code}
                                            </span>
                                        </td>
                                        <td className="px-5 py-4">
                                            <span className="block font-medium text-neutral-900">
                                                {order.brand?.name || order.clientName || "Sin cliente"}
                                            </span>
                                        </td>
                                        <td className="px-5 py-4 text-neutral-600">
                                            <div className="flex items-center gap-1.5">
                                                <FileText className="h-4 w-4 text-neutral-400" />
                                                {order.lineItems.length}
                                            </div>
                                        </td>
                                        <td className="px-5 py-4 font-medium text-neutral-900">
                                            {formatCurrency(String(order.total))}
                                        </td>
                                        <td className="px-5 py-4">
                                            <Badge variant={statusVariant(order.status)}>
                                                {statusLabel(order.status)}
                                            </Badge>
                                        </td>
                                        <td className="px-5 py-4 text-right">
                                            <Link
                                                href={`/admin/orders/${order.id}`}
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
