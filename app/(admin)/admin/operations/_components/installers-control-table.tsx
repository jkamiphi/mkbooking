"use client";

import { useMemo, useState } from "react";
import { RefreshCw } from "lucide-react";
import { trpc } from "@/lib/trpc/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

interface InstallerConfigDraft {
  isEnabled: boolean;
  maxActiveWorkOrders: number;
  notes: string;
}

const EMPTY_ZONES: Array<{
  id: string;
  name: string;
  province: { id: string; name: string };
}> = [];

export function InstallersControlTable() {
  const utils = trpc.useUtils();
  const installersQuery = trpc.operations.installers.list.useQuery();
  const zonesQuery = trpc.inventory.zones.publicList.useQuery();

  const [configDrafts, setConfigDrafts] = useState<Record<string, InstallerConfigDraft>>({});
  const [coverageDrafts, setCoverageDrafts] = useState<Record<string, string[]>>({});

  const upsertConfig = trpc.operations.installers.upsertConfig.useMutation({
    onSuccess: async () => {
      await Promise.all([
        installersQuery.refetch(),
        utils.operations.workOrders.list.invalidate(),
      ]);
      toast.success("Configuración de instalador actualizada.");
    },
    onError: (error) => {
      toast.error("No se pudo actualizar configuración", {
        description: error.message,
      });
    },
  });

  const updateCoverage = trpc.operations.installers.updateCoverage.useMutation({
    onSuccess: async () => {
      await Promise.all([
        installersQuery.refetch(),
        utils.operations.workOrders.list.invalidate(),
      ]);
      toast.success("Cobertura de instalador actualizada.");
    },
    onError: (error) => {
      toast.error("No se pudo actualizar cobertura", {
        description: error.message,
      });
    },
  });

  const zones = zonesQuery.data ?? EMPTY_ZONES;
  const zonesById = useMemo(
    () => new Map(zones.map((zone) => [zone.id, zone])),
    [zones]
  );

  const installers = installersQuery.data ?? [];
  const isLoading = installersQuery.isLoading || installersQuery.isRefetching;

  if (isLoading) {
    return (
      <Card>
        <div className="flex h-40 items-center justify-center">
          <RefreshCw className="h-5 w-5 animate-spin text-neutral-400" />
        </div>
      </Card>
    );
  }

  if (installers.length === 0) {
    return (
      <Card>
        <div className="p-8 text-center text-sm text-neutral-500">
          No hay usuarios con rol instalador.
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {installers.map((installer) => {
        const configDraft = configDrafts[installer.id] ?? {
          isEnabled: installer.control.isEnabled,
          maxActiveWorkOrders: installer.control.maxActiveWorkOrders,
          notes: installer.control.notes ?? "",
        };
        const coverageDraft =
          coverageDrafts[installer.id] ??
          installer.installerCoverageZones.map((item) => item.zoneId);

        return (
          <Card key={installer.id} className="p-4">
            <div className="space-y-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h3 className="text-sm font-semibold text-neutral-900">
                    {installer.user.name || "Sin nombre"}
                  </h3>
                  <p className="text-xs text-neutral-500">{installer.user.email}</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant={installer.isActive ? "success" : "destructive"}>
                    {installer.isActive ? "Activo" : "Inactivo"}
                  </Badge>
                  <Badge variant={installer.control.isEnabled ? "info" : "secondary"}>
                    {installer.control.isEnabled ? "Habilitado" : "Deshabilitado"}
                  </Badge>
                  <Badge variant="warning">Carga activa: {installer.activeLoad}</Badge>
                </div>
              </div>

              <div className="grid gap-3 md:grid-cols-4">
                <label className="flex items-center gap-2 rounded-md border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-700">
                  <input
                    type="checkbox"
                    checked={Boolean(configDraft?.isEnabled)}
                    onChange={(event) =>
                      setConfigDrafts((prev) => ({
                        ...prev,
                        [installer.id]: {
                          ...(prev[installer.id] ?? {
                            isEnabled: false,
                            maxActiveWorkOrders: 5,
                            notes: "",
                          }),
                          isEnabled: event.target.checked,
                        },
                      }))
                    }
                  />
                  Habilitado
                </label>

                <div>
                  <label className="mb-1 block text-xs font-medium text-neutral-600">
                    Capacidad máxima
                  </label>
                  <Input
                    type="number"
                    min={1}
                    max={100}
                    value={configDraft?.maxActiveWorkOrders ?? 5}
                    onChange={(event) =>
                      setConfigDrafts((prev) => ({
                        ...prev,
                        [installer.id]: {
                          ...(prev[installer.id] ?? {
                            isEnabled: false,
                            maxActiveWorkOrders: 5,
                            notes: "",
                          }),
                          maxActiveWorkOrders: Math.max(1, Number(event.target.value || 1)),
                        },
                      }))
                    }
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="mb-1 block text-xs font-medium text-neutral-600">
                    Notas
                  </label>
                  <Input
                    value={configDraft?.notes ?? ""}
                    onChange={(event) =>
                      setConfigDrafts((prev) => ({
                        ...prev,
                        [installer.id]: {
                          ...(prev[installer.id] ?? {
                            isEnabled: false,
                            maxActiveWorkOrders: 5,
                            notes: "",
                          }),
                          notes: event.target.value,
                        },
                      }))
                    }
                    placeholder="Opcional"
                  />
                </div>
              </div>

              <div className="flex justify-end">
                <Button
                  size="sm"
                  onClick={() =>
                    upsertConfig.mutate({
                      installerId: installer.id,
                      isEnabled: configDraft?.isEnabled ?? false,
                      maxActiveWorkOrders: configDraft?.maxActiveWorkOrders ?? 5,
                      notes: (configDraft?.notes ?? "").trim() || null,
                    })
                  }
                  disabled={upsertConfig.isPending}
                >
                  Guardar configuración
                </Button>
              </div>

              <div className="border-t border-neutral-100 pt-4">
                <label className="mb-1 block text-xs font-medium text-neutral-600">
                  Cobertura de zonas
                </label>
                <select
                  multiple
                  className="h-40 w-full rounded-md border border-neutral-200 bg-white px-2 py-1 text-sm"
                  value={coverageDraft}
                  onChange={(event) => {
                    const selected = Array.from(event.target.selectedOptions).map(
                      (option) => option.value
                    );
                    setCoverageDrafts((prev) => ({
                      ...prev,
                      [installer.id]: selected,
                    }));
                  }}
                >
                  {zones.map((zone) => (
                    <option key={zone.id} value={zone.id}>
                      {zone.province.name} - {zone.name}
                    </option>
                  ))}
                </select>
                <p className="mt-2 text-[11px] text-neutral-500">
                  Zonas seleccionadas: {coverageDraft.length}
                </p>

                <div className="mt-2 flex flex-wrap gap-1">
                  {coverageDraft.map((zoneId) => {
                    const zone = zonesById.get(zoneId);
                    return (
                      <Badge key={zoneId} variant="secondary">
                        {zone ? `${zone.province.name} - ${zone.name}` : zoneId}
                      </Badge>
                    );
                  })}
                </div>

                <div className="mt-3 flex justify-end">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      updateCoverage.mutate({
                        installerId: installer.id,
                        zoneIds: coverageDraft,
                      })
                    }
                    disabled={updateCoverage.isPending}
                  >
                    Guardar cobertura
                  </Button>
                </div>
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );
}
