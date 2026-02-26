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

export function CreativesModule({
  orderId,
  lineItems,
  readOnly = false,
}: {
  orderId: string;
  lineItems: OrderLineItem[];
  readOnly?: boolean;
}) {
  const utils = trpc.useUtils();
  const creativesQuery = trpc.orders.getCreatives.useQuery({ orderId });
  const addCreative = trpc.orders.addCreative.useMutation({
    onSuccess: () => {
      utils.orders.getCreatives.invalidate({ orderId });
      toast.success("Arte subido exitosamente", {
        description: "El equipo revisará el creativo y te notificará cuando sea aprobado.",
      });
    },
    onError: (error) => {
      toast.error("Error al subir el arte", {
        description: error.message,
      });
    },
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
    <section className="mt-6 rounded-2xl border border-neutral-200/80 bg-white p-5">
      <h2 className="mb-4 border-b border-neutral-100 pb-3 text-sm font-semibold text-neutral-900">
        Materiales Creativos (Artes)
      </h2>
      <div className="space-y-6">
        <div className="rounded-xl border border-neutral-200/80 bg-neutral-50/50 p-4">
          <div className="mb-4 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
            <div>
              <h3 className="text-sm font-medium text-neutral-900">Artes generales de la orden</h3>
              <p className="mt-0.5 text-xs text-neutral-500">
                Puedes subir uno o varios artes que aplican a toda la orden.
              </p>
            </div>
            {!readOnly && (
              <UploadButton
                onUpload={(file) => handleFileUpload(file)}
                isUploading={uploadingTargetId === ORDER_GENERAL_UPLOAD_TARGET}
                label={generalCreatives.length > 0 ? "Subir otro arte" : "Subir arte general"}
              />
            )}
          </div>

          {generalCreatives.length > 0 ? (
            <div className="space-y-3">
              {generalCreatives.map((creative, idx: number) => {
                const isLatest = idx === 0;
                return (
                  <div
                    key={creative.id}
                    className={`flex flex-wrap items-center justify-between gap-4 rounded-lg border p-3 ${
                      isLatest ? "border-primary/20 bg-primary/5" : "border-neutral-200 bg-white"
                    }`}
                  >
                    <div className="flex items-center gap-3 overflow-hidden">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded border border-neutral-200 bg-white">
                        <FileIcon className="h-4 w-4 text-neutral-500" />
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-xs font-medium text-neutral-900">{creative.fileName}</p>
                        <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[10px] text-neutral-500">
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
                    <div className="flex shrink-0 items-center gap-2">
                      <CreativeStatusBadge status={creative.status} />
                      <Button variant="ghost" size="sm" className="h-6 px-2 text-[10px]" asChild>
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
            <div className="rounded-lg border border-dashed border-neutral-200 bg-white py-6 text-center">
              <p className="mb-1 text-sm text-neutral-500">Aún no hay artes generales subidos.</p>
              <p className="text-xs text-neutral-400">Sube piezas que aplican a toda la orden.</p>
            </div>
          )}
        </div>

        {lineItems.map((item) => {
          const itemCreatives = creativesByLineItem[item.id] || [];
          const itemCreative = itemCreatives[0];
          const hasCreative = Boolean(itemCreative);

          return (
            <div key={item.id} className="rounded-xl border border-neutral-200/80 bg-neutral-50/50 p-4">
              <div className="mb-4 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                <div>
                  <h3 className="text-sm font-medium text-neutral-900">
                    {item.face?.catalogFace?.title ||
                      `Cara ${item.face?.code} - ${item.face?.asset?.structureType?.name}`}
                  </h3>
                  <p className="mt-0.5 text-xs text-neutral-500">
                    {item.face?.asset?.zone?.name || "Ubicación no disponible"}
                  </p>
                </div>
                {!readOnly && (
                  <UploadButton
                    onUpload={(file) => handleFileUpload(file, item.id)}
                    isUploading={uploadingTargetId === item.id}
                    disabled={hasCreative}
                    label={hasCreative ? "Arte cargado" : "Subir arte"}
                  />
                )}
              </div>

              {hasCreative ? (
                <div className="space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-4 rounded-lg border border-primary/20 bg-primary/5 p-3">
                    <div className="flex items-center gap-3 overflow-hidden">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded border border-neutral-200 bg-white">
                        <FileIcon className="h-4 w-4 text-neutral-500" />
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-xs font-medium text-neutral-900">{itemCreative.fileName}</p>
                        <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[10px] text-neutral-500">
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
                    <div className="flex shrink-0 items-center gap-2">
                      <CreativeStatusBadge status={itemCreative.status} />
                      <Button variant="ghost" size="sm" className="h-6 px-2 text-[10px]" asChild>
                        <a href={itemCreative.fileUrl} target="_blank" rel="noopener noreferrer">
                          Ver
                        </a>
                      </Button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="rounded-lg border border-dashed border-neutral-200 bg-white py-6 text-center">
                  <p className="mb-1 text-sm text-neutral-500">Aún no hay artes subidos para este espacio.</p>
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
        className="h-8 shrink-0 bg-white text-xs"
        onClick={() => fileInputRef.current?.click()}
        disabled={isUploading || disabled}
      >
        <Upload className="mr-1.5 h-3.5 w-3.5" />
        {isUploading ? "Subiendo..." : label}
      </Button>
    </>
  );
}

function CreativeStatusBadge({ status }: { status: string }) {
  switch (status) {
    case "APPROVED":
      return (
        <Badge variant="success" className="h-5 gap-1 px-1.5 text-[10px] shadow-sm">
          <CheckCircle2 className="h-3 w-3" /> Aprobado
        </Badge>
      );
    case "REJECTED":
      return (
        <Badge variant="destructive" className="h-5 gap-1 px-1.5 text-[10px] shadow-sm">
          <X className="h-3 w-3" /> Rechazado
        </Badge>
      );
    default:
      return (
        <Badge variant="warning" className="h-5 gap-1 px-1.5 text-[10px] shadow-sm">
          <Clock className="h-3 w-3" /> En revisión
        </Badge>
      );
  }
}
