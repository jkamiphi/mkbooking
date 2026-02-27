"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Calendar, ChevronRight, MapPin, Search, X } from "lucide-react";
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
import {
  clampDate,
  parseDateInputValue,
  sanitizeDateRangeStrings,
} from "@/lib/date/campaign-date-range";

type StructureTypeOption = {
  id: string;
  name: string;
};

type ZoneOption = {
  id: string;
  name: string;
  province: { name: string };
};

type HomeSearchBarProps = {
  query?: string;
  typeId?: string;
  minimumStartDate: string;
  zones: ZoneOption[];
  structureTypes: StructureTypeOption[];
  showPromo: boolean;
  promoValueLabel: string | null;
};

type PanelKey = "destination" | "dates" | "type" | null;
type MobilePanelKey = Exclude<PanelKey, null>;

export function HomeSearchBar({
  query,
  typeId,
  minimumStartDate,
  zones,
  structureTypes,
  showPromo,
  promoValueLabel,
}: HomeSearchBarProps) {
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);
  const [activePanel, setActivePanel] = useState<PanelKey>(null);
  const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false);
  const [mobileActiveSection, setMobileActiveSection] =
    useState<PanelKey>("destination");
  const [queryValue, setQueryValue] = useState(query ?? "");
  const [selectedTypeId, setSelectedTypeId] = useState(typeId ?? "");
  const [fromDate, setFromDate] = useState<string | undefined>();
  const [toDate, setToDate] = useState<string | undefined>();
  const minimumStartDateValue =
    parseDateInputValue(minimumStartDate) ?? clampDate(new Date());

  function executeSearch() {
    const params = new URLSearchParams();
    if (selectedTypeId) params.set("type", selectedTypeId);
    const sanitizedDateRange = sanitizeDateRangeStrings({
      fromDate,
      toDate,
      minimumStartDate: minimumStartDateValue,
      minimumDurationDays: 1,
      mode: "drop-invalid",
    });
    if (sanitizedDateRange.fromDate && sanitizedDateRange.toDate) {
      params.set("from", sanitizedDateRange.fromDate);
      params.set("to", sanitizedDateRange.toDate);
    }

    const searchTerm = queryValue.trim() || "all";
    const queryString = params.toString();
    const url = `/s/${encodeURIComponent(searchTerm)}${queryString ? `?${queryString}` : ""}`;
    router.push(url);
    setActivePanel(null);
    setIsMobileSearchOpen(false);
  }

  function handleSearch(event: React.FormEvent) {
    event.preventDefault();
    executeSearch();
  }

  useEffect(() => {
    function handleClick(event: MouseEvent) {
      if (!containerRef.current) return;
      if (containerRef.current.contains(event.target as Node)) return;
      setActivePanel(null);
    }

    window.addEventListener("click", handleClick);
    return () => window.removeEventListener("click", handleClick);
  }, []);

  const selectedType = useMemo(
    () => structureTypes.find((type) => type.id === selectedTypeId),
    [structureTypes, selectedTypeId],
  );

  const filteredZones = useMemo(() => {
    const normalized = queryValue.trim().toLowerCase();
    const data = normalized
      ? zones.filter((zone) =>
          `${zone.name} ${zone.province.name}`
            .toLowerCase()
            .includes(normalized),
        )
      : zones;
    return data.slice(0, 6);
  }, [zones, queryValue]);

  function rangeLabel() {
    if (fromDate && toDate) {
      return `${formatShortDateLabel(fromDate)} - ${formatShortDateLabel(toDate)}`;
    }
    if (fromDate) {
      return formatShortDateLabel(fromDate);
    }
    return "Agregar fechas";
  }

  function getInitialMobileSection(): MobilePanelKey {
    if (!queryValue.trim()) {
      return "destination";
    }
    if (!fromDate || !toDate) {
      return "dates";
    }
    if (!selectedTypeId) {
      return "type";
    }
    return "destination";
  }

  function openMobileSearch() {
    setMobileActiveSection(getInitialMobileSection());
    setIsMobileSearchOpen(true);
  }

  function clearMobileFilters() {
    setQueryValue("");
    setFromDate(undefined);
    setToDate(undefined);
    setSelectedTypeId("");
    setMobileActiveSection("destination");
  }

  const mobileSummary = `${queryValue.trim() || "Zona"} · ${
    fromDate || toDate ? rangeLabel() : "Fechas"
  } · ${selectedType?.name ?? "Formato"}`;

  const segmentBase =
    "flex cursor-pointer flex-col rounded-3xl px-6 py-3 text-[11px] font-semibold text-neutral-500 transition";
  const segmentActive = "bg-white shadow-lg shadow-neutral-200/60";

  return (
    <section className="relative mx-auto w-full max-w-min px-6 pb-12 pt-4">
      <div className="mt-4 md:hidden">
        <button
          type="button"
          onClick={openMobileSearch}
          className="w-[min(100vw-3rem,30rem)] rounded-full border border-white/80 bg-white/95 px-5 py-3 text-left shadow-xl shadow-[#fcb814]/20 backdrop-blur-xl"
        >
          <span className="flex items-center gap-2 text-base font-semibold text-neutral-900">
            <Search className="h-4 w-4 text-neutral-500" />
            Empieza tu búsqueda
          </span>
          <span className="mt-1 block truncate text-xs font-medium text-neutral-500">
            {mobileSummary}
          </span>
        </button>
      </div>

      <Dialog open={isMobileSearchOpen} onOpenChange={setIsMobileSearchOpen}>
        <DialogContent
          showCloseButton={false}
          className="!top-0 !left-0 !h-dvh !w-full !max-w-none !translate-x-0 !translate-y-0 !gap-0 !rounded-none !border-0 !p-0 data-[state=open]:slide-in-from-right data-[state=closed]:slide-out-to-right"
        >
          <div className="flex h-full flex-col bg-neutral-100">
            <div className="flex items-center justify-between border-b border-neutral-200 bg-white px-5 py-4">
              <div>
                <DialogTitle className="text-base font-semibold text-neutral-900">
                  Busca tu espacio
                </DialogTitle>
                <DialogDescription className="mt-1 text-xs text-neutral-500">
                  Define destino, fechas y formato para continuar.
                </DialogDescription>
              </div>
              <button
                type="button"
                onClick={() => setIsMobileSearchOpen(false)}
                className="rounded-full border border-neutral-200 bg-white p-2 text-neutral-500 transition hover:bg-neutral-100 hover:text-neutral-700"
                aria-label="Cerrar buscador"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="flex-1 space-y-3 overflow-y-auto px-4 py-4 pb-6">
              <section className="overflow-hidden rounded-3xl border border-neutral-200 bg-white shadow-sm">
                <button
                  type="button"
                  onClick={() =>
                    setMobileActiveSection((current) =>
                      current === "destination" ? null : "destination",
                    )
                  }
                  className="flex w-full items-center justify-between px-4 py-4 text-left"
                >
                  <span>
                    <span className="block text-sm font-semibold text-neutral-900">
                      ¿Dónde?
                    </span>
                    <span className="mt-1 block text-sm text-neutral-500">
                      {queryValue.trim() || "Buscar por zona o provincia"}
                    </span>
                  </span>
                  {mobileActiveSection !== "destination" ? (
                    <ChevronRight className="h-4 w-4 text-neutral-400" />
                  ) : null}
                </button>

                {mobileActiveSection === "destination" ? (
                  <div className="space-y-3 border-t border-neutral-200 px-4 pb-4 pt-3">
                    <label className="flex items-center gap-2 rounded-2xl border border-neutral-200 px-3 py-3">
                      <Search className="h-4 w-4 text-neutral-500" />
                      <input
                        value={queryValue}
                        onChange={(event) => setQueryValue(event.target.value)}
                        placeholder="Ciudad de Panamá, Vía España, Albrook..."
                        className="w-full bg-transparent text-sm text-neutral-800 placeholder:text-neutral-400 focus:outline-none"
                      />
                    </label>

                    <div className="space-y-2">
                      {filteredZones.length > 0 ? (
                        filteredZones.map((zone) => (
                          <button
                            key={zone.id}
                            type="button"
                            onClick={() => {
                              setQueryValue(`${zone.name}, ${zone.province.name}`);
                              setMobileActiveSection("dates");
                            }}
                            className="flex w-full items-center gap-3 rounded-2xl border border-neutral-200 px-3 py-2.5 text-left transition hover:border-neutral-300"
                          >
                            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-neutral-100 text-neutral-600">
                              <MapPin className="h-4 w-4" />
                            </span>
                            <span className="min-w-0">
                              <span className="block truncate text-sm font-semibold text-neutral-900">
                                {zone.name}
                              </span>
                              <span className="block truncate text-xs text-neutral-500">
                                {zone.province.name}
                              </span>
                            </span>
                          </button>
                        ))
                      ) : (
                        <p className="rounded-2xl border border-dashed border-neutral-200 px-3 py-3 text-xs text-neutral-500">
                          No encontramos coincidencias para tu búsqueda.
                        </p>
                      )}
                    </div>
                  </div>
                ) : null}
              </section>

              <section className="overflow-hidden rounded-3xl border border-neutral-200 bg-white shadow-sm">
                <button
                  type="button"
                  onClick={() =>
                    setMobileActiveSection((current) =>
                      current === "dates" ? null : "dates",
                    )
                  }
                  className="flex w-full items-center justify-between px-4 py-4 text-left"
                >
                  <span>
                    <span className="block text-sm font-semibold text-neutral-900">
                      ¿Cuándo?
                    </span>
                    <span className="mt-1 block text-sm text-neutral-500">
                      {fromDate || toDate ? rangeLabel() : "Agregar fechas"}
                    </span>
                  </span>
                  {mobileActiveSection !== "dates" ? (
                    <ChevronRight className="h-4 w-4 text-neutral-400" />
                  ) : null}
                </button>

                {mobileActiveSection === "dates" ? (
                  <div className="max-h-[52dvh] overflow-auto border-t border-neutral-200 p-3">
                    <CampaignDateRangePicker
                      variant="calendar"
                      fromDate={fromDate}
                      toDate={toDate}
                      minimumStartDate={minimumStartDate}
                      minimumDurationDays={1}
                      onChange={(nextFromDate, nextToDate) => {
                        setFromDate(nextFromDate);
                        setToDate(nextToDate);
                        if (nextFromDate && nextToDate) {
                          setMobileActiveSection("type");
                        }
                      }}
                    />
                  </div>
                ) : null}
              </section>

              <section className="overflow-hidden rounded-3xl border border-neutral-200 bg-white shadow-sm">
                <button
                  type="button"
                  onClick={() =>
                    setMobileActiveSection((current) =>
                      current === "type" ? null : "type",
                    )
                  }
                  className="flex w-full items-center justify-between px-4 py-4 text-left"
                >
                  <span>
                    <span className="block text-sm font-semibold text-neutral-900">
                      ¿Qué formato?
                    </span>
                    <span className="mt-1 block text-sm text-neutral-500">
                      {selectedType?.name ?? "Agregar tipo de estructura"}
                    </span>
                  </span>
                  {mobileActiveSection !== "type" ? (
                    <ChevronRight className="h-4 w-4 text-neutral-400" />
                  ) : null}
                </button>

                {mobileActiveSection === "type" ? (
                  <div className="flex flex-wrap gap-2 border-t border-neutral-200 px-4 pb-4 pt-3">
                    {structureTypes.map((type) => {
                      const selected = type.id === selectedTypeId;
                      return (
                        <button
                          key={type.id}
                          type="button"
                          onClick={() => setSelectedTypeId(selected ? "" : type.id)}
                          className={`rounded-full border px-3 py-2 text-xs font-semibold transition ${
                            selected
                              ? "border-neutral-900 bg-neutral-900 text-white"
                              : "border-neutral-200 text-neutral-700 hover:border-neutral-300"
                          }`}
                        >
                          {type.name}
                        </button>
                      );
                    })}
                  </div>
                ) : null}
              </section>
            </div>

            <div className="border-t border-neutral-200 bg-white px-4 pb-[calc(env(safe-area-inset-bottom)+1rem)] pt-3">
              <div className="flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={clearMobileFilters}
                  className="text-sm font-semibold text-neutral-700 underline underline-offset-2 transition hover:text-neutral-900"
                >
                  Limpiar todo
                </button>
                <button
                  type="button"
                  onClick={executeSearch}
                  className="inline-flex min-h-11 items-center gap-2 rounded-full bg-[#E91E63] px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-[#E91E63]/30 transition hover:bg-[#d91857]"
                >
                  <Search className="h-4 w-4" />
                  Buscar
                </button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <form onSubmit={handleSearch} className="mt-8 hidden md:block">
        <div ref={containerRef} className="relative">
          <div className="rounded-full border border-white/70 bg-white/90 shadow-xl shadow-[#fcb814]/20 backdrop-blur-xl">
            <div className="flex flex-nowrap items-center justify-center gap-2 overflow-x-auto p-2 md:gap-0 md:overflow-visible">
              <div
                className={`${segmentBase} min-w-[260px] md:rounded-none md:rounded-l-full ${
                  activePanel === "destination" ? segmentActive : ""
                }`}
                role="button"
                tabIndex={0}
                onClick={() => setActivePanel("destination")}
              >
                Destino
                <span className="mt-1 flex items-center gap-2 text-sm font-medium text-neutral-900">
                  <Search className="h-4 w-4 text-neutral-400" />
                  <input
                    value={queryValue}
                    onChange={(event) => setQueryValue(event.target.value)}
                    onFocus={() => setActivePanel("destination")}
                    placeholder="Ciudad de Panamá, Vía España, Albrook..."
                    className="w-full bg-transparent placeholder:text-neutral-400 focus:outline-none"
                  />
                </span>
              </div>

              <div className="hidden h-8 w-px bg-neutral-200 md:block" />

              <div
                className={`${segmentBase} min-w-[180px] md:rounded-none ${
                  activePanel === "dates" ? segmentActive : ""
                }`}
                role="button"
                tabIndex={0}
                onClick={() => setActivePanel("dates")}
              >
                Fechas
                <span className="mt-1 inline-flex items-center gap-2 text-sm font-medium text-neutral-900">
                  <Calendar className="h-4 w-4 text-neutral-400" />
                  {rangeLabel()}
                </span>
              </div>

              <div className="hidden h-8 w-px bg-neutral-200 md:block" />

              <div
                className={`${segmentBase} min-w-[220px] md:rounded-r-full ${
                  activePanel === "type" ? segmentActive : ""
                }`}
                role="button"
                tabIndex={0}
                onClick={() => setActivePanel("type")}
              >
                Tipo de estructura
                <span className="mt-1 text-sm font-medium text-neutral-900">
                  {selectedType?.name ?? "Agregar una estructura"}
                </span>
              </div>

              <div className="flex items-center px-2">
                <button
                  type="submit"
                  className="flex items-center gap-2 rounded-full bg-[#E91E63] px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-[#E91E63]/30 hover:bg-[#d91857]"
                >
                  <span className="hidden md:inline">Buscar</span>
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>

          {activePanel ? (
            <div className="absolute left-1/2 top-full z-30 mt-4 w-full max-w-lg -translate-x-1/2 rounded-3xl border border-neutral-200 bg-white p-6 shadow-2xl md:max-w-2xl">
              {activePanel === "destination" ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold text-neutral-900">
                        Por la zona
                      </p>
                      <p className="text-xs text-neutral-500">
                        Descubre qué hay a tu alrededor
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setActivePanel(null)}
                      className="rounded-full border border-neutral-200 p-2 text-neutral-500 hover:text-neutral-700"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {filteredZones.map((zone) => (
                      <button
                        key={zone.id}
                        type="button"
                        onClick={() => {
                          setQueryValue(`${zone.name}, ${zone.province.name}`);
                          setActivePanel(null);
                        }}
                        className="flex items-center gap-3 rounded-2xl border border-neutral-200 px-4 py-3 text-left text-sm hover:border-neutral-300"
                      >
                        <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-neutral-100 text-neutral-600">
                          <MapPin className="h-4 w-4" />
                        </span>
                        <span>
                          <span className="block font-semibold text-neutral-900">
                            {zone.name}
                          </span>
                          <span className="text-xs text-neutral-500">
                            {zone.province.name}
                          </span>
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}

              {activePanel === "dates" ? (
                <CampaignDateRangePicker
                  variant="calendar"
                  fromDate={fromDate}
                  toDate={toDate}
                  minimumStartDate={minimumStartDate}
                  minimumDurationDays={1}
                  onChange={(nextFromDate, nextToDate) => {
                    setFromDate(nextFromDate);
                    setToDate(nextToDate);
                  }}
                />
              ) : null}

              {activePanel === "type" ? (
                <div className="space-y-4">
                  <p className="text-sm font-semibold text-neutral-900">
                    Selecciona un tipo de estructura
                  </p>
                  <div className="flex flex-wrap gap-3">
                    {structureTypes.map((type) => {
                      const selected = type.id === selectedTypeId;
                      return (
                        <button
                          key={type.id}
                          type="button"
                          onClick={() => {
                            setSelectedTypeId(selected ? "" : type.id);
                            setActivePanel(null);
                          }}
                          className={`rounded-full border px-4 py-2 text-xs font-semibold transition ${
                            selected
                              ? "border-neutral-900 bg-neutral-900 text-white"
                              : "border-neutral-200 text-neutral-700 hover:border-neutral-300"
                          }`}
                        >
                          {type.name}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
      </form>

      {showPromo ? (
        <div
          className="mt-6 flex items-center gap-3 rounded-2xl border border-[#fcb814]/60 bg-[#fff6dd] px-4 py-3 text-sm text-[#0359A8]"
          style={{ animation: "rise 0.7s ease 0.1s forwards" }}
        >
          <span className="font-semibold">
            {promoValueLabel
              ? `${promoValueLabel} de descuento en campañas por zona en Panamá`
              : "Descuento activo en campañas por zona en Panamá"}
          </span>
        </div>
      ) : null}
    </section>
  );
}
