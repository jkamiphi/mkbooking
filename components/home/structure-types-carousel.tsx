import Image from "next/image";
import Link from "next/link";
import { isExpectedS3PublicUrl } from "@/lib/storage/s3";
import { ScrollNavigation } from "@/components/home/scroll-navigation";
import type { HomeStructureType } from "@/components/home/home-page-types";

interface StructureTypesCarouselProps {
  structureTypes: HomeStructureType[];
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

function buildSearchUrl(options: { searchTerm?: string; type?: string; zone?: string }) {
  const params = new URLSearchParams();
  if (options.type) params.set("type", options.type);
  if (options.zone) params.set("zone", options.zone);
  const searchTerm = options.searchTerm || "all";
  const queryString = params.toString();
  return `/s/${encodeURIComponent(searchTerm)}${queryString ? `?${queryString}` : ""}`;
}

export function StructureTypesCarousel({
  structureTypes,
}: StructureTypesCarouselProps) {
  return (
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
          const typeImageUrl =
            type.imageUrl && isExpectedS3PublicUrl(type.imageUrl)
              ? type.imageUrl
              : null;
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
              {typeImageUrl ? (
                <div className="bg-white">
                  <div className="relative aspect-[4/3] w-full overflow-hidden">
                    <Image
                      src={typeImageUrl}
                      alt={type.name}
                      fill
                      sizes="160px"
                      className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                      loading="lazy"
                    />
                  </div>
                  <div className="px-3 py-2.5">
                    <span className="block text-sm font-semibold text-neutral-900">
                      {type.name}
                    </span>
                    {structureTypeHints[type.name] ? (
                      <span className="block text-[11px] text-neutral-600">
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
  );
}
