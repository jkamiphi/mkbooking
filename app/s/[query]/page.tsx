import Link from "next/link";
import Image from "next/image";
import { headers } from "next/headers";
import {
  ArrowLeft,
  ChevronRight,
  Grid3X3,
  List,
  MapPin,
  Sparkles,
} from "lucide-react";
import { auth } from "@/lib/auth";
import {
  formatFaceDimensions,
  formatPrice,
  getTrafficLabel,
} from "@/lib/formatters/catalog-face";
import { listCatalogFaces } from "@/lib/services/catalog";
import { listStructureTypes, listZones } from "@/lib/services/inventory";
import { getUserProfileByUserId } from "@/lib/services/user-profile";
import { SearchMap } from "./_components/search-map";
import { SearchFilters } from "./_components/search-filters";

type PageProps = {
  params: Promise<{ query: string }>;
  searchParams: Promise<{
    type?: string | string[];
    zone?: string | string[];
    qty?: string | string[];
    from?: string | string[];
    to?: string | string[];
  }>;
};

function getParam(value?: string | string[]) {
  if (Array.isArray(value)) return value[0];
  return value;
}

export default async function SearchPage({ params, searchParams }: PageProps) {
  const { query } = await params;
  const awaitedSearchParams = await searchParams;

  const session = await auth.api.getSession({
    headers: await headers(),
  });

  const decodedQuery = decodeURIComponent(query);
  const searchTerm = decodedQuery === "all" ? undefined : decodedQuery;
  const typeId = getParam(awaitedSearchParams?.type) || undefined;
  const zoneId = getParam(awaitedSearchParams?.zone) || undefined;
  const quantity = getParam(awaitedSearchParams?.qty) || undefined;
  const fromDate = getParam(awaitedSearchParams?.from) || undefined;
  const toDate = getParam(awaitedSearchParams?.to) || undefined;

  const searchStateParams = new URLSearchParams();
  if (typeId) searchStateParams.set("type", typeId);
  if (zoneId) searchStateParams.set("zone", zoneId);
  if (quantity) searchStateParams.set("qty", quantity);
  if (fromDate) searchStateParams.set("from", fromDate);
  if (toDate) searchStateParams.set("to", toDate);
  const currentSearchPath = `/s/${encodeURIComponent(decodedQuery)}${
    searchStateParams.toString() ? `?${searchStateParams.toString()}` : ""
  }`;

  const profile = session?.user?.id
    ? await getUserProfileByUserId(session.user.id)
    : null;
  const organizationId =
    profile?.organizationRoles?.[0]?.organization?.id || undefined;

  const [catalog, structureTypes, zones] = await Promise.all([
    listCatalogFaces({
      search: searchTerm,
      isPublished: true,
      structureTypeId: typeId,
      zoneId,
      take: 50,
      organizationId,
    }),
    listStructureTypes(),
    listZones(),
  ]);

  const showPrices = Boolean(session);

  // Extract markers for the map
  const markers = catalog.faces
    .filter((face) => face.asset.latitude && face.asset.longitude)
    .map((face) => ({
      id: face.id,
      lat: Number(face.asset.latitude),
      lng: Number(face.asset.longitude),
      title:
        face.catalogFace?.title ||
        `${face.asset.structureType.name} · ${face.code}`,
      price: face.effectivePrice
        ? formatPrice(
            Number(face.effectivePrice.priceDaily),
            face.effectivePrice.currency ?? "USD"
          )
        : null,
      structureType: face.asset.structureType.name,
      href: `/faces/${face.id}?from=${encodeURIComponent(currentSearchPath)}`,
    }));

  // Default center (Panama City)
  const defaultCenter = { lat: 9.0, lng: -79.5 };
  const mapCenter =
    markers.length > 0
      ? {
          lat: markers.reduce((sum, m) => sum + m.lat, 0) / markers.length,
          lng: markers.reduce((sum, m) => sum + m.lng, 0) / markers.length,
        }
      : defaultCenter;

  return (
    <div className="flex h-screen flex-col bg-white">
      {/* Header */}
      <header className="z-20 flex items-center justify-between border-b border-neutral-200 bg-white px-6 py-4">
        <div className="flex items-center gap-4">
          <Link
            href="/"
            className="flex items-center gap-2 rounded-full border border-neutral-200 px-3 py-2 text-sm font-medium text-neutral-700 transition hover:border-neutral-300 hover:bg-neutral-50"
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="hidden sm:inline">Volver</span>
          </Link>
          <div className="flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#0359A8] text-white">
              <Sparkles className="h-4 w-4" />
            </span>
            <div>
              <p className="text-sm font-semibold text-neutral-900">
                MK Booking
              </p>
              <p className="text-xs text-neutral-500">Catálogo OOH</p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden items-center gap-2 rounded-full border border-neutral-200 bg-white px-4 py-2 md:flex">
            <MapPin className="h-4 w-4 text-neutral-400" />
            <span className="text-sm font-medium text-neutral-900">
              {searchTerm ||
                (typeId && structureTypes.find((t) => t.id === typeId)?.name) ||
                (zoneId && zones.find((z) => z.id === zoneId)?.name) ||
                "Todos los espacios"}
            </span>
            {zoneId && zones.find((z) => z.id === zoneId) && (
              <span className="text-sm text-neutral-500">
                {zones.find((z) => z.id === zoneId)?.province.name}
              </span>
            )}
          </div>

          {session ? (
            <Link
              href="/profile"
              className="rounded-full border border-neutral-200 bg-white px-4 py-2 text-sm font-semibold text-neutral-900 shadow-sm transition hover:bg-neutral-50"
            >
              Mi Panel
            </Link>
          ) : (
            <Link
              href="/login"
              className="rounded-full bg-[#0359A8] px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-[#0359A8]/20 transition hover:bg-[#024a8c]"
            >
              Iniciar sesión
            </Link>
          )}
        </div>
      </header>

      {/* Filters Bar */}
      <SearchFilters
        structureTypes={structureTypes}
        zones={zones}
        selectedTypeId={typeId}
        selectedZoneId={zoneId}
        query={decodedQuery}
      />

      {/* Main Content - Split View */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Panel - Results Grid */}
        <div className="flex w-full flex-col overflow-hidden lg:w-[55%] xl:w-[60%]">
          {/* Results Count */}
          <div className="flex items-center justify-between border-b border-neutral-100 bg-neutral-50/50 px-6 py-3">
            <p className="text-sm text-neutral-600">
              <span className="font-semibold text-neutral-900">
                {catalog.total}
              </span>{" "}
              {catalog.total === 1 ? "espacio disponible" : "espacios disponibles"}
              {searchTerm && (
                <span>
                  {" "}
                  para{" "}
                  <span className="font-medium text-neutral-900">
                    &quot;{searchTerm}&quot;
                  </span>
                </span>
              )}
            </p>
            <div className="flex items-center gap-2">
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

          {/* Scrollable Results */}
          <div className="flex-1 overflow-y-auto">
            <div className="grid grid-cols-1 gap-4 p-6 sm:grid-cols-2 xl:grid-cols-3">
              {catalog.faces.length === 0 ? (
                <div className="col-span-full flex flex-col items-center justify-center rounded-2xl border border-dashed border-neutral-300 bg-neutral-50 py-16 text-center">
                  <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-neutral-200">
                    <MapPin className="h-6 w-6 text-neutral-500" />
                  </div>
                  <p className="text-sm font-medium text-neutral-700">
                    No se encontraron espacios
                  </p>
                  <p className="mt-1 text-xs text-neutral-500">
                    Intenta con otra búsqueda o filtros diferentes
                  </p>
                </div>
              ) : (
                catalog.faces.map((face, index) => {
                  const title =
                    face.catalogFace?.title ||
                    `${face.asset.structureType.name} · Cara ${face.code}`;
                  const location = `${face.asset.zone.name}, ${face.asset.zone.province.name}`;
                  const imageUrl = face.catalogFace?.primaryImageUrl;
                  const priceLabel =
                    face.effectivePrice && showPrices
                      ? formatPrice(
                          Number(face.effectivePrice.priceDaily),
                          face.effectivePrice.currency ?? "USD"
                        )
                      : null;
                  const trafficLabel = getTrafficLabel(
                    face.asset.structureType.name
                  );
                  const dimensions = formatFaceDimensions(face.width, face.height);
                  const detailHref = `/faces/${face.id}?from=${encodeURIComponent(currentSearchPath)}`;

                  return (
                    <article
                      key={face.id}
                      className="group relative cursor-pointer overflow-hidden rounded-2xl border border-neutral-200/90 bg-white transition-all hover:-translate-y-0.5 hover:border-neutral-300 hover:shadow-lg"
                      style={{
                        animation: "fadeInUp 0.4s ease forwards",
                        animationDelay: `${index * 30}ms`,
                        opacity: 0,
                      }}
                    >
                      <Link
                        href={detailHref}
                        aria-label={`Ver detalles de ${title}`}
                        className="absolute inset-0 z-10"
                      />
                      <div className="relative">
                        <div className="absolute left-3 top-3 z-20 flex flex-wrap gap-1.5">
                          {face.asset.digital && (
                            <span className="rounded-full bg-[#0359A8]/90 px-2 py-0.5 text-[10px] font-semibold text-white">
                              Digital
                            </span>
                          )}
                          {face.asset.illuminated && (
                            <span className="rounded-full bg-[#fcb814]/90 px-2 py-0.5 text-[10px] font-semibold text-neutral-900">
                              Iluminado
                            </span>
                          )}
                        </div>

                        <div className="relative aspect-[4/3] overflow-hidden bg-gradient-to-br from-neutral-100 to-neutral-50">
                          {imageUrl ? (
                            <Image
                              src={imageUrl}
                              alt={title}
                              fill
                              sizes="(max-width: 640px) 100vw, (max-width: 1280px) 50vw, 33vw"
                              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                              loading="lazy"
                            />
                          ) : (
                            <div className="flex h-full w-full flex-col items-center justify-center bg-gradient-to-br from-[#fcb814]/20 to-[#0359A8]/20 p-4">
                              <span className="mb-2 rounded-full bg-white/80 px-2 py-1 text-[10px] font-semibold text-neutral-700">
                                {face.asset.structureType.name}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="relative z-20 space-y-1.5 p-4">
                        <div className="flex items-start justify-between gap-2">
                          <h3 className="line-clamp-1 text-sm font-semibold text-neutral-900">
                            {title}
                          </h3>
                          {dimensions && (
                            <span className="flex-shrink-0 whitespace-nowrap rounded-full border border-neutral-200 bg-neutral-50 px-2 py-0.5 text-[10px] font-medium text-neutral-600">
                              {dimensions.label}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-neutral-500">{location}</p>
                        <div className="flex items-center justify-between text-xs text-neutral-400">
                          <p>Tráfico: {trafficLabel}</p>
                          {dimensions ? <p>{dimensions.areaLabel}</p> : null}
                        </div>

                        <div className="flex items-center justify-between border-t border-neutral-100 pt-2">
                          {showPrices ? (
                            <div>
                              <p className="text-base font-semibold text-neutral-900">
                                {priceLabel ?? "Consultar"}
                              </p>
                              <p className="text-[10px] text-neutral-500">
                                por día
                              </p>
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
                              href={detailHref}
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

        {/* Right Panel - Map */}
        <div className="hidden border-l border-neutral-200 lg:block lg:w-[45%] xl:w-[40%]">
          <SearchMap
            markers={markers}
            center={mapCenter}
            showPrices={showPrices}
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
