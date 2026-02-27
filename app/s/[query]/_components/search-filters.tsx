"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarDays, MapPin, SlidersHorizontal, X } from "lucide-react";
import {
  CampaignDateRangePicker,
  formatShortDateLabel,
} from "@/components/campaign/campaign-date-range-picker";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";

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
  selectedFromDate?: string;
  selectedToDate?: string;
  minimumStartDate: string;
  query: string;
};

export function SearchFilters({
  structureTypes,
  zones,
  selectedTypeId,
  selectedZoneId,
  selectedFromDate,
  selectedToDate,
  minimumStartDate,
  query,
}: SearchFiltersProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [draftZoneId, setDraftZoneId] = useState(selectedZoneId ?? "");
  const [draftFromDate, setDraftFromDate] = useState(selectedFromDate ?? "");
  const [draftToDate, setDraftToDate] = useState(selectedToDate ?? "");

  function navigateWithFilters(next: {
    typeId?: string | null;
    zoneId?: string | null;
    fromDate?: string | null;
    toDate?: string | null;
  }) {
    const params = new URLSearchParams();
    const newTypeId = next.typeId !== undefined ? next.typeId : selectedTypeId;
    const newZoneId = next.zoneId !== undefined ? next.zoneId : selectedZoneId;
    const newFromDate =
      next.fromDate !== undefined ? next.fromDate : selectedFromDate;
    const newToDate = next.toDate !== undefined ? next.toDate : selectedToDate;

    if (newTypeId) params.set("type", newTypeId);
    if (newZoneId) params.set("zone", newZoneId);
    if (newFromDate) params.set("from", newFromDate);
    if (newToDate) params.set("to", newToDate);

    const searchTerm = query || "all";
    const queryString = params.toString();
    const url = `/s/${encodeURIComponent(searchTerm)}${
      queryString ? `?${queryString}` : ""
    }`;

    router.push(url);
  }

  function applyAdvancedFilters() {
    let normalizedFrom = draftFromDate || null;
    let normalizedTo = draftToDate || null;

    if (normalizedFrom && normalizedTo && normalizedFrom > normalizedTo) {
      const temp = normalizedFrom;
      normalizedFrom = normalizedTo;
      normalizedTo = temp;
    }

    navigateWithFilters({
      zoneId: draftZoneId || null,
      fromDate: normalizedFrom,
      toDate: normalizedTo,
    });
    setIsOpen(false);
  }

  function clearAllFilters() {
    setDraftZoneId("");
    setDraftFromDate("");
    setDraftToDate("");
    navigateWithFilters({
      typeId: null,
      zoneId: null,
      fromDate: null,
      toDate: null,
    });
    setIsOpen(false);
  }

  const selectedZone = zones.find((zone) => zone.id === selectedZoneId);
  const dateBadgeLabel = useMemo(() => {
    if (!selectedFromDate && !selectedToDate) return null;
    if (selectedFromDate && selectedToDate) {
      return `${formatShortDateLabel(selectedFromDate)} - ${formatShortDateLabel(selectedToDate)}`;
    }
    if (selectedFromDate) return formatShortDateLabel(selectedFromDate);
    return selectedToDate ? formatShortDateLabel(selectedToDate) : null;
  }, [selectedFromDate, selectedToDate]);

  return (
    <div className="border-b border-neutral-200 bg-white px-6 py-3">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="flex items-center gap-2 rounded-full border border-neutral-200 px-4 py-2 text-sm font-medium text-neutral-700 transition hover:border-neutral-300 hover:bg-neutral-50"
        >
          <SlidersHorizontal className="h-4 w-4" />
          Filtros
        </button>

        <div className="h-6 w-px bg-neutral-200" />

        <div className="flex flex-1 items-center gap-2 overflow-x-auto pb-0.5 scrollbar-hide">
          {selectedZone ? (
            <button
              type="button"
              onClick={() => navigateWithFilters({ zoneId: null })}
              className="flex flex-shrink-0 items-center gap-1.5 rounded-full border border-[#0359A8] bg-[#0359A8]/10 px-3 py-1.5 text-xs font-semibold text-[#0359A8] transition hover:bg-[#0359A8]/20"
            >
              <MapPin className="h-3 w-3" />
              {selectedZone.name}
              <X className="h-3 w-3" />
            </button>
          ) : null}

          {dateBadgeLabel ? (
            <button
              type="button"
              onClick={() => navigateWithFilters({ fromDate: null, toDate: null })}
              className="flex flex-shrink-0 items-center gap-1.5 rounded-full border border-[#0359A8] bg-[#0359A8]/10 px-3 py-1.5 text-xs font-semibold text-[#0359A8] transition hover:bg-[#0359A8]/20"
            >
              <CalendarDays className="h-3 w-3" />
              {dateBadgeLabel}
              <X className="h-3 w-3" />
            </button>
          ) : null}

          {structureTypes.map((type) => {
            const isSelected = type.id === selectedTypeId;

            return (
              <button
                key={type.id}
                type="button"
                onClick={() =>
                  navigateWithFilters({ typeId: isSelected ? null : type.id })
                }
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
                {isSelected ? <X className="h-3 w-3" /> : null}
              </button>
            );
          })}
        </div>
      </div>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent
          showCloseButton={false}
          className="!top-0 !left-auto !right-0 !h-dvh !w-full !max-w-md !translate-x-0 !translate-y-0 !gap-0 !rounded-none !border-y-0 !border-r-0 !p-0 data-[state=open]:slide-in-from-right data-[state=closed]:slide-out-to-right"
        >
          <div className="flex h-full flex-col bg-white">
            <div className="flex items-center justify-between border-b border-neutral-200 px-5 py-4">
              <div>
                <DialogTitle className="text-base font-semibold text-neutral-900">
                  Filtros de búsqueda
                </DialogTitle>
                <DialogDescription className="mt-1 text-xs text-neutral-500">
                  Ajusta zona y rango de fechas.
                </DialogDescription>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="rounded-full border border-neutral-200 p-2 text-neutral-500 transition hover:bg-neutral-100 hover:text-neutral-700"
                aria-label="Cerrar filtros"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4">
              <label className="flex flex-col gap-1.5">
                <span className="text-xs font-semibold text-neutral-600">Zona</span>
                <select
                  value={draftZoneId}
                  onChange={(event) => setDraftZoneId(event.target.value)}
                  className="rounded-xl border border-neutral-200 bg-white px-3 py-2.5 text-sm text-neutral-800 focus:border-neutral-400 focus:outline-none"
                >
                  <option value="">Todas las zonas</option>
                  {zones.map((zone) => (
                    <option key={zone.id} value={zone.id}>
                      {zone.name} - {zone.province.name}
                    </option>
                  ))}
                </select>
              </label>

              <div className="space-y-1.5">
                <div className="grid grid-cols-2 gap-3">
                  <span className="text-xs font-semibold text-neutral-600">Desde</span>
                  <span className="text-xs font-semibold text-neutral-600">Hasta</span>
                </div>
                <CampaignDateRangePicker
                  variant="inputs"
                  fromDate={draftFromDate || undefined}
                  toDate={draftToDate || undefined}
                  minimumStartDate={minimumStartDate}
                  minimumDurationDays={1}
                  onChange={(from, to) => {
                    setDraftFromDate(from ?? "");
                    setDraftToDate(to ?? "");
                  }}
                />
                <p className="text-xs text-neutral-500">
                  Inicio disponible desde {formatShortDateLabel(minimumStartDate)}.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 border-t border-neutral-200 px-5 py-4">
              <button
                type="button"
                onClick={clearAllFilters}
                className="rounded-full border border-neutral-200 bg-white px-4 py-2 text-xs font-semibold text-neutral-700 transition hover:bg-neutral-100"
              >
                Limpiar
              </button>
              <button
                type="button"
                onClick={applyAdvancedFilters}
                className="rounded-full bg-[#0359A8] px-4 py-2 text-xs font-semibold text-white transition hover:bg-[#024a8c]"
              >
                Aplicar filtros
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
