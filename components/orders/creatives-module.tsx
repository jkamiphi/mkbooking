"use client";

import { useMemo, useRef, useState } from "react";
import type { inferRouterOutputs } from "@trpc/server";
import {
  Upload,
  FileIcon,
  X,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Link2,
  WandSparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc/client";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import type { AppRouter } from "@/lib/trpc/routers";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

type RouterOutputs = inferRouterOutputs<AppRouter>;
type CreativeItem = RouterOutputs["orders"]["getCreatives"][number];
export type CreativeLineItem = {
  id: string;
  face: {
    code: string;
    catalogFace: { title: string | null } | null;
    asset: {
      structureType: { name: string } | null;
      zone: { name: string } | null;
    } | null;
  } | null;
};
type SalesReviewDecision = "APPROVED" | "CHANGES_REQUESTED";
type UploadKind = "CLIENT_ARTWORK" | "DESIGN_PROOF";
type DesignerDecision = "APPROVED" | "CHANGES_REQUESTED";

type UrlUploadContext = {
  open: boolean;
  kind: UploadKind;
  lineItemId: string | null;
};

const ORDER_GENERAL_UPLOAD_TARGET = "order-general";

function formatCreativeDate(value: CreativeItem["createdAt"]) {
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

function designEventLabel(eventType: string) {
  if (eventType === "TASK_CREATED") return "Tarea creada";
  if (eventType === "TASK_CLAIMED") return "Tarea tomada";
  if (eventType === "STATUS_CHANGED") return "Cambio de estado";
  if (eventType === "PROOF_UPLOADED") return "Prueba publicada";
  if (eventType === "CLIENT_APPROVED") return "Cliente aprueba";
  if (eventType === "CLIENT_CHANGES_REQUESTED") return "Cliente solicita cambios";
  if (eventType === "DESIGNER_APPROVED") return "Diseno aprueba";
  if (eventType === "DESIGNER_CHANGES_REQUESTED") return "Diseno solicita cambios";
  return eventType;
}

function resolveExternalFileName(url: string, fallback: string) {
  try {
    const parsed = new URL(url);
    const lastPathSegment = parsed.pathname.split("/").filter(Boolean).pop();
    if (lastPathSegment && lastPathSegment.trim().length > 0) {
      return decodeURIComponent(lastPathSegment);
    }

    return parsed.hostname;
  } catch {
    return fallback;
  }
}

function isHttpsUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "https:";
  } catch {
    return false;
  }
}

export function CreativesModule({
  orderId,
  lineItems,
  readOnly = false,
  allowReviewActions = false,
  mode = "client",
}: {
  orderId: string;
  lineItems: CreativeLineItem[];
  readOnly?: boolean;
  allowReviewActions?: boolean;
  mode?: "designer" | "client" | "admin";
}) {
  const utils = trpc.useUtils();
  const { data: profile } = trpc.userProfile.me.useQuery();
  const creativesQuery = trpc.orders.getCreatives.useQuery({ orderId });
  const taskQuery = trpc.design.byOrder.useQuery({ orderId });
  const hasPublishedProof = (creativesQuery.data ?? []).some(
    (creative) => creative.creativeKind === "DESIGN_PROOF"
  );

  const isDesignReviewer =
    profile?.systemRole === "SUPERADMIN" ||
    profile?.systemRole === "STAFF" ||
    profile?.systemRole === "DESIGNER";
  const isDesignTaskBlockedBySales = Boolean(taskQuery.data?.isBlockedBySales);
  const isDesignerSurface = mode === "designer";
  const isClientSurface = mode === "client";
  const isAdminSurface = mode === "admin";

  const canReviewClientArtwork =
    allowReviewActions &&
    isDesignReviewer &&
    !isDesignTaskBlockedBySales &&
    (isDesignerSurface || isAdminSurface);
  const canUploadProofs = isDesignReviewer && !isDesignTaskBlockedBySales && !readOnly;
  const isClientArtworkLocked =
    isClientSurface && (Boolean(taskQuery.data?.clientArtworkLocked) || hasPublishedProof);
  const canUploadClientArtwork =
    !readOnly &&
    !isDesignerSurface &&
    (!isClientSurface || Boolean(taskQuery.data?.canClientUploadArtwork ?? true));
  const canDesignerRespondToProof =
    isDesignerSurface && isDesignReviewer && !isDesignTaskBlockedBySales;

  const addCreative = trpc.orders.addCreative.useMutation({
    onSuccess: async () => {
      await Promise.all([
        utils.orders.getCreatives.invalidate({ orderId }),
        utils.design.byOrder.invalidate({ orderId }),
      ]);
      toast.success("Arte subido exitosamente", {
        description: "El equipo de diseño revisará el creativo y dejará trazabilidad.",
      });
    },
    onError: (error) => {
      toast.error("Error al subir el arte", {
        description: error.message,
      });
    },
  });

  const uploadProof = trpc.design.proofs.upload.useMutation({
    onSuccess: async () => {
      await Promise.all([
        utils.orders.getCreatives.invalidate({ orderId }),
        utils.design.byOrder.invalidate({ orderId }),
        utils.design.inbox.list.invalidate(),
      ]);
      toast.success("Prueba de color publicada.");
    },
    onError: (error) => {
      toast.error("No se pudo publicar la prueba", {
        description: error.message,
      });
    },
  });

  const reviewCreative = trpc.orders.reviewCreative.useMutation({
    onSuccess: async () => {
      await Promise.all([
        utils.orders.getCreatives.invalidate({ orderId }),
        utils.orders.get.invalidate({ id: orderId }),
        utils.design.byOrder.invalidate({ orderId }),
      ]);
      setReviewingCreative(null);
      setReviewNotes("");
      setReviewDecision("APPROVED");
      toast.success("Revisión de arte guardada.");
    },
    onError: (error) => {
      toast.error("No se pudo guardar la revisión", {
        description: error.message,
      });
    },
  });

  const clientDecision = trpc.design.proofs.clientDecision.useMutation({
    onSuccess: async () => {
      await Promise.all([
        utils.design.byOrder.invalidate({ orderId }),
        utils.design.inbox.list.invalidate(),
      ]);
      setProofDecisionDialogOpen(false);
      setProofDecisionNotes("");
      toast.success("Respuesta del cliente registrada.");
    },
    onError: (error) => {
      toast.error("No se pudo registrar tu respuesta", {
        description: error.message,
      });
    },
  });

  const designerDecision = trpc.design.proofs.designerDecision.useMutation({
    onSuccess: async () => {
      await Promise.all([
        utils.design.byOrder.invalidate({ orderId }),
        utils.design.inbox.list.invalidate(),
      ]);
      setDesignerDecisionDialogOpen(false);
      setDesignerDecisionNotes("");
      toast.success("Respuesta de diseno registrada.");
    },
    onError: (error) => {
      toast.error("No se pudo registrar la respuesta de diseno", {
        description: error.message,
      });
    },
  });

  const [uploadingTargetId, setUploadingTargetId] = useState<string | null>(null);
  const [reviewingCreative, setReviewingCreative] = useState<CreativeItem | null>(null);
  const [reviewDecision, setReviewDecision] = useState<SalesReviewDecision>("APPROVED");
  const [reviewNotes, setReviewNotes] = useState("");

  const [urlContext, setUrlContext] = useState<UrlUploadContext>({
    open: false,
    kind: "CLIENT_ARTWORK",
    lineItemId: null,
  });
  const [urlValue, setUrlValue] = useState("");
  const [urlLabel, setUrlLabel] = useState("");

  const [proofDecisionDialogOpen, setProofDecisionDialogOpen] = useState(false);
  const [proofDecisionType, setProofDecisionType] = useState<"APPROVED" | "CHANGES_REQUESTED">(
    "APPROVED"
  );
  const [proofDecisionNotes, setProofDecisionNotes] = useState("");
  const [designerDecisionDialogOpen, setDesignerDecisionDialogOpen] = useState(false);
  const [designerDecisionType, setDesignerDecisionType] = useState<DesignerDecision>("APPROVED");
  const [designerDecisionNotes, setDesignerDecisionNotes] = useState("");

  const creativesData = useMemo(() => creativesQuery.data ?? [], [creativesQuery.data]);

  const clientArtworks = useMemo(
    () => creativesData.filter((creative) => creative.creativeKind === "CLIENT_ARTWORK"),
    [creativesData]
  );
  const proofs = useMemo(
    () => creativesData.filter((creative) => creative.creativeKind === "DESIGN_PROOF"),
    [creativesData]
  );

  const generalCreatives = clientArtworks.filter((creative) => !creative.lineItemId);
  const creativesByLineItem = clientArtworks.reduce<Record<string, CreativeItem[]>>(
    (acc, creative) => {
      if (!creative.lineItemId) return acc;
      if (!acc[creative.lineItemId]) acc[creative.lineItemId] = [];
      acc[creative.lineItemId].push(creative);
      return acc;
    },
    {}
  );

  async function uploadClientArtworkFile(file: File, lineItemId?: string) {
    const targetId = lineItemId || ORDER_GENERAL_UPLOAD_TARGET;
    setUploadingTargetId(targetId);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("scope", "orders-creative");

      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Upload failed");
      }

      const blob = await response.json();
      await addCreative.mutateAsync({
        orderId,
        lineItemId: lineItemId || null,
        fileUrl: blob.url,
        fileName: file.name,
        fileType: file.type,
        fileSize: file.size,
        sourceType: "FILE_UPLOAD",
      });
    } catch {
      toast.error("Error al subir el archivo");
    } finally {
      setUploadingTargetId(null);
    }
  }

  function openUrlDialog(kind: UploadKind, lineItemId: string | null = null) {
    setUrlContext({
      open: true,
      kind,
      lineItemId,
    });
    setUrlValue("");
    setUrlLabel("");
  }

  async function submitExternalUrl() {
    const normalizedUrl = urlValue.trim();
    if (!isHttpsUrl(normalizedUrl)) {
      toast.error("La URL debe ser https:// válida.");
      return;
    }

    const resolvedName =
      urlLabel.trim() ||
      resolveExternalFileName(
        normalizedUrl,
        urlContext.kind === "DESIGN_PROOF" ? "Prueba externa" : "Arte externo"
      );

    setUploadingTargetId(
      urlContext.kind === "DESIGN_PROOF"
        ? "design-proof"
        : urlContext.lineItemId || ORDER_GENERAL_UPLOAD_TARGET
    );

    try {
      if (urlContext.kind === "DESIGN_PROOF") {
        await uploadProof.mutateAsync({
          orderId,
          fileUrl: normalizedUrl,
          fileName: resolvedName,
          fileType: "text/uri-list",
          fileSize: 0,
          sourceType: "EXTERNAL_URL",
        });
      } else {
        await addCreative.mutateAsync({
          orderId,
          lineItemId: urlContext.lineItemId,
          fileUrl: normalizedUrl,
          fileName: resolvedName,
          fileType: "text/uri-list",
          fileSize: 0,
          sourceType: "EXTERNAL_URL",
        });
      }

      setUrlContext((prev) => ({ ...prev, open: false }));
      setUrlValue("");
      setUrlLabel("");
    } catch {
      // handled by mutation
    } finally {
      setUploadingTargetId(null);
    }
  }

  function openReviewDialog(creative: CreativeItem) {
    setReviewingCreative(creative);
    setReviewNotes(creative.reviewNotes ?? "");
    setReviewDecision(creative.status === "REJECTED" ? "CHANGES_REQUESTED" : "APPROVED");
  }

  function submitReview() {
    if (!reviewingCreative) return;

    reviewCreative.mutate({
      creativeId: reviewingCreative.id,
      result: reviewDecision,
      notes: reviewNotes.trim() || undefined,
    });
  }

  function submitProofDecision() {
    if (proofDecisionType === "CHANGES_REQUESTED" && proofDecisionNotes.trim().length === 0) {
      toast.error("Incluye comentarios para solicitar ajustes.");
      return;
    }

    clientDecision.mutate({
      orderId,
      decision: proofDecisionType,
      notes: proofDecisionNotes.trim() || undefined,
    });
  }

  function submitDesignerDecision() {
    if (designerDecisionType === "CHANGES_REQUESTED" && designerDecisionNotes.trim().length === 0) {
      toast.error("Incluye comentarios para solicitar ajustes.");
      return;
    }

    designerDecision.mutate({
      orderId,
      decision: designerDecisionType,
      notes: designerDecisionNotes.trim() || undefined,
    });
  }

  const latestProof = proofs[0] ?? null;
  const canClientRespondToProof =
    profile !== undefined &&
    !isDesignReviewer &&
    !readOnly &&
    !isDesignTaskBlockedBySales &&
    Boolean(latestProof);
  const designTimeline = taskQuery.data?.events ?? [];

  return (
    <>
      <section className="mt-6 rounded-2xl border border-neutral-200/80 bg-white p-5">
        <h2 className="mb-4 border-b border-neutral-100 pb-3 text-sm font-semibold text-neutral-900">
          Materiales Creativos (Artes)
        </h2>

        <div className="space-y-6">
          {isClientArtworkLocked ? (
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
              Ya hay una prueba de diseño publicada; ahora solo puedes aprobarla o solicitar
              ajustes.
            </div>
          ) : null}

          <div className="rounded-xl border border-neutral-200/80 bg-neutral-50/50 p-4">
            <div className="mb-4 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
              <div>
                <h3 className="text-sm font-medium text-neutral-900">Artes del cliente (generales)</h3>
                <p className="mt-0.5 text-xs text-neutral-500">
                  Archivo o URL pública (Dropbox, Drive u otro enlace seguro).
                </p>
              </div>
              {canUploadClientArtwork ? (
                <div className="flex gap-2">
                  <UploadButton
                    onUpload={(file) => uploadClientArtworkFile(file)}
                    isUploading={uploadingTargetId === ORDER_GENERAL_UPLOAD_TARGET}
                    label={generalCreatives.length > 0 ? "Subir otro archivo" : "Subir archivo"}
                  />
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 bg-white text-xs"
                    onClick={() => openUrlDialog("CLIENT_ARTWORK")}
                    disabled={uploadingTargetId === ORDER_GENERAL_UPLOAD_TARGET}
                  >
                    <Link2 className="mr-1.5 h-3.5 w-3.5" />
                    Agregar URL
                  </Button>
                </div>
              ) : null}
            </div>

            <CreativeList
              creatives={generalCreatives}
              canReview={canReviewClientArtwork}
              onReview={openReviewDialog}
            />
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

                  {canUploadClientArtwork ? (
                    <div className="flex gap-2">
                      <UploadButton
                        onUpload={(file) => uploadClientArtworkFile(file, item.id)}
                        isUploading={uploadingTargetId === item.id}
                        disabled={hasCreative}
                        label={hasCreative ? "Arte cargado" : "Subir archivo"}
                      />
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 bg-white text-xs"
                        onClick={() => openUrlDialog("CLIENT_ARTWORK", item.id)}
                        disabled={hasCreative || uploadingTargetId === item.id}
                      >
                        <Link2 className="mr-1.5 h-3.5 w-3.5" />
                        Agregar URL
                      </Button>
                    </div>
                  ) : null}
                </div>

                <CreativeList
                  creatives={itemCreative ? [itemCreative] : []}
                  canReview={canReviewClientArtwork}
                  onReview={openReviewDialog}
                  emptyTitle="Aún no hay arte cargado para este espacio."
                />
              </div>
            );
          })}

          <div className="rounded-xl border border-neutral-200/80 bg-neutral-50/50 p-4">
            <div className="mb-4 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
              <div>
                <h3 className="text-sm font-medium text-neutral-900">Pruebas de color (diseño)</h3>
                <p className="mt-0.5 text-xs text-neutral-500">
                  El equipo de diseño publica aquí las pruebas para aprobación del cliente.
                </p>
              </div>

              {canUploadProofs ? (
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 bg-white text-xs"
                    onClick={() => openUrlDialog("DESIGN_PROOF")}
                    disabled={uploadingTargetId === "design-proof"}
                  >
                    <Link2 className="mr-1.5 h-3.5 w-3.5" />
                    URL prueba
                  </Button>
                </div>
              ) : null}
            </div>

            {taskQuery.data ? (
              <div className="mb-3 rounded-lg border border-neutral-200 bg-white px-3 py-2 text-xs text-neutral-600">
                Estado de tarea: <span className="font-medium text-neutral-900">{taskQuery.data.status}</span>
                <span className="mx-2">·</span>
                SLA: <span className="font-medium text-neutral-900">{formatDateTime(taskQuery.data.slaDueAt)}</span>
                {taskQuery.data.isBlockedBySales ? (
                  <>
                    <span className="mx-2">·</span>
                    <span className="font-medium text-amber-700">Bloqueada por Ventas</span>
                  </>
                ) : null}
              </div>
            ) : null}

            {isDesignReviewer && isDesignTaskBlockedBySales ? (
              <div className="mb-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
                Se habilita al aprobar validacion de Ventas.
              </div>
            ) : null}

            <CreativeList
              creatives={proofs}
              canReview={false}
              onReview={() => undefined}
              emptyTitle="Aún no hay pruebas de color publicadas."
            />

            {canClientRespondToProof ? (
              <div className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 p-3">
                <p className="text-xs text-emerald-900">
                  Ya puedes aprobar la prueba de color o solicitar ajustes.
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    onClick={() => {
                      setProofDecisionType("APPROVED");
                      setProofDecisionDialogOpen(true);
                    }}
                  >
                    Aprobar prueba
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setProofDecisionType("CHANGES_REQUESTED");
                      setProofDecisionDialogOpen(true);
                    }}
                  >
                    Solicitar ajustes
                  </Button>
                </div>
              </div>
            ) : null}

            {canDesignerRespondToProof && latestProof ? (
              <div className="mt-4 rounded-lg border border-blue-200 bg-blue-50 p-3">
                <p className="text-xs text-blue-900">
                  Puedes marcar aprobacion final de diseno o solicitar ajustes adicionales.
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    onClick={() => {
                      setDesignerDecisionType("APPROVED");
                      setDesignerDecisionDialogOpen(true);
                    }}
                  >
                    Aprobar como diseno
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setDesignerDecisionType("CHANGES_REQUESTED");
                      setDesignerDecisionDialogOpen(true);
                    }}
                  >
                    Solicitar cambios
                  </Button>
                </div>
              </div>
            ) : null}
          </div>

          {designTimeline.length > 0 ? (
            <div className="rounded-xl border border-neutral-200/80 bg-neutral-50/50 p-4">
              <h3 className="mb-3 text-sm font-medium text-neutral-900">Discusion y trazabilidad</h3>
              <div className="space-y-2">
                {designTimeline.slice(0, 12).map((event) => (
                  <div key={event.id} className="rounded-lg border border-neutral-200 bg-white p-3">
                    <p className="text-xs font-medium text-neutral-900">
                      {designEventLabel(event.eventType)}
                    </p>
                    <p className="mt-0.5 text-[11px] text-neutral-500">
                      {formatDateTime(event.createdAt)} ·{" "}
                      {event.actor
                        ? event.actor.user?.name ||
                          event.actor.user?.email ||
                          "Usuario"
                        : "Sistema"}
                    </p>
                    {event.notes ? (
                      <p className="mt-1 text-[11px] text-neutral-700">{event.notes}</p>
                    ) : null}
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      </section>

      <Dialog
        open={Boolean(reviewingCreative)}
        onOpenChange={(open) => {
          if (!open) {
            setReviewingCreative(null);
            setReviewNotes("");
            setReviewDecision("APPROVED");
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Revisión de arte cliente</DialogTitle>
            <DialogDescription>
              Define el resultado de revisión para este creativo y deja notas para trazabilidad.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-3">
              <p className="text-xs font-medium text-neutral-900">{reviewingCreative?.fileName}</p>
              <p className="mt-1 text-[11px] text-neutral-500">
                Resultado actual: <CreativeStatusBadge status={reviewingCreative?.status || "PENDING"} />
              </p>
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
              <Label htmlFor="creative-review-notes">Notas de revisión</Label>
              <Textarea
                id="creative-review-notes"
                value={reviewNotes}
                onChange={(event) => setReviewNotes(event.target.value)}
                rows={4}
                placeholder="Comentario para trazabilidad"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setReviewingCreative(null);
                setReviewNotes("");
                setReviewDecision("APPROVED");
              }}
            >
              Cancelar
            </Button>
            <Button onClick={submitReview} disabled={reviewCreative.isPending}>
              {reviewCreative.isPending ? "Guardando..." : "Guardar revisión"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={urlContext.open}
        onOpenChange={(open) => {
          if (!open) {
            setUrlContext((prev) => ({ ...prev, open: false }));
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {urlContext.kind === "DESIGN_PROOF" ? "Agregar URL de prueba" : "Agregar URL de arte"}
            </DialogTitle>
            <DialogDescription>
              Usa un enlace público seguro con formato https:// para registrar el material.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="creative-url">URL</Label>
              <Input
                id="creative-url"
                value={urlValue}
                onChange={(event) => setUrlValue(event.target.value)}
                placeholder="https://..."
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="creative-url-label">Nombre visible (opcional)</Label>
              <Input
                id="creative-url-label"
                value={urlLabel}
                onChange={(event) => setUrlLabel(event.target.value)}
                placeholder="Ej: Arte final Dropbox"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setUrlContext((prev) => ({ ...prev, open: false }))}
            >
              Cancelar
            </Button>
            <Button
              onClick={submitExternalUrl}
              disabled={addCreative.isPending || uploadProof.isPending}
            >
              Guardar URL
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={proofDecisionDialogOpen} onOpenChange={setProofDecisionDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {proofDecisionType === "APPROVED"
                ? "Aprobar prueba de color"
                : "Solicitar ajustes de prueba"}
            </DialogTitle>
            <DialogDescription>
              Esta decisión actualiza el estado de la tarea de diseño de la orden.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-1.5">
            <Label htmlFor="proof-decision-notes">Notas {proofDecisionType === "CHANGES_REQUESTED" ? "(requeridas)" : "(opcionales)"}</Label>
            <Textarea
              id="proof-decision-notes"
              value={proofDecisionNotes}
              onChange={(event) => setProofDecisionNotes(event.target.value)}
              rows={4}
              placeholder={
                proofDecisionType === "CHANGES_REQUESTED"
                  ? "Indica qué ajustes necesitas"
                  : "Comentario opcional para el equipo"
              }
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setProofDecisionDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={submitProofDecision} disabled={clientDecision.isPending}>
              {clientDecision.isPending ? "Guardando..." : "Confirmar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={designerDecisionDialogOpen} onOpenChange={setDesignerDecisionDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {designerDecisionType === "APPROVED"
                ? "Aprobacion final de diseno"
                : "Solicitud de cambios de diseno"}
            </DialogTitle>
            <DialogDescription>
              Esta decision forma parte de la aprobacion dual cliente-diseno.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-1.5">
            <Label htmlFor="designer-decision-notes">
              Notas {designerDecisionType === "CHANGES_REQUESTED" ? "(requeridas)" : "(opcionales)"}
            </Label>
            <Textarea
              id="designer-decision-notes"
              value={designerDecisionNotes}
              onChange={(event) => setDesignerDecisionNotes(event.target.value)}
              rows={4}
              placeholder={
                designerDecisionType === "CHANGES_REQUESTED"
                  ? "Indica el ajuste requerido al cliente"
                  : "Comentario opcional de cierre"
              }
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setDesignerDecisionDialogOpen(false)}
            >
              Cancelar
            </Button>
            <Button onClick={submitDesignerDecision} disabled={designerDecision.isPending}>
              {designerDecision.isPending ? "Guardando..." : "Confirmar"}
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
        onChange={(event) => {
          const file = event.target.files?.[0];
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

function CreativeList({
  creatives,
  canReview,
  onReview,
  emptyTitle = "Aún no hay archivos cargados.",
}: {
  creatives: CreativeItem[];
  canReview: boolean;
  onReview: (creative: CreativeItem) => void;
  emptyTitle?: string;
}) {
  if (creatives.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-neutral-200 bg-white py-6 text-center">
        <p className="text-sm text-neutral-500">{emptyTitle}</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {creatives.map((creative, idx) => {
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
                {creative.creativeKind === "DESIGN_PROOF" ? (
                  <WandSparkles className="h-4 w-4 text-neutral-500" />
                ) : (
                  <FileIcon className="h-4 w-4 text-neutral-500" />
                )}
              </div>
              <div className="min-w-0">
                <p className="truncate text-xs font-medium text-neutral-900">{creative.fileName}</p>
                <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[10px] text-neutral-500">
                  <span className="font-semibold text-primary/80">v{creative.version}</span>
                  <span>•</span>
                  <span>
                    {creative.sourceType === "EXTERNAL_URL"
                      ? "URL externa"
                      : `${(creative.fileSize / 1024 / 1024).toFixed(2)} MB`}
                  </span>
                  <span>•</span>
                  <span>{formatCreativeDate(creative.createdAt)}</span>
                  {creative.uploadedBy?.user?.name && (
                    <>
                      <span>•</span>
                      <span>Por {creative.uploadedBy.user.name}</span>
                    </>
                  )}
                  {creative.reviewedBy?.user?.name && creative.reviewedAt && (
                    <>
                      <span>•</span>
                      <span>
                        Revisado por {creative.reviewedBy.user.name} ({formatDateTime(creative.reviewedAt)})
                      </span>
                    </>
                  )}
                </div>
                {creative.reviewNotes && (
                  <p className="mt-1 text-[11px] text-neutral-600">Notas: {creative.reviewNotes}</p>
                )}
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <CreativeStatusBadge status={creative.status} />
              <Button variant="ghost" size="sm" className="h-6 px-2 text-[10px]" asChild>
                <a href={creative.fileUrl} target="_blank" rel="noopener noreferrer">
                  Ver
                </a>
              </Button>
              {canReview && creative.creativeKind === "CLIENT_ARTWORK" ? (
                <Button
                  variant="outline"
                  size="sm"
                  className="h-6 px-2 text-[10px]"
                  onClick={() => onReview(creative)}
                >
                  Revisar
                </Button>
              ) : null}
            </div>
          </div>
        );
      })}
    </div>
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
          <X className="h-3 w-3" /> Requiere cambios
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
