import Image from "next/image";
import Link from "next/link";
import { MapPin } from "lucide-react";
import { isExpectedS3PublicUrl } from "@/lib/storage/s3";
import { ScrollNavigation } from "@/components/home/scroll-navigation";
import type { HomeZone } from "@/components/home/home-page-types";

interface ZonesCarouselProps {
  zones: HomeZone[];
}

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

export function ZonesCarousel({ zones }: ZonesCarouselProps) {
  return (
    <div className="mt-10">
      <ScrollNavigation targetId="zones-scroll" title="Explorar zonas" />
      <div
        id="zones-scroll"
        className="mt-4 flex gap-4 overflow-x-auto pb-2 scrollbar-hide"
      >
        {zones.slice(0, 12).map((zone) => {
          const zoneImageUrl =
            zone.imageUrl && isExpectedS3PublicUrl(zone.imageUrl)
              ? zone.imageUrl
              : null;
          const url = buildSearchUrl({
            searchTerm: "all",
            zone: zone.id,
          });
          return (
            <Link
              key={zone.id}
              href={url}
              className="group relative flex-shrink-0 overflow-hidden rounded-md border border-neutral-200/70 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg"
              style={{ width: 160 }}
            >
              <div className="relative aspect-[4/3] w-full overflow-hidden bg-neutral-100">
                {zoneImageUrl ? (
                  <Image
                    src={zoneImageUrl}
                    alt={zone.name}
                    fill
                    sizes="160px"
                    className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                    loading="lazy"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-[#0359A8]/30 to-[#fcb814]/30 p-4">
                    <div className="rounded-md bg-white/70 p-2">
                      <MapPin className="h-5 w-5 text-[#0359A8]" />
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-1 px-3 py-2">
                <span className="block text-sm font-semibold leading-tight text-neutral-900">
                  {zone.name}
                </span>
                <span className="block text-xs text-neutral-500">
                  {zone.province.name}
                </span>
                {zoneBadges[zone.name] ? (
                  <span className="inline-flex rounded-md bg-neutral-100 px-2 py-0.5 text-[10px] font-semibold text-neutral-600">
                    {zoneBadges[zone.name]}
                  </span>
                ) : null}
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
