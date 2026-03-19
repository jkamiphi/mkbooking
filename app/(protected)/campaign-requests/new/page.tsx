import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import {
  computeMinimumStartDate,
  sanitizeDateRangeStrings,
  toDateInputValue,
} from "@/lib/date/campaign-date-range";
import { getCampaignRequestStartGapDays } from "@/lib/server-config";
import { createServerTRPCCaller } from "@/lib/trpc/server";
import { NewCampaignRequestForm } from "./new-campaign-request-form";

type PageProps = {
  searchParams: Promise<{
    q?: string | string[];
    type?: string | string[];
    zone?: string | string[];
    qty?: string | string[];
    from?: string | string[];
    to?: string | string[];
    faces?: string | string[];
    returnTo?: string | string[];
  }>;
};

function getParam(value?: string | string[]) {
  if (Array.isArray(value)) return value[0];
  return value;
}

function quantityFromPreset(value?: string) {
  if (value === "1-2") return 2;
  if (value === "3-5") return 5;
  if (value === "6-10") return 10;
  if (value === "11+") return 11;

  const parsed = Number(value);
  if (Number.isFinite(parsed) && parsed >= 1) return parsed;
  return 1;
}

export const metadata = {
  title: "Nueva solicitud de campaña - MK Booking",
  description: "Crea una solicitud de campaña por zona y tipo de estructura",
};

export default async function NewCampaignRequestPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const caller = await createServerTRPCCaller();
  const minimumStartDate = computeMinimumStartDate(
    getCampaignRequestStartGapDays(),
  );
  const sanitizedRange = sanitizeDateRangeStrings({
    fromDate: getParam(params.from),
    toDate: getParam(params.to),
    minimumStartDate,
    minimumDurationDays: 1,
    mode: "drop-invalid",
  });

  const facesParam = getParam(params.faces) || "";
  const faceIds = facesParam
    ? facesParam.split(",").filter((id) => id.trim().length > 0)
    : [];

  const [profile, structureTypes, zones, contextState] = await Promise.all([
    caller.userProfile.current(),
    caller.inventory.structureTypes.publicList(),
    caller.inventory.zones.publicList(),
    caller.organization.myContexts(),
  ]);
  const activeContext = contextState.activeContext;
  const isAgencyContextWithoutBrand =
    contextState.accountType === "AGENCY" &&
    activeContext?.organizationType === "AGENCY" &&
    !activeContext.targetBrandOrganizationId;

  let selectedFacesData: Array<{
    id: string;
    title: string;
    location: string;
    imageUrl: string | null;
    priceLabel: string | null;
    priceDaily: number | null;
    currency: string;
    structureType: string;
  }> = [];

  const returnToParam = getParam(params.returnTo);
  const returnTo = returnToParam?.startsWith("/") ? returnToParam : "/s/all";

  if (isAgencyContextWithoutBrand) {
    return (
      <div>
        <div className="mb-8">
          <Link
            href="/campaign-requests"
            className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-neutral-500 transition hover:text-neutral-700"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Volver a solicitudes
          </Link>
          <h1 className="text-2xl font-bold tracking-tight text-neutral-900">
            Nueva solicitud de campaña
          </h1>
        </div>
        <section className="rounded-md border border-amber-200 bg-amber-50/70 p-5">
          <h2 className="text-base font-semibold text-amber-900">
            Selecciona una marca cliente para continuar
          </h2>
          <p className="mt-1 text-sm text-amber-800">
            Estás operando en vista agregada de agencia (
            {activeContext.organizationName}). Para crear solicitudes debes
            elegir una marca cliente en el selector de contexto.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link
              href="/campaign-requests"
              className="inline-flex items-center rounded-xs bg-[#0359A8] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#024a8f]"
            >
              Ir a solicitudes
            </Link>
            <Link
              href="/profile"
              className="inline-flex items-center rounded-xs border border-neutral-200 bg-white px-4 py-2 text-sm font-medium text-neutral-700 transition hover:bg-neutral-50"
            >
              Abrir perfil
            </Link>
          </div>
        </section>
      </div>
    );
  }

  if (faceIds.length > 0) {
    const brandId = profile?.activeOrganizationContext?.brandId ?? undefined;
    const catalog = await caller.catalog.faces.publicList({
      isPublished: true,
      take: 100,
      brandId,
    });

    const faceIdSet = new Set(faceIds);
    selectedFacesData = catalog.faces
      .filter((face) => faceIdSet.has(face.id))
      .map((face) => ({
        id: face.id,
        title:
          face.catalogFace?.title ||
          `${face.asset.structureType.name} · Cara ${face.code}`,
        location: `${face.asset.zone.name}, ${face.asset.zone.province.name}`,
        imageUrl: face.resolvedImageUrl ?? null,
        priceLabel: face.effectivePrice
          ? `$${Number(face.effectivePrice.priceDaily).toFixed(2)}`
          : null,
        priceDaily: face.effectivePrice ? Number(face.effectivePrice.priceDaily) : null,
        currency: face.effectivePrice?.currency ?? "USD",
        structureType: face.asset.structureType.name,
      }));
  }

  const defaultQuantity =
    selectedFacesData.length > 0
      ? selectedFacesData.length
      : quantityFromPreset(getParam(params.qty) || undefined);

  return (
    <div>
      <div className="mb-8">
        <Link
          href={returnTo}
          className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-neutral-500 transition hover:text-neutral-700"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Volver
        </Link>
        <h1 className="text-2xl font-bold tracking-tight text-neutral-900">
          Nueva solicitud de campaña
        </h1>
        <p className="mt-1 text-sm text-neutral-500">
          {selectedFacesData.length > 0
            ? `Cotización para ${selectedFacesData.length} ${selectedFacesData.length === 1 ? "cara seleccionada" : "caras seleccionadas"}.`
            : "Solicita caras por criterio y el equipo preparará una propuesta."}
        </p>
      </div>

      <NewCampaignRequestForm
        query={getParam(params.q) || undefined}
        defaultStructureTypeId={getParam(params.type) || undefined}
        defaultZoneId={getParam(params.zone) || undefined}
        defaultQuantity={defaultQuantity}
        defaultFromDate={sanitizedRange.fromDate}
        defaultToDate={sanitizedRange.toDate}
        minimumStartDate={toDateInputValue(minimumStartDate)}
        minimumDurationDays={1}
        defaultContactName={profile?.firstName || profile?.user?.name || undefined}
        defaultContactEmail={profile?.user?.email || undefined}
        defaultContactPhone={profile?.phone || undefined}
        returnTo={returnTo}
        structureTypes={structureTypes.map((type) => ({
          id: type.id,
          name: type.name,
        }))}
        zones={zones.map((zone) => ({
          id: zone.id,
          name: zone.name,
          province: { name: zone.province.name },
        }))}
        selectedFaces={selectedFacesData}
      />
    </div>
  );
}
