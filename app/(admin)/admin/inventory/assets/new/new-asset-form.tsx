"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { APIProvider, AdvancedMarker, Map } from "@vis.gl/react-google-maps";
import { LocateFixed, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  ImageGalleryField,
  type ImageGalleryItem,
} from "@/components/inventory/image-gallery-field";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SelectNative } from "@/components/ui/select-native";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc/client";

const statusOptions = ["ACTIVE", "INACTIVE", "MAINTENANCE", "RETIRED"] as const;
const statusLabels: Record<(typeof statusOptions)[number], string> = {
  ACTIVE: "ACTIVO",
  INACTIVE: "INACTIVO",
  MAINTENANCE: "MANTENIMIENTO",
  RETIRED: "RETIRADO",
};
const landTenureOptions = ["SERVIDUMBRE", "PRIVADO", "ESTATAL", "OTRO"] as const;
const landTenureLabels: Record<(typeof landTenureOptions)[number], string> = {
  SERVIDUMBRE: "Servidumbre",
  PRIVADO: "Privado",
  ESTATAL: "Estatal",
  OTRO: "Otro",
};

const GOOGLE_MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "";
const GOOGLE_MAP_ID = process.env.NEXT_PUBLIC_GOOGLE_MAP_ID || "";
const DEFAULT_MAP_CENTER = { lat: 8.9824, lng: -79.5199 };

type AssetStatus = (typeof statusOptions)[number];
type Coordinates = { lat: number; lng: number };

function parseCoordinate(value: string) {
  const trimmed = value.trim().replace(",", ".");
  if (!trimmed) return undefined;
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function formatCoordinate(value: number) {
  return value.toFixed(6);
}

function isValidLatitude(value: number) {
  return value >= -90 && value <= 90;
}

function isValidLongitude(value: number) {
  return value >= -180 && value <= 180;
}

function parseOptionalNumberInput(value: string) {
  const trimmed = value.trim().replace(",", ".");
  if (!trimmed) return undefined;
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : null;
}

function parseOptionalIntegerInput(value: string) {
  const parsed = parseOptionalNumberInput(value);
  if (parsed === undefined) return undefined;
  if (parsed === null || !Number.isInteger(parsed)) return null;
  return parsed;
}

function AssetLocationMap({
  coordinates,
  onCoordinatesChange,
}: {
  coordinates: Coordinates | null;
  onCoordinatesChange: (next: Coordinates) => void;
}) {
  if (!GOOGLE_MAPS_API_KEY) {
    return (
      <div className="flex h-[340px] items-center justify-center rounded-lg border bg-muted/30 px-4 text-sm text-muted-foreground">
        Configura `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` para habilitar el mapa.
      </div>
    );
  }

  return (
    <div className="h-[340px] overflow-hidden rounded-lg border">
      <APIProvider apiKey={GOOGLE_MAPS_API_KEY}>
        <Map
          center={coordinates ?? DEFAULT_MAP_CENTER}
          defaultZoom={12}
          mapId={GOOGLE_MAP_ID || undefined}
          gestureHandling="greedy"
          disableDefaultUI={false}
          mapTypeControl={false}
          streetViewControl={false}
          fullscreenControl={true}
          onClick={(event) => {
            const clickPosition = event.detail.latLng;
            if (!clickPosition) return;
            onCoordinatesChange({
              lat: clickPosition.lat,
              lng: clickPosition.lng,
            });
          }}
          className="h-full w-full"
        >
          {coordinates ? (
            <AdvancedMarker
              position={coordinates}
              draggable
              onDragEnd={(event) => {
                if (!event.latLng) return;
                onCoordinatesChange({
                  lat: event.latLng.lat(),
                  lng: event.latLng.lng(),
                });
              }}
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#0359A8] text-white shadow-lg">
                <MapPin className="h-4 w-4" />
              </div>
            </AdvancedMarker>
          ) : null}
        </Map>
      </APIProvider>
    </div>
  );
}

export function NewAssetForm() {
  const router = useRouter();
  const utils = trpc.useUtils();
  const structureTypesQuery = trpc.inventory.structureTypes.list.useQuery();
  const zonesQuery = trpc.inventory.zones.list.useQuery();
  const roadTypesQuery = trpc.inventory.roadTypes.list.useQuery();

  const [error, setError] = useState<string | null>(null);
  const [isLocating, setIsLocating] = useState(false);
  const [images, setImages] = useState<ImageGalleryItem[]>([]);

  const [form, setForm] = useState({
    code: "",
    structureTypeId: "",
    zoneId: "",
    roadTypeId: "",
    address: "",
    landmark: "",
    municipality: "",
    latitude: "",
    longitude: "",
    landTenure: "",
    vehicleTrafficMonthly: "",
    pedestrianTrafficMonthly: "",
    landRentMonthly: "",
    electricityCostMonthly: "",
    assetTaxMonthly: "",
    illuminated: false,
    digital: false,
    powered: false,
    hasPrintService: false,
    status: "ACTIVE" as AssetStatus,
    notes: "",
    installedDate: "",
    retiredDate: "",
  });

  const coordinates = useMemo(() => {
    const lat = parseCoordinate(form.latitude);
    const lng = parseCoordinate(form.longitude);
    if (lat === undefined || lng === undefined) return null;
    if (!isValidLatitude(lat) || !isValidLongitude(lng)) return null;
    return { lat, lng };
  }, [form.latitude, form.longitude]);

  function setCoordinates(next: Coordinates) {
    setForm((previous) => ({
      ...previous,
      latitude: formatCoordinate(next.lat),
      longitude: formatCoordinate(next.lng),
    }));
  }

  function locateCurrentPosition() {
    if (!navigator.geolocation) {
      setError("Tu navegador no soporta geolocalización.");
      return;
    }

    setIsLocating(true);
    setError(null);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setCoordinates({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
        setIsLocating(false);
      },
      () => {
        setError("No se pudo obtener tu ubicación actual.");
        setIsLocating(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  }

  const createAsset = trpc.inventory.assets.create.useMutation({
    onSuccess: () => {
      utils.inventory.assets.list.invalidate();
      router.push("/admin/inventory/assets");
    },
    onError: (err) => {
      if (err.message.includes("Unique constraint failed on the fields: (`code`)")) {
        setError("Ya existe un activo con este código. Por favor usa un código diferente.");
      } else if (err.message.includes("Unique constraint")) {
        setError("Ya existe un registro con este valor.");
      } else {
        setError(err.message);
      }
    },
  });

  const canSave =
    form.code.trim() &&
    form.structureTypeId &&
    form.zoneId &&
    form.address.trim();

  return (
    <Card>
      <CardContent className="pt-6">
        <form
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            setError(null);
            if (!canSave) return;

            const latInput = form.latitude.trim();
            const lngInput = form.longitude.trim();
            const hasAnyCoordinates = latInput.length > 0 || lngInput.length > 0;

            const lat = parseCoordinate(form.latitude);
            const lng = parseCoordinate(form.longitude);

            if (hasAnyCoordinates && (lat === undefined || lng === undefined)) {
              setError("Debes ingresar latitud y longitud válidas.");
              return;
            }

            if (lat !== undefined && !isValidLatitude(lat)) {
              setError("La latitud debe estar entre -90 y 90");
              return;
            }
            if (lng !== undefined && !isValidLongitude(lng)) {
              setError("La longitud debe estar entre -180 y 180");
              return;
            }

            const vehicleTrafficMonthly = parseOptionalIntegerInput(
              form.vehicleTrafficMonthly
            );
            if (
              vehicleTrafficMonthly === null ||
              (vehicleTrafficMonthly !== undefined && vehicleTrafficMonthly < 0)
            ) {
              setError("El aforo vehicular mensual debe ser un número entero válido.");
              return;
            }

            const pedestrianTrafficMonthly = parseOptionalIntegerInput(
              form.pedestrianTrafficMonthly
            );
            if (
              pedestrianTrafficMonthly === null ||
              (pedestrianTrafficMonthly !== undefined &&
                pedestrianTrafficMonthly < 0)
            ) {
              setError("El aforo de personas mensual debe ser un número entero válido.");
              return;
            }

            const landRentMonthly = parseOptionalNumberInput(form.landRentMonthly);
            if (
              landRentMonthly === null ||
              (landRentMonthly !== undefined && landRentMonthly < 0)
            ) {
              setError("El terraje mensual debe ser un monto válido.");
              return;
            }

            const electricityCostMonthly = parseOptionalNumberInput(
              form.electricityCostMonthly
            );
            if (
              electricityCostMonthly === null ||
              (electricityCostMonthly !== undefined &&
                electricityCostMonthly < 0)
            ) {
              setError("El gasto de luz mensual debe ser un monto válido.");
              return;
            }

            const assetTaxMonthly = parseOptionalNumberInput(form.assetTaxMonthly);
            if (
              assetTaxMonthly === null ||
              (assetTaxMonthly !== undefined && assetTaxMonthly < 0)
            ) {
              setError("El impuesto mensual debe ser un monto válido.");
              return;
            }

            createAsset.mutate({
              code: form.code.trim(),
              structureTypeId: form.structureTypeId,
              zoneId: form.zoneId,
              roadTypeId: form.roadTypeId || undefined,
              address: form.address.trim(),
              landmark: form.landmark.trim() || undefined,
              municipality: form.municipality.trim() || undefined,
              latitude: lat,
              longitude: lng,
              landTenure:
                (form.landTenure as (typeof landTenureOptions)[number]) || undefined,
              vehicleTrafficMonthly,
              pedestrianTrafficMonthly,
              landRentMonthly,
              electricityCostMonthly,
              assetTaxMonthly,
              illuminated: form.illuminated,
              digital: form.digital,
              powered: form.powered,
              hasPrintService: form.hasPrintService,
              status: form.status,
              notes: form.notes.trim() || undefined,
              installedDate: form.installedDate
                ? new Date(form.installedDate)
                : undefined,
              retiredDate: form.retiredDate ? new Date(form.retiredDate) : undefined,
              images: images.map((image) => ({
                id: image.id,
                image: image.image,
                caption: image.caption.trim() || undefined,
                isPrimary: image.isPrimary,
              })),
            });
          }}
        >
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <Label className="mb-1.5 block">Código</Label>
              <Input
                value={form.code}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, code: event.target.value }))
                }
              />
            </div>
            <div>
              <Label className="mb-1.5 block">Tipo de Estructura</Label>
              <SelectNative
                value={form.structureTypeId}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    structureTypeId: event.target.value,
                  }))
                }
              >
                <option value="">Seleccionar</option>
                {structureTypesQuery.data?.map((type) => (
                  <option key={type.id} value={type.id}>
                    {type.name}
                  </option>
                ))}
              </SelectNative>
            </div>
            <div>
              <Label className="mb-1.5 block">Zona</Label>
              <SelectNative
                value={form.zoneId}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, zoneId: event.target.value }))
                }
              >
                <option value="">Seleccionar</option>
                {zonesQuery.data?.map((zone) => (
                  <option key={zone.id} value={zone.id}>
                    {zone.province.name} - {zone.name}
                  </option>
                ))}
              </SelectNative>
            </div>
            <div>
              <Label className="mb-1.5 block">Tipo de Vía (opcional)</Label>
              <SelectNative
                value={form.roadTypeId}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, roadTypeId: event.target.value }))
                }
              >
                <option value="">Seleccionar</option>
                {roadTypesQuery.data?.map((road) => (
                  <option key={road.id} value={road.id}>
                    {road.name}
                  </option>
                ))}
              </SelectNative>
            </div>
            <div className="md:col-span-2">
              <Label className="mb-1.5 block">Dirección</Label>
              <Input
                value={form.address}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, address: event.target.value }))
                }
              />
            </div>
            <div className="md:col-span-2">
              <Label className="mb-1.5 block">Punto de Referencia (opcional)</Label>
              <Input
                value={form.landmark}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, landmark: event.target.value }))
                }
              />
            </div>
            <div>
              <Label className="mb-1.5 block">Terreno</Label>
              <SelectNative
                value={form.landTenure}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, landTenure: event.target.value }))
                }
              >
                <option value="">Seleccionar</option>
                {landTenureOptions.map((option) => (
                  <option key={option} value={option}>
                    {landTenureLabels[option]}
                  </option>
                ))}
              </SelectNative>
            </div>
            <div>
              <Label className="mb-1.5 block">Municipio (opcional)</Label>
              <Input
                value={form.municipality}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, municipality: event.target.value }))
                }
              />
            </div>
            <div>
              <Label className="mb-1.5 block">Aforo Vehicular Mensual</Label>
              <Input
                type="number"
                min="0"
                step="1"
                value={form.vehicleTrafficMonthly}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    vehicleTrafficMonthly: event.target.value,
                  }))
                }
              />
            </div>
            <div>
              <Label className="mb-1.5 block">Aforo Personas Mensual</Label>
              <Input
                type="number"
                min="0"
                step="1"
                value={form.pedestrianTrafficMonthly}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    pedestrianTrafficMonthly: event.target.value,
                  }))
                }
              />
            </div>
            <div>
              <Label className="mb-1.5 block">Terraje Mensual (USD)</Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={form.landRentMonthly}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, landRentMonthly: event.target.value }))
                }
              />
            </div>
            <div>
              <Label className="mb-1.5 block">Gasto Luz Mensual (USD)</Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={form.electricityCostMonthly}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    electricityCostMonthly: event.target.value,
                  }))
                }
              />
            </div>
            <div>
              <Label className="mb-1.5 block">Impuesto Mensual (USD)</Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={form.assetTaxMonthly}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, assetTaxMonthly: event.target.value }))
                }
              />
            </div>
            <div>
              <Label className="mb-1.5 block">Latitud (-90 a 90)</Label>
              <Input
                type="number"
                step="0.000001"
                min="-90"
                max="90"
                placeholder="ej. 8.982400"
                value={form.latitude}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, latitude: event.target.value }))
                }
              />
            </div>
            <div>
              <Label className="mb-1.5 block">Longitud (-180 a 180)</Label>
              <Input
                type="number"
                step="0.000001"
                min="-180"
                max="180"
                placeholder="ej. -79.519900"
                value={form.longitude}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, longitude: event.target.value }))
                }
              />
            </div>

            <div className="space-y-2 md:col-span-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <Label className="block">Ubicación en mapa</Label>
                  <p className="text-xs text-muted-foreground">
                    Haz clic en el mapa o arrastra el marcador para ajustar coordenadas.
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={locateCurrentPosition}
                  disabled={isLocating}
                >
                  <LocateFixed className="mr-2 h-4 w-4" />
                  {isLocating ? "Ubicando..." : "Usar mi ubicación"}
                </Button>
              </div>
              <AssetLocationMap
                coordinates={coordinates}
                onCoordinatesChange={setCoordinates}
              />
            </div>

            <div>
              <Label className="mb-1.5 block">Estado</Label>
              <SelectNative
                value={form.status}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    status: event.target.value as AssetStatus,
                  }))
                }
              >
                {statusOptions.map((option) => (
                  <option key={option} value={option}>
                    {statusLabels[option]}
                  </option>
                ))}
              </SelectNative>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Label className="flex items-center gap-2 text-sm">
                <Checkbox
                  checked={form.illuminated}
                  onCheckedChange={(checked) =>
                    setForm((prev) => ({
                      ...prev,
                      illuminated: Boolean(checked),
                    }))
                  }
                />
                Iluminado
              </Label>
              <Label className="flex items-center gap-2 text-sm">
                <Checkbox
                  checked={form.digital}
                  onCheckedChange={(checked) =>
                    setForm((prev) => ({ ...prev, digital: Boolean(checked) }))
                  }
                />
                Digital
              </Label>
              <Label className="flex items-center gap-2 text-sm">
                <Checkbox
                  checked={form.powered}
                  onCheckedChange={(checked) =>
                    setForm((prev) => ({ ...prev, powered: Boolean(checked) }))
                  }
                />
                Con Energía
              </Label>
              <Label className="flex items-center gap-2 text-sm">
                <Checkbox
                  checked={form.hasPrintService}
                  onCheckedChange={(checked) =>
                    setForm((prev) => ({
                      ...prev,
                      hasPrintService: Boolean(checked),
                    }))
                  }
                />
                Servicio de Impresión
              </Label>
            </div>
            <div>
              <Label className="mb-1.5 block">Fecha de Instalación</Label>
              <Input
                type="date"
                value={form.installedDate}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    installedDate: event.target.value,
                  }))
                }
              />
            </div>
            <div>
              <Label className="mb-1.5 block">Fecha de Retiro</Label>
              <Input
                type="date"
                value={form.retiredDate}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    retiredDate: event.target.value,
                  }))
                }
              />
            </div>
            <div className="md:col-span-2">
              <Label className="mb-1.5 block">Notas</Label>
              <Textarea
                value={form.notes}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, notes: event.target.value }))
                }
                rows={3}
              />
            </div>
            <div className="md:col-span-2">
              <ImageGalleryField
                images={images}
                scope="inventory-asset-image"
                label="Imágenes del activo"
                description="La imagen principal se usará como fallback en catálogo y detalle."
                onChange={setImages}
                disabled={createAsset.isPending}
              />
            </div>
          </div>

          {error ? (
            <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400">
              {error}
            </div>
          ) : null}

          <div className="flex gap-3">
            <Button type="submit" disabled={!canSave || createAsset.isPending}>
              {createAsset.isPending ? "Guardando..." : "Crear Activo"}
            </Button>
            <Button variant="outline" asChild>
              <Link href="/admin/inventory/assets">Cancelar</Link>
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
