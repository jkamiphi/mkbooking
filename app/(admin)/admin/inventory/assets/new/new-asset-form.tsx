"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
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

type AssetStatus = (typeof statusOptions)[number];

export function NewAssetForm() {
  const router = useRouter();
  const utils = trpc.useUtils();
  const structureTypesQuery = trpc.inventory.structureTypes.list.useQuery();
  const zonesQuery = trpc.inventory.zones.list.useQuery();
  const roadTypesQuery = trpc.inventory.roadTypes.list.useQuery();
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    code: "",
    structureTypeId: "",
    zoneId: "",
    roadTypeId: "",
    address: "",
    landmark: "",
    latitude: "",
    longitude: "",
    illuminated: false,
    digital: false,
    powered: false,
    hasPrintService: false,
    status: "ACTIVE" as AssetStatus,
    notes: "",
    installedDate: "",
    retiredDate: "",
  });

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

          const lat = form.latitude.trim() ? Number(form.latitude) : undefined;
          const lng = form.longitude.trim() ? Number(form.longitude) : undefined;

          if (lat !== undefined && (lat < -90 || lat > 90)) {
            setError("La latitud debe estar entre -90 y 90");
            return;
          }
          if (lng !== undefined && (lng < -180 || lng > 180)) {
            setError("La longitud debe estar entre -180 y 180");
            return;
          }

          createAsset.mutate({
            code: form.code.trim(),
            structureTypeId: form.structureTypeId,
            zoneId: form.zoneId,
            roadTypeId: form.roadTypeId || undefined,
            address: form.address.trim(),
            landmark: form.landmark.trim() || undefined,
            latitude: lat,
            longitude: lng,
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
          });
        }}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
            <Label className="mb-1.5 block">Latitud (-90 a 90)</Label>
            <Input
              type="number"
              step="0.000001"
              min="-90"
              max="90"
              placeholder="ej. 8.9824"
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
              placeholder="ej. -79.5199"
              value={form.longitude}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, longitude: event.target.value }))
              }
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
        </div>

        {error && (
          <div className="rounded-md bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-3 text-sm text-red-700 dark:text-red-400">
            {error}
          </div>
        )}

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
