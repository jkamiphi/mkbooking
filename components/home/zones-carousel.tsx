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

function buildSearchUrl(options: { searchTerm?: string; type?: string; zone?: string }) {
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
              className="group relative flex-shrink-0 overflow-hidden rounded-2xl transition hover:shadow-lg"
              style={{ width: 160 }}
            >
              {zoneImageUrl ? (
                <div className="relative aspect-[4/3] w-full overflow-hidden">
                  <Image
                    src={zoneImageUrl}
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
  );
}
