"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { CalendarDays, MapPin, Send, Save, CreditCard } from "lucide-react";
import { toast } from "sonner";

import { trpc } from "@/lib/trpc/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

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

export function DraftEditor({ orderId, initialOrder }: { orderId: string; initialOrder: any }) {
    const router = useRouter();
    const utils = trpc.useUtils();

    // Fetch live data (seeded with initial data from the server)
    const { data: order } = trpc.orders.get.useQuery(
        { id: orderId },
        {
            initialData: initialOrder,
            refetchOnWindowFocus: false,
        }
    );

    const [editingItem, setEditingItem] = useState<string | null>(null);
    const [editPrice, setEditPrice] = useState<string>("");
    const [editDays, setEditDays] = useState<string>("");

    const updateLineItem = trpc.orders.updateLineItem.useMutation({
        onSuccess: () => {
            utils.orders.get.invalidate({ id: orderId });
            setEditingItem(null);
            toast.success("Precio modificado correctamente.");
        },
        onError: (error) => {
            toast.error("Error al actualizar la línea", { description: error.message });
        },
    });

    const sendQuotation = trpc.orders.sendQuotation.useMutation({
        onSuccess: () => {
            utils.orders.get.invalidate({ id: orderId });
            toast.success("Cotización enviada al cliente exitosamente.");
            router.refresh();
        },
        onError: (error) => {
            toast.error("No se pudo enviar la cotización", { description: error.message });
        },
    });

    const handleEditStart = (item: any) => {
        setEditingItem(item.id);
        setEditPrice(String(item.priceDaily));
        setEditDays(String(item.days));
    };

    const handleEditSave = (itemId: string) => {
        const price = Number(editPrice);
        const days = Number(editDays);

        if (isNaN(price) || price < 0 || isNaN(days) || days < 1) {
            toast.error("Por favor ingresa valores válidos.");
            return;
        }

        updateLineItem.mutate({
            orderId,
            lineItemId: itemId,
            priceDaily: price,
            days,
        });
    };

    if (!order) return null;

    return (
        <div className="grid gap-5 lg:grid-cols-3">
            {/* Editor de Líneas */}
            <div className="lg:col-span-2 space-y-5">
                <section className="rounded-2xl border border-[#0359A8]/30 bg-white p-5 shadow-sm">
                    <div className="flex justify-between items-center mb-4 border-b border-neutral-100 pb-3">
                        <h2 className="text-sm font-semibold text-[#0359A8] flex items-center gap-2">
                            <CreditCard className="h-4 w-4" />
                            Editor de Cotización ({order.lineItems.length})
                        </h2>
                    </div>

                    <div className="space-y-4">
                        {order.lineItems.map((item: any) => {
                            const isEditing = editingItem === item.id;

                            return (
                                <div key={item.id} className="flex flex-col sm:flex-row gap-4 border-b border-neutral-100 pb-4 last:border-0 last:pb-0">
                                    <div className="flex-1 min-w-0">
                                        <h3 className="font-medium text-neutral-900 truncate pr-4">
                                            {item.face?.catalogFace?.title || `Cara ${item.face?.code} - ${item.face?.asset?.structureType?.name}`}
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
                                            <div className="mt-3 flex items-end gap-3 bg-neutral-50 p-3 rounded-xl border border-neutral-200">
                                                <div className="space-y-1.5 flex-1">
                                                    <label className="text-xs font-medium text-neutral-700">Costo diario ($)</label>
                                                    <Input
                                                        type="number"
                                                        value={editPrice}
                                                        onChange={(e) => setEditPrice(e.target.value)}
                                                        className="h-8 text-sm"
                                                        step="0.01"
                                                        min="0"
                                                    />
                                                </div>
                                                <div className="space-y-1.5 flex-[0.5]">
                                                    <label className="text-xs font-medium text-neutral-700">Días</label>
                                                    <Input
                                                        type="number"
                                                        value={editDays}
                                                        onChange={(e) => setEditDays(e.target.value)}
                                                        className="h-8 text-sm"
                                                        min="1"
                                                        step="1"
                                                    />
                                                </div>
                                                <div className="flex gap-2">
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        onClick={() => setEditingItem(null)}
                                                        className="h-8"
                                                    >
                                                        Cancelar
                                                    </Button>
                                                    <Button
                                                        size="sm"
                                                        onClick={() => handleEditSave(item.id)}
                                                        disabled={updateLineItem.isPending}
                                                        className="h-8 bg-[#0359A8]"
                                                    >
                                                        {updateLineItem.isPending ? "Guardando..." : "Guardar"}
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
                                                        className="h-8 text-[#0359A8] hover:text-[#0359A8] hover:bg-[#0359A8]/10"
                                                        onClick={() => handleEditStart(item)}
                                                    >
                                                        Editar precio
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
            </div>

            {/* Sidebar de Totales interactivo */}
            <div className="space-y-5">
                <section className="rounded-2xl border border-neutral-200/80 bg-white p-5">
                    <h2 className="mb-4 text-sm font-semibold text-neutral-900">Resumen Financiero</h2>
                    <dl className="space-y-3 text-sm">
                        <div className="flex items-center justify-between text-neutral-600">
                            <dt>Subtotal</dt>
                            <dd>{formatCurrency(String(order.subTotal))}</dd>
                        </div>
                        <div className="flex items-center justify-between text-neutral-600">
                            <dt>Impuestos (ITBMS 7%)</dt>
                            <dd>{formatCurrency(String(order.tax))}</dd>
                        </div>
                        <div className="my-3 border-t border-neutral-100" />
                        <div className="flex items-center justify-between font-semibold text-lg text-[#0359A8]">
                            <dt>Total Cotizado</dt>
                            <dd>{formatCurrency(String(order.total))}</dd>
                        </div>
                    </dl>

                    <div className="mt-6 pt-6 border-t border-neutral-100 space-y-3">
                        <Button
                            className="w-full bg-[#0359A8] hover:bg-[#024a8f]"
                            onClick={() => sendQuotation.mutate({ id: order.id })}
                            disabled={sendQuotation.isPending || editingItem !== null}
                        >
                            <Send className="mr-2 h-4 w-4" />
                            {sendQuotation.isPending ? "Enviando..." : "Enviar Cotización al Cliente"}
                        </Button>
                        <p className="text-xs text-neutral-500 text-center">
                            Al enviar la cotización, el cliente podrá verla en su dashboard y el precio quedará fijado para su aprobación.
                        </p>
                    </div>
                </section>
            </div>
        </div>
    );
}
