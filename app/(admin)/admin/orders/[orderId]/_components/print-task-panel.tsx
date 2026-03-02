"use client";

import { trpc } from "@/lib/trpc/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SelectNative } from "@/components/ui/select-native";
import { toast } from "sonner";

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

export function PrintTaskPanel({ orderId }: { orderId: string }) {
  const utils = trpc.useUtils();
  const { data: me } = trpc.userProfile.me.useQuery();
  const taskQuery = trpc.print.byOrder.useQuery({ orderId });

  const claimTask = trpc.print.inbox.claim.useMutation({
    onSuccess: async () => {
      await Promise.all([taskQuery.refetch(), utils.print.inbox.list.invalidate()]);
      toast.success("Tarea de impresión tomada.");
    },
    onError: (error) => {
      toast.error("No se pudo tomar la tarea", {
        description: error.message,
      });
    },
  });

  const updateStatus = trpc.print.inbox.updateStatus.useMutation({
    onSuccess: async () => {
      await Promise.all([
        taskQuery.refetch(),
        utils.print.inbox.list.invalidate(),
        utils.print.byOrder.invalidate({ orderId }),
      ]);
      toast.success("Estado de impresión actualizado.");
    },
    onError: (error) => {
      toast.error("No se pudo actualizar el estado", {
        description: error.message,
      });
    },
  });

  const canManage =
    me?.systemRole === "SUPERADMIN" ||
    me?.systemRole === "STAFF" ||
    me?.systemRole === "OPERATIONS_PRINT";
  const task = taskQuery.data;
  const isBlockedByDesign = Boolean(task?.isBlockedByDesign);

  return (
    <section className="rounded-2xl border border-neutral-200/80 bg-white p-5">
      <div className="mb-4 flex items-center justify-between border-b border-neutral-100 pb-3">
        <h2 className="text-sm font-semibold text-neutral-900">Tarea de Impresión</h2>
        {task ? (
          <Badge variant={statusVariant(task.status)}>{statusLabel(task.status)}</Badge>
        ) : (
          <Badge variant="secondary">Sin tarea</Badge>
        )}
      </div>

      {taskQuery.isLoading ? (
        <div className="text-xs text-neutral-500">Cargando tarea...</div>
      ) : !task ? (
        <div className="text-xs text-neutral-500">
          La tarea de impresión se activa automáticamente cuando diseño final queda cerrado.
        </div>
      ) : (
        <div className="space-y-3 text-sm">
          {isBlockedByDesign ? (
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
              Bloqueada por Diseño. Se habilita cuando la prueba final esté cerrada.
            </div>
          ) : null}
          <div className="flex items-center justify-between text-neutral-600">
            <span>Responsable</span>
            <span className="font-medium text-neutral-900">
              {task.assignedTo
                ? task.assignedTo.user?.name || task.assignedTo.user?.email || "Asignado"
                : "Sin asignar"}
            </span>
          </div>
          <div className="flex items-center justify-between text-neutral-600">
            <span>Asignada en</span>
            <span className="font-medium text-neutral-900">{formatDateTime(task.assignedAt)}</span>
          </div>
          <div className="flex items-center justify-between text-neutral-600">
            <span>Versión de prueba</span>
            <span className="font-medium text-neutral-900">
              {task.activatedProofVersion ? `v${task.activatedProofVersion}` : "N/D"}
            </span>
          </div>
          <div className="flex items-center justify-between text-neutral-600">
            <span>Cierre</span>
            <span className="font-medium text-neutral-900">{formatDateTime(task.closedAt)}</span>
          </div>

          {canManage && task.status !== "COMPLETED" ? (
            <div className="space-y-2 border-t border-neutral-100 pt-3">
              {!task.assignedToId ? (
                <Button
                  size="sm"
                  variant="outline"
                  className="w-full"
                  onClick={() => claimTask.mutate({ taskId: task.id })}
                  disabled={claimTask.isPending || isBlockedByDesign}
                >
                  Tomar tarea
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
              >
                <option value="READY">Lista</option>
                <option value="IN_PROGRESS">En progreso</option>
              </SelectNative>
            </div>
          ) : null}
        </div>
      )}
    </section>
  );
}
