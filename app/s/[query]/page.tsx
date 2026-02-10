import Link from "next/link";
import { headers } from "next/headers";
import { ArrowLeft, MapPin, Sparkles } from "lucide-react";
import { auth } from "@/lib/auth";
import {
  formatFaceDimensions,
  formatPrice,
  getTrafficLabel,
} from "@/lib/formatters/catalog-face";
import { listCatalogFaces } from "@/lib/services/catalog";
import { listStructureTypes, listZones } from "@/lib/services/inventory";
import { getUserProfileByUserId } from "@/lib/services/user-profile";
import { SearchFilters } from "./_components/search-filters";
import { SearchResultsView } from "./_components/search-results-view";

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

function parseDateParam(value?: string) {
  if (!value) return undefined;
  const parsed = new Date(`${value}T00:00:00`);
  if (!Number.isFinite(parsed.getTime())) return undefined;
  return parsed;
}

function getQuantityUpperBound(value?: string) {
  if (!value) return undefined;
  if (value === "1-2") return 2;
  if (value === "3-5") return 5;
  if (value === "6-10") return 10;
  if (value === "11+") return 11;
  return undefined;
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
  const availableFrom = parseDateParam(fromDate);
  const availableTo = parseDateParam(toDate);
  const quantityUpperBound = getQuantityUpperBound(quantity);

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
      availableFrom,
      availableTo,
      take: 50,
      organizationId,
    }),
    listStructureTypes(),
    listZones(),
  ]);

  const showPrices = Boolean(session);
  const searchContextLabel =
    searchTerm ||
    (typeId && structureTypes.find((t) => t.id === typeId)?.name) ||
    (zoneId && zones.find((z) => z.id === zoneId)?.name);

  const visibleFaces = quantityUpperBound
    ? catalog.faces.slice(0, quantityUpperBound)
    : catalog.faces;
  const visibleTotal = visibleFaces.length;

  const results = visibleFaces.map((face) => {
    const title =
      face.catalogFace?.title || `${face.asset.structureType.name} · Cara ${face.code}`;
    const location = `${face.asset.zone.name}, ${face.asset.zone.province.name}`;
    const dimensions = formatFaceDimensions(face.width, face.height);
    const priceLabel =
      face.effectivePrice && showPrices
        ? formatPrice(
            Number(face.effectivePrice.priceDaily),
            face.effectivePrice.currency ?? "USD"
          )
        : null;

    return {
      id: face.id,
      title,
      location,
      imageUrl: face.catalogFace?.primaryImageUrl ?? null,
      detailHref: `/faces/${face.id}?from=${encodeURIComponent(currentSearchPath)}`,
      isDigital: face.asset.digital,
      isIlluminated: face.asset.illuminated,
      trafficLabel: getTrafficLabel(face.asset.structureType.name),
      dimensionsLabel: dimensions?.label ?? null,
      areaLabel: dimensions?.areaLabel ?? null,
      priceLabel,
      structureType: face.asset.structureType.name,
    };
  });

  const markers = visibleFaces
    .map((face) => {
      const lat = Number(face.asset.latitude);
      const lng = Number(face.asset.longitude);
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;

      return {
        id: face.id,
        lat,
        lng,
        title:
          face.catalogFace?.title || `${face.asset.structureType.name} · Cara ${face.code}`,
        price:
          face.effectivePrice && showPrices
            ? formatPrice(
                Number(face.effectivePrice.priceDaily),
                face.effectivePrice.currency ?? "USD"
              )
            : null,
        structureType: face.asset.structureType.name,
        href: `/faces/${face.id}?from=${encodeURIComponent(currentSearchPath)}`,
      };
    })
    .filter((marker): marker is NonNullable<typeof marker> => Boolean(marker));

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
          {searchContextLabel ? (
            <div className="hidden items-center gap-2 rounded-full border border-neutral-200 bg-white px-4 py-2 md:flex">
              <MapPin className="h-4 w-4 text-neutral-400" />
              <span className="text-sm font-medium text-neutral-900">
                {searchContextLabel}
              </span>
              {zoneId && zones.find((z) => z.id === zoneId) && (
                <span className="text-sm text-neutral-500">
                  {zones.find((z) => z.id === zoneId)?.province.name}
                </span>
              )}
            </div>
          ) : null}

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
        key={`${typeId ?? ""}-${zoneId ?? ""}-${quantity ?? ""}-${fromDate ?? ""}-${toDate ?? ""}`}
        structureTypes={structureTypes}
        zones={zones}
        selectedTypeId={typeId}
        selectedZoneId={zoneId}
        selectedQuantity={quantity}
        selectedFromDate={fromDate}
        selectedToDate={toDate}
        query={decodedQuery}
      />

      <SearchResultsView
        total={visibleTotal}
        searchTerm={searchTerm}
        results={results}
        markers={markers}
        center={mapCenter}
        showPrices={showPrices}
      />
    </div>
  );
}
