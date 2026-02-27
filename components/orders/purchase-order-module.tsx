"use client";

import { useRef, useState } from "react";
import type { inferRouterOutputs } from "@trpc/server";
import { FileText, Upload, AlertTriangle, CheckCircle2, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc/client";
import { toast } from "sonner";
import type { AppRouter } from "@/lib/trpc/routers";
import { Badge } from "@/components/ui/badge";
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

type RouterOutputs = inferRouterOutputs<AppRouter>;
type PurchaseOrderItem = RouterOutputs["orders"]["getPurchaseOrders"][number];
type SalesReviewDecision = "APPROVED" | "CHANGES_REQUESTED";

function formatPurchaseOrderDate(value: PurchaseOrderItem["createdAt"]) {
  return new Date(value).toLocaleDateString("es-PA", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatDateTime(value: Date | string | null | undefined) {
  if (!value) return null;

  return new Date(value).toLocaleString("es-PA", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function PurchaseOrderStatusBadge({ status }: { status: string }) {
  switch (status) {
    case "APPROVED":
      return (
        <Badge variant="success" className="h-5 gap-1 px-1.5 text-[10px] shadow-sm">
          <CheckCircle2 className="h-3 w-3" /> Aprobada
        </Badge>
      );
    case "CHANGES_REQUESTED":
      return (
        <Badge variant="destructive" className="h-5 gap-1 px-1.5 text-[10px] shadow-sm">
          <AlertTriangle className="h-3 w-3" /> Requiere cambios
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

export function PurchaseOrderModule({
  orderId,
  readOnly = false,
  allowReviewActions = false,
}: {
  orderId: string;
  readOnly?: boolean;
  allowReviewActions?: boolean;
}) {
  const utils = trpc.useUtils();
  const [isUploading, setIsUploading] = useState(false);
  const [reviewingPurchaseOrder, setReviewingPurchaseOrder] = useState<PurchaseOrderItem | null>(
    null
  );
  const [reviewDecision, setReviewDecision] = useState<SalesReviewDecision>("APPROVED");
  const [reviewNotes, setReviewNotes] = useState("");

  const { data: profile } = trpc.userProfile.me.useQuery();
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

  const reviewPurchaseOrder = trpc.orders.reviewPurchaseOrder.useMutation({
    onSuccess: async () => {
      await Promise.all([
        utils.orders.getPurchaseOrders.invalidate({ orderId }),
        utils.orders.getSalesReviewTimeline.invalidate({ orderId }),
        utils.orders.get.invalidate({ id: orderId }),
      ]);
      setReviewingPurchaseOrder(null);
      setReviewNotes("");
      setReviewDecision("APPROVED");
      toast.success("Revisión de OC guardada.");
    },
    onError: (error) => {
      toast.error("No se pudo guardar la revisión", {
        description: error.message,
      });
    },
  });

  const canReview =
    allowReviewActions &&
    (profile?.systemRole === "SUPERADMIN" || profile?.systemRole === "SALES");

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

  function openReviewDialog(purchaseOrder: PurchaseOrderItem) {
    setReviewingPurchaseOrder(purchaseOrder);
    setReviewNotes(purchaseOrder.reviewNotes ?? "");
    setReviewDecision(
      purchaseOrder.reviewStatus === "CHANGES_REQUESTED" ? "CHANGES_REQUESTED" : "APPROVED"
    );
  }

  function submitReview() {
    if (!reviewingPurchaseOrder) return;

    reviewPurchaseOrder.mutate({
      purchaseOrderId: reviewingPurchaseOrder.id,
      result: reviewDecision,
      notes: reviewNotes.trim() || undefined,
    });
  }

  const purchaseOrders = purchaseOrdersQuery.data || [];

  return (
    <>
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
                        {purchaseOrder.reviewedBy?.user?.name && purchaseOrder.reviewedAt && (
                          <>
                            <span>•</span>
                            <span>
                              Revisada por {purchaseOrder.reviewedBy.user.name} (
                              {formatDateTime(purchaseOrder.reviewedAt)})
                            </span>
                          </>
                        )}
                      </div>
                      {purchaseOrder.reviewNotes && (
                        <p className="mt-1 text-[11px] text-neutral-600">Notas: {purchaseOrder.reviewNotes}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <PurchaseOrderStatusBadge status={purchaseOrder.reviewStatus} />
                    <Button variant="ghost" size="sm" className="h-6 px-2 text-[10px]" asChild>
                      <a href={purchaseOrder.fileUrl} target="_blank" rel="noopener noreferrer">
                        Ver
                      </a>
                    </Button>
                    {canReview && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-6 px-2 text-[10px]"
                        onClick={() => openReviewDialog(purchaseOrder)}
                      >
                        Revisar
                      </Button>
                    )}
                  </div>
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

      <Dialog
        open={Boolean(reviewingPurchaseOrder)}
        onOpenChange={(open) => {
          if (!open) {
            setReviewingPurchaseOrder(null);
            setReviewNotes("");
            setReviewDecision("APPROVED");
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Revisión de Orden de Compra</DialogTitle>
            <DialogDescription>
              Define el resultado de la validación comercial para esta OC y guarda notas.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-3">
              <p className="text-xs font-medium text-neutral-900">{reviewingPurchaseOrder?.fileName}</p>
              <div className="mt-1 text-[11px] text-neutral-500">
                Estado actual: <PurchaseOrderStatusBadge status={reviewingPurchaseOrder?.reviewStatus || "PENDING_REVIEW"} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <Button
                type="button"
                variant={reviewDecision === "APPROVED" ? "default" : "outline"}
                onClick={() => setReviewDecision("APPROVED")}
              >
                <CheckCircle2 className="mr-1.5 h-4 w-4" />
                Aprobar
              </Button>
              <Button
                type="button"
                variant={reviewDecision === "CHANGES_REQUESTED" ? "destructive" : "outline"}
                onClick={() => setReviewDecision("CHANGES_REQUESTED")}
              >
                <AlertTriangle className="mr-1.5 h-4 w-4" />
                Requiere cambios
              </Button>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="purchase-order-review-notes">Notas de revisión</Label>
              <Textarea
                id="purchase-order-review-notes"
                value={reviewNotes}
                onChange={(event) => setReviewNotes(event.target.value)}
                rows={4}
                placeholder="Comentario para ventas/cliente"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setReviewingPurchaseOrder(null);
                setReviewNotes("");
                setReviewDecision("APPROVED");
              }}
            >
              Cancelar
            </Button>
            <Button onClick={submitReview} disabled={reviewPurchaseOrder.isPending}>
              {reviewPurchaseOrder.isPending ? "Guardando..." : "Guardar revisión"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
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
