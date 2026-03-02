"use client";

import { useState } from "react";
import { AlertTriangle, CheckCircle2, History } from "lucide-react";
import { trpc } from "@/lib/trpc/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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

type SalesReviewDecision = "APPROVED" | "CHANGES_REQUESTED";

function salesReviewStatusLabel(status: string) {
  if (status === "NOT_STARTED") return "Sin revisión";
  if (status === "PENDING_REVIEW") return "Pendiente";
  if (status === "APPROVED") return "Aprobada";
  if (status === "CHANGES_REQUESTED") return "Requiere cambios";
  return status;
}

function salesReviewStatusVariant(
  status: string
): "info" | "warning" | "success" | "destructive" | "secondary" {
  if (status === "NOT_STARTED") return "secondary";
  if (status === "PENDING_REVIEW") return "warning";
  if (status === "APPROVED") return "success";
  if (status === "CHANGES_REQUESTED") return "destructive";
  return "info";
}

function eventLabel(eventType: string) {
  if (eventType === "REVIEW_REQUIRED") return "Revisión requerida";
  if (eventType === "DOCUMENT_APPROVED") return "Documento aprobado";
  if (eventType === "DOCUMENT_CHANGES_REQUESTED") return "Documento requiere cambios";
  if (eventType === "ORDER_APPROVED") return "Validación comercial aprobada";
  if (eventType === "ORDER_CHANGES_REQUESTED") return "Validación comercial requiere cambios";
  if (eventType === "CRITICAL_CHANGE") return "Cambio crítico";
  if (eventType === "ORDER_CONFIRMED_WITHOUT_SALES_APPROVAL") {
    return "Confirmada sin aprobación comercial";
  }
  return eventType;
}

function formatDateTime(value: Date | string | null | undefined) {
  if (!value) return "N/A";
  return new Date(value).toLocaleString("es-PA", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function SalesReviewPanel({ orderId }: { orderId: string }) {
  const utils = trpc.useUtils();
  const { data: me } = trpc.userProfile.me.useQuery();
  const { data: order } = trpc.orders.get.useQuery({ id: orderId });
  const timelineQuery = trpc.orders.getSalesReviewTimeline.useQuery({ orderId });

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [decision, setDecision] = useState<SalesReviewDecision>("APPROVED");
  const [notes, setNotes] = useState("");

  const canConfirmSalesReview =
    me?.systemRole === "SUPERADMIN" || me?.systemRole === "SALES";

  const confirmSalesReview = trpc.orders.confirmSalesReview.useMutation({
    onSuccess: async () => {
      await Promise.all([
        utils.orders.get.invalidate({ id: orderId }),
        utils.orders.getSalesReviewTimeline.invalidate({ orderId }),
        utils.design.byOrder.invalidate({ orderId }),
        utils.design.inbox.list.invalidate(),
      ]);
      setIsDialogOpen(false);
      setNotes("");
      setDecision("APPROVED");
      toast.success("Validación comercial actualizada.");
    },
    onError: (error) => {
      toast.error("No se pudo guardar la validación", {
        description: error.message,
      });
    },
  });

  if (!order) {
    return null;
  }

  const isOrderConfirmed = order.status === "CONFIRMED";
  const isSalesReviewApproved = order.salesReviewStatus === "APPROVED";

  return (
    <>
      <section className="rounded-2xl border border-neutral-200/80 bg-white p-5">
        <div className="mb-4 flex items-center justify-between border-b border-neutral-100 pb-3">
          <h2 className="text-sm font-semibold text-neutral-900">Validación de Ventas</h2>
          <Badge variant={salesReviewStatusVariant(order.salesReviewStatus)}>
            {salesReviewStatusLabel(order.salesReviewStatus)}
          </Badge>
        </div>

        <div className="space-y-3 text-sm">
          <div className="flex items-center justify-between text-neutral-600">
            <span>Última actualización</span>
            <span className="font-medium text-neutral-900">
              {formatDateTime(order.salesReviewUpdatedAt)}
            </span>
          </div>
          <div className="flex items-center justify-between text-neutral-600">
            <span>Revisado por</span>
            <span className="font-medium text-neutral-900">
              {order.salesReviewBy
                ? [order.salesReviewBy.firstName, order.salesReviewBy.lastName]
                    .filter(Boolean)
                    .join(" ")
                : "Sin asignar"}
            </span>
          </div>
          <div className="flex items-center justify-between text-neutral-600">
            <span>Versión revisión</span>
            <span className="font-medium text-neutral-900">{order.salesReviewVersion}</span>
          </div>
          {order.salesReviewNotes && (
            <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-3 text-xs text-neutral-700">
              {order.salesReviewNotes}
            </div>
          )}
        </div>

        {canConfirmSalesReview ? (
          <div className="mt-4 border-t border-neutral-100 pt-4">
            {isSalesReviewApproved ? (
              <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-800">
                Validación comercial aprobada.
              </div>
            ) : (
              <Button
                className="w-full"
                onClick={() => setIsDialogOpen(true)}
                disabled={!isOrderConfirmed}
              >
                Confirmar validación comercial
              </Button>
            )}
            {!isOrderConfirmed && !isSalesReviewApproved ? (
              <p className="mt-2 text-xs text-amber-700">
                Debes confirmar la orden antes de validar comercialmente.
              </p>
            ) : null}
          </div>
        ) : null}

        <div className="mt-6 border-t border-neutral-100 pt-4">
          <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-neutral-500">
            <History className="h-3.5 w-3.5" />
            Historial
          </div>
          {timelineQuery.isLoading ? (
            <div className="py-4 text-xs text-neutral-500">Cargando historial...</div>
          ) : timelineQuery.data && timelineQuery.data.length > 0 ? (
            <div className="space-y-2">
              {timelineQuery.data.map((event) => (
                <div key={event.id} className="rounded-lg border border-neutral-100 p-2.5">
                  <p className="text-xs font-medium text-neutral-900">{eventLabel(event.eventType)}</p>
                  <p className="mt-0.5 text-[11px] text-neutral-500">
                    {formatDateTime(event.createdAt)} ·{" "}
                    {event.actor
                      ? [event.actor.firstName, event.actor.lastName].filter(Boolean).join(" ") ||
                        event.actor.user?.name ||
                        event.actor.user?.email
                      : "Sistema"}
                  </p>
                  {event.notes && <p className="mt-1 text-[11px] text-neutral-700">{event.notes}</p>}
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-lg border border-dashed border-neutral-200 p-3 text-xs text-neutral-500">
              Aún no hay eventos de validación comercial.
            </div>
          )}
        </div>
      </section>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmación de Ventas</DialogTitle>
            <DialogDescription>
              Registra el resultado de revisión comercial con trazabilidad para esta orden.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <Button
                type="button"
                variant={decision === "APPROVED" ? "default" : "outline"}
                onClick={() => setDecision("APPROVED")}
              >
                <CheckCircle2 className="mr-1.5 h-4 w-4" />
                Aprobar
              </Button>
              <Button
                type="button"
                variant={decision === "CHANGES_REQUESTED" ? "destructive" : "outline"}
                onClick={() => setDecision("CHANGES_REQUESTED")}
              >
                <AlertTriangle className="mr-1.5 h-4 w-4" />
                Requiere cambios
              </Button>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="sales-review-notes">Notas</Label>
              <Textarea
                id="sales-review-notes"
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                rows={4}
                placeholder="Observaciones para trazabilidad y cliente"
              />
              {decision === "CHANGES_REQUESTED" ? (
                <p className="text-[11px] text-neutral-500">
                  Debes incluir notas cuando el resultado requiere cambios.
                </p>
              ) : null}
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setIsDialogOpen(false);
                setNotes("");
                setDecision("APPROVED");
              }}
            >
              Cancelar
            </Button>
            <Button
              onClick={() =>
                confirmSalesReview.mutate({
                  orderId,
                  result: decision,
                  notes: notes.trim() || undefined,
                })
              }
              disabled={confirmSalesReview.isPending || !isOrderConfirmed}
            >
              {confirmSalesReview.isPending ? "Guardando..." : "Guardar resultado"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
