"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Grid3X3, List, MapPin } from "lucide-react";
import { SearchMap, type SearchMapMarker } from "./search-map";
import {
  useFaceSelection,
  type SelectedFace,
} from "@/components/face-selection-context";
import {
  PublicFaceCard,
  type PublicFaceCardData,
} from "@/components/public/public-face-card";
import { brandSoftButtonClass } from "@/components/public/brand-styles";
import { cn } from "@/lib/utils";

export type SearchResultCard = PublicFaceCardData & {
  detailHref: string;
  priceDaily: number | null;
  currency: string;
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
    priceLabel: card.priceLabel ?? null,
    priceDaily: card.priceDaily,
    currency: card.currency,
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
  const [highlightedFaceId, setHighlightedFaceId] = useState<string | null>(
    null,
  );
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
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

    card.scrollIntoView({
      behavior: "smooth",
      block: "center",
      inline: "nearest",
    });
  }, [highlightedFaceId]);

  return (
    <div className="flex flex-auto items-start">
      <div className="flex w-full flex-col lg:w-[55%] xl:w-[60%]">
        <div className="flex flex-col gap-3 border-b border-mkmedia-blue/15 bg-linear-to-r from-mkmedia-blue/8 via-white to-mkmedia-yellow/15 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <p className="text-sm text-neutral-700">
            <span className="font-semibold text-neutral-950">{total}</span>{" "}
            {total === 1 ? "espacio disponible" : "espacios disponibles"}
            {searchTerm ? (
              <span>
                {" "}
                para{" "}
                <span className="font-semibold text-mkmedia-blue">
                  &quot;{searchTerm}&quot;
                </span>
              </span>
            ) : null}
          </p>

          <div className="flex items-center gap-2 overflow-x-auto pb-0.5 scrollbar-hide">
            {isAuthenticated ? (
              <Link
                href={campaignRequestUrl}
                className={cn(
                  "whitespace-nowrap rounded-md px-3 py-1.5 text-xs font-semibold",
                  brandSoftButtonClass,
                )}
              >
                Solicitar campaña
              </Link>
            ) : (
              <Link
                href="/login"
                className="whitespace-nowrap rounded-md border border-neutral-200 bg-white px-3 py-1.5 text-xs font-semibold text-neutral-700 transition hover:bg-neutral-50"
              >
                Inicia sesión para solicitar
              </Link>
            )}

            <button
              type="button"
              onClick={() => setViewMode("grid")}
              aria-pressed={viewMode === "grid"}
              aria-label="Ver resultados en cuadrícula"
              className={cn(
                "hidden h-8 w-8 items-center justify-center rounded-lg border transition sm:flex",
                viewMode === "grid"
                  ? "border-mkmedia-blue/30 bg-white text-mkmedia-blue shadow-sm"
                  : "border-transparent bg-transparent text-neutral-400 hover:border-mkmedia-blue/20 hover:bg-white hover:text-mkmedia-blue",
              )}
            >
              <Grid3X3 className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => setViewMode("list")}
              aria-pressed={viewMode === "list"}
              aria-label="Ver resultados en lista"
              className={cn(
                "hidden h-8 w-8 items-center justify-center rounded-lg border transition sm:flex",
                viewMode === "list"
                  ? "border-mkmedia-blue/30 bg-white text-mkmedia-blue shadow-sm"
                  : "border-transparent bg-transparent text-neutral-400 hover:border-mkmedia-blue/20 hover:bg-white hover:text-mkmedia-blue",
              )}
            >
              <List className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="pb-20">
          <div
            className={cn(
              "gap-4 p-4 sm:p-6",
              viewMode === "grid"
                ? "grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3"
                : "flex flex-col",
            )}
          >
            {results.length === 0 ? (
              <div
                className={cn(
                  "flex flex-col items-center justify-center rounded-2xl border border-dashed border-mkmedia-blue/30 bg-mkmedia-blue/6 py-16 text-center",
                  viewMode === "grid" ? "col-span-full" : "w-full",
                )}
              >
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-md bg-mkmedia-blue/15">
                  <MapPin className="h-6 w-6 text-mkmedia-blue" />
                </div>
                <p className="text-sm font-semibold text-neutral-800">
                  No se encontraron espacios
                </p>
                <p className="mt-1 text-xs text-neutral-600">
                  Intenta con otra búsqueda o filtros diferentes
                </p>
              </div>
            ) : (
              results.map((face, index) => {
                const isHighlighted = highlightedFaceId === face.id;
                const isFaceSelected = isSelected(face.id);

                return (
                  <div
                    key={face.id}
                    id={`face-${face.id}`}
                    ref={(node) => {
                      if (node) {
                        cardRefs.current.set(face.id, node);
                      } else {
                        cardRefs.current.delete(face.id);
                      }
                    }}
                  >
                    <PublicFaceCard
                      face={face}
                      href={face.detailHref}
                      showPrices={showPrices}
                      layout={viewMode}
                      isSelected={isFaceSelected}
                      isHighlighted={isHighlighted}
                      onToggleSelect={() => toggleFace(toSelectedFace(face))}
                      animateDelayMs={index * 30}
                      className={viewMode === "list" ? "w-full" : undefined}
                    />
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      <div className="hidden border-l border-mkmedia-blue/15 bg-white lg:sticky lg:top-[64px] lg:block lg:h-[calc(100vh-64px)] lg:self-start lg:w-[45%] xl:w-[40%]">
        <div className="h-full w-full border-l-4 border-l-mkmedia-yellow/70">
          <SearchMap
            markers={markers}
            center={center}
            showPrices={showPrices}
            selectedId={highlightedFaceId}
            onSelect={setHighlightedFaceId}
          />
        </div>
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
