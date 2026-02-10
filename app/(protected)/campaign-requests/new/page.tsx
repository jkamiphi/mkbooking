import Link from "next/link";
import { headers } from "next/headers";
import { ArrowLeft, ClipboardPlus } from "lucide-react";
import { auth } from "@/lib/auth";
import { listStructureTypes, listZones } from "@/lib/services/inventory";
import { getUserProfileByUserId } from "@/lib/services/user-profile";
import { NewCampaignRequestForm } from "./new-campaign-request-form";

type PageProps = {
  searchParams: Promise<{
    q?: string | string[];
    type?: string | string[];
    zone?: string | string[];
    qty?: string | string[];
    from?: string | string[];
    to?: string | string[];
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

  const session = await auth.api.getSession({
    headers: await headers(),
  });

  const profile = session?.user?.id
    ? await getUserProfileByUserId(session.user.id)
    : null;

  const [structureTypes, zones] = await Promise.all([
    listStructureTypes(),
    listZones(),
  ]);

  const returnToParam = getParam(params.returnTo);
  const returnTo = returnToParam?.startsWith("/") ? returnToParam : "/s/all";

  return (
    <div className="relative mx-auto max-w-5xl px-6 pb-12">
      <div className="mb-6 flex items-center justify-between gap-3">
        <Link
          href={returnTo}
          className="inline-flex items-center gap-2 rounded-full border border-neutral-200 bg-white px-4 py-2 text-sm font-medium text-neutral-700 transition hover:bg-neutral-50"
        >
          <ArrowLeft className="h-4 w-4" />
          Volver a resultados
        </Link>
      </div>

      <div className="mb-8 flex items-center gap-3">
        <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#0359A8] text-white shadow-lg shadow-[#0359A8]/30">
          <ClipboardPlus className="h-6 w-6" />
        </span>
        <div>
          <h1 className="text-3xl font-bold text-neutral-900">Nueva solicitud de campaña</h1>
          <p className="text-sm text-neutral-500">
            Solicita múltiples caras por criterio y deja la asignación para el equipo admin.
          </p>
        </div>
      </div>

      <NewCampaignRequestForm
        query={getParam(params.q) || undefined}
        defaultStructureTypeId={getParam(params.type) || undefined}
        defaultZoneId={getParam(params.zone) || undefined}
        defaultQuantity={quantityFromPreset(getParam(params.qty) || undefined)}
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
      />
    </div>
  );
}
