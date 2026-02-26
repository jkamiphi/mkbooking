"use client";

import { useRef, useState } from "react";
import type { inferRouterOutputs } from "@trpc/server";
import { FileText, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc/client";
import { toast } from "sonner";
import type { AppRouter } from "@/lib/trpc/routers";

type RouterOutputs = inferRouterOutputs<AppRouter>;
type PurchaseOrderItem = RouterOutputs["orders"]["getPurchaseOrders"][number];

function formatPurchaseOrderDate(value: PurchaseOrderItem["createdAt"]) {
  return new Date(value).toLocaleDateString("es-PA", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function PurchaseOrderModule({
  orderId,
  readOnly = false,
}: {
  orderId: string;
  readOnly?: boolean;
}) {
  const utils = trpc.useUtils();
  const [isUploading, setIsUploading] = useState(false);

  const purchaseOrdersQuery = trpc.orders.getPurchaseOrders.useQuery({ orderId });
  const addPurchaseOrder = trpc.orders.addPurchaseOrder.useMutation({
    onSuccess: () => {
      utils.orders.getPurchaseOrders.invalidate({ orderId });
      toast.success("OC subida exitosamente", {
        description: "La orden de compra quedó registrada en la orden.",
      });
    },
    onError: (error) => {
      toast.error("Error al subir la OC", {
        description: error.message,
      });
    },
  });

  async function handleFileUpload(file: File) {
    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) throw new Error("Upload failed");

      const blob = await response.json();
      await addPurchaseOrder.mutateAsync({
        orderId,
        fileUrl: blob.url,
        fileName: file.name,
        fileType: file.type,
        fileSize: file.size,
      });
    } catch {
      toast.error("Error al subir el archivo");
    } finally {
      setIsUploading(false);
    }
  }

  const purchaseOrders = purchaseOrdersQuery.data || [];

  return (
    <section className="rounded-2xl border border-neutral-200/80 bg-white p-5">
      <div className="mb-4 flex items-start justify-between gap-4 border-b border-neutral-100 pb-3">
        <div>
          <h2 className="text-sm font-semibold text-neutral-900">OC del Cliente</h2>
          <p className="mt-1 text-xs text-neutral-500">
            {readOnly
              ? "Documentos de orden de compra cargados por el cliente."
              : "Sube la Orden de Compra (OC) emitida por tu empresa para esta orden."}
          </p>
        </div>
        {!readOnly && (
          <UploadButton
            onUpload={handleFileUpload}
            isUploading={isUploading}
            label={purchaseOrders.length > 0 ? "Subir nueva versión" : "Subir OC"}
          />
        )}
      </div>

      {purchaseOrders.length > 0 ? (
        <div className="space-y-3">
          {purchaseOrders.map((purchaseOrder: PurchaseOrderItem, index: number) => {
            const isLatest = index === 0;
            return (
              <div
                key={purchaseOrder.id}
                className={`flex flex-wrap items-center justify-between gap-3 rounded-lg border p-3 ${
                  isLatest ? "border-primary/20 bg-primary/5" : "border-neutral-200 bg-neutral-50/70"
                }`}
              >
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded border border-neutral-200 bg-white">
                    <FileText className="h-4 w-4 text-neutral-500" />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-xs font-medium text-neutral-900">{purchaseOrder.fileName}</p>
                    <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[10px] text-neutral-500">
                      <span className="font-semibold text-primary/80">v{purchaseOrder.version}</span>
                      <span>•</span>
                      <span>{(purchaseOrder.fileSize / 1024 / 1024).toFixed(2)} MB</span>
                      <span>•</span>
                      <span>{formatPurchaseOrderDate(purchaseOrder.createdAt)}</span>
                      {purchaseOrder.uploadedBy?.user?.name && (
                        <>
                          <span>•</span>
                          <span>Por {purchaseOrder.uploadedBy.user.name}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
                <Button variant="ghost" size="sm" className="h-6 px-2 text-[10px]" asChild>
                  <a href={purchaseOrder.fileUrl} target="_blank" rel="noopener noreferrer">
                    Ver
                  </a>
                </Button>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="rounded-lg border border-dashed border-neutral-200 bg-neutral-50/50 py-6 text-center">
          <p className="text-sm text-neutral-500">Aún no hay OC cargadas para esta orden.</p>
        </div>
      )}
    </section>
  );
}

function UploadButton({
  onUpload,
  isUploading,
  label,
}: {
  onUpload: (file: File) => void;
  isUploading: boolean;
  label: string;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        accept="application/pdf,image/*"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) {
            onUpload(file);
            if (fileInputRef.current) {
              fileInputRef.current.value = "";
            }
          }
        }}
      />
      <Button
        size="sm"
        variant="outline"
        className="h-8 shrink-0 bg-white text-xs"
        onClick={() => fileInputRef.current?.click()}
        disabled={isUploading}
      >
        <Upload className="mr-1.5 h-3.5 w-3.5" />
        {isUploading ? "Subiendo..." : label}
      </Button>
    </>
  );
}
