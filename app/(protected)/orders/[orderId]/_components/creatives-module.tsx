"use client";

import { useState, useRef } from "react";
import type { inferRouterOutputs } from "@trpc/server";
import { Upload, FileIcon, X, CheckCircle2, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc/client";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import type { AppRouter } from "@/lib/trpc/routers";

type RouterOutputs = inferRouterOutputs<AppRouter>;
type CreativeItem = RouterOutputs["orders"]["getCreatives"][number];
type OrderLineItem = RouterOutputs["orders"]["get"]["lineItems"][number];

const ORDER_GENERAL_UPLOAD_TARGET = "order-general";

function formatCreativeDate(value: CreativeItem["createdAt"]) {
    return new Date(value).toLocaleDateString();
}

export function CreativesModule({ orderId, lineItems }: { orderId: string; lineItems: OrderLineItem[] }) {
    const utils = trpc.useUtils();
    const creativesQuery = trpc.orders.getCreatives.useQuery({ orderId });
    const addCreative = trpc.orders.addCreative.useMutation({
        onSuccess: () => {
            utils.orders.getCreatives.invalidate({ orderId });
            toast.success("Arte subido exitosamente", {
                description: "El equipo revisará el creativo y te notificará cuando sea aprobado."
            });
        },
        onError: (error) => {
            toast.error("Error al subir el arte", {
                description: error.message
            });
        }
    });

    const [uploadingTargetId, setUploadingTargetId] = useState<string | null>(null);

    async function handleFileUpload(file: File, lineItemId?: string) {
        const targetId = lineItemId || ORDER_GENERAL_UPLOAD_TARGET;
        setUploadingTargetId(targetId);
        try {
            const formData = new FormData();
            formData.append("file", file);
            const response = await fetch("/api/upload", {
                method: "POST",
                body: formData,
            });

            if (!response.ok) throw new Error("Upload failed");

            const blob = await response.json();

            await addCreative.mutateAsync({
                orderId,
                lineItemId: lineItemId || null,
                fileUrl: blob.url,
                fileName: file.name,
                fileType: file.type,
                fileSize: file.size,
            });
        } catch {
            toast.error("Error al subir el archivo");
        } finally {
            setUploadingTargetId(null);
        }
    }

    const creativesData = creativesQuery.data || [];
    const generalCreatives = creativesData.filter((creative) => !creative.lineItemId);
    const creativesByLineItem = creativesData.reduce<Record<string, CreativeItem[]>>((acc, creative) => {
        if (!creative.lineItemId) return acc;
        if (!acc[creative.lineItemId]) acc[creative.lineItemId] = [];
        acc[creative.lineItemId].push(creative);
        return acc;
    }, {});

    return (
        <section className="rounded-2xl border border-neutral-200/80 bg-white p-5 mt-6">
            <h2 className="mb-4 text-sm font-semibold text-neutral-900 border-b border-neutral-100 pb-3">
                Materiales Creativos (Artes)
            </h2>
            <div className="space-y-6">
                <div className="border border-neutral-200/80 rounded-xl p-4 bg-neutral-50/50">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
                        <div>
                            <h3 className="font-medium text-sm text-neutral-900">Artes generales de la orden</h3>
                            <p className="text-xs text-neutral-500 mt-0.5">
                                Puedes subir uno o varios artes que aplican a toda la orden.
                            </p>
                        </div>
                        <UploadButton
                            onUpload={(file) => handleFileUpload(file)}
                            isUploading={uploadingTargetId === ORDER_GENERAL_UPLOAD_TARGET}
                            label={generalCreatives.length > 0 ? "Subir otro arte" : "Subir arte general"}
                        />
                    </div>

                    {generalCreatives.length > 0 ? (
                        <div className="space-y-3">
                            {generalCreatives.map((creative, idx: number) => {
                                const isLatest = idx === 0;
                                return (
                                    <div
                                        key={creative.id}
                                        className={`flex flex-wrap items-center justify-between gap-4 p-3 rounded-lg border ${isLatest
                                            ? "border-primary/20 bg-primary/5"
                                            : "border-neutral-200 bg-white"
                                            }`}
                                    >
                                        <div className="flex items-center gap-3 overflow-hidden">
                                            <div className="h-8 w-8 rounded bg-white flex shrink-0 items-center justify-center border border-neutral-200">
                                                <FileIcon className="h-4 w-4 text-neutral-500" />
                                            </div>
                                            <div className="min-w-0">
                                                <p className="text-xs font-medium text-neutral-900 truncate">
                                                    {creative.fileName}
                                                </p>
                                                <div className="flex items-center gap-1.5 mt-0.5 text-[10px] text-neutral-500 flex-wrap">
                                                    <span className="font-semibold text-primary/80">v{creative.version}</span>
                                                    <span>•</span>
                                                    <span>{(creative.fileSize / 1024 / 1024).toFixed(2)} MB</span>
                                                    <span>•</span>
                                                    <span>{formatCreativeDate(creative.createdAt)}</span>
                                                    {creative.uploadedBy?.user?.name && (
                                                        <>
                                                            <span>•</span>
                                                            <span>Por {creative.uploadedBy.user.name}</span>
                                                        </>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="shrink-0 flex items-center gap-2">
                                            <CreativeStatusBadge status={creative.status} />
                                            <Button variant="ghost" size="sm" className="h-6 text-[10px] px-2" asChild>
                                                <a href={creative.fileUrl} target="_blank" rel="noopener noreferrer">
                                                    Ver
                                                </a>
                                            </Button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <div className="text-center py-6 bg-white rounded-lg border border-dashed border-neutral-200">
                            <p className="text-sm text-neutral-500 mb-1">Aún no hay artes generales subidos.</p>
                            <p className="text-xs text-neutral-400">Sube piezas que aplican a toda la orden.</p>
                        </div>
                    )}
                </div>

                {lineItems.map((item) => {
                    const itemCreatives = creativesByLineItem[item.id] || [];
                    const itemCreative = itemCreatives[0];
                    const hasCreative = Boolean(itemCreative);

                    return (
                        <div key={item.id} className="border border-neutral-200/80 rounded-xl p-4 bg-neutral-50/50">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
                                <div>
                                    <h3 className="font-medium text-sm text-neutral-900">
                                        {item.face?.catalogFace?.title || `Cara ${item.face?.code} - ${item.face?.asset?.structureType?.name}`}
                                    </h3>
                                    <p className="text-xs text-neutral-500 mt-0.5">
                                        {item.face?.asset?.zone?.name || "Ubicación no disponible"}
                                    </p>
                                </div>
                                <UploadButton
                                    onUpload={(file) => handleFileUpload(file, item.id)}
                                    isUploading={uploadingTargetId === item.id}
                                    disabled={hasCreative}
                                    label={hasCreative ? "Arte cargado" : "Subir arte"}
                                />
                            </div>

                            {hasCreative ? (
                                <div className="space-y-3">
                                    <div className="flex flex-wrap items-center justify-between gap-4 p-3 rounded-lg border border-primary/20 bg-primary/5">
                                        <div className="flex items-center gap-3 overflow-hidden">
                                            <div className="h-8 w-8 rounded bg-white flex shrink-0 items-center justify-center border border-neutral-200">
                                                <FileIcon className="h-4 w-4 text-neutral-500" />
                                            </div>
                                            <div className="min-w-0">
                                                <p className="text-xs font-medium text-neutral-900 truncate">
                                                    {itemCreative.fileName}
                                                </p>
                                                <div className="flex items-center gap-1.5 mt-0.5 text-[10px] text-neutral-500 flex-wrap">
                                                    <span>{(itemCreative.fileSize / 1024 / 1024).toFixed(2)} MB</span>
                                                    <span>•</span>
                                                    <span>{formatCreativeDate(itemCreative.createdAt)}</span>
                                                    {itemCreative.uploadedBy?.user?.name && (
                                                        <>
                                                            <span>•</span>
                                                            <span>Por {itemCreative.uploadedBy.user.name}</span>
                                                        </>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="shrink-0 flex items-center gap-2">
                                            <CreativeStatusBadge status={itemCreative.status} />
                                            <Button variant="ghost" size="sm" className="h-6 text-[10px] px-2" asChild>
                                                <a href={itemCreative.fileUrl} target="_blank" rel="noopener noreferrer">
                                                    Ver
                                                </a>
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="text-center py-6 bg-white rounded-lg border border-dashed border-neutral-200">
                                    <p className="text-sm text-neutral-500 mb-1">Aún no hay artes subidos para este espacio.</p>
                                    <p className="text-xs text-neutral-400">Puedes subir solo un arte para esta cara específica.</p>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </section>
    );
}

function UploadButton({
    onUpload,
    isUploading,
    label,
    disabled = false,
}: {
    onUpload: (f: File) => void;
    isUploading: boolean;
    label: string;
    disabled?: boolean;
}) {
    const fileInputRef = useRef<HTMLInputElement>(null);

    return (
        <>
            <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                accept="image/*,application/pdf"
                onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                        onUpload(file);
                        if (fileInputRef.current) fileInputRef.current.value = "";
                    }
                }}
            />
            <Button
                size="sm"
                variant="outline"
                className="h-8 text-xs shrink-0 bg-white"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading || disabled}
            >
                <Upload className="h-3.5 w-3.5 mr-1.5" />
                {isUploading ? "Subiendo..." : label}
            </Button>
        </>
    );
}

function CreativeStatusBadge({ status }: { status: string }) {
    switch (status) {
        case "APPROVED":
            return <Badge variant="success" className="text-[10px] h-5 px-1.5 gap-1 shadow-sm"><CheckCircle2 className="h-3 w-3" /> Aprobado</Badge>;
        case "REJECTED":
            return <Badge variant="destructive" className="text-[10px] h-5 px-1.5 gap-1 shadow-sm"><X className="h-3 w-3" /> Rechazado</Badge>;
        default:
            return <Badge variant="warning" className="text-[10px] h-5 px-1.5 gap-1 shadow-sm"><Clock className="h-3 w-3" /> En revisión</Badge>;
    }
}
