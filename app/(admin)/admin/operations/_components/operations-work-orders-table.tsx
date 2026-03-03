"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ChevronRight, RefreshCw, UserPlus } from "lucide-react";
import { trpc } from "@/lib/trpc/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SelectNative } from "@/components/ui/select-native";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

type WorkOrderStatus =
  | "PENDING_ASSIGNMENT"
  | "ASSIGNED"
  | "IN_PROGRESS"
  | "COMPLETED"
  | "CANCELLED";

const STATUS_OPTIONS: Array<{ value: "" | WorkOrderStatus; label: string }> = [
  { value: "", label: "Todos los estados" },
  { value: "PENDING_ASSIGNMENT", label: "Pendiente asignación" },
  { value: "ASSIGNED", label: "Asignada" },
  { value: "IN_PROGRESS", label: "En progreso" },
  { value: "COMPLETED", label: "Completada" },
  { value: "CANCELLED", label: "Cancelada" },
];

function statusLabel(status: WorkOrderStatus) {
  if (status === "PENDING_ASSIGNMENT") return "Pendiente";
  if (status === "ASSIGNED") return "Asignada";
  if (status === "IN_PROGRESS") return "En progreso";
  if (status === "COMPLETED") return "Completada";
  if (status === "CANCELLED") return "Cancelada";
  return status;
}

function statusVariant(status: WorkOrderStatus) {
  if (status === "PENDING_ASSIGNMENT") return "warning" as const;
  if (status === "ASSIGNED") return "info" as const;
  if (status === "IN_PROGRESS") return "secondary" as const;
  if (status === "COMPLETED") return "success" as const;
  return "destructive" as const;
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

export function OperationsWorkOrdersTable() {
  const utils = trpc.useUtils();
  const [status, setStatus] = useState<"" | WorkOrderStatus>("");
  const [zoneId, setZoneId] = useState("");
  const [installerId, setInstallerId] = useState("");
  const [unassignedOnly, setUnassignedOnly] = useState(false);
  const [isAssignDialogOpen, setIsAssignDialogOpen] = useState(false);
  const [selectedWorkOrderId, setSelectedWorkOrderId] = useState<string | null>(null);
  const [selectedInstallerId, setSelectedInstallerId] = useState("");
  const [assignNotes, setAssignNotes] = useState("");

  const zonesQuery = trpc.inventory.zones.publicList.useQuery();
  const installersQuery = trpc.operations.installers.list.useQuery();

  const queryInput = useMemo(
    () => ({
      status: status || undefined,
      zoneId: zoneId || undefined,
      installerId: installerId || undefined,
      unassignedOnly,
      take: 100,
    }),
    [installerId, status, unassignedOnly, zoneId]
  );

  const workOrdersQuery = trpc.operations.workOrders.list.useQuery(queryInput);

  const updateStatus = trpc.operations.workOrders.updateStatus.useMutation({
    onSuccess: async () => {
      await Promise.all([
        workOrdersQuery.refetch(),
        utils.operations.workOrders.byOrder.invalidate(),
        utils.operations.installers.list.invalidate(),
      ]);
      toast.success("Estado de OT operativa actualizado.");
    },
    onError: (error) => {
      toast.error("No se pudo actualizar el estado", {
        description: error.message,
      });
    },
  });

  const reassignManual = trpc.operations.workOrders.reassignManual.useMutation({
    onSuccess: async () => {
      await Promise.all([
        workOrdersQuery.refetch(),
        utils.operations.workOrders.byOrder.invalidate(),
        utils.operations.installers.list.invalidate(),
      ]);
      setIsAssignDialogOpen(false);
      setSelectedWorkOrderId(null);
      setSelectedInstallerId("");
      setAssignNotes("");
      toast.success("OT operativa reasignada.");
    },
    onError: (error) => {
      toast.error("No se pudo reasignar la OT", {
        description: error.message,
      });
    },
  });

  const retryAutoAssign = trpc.operations.workOrders.retryAutoAssign.useMutation({
    onSuccess: async () => {
      await Promise.all([
        workOrdersQuery.refetch(),
        utils.operations.workOrders.byOrder.invalidate(),
        utils.operations.installers.list.invalidate(),
      ]);
      toast.success("Reintento de autoasignación ejecutado.");
    },
    onError: (error) => {
      toast.error("No se pudo reintentar autoasignación", {
        description: error.message,
      });
    },
  });

  const workOrders = useMemo(() => workOrdersQuery.data?.workOrders ?? [], [workOrdersQuery.data]);
  const isLoading = workOrdersQuery.isLoading || workOrdersQuery.isRefetching;
  const selectedWorkOrder = useMemo(
    () => workOrders.find((workOrder) => workOrder.id === selectedWorkOrderId) ?? null,
    [selectedWorkOrderId, workOrders]
  );

  function openAssignDialog(workOrder: (typeof workOrders)[number]) {
    setSelectedWorkOrderId(workOrder.id);
    setSelectedInstallerId(workOrder.assignedInstallerId ?? "");
    setAssignNotes("");
    setIsAssignDialogOpen(true);
  }

  return (
    <>
      <div className="space-y-4">
      <div className="grid gap-3 rounded-xl border border-neutral-200 bg-white p-4 md:grid-cols-4">
        <div>
          <label className="mb-1 block text-xs font-medium text-neutral-600">Estado</label>
          <SelectNative value={status} onChange={(event) => setStatus(event.target.value as "" | WorkOrderStatus)}>
            {STATUS_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </SelectNative>
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-neutral-600">Zona</label>
          <SelectNative value={zoneId} onChange={(event) => setZoneId(event.target.value)}>
            <option value="">Todas las zonas</option>
            {(zonesQuery.data ?? []).map((zone) => (
              <option key={zone.id} value={zone.id}>
                {zone.province.name} - {zone.name}
              </option>
            ))}
          </SelectNative>
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-neutral-600">Instalador</label>
          <SelectNative value={installerId} onChange={(event) => setInstallerId(event.target.value)}>
            <option value="">Todos</option>
            {(installersQuery.data ?? []).map((installer) => (
              <option key={installer.id} value={installer.id}>
                {installer.user.name || installer.user.email}
              </option>
            ))}
          </SelectNative>
        </div>

        <ToggleFilter label="Solo sin asignar" checked={unassignedOnly} onChange={setUnassignedOnly} />
      </div>

      <Card>
        {isLoading ? (
          <div className="flex h-40 items-center justify-center">
            <RefreshCw className="h-5 w-5 animate-spin text-neutral-400" />
          </div>
        ) : workOrders.length === 0 ? (
          <div className="p-8 text-center text-sm text-neutral-500">
            No hay OTs operativas para los filtros actuales.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-neutral-200 bg-neutral-50">
                <tr>
                  <th className="px-4 py-3 font-medium text-neutral-500">Orden / Cara</th>
                  <th className="px-4 py-3 font-medium text-neutral-500">Zona</th>
                  <th className="px-4 py-3 font-medium text-neutral-500">Estado</th>
                  <th className="px-4 py-3 font-medium text-neutral-500">Instalador</th>
                  <th className="px-4 py-3 font-medium text-neutral-500">Actualizado</th>
                  <th className="px-4 py-3 font-medium text-right text-neutral-500">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {workOrders.map((workOrder) => {
                  const isClosed =
                    workOrder.status === "COMPLETED" || workOrder.status === "CANCELLED";

                  return (
                    <tr key={workOrder.id} className="hover:bg-neutral-50/70">
                      <td className="px-4 py-3">
                        <div className="font-mono text-xs font-semibold text-neutral-900">
                          {workOrder.order.code}
                        </div>
                        <div className="text-xs text-neutral-500">
                          Cara {workOrder.face.code}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-sm text-neutral-900">{workOrder.zone.name}</div>
                        <div className="text-xs text-neutral-500">{workOrder.zone.province.name}</div>
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={statusVariant(workOrder.status)}>
                          {statusLabel(workOrder.status)}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-xs text-neutral-700">
                          {workOrder.assignedInstaller
                            ? workOrder.assignedInstaller.user.name ||
                              workOrder.assignedInstaller.user.email
                            : "Sin asignar"}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-xs text-neutral-500">
                        {formatDateTime(workOrder.updatedAt)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-2">
                          <SelectNative
                            value={workOrder.status}
                            onChange={(event) =>
                              updateStatus.mutate({
                                workOrderId: workOrder.id,
                                status: event.target.value as WorkOrderStatus,
                              })
                            }
                            disabled={updateStatus.isPending || isClosed}
                            className="h-8 min-w-[160px] rounded-md px-2 text-xs"
                          >
                            {STATUS_OPTIONS.filter((option) => option.value).map((option) => (
                              <option key={option.value} value={option.value}>
                                {option.label}
                              </option>
                            ))}
                          </SelectNative>

                          <Button
                            size="icon-sm"
                            variant="outline"
                            className="h-8 w-8"
                            onClick={() => openAssignDialog(workOrder)}
                            disabled={isClosed}
                            title={workOrder.assignedInstallerId ? "Reasignar instalador" : "Asignar instalador"}
                          >
                            <UserPlus className="h-4 w-4" />
                          </Button>

                          <Button
                            size="sm"
                            variant="outline"
                            className="h-8 px-2 text-xs"
                            onClick={() => retryAutoAssign.mutate({ workOrderId: workOrder.id })}
                            disabled={
                              retryAutoAssign.isPending || Boolean(workOrder.assignedInstallerId) || isClosed
                            }
                          >
                            Reintentar auto
                          </Button>

                          <Link
                            href={`/admin/orders/${workOrder.orderId}`}
                            className="inline-flex h-8 items-center rounded-md border border-neutral-200 px-2 text-xs text-neutral-700 hover:bg-neutral-100"
                          >
                            Orden
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

      <Dialog open={isAssignDialogOpen} onOpenChange={setIsAssignDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {selectedWorkOrder?.assignedInstallerId ? "Reasignar instalador" : "Asignar instalador"}
            </DialogTitle>
            <DialogDescription>
              {selectedWorkOrder
                ? `Orden ${selectedWorkOrder.order.code} · Cara ${selectedWorkOrder.face.code}`
                : "Selecciona el instalador para esta OT operativa."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <div>
              <Label className="mb-1 block">Instalador</Label>
              <SelectNative
                value={selectedInstallerId}
                onChange={(event) => setSelectedInstallerId(event.target.value)}
              >
                <option value="">Seleccionar instalador</option>
                {(installersQuery.data ?? []).map((installer) => (
                  <option key={installer.id} value={installer.id}>
                    {installer.user.name || installer.user.email}
                  </option>
                ))}
              </SelectNative>
            </div>

            <div>
              <Label htmlFor="assign-notes" className="mb-1 block">
                Notas (opcional)
              </Label>
              <Textarea
                id="assign-notes"
                rows={3}
                value={assignNotes}
                onChange={(event) => setAssignNotes(event.target.value)}
                placeholder="Motivo o contexto de la asignación"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setIsAssignDialogOpen(false);
                setSelectedWorkOrderId(null);
                setSelectedInstallerId("");
                setAssignNotes("");
              }}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={() => {
                if (!selectedWorkOrderId || !selectedInstallerId) return;
                reassignManual.mutate({
                  workOrderId: selectedWorkOrderId,
                  installerId: selectedInstallerId,
                  notes: assignNotes.trim() || undefined,
                });
              }}
              disabled={
                reassignManual.isPending ||
                !selectedWorkOrderId ||
                !selectedInstallerId ||
                selectedInstallerId === selectedWorkOrder?.assignedInstallerId
              }
            >
              {selectedWorkOrder?.assignedInstallerId ? "Guardar reasignación" : "Guardar asignación"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
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
