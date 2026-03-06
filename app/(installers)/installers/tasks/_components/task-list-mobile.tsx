"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ChevronRight, Clock3, MapPin, RefreshCw } from "lucide-react";
import { trpc } from "@/lib/trpc/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

type TaskStatusFilter = "ALL" | "ASSIGNED" | "IN_PROGRESS" | "COMPLETED";

function statusLabel(status: string) {
  if (status === "PENDING_ASSIGNMENT") return "Pendiente asignación";
  if (status === "ASSIGNED") return "Asignada";
  if (status === "IN_PROGRESS") return "En progreso";
  if (status === "COMPLETED") return "Completada";
  if (status === "CANCELLED") return "Cancelada";
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
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function TaskListMobile() {
  const [statusFilter, setStatusFilter] = useState<TaskStatusFilter>("ALL");

  const queryInput = useMemo(() => {
    if (statusFilter === "ALL") {
      return {
        includeCompletedToday: true,
        take: 100,
      };
    }

    return {
      status: statusFilter,
      includeCompletedToday: true,
      take: 100,
    };
  }, [statusFilter]);

  const tasksQuery = trpc.installer.tasks.listMine.useQuery(queryInput);
  const tasks = tasksQuery.data?.tasks ?? [];
  const stats = tasksQuery.data?.stats;

  return (
    <div className="space-y-4">
      <section className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
        <MetricCard label="Pendientes" value={stats?.pending ?? 0} />
        <MetricCard label="En progreso" value={stats?.inProgress ?? 0} />
        <MetricCard label="Completadas hoy" value={stats?.completedToday ?? 0} />
        <MetricCard label="Abiertas" value={stats?.openTotal ?? 0} />
      </section>

      <section className="rounded-2xl border border-neutral-200 bg-white p-2">
        <div className="scrollbar-hide -mx-1 overflow-x-auto px-1">
          <div className="flex w-max items-center gap-2">
            {([
              { value: "ALL", label: "Resumen" },
              { value: "ASSIGNED", label: "Asignadas" },
              { value: "IN_PROGRESS", label: "En progreso" },
              { value: "COMPLETED", label: "Completadas" },
            ] as const).map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setStatusFilter(option.value)}
                className={`h-10 whitespace-nowrap rounded-xl border px-3 text-sm font-medium transition ${
                  statusFilter === option.value
                    ? "border-[#0359A8] bg-[#0359A8]/8 text-[#0359A8]"
                    : "border-neutral-200 bg-white text-neutral-600"
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
      </section>

      {tasksQuery.isLoading || tasksQuery.isRefetching ? (
        <Card>
          <div className="flex h-32 items-center justify-center">
            <RefreshCw className="h-5 w-5 animate-spin text-neutral-400" />
          </div>
        </Card>
      ) : tasks.length === 0 ? (
        <Card>
          <div className="p-6 text-center text-sm text-neutral-500">
            No hay tareas para este filtro.
          </div>
        </Card>
      ) : (
        <div className="space-y-3">
          {tasks.map((task) => (
            <Card key={task.id} className="rounded-2xl border-neutral-200 p-4">
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="inline-flex max-w-full items-center rounded-full border border-neutral-200 bg-neutral-50 px-2 py-0.5 font-mono text-[11px] font-semibold text-neutral-700">
                      <span className="truncate whitespace-nowrap">OT {task.orderCode}</span>
                    </p>
                    <p className="mt-1 truncate text-base font-semibold text-neutral-900">Cara {task.faceCode}</p>
                  </div>
                  <Badge variant={statusVariant(task.status)} className="shrink-0 whitespace-nowrap">
                    {statusLabel(task.status)}
                  </Badge>
                </div>

                <div className="space-y-1.5 text-xs text-neutral-600">
                  <p className="flex min-w-0 items-start gap-1.5">
                    <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-neutral-400" />
                    <span className="truncate">
                      {task.zoneName}, {task.provinceName}
                    </span>
                  </p>
                  <p className="truncate pl-5">{task.assetAddress || "Dirección no disponible"}</p>
                  <p className="truncate pl-5">
                    {task.organizationName || task.clientName || "Sin cliente"}
                  </p>
                  <p className="flex items-center gap-1.5 whitespace-nowrap">
                    <Clock3 className="h-3.5 w-3.5 shrink-0 text-neutral-400" />
                    Actualizado: {formatDateTime(task.updatedAt)}
                  </p>
                </div>

                <Button asChild className="h-11 w-full rounded-xl">
                  <Link href={`/installers/tasks/${task.id}`}>
                    Abrir OT
                    <ChevronRight className="ml-1 h-4 w-4" />
                  </Link>
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function MetricCard({ label, value }: { label: string; value: number }) {
  return (
    <Card className="rounded-2xl border-neutral-200 p-3">
      <p className="truncate whitespace-nowrap text-[11px] font-medium uppercase tracking-[0.08em] text-neutral-500">
        {label}
      </p>
      <p className="mt-1 text-2xl font-semibold tracking-tight text-neutral-900">{value}</p>
    </Card>
  );
}
