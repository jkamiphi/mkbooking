"use client";

import { useRouter } from "next/navigation";
import { MapPin, SlidersHorizontal, X } from "lucide-react";

type StructureType = {
  id: string;
  name: string;
  imageUrl?: string | null;
};

type Zone = {
  id: string;
  name: string;
  province: { name: string };
};

type SearchFiltersProps = {
  structureTypes: StructureType[];
  zones: Zone[];
  selectedTypeId?: string;
  selectedZoneId?: string;
  query: string;
};

export function SearchFilters({
  structureTypes,
  zones,
  selectedTypeId,
  selectedZoneId,
  query,
}: SearchFiltersProps) {
  const router = useRouter();

  function handleFilter(options: { typeId?: string | null; zoneId?: string | null }) {
    const params = new URLSearchParams();

    // Handle type filter
    const newTypeId = options.typeId !== undefined ? options.typeId : selectedTypeId;
    if (newTypeId) params.set("type", newTypeId);

    // Handle zone filter
    const newZoneId = options.zoneId !== undefined ? options.zoneId : selectedZoneId;
    if (newZoneId) params.set("zone", newZoneId);

    const searchTerm = query || "all";
    const queryString = params.toString();
    const url = `/s/${encodeURIComponent(searchTerm)}${queryString ? `?${queryString}` : ""}`;
    router.push(url);
  }

  const selectedZone = zones.find((z) => z.id === selectedZoneId);

  return (
    <div className="flex items-center gap-3 border-b border-neutral-200 bg-white px-6 py-3">
      <button
        type="button"
        className="flex items-center gap-2 rounded-full border border-neutral-200 px-4 py-2 text-sm font-medium text-neutral-700 transition hover:border-neutral-300 hover:bg-neutral-50"
      >
        <SlidersHorizontal className="h-4 w-4" />
        Filtros
      </button>

      <div className="h-6 w-px bg-neutral-200" />

      {/* Active Zone Filter Badge */}
      {selectedZone && (
        <button
          type="button"
          onClick={() => handleFilter({ zoneId: null })}
          className="flex flex-shrink-0 items-center gap-1.5 rounded-full border border-[#0359A8] bg-[#0359A8]/10 px-3 py-1.5 text-xs font-semibold text-[#0359A8] transition hover:bg-[#0359A8]/20"
        >
          <MapPin className="h-3 w-3" />
          {selectedZone.name}
          <X className="h-3 w-3" />
        </button>
      )}

      <div className="flex flex-1 items-center gap-2 overflow-x-auto pb-0.5 scrollbar-hide">
        {structureTypes.map((type) => {
          const isSelected = type.id === selectedTypeId;
          return (
            <button
              key={type.id}
              type="button"
              onClick={() => handleFilter({ typeId: isSelected ? null : type.id })}
              className={`
                flex flex-shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition
                ${
                  isSelected
                    ? "border-neutral-900 bg-neutral-900 text-white"
                    : "border-neutral-200 text-neutral-700 hover:border-neutral-300 hover:bg-neutral-50"
                }
              `}
            >
              {type.name}
              {isSelected && <X className="h-3 w-3" />}
            </button>
          );
        })}
      </div>
    </div>
  );
}
