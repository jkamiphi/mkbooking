import Image from "next/image";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import {
  formatFaceDimensions,
  formatPrice,
  getTrafficLabel,
} from "@/lib/formatters/catalog-face";
import type { HomeCatalogFace } from "@/components/home/home-page-types";

interface CatalogFacesGridProps {
  faces: HomeCatalogFace[];
  showPrices: boolean;
  homeStateUrl: string;
}

export function CatalogFacesGrid({
  faces,
  showPrices,
  homeStateUrl,
}: CatalogFacesGridProps) {
  return (
    <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {faces.length === 0 ? (
        <div className="col-span-full rounded-3xl border border-dashed border-neutral-300 bg-white p-10 text-center text-sm text-neutral-500">
          Aún no hay caras publicadas. Agrega inventario y publica caras desde
          el catálogo de administración.
        </div>
      ) : (
        faces.map((face, index) => {
          const title =
            face.catalogFace?.title ||
            `${face.asset.structureType.name} · Cara ${face.code}`;
          const location = `${face.asset.zone.name}, ${face.asset.zone.province.name}`;
          const imageUrl = face.resolvedImageUrl ?? null;
          const priceLabel =
            face.effectivePrice && showPrices
              ? formatPrice(
                  Number(face.effectivePrice.priceDaily),
                  face.effectivePrice.currency ?? "USD",
                )
              : null;
          const trafficLabel = getTrafficLabel(face.asset.structureType.name);
          const dimensions = formatFaceDimensions(face.width, face.height);
          const detailHref = `/faces/${face.id}?from=${encodeURIComponent(homeStateUrl)}`;

          return (
            <article
              key={face.id}
              className="group relative overflow-hidden rounded-2xl border border-neutral-200/90 bg-white shadow-sm transition hover:-translate-y-1 hover:border-neutral-300 hover:shadow-lg"
              style={{
                animation: "rise 0.6s ease forwards",
                animationDelay: `${index * 60}ms`,
                opacity: 0,
              }}
            >
              <Link
                href={detailHref}
                aria-label={`Ver detalles de ${title}`}
                className="absolute inset-0 z-10"
              />
              <div className="relative">
                <div className="absolute left-4 top-4 z-20 flex flex-wrap gap-2">
                  {face.asset.digital ? (
                    <span className="rounded-full bg-[#0359A8]/90 px-3 py-1 text-xs font-semibold text-white">
                      Digital
                    </span>
                  ) : null}
                  {face.asset.illuminated ? (
                    <span className="rounded-full bg-[#fcb814]/90 px-3 py-1 text-xs font-semibold text-neutral-900">
                      Iluminado
                    </span>
                  ) : null}
                  {face.catalogFace?.highlight ? (
                    <span className="rounded-full bg-[#e6efff] px-3 py-1 text-xs font-semibold text-[#0359A8]">
                      {face.catalogFace.highlight}
                    </span>
                  ) : null}
                </div>

                <div className="relative aspect-[4/3] overflow-hidden rounded-t-2xl bg-gradient-to-br from-neutral-200 via-neutral-100 to-neutral-50">
                  {imageUrl ? (
                    <Image
                      src={imageUrl}
                      alt={title}
                      fill
                      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, (max-width: 1280px) 33vw, 25vw"
                      className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                      loading="lazy"
                    />
                  ) : (
                    <div className="flex h-full w-full flex-col items-start justify-end gap-3 bg-[linear-gradient(140deg,_#fef3c7,_#fde68a_40%,_#fca5a5)] p-6 text-neutral-900">
                      <span className="rounded-full bg-white/70 px-3 py-1 text-xs font-semibold">
                        {face.asset.structureType.name}
                      </span>
                      <p className="text-lg font-semibold">{title}</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="relative z-20 space-y-2 px-5 pb-5 pt-4">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="line-clamp-1 text-base font-semibold text-neutral-900">
                    {title}
                  </h3>
                  {dimensions ? (
                    <span className="shrink-0 whitespace-nowrap rounded-full border border-neutral-200 bg-neutral-50 px-2.5 py-1 text-[11px] font-medium text-neutral-600">
                      {dimensions.label}
                    </span>
                  ) : null}
                </div>
                <p className="text-sm text-neutral-500">{location}</p>
                <p className="line-clamp-1 text-xs text-neutral-500">
                  {face.asset.address}
                </p>
                <div className="flex items-center justify-between text-xs text-neutral-500">
                  <p>Tráfico estimado: {trafficLabel}</p>
                  {dimensions ? <p>{dimensions.areaLabel}</p> : null}
                </div>

                {showPrices ? (
                  <>
                    <div className="flex items-center justify-between border-t border-neutral-100 pt-3">
                      <div>
                        <p className="text-lg font-semibold text-neutral-900">
                          {priceLabel ?? "Precio a consultar"}
                        </p>
                        <p className="text-xs text-neutral-500">por día</p>
                      </div>
                      <span className="rounded-full border border-neutral-200 px-3 py-1 text-xs font-semibold text-neutral-600">
                        Reserva 24h
                      </span>
                    </div>

                    <Link
                      href={detailHref}
                      className="mt-1 inline-flex items-center gap-2 rounded-full bg-[#0359A8] px-4 py-2 text-xs font-semibold text-white shadow-md shadow-[#0359A8]/20 transition hover:bg-[#024a8c]"
                    >
                      Ver detalle
                      <ChevronRight className="h-3 w-3" />
                    </Link>
                  </>
                ) : (
                  <Link
                    href="/login"
                    className="inline-flex items-center gap-2 rounded-full border border-neutral-200 bg-white px-4 py-2 text-xs font-semibold text-neutral-700 transition hover:border-neutral-300 hover:bg-neutral-50"
                  >
                    Inicia sesión para ver precios
                    <ChevronRight className="h-3 w-3" />
                  </Link>
                )}
              </div>
            </article>
          );
        })
      )}
    </div>
  );
}
