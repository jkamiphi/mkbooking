"use client";

import { useMemo, useRef, useState } from "react";
import type { inferRouterOutputs } from "@trpc/server";
import { Clock, Upload } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc/client";
import type { AppRouter } from "@/lib/trpc/routers";
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

type RouterOutputs = inferRouterOutputs<AppRouter>;
type PrintTask = RouterOutputs["print"]["byOrder"];

type PrintEvidenceItem = NonNullable<PrintTask>["evidences"][number];

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

function printEventLabel(eventType: string) {
  if (eventType === "TASK_ACTIVATED") return "Tarea activada";
  if (eventType === "TASK_CLAIMED") return "Tarea tomada";
  if (eventType === "STATUS_CHANGED") return "Cambio de estado";
  if (eventType === "FINAL_PRINT_CONFIRMED") return "Impresión confirmada";
  if (eventType === "REOPENED_BY_DESIGN") return "Reabierta por diseño";
  return eventType;
}

export function PrintEvidenceModule({
  orderId,
  readOnly = false,
}: {
  orderId: string;
  readOnly?: boolean;
}) {
  const utils = trpc.useUtils();
  const { data: me } = trpc.userProfile.me.useQuery();
  const taskQuery = trpc.print.byOrder.useQuery({ orderId });

  const [isUploading, setIsUploading] = useState(false);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [confirmNotes, setConfirmNotes] = useState("");
  const inputRef = useRef<HTMLInputElement | null>(null);

  const addEvidence = trpc.print.evidence.add.useMutation({
    onSuccess: async () => {
      await Promise.all([
        taskQuery.refetch(),
        utils.print.byOrder.invalidate({ orderId }),
        utils.print.inbox.list.invalidate(),
      ]);
      toast.success("Evidencia de impresión registrada.");
    },
    onError: (error) => {
      toast.error("No se pudo registrar la evidencia", {
        description: error.message,
      });
    },
  });

  const confirmFinal = trpc.print.confirmFinal.useMutation({
    onSuccess: async () => {
      await Promise.all([
        taskQuery.refetch(),
        utils.print.byOrder.invalidate({ orderId }),
        utils.print.inbox.list.invalidate(),
      ]);
      setConfirmDialogOpen(false);
      setConfirmNotes("");
      toast.success("Impresión final confirmada.");
    },
    onError: (error) => {
      toast.error("No se pudo confirmar la impresión", {
        description: error.message,
      });
    },
  });

  const canManage =
    !readOnly &&
    (me?.systemRole === "SUPERADMIN" ||
      me?.systemRole === "STAFF" ||
      me?.systemRole === "OPERATIONS_PRINT");

  const task = taskQuery.data;
  const evidences = useMemo(() => task?.evidences ?? [], [task?.evidences]);

  async function handleFileUpload(file: File) {
    setIsUploading(true);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("scope", "orders-print-evidence");

      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Upload failed");
      }

      const blob = await response.json();
      await addEvidence.mutateAsync({
        orderId,
        fileUrl: blob.url,
        fileName: file.name,
        fileType: file.type,
        fileSize: file.size,
      });
    } catch {
      toast.error("No se pudo subir la evidencia.");
    } finally {
      setIsUploading(false);
      if (inputRef.current) {
        inputRef.current.value = "";
      }
    }
  }

  return (
    <>
      <section className="rounded-2xl border border-neutral-200/80 bg-white p-5">
        <div className="mb-4 flex items-start justify-between gap-4 border-b border-neutral-100 pb-3">
          <div>
            <h2 className="text-sm font-semibold text-neutral-900">Impresión final y evidencias</h2>
            <p className="mt-1 text-xs text-neutral-500">
              Registra documentos/fotos de salida y confirma cierre de impresión final.
            </p>
          </div>
          {canManage && task ? (
            <div className="flex items-center gap-2">
              <input
                ref={inputRef}
                type="file"
                accept="image/*,.pdf"
                className="hidden"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) {
                    void handleFileUpload(file);
                  }
                }}
              />
              <Button
                variant="outline"
                size="sm"
                onClick={() => inputRef.current?.click()}
                disabled={isUploading || Boolean(task.isBlockedByDesign)}
              >
                <Upload className="mr-1.5 h-4 w-4" />
                {isUploading ? "Subiendo..." : "Subir evidencia"}
              </Button>
              {task.status !== "COMPLETED" ? (
                <Button
                  size="sm"
                  onClick={() => setConfirmDialogOpen(true)}
                  disabled={confirmFinal.isPending || Boolean(task.isBlockedByDesign)}
                >
                  Confirmar impresión
                </Button>
              ) : null}
            </div>
          ) : null}
        </div>

        {taskQuery.isLoading ? (
          <div className="text-xs text-neutral-500">Cargando...</div>
        ) : !task ? (
          <div className="rounded-lg border border-dashed border-neutral-200 bg-neutral-50/50 py-6 text-center text-sm text-neutral-500">
            Aún no existe tarea de impresión para esta orden.
          </div>
        ) : (
          <div className="space-y-4">
            {task.isBlockedByDesign ? (
              <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
                Impresión bloqueada hasta que diseño cierre la prueba final.
              </div>
            ) : null}

            {task.status === "COMPLETED" ? (
              <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-800">
                Impresión final completada el {formatDateTime(task.completedAt)}.
              </div>
            ) : null}

            <div>
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-neutral-500">
                Evidencias ({evidences.length})
              </h3>
              {evidences.length === 0 ? (
                <div className="rounded-lg border border-dashed border-neutral-200 p-3 text-xs text-neutral-500">
                  Sin evidencias registradas.
                </div>
              ) : (
                <div className="space-y-2">
                  {evidences.map((evidence: PrintEvidenceItem) => (
                    <div
                      key={evidence.id}
                      className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-neutral-100 bg-neutral-50 p-3"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-neutral-900">{evidence.fileName}</p>
                        <p className="text-[11px] text-neutral-500">
                          {(evidence.fileSize / 1024 / 1024).toFixed(2)} MB · {formatDateTime(evidence.createdAt)}
                          {evidence.uploadedBy?.user?.name
                            ? ` · Por ${evidence.uploadedBy.user.name}`
                            : ""}
                        </p>
                        {evidence.notes ? (
                          <p className="mt-1 text-[11px] text-neutral-700">Notas: {evidence.notes}</p>
                        ) : null}
                      </div>
                      <Button variant="ghost" size="sm" className="h-7 px-2 text-[11px]" asChild>
                        <a href={evidence.fileUrl} target="_blank" rel="noopener noreferrer">
                          Ver
                        </a>
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div>
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-neutral-500">
                Historial impresión
              </h3>
              {task.events.length === 0 ? (
                <div className="rounded-lg border border-dashed border-neutral-200 p-3 text-xs text-neutral-500">
                  Sin eventos registrados.
                </div>
              ) : (
                <div className="space-y-2">
                  {task.events.slice(0, 10).map((event) => (
                    <div key={event.id} className="rounded-lg border border-neutral-100 p-2.5 text-xs">
                      <div className="flex items-center gap-2 text-neutral-900">
                        <Clock className="h-3.5 w-3.5 text-neutral-500" />
                        <span className="font-medium">{printEventLabel(event.eventType)}</span>
                        {event.toStatus ? (
                          <Badge variant="secondary" className="h-5 px-1.5 text-[10px]">
                            {event.toStatus}
                          </Badge>
                        ) : null}
                      </div>
                      <p className="mt-1 text-[11px] text-neutral-500">
                        {formatDateTime(event.createdAt)}
                        {event.actor
                          ? ` · ${event.actor.user?.name || event.actor.user?.email || "Usuario"}`
                          : " · Sistema"}
                      </p>
                      {event.notes ? (
                        <p className="mt-1 text-[11px] text-neutral-700">{event.notes}</p>
                      ) : null}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </section>

      <Dialog open={confirmDialogOpen} onOpenChange={setConfirmDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar impresión final</DialogTitle>
            <DialogDescription>
              Se registrará el cierre de impresión final para esta orden. Las evidencias son opcionales.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-1.5">
            <Label htmlFor="print-confirm-notes">Notas (opcionales)</Label>
            <Textarea
              id="print-confirm-notes"
              rows={4}
              value={confirmNotes}
              onChange={(event) => setConfirmNotes(event.target.value)}
              placeholder="Comentario de cierre"
            />
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setConfirmDialogOpen(false);
                setConfirmNotes("");
              }}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={() =>
                confirmFinal.mutate({
                  orderId,
                  notes: confirmNotes.trim() || undefined,
                })
              }
              disabled={confirmFinal.isPending}
            >
              {confirmFinal.isPending ? "Guardando..." : "Confirmar cierre"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
