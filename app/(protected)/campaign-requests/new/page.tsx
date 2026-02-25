import Link from "next/link";
import { ArrowLeft } from "lucide-react";
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

  const facesParam = getParam(params.faces) || "";
  const faceIds = facesParam
    ? facesParam.split(",").filter((id) => id.trim().length > 0)
    : [];

  const [profile, structureTypes, zones] = await Promise.all([
    caller.userProfile.current(),
    caller.inventory.structureTypes.publicList(),
    caller.inventory.zones.publicList(),
  ]);

  // Fetch selected face details if any
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

  if (faceIds.length > 0) {
    const organizationId =
      profile?.organizationRoles?.[0]?.organization?.id || undefined;
    const catalog = await caller.catalog.faces.publicList({
      isPublished: true,
      take: 100,
      organizationId,
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
        imageUrl: face.catalogFace?.primaryImageUrl ?? null,
        priceLabel: face.effectivePrice
          ? `$${Number(face.effectivePrice.priceDaily).toFixed(2)}`
          : null,
        priceDaily: face.effectivePrice ? Number(face.effectivePrice.priceDaily) : null,
        currency: face.effectivePrice?.currency ?? "USD",
        structureType: face.asset.structureType.name,
      }));
  }

  const returnToParam = getParam(params.returnTo);
  const returnTo = returnToParam?.startsWith("/") ? returnToParam : "/s/all";
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
        defaultFromDate={getParam(params.from) || undefined}
        defaultToDate={getParam(params.to) || undefined}
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
