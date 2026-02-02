"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Boxes,
  Calendar,
  ChevronRight,
  MapPin,
  Search,
  Users,
  X,
} from "lucide-react";

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
  zoneId?: string;
  zones: ZoneOption[];
  structureTypes: StructureTypeOption[];
  showPromo: boolean;
  promoValueLabel: string | null;
};

type PanelKey = "destination" | "dates" | "type" | "quantity" | null;

type DateRange = {
  from?: Date;
  to?: Date;
};

const quantityOptions = [
  { value: "", label: "Indistinto" },
  { value: "1-2", label: "1 a 2" },
  { value: "3-5", label: "3 a 5" },
  { value: "6-10", label: "6 a 10" },
  { value: "11+", label: "11 o más" },
];

function isSameDay(left: Date, right: Date) {
  return (
    left.getFullYear() === right.getFullYear() &&
    left.getMonth() === right.getMonth() &&
    left.getDate() === right.getDate()
  );
}

function clampDate(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function formatShortDate(date: Date) {
  try {
    return new Intl.DateTimeFormat("es-PA", {
      day: "numeric",
      month: "short",
    }).format(date);
  } catch {
    return date.toLocaleDateString();
  }
}

function getMonthLabel(date: Date) {
  try {
    return new Intl.DateTimeFormat("es-PA", {
      month: "long",
      year: "numeric",
    }).format(date);
  } catch {
    return `${date.getMonth() + 1}/${date.getFullYear()}`;
  }
}

export function HomeSearchBar({
  query,
  typeId,
  zoneId,
  zones,
  structureTypes,
  showPromo,
  promoValueLabel,
}: HomeSearchBarProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [activePanel, setActivePanel] = useState<PanelKey>(null);
  const [queryValue, setQueryValue] = useState(query ?? "");
  const [selectedTypeId, setSelectedTypeId] = useState(typeId ?? "");
  const [selectedQuantity, setSelectedQuantity] = useState("");
  const [dateRange, setDateRange] = useState<DateRange>({});
  const [visibleMonth, setVisibleMonth] = useState(() => {
    const today = new Date();
    return new Date(today.getFullYear(), today.getMonth(), 1);
  });
  const todayDate = useMemo(() => clampDate(new Date()), []);
  const tomorrowDate = useMemo(() => {
    const tomorrow = new Date(todayDate);
    tomorrow.setDate(todayDate.getDate() + 1);
    return tomorrow;
  }, [todayDate]);

  useEffect(() => {
    setQueryValue(query ?? "");
  }, [query]);

  useEffect(() => {
    setSelectedTypeId(typeId ?? "");
  }, [typeId]);

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

  const monthData = useMemo(() => {
    const year = visibleMonth.getFullYear();
    const month = visibleMonth.getMonth();
    const monthStart = new Date(year, month, 1);
    const monthEnd = new Date(year, month + 1, 0);
    const startWeekday = monthStart.getDay();
    const daysInMonth = monthEnd.getDate();
    const days: Array<Date | null> = [];

    for (let i = 0; i < startWeekday; i += 1) {
      days.push(null);
    }
    for (let day = 1; day <= daysInMonth; day += 1) {
      days.push(new Date(year, month, day));
    }
    return days;
  }, [visibleMonth]);

  function handleRangeSelect(date: Date) {
    const selectedDate = clampDate(date);

    if (!dateRange.from || dateRange.to) {
      setDateRange({ from: selectedDate, to: undefined });
      return;
    }

    if (selectedDate < dateRange.from) {
      setDateRange({ from: selectedDate, to: dateRange.from });
      return;
    }

    setDateRange({ from: dateRange.from, to: selectedDate });
  }

  function setQuickRange(type: "today" | "tomorrow" | "weekend") {
    const today = clampDate(new Date());
    if (type === "today") {
      setDateRange({ from: today, to: today });
      return;
    }
    if (type === "tomorrow") {
      const tomorrow = new Date(today);
      tomorrow.setDate(today.getDate() + 1);
      setDateRange({ from: tomorrow, to: tomorrow });
      return;
    }
    const nextSaturday = new Date(today);
    const dayOfWeek = today.getDay();
    const diff = (6 - dayOfWeek + 7) % 7;
    nextSaturday.setDate(today.getDate() + diff);
    const nextSunday = new Date(nextSaturday);
    nextSunday.setDate(nextSaturday.getDate() + 1);
    setDateRange({ from: nextSaturday, to: nextSunday });
  }

  function rangeLabel() {
    if (dateRange.from && dateRange.to) {
      return `${formatShortDate(dateRange.from)} - ${formatShortDate(dateRange.to)}`;
    }
    if (dateRange.from) {
      return formatShortDate(dateRange.from);
    }
    return "Agregar fechas";
  }

  const segmentBase =
    "flex cursor-pointer flex-col rounded-3xl px-6 py-3 text-[11px] font-semibold text-neutral-500 transition";
  const segmentActive = "bg-white shadow-lg shadow-neutral-200/60";

  return (
    <section className="relative mx-auto w-full max-w-min px-6 pb-12 pt-4">
      <form action="/" className="mt-8">
        <div ref={containerRef} className="relative">
          <div className="rounded-full border border-white/70 bg-white/90 shadow-xl shadow-[#fcb814]/20 backdrop-blur-xl">
            <div className="flex flex-nowrap justify-center items-center gap-2 overflow-x-auto p-2 md:gap-0 md:overflow-visible">
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
                    name="q"
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
                className={`${segmentBase} min-w-[220px] md:rounded-none ${
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

              <div className="hidden h-8 w-px bg-neutral-200 md:block" />

              <div
                className={`${segmentBase} min-w-[180px] md:rounded-none md:rounded-r-full ${
                  activePanel === "quantity" ? segmentActive : ""
                }`}
                role="button"
                tabIndex={0}
                onClick={() => setActivePanel("quantity")}
              >
                Espacios
                <span className="mt-1 inline-flex items-center gap-2 text-sm font-medium text-neutral-900">
                  <Boxes className="h-4 w-4 text-neutral-400" />
                  {quantityOptions.find(
                    (option) => option.value === selectedQuantity,
                  )?.label ?? "Indistinto"}
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
                <div className="grid gap-6 md:grid-cols-[220px_1fr]">
                  <div className="space-y-3">
                    <p className="text-sm font-semibold text-neutral-900">
                      Selecciones rápidas
                    </p>
                    <button
                      type="button"
                      onClick={() => setQuickRange("today")}
                      className="w-full rounded-2xl border border-neutral-200 px-4 py-3 text-left text-lg font-semibold text-neutral-900 hover:border-neutral-300 aspect-[7/3]"
                    >
                      Hoy
                      <span className="block text-xs font-normal text-neutral-500">
                        {formatShortDate(todayDate)}
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setQuickRange("tomorrow")}
                      className="w-full rounded-2xl border border-neutral-200 px-4 py-3 text-left text-lg font-semibold text-neutral-900 hover:border-neutral-300 aspect-[7/3]"
                    >
                      Mañana
                      <span className="block text-xs font-normal text-neutral-500">
                        {formatShortDate(tomorrowDate)}
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setQuickRange("weekend")}
                      className="w-full rounded-2xl border border-neutral-200 px-4 py-3 text-left text-lg font-semibold text-neutral-900 hover:border-neutral-300 aspect-[7/3]"
                    >
                      Este fin de semana
                      <span className="block text-xs font-normal text-neutral-500">
                        Próximo sábado y domingo
                      </span>
                    </button>
                  </div>

                  <div className="rounded-3xl border border-neutral-200 p-4">
                    <div className="mb-4 flex items-center justify-between">
                      <button
                        type="button"
                        onClick={() =>
                          setVisibleMonth(
                            new Date(
                              visibleMonth.getFullYear(),
                              visibleMonth.getMonth() - 1,
                              1,
                            ),
                          )
                        }
                        className="rounded-full border border-neutral-200 px-3 py-1 text-lg font-semibold text-neutral-600 aspect-square"
                      >
                        ←
                      </button>
                      <span className="text-sm font-semibold text-neutral-900">
                        {getMonthLabel(visibleMonth)}
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          setVisibleMonth(
                            new Date(
                              visibleMonth.getFullYear(),
                              visibleMonth.getMonth() + 1,
                              1,
                            ),
                          )
                        }
                        className="rounded-full border border-neutral-200 px-3 py-1 text-lg font-semibold text-neutral-600 aspect-square"
                      >
                        →
                      </button>
                    </div>

                    <div className="grid grid-cols-7 text-[11px] font-semibold text-neutral-400">
                      {["D", "L", "M", "M", "J", "V", "S"].map((label) => (
                        <span key={label} className="pb-2 text-center">
                          {label}
                        </span>
                      ))}
                    </div>

                    <div className="grid grid-cols-7 gap-1 text-sm">
                      {monthData.map((day, index) => {
                        if (!day) {
                          return <div key={`empty-${index}`} />;
                        }

                        const from = dateRange.from
                          ? clampDate(dateRange.from)
                          : undefined;
                        const to = dateRange.to
                          ? clampDate(dateRange.to)
                          : undefined;
                        const isStart = from ? isSameDay(day, from) : false;
                        const isEnd = to ? isSameDay(day, to) : false;
                        const inRange = from && to && day >= from && day <= to;

                        return (
                          <button
                            key={day.toISOString()}
                            type="button"
                            onClick={() => handleRangeSelect(day)}
                            className={`flex h-10 w-10 items-center justify-center rounded-full aspect-square font-semibold transition ${
                              isStart || isEnd
                                ? "bg-neutral-900 text-white"
                                : inRange
                                  ? "bg-neutral-100 text-neutral-900"
                                  : "text-neutral-700 hover:bg-neutral-100"
                            }`}
                          >
                            {day.getDate()}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
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
                            setSelectedTypeId(type.id);
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

              {activePanel === "quantity" ? (
                <div className="space-y-4">
                  <p className="text-sm font-semibold text-neutral-900">
                    ¿Cuántos espacios necesitas?
                  </p>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {quantityOptions.map((option) => {
                      const selected = option.value === selectedQuantity;
                      return (
                        <button
                          key={option.label}
                          type="button"
                          onClick={() => {
                            setSelectedQuantity(option.value);
                            setActivePanel(null);
                          }}
                          className={`rounded-2xl border px-4 py-3 text-left aspect-[7/3] text-lg font-semibold transition ${
                            selected
                              ? "border-neutral-900 bg-neutral-900 text-white"
                              : "border-neutral-200 text-neutral-700 hover:border-neutral-300"
                          }`}
                        >
                          {option.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ) : null}
            </div>
          ) : null}
        </div>

        {selectedTypeId && (
          <input type="hidden" name="type" value={selectedTypeId} />
        )}
        {zoneId && <input type="hidden" name="zone" value={zoneId} />}
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
