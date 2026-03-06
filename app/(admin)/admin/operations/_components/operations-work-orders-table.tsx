"use client";

import type { ReactNode } from "react";
import { useMemo, useState } from "react";
import Link from "next/link";
import {
  CheckCircle2,
  ChevronRight,
  Clock3,
  Eye,
  MapPin,
  RefreshCw,
  RotateCcw,
  Search,
  ShieldAlert,
  ShieldCheck,
  TriangleAlert,
  UserPlus,
} from "lucide-react";
import { trpc } from "@/lib/trpc/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";

type OperationsView = "ACTIVE" | "REVIEW" | "HISTORY";
type WorkOrderStatus =
  | "PENDING_ASSIGNMENT"
  | "ASSIGNED"
  | "IN_PROGRESS"
  | "PENDING_REVIEW"
  | "REOPENED"
  | "COMPLETED"
  | "CANCELLED";

const HISTORY_STATUS_OPTIONS: Array<{ value: "" | WorkOrderStatus; label: string }> = [
  { value: "", label: "Todos los resultados" },
  { value: "COMPLETED", label: "Completadas" },
  { value: "CANCELLED", label: "Canceladas" },
];

function statusLabel(status: WorkOrderStatus) {
  if (status === "PENDING_ASSIGNMENT") return "Pendiente";
  if (status === "ASSIGNED") return "Asignada";
  if (status === "IN_PROGRESS") return "En progreso";
  if (status === "PENDING_REVIEW") return "Por revisar";
  if (status === "REOPENED") return "Reabierta";
  if (status === "COMPLETED") return "Completada";
  return "Cancelada";
}

function statusVariant(status: WorkOrderStatus) {
  if (status === "PENDING_ASSIGNMENT") return "warning" as const;
  if (status === "ASSIGNED") return "info" as const;
  if (status === "IN_PROGRESS") return "secondary" as const;
  if (status === "PENDING_REVIEW") return "warning" as const;
  if (status === "REOPENED") return "destructive" as const;
  if (status === "COMPLETED") return "success" as const;
  return "secondary" as const;
}

function eventLabel(eventType: string) {
  if (eventType === "WORK_ORDER_CREATED") return "OT creada";
  if (eventType === "AUTO_ASSIGNED") return "Autoasignada";
  if (eventType === "AUTO_ASSIGNMENT_SKIPPED") return "Autoasignacion omitida";
  if (eventType === "MANUAL_REASSIGNED") return "Reasignacion manual";
  if (eventType === "STATUS_CHANGED") return "Cambio de estado";
  if (eventType === "SUBMITTED_FOR_REVIEW") return "Enviada a revision";
  if (eventType === "REVIEW_APPROVED") return "Revision aprobada";
  if (eventType === "REOPENED_FOR_REWORK") return "Reabierta";
  if (eventType === "CANCELLED_BY_PRINT_REOPEN") return "Cancelada por impresion";
  if (eventType === "AUTO_ASSIGNMENT_RETRIED") return "Reintento de autoasignacion";
  return eventType;
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
  const [view, setView] = useState<OperationsView>("ACTIVE");
  const [search, setSearch] = useState("");
  const [zoneId, setZoneId] = useState("");
  const [installerId, setInstallerId] = useState("");
  const [unassignedOnly, setUnassignedOnly] = useState(false);
  const [historyStatus, setHistoryStatus] = useState<"" | WorkOrderStatus>("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [selectedWorkOrderId, setSelectedWorkOrderId] = useState<string | null>(null);
  const [assignWorkOrderId, setAssignWorkOrderId] = useState<string | null>(null);
  const [selectedInstallerId, setSelectedInstallerId] = useState("");
  const [assignNotes, setAssignNotes] = useState("");
  const [reviewNotes, setReviewNotes] = useState("");
  const [reopenReason, setReopenReason] = useState("");

  const zonesQuery = trpc.inventory.zones.publicList.useQuery();
  const installersQuery = trpc.operations.installers.list.useQuery();

  const queryInput = useMemo(
    () => ({
      view,
      status: view === "HISTORY" ? historyStatus || undefined : undefined,
      zoneId: zoneId || undefined,
      installerId: installerId || undefined,
      unassignedOnly: view === "ACTIVE" ? unassignedOnly : undefined,
      search: search.trim() || undefined,
      dateFrom: view === "HISTORY" && dateFrom ? new Date(dateFrom) : undefined,
      dateTo: view === "HISTORY" && dateTo ? new Date(dateTo) : undefined,
      take: 100,
    }),
    [dateFrom, dateTo, historyStatus, installerId, search, unassignedOnly, view, zoneId]
  );

  const workOrdersQuery = trpc.operations.workOrders.list.useQuery(queryInput);
  const detailQuery = trpc.operations.workOrders.getDetail.useQuery(
    { workOrderId: selectedWorkOrderId ?? "" },
    { enabled: Boolean(selectedWorkOrderId) }
  );

  const reassignManual = trpc.operations.workOrders.reassignManual.useMutation({
    onSuccess: async () => {
      await Promise.all([
        workOrdersQuery.refetch(),
        selectedWorkOrderId ? detailQuery.refetch() : Promise.resolve(),
        utils.operations.installers.list.invalidate(),
      ]);
      setAssignWorkOrderId(null);
      setSelectedInstallerId("");
      setAssignNotes("");
      toast.success("OT operativa asignada.");
    },
    onError: (error) => {
      toast.error("No se pudo asignar la OT", {
        description: error.message,
      });
    },
  });

  const retryAutoAssign = trpc.operations.workOrders.retryAutoAssign.useMutation({
    onSuccess: async () => {
      await Promise.all([
        workOrdersQuery.refetch(),
        selectedWorkOrderId ? detailQuery.refetch() : Promise.resolve(),
        utils.operations.installers.list.invalidate(),
      ]);
      toast.success("Reintento de autoasignacion ejecutado.");
    },
    onError: (error) => {
      toast.error("No se pudo reintentar autoasignacion", {
        description: error.message,
      });
    },
  });

  const approveReview = trpc.operations.workOrders.approveReview.useMutation({
    onSuccess: async () => {
      await Promise.all([workOrdersQuery.refetch(), utils.operations.workOrders.getDetail.invalidate()]);
      setSelectedWorkOrderId(null);
      setReviewNotes("");
      toast.success("Revision aprobada.");
    },
    onError: (error) => {
      toast.error("No se pudo aprobar la revision", {
        description: error.message,
      });
    },
  });

  const reopenForRework = trpc.operations.workOrders.reopenForRework.useMutation({
    onSuccess: async () => {
      await Promise.all([workOrdersQuery.refetch(), utils.operations.workOrders.getDetail.invalidate()]);
      setSelectedWorkOrderId(null);
      setReopenReason("");
      toast.success("OT reabierta para retrabajo.");
    },
    onError: (error) => {
      toast.error("No se pudo reabrir la OT", {
        description: error.message,
      });
    },
  });

  const workOrders = useMemo(() => workOrdersQuery.data?.workOrders ?? [], [workOrdersQuery.data]);
  const summary = workOrdersQuery.data?.summary;
  const isLoading = workOrdersQuery.isLoading || workOrdersQuery.isRefetching;
  const selectedWorkOrder = useMemo(
    () => workOrders.find((workOrder) => workOrder.id === assignWorkOrderId) ?? null,
    [assignWorkOrderId, workOrders]
  );

  function openAssignDialog(workOrderId: string) {
    const workOrder = workOrders.find((item) => item.id === workOrderId);
    setAssignWorkOrderId(workOrderId);
    setSelectedInstallerId(workOrder?.assignedInstallerId ?? "");
    setAssignNotes("");
  }

  function openDetail(workOrderId: string) {
    setSelectedWorkOrderId(workOrderId);
    setReviewNotes("");
    setReopenReason("");
  }

  return (
    <>
      <div className="space-y-4">
        <Tabs
          value={view}
          onValueChange={(next) => {
            setView(next as OperationsView);
            setSelectedWorkOrderId(null);
            setReviewNotes("");
            setReopenReason("");
          }}
          className="w-full"
        >
          <TabsList className="h-auto w-full flex-wrap justify-start gap-1 rounded-2xl border border-neutral-200 bg-white p-1">
            <TabsTrigger value="ACTIVE" className="px-4 py-2 text-sm">
              Activas
            </TabsTrigger>
            <TabsTrigger value="REVIEW" className="px-4 py-2 text-sm">
              Por revisar
            </TabsTrigger>
            <TabsTrigger value="HISTORY" className="px-4 py-2 text-sm">
              Historial
            </TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <SummaryCards view={view} summary={summary} />
        </div>

        <div className="grid gap-3 rounded-2xl border border-neutral-200 bg-white p-4 lg:grid-cols-4">
          <div className="lg:col-span-2">
            <label className="mb-1 block text-xs font-medium text-neutral-600">Buscar</label>
            <div className="relative">
              <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-neutral-400" />
              <Input
                className="pl-8"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Orden, cara, cliente u organizacion"
              />
            </div>
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

          {view === "ACTIVE" ? (
            <ToggleFilter label="Solo sin asignar" checked={unassignedOnly} onChange={setUnassignedOnly} />
          ) : null}

          {view === "HISTORY" ? (
            <>
              <div>
                <label className="mb-1 block text-xs font-medium text-neutral-600">Resultado</label>
                <SelectNative
                  value={historyStatus}
                  onChange={(event) => setHistoryStatus(event.target.value as "" | WorkOrderStatus)}
                >
                  {HISTORY_STATUS_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </SelectNative>
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-neutral-600">Desde</label>
                <Input type="date" value={dateFrom} onChange={(event) => setDateFrom(event.target.value)} />
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-neutral-600">Hasta</label>
                <Input type="date" value={dateTo} onChange={(event) => setDateTo(event.target.value)} />
              </div>
            </>
          ) : null}
        </div>

        <Card className="overflow-hidden">
          {isLoading ? (
            <div className="flex h-40 items-center justify-center">
              <RefreshCw className="h-5 w-5 animate-spin text-neutral-400" />
            </div>
          ) : workOrders.length === 0 ? (
            <div className="p-8 text-center text-sm text-neutral-500">
              No hay OTs para los filtros actuales.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-neutral-200 bg-neutral-50">
                  <tr>
                    <th className="px-4 py-3 font-medium text-neutral-500">Orden / Cara</th>
                    <th className="px-4 py-3 font-medium text-neutral-500">Cliente</th>
                    <th className="px-4 py-3 font-medium text-neutral-500">Zona</th>
                    <th className="px-4 py-3 font-medium text-neutral-500">Estado</th>
                    <th className="px-4 py-3 font-medium text-neutral-500">Instalador</th>
                    <th className="px-4 py-3 font-medium text-neutral-500">Seguimiento</th>
                    <th className="px-4 py-3 font-medium text-right text-neutral-500">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  {workOrders.map((workOrder) => (
                    <tr
                      key={workOrder.id}
                      className="cursor-pointer hover:bg-neutral-50/80"
                      onClick={() => openDetail(workOrder.id)}
                    >
                      <td className="px-4 py-3">
                        <div className="font-mono text-xs font-semibold text-neutral-900">
                          {workOrder.order.code}
                        </div>
                        <div className="text-xs text-neutral-500">Cara {workOrder.face.code}</div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-sm text-neutral-900">
                          {workOrder.order.organization?.name || workOrder.order.clientName || "Sin cliente"}
                        </div>
                        <div className="text-xs text-neutral-500">{workOrder.order.clientEmail || "Sin email"}</div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-sm text-neutral-900">{workOrder.zone.name}</div>
                        <div className="text-xs text-neutral-500">{workOrder.zone.province.name}</div>
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={statusVariant(workOrder.status)}>{statusLabel(workOrder.status)}</Badge>
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-sm text-neutral-800">
                          {workOrder.assignedInstaller
                            ? workOrder.assignedInstaller.user.name || workOrder.assignedInstaller.user.email
                            : "Sin asignar"}
                        </div>
                        {workOrder.reviewedBy ? (
                          <div className="text-xs text-neutral-500">
                            Revisado por{" "}
                            {workOrder.reviewedBy.user.name || workOrder.reviewedBy.user.email}
                          </div>
                        ) : null}
                      </td>
                      <td className="px-4 py-3">
                        <div className="space-y-1 text-xs text-neutral-500">
                          <div>Actualizada: {formatDateTime(workOrder.updatedAt)}</div>
                          {workOrder.submittedAt ? (
                            <div>Enviada a revision: {formatDateTime(workOrder.submittedAt)}</div>
                          ) : null}
                          {workOrder.lastReopenReason ? (
                            <div className="max-w-[240px] truncate text-red-600">
                              Reapertura: {workOrder.lastReopenReason}
                            </div>
                          ) : null}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-2" onClick={(event) => event.stopPropagation()}>
                          {view === "ACTIVE" ? (
                            <>
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-8 px-2 text-xs"
                                onClick={() => openAssignDialog(workOrder.id)}
                              >
                                <UserPlus className="mr-1 h-3.5 w-3.5" />
                                {workOrder.assignedInstallerId ? "Reasignar" : "Asignar"}
                              </Button>
                              {!workOrder.assignedInstallerId ? (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-8 px-2 text-xs"
                                  onClick={() => retryAutoAssign.mutate({ workOrderId: workOrder.id })}
                                  disabled={retryAutoAssign.isPending}
                                >
                                  Reintentar auto
                                </Button>
                              ) : null}
                            </>
                          ) : null}

                          {view === "REVIEW" ? (
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-8 px-2 text-xs"
                              onClick={() => openDetail(workOrder.id)}
                            >
                              <Eye className="mr-1 h-3.5 w-3.5" />
                              Revisar
                            </Button>
                          ) : null}

                          {view === "HISTORY" ? (
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-8 px-2 text-xs"
                              onClick={() => openDetail(workOrder.id)}
                            >
                              <Eye className="mr-1 h-3.5 w-3.5" />
                              Ver
                            </Button>
                          ) : null}

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
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>

      <Dialog open={Boolean(assignWorkOrderId)} onOpenChange={(open) => !open && setAssignWorkOrderId(null)}>
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
                Notas
              </Label>
              <Textarea
                id="assign-notes"
                rows={3}
                value={assignNotes}
                onChange={(event) => setAssignNotes(event.target.value)}
                placeholder="Motivo o contexto de la asignacion"
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setAssignWorkOrderId(null)}>
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={() => {
                if (!assignWorkOrderId || !selectedInstallerId) return;
                reassignManual.mutate({
                  workOrderId: assignWorkOrderId,
                  installerId: selectedInstallerId,
                  notes: assignNotes.trim() || undefined,
                });
              }}
              disabled={
                reassignManual.isPending ||
                !assignWorkOrderId ||
                !selectedInstallerId ||
                selectedInstallerId === selectedWorkOrder?.assignedInstallerId
              }
            >
              Guardar asignacion
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Sheet open={Boolean(selectedWorkOrderId)} onOpenChange={(open) => !open && setSelectedWorkOrderId(null)}>
        <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-2xl">
          <SheetHeader className="border-b border-neutral-200">
            <SheetTitle>
              {detailQuery.data ? `OT ${detailQuery.data.order.code} · Cara ${detailQuery.data.face.code}` : "Detalle de OT"}
            </SheetTitle>
            <SheetDescription>
              Seguimiento operativo, evidencias y acciones de revision.
            </SheetDescription>
          </SheetHeader>

          {detailQuery.isLoading || detailQuery.isRefetching ? (
            <div className="flex h-40 items-center justify-center">
              <RefreshCw className="h-5 w-5 animate-spin text-neutral-400" />
            </div>
          ) : !detailQuery.data ? (
            <div className="p-6 text-sm text-neutral-500">No se pudo cargar el detalle de la OT.</div>
          ) : (
            <>
              <div className="space-y-4 p-4">
                <Card className="rounded-2xl border-neutral-200 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-mono text-xs font-semibold text-neutral-900">
                        {detailQuery.data.order.code}
                      </p>
                      <h3 className="mt-1 text-lg font-semibold text-neutral-900">
                        Cara {detailQuery.data.face.code}
                      </h3>
                      <p className="mt-1 text-xs text-neutral-500">
                        {detailQuery.data.face.asset.structureType?.name || "Sin estructura"}
                      </p>
                    </div>
                    <Badge variant={statusVariant(detailQuery.data.status)}>
                      {statusLabel(detailQuery.data.status)}
                    </Badge>
                  </div>

                  <div className="mt-4 grid gap-3 md:grid-cols-2">
                    <DetailLine
                      icon={<MapPin className="h-4 w-4 text-neutral-400" />}
                      label="Zona"
                      value={`${detailQuery.data.zone.province.name} · ${detailQuery.data.zone.name}`}
                    />
                    <DetailLine
                      icon={<Clock3 className="h-4 w-4 text-neutral-400" />}
                      label="Actualizada"
                      value={formatDateTime(detailQuery.data.updatedAt)}
                    />
                    <DetailLine
                      icon={<UserPlus className="h-4 w-4 text-neutral-400" />}
                      label="Instalador"
                      value={
                        detailQuery.data.assignedInstaller
                          ? detailQuery.data.assignedInstaller.user.name ||
                            detailQuery.data.assignedInstaller.user.email
                          : "Sin asignar"
                      }
                    />
                    <DetailLine
                      icon={<CheckCircle2 className="h-4 w-4 text-neutral-400" />}
                      label="Revision"
                      value={
                        detailQuery.data.reviewedAt
                          ? `${formatDateTime(detailQuery.data.reviewedAt)} · ${
                              detailQuery.data.reviewedBy?.user.name ||
                              detailQuery.data.reviewedBy?.user.email ||
                              "Ops"
                            }`
                          : "Pendiente"
                      }
                    />
                  </div>

                  {detailQuery.data.lastReopenReason ? (
                    <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                      Ultima reapertura: {detailQuery.data.lastReopenReason}
                    </div>
                  ) : null}
                </Card>

                {(detailQuery.data.status === "PENDING_REVIEW" || detailQuery.data.status === "COMPLETED") && (
                  <Card className="rounded-2xl border-neutral-200 p-4">
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="text-sm font-semibold text-neutral-900">Acciones de revision</h3>
                      <Badge variant="secondary">
                        {detailQuery.data.validation.requiredChecklistCompleted}/
                        {detailQuery.data.validation.requiredChecklistTotal} checklist
                      </Badge>
                    </div>

                    <div className="mt-3 grid gap-3 md:grid-cols-2">
                      <StatusMiniCard
                        label="Evidencias"
                        value={`${detailQuery.data.validation.evidenceCount}`}
                        tone={detailQuery.data.validation.evidenceCount > 0 ? "good" : "warn"}
                      />
                      <StatusMiniCard
                        label="Validas en radio"
                        value={`${detailQuery.data.validation.validEvidenceCount}`}
                        tone={detailQuery.data.validation.hasValidEvidence ? "good" : "warn"}
                      />
                    </div>

                    <div className="mt-4 space-y-3">
                      <div>
                        <Label htmlFor="review-notes" className="mb-1 block">
                          Notas de aprobacion
                        </Label>
                        <Textarea
                          id="review-notes"
                          rows={3}
                          value={reviewNotes}
                          onChange={(event) => setReviewNotes(event.target.value)}
                          placeholder="Comentario opcional de validacion"
                        />
                      </div>

                      <div>
                        <Label htmlFor="reopen-reason" className="mb-1 block">
                          Motivo de reapertura
                        </Label>
                        <Textarea
                          id="reopen-reason"
                          rows={3}
                          value={reopenReason}
                          onChange={(event) => setReopenReason(event.target.value)}
                          placeholder="Describe que debe corregirse en campo"
                        />
                      </div>
                    </div>
                  </Card>
                )}

                <Card className="rounded-2xl border-neutral-200 p-4">
                  <div className="mb-3 flex items-center justify-between gap-2">
                    <h3 className="text-sm font-semibold text-neutral-900">Checklist</h3>
                    <Badge variant="secondary">
                      {detailQuery.data.validation.requiredChecklistCompleted}/
                      {detailQuery.data.validation.requiredChecklistTotal}
                    </Badge>
                  </div>
                  <div className="space-y-2">
                    {detailQuery.data.checklistItems.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center justify-between rounded-xl border border-neutral-200 px-3 py-2"
                      >
                        <span className="text-sm text-neutral-800">{item.label}</span>
                        <Badge variant={item.isChecked ? "success" : "secondary"}>
                          {item.isChecked ? "Listo" : "Pendiente"}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </Card>

                <Card className="rounded-2xl border-neutral-200 p-4">
                  <div className="mb-3 flex items-center justify-between gap-2">
                    <h3 className="text-sm font-semibold text-neutral-900">
                      Evidencias ({detailQuery.data.evidences.length})
                    </h3>
                    {detailQuery.data.validation.hasGeoOverride ? (
                      <Badge variant="destructive">Con override geo</Badge>
                    ) : null}
                  </div>
                  <div className="space-y-2.5">
                    {detailQuery.data.evidences.length === 0 ? (
                      <div className="rounded-xl border border-dashed border-neutral-200 px-3 py-4 text-sm text-neutral-500">
                        Sin evidencias registradas.
                      </div>
                    ) : (
                      detailQuery.data.evidences.map((evidence) => (
                        <div key={evidence.id} className="rounded-xl border border-neutral-200 bg-white p-3">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <p className="text-sm font-medium text-neutral-900">{evidence.fileName}</p>
                              <p className="text-xs text-neutral-500">{formatDateTime(evidence.receivedAt)}</p>
                            </div>
                            {evidence.withinExpectedRadius === true ? (
                              <Badge variant="success">
                                <ShieldCheck className="mr-1 h-3 w-3" />
                                Dentro de radio
                              </Badge>
                            ) : evidence.withinExpectedRadius === false ? (
                              <Badge variant="destructive">
                                <ShieldAlert className="mr-1 h-3 w-3" />
                                Fuera de radio
                              </Badge>
                            ) : (
                              <Badge variant="warning">
                                <TriangleAlert className="mr-1 h-3 w-3" />
                                Sin validar geo
                              </Badge>
                            )}
                          </div>
                          <p className="mt-2 text-xs text-neutral-600">
                            Distancia: {evidence.distanceMeters !== null ? `${evidence.distanceMeters.toFixed(1)} m` : "N/D"}
                          </p>
                          {evidence.geoOverrideReason ? (
                            <p className="mt-1 text-xs text-red-600">Override: {evidence.geoOverrideReason}</p>
                          ) : null}
                          <a
                            href={evidence.fileUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="mt-2 inline-flex text-xs font-medium text-[#0359A8]"
                          >
                            Ver evidencia
                          </a>
                        </div>
                      ))
                    )}
                  </div>
                </Card>

                <Card className="rounded-2xl border-neutral-200 p-4">
                  <h3 className="text-sm font-semibold text-neutral-900">Historial</h3>
                  <div className="mt-3 space-y-2">
                    {detailQuery.data.events.map((event) => (
                      <div key={event.id} className="rounded-xl border border-neutral-200 px-3 py-2">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-sm font-medium text-neutral-900">{eventLabel(event.eventType)}</p>
                          <span className="text-xs text-neutral-500">{formatDateTime(event.createdAt)}</span>
                        </div>
                        <p className="mt-1 text-xs text-neutral-500">
                          {event.actor?.user?.name || event.actor?.user?.email || "Sistema"}
                        </p>
                        {event.notes ? <p className="mt-2 text-xs text-neutral-700">{event.notes}</p> : null}
                      </div>
                    ))}
                  </div>
                </Card>
              </div>

              <SheetFooter className="border-t border-neutral-200">
                <div className="flex w-full flex-wrap items-center gap-2">
                  {detailQuery.data.status === "PENDING_REVIEW" ? (
                    <Button
                      type="button"
                      onClick={() =>
                        approveReview.mutate({
                          workOrderId: detailQuery.data.id,
                          notes: reviewNotes.trim() || undefined,
                        })
                      }
                      disabled={approveReview.isPending}
                    >
                      <CheckCircle2 className="mr-1.5 h-4 w-4" />
                      Aprobar revision
                    </Button>
                  ) : null}

                  {(detailQuery.data.status === "PENDING_REVIEW" ||
                    detailQuery.data.status === "COMPLETED") ? (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() =>
                        reopenForRework.mutate({
                          workOrderId: detailQuery.data.id,
                          reason: reopenReason.trim(),
                        })
                      }
                      disabled={reopenForRework.isPending || reopenReason.trim().length === 0}
                    >
                      <RotateCcw className="mr-1.5 h-4 w-4" />
                      Reabrir
                    </Button>
                  ) : null}

                  {detailQuery.data.status !== "COMPLETED" &&
                  detailQuery.data.status !== "CANCELLED" &&
                  detailQuery.data.status !== "PENDING_REVIEW" ? (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => openAssignDialog(detailQuery.data.id)}
                    >
                      <UserPlus className="mr-1.5 h-4 w-4" />
                      {detailQuery.data.assignedInstallerId ? "Reasignar" : "Asignar"}
                    </Button>
                  ) : null}

                  <Button variant="outline" asChild>
                    <Link href={`/admin/orders/${detailQuery.data.orderId}`}>Ir a orden</Link>
                  </Button>
                </div>
              </SheetFooter>
            </>
          )}
        </SheetContent>
      </Sheet>
    </>
  );
}

function SummaryCards({ view, summary }: { view: OperationsView; summary: unknown }) {
  if (!summary || typeof summary !== "object") {
    return (
      <>
        <SummaryCard label="Sin datos" value="-" tone="neutral" />
        <SummaryCard label="Sin datos" value="-" tone="neutral" />
        <SummaryCard label="Sin datos" value="-" tone="neutral" />
        <SummaryCard label="Sin datos" value="-" tone="neutral" />
      </>
    );
  }

  if (view === "ACTIVE") {
    const data = summary as {
      unassignedCount?: number;
      reopenedCount?: number;
      inProgressCount?: number;
      oldestOpen?: { order?: { code?: string }; face?: { code?: string }; createdAt?: string | Date } | null;
    };
    return (
      <>
        <SummaryCard label="Sin asignar" value={data.unassignedCount ?? 0} tone="warn" />
        <SummaryCard label="Reabiertas" value={data.reopenedCount ?? 0} tone="danger" />
        <SummaryCard label="En progreso" value={data.inProgressCount ?? 0} tone="neutral" />
        <SummaryCard
          label="Mas antigua"
          value={
            data.oldestOpen
              ? `${data.oldestOpen.order?.code || "OT"} · Cara ${data.oldestOpen.face?.code || "N/D"}`
              : "Sin cola"
          }
          tone="neutral"
          detail={data.oldestOpen?.createdAt ? formatDateTime(data.oldestOpen.createdAt) : undefined}
        />
      </>
    );
  }

  if (view === "REVIEW") {
    const data = summary as {
      pendingCount?: number;
      overrideCount?: number;
      withoutValidEvidenceCount?: number;
    };
    return (
      <>
        <SummaryCard label="Pendientes de validar" value={data.pendingCount ?? 0} tone="warn" />
        <SummaryCard label="Con override geo" value={data.overrideCount ?? 0} tone="danger" />
        <SummaryCard label="Sin evidencia valida" value={data.withoutValidEvidenceCount ?? 0} tone="danger" />
        <SummaryCard label="Meta" value="Validar y decidir" tone="neutral" />
      </>
    );
  }

  const data = summary as {
    completedTodayCount?: number;
    cancelledCount?: number;
    reopenedInRangeCount?: number;
  };
  return (
    <>
      <SummaryCard label="Completadas hoy" value={data.completedTodayCount ?? 0} tone="good" />
      <SummaryCard label="Canceladas" value={data.cancelledCount ?? 0} tone="neutral" />
      <SummaryCard label="Reabiertas en rango" value={data.reopenedInRangeCount ?? 0} tone="warn" />
      <SummaryCard label="Modo" value="Auditoria" tone="neutral" />
    </>
  );
}

function SummaryCard({
  label,
  value,
  detail,
  tone,
}: {
  label: string;
  value: string | number;
  detail?: string;
  tone: "neutral" | "warn" | "danger" | "good";
}) {
  const toneClass =
    tone === "good"
      ? "border-emerald-200 bg-emerald-50/70"
      : tone === "warn"
        ? "border-amber-200 bg-amber-50/70"
        : tone === "danger"
          ? "border-red-200 bg-red-50/70"
          : "border-neutral-200 bg-white";

  return (
    <Card className={`rounded-2xl p-4 ${toneClass}`}>
      <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-neutral-500">{label}</p>
      <p className="mt-2 text-lg font-semibold text-neutral-900">{value}</p>
      {detail ? <p className="mt-1 text-xs text-neutral-500">{detail}</p> : null}
    </Card>
  );
}

function DetailLine({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border border-neutral-200 px-3 py-2">
      <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-[0.08em] text-neutral-500">
        {icon}
        {label}
      </div>
      <p className="mt-1 text-sm text-neutral-800">{value}</p>
    </div>
  );
}

function StatusMiniCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: "good" | "warn";
}) {
  return (
    <div
      className={`rounded-xl border px-3 py-2 ${
        tone === "good" ? "border-emerald-200 bg-emerald-50" : "border-amber-200 bg-amber-50"
      }`}
    >
      <p className="text-xs font-medium uppercase tracking-[0.08em] text-neutral-500">{label}</p>
      <p className="mt-1 text-sm font-semibold text-neutral-900">{value}</p>
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
