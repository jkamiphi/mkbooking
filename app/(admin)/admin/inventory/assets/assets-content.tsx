"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Copy,
  ExternalLink,
  Loader2,
  MoreHorizontal,
  Pencil,
  RotateCcw,
  Search,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SelectNative } from "@/components/ui/select-native";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";

const statusOptions = ["ACTIVE", "INACTIVE", "MAINTENANCE", "RETIRED"] as const;
const statusLabels: Record<(typeof statusOptions)[number], string> = {
  ACTIVE: "ACTIVO",
  INACTIVE: "INACTIVO",
  MAINTENANCE: "MANTENIMIENTO",
  RETIRED: "RETIRADO",
};

const PAGE_SIZE = 25;
type AssetStatus = (typeof statusOptions)[number];

function toNumber(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string") {
    const parsed = Number(value.trim().replace(",", "."));
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }
  if (
    value &&
    typeof value === "object" &&
    "toString" in value &&
    typeof value.toString === "function"
  ) {
    const parsed = Number(value.toString());
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }
  return null;
}

function getGoogleMapsLink(latitude: unknown, longitude: unknown) {
  const lat = toNumber(latitude);
  const lng = toNumber(longitude);
  if (lat === null || lng === null) {
    return null;
  }
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${lat},${lng}`)}`;
}

async function copyToClipboard(text: string) {
  if (typeof navigator === "undefined" || !navigator.clipboard?.writeText) {
    return false;
  }
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

export function AssetsContent() {
  const utils = trpc.useUtils();
  const [searchInput, setSearchInput] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [status, setStatus] = useState<AssetStatus | "">("");
  const [structureTypeId, setStructureTypeId] = useState("");
  const [zoneId, setZoneId] = useState("");
  const [page, setPage] = useState(0);
  const [updatingAssetId, setUpdatingAssetId] = useState<string | null>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedSearch(searchInput.trim());
      setPage(0);
    }, 300);
    return () => window.clearTimeout(timer);
  }, [searchInput]);

  const structureTypesQuery = trpc.inventory.structureTypes.list.useQuery();
  const zonesQuery = trpc.inventory.zones.list.useQuery();

  const assetsQuery = trpc.inventory.assets.list.useQuery(
    {
      search: debouncedSearch || undefined,
      status: status || undefined,
      structureTypeId: structureTypeId || undefined,
      zoneId: zoneId || undefined,
      skip: page * PAGE_SIZE,
      take: PAGE_SIZE,
    },
    {
      placeholderData: (previousData) => previousData,
    }
  );

  const updateAssetStatusMutation = trpc.inventory.assets.update.useMutation({
    onSettled: () => {
      setUpdatingAssetId(null);
    },
  });

  const assets = assetsQuery.data?.assets ?? [];
  const total = assetsQuery.data?.total ?? 0;
  const hasMore = assetsQuery.data?.hasMore ?? false;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const hasPrevious = page > 0;
  const hasFilters =
    searchInput.length > 0 || status || structureTypeId || zoneId;

  const rangeLabel = useMemo(() => {
    if (total === 0) return "0 resultados";
    const start = page * PAGE_SIZE + 1;
    const end = Math.min((page + 1) * PAGE_SIZE, total);
    return `Mostrando ${start}-${end} de ${total}`;
  }, [page, total]);

  function clearFilters() {
    setSearchInput("");
    setDebouncedSearch("");
    setStatus("");
    setStructureTypeId("");
    setZoneId("");
    setPage(0);
  }

  async function handleCopyAssetCode(code: string) {
    const hasCopied = await copyToClipboard(code);
    if (hasCopied) {
      toast.success(`Código ${code} copiado al portapapeles.`);
      return;
    }
    toast.error("No se pudo copiar el código. Intenta nuevamente.");
  }

  function changeAssetStatus(
    assetId: string,
    assetCode: string,
    nextStatus: AssetStatus
  ) {
    setUpdatingAssetId(assetId);
    updateAssetStatusMutation.mutate(
      {
        id: assetId,
        status: nextStatus,
      },
      {
        onSuccess: async () => {
          await utils.inventory.assets.list.invalidate();
          toast.success(
            `${assetCode} actualizado a ${statusLabels[nextStatus].toLowerCase()}.`
          );
        },
        onError: () => {
          toast.error(`No se pudo actualizar el estado de ${assetCode}.`);
        },
      }
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <CardTitle>Filtros de activos</CardTitle>
            <p className="text-sm text-muted-foreground">
              Busca y segmenta por estado, estructura y zona.
            </p>
          </div>
          <Button asChild className="w-full shrink-0 sm:w-auto">
            <Link href="/admin/inventory/assets/new">Nuevo Activo</Link>
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
            <div className="space-y-1.5">
              <Label htmlFor="asset-search">Buscar</Label>
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="asset-search"
                  value={searchInput}
                  onChange={(event) => setSearchInput(event.target.value)}
                  placeholder="Código, dirección o referencia"
                  className="pl-9"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="asset-status">Estado</Label>
              <SelectNative
                id="asset-status"
                value={status}
                onChange={(event) => {
                  setStatus(event.target.value as AssetStatus | "");
                  setPage(0);
                }}
              >
                <option value="">Todos los estados</option>
                {statusOptions.map((option) => (
                  <option key={option} value={option}>
                    {statusLabels[option]}
                  </option>
                ))}
              </SelectNative>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="asset-structure-type">Tipo de estructura</Label>
              <SelectNative
                id="asset-structure-type"
                value={structureTypeId}
                onChange={(event) => {
                  setStructureTypeId(event.target.value);
                  setPage(0);
                }}
              >
                <option value="">Todos los tipos de estructura</option>
                {structureTypesQuery.data?.map((type) => (
                  <option key={type.id} value={type.id}>
                    {type.name}
                  </option>
                ))}
              </SelectNative>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="asset-zone">Zona</Label>
              <SelectNative
                id="asset-zone"
                value={zoneId}
                onChange={(event) => {
                  setZoneId(event.target.value);
                  setPage(0);
                }}
              >
                <option value="">Todas las zonas</option>
                {zonesQuery.data?.map((zone) => (
                  <option key={zone.id} value={zone.id}>
                    {zone.province.name} - {zone.name}
                  </option>
                ))}
              </SelectNative>
            </div>
          </div>

          {hasFilters ? (
            <div className="flex justify-end border-t pt-4">
              <Button variant="outline" size="sm" onClick={clearFilters}>
                <X className="mr-2 h-4 w-4" />
                Limpiar filtros
              </Button>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Card className="overflow-hidden">
        <CardHeader className="flex flex-row items-center justify-between gap-3">
          <CardTitle>Lista de activos</CardTitle>
          <p className="text-sm text-muted-foreground">{rangeLabel}</p>
        </CardHeader>
        <CardContent className="space-y-4">
          {assetsQuery.error ? (
            <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-300">
              <div className="flex items-start gap-2">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                <div className="space-y-2">
                  <p>No se pudo cargar el listado de activos.</p>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => void assetsQuery.refetch()}
                    className="border-red-300 text-red-700 hover:bg-red-100 dark:border-red-800 dark:text-red-300 dark:hover:bg-red-900/40"
                  >
                    <RotateCcw className="mr-2 h-4 w-4" />
                    Reintentar
                  </Button>
                </div>
              </div>
            </div>
          ) : null}

          <Table>
            <TableHeader className="bg-muted/40">
              <TableRow>
                <TableHead>Código</TableHead>
                <TableHead>Estructura</TableHead>
                <TableHead>Zona</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Digital</TableHead>
                <TableHead>Iluminado</TableHead>
                <TableHead>Caras</TableHead>
                <TableHead className="w-[72px] text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {assetsQuery.isLoading
                ? [...Array(6)].map((_, index) => (
                    <TableRow key={`asset-skeleton-${index}`}>
                      <TableCell colSpan={8}>
                        <Skeleton className="h-5 w-full" />
                      </TableCell>
                    </TableRow>
                  ))
                : null}

              {!assetsQuery.isLoading && assets.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="py-6 text-center text-muted-foreground">
                    No se encontraron activos.
                  </TableCell>
                </TableRow>
              ) : null}

              {!assetsQuery.isLoading
                ? assets.map((asset) => {
                    const mapUrl = getGoogleMapsLink(asset.latitude, asset.longitude);
                    const isUpdating = updatingAssetId === asset.id;
                    return (
                      <TableRow key={asset.id}>
                        <TableCell className="font-medium">{asset.code}</TableCell>
                        <TableCell className="text-muted-foreground">
                          {asset.structureType.name}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {asset.zone.province.name} - {asset.zone.name}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {statusLabels[asset.status as AssetStatus] ?? asset.status}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {asset.digital ? "Sí" : "No"}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {asset.illuminated ? "Sí" : "No"}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {asset._count.faces}
                        </TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon-sm"
                                aria-label={`Acciones para el activo ${asset.code}`}
                              >
                                {isUpdating ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <MoreHorizontal className="h-4 w-4" />
                                )}
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-56">
                              <DropdownMenuLabel>{asset.code}</DropdownMenuLabel>
                              <DropdownMenuItem asChild>
                                <Link href={`/admin/inventory/assets/${asset.id}/edit`}>
                                  <Pencil className="h-4 w-4" />
                                  Editar activo
                                </Link>
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onSelect={(event) => {
                                  event.preventDefault();
                                  void handleCopyAssetCode(asset.code);
                                }}
                              >
                                <Copy className="h-4 w-4" />
                                Copiar código
                              </DropdownMenuItem>
                              {mapUrl ? (
                                <DropdownMenuItem asChild>
                                  <a href={mapUrl} target="_blank" rel="noreferrer">
                                    <ExternalLink className="h-4 w-4" />
                                    Abrir en Google Maps
                                  </a>
                                </DropdownMenuItem>
                              ) : (
                                <DropdownMenuItem disabled>
                                  <ExternalLink className="h-4 w-4" />
                                  Sin coordenadas
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuItem asChild>
                                <Link href={`/admin/inventory/faces/new?assetId=${asset.id}`}>
                                  Crear cara
                                </Link>
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuLabel>Cambiar estado</DropdownMenuLabel>
                              {statusOptions.map((option) => (
                                <DropdownMenuItem
                                  key={`${asset.id}-${option}`}
                                  disabled={isUpdating || option === asset.status}
                                  onSelect={(event) => {
                                    event.preventDefault();
                                    changeAssetStatus(asset.id, asset.code, option);
                                  }}
                                >
                                  {statusLabels[option]}
                                </DropdownMenuItem>
                              ))}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    );
                  })
                : null}
            </TableBody>
          </Table>

          {!assetsQuery.error && total > 0 ? (
            <div className="flex flex-col gap-3 border-t pt-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-muted-foreground">
                Página {page + 1} de {totalPages}
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((previous) => Math.max(0, previous - 1))}
                  disabled={!hasPrevious || assetsQuery.isFetching}
                >
                  Anterior
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((previous) => previous + 1)}
                  disabled={!hasMore || assetsQuery.isFetching}
                >
                  Siguiente
                </Button>
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
