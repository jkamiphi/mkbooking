"use client";

import { trpc } from "@/lib/trpc/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SelectNative } from "@/components/ui/select-native";
import { toast } from "sonner";

function statusLabel(status: string) {
  if (status === "REVIEW") return "Revisar";
  if (status === "ADJUST") return "Ajustar";
  if (status === "CREATE_FROM_SCRATCH") return "Crear desde cero";
  if (status === "COLOR_PROOF_READY") return "Prueba lista";
  return status;
}

function statusVariant(status: string) {
  if (status === "REVIEW") return "warning" as const;
  if (status === "ADJUST") return "destructive" as const;
  if (status === "CREATE_FROM_SCRATCH") return "info" as const;
  if (status === "COLOR_PROOF_READY") return "success" as const;
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

export function DesignTaskPanel({ orderId }: { orderId: string }) {
  const utils = trpc.useUtils();
  const { data: me } = trpc.userProfile.me.useQuery();
  const taskQuery = trpc.design.byOrder.useQuery({ orderId });

  const claimTask = trpc.design.inbox.claim.useMutation({
    onSuccess: async () => {
      await Promise.all([
        taskQuery.refetch(),
        utils.design.inbox.list.invalidate(),
      ]);
      toast.success("Tarea tomada.");
    },
    onError: (error) => {
      toast.error("No se pudo tomar la tarea", {
        description: error.message,
      });
    },
  });

  const updateStatus = trpc.design.inbox.updateStatus.useMutation({
    onSuccess: async () => {
      await Promise.all([
        taskQuery.refetch(),
        utils.design.inbox.list.invalidate(),
      ]);
      toast.success("Estado de diseño actualizado.");
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
    me?.systemRole === "DESIGNER";
  const task = taskQuery.data;
  const isBlockedBySales = Boolean(task?.isBlockedBySales);

  return (
    <section className="rounded-2xl border border-neutral-200/80 bg-white p-5">
      <div className="mb-4 flex items-center justify-between border-b border-neutral-100 pb-3">
        <h2 className="text-sm font-semibold text-neutral-900">Tarea de Diseño</h2>
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
          La tarea de diseno se crea automaticamente cuando Ventas aprueba la validacion comercial.
        </div>
      ) : (
        <div className="space-y-3 text-sm">
          {isBlockedBySales ? (
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
              Bloqueada por Ventas. Se habilita al aprobar validacion comercial.
            </div>
          ) : null}
          <div className="flex items-center justify-between text-neutral-600">
            <span>SLA</span>
            <span className="font-medium text-neutral-900">{formatDateTime(task.slaDueAt)}</span>
          </div>
          <div className="flex items-center justify-between text-neutral-600">
            <span>Responsable</span>
            <span className="font-medium text-neutral-900">
              {task.assignedTo
                ? task.assignedTo.user?.name || task.assignedTo.user?.email || "Asignado"
                : "Sin asignar"}
            </span>
          </div>
          <div className="flex items-center justify-between text-neutral-600">
            <span>Cierre</span>
            <span className="font-medium text-neutral-900">{formatDateTime(task.closedAt)}</span>
          </div>

          {canManage ? (
            <div className="space-y-2 border-t border-neutral-100 pt-3">
              {!task.assignedToId ? (
                <Button
                  size="sm"
                  variant="outline"
                  className="w-full"
                  onClick={() => claimTask.mutate({ taskId: task.id })}
                  disabled={claimTask.isPending || isBlockedBySales}
                >
                  Tomar tarea
                </Button>
              ) : null}
              <SelectNative
                value={task.status}
                onChange={(event) =>
                  updateStatus.mutate({
                    taskId: task.id,
                    status: event.target.value as
                      | "REVIEW"
                      | "ADJUST"
                      | "CREATE_FROM_SCRATCH"
                      | "COLOR_PROOF_READY",
                  })
                }
                disabled={updateStatus.isPending || isBlockedBySales}
              >
                <option value="REVIEW">Revisar</option>
                <option value="ADJUST">Ajustar</option>
                <option value="CREATE_FROM_SCRATCH">Crear desde cero</option>
                <option value="COLOR_PROOF_READY">Prueba lista</option>
              </SelectNative>
            </div>
          ) : null}
        </div>
      )}
    </section>
  );
}
