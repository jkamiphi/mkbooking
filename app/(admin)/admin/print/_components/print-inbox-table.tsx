"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Check, ChevronRight, RefreshCw } from "lucide-react";
import { trpc } from "@/lib/trpc/client";
import { countActiveFilters, toSummaryChips } from "@/lib/navigation/filter-state";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  FilterSheetPanel,
  FilterSheetSection,
  FilterSheetToolbar,
  FilterSheetTriggerButton,
} from "@/components/ui/filter-sheet";
import { SelectNative } from "@/components/ui/select-native";
import { Sheet, SheetTrigger } from "@/components/ui/sheet";
import { toast } from "sonner";

const statusOptions = [
  { value: "", label: "Todos los estados" },
  { value: "READY", label: "Lista" },
  { value: "IN_PROGRESS", label: "En progreso" },
] as const;

function statusLabel(status: string) {
  if (status === "READY") return "Lista";
  if (status === "IN_PROGRESS") return "En progreso";
  if (status === "COMPLETED") return "Completada";
  return status;
}

function statusVariant(status: string) {
  if (status === "READY") return "warning" as const;
  if (status === "IN_PROGRESS") return "info" as const;
  if (status === "COMPLETED") return "success" as const;
  return "secondary" as const;
}

function formatDateTime(value: Date | string | null | undefined) {
  if (!value) return "N/D";
  return new Date(value).toLocaleString("es-PA", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function PrintInboxTable() {
  const utils = trpc.useUtils();
  const [status, setStatus] = useState<string>("");
  const [mineOnly, setMineOnly] = useState(false);
  const [unassignedOnly, setUnassignedOnly] = useState(false);
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);
  const [draftStatus, setDraftStatus] = useState("");
  const [draftMineOnly, setDraftMineOnly] = useState(false);
  const [draftUnassignedOnly, setDraftUnassignedOnly] = useState(false);

  const queryInput = useMemo(
    () => ({
      status: status ? (status as "READY" | "IN_PROGRESS") : undefined,
      mineOnly,
      unassignedOnly,
      take: 100,
    }),
    [mineOnly, status, unassignedOnly]
  );

  const inboxQuery = trpc.print.inbox.list.useQuery(queryInput);
  const claimTask = trpc.print.inbox.claim.useMutation({
    onSuccess: async () => {
      await inboxQuery.refetch();
      await utils.print.byOrder.invalidate();
      toast.success("Tarea tomada correctamente.");
    },
    onError: (error) => {
      toast.error("No se pudo tomar la tarea", {
        description: error.message,
      });
    },
  });

  const updateStatus = trpc.print.inbox.updateStatus.useMutation({
    onSuccess: async () => {
      await inboxQuery.refetch();
      await utils.print.byOrder.invalidate();
      toast.success("Estado de tarea actualizado.");
    },
    onError: (error) => {
      toast.error("No se pudo actualizar el estado", {
        description: error.message,
      });
    },
  });

  const tasks = inboxQuery.data?.tasks ?? [];
  const loading = inboxQuery.isLoading || inboxQuery.isRefetching;

  const activeCount = countActiveFilters({
    status: status || undefined,
    mineOnly: mineOnly ? true : undefined,
    unassignedOnly: unassignedOnly ? true : undefined,
  });

  const summaryChips = useMemo(
    () =>
      toSummaryChips(
        { status, mineOnly, unassignedOnly },
        [
          {
            key: "status",
            isActive: (state) => Boolean(state.status),
            getLabel: (state) => `Estado: ${statusLabel(state.status)}`,
          },
          {
            key: "mineOnly",
            isActive: (state) => state.mineOnly,
            getLabel: () => "Solo mías",
          },
          {
            key: "unassignedOnly",
            isActive: (state) => state.unassignedOnly,
            getLabel: () => "No asignadas",
          },
        ],
      ).map((chip) => ({
        ...chip,
        onRemove: () => {
          if (chip.key === "status") setStatus("");
          if (chip.key === "mineOnly") setMineOnly(false);
          if (chip.key === "unassignedOnly") setUnassignedOnly(false);
        },
      })),
    [mineOnly, status, unassignedOnly],
  );

  function openFilters() {
    setDraftStatus(status);
    setDraftMineOnly(mineOnly);
    setDraftUnassignedOnly(unassignedOnly);
    setIsFiltersOpen(true);
  }

  function applyFilters() {
    setStatus(draftStatus);
    setMineOnly(draftMineOnly);
    setUnassignedOnly(draftUnassignedOnly);
    setIsFiltersOpen(false);
  }

  function clearFilters() {
    setDraftStatus("");
    setDraftMineOnly(false);
    setDraftUnassignedOnly(false);
    setStatus("");
    setMineOnly(false);
    setUnassignedOnly(false);
    setIsFiltersOpen(false);
  }

  return (
    <div className="space-y-4">
      <Sheet
        open={isFiltersOpen}
        onOpenChange={(open) => {
          if (open) {
            openFilters();
            return;
          }
          setIsFiltersOpen(false);
        }}
      >
        <FilterSheetToolbar
          summaryChips={summaryChips}
          onClearAll={activeCount > 0 ? clearFilters : undefined}
        >
          <SheetTrigger asChild>
            <FilterSheetTriggerButton activeCount={activeCount} />
          </SheetTrigger>
        </FilterSheetToolbar>

        <FilterSheetPanel
          title="Filtrar bandeja de impresión"
          description="Refina por estado y asignación antes de actualizar la bandeja."
          onApply={applyFilters}
          onClear={clearFilters}
        >
          <FilterSheetSection title="Estado">
            <SelectNative value={draftStatus} onChange={(event) => setDraftStatus(event.target.value)}>
              {statusOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </SelectNative>
          </FilterSheetSection>
          <FilterSheetSection title="Asignación">
            <div className="space-y-3">
              <ToggleFilter label="Solo mías" checked={draftMineOnly} onChange={setDraftMineOnly} />
              <ToggleFilter label="No asignadas" checked={draftUnassignedOnly} onChange={setDraftUnassignedOnly} />
            </div>
          </FilterSheetSection>
        </FilterSheetPanel>
      </Sheet>

      <Card>
        {loading ? (
          <div className="flex h-40 items-center justify-center">
            <RefreshCw className="h-5 w-5 animate-spin text-neutral-400" />
          </div>
        ) : tasks.length === 0 ? (
          <div className="p-8 text-center text-sm text-neutral-500">
            No hay tareas de impresión para los filtros actuales.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-neutral-200 bg-neutral-50">
                <tr>
                  <th className="px-4 py-3 font-medium text-neutral-500">Orden</th>
                  <th className="px-4 py-3 font-medium text-neutral-500">Cliente</th>
                  <th className="px-4 py-3 font-medium text-neutral-500">Estado</th>
                  <th className="px-4 py-3 font-medium text-neutral-500">Responsable</th>
                  <th className="px-4 py-3 font-medium text-right text-neutral-500">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {tasks.map((task) => {
                  const isBlockedByDesign = task.isBlockedByDesign;

                  return (
                    <tr key={task.id} className="hover:bg-neutral-50/70">
                      <td className="px-4 py-3">
                        <div className="font-mono text-xs font-semibold text-neutral-900">
                          {task.order.code}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-sm font-medium text-neutral-900">
                          {task.order.brand?.name || task.order.clientName || "Sin cliente"}
                        </div>
                        <div className="text-xs text-neutral-500">
                          {task.order.clientEmail || "Sin email"}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <Badge variant={statusVariant(task.status)}>{statusLabel(task.status)}</Badge>
                          {isBlockedByDesign ? <Badge variant="warning">Bloqueada por Diseño</Badge> : null}
                        </div>
                        <div className="mt-1 text-[11px] text-neutral-500">
                          Activada: {formatDateTime(task.createdAt)}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-xs text-neutral-700">
                        {task.assignedTo
                          ? task.assignedTo.user?.name || task.assignedTo.user?.email || "Asignado"
                          : "Sin asignar"}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-2">
                          {!task.assignedToId ? (
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 px-2 text-xs"
                              onClick={() => claimTask.mutate({ taskId: task.id })}
                              disabled={claimTask.isPending || isBlockedByDesign}
                            >
                              <Check className="mr-1 h-3.5 w-3.5" />
                              Tomar
                            </Button>
                          ) : null}
                          <SelectNative
                            value={task.status}
                            onChange={(event) =>
                              updateStatus.mutate({
                                taskId: task.id,
                                status: event.target.value as "READY" | "IN_PROGRESS",
                              })
                            }
                            disabled={updateStatus.isPending || isBlockedByDesign}
                            className="h-7 min-w-[140px] rounded-md px-2 text-xs"
                          >
                            {statusOptions
                              .filter((option) => option.value.length > 0)
                              .map((option) => (
                                <option key={option.value} value={option.value}>
                                  {option.label}
                                </option>
                              ))}
                          </SelectNative>
                          <Link
                            href={`/admin/print/${task.order.id}`}
                            className="inline-flex h-7 items-center rounded-md border border-neutral-200 px-2 text-xs text-neutral-700 hover:bg-neutral-100"
                          >
                            Ver
                            <ChevronRight className="ml-1 h-3.5 w-3.5" />
                          </Link>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}

function ToggleFilter({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (next: boolean) => void;
}) {
  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-neutral-600">{label}</label>
      <button
        type="button"
        onClick={() => onChange(!checked)}
        className={`h-10 w-full rounded-lg border px-3 text-left text-sm transition ${
          checked
            ? "border-[#0359A8] bg-[#0359A8]/5 text-[#0359A8]"
            : "border-neutral-200 bg-white text-neutral-600 hover:bg-neutral-50"
        }`}
      >
        {checked ? "Activo" : "Inactivo"}
      </button>
    </div>
  );
}
