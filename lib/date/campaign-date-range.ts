const DAY_IN_MS = 24 * 60 * 60 * 1000;

export type CampaignDateRange = {
  fromDate: Date | null;
  toDate: Date | null;
};

function toNonNegativeInteger(value: number, fallback = 0) {
  if (!Number.isFinite(value)) return fallback;
  return Math.max(0, Math.floor(value));
}

export function clampDate(value: Date) {
  return new Date(value.getFullYear(), value.getMonth(), value.getDate());
}

export function addDays(value: Date, days: number) {
  const normalized = clampDate(value);
  normalized.setDate(normalized.getDate() + toNonNegativeInteger(days));
  return normalized;
}

export function toDateInputValue(value: Date) {
  const normalized = clampDate(value);
  const year = normalized.getFullYear();
  const month = String(normalized.getMonth() + 1).padStart(2, "0");
  const day = String(normalized.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function parseDateInputValue(value?: string | null) {
  if (!value) return null;

  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]) - 1;
  const day = Number(match[3]);
  const date = new Date(year, month, day);

  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month ||
    date.getDate() !== day
  ) {
    return null;
  }

  return clampDate(date);
}

export function normalizeRange(
  fromDate?: Date | null,
  toDate?: Date | null,
): CampaignDateRange {
  if (!fromDate && !toDate) {
    return { fromDate: null, toDate: null };
  }

  const normalizedFrom = fromDate ? clampDate(fromDate) : null;
  const normalizedTo = toDate ? clampDate(toDate) : null;

  if (!normalizedFrom || !normalizedTo) {
    return {
      fromDate: normalizedFrom,
      toDate: normalizedTo,
    };
  }

  return normalizedFrom <= normalizedTo
    ? { fromDate: normalizedFrom, toDate: normalizedTo }
    : { fromDate: normalizedTo, toDate: normalizedFrom };
}

export function computeMinimumStartDate(gapDays: number, now = new Date()) {
  return addDays(clampDate(now), toNonNegativeInteger(gapDays));
}

export function isRangeValid(options: {
  fromDate?: Date | null;
  toDate?: Date | null;
  minimumStartDate: Date;
  minimumDurationDays?: number;
}) {
  const minimumDurationDays = toNonNegativeInteger(
    options.minimumDurationDays ?? 1,
    1,
  );
  const minimumStartDate = clampDate(options.minimumStartDate);
  const normalized = normalizeRange(options.fromDate, options.toDate);

  if (!normalized.fromDate || !normalized.toDate) {
    return false;
  }

  if (normalized.fromDate < minimumStartDate) {
    return false;
  }

  return normalized.toDate >= addDays(normalized.fromDate, minimumDurationDays);
}

export function sanitizeDateRangeStrings(options: {
  fromDate?: string | null;
  toDate?: string | null;
  minimumStartDate: Date;
  minimumDurationDays?: number;
  mode?: "drop-invalid" | "coerce";
}) {
  const mode = options.mode ?? "drop-invalid";
  const minimumDurationDays = toNonNegativeInteger(
    options.minimumDurationDays ?? 1,
    1,
  );
  const minimumStartDate = clampDate(options.minimumStartDate);

  let fromDate = parseDateInputValue(options.fromDate);
  let toDate = parseDateInputValue(options.toDate);

  if (!fromDate && !toDate) {
    return { fromDate: undefined, toDate: undefined };
  }

  if (!fromDate || !toDate) {
    if (mode === "drop-invalid") {
      return { fromDate: undefined, toDate: undefined };
    }

    fromDate = fromDate ?? minimumStartDate;
    toDate = toDate ?? addDays(fromDate, minimumDurationDays);
  }

  const normalized = normalizeRange(fromDate, toDate);
  fromDate = normalized.fromDate;
  toDate = normalized.toDate;

  if (!fromDate || !toDate) {
    return { fromDate: undefined, toDate: undefined };
  }

  if (fromDate < minimumStartDate) {
    if (mode === "drop-invalid") {
      return { fromDate: undefined, toDate: undefined };
    }

    fromDate = minimumStartDate;
  }

  const minimumToDate = addDays(fromDate, minimumDurationDays);

  if (toDate < minimumToDate) {
    if (mode === "drop-invalid") {
      return { fromDate: undefined, toDate: undefined };
    }

    toDate = minimumToDate;
  }

  return {
    fromDate: toDateInputValue(fromDate),
    toDate: toDateInputValue(toDate),
  };
}

export function calculateDateDifferenceInDays(fromDate: Date, toDate: Date) {
  const normalizedFrom = clampDate(fromDate);
  const normalizedTo = clampDate(toDate);
  return Math.round((normalizedTo.getTime() - normalizedFrom.getTime()) / DAY_IN_MS);
}
