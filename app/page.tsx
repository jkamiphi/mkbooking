import {
  computeMinimumStartDate,
  toDateInputValue,
} from "@/lib/date/campaign-date-range";
import { getCampaignRequestStartGapDays } from "@/lib/server-config";
import { createServerTRPCCaller, getServerSession } from "@/lib/trpc/server";
import { CatalogFacesGrid } from "@/components/home/catalog-faces-grid";
import { HomeBackgroundEffects } from "@/components/home/home-background-effects";
import { HomeFooter } from "@/components/home/home-footer";
import { HomeHeader } from "@/components/home/home-header";
import { HomeSearchBar } from "@/components/home/home-search";
import { StructureTypesCarousel } from "@/components/home/structure-types-carousel";
import { ZonesCarousel } from "@/components/home/zones-carousel";

type SearchParams = {
  q?: string | string[];
  zone?: string | string[];
  type?: string | string[];
};

function getParam(value?: string | string[]) {
  if (Array.isArray(value)) return value[0];
  return value;
}

function buildHomeUrl(options: {
  searchTerm?: string;
  type?: string;
  zone?: string;
}) {
  const params = new URLSearchParams();
  if (options.searchTerm) params.set("q", options.searchTerm);
  if (options.type) params.set("type", options.type);
  if (options.zone) params.set("zone", options.zone);
  const queryString = params.toString();
  return `/${queryString ? `?${queryString}` : ""}`;
}

export default async function Home({
  searchParams,
}: {
  searchParams?: SearchParams;
}) {
  const [session, caller] = await Promise.all([
    getServerSession(),
    createServerTRPCCaller(),
  ]);
  const minimumStartDate = toDateInputValue(
    computeMinimumStartDate(getCampaignRequestStartGapDays()),
  );

  const query = getParam(searchParams?.q)?.trim() || undefined;
  const zoneId = getParam(searchParams?.zone) || undefined;
  const typeId = getParam(searchParams?.type) || undefined;

  const profile = session?.user?.id ? await caller.userProfile.current() : null;
  const organizationId =
    profile?.organizationRoles?.[0]?.organization?.id || undefined;

  const [catalog, structureTypes, zones] = await Promise.all([
    caller.catalog.faces.publicList({
      search: query,
      isPublished: true,
      structureTypeId: typeId,
      zoneId,
      take: 24,
      organizationId,
    }),
    caller.inventory.structureTypes.publicList(),
    caller.inventory.zones.publicList(),
  ]);

  const selectedZone = zones.find((zone) => zone.id === zoneId);
  const showPrices = Boolean(session);
  const isPanamaQuery =
    (query ?? "").toLowerCase().includes("panam") ||
    (selectedZone?.province.name ?? "").toLowerCase().includes("panam") ||
    (selectedZone?.name ?? "").toLowerCase().includes("panam");
  const showPromo = Boolean(catalog.promo && isPanamaQuery);

  const promoValueLabel = catalog.promo
    ? catalog.promo.type === "PERCENT"
      ? `${catalog.promo.value}%`
      : catalog.promo.type === "FIXED"
        ? `${catalog.promo.value}`
        : `${catalog.promo.value}`
    : null;
  const homeStateUrl = buildHomeUrl({
    searchTerm: query,
    type: typeId,
    zone: zoneId,
  });

  return (
    <div className="relative min-h-screen overflow-hidden bg-[linear-gradient(180deg,_#fffdf5_0%,_#ffffff_45%,_#f4f7ff_100%)] text-neutral-950">
      <HomeBackgroundEffects />

      <HomeHeader
        user={
          session
            ? {
                email: session.user.email,
                name: session.user.name,
              }
            : null
        }
      />

      <HomeSearchBar
        key={`${query ?? ""}-${typeId ?? ""}-${zoneId ?? ""}`}
        query={query}
        typeId={typeId}
        minimumStartDate={minimumStartDate}
        zones={zones}
        structureTypes={structureTypes}
        showPromo={showPromo}
        promoValueLabel={promoValueLabel}
      />

      <section className="mx-auto w-full max-w-7xl px-6 pb-16">
        <StructureTypesCarousel structureTypes={structureTypes} />
        <ZonesCarousel zones={zones} />
        <CatalogFacesGrid
          faces={catalog.faces}
          showPrices={showPrices}
          homeStateUrl={homeStateUrl}
        />
      </section>

      <HomeFooter showPrices={showPrices} />
    </div>
  );
}
