"use client";

import { useMemo, useState } from "react";
import {
  RefreshCw,
  Settings2,
  MapPinned,
  ChevronLeft,
  ChevronRight,
  Search,
} from "lucide-react";
import { trpc } from "@/lib/trpc/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { SelectNative } from "@/components/ui/select-native";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";

interface InstallerConfigDraft {
  isEnabled: boolean;
  maxActiveWorkOrders: number;
  notes: string;
}

const PAGE_SIZE = 20;

export function InstallersControlTable() {
  const utils = trpc.useUtils();
  const installersQuery = trpc.operations.installers.list.useQuery();
  const zonesQuery = trpc.inventory.zones.publicList.useQuery();

  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState<"ALL" | "ACTIVE" | "INACTIVE">("ALL");
  const [enabledFilter, setEnabledFilter] = useState<"ALL" | "ENABLED" | "DISABLED">("ALL");
  const [page, setPage] = useState(0);

  const [configInstallerId, setConfigInstallerId] = useState<string | null>(null);
  const [configDraft, setConfigDraft] = useState<InstallerConfigDraft>({
    isEnabled: false,
    maxActiveWorkOrders: 5,
    notes: "",
  });

  const [coverageInstallerId, setCoverageInstallerId] = useState<string | null>(null);
  const [coverageDraft, setCoverageDraft] = useState<string[]>([]);
  const [coverageSearch, setCoverageSearch] = useState("");

  const upsertConfig = trpc.operations.installers.upsertConfig.useMutation({
    onSuccess: async () => {
      await Promise.all([
        installersQuery.refetch(),
        utils.operations.workOrders.list.invalidate(),
      ]);
      setConfigInstallerId(null);
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
      setCoverageInstallerId(null);
      toast.success("Cobertura de instalador actualizada.");
    },
    onError: (error) => {
      toast.error("No se pudo actualizar cobertura", {
        description: error.message,
      });
    },
  });

  const installers = useMemo(() => installersQuery.data ?? [], [installersQuery.data]);
  const zones = useMemo(() => zonesQuery.data ?? [], [zonesQuery.data]);
  const isLoading = installersQuery.isLoading || installersQuery.isRefetching;

  const selectedConfigInstaller = useMemo(
    () => installers.find((installer) => installer.id === configInstallerId) ?? null,
    [configInstallerId, installers]
  );
  const selectedCoverageInstaller = useMemo(
    () => installers.find((installer) => installer.id === coverageInstallerId) ?? null,
    [coverageInstallerId, installers]
  );

  const filteredInstallers = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();
    return installers.filter((installer) => {
      const name = (installer.user.name || "").toLowerCase();
      const email = installer.user.email.toLowerCase();
      const matchesSearch =
        normalizedSearch.length === 0 ||
        name.includes(normalizedSearch) ||
        email.includes(normalizedSearch);
      const matchesActive =
        activeFilter === "ALL" ||
        (activeFilter === "ACTIVE" && installer.isActive) ||
        (activeFilter === "INACTIVE" && !installer.isActive);
      const matchesEnabled =
        enabledFilter === "ALL" ||
        (enabledFilter === "ENABLED" && installer.control.isEnabled) ||
        (enabledFilter === "DISABLED" && !installer.control.isEnabled);

      return matchesSearch && matchesActive && matchesEnabled;
    });
  }, [activeFilter, enabledFilter, installers, search]);

  const totalPages = Math.max(1, Math.ceil(filteredInstallers.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages - 1);
  const paginatedInstallers = useMemo(() => {
    const start = safePage * PAGE_SIZE;
    return filteredInstallers.slice(start, start + PAGE_SIZE);
  }, [filteredInstallers, safePage]);

  const filteredCoverageZones = useMemo(() => {
    const normalized = coverageSearch.trim().toLowerCase();
    return zones.filter((zone) => {
      if (!normalized) return true;
      const label = `${zone.province.name} ${zone.name}`.toLowerCase();
      return label.includes(normalized);
    });
  }, [coverageSearch, zones]);

  const stats = useMemo(() => {
    const total = installers.length;
    const active = installers.filter((installer) => installer.isActive).length;
    const enabled = installers.filter((installer) => installer.control.isEnabled).length;
    const withCoverage = installers.filter(
      (installer) => installer.installerCoverageZones.length > 0
    ).length;
    return { total, active, enabled, withCoverage };
  }, [installers]);

  function openConfigDialog(installerId: string) {
    const installer = installers.find((item) => item.id === installerId);
    if (!installer) return;

    setConfigDraft({
      isEnabled: installer.control.isEnabled,
      maxActiveWorkOrders: installer.control.maxActiveWorkOrders,
      notes: installer.control.notes ?? "",
    });
    setConfigInstallerId(installer.id);
  }

  function openCoverageDialog(installerId: string) {
    const installer = installers.find((item) => item.id === installerId);
    if (!installer) return;

    setCoverageDraft(installer.installerCoverageZones.map((item) => item.zoneId));
    setCoverageSearch("");
    setCoverageInstallerId(installer.id);
  }

  function toggleCoverageZone(zoneId: string, checked: boolean) {
    setCoverageDraft((prev) => {
      if (checked) {
        if (prev.includes(zoneId)) return prev;
        return [...prev, zoneId];
      }
      return prev.filter((id) => id !== zoneId);
    });
  }

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
    <>
      <div className="space-y-4">
        <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard label="Instaladores" value={stats.total} />
          <StatCard label="Activos" value={stats.active} />
          <StatCard label="Habilitados" value={stats.enabled} />
          <StatCard label="Con cobertura" value={stats.withCoverage} />
        </div>

        <div className="grid gap-3 rounded-xl border border-neutral-200 bg-white p-4 md:grid-cols-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-neutral-600">Buscar</label>
            <div className="relative">
              <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-neutral-400" />
              <Input
                className="pl-8"
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value);
                  setPage(0);
                }}
                placeholder="Nombre o email"
              />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-neutral-600">Estado cuenta</label>
            <SelectNative
              value={activeFilter}
              onChange={(event) => {
                setActiveFilter(event.target.value as "ALL" | "ACTIVE" | "INACTIVE");
                setPage(0);
              }}
            >
              <option value="ALL">Todos</option>
              <option value="ACTIVE">Activos</option>
              <option value="INACTIVE">Inactivos</option>
            </SelectNative>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-neutral-600">Estado operativo</label>
            <SelectNative
              value={enabledFilter}
              onChange={(event) => {
                setEnabledFilter(event.target.value as "ALL" | "ENABLED" | "DISABLED");
                setPage(0);
              }}
            >
              <option value="ALL">Todos</option>
              <option value="ENABLED">Habilitados</option>
              <option value="DISABLED">Deshabilitados</option>
            </SelectNative>
          </div>
        </div>

        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Instalador</TableHead>
                <TableHead>Cuenta</TableHead>
                <TableHead>Operativa</TableHead>
                <TableHead>Carga</TableHead>
                <TableHead>Cobertura</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedInstallers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="py-8 text-center text-sm text-neutral-500">
                    No hay resultados con los filtros actuales.
                  </TableCell>
                </TableRow>
              ) : (
                paginatedInstallers.map((installer) => (
                  <TableRow key={installer.id}>
                    <TableCell>
                      <div className="text-sm font-medium text-neutral-900">
                        {installer.user.name || "Sin nombre"}
                      </div>
                      <div className="text-xs text-neutral-500">{installer.user.email}</div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={installer.isActive ? "success" : "destructive"}>
                        {installer.isActive ? "Activo" : "Inactivo"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap items-center gap-1.5">
                        <Badge variant={installer.control.isEnabled ? "info" : "secondary"}>
                          {installer.control.isEnabled ? "Habilitado" : "Deshabilitado"}
                        </Badge>
                        <Badge variant="warning">
                          Capacidad {installer.control.maxActiveWorkOrders}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-neutral-700">
                        {installer.activeLoad} / {installer.control.maxActiveWorkOrders}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-neutral-700">
                        {installer.installerCoverageZones.length} zona(s)
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="inline-flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openConfigDialog(installer.id)}
                        >
                          <Settings2 className="mr-1.5 h-4 w-4" />
                          Config
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openCoverageDialog(installer.id)}
                        >
                          <MapPinned className="mr-1.5 h-4 w-4" />
                          Cobertura
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </Card>

        <div className="flex items-center justify-between rounded-xl border border-neutral-200 bg-white px-4 py-3">
          <p className="text-sm text-neutral-600">
            Mostrando {paginatedInstallers.length === 0 ? 0 : safePage * PAGE_SIZE + 1}-
            {Math.min((safePage + 1) * PAGE_SIZE, filteredInstallers.length)} de{" "}
            {filteredInstallers.length}
          </p>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setPage((prev) => Math.max(0, prev - 1))}
              disabled={safePage === 0}
            >
              <ChevronLeft className="mr-1 h-4 w-4" />
              Anterior
            </Button>
            <span className="text-xs text-neutral-600">
              Página {safePage + 1} de {totalPages}
            </span>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setPage((prev) => Math.min(totalPages - 1, prev + 1))}
              disabled={safePage >= totalPages - 1}
            >
              Siguiente
              <ChevronRight className="ml-1 h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      <Dialog open={Boolean(configInstallerId)} onOpenChange={(open) => !open && setConfigInstallerId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Configurar instalador</DialogTitle>
            <DialogDescription>
              {selectedConfigInstaller
                ? `${selectedConfigInstaller.user.name || "Sin nombre"} · ${selectedConfigInstaller.user.email}`
                : "Actualiza habilitación, capacidad y notas operativas."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <label className="flex items-center gap-2 rounded-md border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-700">
              <input
                type="checkbox"
                checked={configDraft.isEnabled}
                onChange={(event) =>
                  setConfigDraft((prev) => ({
                    ...prev,
                    isEnabled: event.target.checked,
                  }))
                }
              />
              Habilitado para autoasignación
            </label>

            <div>
              <Label className="mb-1 block">Capacidad máxima</Label>
              <Input
                type="number"
                min={1}
                max={100}
                value={configDraft.maxActiveWorkOrders}
                onChange={(event) =>
                  setConfigDraft((prev) => ({
                    ...prev,
                    maxActiveWorkOrders: Math.max(1, Number(event.target.value || 1)),
                  }))
                }
              />
            </div>

            <div>
              <Label htmlFor="installer-notes" className="mb-1 block">
                Notas
              </Label>
              <Textarea
                id="installer-notes"
                rows={4}
                value={configDraft.notes}
                onChange={(event) =>
                  setConfigDraft((prev) => ({
                    ...prev,
                    notes: event.target.value,
                  }))
                }
                placeholder="Opcional"
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setConfigInstallerId(null)}>
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={() => {
                if (!configInstallerId) return;
                upsertConfig.mutate({
                  installerId: configInstallerId,
                  isEnabled: configDraft.isEnabled,
                  maxActiveWorkOrders: configDraft.maxActiveWorkOrders,
                  notes: configDraft.notes.trim() || null,
                });
              }}
              disabled={upsertConfig.isPending || !configInstallerId}
            >
              Guardar configuración
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(coverageInstallerId)}
        onOpenChange={(open) => !open && setCoverageInstallerId(null)}
      >
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Editar cobertura</DialogTitle>
            <DialogDescription>
              {selectedCoverageInstaller
                ? `${selectedCoverageInstaller.user.name || "Sin nombre"} · ${selectedCoverageInstaller.user.email}`
                : "Selecciona las zonas que cubre el instalador."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <div>
              <Label className="mb-1 block">Buscar zona</Label>
              <Input
                value={coverageSearch}
                onChange={(event) => setCoverageSearch(event.target.value)}
                placeholder="Provincia o zona"
              />
            </div>

            <div className="rounded-md border border-neutral-200">
              <div className="flex items-center justify-between border-b border-neutral-100 px-3 py-2 text-xs text-neutral-500">
                <span>Zonas filtradas: {filteredCoverageZones.length}</span>
                <span>Seleccionadas: {coverageDraft.length}</span>
              </div>
              <div className="max-h-72 overflow-y-auto p-2">
                {filteredCoverageZones.length === 0 ? (
                  <p className="px-2 py-3 text-sm text-neutral-500">
                    No hay zonas para el criterio de búsqueda.
                  </p>
                ) : (
                  <div className="space-y-1">
                    {filteredCoverageZones.map((zone) => {
                      const checked = coverageDraft.includes(zone.id);
                      return (
                        <label
                          key={zone.id}
                          className="flex cursor-pointer items-center justify-between rounded-md border border-neutral-100 px-3 py-2 text-sm hover:bg-neutral-50"
                        >
                          <span className="text-neutral-700">
                            {zone.province.name} - {zone.name}
                          </span>
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={(event) =>
                              toggleCoverageZone(zone.id, event.target.checked)
                            }
                          />
                        </label>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setCoverageInstallerId(null);
                setCoverageSearch("");
              }}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={() => {
                if (!coverageInstallerId) return;
                updateCoverage.mutate({
                  installerId: coverageInstallerId,
                  zoneIds: coverageDraft,
                });
              }}
              disabled={updateCoverage.isPending || !coverageInstallerId}
            >
              Guardar cobertura
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <Card className="p-3">
      <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">{label}</p>
      <p className="mt-1 text-xl font-semibold text-neutral-900">{value}</p>
    </Card>
  );
}
