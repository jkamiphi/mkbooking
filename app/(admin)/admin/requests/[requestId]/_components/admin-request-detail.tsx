"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { ArrowLeft, CheckCircle, PackageSearch, MessageSquareText, FileText, ChevronRight } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

import { trpc } from "@/lib/trpc/client";
import { Card, CardContent } from "@/components/ui/card";
import { SelectNative } from "@/components/ui/select-native";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { AdminPageHeader, AdminPageShell } from "@/components/admin/page-shell";

const statusOptions = [
    "NEW",
    "IN_REVIEW",
    "QUOTATION_GENERATED",
    "PROPOSAL_SENT",
    "CONFIRMED",
    "REJECTED",
] as const;

function statusLabel(status: string) {
    if (status === "NEW") return "Nueva";
    if (status === "IN_REVIEW") return "En revisión";
    if (status === "QUOTATION_GENERATED") return "Cotización generada";
    if (status === "PROPOSAL_SENT") return "Propuesta enviada";
    if (status === "CONFIRMED") return "Confirmada";
    if (status === "REJECTED") return "Rechazada";
    return status;
}

function statusBadgeVariant(status: string) {
    if (status === "NEW") return "info" as const;
    if (status === "IN_REVIEW") return "warning" as const;
    if (status === "QUOTATION_GENERATED") return "warning" as const;
    if (status === "PROPOSAL_SENT") return "secondary" as const;
    if (status === "CONFIRMED") return "success" as const;
    return "destructive" as const;
}

export function AdminRequestDetail({ requestId }: { requestId: string }) {
    const router = useRouter();
    const utils = trpc.useUtils();

    const [statusDraft, setStatusDraft] = useState<string>("IN_REVIEW");
    const [assignedFaceIds, setAssignedFaceIds] = useState<string[]>([]);
    const [hasInitializedFaces, setHasInitializedFaces] = useState(false);

    const { data: request, isLoading } = trpc.catalog.requests.get.useQuery(
        { requestId },
        {
            refetchOnWindowFocus: false,
        }
    );

    const { data: suggestions, isLoading: isSuggestionsLoading } = trpc.catalog.requests.suggestFaces.useQuery(
        { requestId, take: 50 },
        { enabled: Boolean(request) }
    );

    // Initialize selected faces on load
    useEffect(() => {
        if (request && !hasInitializedFaces) {
            setStatusDraft(request.status);
            setAssignedFaceIds(request.assignments.map((a: any) => a.faceId));
            setHasInitializedFaces(true);
        }
    }, [request, hasInitializedFaces]);

    const updateStatus = trpc.catalog.requests.updateStatus.useMutation({
        onSuccess: () => {
            utils.catalog.requests.get.invalidate({ requestId });
            toast.success("Estado actualizado exitosamente");
        },
        onError: (error) => {
            toast.error("No se pudo actualizar el estado", { description: error.message });
        },
    });

    const generateOrder = trpc.orders.generateFromRequest.useMutation({
        onSuccess: (order) => {
            utils.catalog.requests.get.invalidate({ requestId });
            toast.success("Cotización generada", {
                description: `Se ha creado el borrador de orden ${order.code}.`,
            });
            router.push(`/admin/orders/${order.id}`);
        },
        onError: (error) => {
            toast.error("Error al generar cotización", { description: error.message });
        },
    });

    const confirmRequest = trpc.catalog.requests.confirm.useMutation({
        onSuccess: (result) => {
            utils.catalog.requests.list.invalidate();
            utils.catalog.holds.list.invalidate();
            toast.success("Solicitud confirmada", {
                description: `Holds creados: ${result.createdHolds}. Omitidos por hold activo: ${result.skippedActiveHolds}.`,
            });
        },
        onError: (error) => {
            toast.error("No se pudo confirmar la solicitud", { description: error.message });
        },
    });

    const assignFaces = trpc.catalog.requests.assignFaces.useMutation({
        onSuccess: () => {
            utils.catalog.requests.get.invalidate({ requestId });
            toast.success("Asignaciones guardadas");
        },
        onError: (error) => {
            toast.error("No se pudieron guardar las asignaciones", { description: error.message });
        },
    });

    function toggleFace(faceId: string, checked: boolean) {
        if (checked) {
            setAssignedFaceIds((prev) => (prev.includes(faceId) ? prev : [...prev, faceId]));
        } else {
            setAssignedFaceIds((prev) => prev.filter((id) => id !== faceId));
        }
    }

    function handleSaveAssignments() {
        assignFaces.mutate({
            requestId,
            faceIds: assignedFaceIds,
        });
    }

    if (isLoading) {
        return (
            <AdminPageShell>
                <div className="flex h-64 items-center justify-center">
                    <div className="h-6 w-6 animate-spin rounded-full border-2 border-neutral-300 border-t-[#0359A8]" />
                </div>
            </AdminPageShell>
        );
    }

    if (!request) {
        return (
            <AdminPageShell>
                <div className="flex h-[400px] flex-col items-center justify-center text-center">
                    <PackageSearch className="mb-4 h-10 w-10 text-neutral-300" />
                    <h3 className="text-lg font-semibold text-neutral-900">Solicitud no encontrada</h3>
                    <p className="mt-2 text-sm text-neutral-500 max-w-md">
                        La solicitud {requestId} no existe o no tienes permisos para verla.
                    </p>
                    <Button variant="outline" className="mt-6" asChild>
                        <Link href="/admin/requests">Volver a Solicitudes</Link>
                    </Button>
                </div>
            </AdminPageShell>
        );
    }

    return (
        <AdminPageShell>
            <div className="mb-4">
                <Link
                    href="/admin/requests"
                    className="inline-flex items-center gap-1.5 text-sm font-medium text-neutral-500 transition hover:text-neutral-700"
                >
                    <ArrowLeft className="h-3.5 w-3.5" />
                    Regresar a Solicitudes
                </Link>
            </div>

            <div className="flex flex-col gap-2 md:flex-row md:items-center">
                <AdminPageHeader
                    title={`Solicitud ${request.id.slice(0, 8).toUpperCase()}`}
                    description={`Creada el ${format(new Date(request.createdAt), "dd de MMMM, yyyy", { locale: es })}`}
                />
                <div className="-mt-4 mb-4 md:mt-0 md:ml-4">
                    <Badge variant={statusBadgeVariant(request.status)}>
                        {statusLabel(request.status)}
                    </Badge>
                </div>
            </div>

            <div className="mt-6 grid gap-6 xl:grid-cols-3">
                {/* Left Column: Request Details & General Actions */}
                <div className="space-y-6 xl:col-span-1">
                    <Card>
                        <CardContent className="space-y-4 pt-6">
                            <h3 className="text-sm font-semibold text-neutral-900 border-b border-neutral-100 pb-2">
                                Detalles de Contacto
                            </h3>
                            <div>
                                <p className="text-sm font-medium text-neutral-900">
                                    {request.createdBy?.user?.name || "Usuario Anónimo"}
                                </p>
                                <p className="text-xs text-neutral-500">
                                    {request.createdBy?.user?.email || request.contactEmail}
                                </p>
                            </div>

                            <h3 className="text-sm font-semibold text-neutral-900 border-b border-neutral-100 pb-2 mt-6">
                                Requerimiento
                            </h3>
                            <ul className="space-y-2 text-sm text-neutral-700">
                                <li className="flex justify-between">
                                    <span className="text-neutral-500">Cantidad:</span>
                                    <span className="font-medium text-neutral-900">
                                        {request.quantity} cara{request.quantity === 1 ? "" : "s"}
                                    </span>
                                </li>
                                <li className="flex justify-between">
                                    <span className="text-neutral-500">Tipo:</span>
                                    <span className="font-medium text-neutral-900 text-right">
                                        {request.structureType?.name || "Cualquier tipo"}
                                    </span>
                                </li>
                                <li className="flex justify-between">
                                    <span className="text-neutral-500">Zona:</span>
                                    <span className="font-medium text-neutral-900 text-right">
                                        {request.zone ? `${request.zone.name}, ${request.zone.province.name}` : "Cualquier zona"}
                                    </span>
                                </li>
                                <li className="flex justify-between">
                                    <span className="text-neutral-500">Fechas:</span>
                                    <span className="font-medium text-neutral-900 text-right">
                                        {request.fromDate && request.toDate
                                            ? `${format(new Date(request.fromDate), "dd MMM")} - ${format(new Date(request.toDate), "dd MMM yy", { locale: es })}`
                                            : "No definidas"}
                                    </span>
                                </li>
                            </ul>

                            {request.notes && (
                                <div className="mt-4 rounded-xl border border-neutral-100 bg-neutral-50 p-3">
                                    <div className="flex items-center gap-1.5 text-xs font-medium text-neutral-500 mb-1">
                                        <MessageSquareText className="h-3.5 w-3.5" />
                                        Notas del usuario
                                    </div>
                                    <p className="text-sm text-neutral-700 whitespace-pre-wrap">{request.notes}</p>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    <Card>
                        <CardContent className="space-y-4 pt-6">
                            <h3 className="text-sm font-semibold text-neutral-900 border-b border-neutral-100 pb-2">
                                Acciones Administrativas
                            </h3>

                            <div className="space-y-3">
                                <div className="flex gap-2">
                                    <SelectNative
                                        className="flex-1"
                                        value={statusDraft}
                                        onChange={(e) => setStatusDraft(e.target.value)}
                                    >
                                        {statusOptions.map((status) => (
                                            <option key={status} value={status}>
                                                {statusLabel(status)}
                                            </option>
                                        ))}
                                    </SelectNative>
                                    <Button
                                        variant="outline"
                                        onClick={() => updateStatus.mutate({ requestId, status: statusDraft as any })}
                                        disabled={updateStatus.isPending || statusDraft === request.status}
                                    >
                                        Actualizar
                                    </Button>
                                </div>

                                <div className="pt-4 border-t border-neutral-100 flex flex-col gap-2">
                                    {request.status === "IN_REVIEW" && assignedFaceIds.length > 0 && (
                                        <Button
                                            className="w-full bg-[#0359A8]"
                                            onClick={() => generateOrder.mutate({ requestId })}
                                            disabled={generateOrder.isPending}
                                        >
                                            <FileText className="mr-2 h-4 w-4" />
                                            Generar Cotización (Orden)
                                        </Button>
                                    )}

                                    {request.status === "QUOTATION_GENERATED" && (request as any).order && (
                                        <Button asChild className="w-full" variant="outline">
                                            <Link href={`/admin/orders/${(request as any).order.id}`}>
                                                Revisar Cotización Generada
                                            </Link>
                                        </Button>
                                    )}

                                    <Button
                                        variant="secondary"
                                        className="w-full"
                                        onClick={() => confirmRequest.mutate({ requestId })}
                                        disabled={confirmRequest.isPending || assignedFaceIds.length === 0}
                                    >
                                        <CheckCircle className="mr-2 h-4 w-4" />
                                        Confirmar Directamente
                                    </Button>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Right Column: Face Assignment Selection */}
                <div className="xl:col-span-2">
                    <Card>
                        <CardContent className="pt-6">
                            <div className="flex items-center justify-between border-b border-neutral-100 pb-4 mb-4">
                                <div>
                                    <h3 className="text-base font-semibold text-neutral-900">
                                        Sugerencias y Asignación de Caras
                                    </h3>
                                    <p className="text-xs text-neutral-500 mt-1">
                                        Selecciona las caras que deseas vincular a la solicitud.
                                    </p>
                                </div>

                                <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={handleSaveAssignments}
                                    disabled={assignFaces.isPending || isSuggestionsLoading}
                                >
                                    <CheckCircle className="mr-2 h-4 w-4 text-emerald-600" />
                                    Guardar {assignedFaceIds.length} Asignaciones
                                </Button>
                            </div>

                            {isSuggestionsLoading ? (
                                <div className="flex h-40 items-center justify-center">
                                    <div className="h-6 w-6 animate-spin rounded-full border-2 border-neutral-300 border-t-[#0359A8]" />
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[600px] overflow-y-auto pr-2">
                                    {suggestions?.map((face: any) => {
                                        const isChecked = assignedFaceIds.includes(face.id);

                                        return (
                                            <label
                                                key={face.id}
                                                className={`group flex cursor-pointer items-start gap-3 rounded-xl border p-3 transition ${isChecked
                                                    ? "border-[#0359A8] bg-[#0359A8]/5"
                                                    : "border-neutral-200 bg-white hover:border-[#0359A8]/50 hover:bg-neutral-50"
                                                    }`}
                                            >
                                                <Checkbox
                                                    className="mt-1"
                                                    checked={isChecked}
                                                    onCheckedChange={(val) => toggleFace(face.id, Boolean(val))}
                                                />
                                                <div className="min-w-0 flex-1">
                                                    <p className="font-semibold text-neutral-900 truncate">
                                                        {face.title || face.assetCode + " - " + face.code}
                                                    </p>
                                                    <div className="mt-1 flex flex-wrap gap-2 text-xs text-neutral-500">
                                                        <span className="whitespace-nowrap">{face.structureType}</span>
                                                        <span>·</span>
                                                        <span className="truncate">{face.zone}</span>
                                                    </div>
                                                </div>
                                            </label>
                                        );
                                    })}

                                    {!suggestions?.length && (
                                        <div className="col-span-full py-12 text-center text-neutral-500 bg-neutral-50 rounded-xl border border-dashed">
                                            No hay sugerencias para esta solicitud.<br />Intenta ajustar la zona o el tipo en el catálogo general.
                                        </div>
                                    )}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>
        </AdminPageShell>
    );
}
