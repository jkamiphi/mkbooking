import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CalendarDays, ExternalLink, MapPin } from "lucide-react";
import { TRPCError } from "@trpc/server";
import { createServerTRPCCaller } from "@/lib/trpc/server";
import { Badge } from "@/components/ui/badge";
import { AdminConfirmButton } from "./_components/admin-confirm-button";
import { DraftEditor } from "./_components/draft-editor";
import { SalesReviewPanel } from "./_components/sales-review-panel";
import { DesignTaskPanel } from "./_components/design-task-panel";
import { PrintTaskPanel } from "./_components/print-task-panel";
import { AdminPageHeader, AdminPageShell } from "@/components/admin/page-shell";
import { DesignWorkspace } from "@/components/orders/design-workspace";
import { PurchaseOrderModule } from "@/components/orders/purchase-order-module";
import { PrintEvidenceModule } from "@/components/orders/print-evidence-module";
import { OrderTraceabilityPanel } from "@/components/orders/order-traceability-panel";
import { OrderCaseFilePanel } from "@/components/orders/order-case-file-panel";

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

const STATUS_CONFIG: Record<string, { label: string; variant: "info" | "warning" | "success" | "destructive" | "secondary" }> = {
    DRAFT: { label: "Borrador", variant: "info" },
    QUOTATION_SENT: { label: "Cotización enviada", variant: "warning" },
    CLIENT_APPROVED: { label: "Aprobada por cliente", variant: "secondary" },
    CONFIRMED: { label: "Confirmada", variant: "success" },
    CANCELLED: { label: "Cancelada", variant: "destructive" },
};

export default async function AdminOrderDetailPage({ params }: PageProps) {
    const { orderId } = await params;
    const caller = await createServerTRPCCaller();
    const profile = await caller.userProfile.current();

    const [order, traceability] = await Promise.all([
        caller.orders.get({ id: orderId }).catch((error: unknown) => {
            if (error instanceof TRPCError && error.code === "NOT_FOUND") {
                notFound();
            }
            throw error;
        }),
        caller.orders.getTraceability({ orderId }).catch((error: unknown) => {
            if (error instanceof TRPCError && error.code === "NOT_FOUND") {
                notFound();
            }
            throw error;
        }),
    ]);

    const config = STATUS_CONFIG[order.status] || STATUS_CONFIG["DRAFT"];
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
    const canManagePrintWorkflow =
        profile?.systemRole === "SUPERADMIN" ||
        profile?.systemRole === "STAFF" ||
        profile?.systemRole === "OPERATIONS_PRINT";

    return (
        <AdminPageShell>
            <div className="mb-4">
                <Link
                    href="/admin/orders"
                    className="inline-flex items-center gap-1.5 text-sm font-medium text-neutral-500 transition hover:text-neutral-700"
                >
                    <ArrowLeft className="h-3.5 w-3.5" />
                    Regresar a Órdenes
                </Link>
            </div>

            <AdminPageHeader
                title={`Orden ${order.code}`}
                description={`Detalle de la orden para ${order.organization?.name || "cliente desconocido"}.`}
            />

            <div className="mb-6 flex flex-wrap items-center gap-3">
                <Badge variant={config.variant} className="text-sm">
                    {config.label}
                </Badge>
                <span className="text-sm text-neutral-500">
                    Emitida el {formatDate(order.createdAt)}
                </span>
                {order.campaignRequestId && (
                    <Link
                        href={`/admin/requests/${order.campaignRequestId}`}
                        className="inline-flex items-center gap-1.5 text-sm font-medium text-blue-600 transition hover:text-blue-800"
                    >
                        <ExternalLink className="h-4 w-4" />
                        Ver Solicitud Base
                    </Link>
                )}
            </div>

            {order.status === "DRAFT" ? (
                <DraftEditor orderId={order.id} />
            ) : (
                <div className="grid gap-5 lg:grid-cols-3">
                    {/* Main Content: Line items */}
                    <div className="lg:col-span-2 space-y-5">
                        <section className="rounded-2xl border border-neutral-200/80 bg-white p-5">
                            <h2 className="mb-4 text-sm font-semibold text-neutral-900 border-b border-neutral-100 pb-3">
                                Detalle de Espacios Asignados ({order.lineItems.length})
                            </h2>

                            <div className="space-y-4">
                                {order.lineItems.map((item) => (
                                    <div key={item.id} className="flex gap-4 border-b border-neutral-100 pb-4 last:border-0 last:pb-0">
                                        <div className="flex-1 min-w-0">
                                            <div className="flex justify-between gap-2">
                                                <h3 className="font-medium text-neutral-900 truncate">
                                                    {item.face?.catalogFace?.title || `Cara ${item.face?.code} - ${item.face?.asset?.structureType?.name}`}
                                                </h3>
                                                <p className="font-semibold text-neutral-900">{formatCurrency(String(item.subtotal))}</p>
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
                                                Costo unitario: {formatCurrency(String(item.priceDaily))} / día x {item.days} días
                                            </p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </section>

                        <section className="rounded-2xl border border-neutral-200/80 bg-white p-5">
                            <h2 className="mb-4 text-sm font-semibold text-neutral-900 border-b border-neutral-100 pb-3">
                                Servicios facturables ({order.serviceItems.length})
                            </h2>

                            {order.serviceItems.length === 0 ? (
                                <p className="text-sm text-neutral-500">Sin servicios adicionales.</p>
                            ) : (
                                <div className="space-y-3">
                                    {order.serviceItems.map((item) => (
                                        <div key={item.id} className="flex items-center justify-between rounded-xl border border-neutral-100 p-3">
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

                        <OrderTraceabilityPanel traceability={traceability} />

                        <OrderCaseFilePanel traceability={traceability} />

                        {order.status === "CONFIRMED" && (
                            <DesignWorkspace
                                orderId={order.id}
                                lineItems={creativeLineItems}
                                mode="admin"
                                readOnly
                                allowReviewActions
                            />
                        )}

                        {canManagePrintWorkflow && order.status === "CONFIRMED" ? (
                            <PrintEvidenceModule orderId={order.id} />
                        ) : null}

                        <PurchaseOrderModule orderId={order.id} readOnly allowReviewActions />
                    </div>

                    {/* Sidebar: Totals & Actions */}
                    <div className="space-y-5">
                        <DesignTaskPanel orderId={order.id} />
                        {canManagePrintWorkflow ? <PrintTaskPanel orderId={order.id} /> : null}
                        {profile &&
                        ["SUPERADMIN", "STAFF", "SALES"].includes(profile.systemRole) ? (
                            <SalesReviewPanel orderId={order.id} />
                        ) : null}

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
                                    <dt>Total a facturar</dt>
                                    <dd>{formatCurrency(String(order.total))}</dd>
                                </div>
                            </dl>

                            {order.status === "CLIENT_APPROVED" && (
                                <div className="mt-6 pt-6 border-t border-neutral-100">
                                    <p className="mb-4 text-xs text-neutral-500 text-center">
                                        El cliente ya aprobó esta cotización. Al confirmar, se generarán los bloqueos
                                        activos en inventario y luego Ventas podrá validar comercialmente.
                                    </p>
                                    <AdminConfirmButton orderId={order.id} />
                                </div>
                            )}

                            {order.status === "CONFIRMED" && (
                                <div className="mt-4 rounded-xl border border-green-200 bg-green-50 p-4 text-center">
                                    <span className="block text-sm font-medium text-green-900">
                                        Orden Confirmada
                                    </span>
                                    <span className="mt-1 block text-xs text-green-700">
                                        Por {order.companyConfirmBy?.firstName} {order.companyConfirmBy?.lastName} el {formatDate(order.companyConfirmedAt)}
                                    </span>
                                    <span className="mt-1 block text-xs text-green-700">
                                        Siguiente paso: validación comercial de Ventas para habilitar Diseño.
                                    </span>
                                </div>
                            )}
                        </section>
                    </div>
                </div>
            )}
        </AdminPageShell>
    );
}
