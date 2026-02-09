import Link from "next/link";
import Image from "next/image";
import { headers } from "next/headers";
import { ChevronRight, MapPin, Sparkles } from "lucide-react";
import { auth } from "@/lib/auth";
import {
  formatFaceDimensions,
  formatPrice,
  getTrafficLabel,
} from "@/lib/formatters/catalog-face";
import { listCatalogFaces } from "@/lib/services/catalog";
import { listStructureTypes, listZones } from "@/lib/services/inventory";
import { getUserProfileByUserId } from "@/lib/services/user-profile";
import { HomeSearchBar } from "@/components/home/home-search";
import { ScrollNavigation } from "@/components/home/scroll-navigation";

type SearchParams = {
  q?: string | string[];
  zone?: string | string[];
  type?: string | string[];
};

function getParam(value?: string | string[]) {
  if (Array.isArray(value)) return value[0];
  return value;
}

function buildSearchUrl(options: {
  searchTerm?: string;
  type?: string;
  zone?: string;
}) {
  const params = new URLSearchParams();
  if (options.type) params.set("type", options.type);
  if (options.zone) params.set("zone", options.zone);
  const searchTerm = options.searchTerm || "all";
  const queryString = params.toString();
  return `/s/${encodeURIComponent(searchTerm)}${queryString ? `?${queryString}` : ""}`;
}

const structureTypeHints: Record<string, string> = {
  "Mupi Giant": "Peatones · alta frecuencia",
  "Pantalla Digital": "Impacto · rotación",
  Bastidor: "Tráfico vehicular",
  "Mini Unipolar": "Cobertura local",
  Pared: "Gran formato",
  Perimetral: "Eventos · perímetros",
  Unipolar: "Alta visibilidad",
  Valla: "Tránsito pesado",
  Parada: "Flujo peatonal",
};

const zoneBadges: Record<string, string> = {
  "Brisas del Golf": "Residencial",
  "Costa Verde": "Premium",
  "Avenida Central": "Comercial",
  Boquete: "Turístico",
  "Paso Canoa Frontera": "Frontera",
  Santiago: "Tráfico alto",
  "Isla Colón": "Turístico",
  "Vía Roosevelt": "Conectividad",
};

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

      <header className="relative mx-auto flex w-full max-w-7xl items-start justify-between px-6 pb-6 pt-6">
        <Link href="/" className="flex items-center gap-2">
          <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#0359A8] text-white shadow-lg shadow-[#0359A8]/30">
            <Sparkles className="h-5 w-5" />
          </span>
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-neutral-500">
              MK Booking
            </p>
            <p className="text-lg font-semibold tracking-tight">Catálogo OOH</p>
            <p className="mt-1 text-xs text-neutral-500">
              Reserva espacios OOH por ubicación, tipo y fechas en minutos
            </p>
          </div>
        </Link>

        <div className="flex items-center gap-2 text-xs">
          {session ? (
            <Link
              href="/profile"
              className="rounded-full border border-neutral-200 bg-white/80 px-3 py-2 font-semibold text-neutral-900 shadow-sm hover:bg-white"
            >
              Mi Panel
            </Link>
          ) : (
            <>
              <Link
                href="/login"
                className="rounded-full border border-neutral-200 bg-white/80 px-3 py-2 font-semibold text-neutral-900 shadow-sm hover:bg-white"
              >
                Iniciar sesión
              </Link>
              <Link
                href="/register"
                className="rounded-full bg-[#0359A8] px-3 py-2 font-semibold text-white shadow-lg shadow-[#0359A8]/30 hover:bg-[#024a8c]"
              >
                Crear cuenta
              </Link>
            </>
          )}
        </div>
      </header>

      <HomeSearchBar
        query={query}
        typeId={typeId}
        zoneId={zoneId}
        zones={zones}
        structureTypes={structureTypes}
        showPromo={showPromo}
        promoValueLabel={promoValueLabel}
      />

      <section className="mx-auto w-full max-w-7xl px-6 pb-16">
        <div className="mt-8">
          <ScrollNavigation
            targetId="structure-types-scroll"
            title="Explorar tipos de estructura"
          />
          <div
            id="structure-types-scroll"
            className="mt-4 flex gap-4 overflow-x-auto pb-2 scrollbar-hide"
          >
            {structureTypes.slice(0, 12).map((type) => {
              const url = buildSearchUrl({
                searchTerm: "all",
                type: type.id,
              });
              return (
                <Link
                  key={type.id}
                  href={url}
                  className="group relative flex-shrink-0 overflow-hidden rounded-2xl transition hover:shadow-lg"
                  style={{ width: 160 }}
                >
                  {type.imageUrl ? (
                    <div className="relative aspect-[4/3] w-full overflow-hidden">
                      <Image
                        src={type.imageUrl}
                        alt={type.name}
                        fill
                        sizes="160px"
                        className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                        loading="lazy"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                      <div className="absolute bottom-2 left-3 right-3">
                        <span className="text-sm font-semibold text-white block">
                          {type.name}
                        </span>
                        {structureTypeHints[type.name] ? (
                          <span className="text-xs text-white/80">
                            {structureTypeHints[type.name]}
                          </span>
                        ) : null}
                      </div>
                    </div>
                  ) : (
                    <div className="aspect-[4/3] w-full bg-gradient-to-br from-[#fcb814]/30 to-[#0359A8]/30 flex flex-col items-center justify-center p-4">
                      <span className="h-3 w-3 rounded-full bg-[#fcb814] mb-2" />
                      <span className="text-sm font-semibold text-neutral-800 text-center">
                        {type.name}
                      </span>
                      {structureTypeHints[type.name] ? (
                        <span className="text-xs text-neutral-600 text-center">
                          {structureTypeHints[type.name]}
                        </span>
                      ) : null}
                    </div>
                  )}
                </Link>
              );
            })}
          </div>
        </div>

        <div className="mt-10">
          <ScrollNavigation targetId="zones-scroll" title="Explorar zonas" />
          <div
            id="zones-scroll"
            className="mt-4 flex gap-4 overflow-x-auto pb-2 scrollbar-hide"
          >
            {zones.slice(0, 12).map((zone) => {
              const url = buildSearchUrl({
                searchTerm: "all",
                zone: zone.id,
              });
              return (
                <Link
                  key={zone.id}
                  href={url}
                  className="group relative flex-shrink-0 overflow-hidden rounded-2xl transition hover:shadow-lg"
                  style={{ width: 160 }}
                >
                  {zone.imageUrl ? (
                    <div className="relative aspect-[4/3] w-full overflow-hidden">
                      <Image
                        src={zone.imageUrl}
                        alt={zone.name}
                        fill
                        sizes="160px"
                        className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                        loading="lazy"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                      {zoneBadges[zone.name] ? (
                        <span className="absolute left-2 top-2 rounded-full bg-white/85 px-2 py-1 text-[10px] font-semibold text-neutral-800">
                          {zoneBadges[zone.name]}
                        </span>
                      ) : null}
                      <div className="absolute bottom-2 left-3 right-3">
                        <span className="text-sm font-semibold text-white block">
                          {zone.name}
                        </span>
                        <span className="text-xs text-white/80">
                          {zone.province.name}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="aspect-[4/3] w-full bg-gradient-to-br from-[#0359A8]/30 to-[#fcb814]/30 flex flex-col items-center justify-center p-4">
                      <MapPin className="h-5 w-5 text-[#0359A8] mb-2" />
                      <span className="text-sm font-semibold text-neutral-800 text-center">
                        {zone.name}
                      </span>
                      {zoneBadges[zone.name] ? (
                        <span className="text-[10px] font-semibold text-neutral-600">
                          {zoneBadges[zone.name]}
                        </span>
                      ) : null}
                      <span className="text-xs text-neutral-500">
                        {zone.province.name}
                      </span>
                    </div>
                  )}
                </Link>
              );
            })}
          </div>
        </div>

        <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {catalog.faces.length === 0 ? (
            <div className="col-span-full rounded-3xl border border-dashed border-neutral-300 bg-white p-10 text-center text-sm text-neutral-500">
              Aún no hay caras publicadas. Agrega inventario y publica caras
              desde el catálogo de administración.
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
                      face.effectivePrice.currency ?? "USD",
                    )
                  : null;
              const trafficLabel = getTrafficLabel(
                face.asset.structureType.name,
              );
              const dimensions = formatFaceDimensions(face.width, face.height);

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
                  <div className="relative">
                    <div className="absolute left-4 top-4 z-10 flex flex-wrap gap-2">
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

                  <div className="space-y-2 px-5 pb-5 pt-4">
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

                        <button
                          type="button"
                          className="mt-1 inline-flex items-center gap-2 rounded-full bg-[#0359A8] px-4 py-2 text-xs font-semibold text-white shadow-md shadow-[#0359A8]/20 transition hover:bg-[#024a8c]"
                        >
                          Añadir a campaña
                          <ChevronRight className="h-3 w-3" />
                        </button>
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
      </section>
    </div>
  );
}
