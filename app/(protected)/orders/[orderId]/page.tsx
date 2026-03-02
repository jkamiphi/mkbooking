import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CalendarDays, CheckCircle2, MapPin, Package } from "lucide-react";
import { TRPCError } from "@trpc/server";
import { createServerTRPCCaller } from "@/lib/trpc/server";
import { Badge } from "@/components/ui/badge";
import { ClientApprovalButton } from "./_components/client-approval-button";
import { DesignWorkspace } from "@/components/orders/design-workspace";
import { PurchaseOrderModule } from "@/components/orders/purchase-order-module";
import { OrderDetailTabs } from "./_components/order-detail-tabs";

type PageProps = {
    params: Promise<{ orderId: string }>;
};

function formatDate(value: Date | null) {
    if (!value) return "No definida";
    return value.toLocaleDateString("es-PA", {
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

const STATUS_CONFIG: Record<
    string,
    { label: string; variant: "info" | "warning" | "success" | "destructive" | "secondary"; description: string }
> = {
    DRAFT: { label: "Borrador", variant: "info", description: "Tu orden está siendo preparada." },
    QUOTATION_SENT: { label: "Cotización enviada", variant: "warning", description: "Esperando tu aprobación." },
    CLIENT_APPROVED: { label: "Aprobada por ti", variant: "secondary", description: "En revisión de la empresa." },
    CONFIRMED: { label: "Confirmada", variant: "success", description: "Tu campaña está confirmada." },
    CANCELLED: { label: "Cancelada", variant: "destructive", description: "Orden cancelada." },
};

const SALES_REVIEW_STATUS_CONFIG: Record<
    string,
    { label: string; variant: "info" | "warning" | "success" | "destructive" | "secondary" }
> = {
    NOT_STARTED: { label: "Sin revisión", variant: "secondary" },
    PENDING_REVIEW: { label: "Pendiente de ventas", variant: "warning" },
    APPROVED: { label: "Aprobada por ventas", variant: "success" },
    CHANGES_REQUESTED: { label: "Requiere cambios", variant: "destructive" },
};

export default async function OrderDetailPage({ params }: PageProps) {
    const { orderId } = await params;
    const caller = await createServerTRPCCaller();

    const order = await caller.orders.get({ id: orderId }).catch((error: unknown) => {
        if (error instanceof TRPCError && (error.code === "NOT_FOUND" || error.code === "FORBIDDEN")) {
            notFound();
        }
        throw error;
    });

    const config = STATUS_CONFIG[order.status] || STATUS_CONFIG["DRAFT"];
    const salesReviewConfig =
        SALES_REVIEW_STATUS_CONFIG[order.salesReviewStatus] ||
        SALES_REVIEW_STATUS_CONFIG["NOT_STARTED"];
    const rentalSubtotal = order.lineItems.reduce(
        (sum, item) => sum + Number(item.subtotal),
        0
    );
    const servicesSubtotal = order.serviceItems.reduce(
        (sum, item) => sum + Number(item.subtotal),
        0
    );
    const creativeLineItems = order.lineItems.map((item) => ({
        id: item.id,
        face: item.face
            ? {
                code: item.face.code,
                catalogFace: item.face.catalogFace
                    ? {
                        title: item.face.catalogFace.title,
                    }
                    : null,
                asset: item.face.asset
                    ? {
                        structureType: item.face.asset.structureType
                            ? {
                                name: item.face.asset.structureType.name,
                            }
                            : null,
                        zone: item.face.asset.zone
                            ? {
                                name: item.face.asset.zone.name,
                            }
                            : null,
                    }
                    : null,
            }
            : null,
    }));
    const detailContent = (
        <div className="space-y-5">
            <section className="rounded-2xl border border-neutral-200/80 bg-white p-5">
                <h2 className="mb-4 border-b border-neutral-100 pb-3 text-sm font-semibold text-neutral-900">
                    Detalle de Espacios ({order.lineItems.length})
                </h2>

                <div className="space-y-4">
                    {order.lineItems.map((item) => (
                        <div
                            key={item.id}
                            className="flex gap-4 border-b border-neutral-100 pb-4 last:border-0 last:pb-0"
                        >
                            <div className="relative h-16 w-20 shrink-0 overflow-hidden rounded-xl border border-neutral-200 bg-neutral-100">
                                <div className="flex h-full w-full items-center justify-center bg-neutral-50">
                                    <span className="p-1 text-center text-[10px] leading-tight font-semibold text-neutral-400">
                                        {item.face?.asset?.structureType?.name || "Cara"}
                                    </span>
                                </div>
                            </div>
                            <div className="min-w-0 flex-1">
                                <div className="flex justify-between gap-2">
                                    <h3 className="truncate font-medium text-neutral-900">
                                        {item.face?.catalogFace?.title || `Cara ${item.face?.code} - ${item.face?.asset?.structureType?.name}`}
                                    </h3>
                                    <p className="font-semibold text-neutral-900">
                                        {formatCurrency(String(item.subtotal))}
                                    </p>
                                </div>
                                <div className="mt-1 flex flex-wrap gap-2 text-xs text-neutral-500">
                                    <span className="inline-flex items-center gap-1">
                                        <MapPin className="h-3 w-3" />
                                        {item.face?.asset?.zone?.name || "N/D"}
                                    </span>
                                    {order.fromDate && order.toDate && (
                                        <span className="inline-flex items-center gap-1">
                                            <CalendarDays className="h-3 w-3" />
                                            {formatDate(order.fromDate)} - {formatDate(order.toDate)}
                                        </span>
                                    )}
                                </div>
                                <p className="mt-2 text-xs text-neutral-400">
                                    {formatCurrency(String(item.priceDaily))} / día x {item.days} días
                                </p>
                            </div>
                        </div>
                    ))}
                </div>
            </section>

            <section className="rounded-2xl border border-neutral-200/80 bg-white p-5">
                <h2 className="mb-4 border-b border-neutral-100 pb-3 text-sm font-semibold text-neutral-900">
                    Servicios facturables ({order.serviceItems.length})
                </h2>

                {order.serviceItems.length === 0 ? (
                    <p className="text-sm text-neutral-500">Sin servicios adicionales.</p>
                ) : (
                    <div className="space-y-3">
                        {order.serviceItems.map((item) => (
                            <div
                                key={item.id}
                                className="flex items-center justify-between rounded-xl border border-neutral-100 p-3"
                            >
                                <div>
                                    <p className="text-sm font-medium text-neutral-900">
                                        {item.serviceNameSnapshot}
                                    </p>
                                    <p className="mt-0.5 text-xs text-neutral-500">
                                        {item.quantity} x {formatCurrency(String(item.unitPrice))}
                                    </p>
                                </div>
                                <p className="text-sm font-semibold text-neutral-900">
                                    {formatCurrency(String(item.subtotal))}
                                </p>
                            </div>
                        ))}
                    </div>
                )}
            </section>

            {order.status !== "DRAFT" && order.status !== "CANCELLED" && (
                <PurchaseOrderModule orderId={order.id} />
            )}
        </div>
    );
    const designContent =
        order.status === "CONFIRMED" ? (
            <DesignWorkspace
                orderId={order.id}
                lineItems={creativeLineItems}
                mode="client"
                allowReviewActions={false}
            />
        ) : (
            <section className="rounded-2xl border border-neutral-200/80 bg-white p-5 text-sm text-neutral-600">
                El flujo de diseño se habilita cuando la orden está confirmada.
            </section>
        );

    return (
        <div>
            {/* Header */}
            <div className="mb-8">
                <Link
                    href="/orders"
                    className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-neutral-500 transition hover:text-neutral-700"
                >
                    <ArrowLeft className="h-3.5 w-3.5" />
                    Regresar a mis órdenes
                </Link>
                <div className="flex flex-wrap items-center gap-3">
                    <h1 className="text-2xl font-bold tracking-tight text-neutral-900">
                        Orden #{order.code}
                    </h1>
                    <Badge variant={config.variant} className="text-sm">
                        {config.label}
                    </Badge>
                </div>
                <p className="mt-1 text-sm text-neutral-500">
                    Emitida el {formatDate(order.createdAt)} · {config.description}
                </p>
            </div>

            <div className="grid gap-5 lg:grid-cols-3">
                {/* Main Content: Line items */}
                <div className="lg:col-span-2 space-y-5">
                    <OrderDetailTabs detailContent={detailContent} designContent={designContent} />
                </div>

                {/* Sidebar: Totals & Actions */}
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
                            <div className="flex items-center justify-between font-semibold text-lg text-neutral-900">
                                <dt>Total</dt>
                                <dd>{formatCurrency(String(order.total))}</dd>
                            </div>
                        </dl>

                        {order.status === "QUOTATION_SENT" && (
                            <div className="mt-6 pt-6 border-t border-neutral-100">
                                <p className="mb-4 text-xs text-neutral-500 text-center">
                                    Al aprobar esta cotización confirmas que deseas proceder con la campaña bajo estos términos.
                                </p>
                                <ClientApprovalButton orderId={order.id} />
                            </div>
                        )}

                        {order.status === "CLIENT_APPROVED" && (
                            <div className="mt-6 pt-6 border-t border-neutral-100 text-center">
                                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50 mb-3">
                                    <CheckCircle2 className="h-6 w-6 text-emerald-500" />
                                </div>
                                <h4 className="font-medium text-neutral-900">Aprobada</h4>
                                <p className="mt-1 text-xs text-neutral-500">
                                    Aprobaste esta cotización. El equipo de MK Booking está por confirmarla.
                                </p>
                            </div>
                        )}

                        {order.status === "CONFIRMED" && (
                            <div className="mt-6 pt-6 border-t border-neutral-100 text-center">
                                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50 mb-3">
                                    <Package className="h-6 w-6 text-emerald-500" />
                                </div>
                                <h4 className="font-medium text-neutral-900">Orden Confirmada</h4>
                                <p className="mt-1 text-xs text-neutral-500">
                                    Tu campaña está confirmada y bloqueada en inventario.
                                </p>
                            </div>
                        )}
                    </section>

                    <section className="rounded-2xl border border-neutral-200/80 bg-white p-5">
                        <h2 className="mb-3 text-sm font-semibold text-neutral-900">Validación de Ventas</h2>
                        <Badge variant={salesReviewConfig.variant}>{salesReviewConfig.label}</Badge>
                        <p className="mt-2 text-xs text-neutral-500">
                            Última actualización: {formatDate(order.salesReviewUpdatedAt)}
                        </p>
                        {order.salesReviewNotes && (
                            <div className="mt-3 rounded-xl border border-neutral-100 bg-neutral-50 p-3 text-xs text-neutral-700">
                                {order.salesReviewNotes}
                            </div>
                        )}
                    </section>
                </div>
            </div>
        </div>
    );
}
