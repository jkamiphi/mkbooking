"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Check, ChevronRight, Grid3X3, List, MapPin, Plus } from "lucide-react";
import { SearchMap, type SearchMapMarker } from "./search-map";
import { useFaceSelection, type SelectedFace } from "@/components/face-selection-context";

export type SearchResultCard = {
  id: string;
  title: string;
  location: string;
  imageUrl: string | null;
  detailHref: string;
  isDigital: boolean;
  isIlluminated: boolean;
  trafficLabel: string;
  dimensionsLabel: string | null;
  areaLabel: string | null;
  priceLabel: string | null;
  structureType: string;
};

type SearchResultsViewProps = {
  total: number;
  searchTerm?: string;
  results: SearchResultCard[];
  markers: SearchMapMarker[];
  center: { lat: number; lng: number };
  showPrices: boolean;
  selectedTypeId?: string;
  selectedZoneId?: string;
  selectedFromDate?: string;
  selectedToDate?: string;
  isAuthenticated: boolean;
  searchPath: string;
};

function toSelectedFace(card: SearchResultCard): SelectedFace {
  return {
    id: card.id,
    title: card.title,
    location: card.location,
    imageUrl: card.imageUrl,
    priceLabel: card.priceLabel,
    structureType: card.structureType,
  };
}

export function SearchResultsView({
  total,
  searchTerm,
  results,
  markers,
  center,
  showPrices,
  selectedTypeId,
  selectedZoneId,
  selectedFromDate,
  selectedToDate,
  isAuthenticated,
  searchPath,
}: SearchResultsViewProps) {
  const [highlightedFaceId, setHighlightedFaceId] = useState<string | null>(null);
  const cardRefs = useRef<Map<string, HTMLElement>>(new Map());
  const { toggleFace, isSelected } = useFaceSelection();

  const campaignRequestUrl = (() => {
    const params = new URLSearchParams();
    if (searchTerm) params.set("q", searchTerm);
    if (selectedTypeId) params.set("type", selectedTypeId);
    if (selectedZoneId) params.set("zone", selectedZoneId);
    if (selectedFromDate) params.set("from", selectedFromDate);
    if (selectedToDate) params.set("to", selectedToDate);
    params.set("returnTo", searchPath);
    return `/campaign-requests/new?${params.toString()}`;
  })();

  useEffect(() => {
    if (!highlightedFaceId) return;

    const card = cardRefs.current.get(highlightedFaceId);
    if (!card) return;

    card.scrollIntoView({ behavior: "smooth", block: "center", inline: "nearest" });
  }, [highlightedFaceId]);

  return (
    <div className="flex flex-1 overflow-hidden">
      <div className="flex w-full flex-col overflow-hidden lg:w-[55%] xl:w-[60%]">
        <div className="flex items-center justify-between border-b border-neutral-100 bg-neutral-50/50 px-6 py-3">
          <p className="text-sm text-neutral-600">
            <span className="font-semibold text-neutral-900">{total}</span>{" "}
            {total === 1 ? "espacio disponible" : "espacios disponibles"}
            {searchTerm && (
              <span>
                {" "}
                para <span className="font-medium text-neutral-900">&quot;{searchTerm}&quot;</span>
              </span>
            )}
          </p>
          <div className="flex items-center gap-2">
            {isAuthenticated ? (
              <Link
                href={campaignRequestUrl}
                className="rounded-full border border-[#0359A8]/30 bg-[#0359A8]/10 px-3 py-1.5 text-xs font-semibold text-[#0359A8] transition hover:bg-[#0359A8]/15"
              >
                Solicitar campaña
              </Link>
            ) : (
              <Link
                href="/login"
                className="rounded-full border border-neutral-200 bg-white px-3 py-1.5 text-xs font-semibold text-neutral-700 transition hover:bg-neutral-50"
              >
                Inicia sesión para solicitar
              </Link>
            )}
            <button
              type="button"
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-neutral-200 bg-white text-neutral-600 transition hover:border-neutral-300"
            >
              <Grid3X3 className="h-4 w-4" />
            </button>
            <button
              type="button"
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-transparent text-neutral-400 transition hover:bg-neutral-100"
            >
              <List className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto pb-20">
          <div className="grid grid-cols-1 gap-4 p-6 sm:grid-cols-2 xl:grid-cols-3">
            {results.length === 0 ? (
              <div className="col-span-full flex flex-col items-center justify-center rounded-2xl border border-dashed border-neutral-300 bg-neutral-50 py-16 text-center">
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-neutral-200">
                  <MapPin className="h-6 w-6 text-neutral-500" />
                </div>
                <p className="text-sm font-medium text-neutral-700">No se encontraron espacios</p>
                <p className="mt-1 text-xs text-neutral-500">
                  Intenta con otra búsqueda o filtros diferentes
                </p>
              </div>
            ) : (
              results.map((face, index) => {
                const isHighlighted = highlightedFaceId === face.id;
                const isFaceSelected = isSelected(face.id);

                return (
                  <article
                    key={face.id}
                    id={`face-${face.id}`}
                    ref={(node) => {
                      if (node) {
                        cardRefs.current.set(face.id, node);
                      } else {
                        cardRefs.current.delete(face.id);
                      }
                    }}
                    className={`
                      group relative cursor-pointer overflow-hidden rounded-2xl border bg-white transition-all
                      hover:-translate-y-0.5 hover:border-neutral-300 hover:shadow-lg
                      ${isFaceSelected
                        ? "border-[#0359A8] ring-2 ring-[#0359A8]/20"
                        : isHighlighted
                          ? "border-[#0359A8]/50 ring-2 ring-[#0359A8]/30 shadow-[0_16px_32px_-20px_rgba(3,89,168,0.7)]"
                          : "border-neutral-200/90"
                      }
                    `}
                    style={{
                      animation: "fadeInUp 0.4s ease forwards",
                      animationDelay: `${index * 30}ms`,
                      opacity: 0,
                    }}
                  >
                    <Link
                      href={face.detailHref}
                      aria-label={`Ver detalles de ${face.title}`}
                      className="absolute inset-0 z-10"
                    />

                    {/* Selection toggle button */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        toggleFace(toSelectedFace(face));
                      }}
                      className={`
                        absolute right-3 top-3 z-30 flex h-8 w-8 items-center justify-center rounded-full
                        border-2 shadow-md transition-all duration-200
                        ${isFaceSelected
                          ? "border-[#0359A8] bg-[#0359A8] text-white scale-110"
                          : "border-white/90 bg-white/80 text-neutral-500 opacity-0 group-hover:opacity-100 hover:border-[#0359A8] hover:bg-[#0359A8] hover:text-white backdrop-blur-sm"
                        }
                      `}
                      aria-label={isFaceSelected ? `Quitar ${face.title} de selección` : `Agregar ${face.title} a selección`}
                    >
                      {isFaceSelected ? (
                        <Check className="h-4 w-4" strokeWidth={3} />
                      ) : (
                        <Plus className="h-4 w-4" strokeWidth={2.5} />
                      )}
                    </button>

                    <div className="relative">
                      <div className="absolute left-3 top-3 z-20 flex flex-wrap gap-1.5">
                        {face.isDigital && (
                          <span className="rounded-full bg-[#0359A8]/90 px-2 py-0.5 text-[10px] font-semibold text-white">
                            Digital
                          </span>
                        )}
                        {face.isIlluminated && (
                          <span className="rounded-full bg-[#fcb814]/90 px-2 py-0.5 text-[10px] font-semibold text-neutral-900">
                            Iluminado
                          </span>
                        )}
                        {isHighlighted && (
                          <span className="rounded-full border border-[#0359A8]/30 bg-[#0359A8]/15 px-2 py-0.5 text-[10px] font-semibold text-[#0359A8]">
                            Seleccionado en mapa
                          </span>
                        )}
                      </div>

                      {/* Selection indicator overlay at bottom of image */}
                      {isFaceSelected && (
                        <div className="absolute inset-x-0 bottom-0 z-20 bg-linear-to-t from-[#0359A8]/80 to-transparent px-3 pb-2 pt-6">
                          <span className="text-[10px] font-semibold text-white">
                            ✓ En tu selección
                          </span>
                        </div>
                      )}

                      <div className="relative aspect-4/3 overflow-hidden bg-linear-to-br from-neutral-100 to-neutral-50">
                        {face.imageUrl ? (
                          <Image
                            src={face.imageUrl}
                            alt={face.title}
                            fill
                            sizes="(max-width: 640px) 100vw, (max-width: 1280px) 50vw, 33vw"
                            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                            loading="lazy"
                          />
                        ) : (
                          <div className="flex h-full w-full flex-col items-center justify-center bg-linear-to-br from-[#fcb814]/20 to-[#0359A8]/20 p-4">
                            <span className="mb-2 rounded-full bg-white/80 px-2 py-1 text-[10px] font-semibold text-neutral-700">
                              {face.structureType}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="relative z-20 space-y-1.5 p-4">
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="line-clamp-1 text-sm font-semibold text-neutral-900">{face.title}</h3>
                        {face.dimensionsLabel && (
                          <span className="shrink-0 whitespace-nowrap rounded-full border border-neutral-200 bg-neutral-50 px-2 py-0.5 text-[10px] font-medium text-neutral-600">
                            {face.dimensionsLabel}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-neutral-500">{face.location}</p>
                      <div className="flex items-center justify-between text-xs text-neutral-400">
                        <p>Tráfico: {face.trafficLabel}</p>
                        {face.areaLabel ? <p>{face.areaLabel}</p> : null}
                      </div>

                      <div className="flex items-center justify-between border-t border-neutral-100 pt-2">
                        {showPrices ? (
                          <div>
                            <p className="text-base font-semibold text-neutral-900">
                              {face.priceLabel ?? "Consultar"}
                            </p>
                            <p className="text-[10px] text-neutral-500">por dia</p>
                          </div>
                        ) : (
                          <Link
                            href="/login"
                            className="text-xs font-medium text-[#0359A8] hover:underline"
                          >
                            Inicia sesión para ver precio
                          </Link>
                        )}
                        {showPrices ? (
                          <Link
                            href={face.detailHref}
                            className="flex items-center gap-1 rounded-full bg-[#0359A8] px-3 py-1.5 text-[10px] font-semibold text-white shadow-sm transition hover:bg-[#024a8c]"
                          >
                            Ver
                            <ChevronRight className="h-3 w-3" />
                          </Link>
                        ) : null}
                      </div>
                    </div>
                  </article>
                );
              })
            )}
          </div>
        </div>
      </div>

      <div className="hidden border-l border-neutral-200 lg:block lg:w-[45%] xl:w-[40%]">
        <SearchMap
          markers={markers}
          center={center}
          showPrices={showPrices}
          selectedId={highlightedFaceId}
          onSelect={setHighlightedFaceId}
        />
      </div>

      <style>{`
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(12px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
}
