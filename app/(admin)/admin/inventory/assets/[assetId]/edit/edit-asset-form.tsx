"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { APIProvider, AdvancedMarker, Map } from "@vis.gl/react-google-maps";
import { LocateFixed, MapPin } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
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

const GOOGLE_MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "";
const GOOGLE_MAP_ID = process.env.NEXT_PUBLIC_GOOGLE_MAP_ID || "";
const DEFAULT_MAP_CENTER = { lat: 8.9824, lng: -79.5199 };

type AssetStatus = (typeof statusOptions)[number];
type Coordinates = { lat: number; lng: number };

type AssetFormValues = {
  code: string;
  structureTypeId: string;
  zoneId: string;
  roadTypeId: string;
  address: string;
  landmark: string;
  latitude: string;
  longitude: string;
  illuminated: boolean;
  digital: boolean;
  powered: boolean;
  hasPrintService: boolean;
  status: AssetStatus;
  notes: string;
  installedDate: string;
  retiredDate: string;
};

function parseCoordinate(value: string) {
  const trimmed = value.trim().replace(",", ".");
  if (!trimmed) return undefined;
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function toNumber(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value.trim().replace(",", "."));
    return Number.isFinite(parsed) ? parsed : null;
  }
  if (
    value &&
    typeof value === "object" &&
    "toString" in value &&
    typeof value.toString === "function"
  ) {
    const parsed = Number(value.toString());
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function formatCoordinate(value: number) {
  return value.toFixed(6);
}

function toDateInputValue(value: unknown) {
  if (!value) return "";
  const date = value instanceof Date ? value : new Date(String(value));
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
}

function isValidLatitude(value: number) {
  return value >= -90 && value <= 90;
}

function isValidLongitude(value: number) {
  return value >= -180 && value <= 180;
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

function mapAssetToForm(asset: NonNullable<ReturnType<typeof trpc.inventory.assets.get.useQuery>["data"]>): AssetFormValues {
  const latitude = toNumber(asset.latitude);
  const longitude = toNumber(asset.longitude);

  return {
    code: asset.code,
    structureTypeId: asset.structureTypeId,
    zoneId: asset.zoneId,
    roadTypeId: asset.roadTypeId ?? "",
    address: asset.address,
    landmark: asset.landmark ?? "",
    latitude: latitude === null ? "" : formatCoordinate(latitude),
    longitude: longitude === null ? "" : formatCoordinate(longitude),
    illuminated: asset.illuminated,
    digital: asset.digital,
    powered: asset.powered,
    hasPrintService: asset.hasPrintService,
    status: asset.status as AssetStatus,
    notes: asset.notes ?? "",
    installedDate: toDateInputValue(asset.installedDate),
    retiredDate: toDateInputValue(asset.retiredDate),
  };
}

export function EditAssetForm({ assetId }: { assetId: string }) {
  const router = useRouter();
  const utils = trpc.useUtils();

  const [error, setError] = useState<string | null>(null);
  const [isLocating, setIsLocating] = useState(false);
  const [draft, setDraft] = useState<Partial<AssetFormValues>>({});

  const assetQuery = trpc.inventory.assets.get.useQuery({ id: assetId });
  const structureTypesQuery = trpc.inventory.structureTypes.list.useQuery();
  const zonesQuery = trpc.inventory.zones.list.useQuery();
  const roadTypesQuery = trpc.inventory.roadTypes.list.useQuery();

  const form = useMemo(() => {
    if (!assetQuery.data) return null;
    return {
      ...mapAssetToForm(assetQuery.data),
      ...draft,
    } satisfies AssetFormValues;
  }, [assetQuery.data, draft]);

  const coordinates = useMemo(() => {
    if (!form) return null;
    const lat = parseCoordinate(form.latitude);
    const lng = parseCoordinate(form.longitude);
    if (lat === undefined || lng === undefined) return null;
    if (!isValidLatitude(lat) || !isValidLongitude(lng)) return null;
    return { lat, lng };
  }, [form]);

  const updateAsset = trpc.inventory.assets.update.useMutation({
    onSuccess: async () => {
      await Promise.all([
        utils.inventory.assets.list.invalidate(),
        utils.inventory.assets.get.invalidate({ id: assetId }),
      ]);
      toast.success("Activo actualizado correctamente.");
      router.push("/admin/inventory/assets");
    },
    onError: (mutationError) => {
      const message =
        mutationError.message.includes("Unique constraint")
          ? "Ya existe un activo con este código."
          : mutationError.message;
      setError(message);
      toast.error(message);
    },
  });

  function setCoordinates(next: Coordinates) {
    setDraft((previous) => ({
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

  if (assetQuery.isLoading || !form) {
    return (
      <Card>
        <CardContent className="pt-6 text-sm text-muted-foreground">
          Cargando datos del activo...
        </CardContent>
      </Card>
    );
  }

  if (assetQuery.error) {
    return (
      <Card>
        <CardContent className="space-y-4 pt-6">
          <p className="text-sm text-red-600">
            No se pudo cargar el activo para editar.
          </p>
          <Button variant="outline" onClick={() => void assetQuery.refetch()}>
            Reintentar
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (!assetQuery.data) {
    return (
      <Card>
        <CardContent className="space-y-4 pt-6">
          <p className="text-sm text-muted-foreground">Activo no encontrado.</p>
          <Button asChild variant="outline">
            <Link href="/admin/inventory/assets">Volver a activos</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

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
              setError("La latitud debe estar entre -90 y 90.");
              return;
            }
            if (lng !== undefined && !isValidLongitude(lng)) {
              setError("La longitud debe estar entre -180 y 180.");
              return;
            }

            updateAsset.mutate({
              id: assetId,
              code: form.code.trim(),
              structureTypeId: form.structureTypeId,
              zoneId: form.zoneId,
              roadTypeId: form.roadTypeId,
              address: form.address.trim(),
              landmark: form.landmark.trim(),
              latitude: lat,
              longitude: lng,
              illuminated: form.illuminated,
              digital: form.digital,
              powered: form.powered,
              hasPrintService: form.hasPrintService,
              status: form.status,
              notes: form.notes.trim(),
              installedDate: form.installedDate
                ? new Date(form.installedDate)
                : undefined,
              retiredDate: form.retiredDate ? new Date(form.retiredDate) : undefined,
            });
          }}
        >
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <Label className="mb-1.5 block">Código</Label>
              <Input
                value={form.code}
                onChange={(event) =>
                  setDraft((prev) => ({ ...prev, code: event.target.value }))
                }
              />
            </div>
            <div>
              <Label className="mb-1.5 block">Tipo de Estructura</Label>
              <SelectNative
                value={form.structureTypeId}
                onChange={(event) =>
                  setDraft((prev) => ({ ...prev, structureTypeId: event.target.value }))
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
                  setDraft((prev) => ({ ...prev, zoneId: event.target.value }))
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
                  setDraft((prev) => ({ ...prev, roadTypeId: event.target.value }))
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
                  setDraft((prev) => ({ ...prev, address: event.target.value }))
                }
              />
            </div>
            <div className="md:col-span-2">
              <Label className="mb-1.5 block">Punto de Referencia (opcional)</Label>
              <Input
                value={form.landmark}
                onChange={(event) =>
                  setDraft((prev) => ({ ...prev, landmark: event.target.value }))
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
                value={form.latitude}
                onChange={(event) =>
                  setDraft((prev) => ({ ...prev, latitude: event.target.value }))
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
                value={form.longitude}
                onChange={(event) =>
                  setDraft((prev) => ({ ...prev, longitude: event.target.value }))
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
                  setDraft((prev) => ({
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
                    setDraft((prev) => ({ ...prev, illuminated: Boolean(checked) }))
                  }
                />
                Iluminado
              </Label>
              <Label className="flex items-center gap-2 text-sm">
                <Checkbox
                  checked={form.digital}
                  onCheckedChange={(checked) =>
                    setDraft((prev) => ({ ...prev, digital: Boolean(checked) }))
                  }
                />
                Digital
              </Label>
              <Label className="flex items-center gap-2 text-sm">
                <Checkbox
                  checked={form.powered}
                  onCheckedChange={(checked) =>
                    setDraft((prev) => ({ ...prev, powered: Boolean(checked) }))
                  }
                />
                Con Energía
              </Label>
              <Label className="flex items-center gap-2 text-sm">
                <Checkbox
                  checked={form.hasPrintService}
                  onCheckedChange={(checked) =>
                    setDraft((prev) => ({ ...prev, hasPrintService: Boolean(checked) }))
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
                  setDraft((prev) => ({ ...prev, installedDate: event.target.value }))
                }
              />
            </div>
            <div>
              <Label className="mb-1.5 block">Fecha de Retiro</Label>
              <Input
                type="date"
                value={form.retiredDate}
                onChange={(event) =>
                  setDraft((prev) => ({ ...prev, retiredDate: event.target.value }))
                }
              />
            </div>
            <div className="md:col-span-2">
              <Label className="mb-1.5 block">Notas</Label>
              <Textarea
                value={form.notes}
                onChange={(event) =>
                  setDraft((prev) => ({ ...prev, notes: event.target.value }))
                }
                rows={3}
              />
            </div>
          </div>

          {error ? (
            <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400">
              {error}
            </div>
          ) : null}

          <div className="flex gap-3">
            <Button type="submit" disabled={!canSave || updateAsset.isPending}>
              {updateAsset.isPending ? "Guardando..." : "Guardar cambios"}
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
