"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarDays } from "lucide-react";
import {
  CampaignDateRangePicker,
  formatShortDateLabel,
} from "@/components/campaign/campaign-date-range-picker";
import { countActiveFilters } from "@/lib/navigation/filter-state";
import {
  FilterSheetPanel,
  FilterSheetSection,
  FilterSheetTriggerButton,
} from "@/components/ui/filter-sheet";
import { SelectNative } from "@/components/ui/select-native";
import { Sheet, SheetTrigger } from "@/components/ui/sheet";

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
  const [draftTypeId, setDraftTypeId] = useState(selectedTypeId ?? "");
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
      typeId: draftTypeId || null,
      zoneId: draftZoneId || null,
      fromDate: normalizedFrom,
      toDate: normalizedTo,
    });
    setIsOpen(false);
  }

  function clearAllFilters() {
    setDraftTypeId("");
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

  const activeCount = countActiveFilters({
    typeId: selectedTypeId || undefined,
    zoneId: selectedZoneId || undefined,
    dates: selectedFromDate || selectedToDate ? "selected" : undefined,
  });

  return (
    <Sheet
      open={isOpen}
      onOpenChange={(open) => {
        if (open) {
          setDraftTypeId(selectedTypeId ?? "");
          setDraftZoneId(selectedZoneId ?? "");
          setDraftFromDate(selectedFromDate ?? "");
          setDraftToDate(selectedToDate ?? "");
          setIsOpen(true);
          return;
        }
        setIsOpen(false);
      }}
    >
      <SheetTrigger asChild>
        <FilterSheetTriggerButton activeCount={activeCount} />
      </SheetTrigger>

      <FilterSheetPanel
        title="Filtros de búsqueda"
        description="Ajusta tipo de estructura, zona y rango de fechas."
        onApply={applyAdvancedFilters}
        onClear={clearAllFilters}
      >
        <FilterSheetSection title="Tipo de estructura">
          <SelectNative
            value={draftTypeId}
            onChange={(event) => setDraftTypeId(event.target.value)}
          >
            <option value="">Todos los tipos</option>
            {structureTypes.map((type) => (
              <option key={type.id} value={type.id}>
                {type.name}
              </option>
            ))}
          </SelectNative>
        </FilterSheetSection>

        <FilterSheetSection title="Zona">
          <SelectNative
            value={draftZoneId}
            onChange={(event) => setDraftZoneId(event.target.value)}
          >
            <option value="">Todas las zonas</option>
            {zones.map((zone) => (
              <option key={zone.id} value={zone.id}>
                {zone.name} - {zone.province.name}
              </option>
            ))}
          </SelectNative>
        </FilterSheetSection>

        <FilterSheetSection title="Disponibilidad">
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3 text-xs font-semibold text-neutral-600">
              <span className="inline-flex items-center gap-1">
                <CalendarDays className="h-3.5 w-3.5" />
                Desde
              </span>
              <span>Hasta</span>
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
        </FilterSheetSection>
      </FilterSheetPanel>
    </Sheet>
  );
}
