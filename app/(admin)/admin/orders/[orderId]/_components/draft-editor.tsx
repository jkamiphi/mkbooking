"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { inferRouterOutputs } from "@trpc/server";
import { CalendarDays, CreditCard, MapPin, Save, Send } from "lucide-react";
import { toast } from "sonner";

import { trpc } from "@/lib/trpc/client";
import type { AppRouter } from "@/lib/trpc/routers";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type RouterOutputs = inferRouterOutputs<AppRouter>;
type OrderGetOutput = RouterOutputs["orders"]["get"];
type OrderLineItem = OrderGetOutput["lineItems"][number];
type OrderServiceItem = OrderGetOutput["serviceItems"][number];

function formatDate(value: Date | null | undefined) {
  if (!value) return "No definida";
  return new Date(value).toLocaleDateString("es-PA", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatCurrency(value: string | number) {
  return new Intl.NumberFormat("es-PA", {
    style: "currency",
    currency: "USD",
  }).format(Number(value));
}

export function DraftEditor({
  orderId,
}: {
  orderId: string;
}) {
  const router = useRouter();
  const utils = trpc.useUtils();

  const { data: order } = trpc.orders.get.useQuery(
    { id: orderId },
    {
      refetchOnWindowFocus: false,
    }
  );

  const [editingLineItem, setEditingLineItem] = useState<string | null>(null);
  const [editLinePrice, setEditLinePrice] = useState<string>("");
  const [editLineDays, setEditLineDays] = useState<string>("");

  const [editingServiceItem, setEditingServiceItem] = useState<string | null>(null);
  const [editServiceQty, setEditServiceQty] = useState<string>("");
  const [editServiceUnitPrice, setEditServiceUnitPrice] = useState<string>("");

  const updateLineItem = trpc.orders.updateLineItem.useMutation({
    onSuccess: () => {
      void utils.orders.get.invalidate({ id: orderId });
      setEditingLineItem(null);
      toast.success("Línea de renta actualizada.");
    },
    onError: (error) => {
      toast.error("Error al actualizar la línea", { description: error.message });
    },
  });

  const updateServiceItem = trpc.orders.updateServiceItem.useMutation({
    onSuccess: () => {
      void utils.orders.get.invalidate({ id: orderId });
      setEditingServiceItem(null);
      toast.success("Servicio actualizado correctamente.");
    },
    onError: (error) => {
      toast.error("Error al actualizar el servicio", { description: error.message });
    },
  });

  const sendQuotation = trpc.orders.sendQuotation.useMutation({
    onSuccess: () => {
      void utils.orders.get.invalidate({ id: orderId });
      toast.success("Cotización enviada al cliente exitosamente.");
      router.refresh();
    },
    onError: (error) => {
      toast.error("No se pudo enviar la cotización", { description: error.message });
    },
  });

  const handleLineEditStart = (item: OrderLineItem) => {
    setEditingLineItem(item.id);
    setEditLinePrice(String(item.priceDaily));
    setEditLineDays(String(item.days));
  };

  const handleLineEditSave = (lineItemId: string) => {
    const priceDaily = Number(editLinePrice);
    const days = Number(editLineDays);

    if (!Number.isFinite(priceDaily) || priceDaily < 0 || !Number.isFinite(days) || days < 1) {
      toast.error("Ingresa un precio y días válidos.");
      return;
    }

    updateLineItem.mutate({
      orderId,
      lineItemId,
      priceDaily,
      days: Math.floor(days),
    });
  };

  const handleServiceEditStart = (serviceItem: OrderServiceItem) => {
    setEditingServiceItem(serviceItem.id);
    setEditServiceQty(String(serviceItem.quantity));
    setEditServiceUnitPrice(String(serviceItem.unitPrice));
  };

  const handleServiceEditSave = (serviceItemId: string) => {
    const quantity = Number(editServiceQty);
    const unitPrice = Number(editServiceUnitPrice);

    if (!Number.isFinite(quantity) || quantity < 1 || !Number.isFinite(unitPrice) || unitPrice < 0) {
      toast.error("Ingresa cantidad y precio válidos para el servicio.");
      return;
    }

    updateServiceItem.mutate({
      orderId,
      serviceItemId,
      quantity: Math.floor(quantity),
      unitPrice,
    });
  };

  if (!order) return null;

  const rentalSubtotal = order.lineItems.reduce(
    (sum, item) => sum + Number(item.subtotal),
    0
  );
  const servicesSubtotal = order.serviceItems.reduce(
    (sum, item) => sum + Number(item.subtotal),
    0
  );

  return (
    <div className="grid gap-5 lg:grid-cols-3">
      <div className="space-y-5 lg:col-span-2">
        <section className="rounded-2xl border border-[#0359A8]/30 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between border-b border-neutral-100 pb-3">
            <h2 className="flex items-center gap-2 text-sm font-semibold text-[#0359A8]">
              <CreditCard className="h-4 w-4" />
              Renta de Caras ({order.lineItems.length})
            </h2>
          </div>

          <div className="space-y-4">
            {order.lineItems.map((item) => {
              const isEditing = editingLineItem === item.id;

              return (
                <div
                  key={item.id}
                  className="flex flex-col gap-4 border-b border-neutral-100 pb-4 last:border-0 last:pb-0 sm:flex-row"
                >
                  <div className="min-w-0 flex-1">
                    <h3 className="truncate pr-4 font-medium text-neutral-900">
                      {item.face?.catalogFace?.title ||
                        `Cara ${item.face?.code} - ${item.face?.asset?.structureType?.name}`}
                    </h3>
                    <div className="mt-1 flex flex-wrap gap-2 text-xs text-neutral-500">
                      <span className="inline-flex items-center gap-1">
                        <MapPin className="h-3 w-3 text-neutral-400" />
                        {item.face?.asset?.zone?.name || "N/D"}
                      </span>
                      {order.fromDate && order.toDate && (
                        <span className="inline-flex items-center gap-1">
                          <CalendarDays className="h-3 w-3 text-neutral-400" />
                          {formatDate(order.fromDate)} - {formatDate(order.toDate)}
                        </span>
                      )}
                    </div>

                    {isEditing ? (
                      <div className="mt-3 flex items-end gap-3 rounded-xl border border-neutral-200 bg-neutral-50 p-3">
                        <div className="flex-1 space-y-1.5">
                          <label className="text-xs font-medium text-neutral-700">Costo diario ($)</label>
                          <Input
                            type="number"
                            value={editLinePrice}
                            onChange={(event) => setEditLinePrice(event.target.value)}
                            className="h-8 text-sm"
                            step="0.01"
                            min="0"
                          />
                        </div>
                        <div className="flex-[0.5] space-y-1.5">
                          <label className="text-xs font-medium text-neutral-700">Días</label>
                          <Input
                            type="number"
                            value={editLineDays}
                            onChange={(event) => setEditLineDays(event.target.value)}
                            className="h-8 text-sm"
                            min="1"
                            step="1"
                          />
                        </div>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setEditingLineItem(null)}
                            className="h-8"
                          >
                            Cancelar
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => handleLineEditSave(item.id)}
                            disabled={updateLineItem.isPending}
                            className="h-8 bg-[#0359A8]"
                          >
                            <Save className="mr-1 h-3 w-3" />
                            Guardar
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="mt-2 flex items-center justify-between text-sm">
                        <p className="text-neutral-500">
                          {formatCurrency(String(item.priceDaily))} / día x {item.days} días
                        </p>
                        <div className="flex items-center gap-4">
                          <span className="font-semibold text-neutral-900">
                            {formatCurrency(String(item.subtotal))}
                          </span>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 text-[#0359A8] hover:bg-[#0359A8]/10 hover:text-[#0359A8]"
                            onClick={() => handleLineEditStart(item)}
                          >
                            Editar
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        <section className="rounded-2xl border border-neutral-200/80 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between border-b border-neutral-100 pb-3">
            <h2 className="text-sm font-semibold text-neutral-900">
              Servicios facturables ({order.serviceItems.length})
            </h2>
          </div>

          {order.serviceItems.length === 0 ? (
            <p className="text-sm text-neutral-500">Esta orden no tiene servicios adicionales.</p>
          ) : (
            <div className="space-y-4">
              {order.serviceItems.map((item) => {
                const isEditing = editingServiceItem === item.id;

                return (
                  <div
                    key={item.id}
                    className="rounded-xl border border-neutral-100 p-3"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <h3 className="text-sm font-medium text-neutral-900">
                        {item.serviceNameSnapshot}
                      </h3>
                      <span className="text-sm font-semibold text-neutral-900">
                        {formatCurrency(String(item.subtotal))}
                      </span>
                    </div>

                    {isEditing ? (
                      <div className="mt-3 flex flex-wrap items-end gap-3 rounded-xl border border-neutral-200 bg-neutral-50 p-3">
                        <div className="space-y-1.5">
                          <label className="text-xs font-medium text-neutral-700">Cantidad</label>
                          <Input
                            type="number"
                            value={editServiceQty}
                            onChange={(event) => setEditServiceQty(event.target.value)}
                            className="h-8 w-24 text-sm"
                            min="1"
                            step="1"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-xs font-medium text-neutral-700">Precio unitario ($)</label>
                          <Input
                            type="number"
                            value={editServiceUnitPrice}
                            onChange={(event) => setEditServiceUnitPrice(event.target.value)}
                            className="h-8 w-40 text-sm"
                            min="0"
                            step="0.01"
                          />
                        </div>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setEditingServiceItem(null)}
                            className="h-8"
                          >
                            Cancelar
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => handleServiceEditSave(item.id)}
                            disabled={updateServiceItem.isPending}
                            className="h-8 bg-[#0359A8]"
                          >
                            <Save className="mr-1 h-3 w-3" />
                            Guardar
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="mt-2 flex items-center justify-between text-sm">
                        <p className="text-neutral-500">
                          {item.quantity} x {formatCurrency(String(item.unitPrice))}
                        </p>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 text-[#0359A8] hover:bg-[#0359A8]/10 hover:text-[#0359A8]"
                          onClick={() => handleServiceEditStart(item)}
                        >
                          Editar
                        </Button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>

      <div className="space-y-5">
        <section className="rounded-2xl border border-neutral-200/80 bg-white p-5">
          <h2 className="mb-4 text-sm font-semibold text-neutral-900">Resumen Financiero</h2>
          <dl className="space-y-3 text-sm">
            <div className="flex items-center justify-between text-neutral-600">
              <dt>Subtotal renta caras</dt>
              <dd>{formatCurrency(rentalSubtotal)}</dd>
            </div>
            <div className="flex items-center justify-between text-neutral-600">
              <dt>Subtotal servicios</dt>
              <dd>{formatCurrency(servicesSubtotal)}</dd>
            </div>
            <div className="flex items-center justify-between text-neutral-600">
              <dt>Subtotal general</dt>
              <dd>{formatCurrency(String(order.subTotal))}</dd>
            </div>
            <div className="flex items-center justify-between text-neutral-600">
              <dt>Impuestos (ITBMS 7%)</dt>
              <dd>{formatCurrency(String(order.tax))}</dd>
            </div>
            <div className="my-3 border-t border-neutral-100" />
            <div className="flex items-center justify-between text-lg font-semibold text-[#0359A8]">
              <dt>Total Cotizado</dt>
              <dd>{formatCurrency(String(order.total))}</dd>
            </div>
          </dl>

          <div className="mt-6 space-y-3 border-t border-neutral-100 pt-6">
            <Button
              className="w-full bg-[#0359A8] hover:bg-[#024a8f]"
              onClick={() => sendQuotation.mutate({ id: order.id })}
              disabled={
                sendQuotation.isPending ||
                editingLineItem !== null ||
                editingServiceItem !== null
              }
            >
              <Send className="mr-2 h-4 w-4" />
              {sendQuotation.isPending ? "Enviando..." : "Enviar Cotización al Cliente"}
            </Button>
            <p className="text-center text-xs text-neutral-500">
              El total enviado incluye renta de caras + servicios + ITBMS.
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}
