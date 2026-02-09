type NumericInput = number | string | { toString(): string } | null | undefined;

const dimensionFormatter = new Intl.NumberFormat("es-PA", {
  maximumFractionDigits: 2,
});

const areaFormatter = new Intl.NumberFormat("es-PA", {
  maximumFractionDigits: 1,
});

export function formatPrice(priceDaily: number, currency: string) {
  try {
    return new Intl.NumberFormat("es-PA", {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(priceDaily);
  } catch {
    return `${priceDaily} ${currency}`;
  }
}

export function getTrafficLabel(structureType: string) {
  const normalizedName = structureType.toLowerCase();
  if (
    normalizedName.includes("digital") ||
    normalizedName.includes("unipolar") ||
    normalizedName.includes("valla")
  ) {
    return "Alto";
  }
  if (
    normalizedName.includes("mupi") ||
    normalizedName.includes("parada")
  ) {
    return "Medio";
  }
  return "Moderado";
}

function parseDimension(value: NumericInput) {
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue) || numericValue <= 0) {
    return null;
  }
  return numericValue;
}

export function formatFaceDimensions(width: NumericInput, height: NumericInput) {
  const parsedWidth = parseDimension(width);
  const parsedHeight = parseDimension(height);
  if (parsedWidth === null || parsedHeight === null) {
    return null;
  }

  const area = parsedWidth * parsedHeight;

  return {
    label: `${dimensionFormatter.format(parsedWidth)} x ${dimensionFormatter.format(parsedHeight)} m`,
    areaLabel: `${areaFormatter.format(area)} m²`,
  };
}
