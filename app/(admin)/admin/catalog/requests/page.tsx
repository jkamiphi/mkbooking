"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { AdminPageHeader, AdminPageShell } from "@/components/admin/page-shell";
import { Card, CardContent } from "@/components/ui/card";
import { SelectNative } from "@/components/ui/select-native";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { trpc } from "@/lib/trpc/client";

const statusOptions = [
  "NEW",
  "IN_REVIEW",
  "PROPOSAL_SENT",
  "CONFIRMED",
  "REJECTED",
] as const;

function statusBadgeVariant(status: string) {
  if (status === "NEW") return "info" as const;
  if (status === "IN_REVIEW") return "warning" as const;
  if (status === "PROPOSAL_SENT") return "secondary" as const;
  if (status === "CONFIRMED") return "success" as const;
  return "destructive" as const;
}

function statusLabel(status: string) {
  if (status === "NEW") return "Nueva";
  if (status === "IN_REVIEW") return "En revisión";
  if (status === "PROPOSAL_SENT") return "Propuesta enviada";
  if (status === "CONFIRMED") return "Confirmada";
  if (status === "REJECTED") return "Rechazada";
  return status;
}

function requestSummary(request: {
  quantity: number;
  structureType: { name: string } | null;
  zone: { name: string; province: { name: string } } | null;
}) {
  const parts = [
    `${request.quantity} cara${request.quantity === 1 ? "" : "s"}`,
    request.structureType?.name || "cualquier tipo",
    request.zone ? `${request.zone.name}, ${request.zone.province.name}` : "cualquier zona",
  ];

  return parts.join(" · ");
}

export default function CampaignRequestsPage() {
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [selectedRequestId, setSelectedRequestId] = useState<string>("");
  const [statusDraft, setStatusDraft] = useState<string>("IN_REVIEW");
  const [draftFaceIdsByRequest, setDraftFaceIdsByRequest] = useState<Record<string, string[]>>({});

  const utils = trpc.useUtils();

  const requestsQuery = trpc.catalog.requests.list.useQuery({
    status: statusFilter ? (statusFilter as (typeof statusOptions)[number]) : undefined,
    skip: 0,
    take: 100,
  });

  const selectedRequest = useMemo(
    () => requestsQuery.data?.requests.find((request) => request.id === selectedRequestId) || null,
    [requestsQuery.data?.requests, selectedRequestId]
  );

  const suggestionQuery = trpc.catalog.requests.suggestFaces.useQuery(
    { requestId: selectedRequestId, take: 50 },
    { enabled: Boolean(selectedRequestId) }
  );

  const updateStatus = trpc.catalog.requests.updateStatus.useMutation({
    onSuccess: () => {
      utils.catalog.requests.list.invalidate();
      if (selectedRequestId) {
        utils.catalog.requests.get.invalidate({ requestId: selectedRequestId });
      }
      toast.success("Estado actualizado");
    },
    onError: (error) => {
      toast.error("No se pudo actualizar el estado", { description: error.message });
    },
  });

  const assignFaces = trpc.catalog.requests.assignFaces.useMutation({
    onSuccess: () => {
      utils.catalog.requests.list.invalidate();
      if (selectedRequestId) {
        utils.catalog.requests.get.invalidate({ requestId: selectedRequestId });
      }
      toast.success("Asignaciones guardadas");
    },
    onError: (error) => {
      toast.error("No se pudieron guardar las asignaciones", { description: error.message });
    },
  });

  const confirmRequest = trpc.catalog.requests.confirm.useMutation({
    onSuccess: (result) => {
      utils.catalog.requests.list.invalidate();
      utils.catalog.holds.list.invalidate();
      toast.success("Solicitud confirmada", {
        description: `Holds creados: ${result.createdHolds}. Omitidos por hold activo: ${result.skippedActiveHolds}.`,
      });
    },
    onError: (error) => {
      toast.error("No se pudo confirmar la solicitud", { description: error.message });
    },
  });

  const assignedFaceIds = selectedRequest
    ? draftFaceIdsByRequest[selectedRequest.id] ??
      selectedRequest.assignments.map((assignment) => assignment.faceId)
    : [];

  function toggleFace(faceId: string, checked: boolean) {
    if (!selectedRequest) return;

    setDraftFaceIdsByRequest((previous) => {
      const current =
        previous[selectedRequest.id] ??
        selectedRequest.assignments.map((assignment) => assignment.faceId);

      if (checked) {
        if (current.includes(faceId)) return previous;
        return { ...previous, [selectedRequest.id]: [...current, faceId] };
      }

      return {
        ...previous,
        [selectedRequest.id]: current.filter((id) => id !== faceId),
      };
    });
  }

  function saveAssignments() {
    if (!selectedRequest) return;

    assignFaces.mutate({
      requestId: selectedRequest.id,
      faceIds: assignedFaceIds,
    });
  }

  return (
    <AdminPageShell>
      <AdminPageHeader
        title="Solicitudes masivas"
        description="Gestiona solicitudes por zona/tipo/cantidad y asigna caras para su confirmacion."
      />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
        <Card>
          <CardContent className="space-y-4 pt-6">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-semibold text-neutral-900">Solicitudes recibidas</p>
              <SelectNative
                className="max-w-[220px]"
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value)}
              >
                <option value="">Todos los estados</option>
                {statusOptions.map((status) => (
                  <option key={status} value={status}>
                    {statusLabel(status)}
                  </option>
                ))}
              </SelectNative>
            </div>

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Solicitud</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Asignadas</TableHead>
                  <TableHead>Creada</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {requestsQuery.data?.requests.map((request) => (
                  <TableRow key={request.id}>
                    <TableCell>
                      <p className="font-medium text-neutral-900">{requestSummary(request)}</p>
                      <p className="text-xs text-neutral-500">
                        {request.createdBy?.user?.email || request.contactEmail || "Sin contacto"}
                      </p>
                    </TableCell>
                    <TableCell>
                      <Badge variant={statusBadgeVariant(request.status)}>
                        {statusLabel(request.status)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {request.assignments.length}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {request.createdAt.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        variant={selectedRequestId === request.id ? "default" : "outline"}
                        onClick={() => {
                          setSelectedRequestId(request.id);
                          setStatusDraft(request.status);
                        }}
                      >
                        Gestionar
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {!requestsQuery.data?.requests.length && (
                  <TableRow>
                    <TableCell className="py-4 text-center text-muted-foreground" colSpan={5}>
                      Aún no hay solicitudes.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="space-y-4 pt-6">
            {!selectedRequest ? (
              <p className="text-sm text-muted-foreground">
                Selecciona una solicitud para revisar y asignar caras.
              </p>
            ) : (
              <>
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-neutral-900">Detalle</p>
                  <p className="text-xs text-neutral-500">{requestSummary(selectedRequest)}</p>
                  <p className="text-xs text-neutral-500">
                    Fechas: {selectedRequest.fromDate ? selectedRequest.fromDate.toLocaleDateString() : "N/D"} -{" "}
                    {selectedRequest.toDate ? selectedRequest.toDate.toLocaleDateString() : "N/D"}
                  </p>
                  {selectedRequest.notes ? (
                    <p className="text-xs text-neutral-600">Notas: {selectedRequest.notes}</p>
                  ) : null}
                </div>

                <div className="flex items-center gap-2">
                  <SelectNative
                    className="max-w-[220px]"
                    value={statusDraft}
                    onChange={(event) => setStatusDraft(event.target.value)}
                  >
                    {statusOptions.map((status) => (
                      <option key={status} value={status}>
                        {statusLabel(status)}
                      </option>
                    ))}
                  </SelectNative>
                  <Button
                    variant="outline"
                    onClick={() =>
                      updateStatus.mutate({
                        requestId: selectedRequest.id,
                        status: statusDraft as (typeof statusOptions)[number],
                      })
                    }
                    disabled={updateStatus.isPending}
                  >
                    Actualizar estado
                  </Button>
                  <Button
                    onClick={() => confirmRequest.mutate({ requestId: selectedRequest.id })}
                    disabled={confirmRequest.isPending || assignedFaceIds.length === 0}
                  >
                    Confirmar y crear holds
                  </Button>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold text-neutral-900">
                      Sugerencias de caras ({suggestionQuery.data?.length || 0})
                    </p>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={saveAssignments}
                      disabled={assignFaces.isPending}
                    >
                      Guardar asignaciones
                    </Button>
                  </div>

                  <div className="max-h-96 space-y-2 overflow-y-auto rounded-xl border border-neutral-200 p-3">
                    {suggestionQuery.data?.map((face) => {
                      const isChecked = assignedFaceIds.includes(face.id);

                      return (
                        <label
                          key={face.id}
                          className="flex items-start gap-3 rounded-lg border border-neutral-200 p-2 text-sm"
                        >
                          <Checkbox
                            checked={isChecked}
                            onCheckedChange={(value) => toggleFace(face.id, Boolean(value))}
                          />
                          <div>
                            <p className="font-medium text-neutral-900">
                              {face.assetCode} - {face.code}
                            </p>
                            <p className="text-xs text-neutral-500">{face.title}</p>
                            <p className="text-xs text-neutral-500">
                              {face.structureType} · {face.zone}, {face.province}
                            </p>
                          </div>
                        </label>
                      );
                    })}

                    {!suggestionQuery.data?.length && (
                      <p className="text-xs text-neutral-500">No hay sugerencias para esta solicitud.</p>
                    )}
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminPageShell>
  );
}
