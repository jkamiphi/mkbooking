"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import {
  CheckCircle2,
  ChevronUp,
  Download,
  LoaderCircle,
  ShoppingCart,
  Trash2,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { useFaceSelection } from "@/components/face-selection-context";
import { brandPrimaryButtonClass } from "@/components/public/brand-styles";
import { useSession } from "@/lib/auth-client";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type SearchContext = {
  returnTo: string;
  query?: string;
  type?: string;
  zone?: string;
  from?: string;
  to?: string;
};

function decodePathParam(value: string) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function extractSearchContextFromPath(path: string) {
  const url = new URL(path, "http://localhost");
  if (!url.pathname.startsWith("/s/")) {
    return null;
  }

  const encodedQuery = url.pathname.slice(3);
  const decodedQuery = decodePathParam(encodedQuery);
  const query =
    decodedQuery && decodedQuery !== "all" ? decodedQuery : undefined;

  return {
    query,
    type: url.searchParams.get("type") || undefined,
    zone: url.searchParams.get("zone") || undefined,
    from: url.searchParams.get("from") || undefined,
    to: url.searchParams.get("to") || undefined,
    returnTo: `${url.pathname}${url.search ? url.search : ""}`,
  };
}

function parseDownloadFileName(contentDisposition: string | null) {
  if (!contentDisposition) return null;

  const utfMatch = contentDisposition.match(/filename\*=UTF-8''([^;]+)/i);
  if (utfMatch?.[1]) {
    try {
      return decodeURIComponent(utfMatch[1]);
    } catch {
      return utfMatch[1];
    }
  }

  const plainMatch = contentDisposition.match(/filename="?([^";]+)"?/i);
  return plainMatch?.[1] ?? null;
}

export function SelectionBar() {
  const { selectedFaces, selectionCount, removeFace, clearSelection } =
    useFaceSelection();
  const [isExpanded, setIsExpanded] = useState(false);
  const [isDownloadDialogOpen, setIsDownloadDialogOpen] = useState(false);
  const [isGeneratingTechnicalSheet, setIsGeneratingTechnicalSheet] =
    useState(false);
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { data: sessionData } = useSession();

  // Hide on campaign-requests pages (the form already shows selected faces)
  if (pathname.startsWith("/campaign-requests")) return null;
  if (selectionCount === 0) return null;

  const faceIdsParam = selectedFaces.map((f) => f.id).join(",");
  const activePath = `${pathname}${searchParams.toString() ? `?${searchParams.toString()}` : ""}`;
  const searchContext: SearchContext | null = (() => {
    if (pathname.startsWith("/s/")) {
      return extractSearchContextFromPath(activePath);
    }

    if (pathname.startsWith("/faces/")) {
      const fromParam = searchParams.get("from");
      if (!fromParam) return null;

      const decodedFromPath = decodePathParam(fromParam);
      if (!decodedFromPath.startsWith("/")) {
        return null;
      }

      const parsedFromSearch = extractSearchContextFromPath(decodedFromPath);
      if (!parsedFromSearch) {
        return {
          returnTo: decodedFromPath,
        };
      }

      return parsedFromSearch;
    }

    return null;
  })();

  const quoteParams = new URLSearchParams();
  quoteParams.set("faces", faceIdsParam);
  quoteParams.set("returnTo", searchContext?.returnTo || "/s/all");
  if (searchContext?.query) quoteParams.set("q", searchContext.query);
  if (searchContext?.type) quoteParams.set("type", searchContext.type);
  if (searchContext?.zone) quoteParams.set("zone", searchContext.zone);
  if (searchContext?.from) quoteParams.set("from", searchContext.from);
  if (searchContext?.to) quoteParams.set("to", searchContext.to);

  const quoteUrl = `/campaign-requests/new?${quoteParams.toString()}`;
  const canDownloadTechnicalSheet = Boolean(sessionData?.user);

  async function handleDownloadTechnicalSheet() {
    if (isGeneratingTechnicalSheet) return;

    setIsGeneratingTechnicalSheet(true);
    try {
      const params = new URLSearchParams();
      params.set("faces", faceIdsParam);

      const response = await fetch(`/api/catalog/technical-sheet?${params.toString()}`, {
        credentials: "include",
        method: "GET",
      });

      if (!response.ok) {
        let errorMessage = "No se pudo generar la ficha técnica.";
        try {
          const payload = (await response.json()) as { error?: string };
          if (payload?.error) {
            errorMessage = payload.error;
          }
        } catch {
          // Ignore invalid JSON payload and keep fallback message.
        }
        throw new Error(errorMessage);
      }

      const fileName =
        parseDownloadFileName(response.headers.get("content-disposition")) ||
        `fichas-tecnicas-${Date.now()}.pdf`;
      const fileBlob = await response.blob();
      const objectUrl = URL.createObjectURL(fileBlob);
      const link = document.createElement("a");
      link.href = objectUrl;
      link.download = fileName;
      document.body.append(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(objectUrl);

      setIsDownloadDialogOpen(false);
      toast.success("Descarga iniciada.");
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "No se pudo generar la ficha técnica.";
      toast.error("Error al descargar ficha técnica", {
        description: message,
      });
    } finally {
      setIsGeneratingTechnicalSheet(false);
    }
  }

  return (
    <>
      {/* Backdrop when expanded */}
      {isExpanded && (
        <div
          className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm"
          onClick={() => setIsExpanded(false)}
        />
      )}

      <div className="fixed bottom-5 left-0 right-0 z-50 flex justify-center pointer-events-none">
        <div
          className="flex flex-col items-center pointer-events-auto"
          style={{
            animation:
              "selectionBarSlideUp 0.35s cubic-bezier(0.22, 1, 0.36, 1) forwards",
          }}
        >
          {/* Expanded panel */}
          {isExpanded && (
            <div className="mb-2 w-[min(560px,90vw)] overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-2xl">
              <div className="flex items-center justify-between border-b border-neutral-100 px-5 py-3">
                <p className="text-sm font-semibold text-neutral-900">
                  Caras seleccionadas ({selectionCount})
                </p>
                <button
                  type="button"
                  onClick={() => setIsExpanded(false)}
                  className="flex h-7 w-7 items-center justify-center rounded-md text-neutral-400 transition hover:bg-neutral-100 hover:text-neutral-600"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="max-h-64 overflow-y-auto">
                {selectedFaces.map((face) => (
                  <div
                    key={face.id}
                    className="flex items-center gap-3 border-b border-neutral-50 px-5 py-3 last:border-b-0"
                  >
                    <div className="relative h-12 w-16 shrink-0 overflow-hidden rounded-lg bg-neutral-100">
                      {face.imageUrl ? (
                        <Image
                          src={face.imageUrl}
                          alt={face.title}
                          fill
                          sizes="64px"
                          className="object-cover"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center bg-linear-to-br from-mkmedia-yellow/20 to-mkmedia-blue/20">
                          <span className="text-[8px] font-semibold text-neutral-500">
                            {face.structureType}
                          </span>
                        </div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-neutral-900">
                        {face.title}
                      </p>
                      <p className="truncate text-xs text-neutral-500">
                        {face.location}
                        {face.priceLabel ? ` · ${face.priceLabel}/día` : ""}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeFace(face.id)}
                      className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-neutral-400 transition hover:bg-red-50 hover:text-red-500"
                      aria-label={`Quitar ${face.title}`}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Floating pill bar */}
          <div className="flex items-center gap-3 rounded-md border border-neutral-200/80 bg-white/95 px-4 py-2.5 shadow-xl shadow-black/10 backdrop-blur-xl">
            <button
              type="button"
              onClick={() => setIsExpanded(!isExpanded)}
              className="flex items-center gap-2 text-sm font-medium text-neutral-700 transition hover:text-neutral-900"
            >
              <ShoppingCart className="h-4 w-4 text-mkmedia-blue" />
              <span className="flex h-5 min-w-5 items-center justify-center rounded-md bg-mkmedia-blue px-1.5 text-[10px] font-bold text-white">
                {selectionCount}
              </span>
              <span className="hidden sm:inline">
                {selectionCount === 1 ? "cara" : "caras"}
              </span>
              <ChevronUp
                className={`h-3.5 w-3.5 text-neutral-400 transition-transform ${
                  isExpanded ? "rotate-180" : ""
                }`}
              />
            </button>

            <span className="h-5 w-px bg-neutral-200" />

            <button
              type="button"
              onClick={clearSelection}
              className="text-xs font-medium text-neutral-500 transition hover:text-neutral-700"
            >
              Limpiar
            </button>
            {canDownloadTechnicalSheet ? (
              <button
                type="button"
                onClick={() => setIsDownloadDialogOpen(true)}
                className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-mkmedia-blue/25 bg-mkmedia-blue/10 text-mkmedia-blue transition hover:border-mkmedia-blue/35 hover:bg-mkmedia-blue/15 disabled:cursor-not-allowed disabled:opacity-60"
                aria-label="Descargar ficha técnica de selección"
                disabled={isGeneratingTechnicalSheet}
              >
                {isGeneratingTechnicalSheet ? (
                  <LoaderCircle className="h-4 w-4 animate-spin" />
                ) : (
                  <Download className="h-4 w-4" />
                )}
              </button>
            ) : null}
            <Link
              href={quoteUrl}
              className={cn(
                "inline-flex items-center gap-2 rounded-md px-4 py-1.5 text-sm font-semibold",
                brandPrimaryButtonClass,
              )}
            >
              <CheckCircle2 className="h-4 w-4" />
              Solicitar cotización
            </Link>
          </div>

          <style>{`
          @keyframes selectionBarSlideUp {
            from {
              opacity: 0;
              transform: translateY(100%);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }
        `}</style>
        </div>
      </div>

      <Dialog
        open={isDownloadDialogOpen}
        onOpenChange={(nextOpen) => {
          if (isGeneratingTechnicalSheet) return;
          setIsDownloadDialogOpen(nextOpen);
        }}
      >
        <DialogContent className="rounded-md">
          <DialogHeader>
            <DialogTitle>Descargar ficha técnica</DialogTitle>
            <DialogDescription>
              Se generará un PDF multipágina con{" "}
              {selectionCount === 1
                ? "la cara seleccionada"
                : `las ${selectionCount} caras seleccionadas`}
              .
            </DialogDescription>
          </DialogHeader>

          <DialogFooter>
            <button
              type="button"
              onClick={() => setIsDownloadDialogOpen(false)}
              className="inline-flex items-center justify-center rounded-md border border-neutral-200 bg-white px-4 py-2 text-sm font-medium text-neutral-700 transition hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-60"
              disabled={isGeneratingTechnicalSheet}
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleDownloadTechnicalSheet}
              className={cn(
                "inline-flex min-w-[180px] items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-semibold",
                brandPrimaryButtonClass,
              )}
              disabled={isGeneratingTechnicalSheet}
            >
              {isGeneratingTechnicalSheet ? (
                <>
                  <LoaderCircle className="h-4 w-4 animate-spin" />
                  Generando...
                </>
              ) : (
                <>
                  <Download className="h-4 w-4" />
                  Descargar PDF
                </>
              )}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
