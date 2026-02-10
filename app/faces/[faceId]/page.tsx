import Image from "next/image";
import Link from "next/link";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  BadgeCheck,
  FileText,
  Heart,
  MapPin,
  Ruler,
  Share2,
  ShieldCheck,
  Sparkles,
  Wrench,
} from "lucide-react";
import { auth } from "@/lib/auth";
import { formatFaceDimensions, formatPrice } from "@/lib/formatters/catalog-face";
import { getPublicCatalogFaceDetailById } from "@/lib/services/catalog";
import { getUserProfileByUserId } from "@/lib/services/user-profile";

type PageProps = {
  params: Promise<{ faceId: string }>;
  searchParams: Promise<{ from?: string | string[] }>;
};

type GalleryItem = {
  url: string;
  caption: string;
};

function getParam(value?: string | string[]) {
  if (Array.isArray(value)) return value[0];
  return value;
}

function toNumber(value: unknown) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return null;
  return parsed;
}

function toValidDate(value: unknown) {
  if (value instanceof Date && Number.isFinite(value.getTime())) {
    return value;
  }

  if (typeof value === "string" || typeof value === "number") {
    const parsed = new Date(value);
    if (Number.isFinite(parsed.getTime())) {
      return parsed;
    }
  }

  return null;
}

function formatDate(value?: Date | string | number | null) {
  const date = toValidDate(value);
  if (!date) return "N/D";
  return new Intl.DateTimeFormat("es-PA", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

function formatDateTime(value?: Date | string | number | null) {
  const date = toValidDate(value);
  if (!date) return "N/D";
  return new Intl.DateTimeFormat("es-PA", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function formatNumber(value: number, maximumFractionDigits = 0) {
  return new Intl.NumberFormat("es-PA", {
    maximumFractionDigits,
  }).format(value);
}

function facingLabel(value: string) {
  return value === "OPPOSITE_TRAFFIC" ? "Sentido opuesto" : "Sentido de tráfico";
}

function statusLabel(value: string) {
  const normalized = value.toLowerCase();
  if (normalized === "active") return "activo";
  if (normalized === "inactive") return "inactivo";
  if (normalized === "maintenance") return "mantenimiento";
  if (normalized === "retired") return "retirado";
  return normalized;
}

function dedupeGallery(items: GalleryItem[]) {
  const seen = new Set<string>();
  const unique: GalleryItem[] = [];
  for (const item of items) {
    if (!item.url || seen.has(item.url)) continue;
    seen.add(item.url);
    unique.push(item);
  }
  return unique;
}

function buildMapsUrl(latitude: unknown, longitude: unknown) {
  const lat = toNumber(latitude);
  const lng = toNumber(longitude);
  if (lat === null || lng === null) return null;
  return `https://www.google.com/maps?q=${lat},${lng}`;
}

export default async function FaceDetailPage({ params, searchParams }: PageProps) {
  const { faceId } = await params;
  const awaitedSearchParams = await searchParams;
  const fromParam = getParam(awaitedSearchParams.from);
  const returnHref = fromParam?.startsWith("/") ? fromParam : "/";

  const session = await auth.api.getSession({
    headers: await headers(),
  });

  const profile = session?.user?.id
    ? await getUserProfileByUserId(session.user.id)
    : null;
  const organizationId =
    profile?.organizationRoles?.[0]?.organization?.id || undefined;

  const detail = await getPublicCatalogFaceDetailById(faceId, { organizationId });
  if (!detail) notFound();

  const { face, effectivePrice, relatedFaces, promo } = detail;
  const catalogFace = face.catalogFace;
  if (!catalogFace) notFound();

  const showPrices = Boolean(session);
  const title =
    catalogFace.title || `${face.asset.structureType.name} · Cara ${face.code}`;
  const location = `${face.asset.zone.name}, ${face.asset.zone.province.name}`;
  const dimensions = formatFaceDimensions(face.width, face.height);
  const width = toNumber(face.width);
  const height = toNumber(face.height);
  const area = width !== null && height !== null ? width * height : null;
  const mapsUrl = buildMapsUrl(face.asset.latitude, face.asset.longitude);
  const coordinates =
    toNumber(face.asset.latitude) !== null && toNumber(face.asset.longitude) !== null
      ? `${toNumber(face.asset.latitude)}, ${toNumber(face.asset.longitude)}`
      : "N/D";

  const gallery = dedupeGallery([
    ...(catalogFace.primaryImageUrl
      ? [
          {
            url: catalogFace.primaryImageUrl,
            caption: catalogFace.title || `${face.asset.code}-${face.code}`,
          },
        ]
      : []),
    ...face.images.map((image) => ({
      url: image.image,
      caption: image.caption || `Cara ${face.code}`,
    })),
    ...face.asset.images.map((image) => ({
      url: image.image,
      caption: image.caption || `Activo ${face.asset.code}`,
    })),
  ]);
  const gallerySlots: Array<GalleryItem | null> = Array.from(
    { length: 5 },
    (_, index) => gallery[index] ?? null
  );

  const maintenanceById = new Map<
    string,
    { id: string; source: "Cara" | "Activo"; startDate: Date; endDate: Date; reason: string }
  >();
  for (const item of face.asset.maintenanceWindows) {
    maintenanceById.set(item.id, {
      id: item.id,
      source: item.faceId ? "Cara" : "Activo",
      startDate: item.startDate,
      endDate: item.endDate,
      reason: item.reason,
    });
  }
  for (const item of face.maintenanceWindows) {
    maintenanceById.set(item.id, {
      id: item.id,
      source: "Cara",
      startDate: item.startDate,
      endDate: item.endDate,
      reason: item.reason,
    });
  }
  const maintenanceWindows = Array.from(maintenanceById.values()).sort(
    (a, b) => a.startDate.getTime() - b.startDate.getTime()
  );

  const permitById = new Map<
    string,
    {
      id: string;
      permitNumber: string | null;
      authority: string | null;
      issuedDate: Date | null;
      expiresDate: Date | null;
      scope: "Cara" | "Activo";
      document: string | null;
    }
  >();
  for (const permit of face.asset.permits) {
    permitById.set(permit.id, {
      id: permit.id,
      permitNumber: permit.permitNumber,
      authority: permit.authority,
      issuedDate: permit.issuedDate,
      expiresDate: permit.expiresDate,
      scope: permit.faceId ? "Cara" : "Activo",
      document: permit.document,
    });
  }
  for (const permit of face.permits) {
    permitById.set(permit.id, {
      id: permit.id,
      permitNumber: permit.permitNumber,
      authority: permit.authority,
      issuedDate: permit.issuedDate,
      expiresDate: permit.expiresDate,
      scope: "Cara",
      document: permit.document,
    });
  }
  const permits = Array.from(permitById.values()).sort((a, b) => {
    if (!a.expiresDate && !b.expiresDate) return 0;
    if (!a.expiresDate) return 1;
    if (!b.expiresDate) return -1;
    return a.expiresDate.getTime() - b.expiresDate.getTime();
  });

  const activeHolds = catalogFace.holds.length;
  const nextHoldExpiration = catalogFace.holds[0]?.expiresAt ?? null;
  const priceDailyLabel =
    effectivePrice && showPrices
      ? formatPrice(Number(effectivePrice.priceDaily), effectivePrice.currency ?? "USD")
      : null;
  const promoLabel = promo
    ? promo.type === "PERCENT"
      ? `${promo.value}%`
      : formatNumber(Number(promo.value))
    : null;

  return (
    <div className="min-h-screen bg-[#f7f7f7] text-neutral-900">
      <main className="mx-auto w-full max-w-7xl px-5 pb-16 pt-8">
        <section className="mb-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Link
              href={returnHref}
              className="inline-flex items-center gap-2 rounded-full border border-neutral-300 bg-white px-4 py-2 text-sm font-medium text-neutral-700 transition hover:bg-neutral-50"
            >
              <ArrowLeft className="h-4 w-4" />
              Volver
            </Link>

            <div className="flex items-center gap-2">
              <button
                type="button"
                className="inline-flex items-center gap-2 rounded-full border border-neutral-300 bg-white px-4 py-2 text-sm font-medium text-neutral-700 transition hover:bg-neutral-50"
              >
                <Share2 className="h-4 w-4" />
                Compartir
              </button>
              <button
                type="button"
                className="inline-flex items-center gap-2 rounded-full border border-neutral-300 bg-white px-4 py-2 text-sm font-medium text-neutral-700 transition hover:bg-neutral-50"
              >
                <Heart className="h-4 w-4" />
                Guardar
              </button>
            </div>
          </div>

          <div className="mt-5 flex flex-wrap items-center gap-2">
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-[#0359A8] text-white">
              <Sparkles className="h-4 w-4" />
            </span>
            <h1 className="text-3xl font-semibold tracking-tight text-neutral-950">{title}</h1>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-neutral-600">
            <span className="inline-flex items-center gap-1">
              <BadgeCheck className="h-3.5 w-3.5 text-neutral-700" />
              {catalogFace.isPublished ? "Publicado" : "No publicado"}
            </span>
            <span>
              Código: {face.asset.code}-{face.code}
            </span>
            <span>{location}</span>
            <span>Actualizado: {formatDateTime(face.updatedAt)}</span>
          </div>
        </section>

        <section className="overflow-hidden rounded-3xl">
          <div className="grid gap-2 lg:grid-cols-[1.65fr_1fr]">
            <div className="relative min-h-[280px] overflow-hidden rounded-3xl bg-neutral-200 lg:min-h-[460px]">
              {gallerySlots[0] ? (
                <Image
                  src={gallerySlots[0].url}
                  alt={gallerySlots[0].caption}
                  fill
                  priority
                  sizes="(max-width: 1024px) 100vw, 66vw"
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full items-end bg-gradient-to-br from-neutral-300 to-neutral-200 p-5">
                  <span className="rounded-full bg-white/85 px-3 py-1 text-xs font-semibold text-neutral-700">
                    Sin imagen principal
                  </span>
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-2">
              {gallerySlots.slice(1).map((image, index) => (
                <div
                  key={`gallery-slot-${index + 1}`}
                  className="relative min-h-[140px] overflow-hidden rounded-2xl bg-neutral-200 lg:min-h-[228px]"
                >
                  {image ? (
                    <Image
                      src={image.url}
                      alt={image.caption}
                      fill
                      sizes="(max-width: 1024px) 50vw, 20vw"
                      className="h-full w-full object-cover"
                      loading="lazy"
                    />
                  ) : (
                    <div className="h-full w-full bg-gradient-to-br from-neutral-300 to-neutral-200" />
                  )}
                  {index === 3 ? (
                    <button
                      type="button"
                      className="absolute bottom-3 right-3 rounded-xl border border-neutral-300 bg-white px-3 py-2 text-xs font-semibold text-neutral-800 shadow-sm"
                    >
                      Ver {gallery.length} fotos
                    </button>
                  ) : null}
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1fr)_370px]">
          <div className="space-y-6">
            <article className="rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm">
              <h2 className="text-xl font-semibold text-neutral-900">Detalle del espacio</h2>
              <p className="mt-3 text-sm leading-7 text-neutral-700">
                {catalogFace.summary || "Sin resumen cargado para esta cara."}
              </p>

              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border border-neutral-200 p-4">
                  <p className="text-xs text-neutral-500">Tipo de estructura</p>
                  <p className="mt-1 text-sm font-semibold text-neutral-900">
                    {face.asset.structureType.name}
                  </p>
                </div>
                <div className="rounded-2xl border border-neutral-200 p-4">
                  <p className="text-xs text-neutral-500">Posición y orientación</p>
                  <p className="mt-1 text-sm font-semibold text-neutral-900">
                    {face.position?.name || "N/D"} · {facingLabel(face.facing)}
                  </p>
                </div>
                <div className="rounded-2xl border border-neutral-200 p-4">
                  <p className="text-xs text-neutral-500">Dimensiones</p>
                  <p className="mt-1 text-sm font-semibold text-neutral-900">
                    {dimensions?.label || "N/D"}
                  </p>
                </div>
                <div className="rounded-2xl border border-neutral-200 p-4">
                  <p className="text-xs text-neutral-500">Área</p>
                  <p className="mt-1 text-sm font-semibold text-neutral-900">
                    {area !== null ? `${formatNumber(area, 1)} m²` : "N/D"}
                  </p>
                </div>
                <div className="rounded-2xl border border-neutral-200 p-4">
                  <p className="text-xs text-neutral-500">Digital / Iluminado</p>
                  <p className="mt-1 text-sm font-semibold text-neutral-900">
                    {face.asset.digital ? "Digital" : "No digital"} ·{" "}
                    {face.asset.illuminated ? "Iluminado" : "No iluminado"}
                  </p>
                </div>
                <div className="rounded-2xl border border-neutral-200 p-4">
                  <p className="text-xs text-neutral-500">Estado</p>
                  <p className="mt-1 text-sm font-semibold text-neutral-900">
                    Activo: {statusLabel(face.asset.status)} · Cara: {statusLabel(face.status)}
                  </p>
                </div>
              </div>
            </article>

            <article id="technical-specs" className="rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm">
              <h3 className="flex items-center gap-2 text-lg font-semibold text-neutral-900">
                <Ruler className="h-4 w-4 text-[#ff385c]" />
                Especificaciones técnicas
              </h3>
              <div className="mt-4 space-y-2 text-sm text-neutral-700">
                <p>
                  <span className="font-semibold text-neutral-900">Cara:</span> {face.asset.code}-
                  {face.code}
                </p>
                <p>
                  <span className="font-semibold text-neutral-900">Material:</span>{" "}
                  {face.productionSpec?.material || "N/D"}
                </p>
                <p>
                  <span className="font-semibold text-neutral-900">Montaje:</span>{" "}
                  {face.productionSpec?.mountingType?.name || "N/D"}
                </p>
                <p>
                  <span className="font-semibold text-neutral-900">Formato:</span>{" "}
                  {face.productionSpec?.fileFormat || "N/D"}
                </p>
                <p>
                  <span className="font-semibold text-neutral-900">DPI recomendado:</span>{" "}
                  {face.productionSpec?.dpiRecommended || "N/D"}
                </p>
                <p>
                  <span className="font-semibold text-neutral-900">Sangrado:</span>{" "}
                  {face.productionSpec?.bleedCm
                    ? `${formatNumber(Number(face.productionSpec.bleedCm), 2)} cm`
                    : "N/D"}
                </p>
                <p>
                  <span className="font-semibold text-neutral-900">Margen seguro:</span>{" "}
                  {face.productionSpec?.safeMarginCm
                    ? `${formatNumber(Number(face.productionSpec.safeMarginCm), 2)} cm`
                    : "N/D"}
                </p>
                <p>
                  <span className="font-semibold text-neutral-900">Notas instalación:</span>{" "}
                  {face.productionSpec?.installNotes || "N/D"}
                </p>
                <p>
                  <span className="font-semibold text-neutral-900">Notas desmontaje:</span>{" "}
                  {face.productionSpec?.uninstallNotes || "N/D"}
                </p>
              </div>
            </article>

            <article className="rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm">
              <h3 className="text-lg font-semibold text-neutral-900">Ubicación y operación</h3>
              <div className="mt-4 space-y-2 text-sm text-neutral-700">
                <p>
                  <span className="font-semibold text-neutral-900">Dirección:</span> {face.asset.address}
                </p>
                <p>
                  <span className="font-semibold text-neutral-900">Referencia:</span>{" "}
                  {face.asset.landmark || "N/D"}
                </p>
                <p>
                  <span className="font-semibold text-neutral-900">Tipo de vía:</span>{" "}
                  {face.asset.roadType?.name || "N/D"}
                </p>
                <p>
                  <span className="font-semibold text-neutral-900">Coordenadas:</span> {coordinates}
                </p>
                <p>
                  <span className="font-semibold text-neutral-900">Instalado:</span>{" "}
                  {formatDate(face.asset.installedDate)}
                </p>
                <p>
                  <span className="font-semibold text-neutral-900">Retirado:</span>{" "}
                  {formatDate(face.asset.retiredDate)}
                </p>
                <p>
                  <span className="font-semibold text-neutral-900">Notas de visibilidad:</span>{" "}
                  {face.visibilityNotes || "N/D"}
                </p>
                <p>
                  <span className="font-semibold text-neutral-900">Notas de cara:</span>{" "}
                  {face.notes || "N/D"}
                </p>
                <p>
                  <span className="font-semibold text-neutral-900">Notas de activo:</span>{" "}
                  {face.asset.notes || "N/D"}
                </p>
              </div>
              {mapsUrl ? (
                <a
                  href={mapsUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-4 inline-flex items-center gap-2 rounded-full border border-neutral-300 bg-white px-4 py-2 text-sm font-semibold text-neutral-800 transition hover:bg-neutral-50"
                >
                  <MapPin className="h-4 w-4" />
                  Abrir en Google Maps
                </a>
              ) : null}
            </article>

            <article className="rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm">
              <h3 className="flex items-center gap-2 text-lg font-semibold text-neutral-900">
                <ShieldCheck className="h-4 w-4 text-[#ff385c]" />
                Restricciones, permisos y mantenimiento
              </h3>

              <div className="mt-4 rounded-2xl border border-neutral-200 bg-neutral-50 p-4">
                <p className="text-sm font-semibold text-neutral-900">Etiquetas de restricción</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {face.restrictionTags.length ? (
                    face.restrictionTags.map((restriction) => (
                      <span
                        key={restriction.id}
                        className="rounded-full border border-neutral-300 bg-white px-2.5 py-1 text-xs text-neutral-700"
                      >
                        {restriction.tag.label}
                      </span>
                    ))
                  ) : (
                    <span className="text-xs text-neutral-500">Sin etiquetas registradas.</span>
                  )}
                </div>
                {face.restrictions ? (
                  <p className="mt-2 text-xs text-neutral-600">{face.restrictions}</p>
                ) : null}
              </div>

              <div className="mt-4 rounded-2xl border border-neutral-200 bg-neutral-50 p-4">
                <p className="flex items-center gap-2 text-sm font-semibold text-neutral-900">
                  <FileText className="h-4 w-4 text-[#ff385c]" />
                  Permisos
                </p>
                {permits.length ? (
                  <div className="mt-2 space-y-2">
                    {permits.slice(0, 6).map((permit) => (
                      <div key={permit.id} className="text-xs text-neutral-600">
                        <p>
                          {permit.scope} · {permit.permitNumber || "Sin número"} ·{" "}
                          {permit.authority || "Autoridad N/D"}
                        </p>
                        <p>
                          Emisión: {formatDate(permit.issuedDate)} · Vence:{" "}
                          {formatDate(permit.expiresDate)}
                        </p>
                        {permit.document ? (
                          <a
                            href={permit.document}
                            target="_blank"
                            rel="noreferrer"
                            className="font-semibold text-[#0359A8] hover:underline"
                          >
                            Ver documento
                          </a>
                        ) : null}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="mt-2 text-xs text-neutral-500">No hay permisos registrados.</p>
                )}
              </div>

              <div className="mt-4 rounded-2xl border border-neutral-200 bg-neutral-50 p-4">
                <p className="flex items-center gap-2 text-sm font-semibold text-neutral-900">
                  <Wrench className="h-4 w-4 text-[#ff385c]" />
                  Ventanas de mantenimiento
                </p>
                {maintenanceWindows.length ? (
                  <div className="mt-2 space-y-2">
                    {maintenanceWindows.slice(0, 6).map((window) => (
                      <p key={window.id} className="text-xs text-neutral-600">
                        {window.source} · {window.reason} · {formatDate(window.startDate)} -{" "}
                        {formatDate(window.endDate)}
                      </p>
                    ))}
                  </div>
                ) : (
                  <p className="mt-2 text-xs text-neutral-500">Sin mantenimientos programados.</p>
                )}
              </div>
            </article>

            {showPrices ? (
              <article className="rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm">
                <h3 className="text-lg font-semibold text-neutral-900">Reglas de precio</h3>
                <div className="mt-3 space-y-2">
                  {catalogFace.priceRules.length ? (
                    catalogFace.priceRules.slice(0, 6).map((rule) => (
                      <div
                        key={rule.id}
                        className="rounded-xl border border-neutral-200 bg-neutral-50 p-3 text-xs text-neutral-700"
                      >
                        <p className="font-semibold text-neutral-900">
                          {formatPrice(Number(rule.priceDaily), rule.currency)}
                        </p>
                        <p>
                          Vigencia: {formatDate(rule.startDate)} - {formatDate(rule.endDate)}
                        </p>
                        <p>
                          Alcance:{" "}
                          {rule.faceId
                            ? "Cara"
                            : rule.zoneId
                              ? `Zona (${rule.zone?.name || "N/D"})`
                              : rule.structureTypeId
                                ? `Tipo (${rule.structureType?.name || "N/D"})`
                                : rule.organizationId
                                  ? `Organización (${rule.organization?.name || "N/D"})`
                                  : "Global"}
                        </p>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-neutral-500">No hay reglas configuradas.</p>
                  )}
                </div>
              </article>
            ) : null}
          </div>

          <aside className="space-y-4 lg:sticky lg:top-6 lg:self-start">
            <div className="rounded-3xl border border-neutral-200 bg-white p-5 shadow-lg shadow-neutral-300/50">
              <p className="text-xs uppercase tracking-[0.22em] text-neutral-500">
                Precio y reserva
              </p>

              {showPrices ? (
                <>
                  <p className="mt-3 text-3xl font-semibold text-neutral-900">
                    {priceDailyLabel || "Precio no configurado"}
                  </p>
                  <p className="text-sm text-neutral-500">por día</p>

                  {promo && promoLabel ? (
                    <p className="mt-2 text-xs font-semibold text-[#ff385c]">
                      Promo activa: {promo.name} · {promoLabel}
                    </p>
                  ) : null}

                  <div className="mt-4 rounded-xl border border-neutral-200 bg-neutral-50 p-3 text-xs text-neutral-700">
                    <p>Bloqueos activos: {activeHolds}</p>
                    <p>Próximo vencimiento de bloqueo: {formatDateTime(nextHoldExpiration)}</p>
                  </div>

                  <button
                    type="button"
                    className="mt-4 w-full rounded-xl bg-[#ff385c] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#e32f52]"
                  >
                    Reservar (próximamente)
                  </button>
                  <p className="mt-2 text-center text-[11px] text-neutral-500">
                    Solo usuarios autenticados pueden ver precios y reservar.
                  </p>
                </>
              ) : (
                <>
                  <div className="mt-3 rounded-xl border border-neutral-200 bg-neutral-50 p-4 text-sm text-neutral-700">
                    Debes iniciar sesión para ver precios y habilitar reservas.
                  </div>
                  <Link
                    href="/login"
                    className="mt-4 block w-full rounded-xl bg-[#ff385c] px-4 py-3 text-center text-sm font-semibold text-white transition hover:bg-[#e32f52]"
                  >
                    Iniciar sesión
                  </Link>
                </>
              )}
            </div>

            <button
              type="button"
              className="w-full rounded-xl border border-neutral-300 bg-white px-4 py-2 text-sm font-medium text-neutral-700 transition hover:bg-neutral-50"
            >
              Reportar este espacio
            </button>
          </aside>
        </section>

        {relatedFaces.length > 0 ? (
          <section className="mt-10">
            <h3 className="text-xl font-semibold text-neutral-900">Espacios similares en esta zona</h3>
            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {relatedFaces.map((item) => {
                const itemTitle =
                  item.catalogFace?.title || `${item.asset.structureType.name} · Cara ${item.code}`;
                const itemImage = item.catalogFace?.primaryImageUrl;
                const itemPrice =
                  item.effectivePrice && showPrices
                    ? formatPrice(
                        Number(item.effectivePrice.priceDaily),
                        item.effectivePrice.currency ?? "USD"
                      )
                    : null;

                return (
                  <Link
                    key={item.id}
                    href={`/faces/${item.id}?from=${encodeURIComponent(`/faces/${face.id}`)}`}
                    className="group overflow-hidden rounded-2xl border border-neutral-200 bg-white transition hover:-translate-y-0.5 hover:border-neutral-300 hover:shadow-lg"
                  >
                    <div className="relative aspect-[4/3] bg-neutral-200">
                      {itemImage ? (
                        <Image
                          src={itemImage}
                          alt={itemTitle}
                          fill
                          sizes="(max-width: 768px) 100vw, 33vw"
                          className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                          loading="lazy"
                        />
                      ) : (
                        <div className="h-full w-full bg-gradient-to-br from-neutral-300 to-neutral-200" />
                      )}
                    </div>
                    <div className="space-y-1.5 p-4">
                      <p className="line-clamp-1 text-sm font-semibold text-neutral-900">{itemTitle}</p>
                      <p className="text-xs text-neutral-500">
                        {item.asset.zone.name}, {item.asset.zone.province.name}
                      </p>
                      {showPrices ? (
                        <p className="text-sm font-semibold text-neutral-900">
                          {itemPrice || "Precio no configurado"}
                        </p>
                      ) : (
                        <p className="text-xs font-semibold text-neutral-600">
                          Inicia sesión para ver precio y reservar
                        </p>
                      )}
                    </div>
                  </Link>
                );
              })}
            </div>
          </section>
        ) : null}

        <footer className="mt-10 rounded-3xl border border-neutral-200 bg-white px-5 py-4 text-xs text-neutral-500">
          Última actualización de inventario: {formatDateTime(face.updatedAt)}
        </footer>
      </main>
    </div>
  );
}
