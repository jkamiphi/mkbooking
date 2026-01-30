import Link from "next/link";
import { headers } from "next/headers";
import {
  Calendar,
  ChevronRight,
  CircleDollarSign,
  Filter,
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
    return new Intl.NumberFormat("es-PA", {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(priceDaily);
  } catch {
    return `${priceDaily} ${currency}`;
  }
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

function getCoverageLabel(total: number) {
  if (total >= 80) return "Muy alta";
  if (total >= 40) return "Alta";
  if (total >= 15) return "Media";
  return "Selectiva";
}

function getTrafficLabel(structureType: string) {
  const key = structureType.toLowerCase();
  if (
    key.includes("digital") ||
    key.includes("unipolar") ||
    key.includes("valla")
  ) {
    return "Alto";
  }
  if (key.includes("mupi") || key.includes("parada")) return "Medio";
  return "Moderado";
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
  const coverageLabel = getCoverageLabel(catalog.total);
  const isPanamaQuery =
    (query ?? "").toLowerCase().includes("panam") ||
    (selectedZone?.province.name ?? "").toLowerCase().includes("panam") ||
    (selectedZone?.name ?? "").toLowerCase().includes("panam");
  const showPromo = Boolean(catalog.promo && isPanamaQuery);

  const structureCounts = catalog.faces.reduce<Record<string, number>>(
    (acc, face) => {
      const name = face.asset.structureType.name;
      acc[name] = (acc[name] || 0) + 1;
      return acc;
    },
    {},
  );
  const topStructureBreakdown = Object.entries(structureCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([name, count]) => `${count} ${name.toLowerCase()}`);
  const promoValueLabel = catalog.promo
    ? catalog.promo.type === "PERCENT"
      ? `${catalog.promo.value}%`
      : catalog.promo.type === "FIXED"
        ? `${catalog.promo.value}`
        : `${catalog.promo.value}`
    : null;

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

      <section className="relative mx-auto w-full max-w-7xl px-6 pb-12 pt-4">
        <form
          action="/"
          className="mt-8 grid gap-4 rounded-3xl border border-white/60 bg-white/85 p-5 shadow-xl shadow-[#fcb814]/20 backdrop-blur-xl md:grid-cols-[1.6fr_1fr_0.8fr_auto] md:items-end"
        >
          <label className="flex flex-col gap-2 text-xs font-semibold text-neutral-600">
            ¿Dónde quieres anunciarte?
            <div className="flex items-center gap-3 rounded-2xl border border-neutral-200 bg-white px-4 py-3">
              <Search className="h-4 w-4 text-neutral-500" />
              <input
                name="q"
                defaultValue={query ?? ""}
                placeholder="Ciudad de Panamá, Vía España, Albrook..."
                className="w-full bg-transparent text-sm font-medium text-neutral-900 placeholder:text-neutral-400 focus:outline-none"
              />
            </div>
          </label>

          <label className="flex flex-col gap-2 text-xs font-semibold text-neutral-600">
            ¿Qué tipo de estructura?
            <select
              name="type"
              defaultValue={typeId ?? ""}
              className="rounded-2xl border border-neutral-200 bg-white px-4 py-3 text-sm font-medium text-neutral-900"
            >
              <option value="">Todas las estructuras</option>
              {structureTypes.map((type) => (
                <option key={type.id} value={type.id}>
                  {type.name}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-2 text-xs font-semibold text-neutral-600">
            ¿Cuántos espacios?
            <select
              className="rounded-2xl border border-neutral-200 bg-white px-4 py-3 text-sm font-medium text-neutral-900"
              defaultValue=""
            >
              <option value="">Indistinto</option>
              <option value="1-2">1 a 2</option>
              <option value="3-5">3 a 5</option>
              <option value="6-10">6 a 10</option>
              <option value="11+">11 o más</option>
            </select>
          </label>

          <div className="flex flex-col gap-2">
            <button
              type="submit"
              className="flex items-center justify-center gap-2 rounded-2xl bg-[#0359A8] px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-[#0359A8]/30 hover:bg-[#024a8c]"
            >
              Buscar espacios
              <ChevronRight className="h-4 w-4" />
            </button>
            <span className="hidden items-center justify-center gap-2 rounded-2xl border border-neutral-200 bg-white px-4 py-3 text-[11px] font-semibold text-neutral-500 md:flex">
              <Calendar className="h-4 w-4" />
              Rango de fechas
            </span>
          </div>

          {zoneId && <input type="hidden" name="zone" value={zoneId} />}
        </form>

        {showPromo ? (
          <div
            className="mt-6 flex items-center gap-3 rounded-2xl border border-[#fcb814]/60 bg-[#fff6dd] px-4 py-3 text-sm text-[#0359A8]"
            style={{ animation: "rise 0.7s ease 0.1s forwards" }}
          >
            <Sparkles className="h-4 w-4" />
            <span className="font-semibold">
              {promoValueLabel
                ? `${promoValueLabel} de descuento en campañas por zona en Panamá`
                : "Descuento activo en campañas por zona en Panamá"}
            </span>
          </div>
        ) : null}
      </section>

      <section className="mx-auto w-full max-w-7xl px-6 pb-16">
        <div className="mt-8">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-neutral-900">
              Explorar tipos de estructura
            </h2>
          </div>
          <div className="mt-4 flex gap-4 overflow-x-auto pb-2">
            {structureTypes.slice(0, 12).map((type) => {
              const url = buildSearchUrl({ ...currentFilters, type: type.id });
              const isActive = type.id === typeId;
              return (
                <Link
                  key={type.id}
                  href={url}
                  className={`group relative flex-shrink-0 overflow-hidden rounded-2xl transition ${
                    isActive
                      ? "ring-2 ring-[#0359A8] ring-offset-2"
                      : "hover:shadow-lg"
                  }`}
                  style={{ width: 160 }}
                >
                  {type.imageUrl ? (
                    <div className="relative aspect-[4/3] w-full overflow-hidden">
                      <img
                        src={type.imageUrl}
                        alt={type.name}
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
                  {isActive && (
                    <div className="absolute top-2 right-2 h-5 w-5 rounded-full bg-[#0359A8] flex items-center justify-center">
                      <span className="h-2 w-2 rounded-full bg-white" />
                    </div>
                  )}
                </Link>
              );
            })}
          </div>
        </div>

        <div className="mt-10">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-neutral-900">
              Explorar zonas
            </h2>
          </div>
          <div className="mt-4 flex gap-4 overflow-x-auto pb-2">
            {zones.slice(0, 12).map((zone) => {
              const url = buildSearchUrl({ ...currentFilters, zone: zone.id });
              const isActive = zone.id === zoneId;
              return (
                <Link
                  key={zone.id}
                  href={url}
                  className={`group relative flex-shrink-0 overflow-hidden rounded-2xl transition ${
                    isActive
                      ? "ring-2 ring-[#0359A8] ring-offset-2"
                      : "hover:shadow-lg"
                  }`}
                  style={{ width: 160 }}
                >
                  {zone.imageUrl ? (
                    <div className="relative aspect-[4/3] w-full overflow-hidden">
                      <img
                        src={zone.imageUrl}
                        alt={zone.name}
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
                  {isActive && (
                    <div className="absolute top-2 right-2 h-5 w-5 rounded-full bg-[#0359A8] flex items-center justify-center">
                      <span className="h-2 w-2 rounded-full bg-white" />
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
                          Iluminado
                        </span>
                      ) : null}
                      {face.catalogFace?.highlight ? (
                        <span className="rounded-full bg-[#e6efff] px-3 py-1 text-xs font-semibold text-[#0359A8]">
                          {face.catalogFace.highlight}
                        </span>
                      ) : null}
                    </div>

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
                    <p className="text-xs text-neutral-500">
                      Tráfico estimado: {trafficLabel}
                    </p>

                    {showPrices ? (
                      <div className="flex items-center justify-between pt-2">
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
                    ) : (
                      <Link
                        href="/login"
                        className="inline-flex items-center gap-2 rounded-full border border-neutral-200 bg-white px-4 py-2 text-xs font-semibold text-neutral-700 hover:border-neutral-300"
                      >
                        Inicia sesión para ver precios
                        <ChevronRight className="h-3 w-3" />
                      </Link>
                    )}

                    <button
                      type="button"
                      className="mt-2 inline-flex items-center gap-2 rounded-full bg-[#0359A8] px-4 py-2 text-xs font-semibold text-white shadow-md shadow-[#0359A8]/30 hover:bg-[#024a8c]"
                    >
                      Añadir a campaña
                      <ChevronRight className="h-3 w-3" />
                    </button>
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
