import Link from "next/link";
import { ArrowLeft, MapPin } from "lucide-react";
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
import { UserHeaderActions } from "@/components/layout/user-header-actions";
import { SearchFilters } from "./_components/search-filters";
import { SearchResultsView } from "./_components/search-results-view";
import Image from "next/image";

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
  const searchContextLabel =
    searchTerm ||
    (typeId && structureTypes.find((t) => t.id === typeId)?.name) ||
    (zoneId && zones.find((z) => z.id === zoneId)?.name);

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
            <Image
              src="/images/logo/b-mkm-blue.png"
              alt="Logo"
              width={68.4}
              height={30}
            />
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
            <UserHeaderActions
              user={{
                email: session.user.email,
                name: session.user.name,
              }}
            />
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
  );
}
