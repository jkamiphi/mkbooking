"use client";

import { useMemo, useState } from "react";
import { Calendar } from "lucide-react";
import {
  addDays,
  clampDate,
  parseDateInputValue,
  sanitizeDateRangeStrings,
  toDateInputValue,
} from "@/lib/date/campaign-date-range";
import { cn } from "@/lib/utils";

type CampaignDateRangePickerProps = {
  variant: "calendar" | "inputs";
  fromDate?: string;
  toDate?: string;
  minimumStartDate: string;
  minimumDurationDays?: number;
  onChange: (fromDate?: string, toDate?: string) => void;
  className?: string;
  fromInputId?: string;
  toInputId?: string;
  inputClassName?: string;
};

function isSameDay(left: Date, right: Date) {
  return (
    left.getFullYear() === right.getFullYear() &&
    left.getMonth() === right.getMonth() &&
    left.getDate() === right.getDate()
  );
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

export function formatShortDateLabel(value?: string) {
  if (!value) return "";

  const date = parseDateInputValue(value);
  if (!date) return value;

  try {
    return new Intl.DateTimeFormat("es-PA", {
      day: "numeric",
      month: "short",
    }).format(date);
  } catch {
    return value;
  }
}

function formatLongDateLabel(value: Date) {
  try {
    return new Intl.DateTimeFormat("es-PA", {
      day: "numeric",
      month: "short",
      year: "numeric",
    }).format(value);
  } catch {
    return toDateInputValue(value);
  }
}

export function CampaignDateRangePicker({
  variant,
  fromDate,
  toDate,
  minimumStartDate,
  minimumDurationDays = 1,
  onChange,
  className,
  fromInputId,
  toInputId,
  inputClassName,
}: CampaignDateRangePickerProps) {
  const minimumStart =
    parseDateInputValue(minimumStartDate) ?? clampDate(new Date());

  const parsedFromDate = parseDateInputValue(fromDate);
  const parsedToDate = parseDateInputValue(toDate);

  const [visibleMonth, setVisibleMonth] = useState(() => {
    const initial = parsedFromDate ?? minimumStart;
    return new Date(initial.getFullYear(), initial.getMonth(), 1);
  });

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

  function emitSanitizedRange(nextFromDate?: string, nextToDate?: string) {
    const sanitized = sanitizeDateRangeStrings({
      fromDate: nextFromDate,
      toDate: nextToDate,
      minimumStartDate: minimumStart,
      minimumDurationDays,
      mode: "coerce",
    });

    onChange(sanitized.fromDate, sanitized.toDate);
  }

  function handleFromInputChange(value: string) {
    if (!value) {
      onChange(undefined, undefined);
      return;
    }

    emitSanitizedRange(value, toDate);
  }

  function handleToInputChange(value: string) {
    if (!value) {
      onChange(undefined, undefined);
      return;
    }

    emitSanitizedRange(fromDate, value);
  }

  function handleCalendarRangeSelect(day: Date) {
    if (day < minimumStart) {
      return;
    }

    const selectedDate = clampDate(day);

    if (!parsedFromDate || parsedToDate) {
      onChange(toDateInputValue(selectedDate), undefined);
      return;
    }

    let start = parsedFromDate;
    let end = selectedDate;

    if (end < start) {
      const previousStart = start;
      start = end;
      end = previousStart;
    }

    const minimumEnd = addDays(start, minimumDurationDays);
    if (end < minimumEnd) {
      end = minimumEnd;
    }

    onChange(toDateInputValue(start), toDateInputValue(end));
  }

  function setQuickRange(startDate: Date) {
    const normalizedStart = startDate < minimumStart ? minimumStart : startDate;
    const normalizedEnd = addDays(normalizedStart, minimumDurationDays);

    onChange(
      toDateInputValue(normalizedStart),
      toDateInputValue(normalizedEnd),
    );
  }

  if (variant === "inputs") {
    const minimumToDate = parsedFromDate
      ? addDays(parsedFromDate, minimumDurationDays)
      : addDays(minimumStart, minimumDurationDays);

    return (
      <div className={cn("grid grid-cols-2 gap-3", className)}>
        <input
          id={fromInputId}
          type="date"
          value={fromDate ?? ""}
          min={toDateInputValue(minimumStart)}
          onChange={(event) => handleFromInputChange(event.target.value)}
          className={cn(
            "rounded-xl border border-neutral-200 bg-white px-3 py-2.5 text-sm text-neutral-800 focus:border-neutral-400 focus:outline-none",
            inputClassName,
          )}
        />
        <input
          id={toInputId}
          type="date"
          value={toDate ?? ""}
          min={toDateInputValue(minimumToDate)}
          onChange={(event) => handleToInputChange(event.target.value)}
          className={cn(
            "rounded-xl border border-neutral-200 bg-white px-3 py-2.5 text-sm text-neutral-800 focus:border-neutral-400 focus:outline-none",
            inputClassName,
          )}
        />
      </div>
    );
  }

  const previousMonthStart = new Date(
    visibleMonth.getFullYear(),
    visibleMonth.getMonth() - 1,
    1,
  );
  const minimumMonthStart = new Date(
    minimumStart.getFullYear(),
    minimumStart.getMonth(),
    1,
  );
  const canGoPreviousMonth = previousMonthStart >= minimumMonthStart;

  return (
    <div className={cn("grid gap-6 md:grid-cols-[220px_1fr]", className)}>
      <div className="space-y-3">
        <p className="text-sm font-semibold text-neutral-900">
          Selecciones rápidas
        </p>
        <button
          type="button"
          onClick={() => setQuickRange(minimumStart)}
          className="w-full rounded-2xl border border-neutral-200 px-4 py-3 text-left text-base font-semibold text-neutral-900 hover:border-neutral-300"
        >
          Primer rango disponible
          <span className="mt-1 block text-xs font-normal text-neutral-500">
            {formatLongDateLabel(minimumStart)}
          </span>
        </button>
        <button
          type="button"
          onClick={() => setQuickRange(addDays(minimumStart, 7))}
          className="w-full rounded-2xl border border-neutral-200 px-4 py-3 text-left text-base font-semibold text-neutral-900 hover:border-neutral-300"
        >
          Siguiente semana
          <span className="mt-1 block text-xs font-normal text-neutral-500">
            Desde {formatLongDateLabel(addDays(minimumStart, 7))}
          </span>
        </button>

        <div className="rounded-2xl border border-dashed border-neutral-200 bg-neutral-50 px-3 py-2 text-xs text-neutral-600">
          <p className="font-medium text-neutral-700">Regla de fechas</p>
          <p>Inicio mínimo: {formatLongDateLabel(minimumStart)}</p>
          <p>Duración mínima: {minimumDurationDays} día.</p>
        </div>
      </div>

      <div className="rounded-3xl border border-neutral-200 p-4">
        <div className="mb-4 flex items-center justify-between">
          <button
            type="button"
            onClick={() =>
              canGoPreviousMonth
                ? setVisibleMonth(previousMonthStart)
                : undefined
            }
            disabled={!canGoPreviousMonth}
            className="aspect-square rounded-md border border-neutral-200 px-3 py-1 text-lg font-semibold text-neutral-600 disabled:cursor-not-allowed disabled:opacity-40"
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
            className="aspect-square rounded-md border border-neutral-200 px-3 py-1 text-lg font-semibold text-neutral-600"
          >
            →
          </button>
        </div>

        <div className="grid grid-cols-7 text-[11px] font-semibold text-neutral-400">
          {["D", "L", "M", "M", "J", "V", "S"].map((label, index) => (
            <span key={`${label}-${index}`} className="pb-2 text-center">
              {label}
            </span>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1 text-sm">
          {monthData.map((day, index) => {
            if (!day) {
              return <div key={`empty-${index}`} />;
            }

            const isDisabled = day < minimumStart;
            const isStart = parsedFromDate
              ? isSameDay(day, parsedFromDate)
              : false;
            const isEnd = parsedToDate ? isSameDay(day, parsedToDate) : false;
            const isInRange =
              parsedFromDate &&
              parsedToDate &&
              day >= parsedFromDate &&
              day <= parsedToDate;

            return (
              <button
                key={day.toISOString()}
                type="button"
                onClick={() => handleCalendarRangeSelect(day)}
                disabled={isDisabled}
                className={cn(
                  "aspect-square flex h-10 w-10 items-center justify-center rounded-md font-semibold transition",
                  isStart || isEnd
                    ? "bg-neutral-900 text-white"
                    : isInRange
                      ? "bg-neutral-100 text-neutral-900"
                      : "text-neutral-700 hover:bg-neutral-100",
                  isDisabled &&
                    "cursor-not-allowed bg-transparent text-neutral-300 hover:bg-transparent",
                )}
              >
                {day.getDate()}
              </button>
            );
          })}
        </div>

        <div className="mt-4 inline-flex items-center gap-2 rounded-md border border-neutral-200 px-3 py-1 text-xs text-neutral-600">
          <Calendar className="h-3.5 w-3.5" />
          Selecciona mínimo dos fechas con 1 día de diferencia.
        </div>
      </div>
    </div>
  );
}
