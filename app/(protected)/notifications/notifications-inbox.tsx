"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Bell, CheckCheck, Clock3, ExternalLink } from "lucide-react";
import { trpc } from "@/lib/trpc/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

const FILTERS = [
  { value: "ALL", label: "Todas" },
  { value: "UNREAD", label: "No leidas" },
] as const;

type NotificationFilter = (typeof FILTERS)[number]["value"];

function formatDateTime(value: Date | string) {
  return new Date(value).toLocaleString("es-PA", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function notificationTypeLabel(type: string) {
  if (type === "ORDER_CONFIRMED") return "Orden confirmada";
  if (type === "SALES_REVIEW_APPROVED") return "Validacion ventas aprobada";
  if (type === "SALES_REVIEW_CHANGES_REQUESTED") return "Ventas solicito cambios";
  if (type === "DESIGN_PROOF_PUBLISHED") return "Prueba de diseno publicada";
  if (type === "DESIGN_RESPONSE_APPROVED") return "Aprobacion de diseno";
  if (type === "DESIGN_RESPONSE_CHANGES_REQUESTED") return "Cambios de diseno";
  if (type === "PRINT_STARTED") return "Impresion iniciada";
  if (type === "PRINT_COMPLETED") return "Impresion completada";
  return type;
}

export function NotificationsInbox() {
  const router = useRouter();
  const utils = trpc.useUtils();
  const [filter, setFilter] = useState<NotificationFilter>("ALL");

  const notificationsQuery = trpc.notifications.list.useQuery({
    filter,
    take: 100,
    skip: 0,
  });

  const unreadCountQuery = trpc.notifications.unreadCount.useQuery();

  const markRead = trpc.notifications.markRead.useMutation({
    onSuccess: async () => {
      await Promise.all([
        utils.notifications.list.invalidate(),
        utils.notifications.unreadCount.invalidate(),
      ]);
    },
  });

  const markAllRead = trpc.notifications.markAllRead.useMutation({
    onSuccess: async (result) => {
      await Promise.all([
        utils.notifications.list.invalidate(),
        utils.notifications.unreadCount.invalidate(),
      ]);
      if (result.updatedCount > 0) {
        toast.success(`${result.updatedCount} notificaciones marcadas como leidas.`);
      }
    },
    onError: (error) => {
      toast.error("No se pudieron marcar las notificaciones", {
        description: error.message,
      });
    },
  });

  const notifications = useMemo(
    () => notificationsQuery.data?.items ?? [],
    [notificationsQuery.data?.items]
  );

  async function openNotification(notification: {
    id: string;
    isRead: boolean;
    actionPath: string | null;
    orderId: string | null;
  }) {
    const destination =
      notification.actionPath ||
      (notification.orderId ? `/orders/${notification.orderId}` : "/orders");

    try {
      if (!notification.isRead) {
        await markRead.mutateAsync({ notificationId: notification.id });
      }
    } catch {
      // Navigation should continue even if mark-read fails.
    }

    router.push(destination);
  }

  const unreadCount = unreadCountQuery.data?.count ?? 0;

  return (
    <div className="space-y-5">
      <section className="rounded-2xl border border-neutral-200/80 bg-white p-5">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-neutral-100 pb-4">
          <div>
            <h2 className="text-sm font-semibold text-neutral-900">Bandeja in-app</h2>
            <p className="mt-1 text-xs text-neutral-500">
              Recibe avances de ventas, diseno e impresion de tus ordenes.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Badge variant={unreadCount > 0 ? "warning" : "secondary"}>
              {unreadCount} no leidas
            </Badge>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => markAllRead.mutate()}
              disabled={markAllRead.isPending || unreadCount === 0}
            >
              <CheckCheck className="mr-1.5 h-4 w-4" />
              Marcar todas
            </Button>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          {FILTERS.map((item) => (
            <button
              key={item.value}
              type="button"
              onClick={() => setFilter(item.value)}
              className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${
                filter === item.value
                  ? "bg-[#0359A8] text-white"
                  : "border border-neutral-200 bg-white text-neutral-600 hover:bg-neutral-50"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        <div className="mt-4 space-y-2">
          {notificationsQuery.isLoading ? (
            <p className="text-sm text-neutral-500">Cargando notificaciones...</p>
          ) : notifications.length === 0 ? (
            <div className="rounded-xl border border-dashed border-neutral-200 bg-neutral-50/70 p-6 text-center">
              <Bell className="mx-auto h-5 w-5 text-neutral-400" />
              <p className="mt-2 text-sm font-medium text-neutral-700">
                No tienes notificaciones
              </p>
              <p className="mt-1 text-xs text-neutral-500">
                Aqui veras nuevos hitos cuando el equipo avance tus ordenes.
              </p>
            </div>
          ) : (
            notifications.map((notification) => (
              <div
                key={notification.id}
                className={`rounded-xl border p-3 ${
                  notification.isRead
                    ? "border-neutral-200 bg-white"
                    : "border-[#0359A8]/25 bg-[#0359A8]/5"
                }`}
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-neutral-900">{notification.title}</p>
                    <p className="mt-1 text-xs text-neutral-600">{notification.message}</p>
                    <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-neutral-500">
                      <span className="inline-flex items-center gap-1">
                        <Clock3 className="h-3.5 w-3.5" />
                        {formatDateTime(notification.createdAt)}
                      </span>
                      <span>·</span>
                      <span>{notificationTypeLabel(notification.type)}</span>
                      {!notification.isRead ? (
                        <>
                          <span>·</span>
                          <span className="font-semibold text-[#0359A8]">Nueva</span>
                        </>
                      ) : null}
                    </div>
                  </div>

                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => openNotification(notification)}
                    disabled={markRead.isPending}
                  >
                    Ver orden
                    <ExternalLink className="ml-1.5 h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
