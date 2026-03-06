export type FilterValue =
  | string
  | number
  | boolean
  | null
  | undefined
  | Array<string | number | boolean>;

export type FilterState = Record<string, FilterValue>;

type SearchParamsSource =
  | URLSearchParams
  | { get: (key: string) => string | null }
  | Record<string, string | string[] | undefined>;

export interface SummaryChipDefinition<State> {
  key: string;
  isActive: (state: State) => boolean;
  getLabel: (state: State) => string;
}

export interface SummaryChipData {
  key: string;
  label: string;
}

function readValue(source: SearchParamsSource, key: string) {
  if (typeof URLSearchParams !== "undefined" && source instanceof URLSearchParams) {
    return source.get(key) ?? undefined;
  }

  if (
    typeof source === "object" &&
    source !== null &&
    "get" in source &&
    typeof source.get === "function"
  ) {
    return source.get(key) ?? undefined;
  }

  const value = (source as Record<string, string | string[] | undefined>)[key];
  if (Array.isArray(value)) return value[0];
  return value;
}

export function parseFilterState<T extends string>(
  searchParams: SearchParamsSource,
  keys: readonly T[],
): Partial<Record<T, string>> {
  return keys.reduce<Partial<Record<T, string>>>((accumulator, key) => {
    const value = readValue(searchParams, key);
    if (typeof value === "string" && value.length > 0) {
      accumulator[key] = value;
    }
    return accumulator;
  }, {});
}

export function serializeFilterState(state: FilterState) {
  const params = new URLSearchParams();

  Object.entries(state).forEach(([key, value]) => {
    if (value === undefined || value === null || value === "") {
      return;
    }

    if (Array.isArray(value)) {
      value.forEach((item) => {
        params.append(key, String(item));
      });
      return;
    }

    params.set(key, String(value));
  });

  return params;
}

export function countActiveFilters(state: FilterState) {
  return Object.values(state).reduce<number>((count, value) => {
    if (value === undefined || value === null || value === "") {
      return count;
    }

    if (Array.isArray(value)) {
      return count + (value.length > 0 ? 1 : 0);
    }

    if (typeof value === "boolean") {
      return count + (value ? 1 : 0);
    }

    return count + 1;
  }, 0);
}

export function toSummaryChips<State>(
  state: State,
  definitions: Array<SummaryChipDefinition<State>>,
) {
  return definitions.reduce<SummaryChipData[]>((chips, definition) => {
    if (!definition.isActive(state)) {
      return chips;
    }

    chips.push({
      key: definition.key,
      label: definition.getLabel(state),
    });
    return chips;
  }, []);
}
