import Link from "next/link";
import { headers } from "next/headers";
import {
  Calendar,
  ChevronRight,
  CircleDollarSign,
  Filter,
  Heart,
  MapPin,
  Search,
  Sparkles,
} from "lucide-react";
import { auth } from "@/lib/auth";
import { listCatalogFaces } from "@/lib/services/catalog";
import { listStructureTypes, listZones } from "@/lib/services/inventory";
import { getUserProfileByUserId } from "@/lib/services/user-profile";

type SearchParams = {
  q?: string | string[];
  zone?: string | string[];
  type?: string | string[];
};

function getParam(value?: string | string[]) {
  if (Array.isArray(value)) return value[0];
  return value;
}

function buildSearchUrl(current: { q?: string; zone?: string; type?: string }) {
  const params = new URLSearchParams();
  if (current.q) params.set("q", current.q);
  if (current.zone) params.set("zone", current.zone);
  if (current.type) params.set("type", current.type);
  const query = params.toString();
  return query ? `/?${query}` : "/";
}

function formatPrice(priceDaily: number, currency: string) {
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(priceDaily);
  } catch {
    return `${priceDaily} ${currency}`;
  }
}

export default async function Home({
  searchParams,
}: {
  searchParams?: SearchParams;
}) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  const query = getParam(searchParams?.q)?.trim() || undefined;
  const zoneId = getParam(searchParams?.zone) || undefined;
  const typeId = getParam(searchParams?.type) || undefined;

  const profile = session?.user?.id
    ? await getUserProfileByUserId(session.user.id)
    : null;
  const organizationId =
    profile?.organizationRoles?.[0]?.organization?.id || undefined;

  const [catalog, structureTypes, zones] = await Promise.all([
    listCatalogFaces({
      search: query,
      isPublished: true,
      structureTypeId: typeId,
      zoneId,
      take: 24,
      organizationId,
    }),
    listStructureTypes(),
    listZones(),
  ]);

  const selectedStructureType = structureTypes.find(
    (type) => type.id === typeId,
  );
  const selectedZone = zones.find((zone) => zone.id === zoneId);
  const showPrices = Boolean(session);

  const currentFilters = {
    q: query,
    zone: zoneId,
    type: typeId,
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-[linear-gradient(180deg,_#fffdf5_0%,_#ffffff_45%,_#f4f7ff_100%)] text-neutral-950">
      <style>{`
        @keyframes rise {
          from { opacity: 0; transform: translateY(14px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes drift {
          0% { transform: translate3d(0, 0, 0); }
          50% { transform: translate3d(-10px, 12px, 0); }
          100% { transform: translate3d(0, 0, 0); }
        }
      `}</style>

      <div
        className="pointer-events-none absolute -top-32 right-0 h-80 w-80 rounded-full bg-[#fcb814]/30 blur-3xl"
        style={{ animation: "drift 18s ease-in-out infinite" }}
      />
      <div
        className="pointer-events-none absolute -left-24 top-24 h-64 w-64 rounded-full bg-[#0359A8]/20 blur-3xl"
        style={{ animation: "drift 14s ease-in-out infinite" }}
      />
      <div
        className="pointer-events-none absolute left-1/2 top-16 h-40 w-40 -translate-x-1/2 rounded-full bg-[#0359A8]/15 blur-2xl"
        style={{ animation: "drift 20s ease-in-out infinite" }}
      />

      <header className="relative mx-auto flex w-full max-w-7xl items-center justify-between px-6 pb-6 pt-6">
          <Link href="/" className="flex items-center gap-2">
            <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#0359A8] text-white shadow-lg shadow-[#0359A8]/30">
              <Sparkles className="h-5 w-5" />
            </span>
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-neutral-500">
                MK Booking
              </p>
              <p className="text-lg font-semibold tracking-tight">
                OOH Catalog
              </p>
            </div>
          </Link>

          <nav className="hidden items-center gap-6 text-sm font-medium text-neutral-600 lg:flex">
            <span className="flex items-center gap-2 rounded-full bg-white/80 px-4 py-2 text-neutral-800 shadow-sm">
              <CircleDollarSign className="h-4 w-4 text-[#fcb814]" />
              Daily pricing
            </span>
            <span className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-neutral-500" />
              Global inventory
            </span>
            <span className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-neutral-500" />
              Curated faces
            </span>
          </nav>

          <div className="flex items-center gap-3 text-sm">
            {session ? (
              <Link
                href="/profile"
                className="rounded-full border border-neutral-200 bg-white/80 px-4 py-2 font-medium text-neutral-900 shadow-sm hover:bg-white"
              >
                Dashboard
              </Link>
            ) : (
              <>
                <Link
                  href="/login"
                  className="rounded-full border border-neutral-200 bg-white/80 px-4 py-2 font-medium text-neutral-900 shadow-sm hover:bg-white"
                >
                  Sign in
                </Link>
                <Link
                  href="/register"
                  className="rounded-full bg-[#0359A8] px-4 py-2 font-semibold text-white shadow-lg shadow-[#0359A8]/30 hover:bg-[#024a8c]"
                >
                  Create account
                </Link>
              </>
            )}
          </div>
      </header>

      <section className="relative mx-auto w-full max-w-7xl px-6 pb-12 pt-4">
        <form
          action="/"
          className="mt-8 flex flex-col gap-3 rounded-3xl border border-white/60 bg-white/80 p-4 shadow-xl shadow-[#fcb814]/20 backdrop-blur-xl md:flex-row md:items-center md:gap-2"
        >
          <div className="flex flex-1 items-center gap-3 rounded-2xl border border-neutral-200 bg-white px-4 py-3">
            <Search className="h-4 w-4 text-neutral-500" />
            <input
              name="q"
              defaultValue={query ?? ""}
              placeholder="Search by code, address, or landmark"
              className="w-full bg-transparent text-sm font-medium text-neutral-900 placeholder:text-neutral-400 focus:outline-none"
            />
          </div>

          {typeId && <input type="hidden" name="type" value={typeId} />}
          {zoneId && <input type="hidden" name="zone" value={zoneId} />}

          <button
            type="submit"
            className="flex items-center justify-center gap-2 rounded-2xl bg-[#0359A8] px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-[#0359A8]/30 hover:bg-[#024a8c]"
          >
            Search
            <ChevronRight className="h-4 w-4" />
          </button>

          <span className="hidden items-center gap-2 rounded-2xl border border-neutral-200 bg-white px-4 py-3 text-xs font-semibold text-neutral-500 md:flex">
            <Calendar className="h-4 w-4" />
            Date range
          </span>
        </form>

        {catalog.promo ? (
          <div
            className="mt-6 flex items-center gap-3 rounded-2xl border border-[#fcb814]/60 bg-[#fff6dd] px-4 py-3 text-sm text-[#0359A8]"
            style={{ animation: "rise 0.7s ease 0.1s forwards" }}
          >
            <Sparkles className="h-4 w-4" />
            Promo active: {catalog.promo.name}. Auto-applied at checkout.
          </div>
        ) : null}
      </section>

      <section className="mx-auto w-full max-w-7xl px-6 pb-16">
        <div
          className="flex flex-wrap items-center justify-between gap-3 rounded-3xl border border-white/60 bg-white/70 px-5 py-4 shadow-md shadow-neutral-200/40"
          style={{ animation: "rise 0.7s ease 0.15s forwards" }}
        >
          <div>
            <p className="text-sm font-semibold text-neutral-900">
              {catalog.total} faces ready to rent
            </p>
            <p className="text-xs text-neutral-500">
              {selectedStructureType?.name ?? "All structure types"} ·{" "}
              {selectedZone?.name ?? "All zones"}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-neutral-600">
            {selectedStructureType || selectedZone || query ? (
              <Link
                href="/"
                className="rounded-full border border-neutral-200 bg-white px-3 py-1 hover:border-neutral-300"
              >
                Clear filters
              </Link>
            ) : null}
            <span className="rounded-full bg-[#0359A8] px-3 py-1 text-white">
              Hold 24h
            </span>
            <span className="rounded-full border border-neutral-200 bg-white px-3 py-1">
              Daily pricing
            </span>
          </div>
        </div>

        <div className="mt-8">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-neutral-900">
              Explore structure types
            </h2>
          </div>
          <div className="mt-4 flex gap-3 overflow-x-auto pb-2">
            {structureTypes.slice(0, 12).map((type) => {
              const url = buildSearchUrl({ ...currentFilters, type: type.id });
              const isActive = type.id === typeId;
              return (
                <Link
                  key={type.id}
                  href={url}
                  className={`flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition ${
                    isActive
                      ? "border-[#0359A8] bg-[#0359A8] text-white shadow-lg shadow-[#0359A8]/30"
                      : "border-neutral-200 bg-white text-neutral-700 hover:border-neutral-300"
                  }`}
                >
                  <span className="h-2 w-2 rounded-full bg-[#fcb814]" />
                  {type.name}
                </Link>
              );
            })}
          </div>
        </div>

        <div className="mt-10">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-neutral-900">
              Browse zones
            </h2>
          </div>
          <div className="mt-4 flex gap-3 overflow-x-auto pb-2">
            {zones.slice(0, 12).map((zone) => {
              const url = buildSearchUrl({ ...currentFilters, zone: zone.id });
              const isActive = zone.id === zoneId;
              return (
                <Link
                  key={zone.id}
                  href={url}
                  className={`flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition ${
                    isActive
                      ? "border-[#0359A8] bg-[#0359A8] text-white shadow-lg shadow-[#0359A8]/30"
                      : "border-neutral-200 bg-white text-neutral-700 hover:border-neutral-300"
                  }`}
                >
                  <MapPin className="h-4 w-4 text-[#0359A8]" />
                  {zone.name}
                </Link>
              );
            })}
          </div>
        </div>

        <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {catalog.faces.length === 0 ? (
            <div className="col-span-full rounded-3xl border border-dashed border-neutral-300 bg-white p-10 text-center text-sm text-neutral-500">
              No faces published yet. Add inventory and publish faces from the
              admin catalog.
            </div>
          ) : (
            catalog.faces.map((face, index) => {
              const title =
                face.catalogFace?.title ||
                `${face.asset.structureType.name} · Face ${face.code}`;
              const location = `${face.asset.zone.name}, ${face.asset.zone.province.name}`;
              const imageUrl = face.catalogFace?.primaryImageUrl;
              const priceLabel =
                face.effectivePrice && showPrices
                  ? formatPrice(
                      face.effectivePrice.priceDaily,
                      face.effectivePrice.currency ?? "USD",
                    )
                  : null;

              const sizeLabel = Number.isFinite(Number(face.width))
                ? `${Number(face.width)} x ${Number(face.height)}`
                : null;

              return (
                <article
                  key={face.id}
                  className="group relative overflow-hidden rounded-3xl border border-white/70 bg-white shadow-lg shadow-neutral-200/50 transition hover:-translate-y-1 hover:shadow-xl"
                  style={{
                    animation: "rise 0.6s ease forwards",
                    animationDelay: `${index * 60}ms`,
                    opacity: 0,
                  }}
                >
                  <div className="relative">
                    <div className="absolute left-4 top-4 z-10 flex flex-wrap gap-2">
                      {face.asset.digital ? (
                        <span className="rounded-full bg-[#0359A8]/90 px-3 py-1 text-xs font-semibold text-white">
                          Digital
                        </span>
                      ) : null}
                      {face.asset.illuminated ? (
                        <span className="rounded-full bg-[#fcb814]/90 px-3 py-1 text-xs font-semibold text-neutral-900">
                          Illuminated
                        </span>
                      ) : null}
                      {face.catalogFace?.highlight ? (
                        <span className="rounded-full bg-[#e6efff] px-3 py-1 text-xs font-semibold text-[#0359A8]">
                          {face.catalogFace.highlight}
                        </span>
                      ) : null}
                    </div>

                    <button
                      className="absolute right-4 top-4 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-white/80 text-neutral-700 shadow-md backdrop-blur"
                      type="button"
                      aria-label="Save"
                    >
                      <Heart className="h-4 w-4" />
                    </button>

                    <div className="aspect-[4/3] overflow-hidden rounded-t-3xl bg-gradient-to-br from-neutral-200 via-neutral-100 to-neutral-50">
                      {imageUrl ? (
                        <img
                          src={imageUrl}
                          alt={title}
                          className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                          loading="lazy"
                          decoding="async"
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

                  <div className="space-y-2 px-5 pb-5 pt-4">
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="text-base font-semibold text-neutral-900">
                        {title}
                      </h3>
                      {sizeLabel ? (
                        <span className="rounded-full bg-neutral-100 px-2 py-1 text-xs font-semibold text-neutral-600">
                          {sizeLabel}
                        </span>
                      ) : null}
                    </div>
                    <p className="text-sm text-neutral-500">{location}</p>
                    <p className="text-xs text-neutral-500">
                      {face.asset.address}
                    </p>

                    {showPrices ? (
                      <div className="flex items-center justify-between pt-2">
                        <div>
                          <p className="text-lg font-semibold text-neutral-900">
                            {priceLabel ?? "Price on request"}
                          </p>
                          <p className="text-xs text-neutral-500">per day</p>
                        </div>
                        <span className="rounded-full border border-neutral-200 px-3 py-1 text-xs font-semibold text-neutral-600">
                          Hold 24h
                        </span>
                      </div>
                    ) : (
                      <Link
                        href="/login"
                        className="inline-flex items-center gap-2 rounded-full border border-neutral-200 bg-white px-4 py-2 text-xs font-semibold text-neutral-700 hover:border-neutral-300"
                      >
                        Sign in to see pricing
                        <ChevronRight className="h-3 w-3" />
                      </Link>
                    )}
                  </div>
                </article>
              );
            })
          )}
        </div>
      </section>
    </div>
  );
}
