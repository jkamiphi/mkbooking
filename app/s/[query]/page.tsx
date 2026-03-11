import {
  formatFaceDimensions,
  formatPrice,
  getTrafficLabel,
} from "@/lib/formatters/catalog-face";
import {
  computeMinimumStartDate,
  parseDateInputValue,
  sanitizeDateRangeStrings,
  toDateInputValue,
} from "@/lib/date/campaign-date-range";
import { getCampaignRequestStartGapDays } from "@/lib/server-config";
import { createServerTRPCCaller, getServerSession } from "@/lib/trpc/server";
import { PublicMarketplaceShell } from "@/components/public/public-marketplace-shell";
import { SearchFilters } from "./_components/search-filters";
import { SearchResultsView } from "./_components/search-results-view";

type PageProps = {
  params: Promise<{ query: string }>;
  searchParams: Promise<{
    type?: string | string[];
    zone?: string | string[];
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
  const [session, caller] = await Promise.all([
    getServerSession(),
    createServerTRPCCaller(),
  ]);

  const decodedQuery = decodeURIComponent(query);
  const searchTerm = decodedQuery === "all" ? undefined : decodedQuery;
  const typeId = getParam(awaitedSearchParams?.type) || undefined;
  const zoneId = getParam(awaitedSearchParams?.zone) || undefined;
  const minimumStartDate = computeMinimumStartDate(
    getCampaignRequestStartGapDays(),
  );
  const sanitizedRange = sanitizeDateRangeStrings({
    fromDate: getParam(awaitedSearchParams?.from),
    toDate: getParam(awaitedSearchParams?.to),
    minimumStartDate,
    minimumDurationDays: 1,
    mode: "drop-invalid",
  });
  const fromDate = sanitizedRange.fromDate;
  const toDate = sanitizedRange.toDate;
  const availableFrom = parseDateInputValue(fromDate);
  const availableTo = parseDateInputValue(toDate);

  const searchStateParams = new URLSearchParams();
  if (typeId) searchStateParams.set("type", typeId);
  if (zoneId) searchStateParams.set("zone", zoneId);
  if (fromDate) searchStateParams.set("from", fromDate);
  if (toDate) searchStateParams.set("to", toDate);
  const currentSearchPath = `/s/${encodeURIComponent(decodedQuery)}${
    searchStateParams.toString() ? `?${searchStateParams.toString()}` : ""
  }`;

  const profile = session?.user?.id ? await caller.userProfile.current() : null;
  const organizationId =
    profile?.organizationRoles?.[0]?.organization?.id || undefined;

  const [catalog, structureTypes, zones] = await Promise.all([
    caller.catalog.faces.publicList({
      search: searchTerm,
      isPublished: true,
      structureTypeId: typeId,
      zoneId,
      availableFrom,
      availableTo,
      take: 50,
      organizationId,
    }),
    caller.inventory.structureTypes.publicList(),
    caller.inventory.zones.publicList(),
  ]);

  const showPrices = Boolean(session);
  const selectedZone = zoneId
    ? zones.find((zone) => zone.id === zoneId) ?? null
    : null;
  const searchContextLabel =
    searchTerm ||
    (typeId && structureTypes.find((t) => t.id === typeId)?.name) ||
    selectedZone?.name ||
    "Todo Panamá";

  const visibleFaces = catalog.faces;
  const visibleTotal = visibleFaces.length;

  const results = visibleFaces.map((face) => {
    const title =
      face.catalogFace?.title ||
      `${face.asset.structureType.name} · Cara ${face.code}`;
    const location = `${face.asset.zone.name}, ${face.asset.zone.province.name}`;
    const dimensions = formatFaceDimensions(face.width, face.height);
    const priceLabel =
      face.effectivePrice && showPrices
        ? formatPrice(
            Number(face.effectivePrice.priceDaily),
            face.effectivePrice.currency ?? "USD",
          )
        : null;

    return {
      id: face.id,
      title,
      location,
      imageUrl: face.resolvedImageUrl ?? null,
      detailHref: `/faces/${face.id}?from=${encodeURIComponent(currentSearchPath)}`,
      isDigital: face.asset.digital,
      isIlluminated: face.asset.illuminated,
      trafficLabel: getTrafficLabel(face.asset.structureType.name),
      dimensionsLabel: dimensions?.label ?? null,
      areaLabel: dimensions?.areaLabel ?? null,
      priceLabel,
      priceDaily: face.effectivePrice
        ? Number(face.effectivePrice.priceDaily)
        : null,
      currency: face.effectivePrice?.currency ?? "USD",
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
          face.catalogFace?.title ||
          `${face.asset.structureType.name} · Cara ${face.code}`,
        price:
          face.effectivePrice && showPrices
            ? formatPrice(
                Number(face.effectivePrice.priceDaily),
                face.effectivePrice.currency ?? "USD",
              )
            : null,
        structureType: face.asset.structureType.name,
        href: `/faces/${face.id}?from=${encodeURIComponent(currentSearchPath)}`,
      };
    })
    .filter((marker): marker is NonNullable<typeof marker> => Boolean(marker));

  const defaultCenter = { lat: 9.0, lng: -79.5 };
  const mapCenter =
    markers.length > 0
      ? {
          lat: markers.reduce((sum, marker) => sum + marker.lat, 0) / markers.length,
          lng: markers.reduce((sum, marker) => sum + marker.lng, 0) / markers.length,
        }
      : defaultCenter;

  return (
    <PublicMarketplaceShell
      user={
        session
          ? {
              email: session.user.email,
              name: session.user.name,
            }
          : null
      }
      showPrices={showPrices}
      backHref="/"
      backLabel="Inicio"
      contextLabel={searchContextLabel}
      contextMeta={selectedZone?.province.name}
      headerActions={
        <SearchFilters
          key={`${typeId ?? ""}-${zoneId ?? ""}-${fromDate ?? ""}-${toDate ?? ""}`}
          structureTypes={structureTypes}
          zones={zones}
          selectedTypeId={typeId}
          selectedZoneId={zoneId}
          selectedFromDate={fromDate}
          selectedToDate={toDate}
          minimumStartDate={toDateInputValue(minimumStartDate)}
          query={decodedQuery}
        />
      }
      showSectionBanner={false}
      contentClassName="flex flex-1 flex-col"
      footerClassName="mt-0"
    >
      <div className="flex flex-auto flex-col">
        <SearchResultsView
          total={visibleTotal}
          searchTerm={searchTerm}
          results={results}
          markers={markers}
          center={mapCenter}
          showPrices={showPrices}
          selectedTypeId={typeId}
          selectedZoneId={zoneId}
          selectedFromDate={fromDate}
          selectedToDate={toDate}
          isAuthenticated={Boolean(session)}
          searchPath={currentSearchPath}
        />
      </div>
    </PublicMarketplaceShell>
  );
}
