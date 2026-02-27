type NumericInput = number | string | { toString(): string } | null | undefined;

export interface HomeStructureType {
  id: string;
  name: string;
  imageUrl?: string | null;
}

export interface HomeZone {
  id: string;
  name: string;
  imageUrl?: string | null;
  province: {
    name: string;
  };
}

export interface HomeCatalogFace {
  id: string;
  code: string;
  width: NumericInput;
  height: NumericInput;
  resolvedImageUrl?: string | null;
  catalogFace?: {
    title?: string | null;
    highlight?: string | null;
  } | null;
  effectivePrice?: {
    priceDaily: number | string | { toString(): string };
    currency?: string | null;
  } | null;
  asset: {
    digital: boolean;
    illuminated: boolean;
    address: string;
    structureType: {
      name: string;
      imageUrl?: string | null;
    };
    zone: {
      name: string;
      province: {
        name: string;
      };
    };
  };
}
