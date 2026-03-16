"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  BadgePercent,
  Calendar,
  ChevronDown,
  ChevronRight,
  MapPin,
  MapPinned,
  Megaphone,
  Search,
  X,
} from "lucide-react";
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
import { cn } from "@/lib/utils";

type StructureTypeOption = {
  id: string;
  name: string;
};

type ZoneOption = {
  id: string;
  name: string;
  province: { name: string };
};

type HomePromo = {
  name: string;
  valueLabel: string;
  startDateLabel?: string;
  endDateLabel?: string;
};

type HomeSearchBarProps = {
  query?: string;
  typeId?: string;
  minimumStartDate: string;
  zones: ZoneOption[];
  structureTypes: StructureTypeOption[];
  promo?: HomePromo;
};

type PanelKey = "destination" | "dates" | "type" | null;
type MobilePanelKey = Exclude<PanelKey, null>;

const desktopDockMediaQuery = "(min-width: 768px)";
const dockTriggerTop = 16;

export function HomeSearchBar({
  query,
  typeId,
  minimumStartDate,
  zones,
  structureTypes,
  promo,
}: HomeSearchBarProps) {
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);
  const desktopAnchorRef = useRef<HTMLDivElement>(null);
  const desktopFormRef = useRef<HTMLFormElement>(null);
  const [activePanel, setActivePanel] = useState<PanelKey>(null);
  const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false);
  const [isPromoDialogOpen, setIsPromoDialogOpen] = useState(false);
  const [mobileActiveSection, setMobileActiveSection] =
    useState<PanelKey>("destination");
  const [queryValue, setQueryValue] = useState(query ?? "");
  const [selectedTypeId, setSelectedTypeId] = useState(typeId ?? "");
  const [fromDate, setFromDate] = useState<string | undefined>();
  const [toDate, setToDate] = useState<string | undefined>();
  const [isDesktopDocked, setIsDesktopDocked] = useState(false);
  const [desktopSearchHeight, setDesktopSearchHeight] = useState(0);
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
    setIsPromoDialogOpen(false);
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

  useEffect(() => {
    const formNode = desktopFormRef.current;
    if (!formNode) return;

    setDesktopSearchHeight(formNode.getBoundingClientRect().height);

    if (typeof ResizeObserver === "undefined") return;

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      setDesktopSearchHeight(entry.contentRect.height);
    });

    observer.observe(formNode);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const mediaQuery = window.matchMedia(desktopDockMediaQuery);
    let frameId = 0;

    function updateDockedState() {
      if (!mediaQuery.matches) {
        setIsDesktopDocked(false);
        return;
      }

      if (!desktopAnchorRef.current) {
        setIsDesktopDocked(false);
        return;
      }

      const shouldDock =
        desktopAnchorRef.current.getBoundingClientRect().top <= dockTriggerTop;

      setIsDesktopDocked((current) => {
        if (current === shouldDock) {
          return current;
        }
        setActivePanel(null);
        return shouldDock;
      });
    }

    function handleScroll() {
      if (frameId) {
        window.cancelAnimationFrame(frameId);
      }
      frameId = window.requestAnimationFrame(updateDockedState);
    }

    function handleResize() {
      updateDockedState();
    }

    updateDockedState();
    window.addEventListener("scroll", handleScroll, { passive: true });
    window.addEventListener("resize", handleResize);
    mediaQuery.addEventListener("change", handleResize);

    return () => {
      if (frameId) {
        window.cancelAnimationFrame(frameId);
      }
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("resize", handleResize);
      mediaQuery.removeEventListener("change", handleResize);
    };
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

  const promoDateLabel = useMemo(() => {
    if (!promo) return null;
    if (promo.startDateLabel && promo.endDateLabel) {
      return `Vigencia: ${promo.startDateLabel} - ${promo.endDateLabel}`;
    }
    if (promo.endDateLabel) {
      return `Vigencia hasta ${promo.endDateLabel}`;
    }
    if (promo.startDateLabel) {
      return `Vigente desde ${promo.startDateLabel}`;
    }
    return null;
  }, [promo]);

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
    "flex cursor-pointer flex-col rounded-xs px-6 py-3 text-[11px] font-semibold text-neutral-500 transition";
  const segmentActive =
    "border border-mkmedia-blue/20 bg-mkmedia-blue/8 text-mkmedia-blue shadow-lg shadow-mkmedia-blue/10";

  return (
    <section className="relative mx-auto w-full max-w-7xl px-4 pb-12 pt-4 sm:px-6 lg:px-8 2xl:px-10">
      <div className="mt-4 flex items-center gap-2 md:hidden border border-mkmedia-blue/20 bg-white/95 px-5 py-3 text-left shadow-xl shadow-mkmedia-blue/10 backdrop-blur-xl">
        <button
          type="button"
          onClick={openMobileSearch}
          className="min-w-0 flex-1 rounded-md justify-start text-sm font-semibold text-neutral-900"
        >
          <span className="flex items-center gap-2 text-base font-semibold text-neutral-900">
            <Search className="h-4 w-4 text-neutral-500" />
            Empieza tu búsqueda
          </span>
          <span className="mt-1 block truncate text-xs font-medium text-neutral-500 text-left">
            {mobileSummary}
          </span>
        </button>

        {promo ? (
          <button
            type="button"
            onClick={() => setIsPromoDialogOpen(true)}
            className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xs border border-mkmedia-yellow/70 bg-mkmedia-yellow/20 text-mkmedia-blue shadow-sm transition hover:bg-mkmedia-yellow/30"
            aria-label="Ver promoción activa"
          >
            <BadgePercent className="h-4 w-4" />
          </button>
        ) : null}
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
                className="rounded-xs border border-neutral-200 bg-white p-2 text-neutral-500 transition hover:bg-neutral-100 hover:text-neutral-700"
                aria-label="Cerrar buscador"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="flex-1 space-y-3 overflow-y-auto px-4 py-4 pb-6">
              <section className="overflow-hidden rounded-xs border border-neutral-200 bg-white shadow-sm">
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
                  ) : (
                    <ChevronDown className="h-4 w-4 text-neutral-400" />
                  )}
                </button>

                {mobileActiveSection === "destination" ? (
                  <div className="space-y-3 border-t border-neutral-200 px-4 pb-4 pt-3">
                    <label className="flex items-center gap-2 rounded-xs border border-neutral-200 px-3 py-3">
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
                              setQueryValue(
                                `${zone.name}, ${zone.province.name}`,
                              );
                              setMobileActiveSection("dates");
                            }}
                            className="flex w-full items-center gap-3 rounded-xs border border-neutral-200 px-3 py-2.5 text-left transition hover:border-neutral-300"
                          >
                            <span className="flex h-9 w-9 items-center justify-center rounded-xs bg-neutral-100 text-neutral-600">
                              <MapPinned className="h-4 w-4" />
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

              <section className="overflow-hidden rounded-xs border border-neutral-200 bg-white shadow-sm">
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
                  ) : (
                    <ChevronDown className="h-4 w-4 text-neutral-400" />
                  )}
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

              <section className="overflow-hidden rounded-xs border border-neutral-200 bg-white shadow-sm">
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
                  ) : (
                    <ChevronDown className="h-4 w-4 text-neutral-400" />
                  )}
                </button>

                {mobileActiveSection === "type" ? (
                  <div className="flex flex-wrap gap-2 border-t border-neutral-200 px-4 pb-4 pt-3">
                    {structureTypes.map((type) => {
                      const selected = type.id === selectedTypeId;
                      return (
                        <button
                          key={type.id}
                          type="button"
                          onClick={() =>
                            setSelectedTypeId(selected ? "" : type.id)
                          }
                          className={cn(
                            "rounded-xs border px-3 py-2 text-xs font-semibold transition",
                            selected
                              ? "border-mkmedia-blue bg-mkmedia-blue text-white"
                              : "border-mkmedia-blue/20 text-neutral-700 hover:border-mkmedia-blue/35",
                          )}
                        >
                          {type.name}
                        </button>
                      );
                    })}
                  </div>
                ) : null}
              </section>
            </div>

            <div className="border-t border-mkmedia-blue/15 bg-white px-4 pb-[calc(env(safe-area-inset-bottom)+1rem)] pt-3">
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
                  className="inline-flex min-h-11 items-center gap-2 rounded-xs bg-mkmedia-blue px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-mkmedia-blue/25 transition hover:bg-mkmedia-blue/90"
                >
                  <Search className="h-4 w-4" />
                  Buscar
                </button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <div className="mt-8 hidden md:block">
        <div
          ref={desktopAnchorRef}
          className="relative mx-auto w-full max-w-232"
          style={
            isDesktopDocked && desktopSearchHeight > 0
              ? { height: desktopSearchHeight }
              : undefined
          }
        >
          <form
            ref={desktopFormRef}
            onSubmit={handleSearch}
            className={cn(
              "transition-all duration-300 ease-out",
              isDesktopDocked
                ? "fixed left-1/2 top-3 z-50 w-[min(100vw-8rem,58rem)] -translate-x-1/2 lg:w-[min(100vw-24rem,58rem)]"
                : "relative w-full",
            )}
          >
            <div ref={containerRef} className="relative">
              <div
                className={cn(
                  "rounded-md border border-mkmedia-blue/20 bg-white/90 backdrop-blur-xl transition-[transform,box-shadow] duration-300",
                  isDesktopDocked
                    ? "scale-[0.99] shadow-2xl shadow-mkmedia-blue/20"
                    : "shadow-xl shadow-mkmedia-blue/12",
                )}
              >
                <div className="flex flex-nowrap items-center justify-center gap-2 overflow-x-auto p-2 md:gap-0 md:overflow-visible">
                  <div
                    className={cn(
                      segmentBase,
                      "min-w-65 md:rounded-none",
                      activePanel === "destination" && segmentActive,
                    )}
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

                  <div className="hidden h-8 w-px bg-mkmedia-blue/15 md:block" />

                  <div
                    className={cn(
                      segmentBase,
                      "min-w-45 md:rounded-none",
                      activePanel === "dates" && segmentActive,
                    )}
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

                  <div className="hidden h-8 w-px bg-mkmedia-blue/15 md:block" />

                  <div
                    className={cn(
                      segmentBase,
                      "min-w-55",
                      activePanel === "type" && segmentActive,
                    )}
                    role="button"
                    tabIndex={0}
                    onClick={() => setActivePanel("type")}
                  >
                    Tipo de estructura
                    <span className="mt-1 text-sm font-medium text-neutral-900">
                      {selectedType?.name ?? "Agregar una estructura"}
                    </span>
                  </div>

                  {promo ? (
                    <div className="flex items-center pl-2">
                      <button
                        type="button"
                        onClick={() => setIsPromoDialogOpen(true)}
                        className="inline-flex h-11 w-11 items-center justify-center rounded-xs border border-mkmedia-yellow/70 bg-mkmedia-yellow/20 text-mkmedia-blue shadow-sm transition hover:bg-mkmedia-yellow/35"
                        aria-label="Ver promoción activa"
                      >
                        <BadgePercent className="h-4 w-4" />
                      </button>
                    </div>
                  ) : null}

                  <div className="flex items-center px-2">
                    <button
                      type="submit"
                      className="flex items-center gap-2 rounded-xs bg-mkmedia-blue px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-mkmedia-blue/25 hover:bg-mkmedia-blue/90"
                    >
                      <span className="hidden md:inline">Buscar</span>
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>

              {activePanel ? (
                <div
                  className={cn(
                    "absolute left-1/2 top-full mt-4 w-full max-w-lg -translate-x-1/2 rounded-md border border-mkmedia-blue/15 bg-white p-6 shadow-2xl md:max-w-2xl",
                    isDesktopDocked ? "z-60" : "z-30",
                  )}
                >
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
                          className="rounded-xs border border-neutral-200 p-2 text-neutral-500 hover:text-neutral-700"
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
                              setQueryValue(
                                `${zone.name}, ${zone.province.name}`,
                              );
                              setActivePanel(null);
                            }}
                            className="flex items-center gap-2 rounded-xs border border-neutral-200 px-4 py-3 text-left text-sm hover:border-neutral-300"
                          >
                            <span className="flex size-8 items-center justify-centertext-neutral-600">
                              <MapPinned className="size-6" />
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
                              className={cn(
                                "rounded-xs border px-4 py-2 text-xs font-semibold transition",
                                selected
                                  ? "border-mkmedia-blue bg-mkmedia-blue text-white"
                                  : "border-mkmedia-blue/20 text-neutral-700 hover:border-mkmedia-blue/35",
                              )}
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
        </div>
      </div>

      <Dialog open={isPromoDialogOpen} onOpenChange={setIsPromoDialogOpen}>
        <DialogContent className="max-w-md rounded-md border-0 bg-linear-to-br from-neutral-50 to-white p-0 shadow-2xl">
          <div className="flex flex-col items-center px-8 pb-6 pt-8 text-center">
            {/* Icon */}
            <div className="mb-5 flex h-20 w-20 items-center justify-center rounded-full bg-linear-to-br from-blue-100 to-blue-50">
              <Megaphone
                className="h-9 w-9 text-mkmedia-blue"
                strokeWidth={2}
              />
            </div>

            {/* Header */}
            <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-neutral-500 [font-family:var(--font-mkmedia)]">
              Grupo MK MEDIA
            </span>
            <DialogTitle className="mt-2 text-2xl font-bold text-[#4338ca]">
              {promo?.name ?? "Promoción activa"}
            </DialogTitle>
            <DialogDescription className="mt-2 text-sm text-neutral-600">
              Oferta activa para campañas del catálogo.
            </DialogDescription>

            {/* Discount Box */}
            <div className="mt-6 w-full">
              <p className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
                Descuento especial
              </p>
              <div className="mt-2 flex items-baseline justify-center gap-2">
                <span className="text-4xl font-bold text-mkmedia-blue">
                  {promo?.valueLabel ?? "10%"}
                </span>
                <span className="text-base text-neutral-700">
                  en campañas activas
                </span>
              </div>
            </div>

            {/* Date */}
            {promoDateLabel ? (
              <p className="mt-4 text-xs text-neutral-500">{promoDateLabel}</p>
            ) : null}

            {/* Actions */}
            <div className="mt-6 flex w-full gap-3">
              <button
                type="button"
                onClick={() => setIsPromoDialogOpen(false)}
                className="flex-1 rounded-xs border border-neutral-300 bg-white px-4 py-2.5 text-sm font-semibold text-neutral-700 transition hover:bg-neutral-50"
              >
                Cerrar
              </button>
              <button
                type="button"
                onClick={executeSearch}
                className="flex-1 inline-flex items-center justify-center gap-2 rounded-xs bg-mkmedia-blue px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-mkmedia-blue/90"
              >
                <Search className="h-4 w-4" />
                Buscar ahora
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </section>
  );
}
