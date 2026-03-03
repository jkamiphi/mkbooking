"use client";

import { useRef, useState } from "react";
import {
  Camera,
  CheckCircle2,
  CircleDot,
  Clock3,
  MapPin,
  Navigation,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
  TriangleAlert,
} from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
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

function statusLabel(status: string) {
  if (status === "ASSIGNED") return "Asignada";
  if (status === "IN_PROGRESS") return "En progreso";
  if (status === "COMPLETED") return "Completada";
  if (status === "CANCELLED") return "Cancelada";
  if (status === "PENDING_ASSIGNMENT") return "Pendiente";
  return status;
}

function statusVariant(status: string) {
  if (status === "ASSIGNED") return "warning" as const;
  if (status === "IN_PROGRESS") return "info" as const;
  if (status === "COMPLETED") return "success" as const;
  if (status === "CANCELLED") return "destructive" as const;
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

function buildMapsUrl(latitude: number | null, longitude: number | null) {
  if (latitude === null || longitude === null) {
    return null;
  }

  return `https://www.google.com/maps?q=${latitude},${longitude}`;
}

async function resolveCurrentCoordinates() {
  if (typeof window === "undefined" || !navigator.geolocation) {
    return null;
  }

  return new Promise<{ latitude: number; longitude: number } | null>((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
      },
      () => {
        resolve(null);
      },
      {
        enableHighAccuracy: true,
        maximumAge: 0,
        timeout: 10000,
      }
    );
  });
}

export function TaskDetailMobile({ workOrderId }: { workOrderId: string }) {
  const utils = trpc.useUtils();
  const taskQuery = trpc.installer.tasks.getById.useQuery({ workOrderId });
  const uploadInputRef = useRef<HTMLInputElement | null>(null);

  const [isCompletingDialogOpen, setIsCompletingDialogOpen] = useState(false);
  const [completeNotes, setCompleteNotes] = useState("");
  const [geoOverrideReason, setGeoOverrideReason] = useState("");
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);

  const refreshTaskData = async () => {
    await Promise.all([
      taskQuery.refetch(),
      utils.installer.tasks.listMine.invalidate(),
      utils.installer.tasks.getById.invalidate({ workOrderId }),
    ]);
  };

  const toggleChecklist = trpc.installer.tasks.toggleChecklistItem.useMutation({
    onSuccess: async () => {
      await refreshTaskData();
    },
    onError: (error) => {
      toast.error("No se pudo actualizar checklist", {
        description: error.message,
      });
    },
  });

  const addEvidence = trpc.installer.tasks.addEvidence.useMutation({
    onSuccess: async () => {
      await refreshTaskData();
      toast.success("Evidencia registrada.");
    },
    onError: (error) => {
      toast.error("No se pudo registrar evidencia", {
        description: error.message,
      });
    },
  });

  const startTask = trpc.installer.tasks.start.useMutation({
    onSuccess: async () => {
      await refreshTaskData();
      toast.success("Trabajo iniciado.");
    },
    onError: (error) => {
      toast.error("No se pudo iniciar la OT", {
        description: error.message,
      });
    },
  });

  const completeTask = trpc.installer.tasks.complete.useMutation({
    onSuccess: async () => {
      await refreshTaskData();
      setIsCompletingDialogOpen(false);
      setCompleteNotes("");
      setGeoOverrideReason("");
      toast.success("OT completada correctamente.");
    },
    onError: (error) => {
      toast.error("No se pudo completar la OT", {
        description: error.message,
      });
    },
  });

  const task = taskQuery.data;
  const requiresGeoOverride = Boolean(task?.validation.requiresGeoOverride);
  const mapsUrl = buildMapsUrl(task?.face.expectedLatitude ?? null, task?.face.expectedLongitude ?? null);

  async function handleUploadEvidence(file: File) {
    setIsUploadingPhoto(true);

    try {
      const [coordinates, capturedAt] = await Promise.all([
        resolveCurrentCoordinates(),
        Promise.resolve(new Date()),
      ]);

      const formData = new FormData();
      formData.append("file", file);
      formData.append("scope", "orders-operational-evidence");

      const uploadResponse = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (!uploadResponse.ok) {
        throw new Error("No se pudo subir la foto.");
      }

      const uploadPayload = (await uploadResponse.json()) as { url: string };

      await addEvidence.mutateAsync({
        workOrderId,
        fileUrl: uploadPayload.url,
        fileName: file.name,
        fileType: file.type,
        fileSize: file.size,
        capturedAt,
        capturedLatitude: coordinates?.latitude,
        capturedLongitude: coordinates?.longitude,
        metadata: {
          source: "installer-mobile",
        },
      });

      if (!coordinates) {
        toast.warning("Foto subida sin coordenadas GPS del dispositivo.");
      }
    } catch (error) {
      toast.error("Error al subir evidencia", {
        description: error instanceof Error ? error.message : undefined,
      });
    } finally {
      setIsUploadingPhoto(false);
      if (uploadInputRef.current) {
        uploadInputRef.current.value = "";
      }
    }
  }

  function handleCompleteAction() {
    if (!task) return;

    if (requiresGeoOverride) {
      setIsCompletingDialogOpen(true);
      return;
    }

    completeTask.mutate({
      workOrderId,
    });
  }

  if (taskQuery.isLoading || taskQuery.isRefetching) {
    return (
      <Card>
        <div className="flex h-40 items-center justify-center">
          <RefreshCw className="h-5 w-5 animate-spin text-neutral-400" />
        </div>
      </Card>
    );
  }

  if (!task) {
    return (
      <Card>
        <div className="p-6 text-center text-sm text-neutral-500">
          No se encontró esta OT o no está asignada a tu usuario.
        </div>
      </Card>
    );
  }

  const checklistProgress = `${task.validation.requiredChecklistCompleted}/${task.validation.requiredChecklistTotal}`;

  return (
    <>
      <div className="space-y-4 pb-24">
        <Card className="rounded-2xl border-neutral-200 p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="font-mono text-xs font-semibold text-neutral-900">{task.orderCode}</p>
              <h2 className="mt-1 text-lg font-semibold text-neutral-900">Cara {task.face.code}</h2>
              <p className="mt-1 text-xs text-neutral-500">{task.face.structureTypeName}</p>
            </div>
            <Badge variant={statusVariant(task.status)}>{statusLabel(task.status)}</Badge>
          </div>

          <div className="mt-3 space-y-2 text-sm text-neutral-700">
            <p className="flex items-start gap-2">
              <MapPin className="mt-0.5 h-4 w-4 text-neutral-400" />
              <span>
                {task.zone.name}, {task.zone.provinceName}
                <br />
                {task.face.address || "Dirección no disponible"}
              </span>
            </p>
            <p className="flex items-center gap-2 text-xs text-neutral-500">
              <Clock3 className="h-3.5 w-3.5" />
              Actualizada: {formatDateTime(task.updatedAt)}
            </p>
          </div>

          {mapsUrl ? (
            <Button asChild variant="outline" className="mt-3 h-11 w-full rounded-xl">
              <a href={mapsUrl} target="_blank" rel="noopener noreferrer">
                <Navigation className="mr-1.5 h-4 w-4" />
                Ver ubicación esperada
              </a>
            </Button>
          ) : (
            <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
              Esta cara no tiene coordenadas esperadas configuradas.
            </div>
          )}
        </Card>

        <Card className="rounded-2xl border-neutral-200 p-4">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-neutral-900">Checklist</h3>
            <Badge variant="secondary">{checklistProgress}</Badge>
          </div>

          <div className="space-y-2">
            {task.checklistItems.map((item) => (
              <label
                key={item.id}
                className="flex min-h-11 items-start gap-3 rounded-xl border border-neutral-200 bg-white px-3 py-2"
              >
                <Checkbox
                  checked={item.isChecked}
                  onCheckedChange={(checked) =>
                    toggleChecklist.mutate({
                      workOrderId,
                      checklistItemId: item.id,
                      isChecked: Boolean(checked),
                    })
                  }
                  disabled={toggleChecklist.isPending || task.status === "COMPLETED" || task.status === "CANCELLED"}
                  className="mt-1 h-5 w-5"
                />
                <span className="text-sm text-neutral-800">{item.label}</span>
              </label>
            ))}
          </div>
        </Card>

        <Card className="rounded-2xl border-neutral-200 p-4">
          <div className="mb-3 flex items-center justify-between gap-2">
            <h3 className="text-sm font-semibold text-neutral-900">Evidencias ({task.evidences.length})</h3>
            <input
              ref={uploadInputRef}
              type="file"
              className="hidden"
              accept="image/*"
              capture="environment"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) {
                  void handleUploadEvidence(file);
                }
              }}
            />
            <Button
              type="button"
              variant="outline"
              className="h-11 rounded-xl"
              onClick={() => uploadInputRef.current?.click()}
              disabled={isUploadingPhoto || task.status === "COMPLETED" || task.status === "CANCELLED"}
            >
              <Camera className="mr-1.5 h-4 w-4" />
              {isUploadingPhoto ? "Subiendo" : "Tomar foto"}
            </Button>
          </div>

          {task.evidences.length === 0 ? (
            <div className="rounded-xl border border-dashed border-neutral-200 px-3 py-4 text-xs text-neutral-500">
              Debes cargar al menos una evidencia para completar esta OT.
            </div>
          ) : (
            <div className="space-y-2.5">
              {task.evidences.map((evidence) => (
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
                  <p className="mt-1 text-xs text-neutral-600">
                    Distancia: {evidence.distanceMeters !== null ? `${evidence.distanceMeters.toFixed(1)} m` : "N/D"}
                  </p>
                  <a
                    href={evidence.fileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-2 inline-flex text-xs font-medium text-[#0359A8]"
                  >
                    Ver evidencia
                  </a>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card className="rounded-2xl border-neutral-200 p-4">
          <h3 className="text-sm font-semibold text-neutral-900">Historial reciente</h3>
          <div className="mt-3 space-y-2">
            {task.events.length === 0 ? (
              <p className="text-xs text-neutral-500">Sin eventos registrados.</p>
            ) : (
              task.events.map((event) => (
                <div key={event.id} className="rounded-xl border border-neutral-200 bg-white px-3 py-2">
                  <div className="flex items-center gap-1.5 text-sm font-medium text-neutral-900">
                    <CircleDot className="h-3.5 w-3.5 text-neutral-400" />
                    {event.eventType}
                  </div>
                  <p className="mt-1 text-xs text-neutral-500">
                    {formatDateTime(event.createdAt)} · {event.actor?.user?.name || event.actor?.user?.email || "Sistema"}
                  </p>
                </div>
              ))
            )}
          </div>
        </Card>
      </div>

      <div className="fixed inset-x-0 bottom-[max(4.3rem,env(safe-area-inset-bottom))] z-30 border-t border-neutral-200 bg-white/95 p-3 backdrop-blur lg:hidden">
        <div className="mx-auto flex w-full max-w-3xl gap-2">
          {task.status === "ASSIGNED" ? (
            <Button
              type="button"
              className="h-11 flex-1 rounded-xl"
              onClick={() => startTask.mutate({ workOrderId })}
              disabled={startTask.isPending}
            >
              <CheckCircle2 className="mr-1.5 h-4 w-4" />
              {startTask.isPending ? "Iniciando..." : "Iniciar trabajo"}
            </Button>
          ) : null}

          {task.status === "IN_PROGRESS" ? (
            <Button
              type="button"
              className="h-11 flex-1 rounded-xl"
              onClick={handleCompleteAction}
              disabled={completeTask.isPending || !task.validation.canComplete}
            >
              <CheckCircle2 className="mr-1.5 h-4 w-4" />
              {completeTask.isPending ? "Completando..." : "Completar OT"}
            </Button>
          ) : null}

          {task.status !== "ASSIGNED" && task.status !== "IN_PROGRESS" ? (
            <div className="flex h-11 flex-1 items-center justify-center rounded-xl border border-neutral-200 text-sm text-neutral-600">
              OT en estado {statusLabel(task.status)}
            </div>
          ) : null}
        </div>
      </div>

      <Dialog open={isCompletingDialogOpen} onOpenChange={setIsCompletingDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Completar OT con override geográfico</DialogTitle>
            <DialogDescription>
              Ninguna evidencia está dentro del radio esperado. Debes indicar motivo para cerrar.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="geo-override-reason">Motivo de override (obligatorio)</Label>
              <Textarea
                id="geo-override-reason"
                rows={3}
                value={geoOverrideReason}
                onChange={(event) => setGeoOverrideReason(event.target.value)}
                placeholder="Ej: Acceso restringido a punto exacto, evidencia tomada desde punto seguro."
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="completion-notes">Notas adicionales (opcional)</Label>
              <Textarea
                id="completion-notes"
                rows={3}
                value={completeNotes}
                onChange={(event) => setCompleteNotes(event.target.value)}
                placeholder="Comentario de cierre"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setIsCompletingDialogOpen(false);
                setGeoOverrideReason("");
                setCompleteNotes("");
              }}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={() =>
                completeTask.mutate({
                  workOrderId,
                  geoOverrideReason: geoOverrideReason.trim(),
                  notes: completeNotes.trim() || undefined,
                })
              }
              disabled={completeTask.isPending || geoOverrideReason.trim().length === 0}
            >
              {completeTask.isPending ? "Guardando..." : "Completar con override"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
