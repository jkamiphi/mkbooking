"use client";

import Image from "next/image";
import Link from "next/link";
import { Check, ChevronRight, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  brandPrimaryBadgeClass,
  brandPrimaryButtonClass,
  brandSecondaryBadgeClass,
} from "@/components/public/brand-styles";

export interface PublicFaceCardData {
  id: string;
  title: string;
  location: string;
  imageUrl: string | null;
  structureType: string;
  isDigital: boolean;
  isIlluminated: boolean;
  dimensionsLabel?: string | null;
  areaLabel?: string | null;
  trafficLabel?: string | null;
  priceLabel?: string | null;
}

interface PublicFaceCardProps {
  face: PublicFaceCardData;
  href: string;
  showPrices: boolean;
  layout?: "grid" | "list";
  isSelected?: boolean;
  isHighlighted?: boolean;
  highlightedLabel?: string;
  onToggleSelect?: () => void;
  selectLabel?: string;
  unselectLabel?: string;
  ctaLabel?: string;
  className?: string;
  animateDelayMs?: number;
}

export function PublicFaceCard({
  face,
  href,
  showPrices,
  layout = "grid",
  isSelected = false,
  isHighlighted = false,
  highlightedLabel = "Seleccionado en mapa",
  onToggleSelect,
  selectLabel,
  unselectLabel,
  ctaLabel = "Ver detalle",
  className,
  animateDelayMs,
}: PublicFaceCardProps) {
  const hasSelectionToggle = typeof onToggleSelect === "function";

  return (
    <article
      className={cn(
        "group relative cursor-pointer overflow-hidden rounded-2xl border bg-white transition-all",
        layout === "list" ? "flex min-h-[220px]" : "",
        "hover:-translate-y-0.5 hover:border-mkmedia-blue/30 hover:shadow-lg",
        isSelected
          ? "border-mkmedia-blue ring-2 ring-mkmedia-blue/20"
          : isHighlighted
            ? "border-mkmedia-blue/45 ring-2 ring-mkmedia-blue/25 shadow-[0_16px_32px_-20px_rgba(3,89,168,0.7)]"
            : "border-neutral-200/90",
        className,
      )}
      style={
        typeof animateDelayMs === "number"
          ? {
              animation: "fadeInUp 0.4s ease forwards",
              animationDelay: `${animateDelayMs}ms`,
              opacity: 0,
            }
          : undefined
      }
    >
      <Link
        href={href}
        aria-label={`Ver detalles de ${face.title}`}
        className="absolute inset-0 z-10"
      />

      {hasSelectionToggle ? (
        <button
          type="button"
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            onToggleSelect();
          }}
          className={cn(
            "absolute right-3 top-3 z-30 flex h-8 w-8 items-center justify-center rounded-full border-2 shadow-md transition-all duration-200",
            isSelected
              ? "scale-110 border-mkmedia-blue bg-mkmedia-blue text-white"
              : "border-white/90 bg-white/90 text-neutral-500 backdrop-blur-sm hover:border-mkmedia-blue hover:bg-mkmedia-blue hover:text-white",
          )}
          aria-label={
            isSelected
              ? (unselectLabel ?? `Quitar ${face.title} de selección`)
              : (selectLabel ?? `Agregar ${face.title} a selección`)
          }
        >
          {isSelected ? (
            <Check className="h-4 w-4" strokeWidth={3} />
          ) : (
            <Plus className="h-4 w-4" strokeWidth={2.5} />
          )}
        </button>
      ) : null}

      <div
        className={cn(
          "relative",
          layout === "list" ? "w-1/3 min-w-[170px] shrink-0" : "",
        )}
      >
        <div className="absolute left-3 top-3 z-20 flex flex-wrap gap-1.5">
          {face.isDigital ? <span className={brandPrimaryBadgeClass}>Digital</span> : null}
          {face.isIlluminated ? (
            <span className={brandSecondaryBadgeClass}>Iluminado</span>
          ) : null}
          {isHighlighted ? (
            <span className="rounded-full border border-mkmedia-blue/30 bg-mkmedia-blue/15 px-2 py-0.5 text-[10px] font-semibold text-mkmedia-blue">
              {highlightedLabel}
            </span>
          ) : null}
        </div>

        {isSelected ? (
          <div className="absolute inset-x-0 bottom-0 z-20 bg-linear-to-t from-mkmedia-blue/80 to-transparent px-3 pb-2 pt-6">
            <span className="text-[10px] font-semibold text-white">En tu selección</span>
          </div>
        ) : null}

        <div
          className={cn(
            "relative overflow-hidden bg-linear-to-br from-neutral-100 to-neutral-50",
            layout === "list" ? "h-full min-h-[220px]" : "aspect-4/3",
          )}
        >
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
            <div className="flex h-full w-full flex-col items-center justify-center bg-linear-to-br from-mkmedia-yellow/20 to-mkmedia-blue/20 p-4">
              <span className="rounded-full bg-white/80 px-2 py-1 text-[10px] font-semibold text-neutral-700">
                {face.structureType}
              </span>
            </div>
          )}
        </div>
      </div>

      <div
        className={cn(
          "relative z-20 space-y-1.5 p-4",
          layout === "list" ? "flex flex-1 flex-col justify-between p-5" : "",
        )}
      >
        <div className="flex items-start justify-between gap-2">
          <h3 className="line-clamp-1 text-sm font-semibold text-neutral-900">{face.title}</h3>
          {face.dimensionsLabel ? (
            <span className="shrink-0 whitespace-nowrap rounded-full border border-mkmedia-blue/20 bg-mkmedia-blue/8 px-2 py-0.5 text-[10px] font-medium text-mkmedia-blue">
              {face.dimensionsLabel}
            </span>
          ) : null}
        </div>

        <p className="text-xs text-neutral-600">{face.location}</p>

        {(face.trafficLabel || face.areaLabel) ? (
          <div className="flex items-center justify-between text-xs text-neutral-500">
            <p>{face.trafficLabel ? `Tráfico: ${face.trafficLabel}` : ""}</p>
            {face.areaLabel ? <p>{face.areaLabel}</p> : null}
          </div>
        ) : null}

        <div className="flex items-center justify-between border-t border-mkmedia-blue/10 pt-2">
          {showPrices ? (
            <div>
              <p className="text-base font-semibold text-neutral-900">
                {face.priceLabel ?? "Consultar"}
              </p>
              <p className="text-[10px] text-neutral-500">por día</p>
            </div>
          ) : (
            <Link href="/login" className="text-xs font-semibold text-mkmedia-blue hover:underline">
              Inicia sesión para ver precio
            </Link>
          )}

          {showPrices ? (
            <span
              className={cn(
                "inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-[10px] font-semibold",
                brandPrimaryButtonClass,
              )}
            >
              {ctaLabel}
              <ChevronRight className="h-3 w-3" />
            </span>
          ) : null}
        </div>
      </div>
    </article>
  );
}
