"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  AlertTriangle,
  Copy,
  ExternalLink,
  Loader2,
  MoreHorizontal,
  Pencil,
  RotateCcw,
} from "lucide-react";
import {
  countActiveFilters,
  parseFilterState,
  serializeFilterState,
  toSummaryChips,
} from "@/lib/navigation/filter-state";
import {
  FilterSheetPanel,
  FilterSheetSection,
  FilterSheetToolbar,
  FilterSheetTriggerButton,
} from "@/components/ui/filter-sheet";
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
import { SelectNative } from "@/components/ui/select-native";
import { Sheet, SheetTrigger } from "@/components/ui/sheet";
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
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const parsedFilters = parseFilterState(
    searchParams,
    ["search", "status", "structureTypeId", "zoneId"] as const,
  );
  const appliedFilters = {
    search: parsedFilters.search || "",
    status: (parsedFilters.status as AssetStatus | "" | undefined) || "",
    structureTypeId: parsedFilters.structureTypeId || "",
    zoneId: parsedFilters.zoneId || "",
  };
  const utils = trpc.useUtils();
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);
  const [draftFilters, setDraftFilters] = useState(appliedFilters);
  const [page, setPage] = useState(0);
  const [updatingAssetId, setUpdatingAssetId] = useState<string | null>(null);

  const structureTypesQuery = trpc.inventory.structureTypes.list.useQuery();
  const zonesQuery = trpc.inventory.zones.list.useQuery();

  const assetsQuery = trpc.inventory.assets.list.useQuery(
    {
      search: appliedFilters.search.trim() || undefined,
      status: (appliedFilters.status || undefined) as AssetStatus | undefined,
      structureTypeId: appliedFilters.structureTypeId || undefined,
      zoneId: appliedFilters.zoneId || undefined,
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

  const rangeLabel = useMemo(() => {
    if (total === 0) return "0 resultados";
    const start = page * PAGE_SIZE + 1;
    const end = Math.min((page + 1) * PAGE_SIZE, total);
    return `Mostrando ${start}-${end} de ${total}`;
  }, [page, total]);

  function navigateWithFilters(nextFilters: typeof appliedFilters) {
    const params = serializeFilterState({
      search: nextFilters.search.trim() || undefined,
      status: nextFilters.status || undefined,
      structureTypeId: nextFilters.structureTypeId || undefined,
      zoneId: nextFilters.zoneId || undefined,
    });
    const nextUrl = params.toString() ? `${pathname}?${params.toString()}` : pathname;
    router.push(nextUrl);
  }

  function applyFilters() {
    setPage(0);
    navigateWithFilters(draftFilters);
    setIsFiltersOpen(false);
  }

  function clearFilters() {
    setDraftFilters({
      search: "",
      status: "",
      structureTypeId: "",
      zoneId: "",
    });
    setPage(0);
    router.push(pathname);
    setIsFiltersOpen(false);
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

  const activeCount = countActiveFilters({
    search: appliedFilters.search || undefined,
    status: appliedFilters.status || undefined,
    structureTypeId: appliedFilters.structureTypeId || undefined,
    zoneId: appliedFilters.zoneId || undefined,
  });

  const summaryChips = toSummaryChips(appliedFilters, [
        {
          key: "search",
          isActive: (state) => state.search.trim().length > 0,
          getLabel: (state) => `Buscar: ${state.search}`,
        },
        {
          key: "status",
          isActive: (state) => Boolean(state.status),
          getLabel: (state) => `Estado: ${statusLabels[state.status as AssetStatus]}`,
        },
        {
          key: "structureTypeId",
          isActive: (state) => Boolean(state.structureTypeId),
          getLabel: (state) =>
            `Estructura: ${structureTypesQuery.data?.find((type) => type.id === state.structureTypeId)?.name ?? "Tipo"}`,
        },
        {
          key: "zoneId",
          isActive: (state) => Boolean(state.zoneId),
          getLabel: (state) => {
            const zone = zonesQuery.data?.find((item) => item.id === state.zoneId);
            return `Zona: ${zone ? `${zone.province.name} - ${zone.name}` : "Zona"}`;
          },
        },
      ]).map((chip) => ({
    ...chip,
    onRemove: () => {
      setPage(0);
      navigateWithFilters({
        ...appliedFilters,
        [chip.key]: "",
      });
    },
  }));

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <Sheet
          open={isFiltersOpen}
          onOpenChange={(open) => {
            if (open) {
              setDraftFilters(appliedFilters);
              setIsFiltersOpen(true);
              return;
            }
            setIsFiltersOpen(false);
          }}
        >
          <FilterSheetToolbar
            summaryChips={summaryChips}
            onClearAll={activeCount > 0 ? clearFilters : undefined}
          >
            <SheetTrigger asChild>
              <FilterSheetTriggerButton activeCount={activeCount} />
            </SheetTrigger>
          </FilterSheetToolbar>

          <FilterSheetPanel
            title="Filtrar activos"
            description="Busca y segmenta por estado, estructura y zona."
            onApply={applyFilters}
            onClear={clearFilters}
          >
            <FilterSheetSection title="Búsqueda" description="Código, dirección o referencia.">
              <input
                value={draftFilters.search}
                onChange={(event) =>
                  setDraftFilters((current) => ({
                    ...current,
                    search: event.target.value,
                  }))
                }
                placeholder="Código, dirección o referencia"
                className="h-10 w-full rounded-md border border-neutral-200 px-3 text-sm outline-none transition focus:border-[#0359A8]"
              />
            </FilterSheetSection>

            <FilterSheetSection title="Estado">
              <SelectNative
                value={draftFilters.status}
                onChange={(event) =>
                  setDraftFilters((current) => ({
                    ...current,
                    status: event.target.value as AssetStatus | "",
                  }))
                }
              >
                <option value="">Todos los estados</option>
                {statusOptions.map((option) => (
                  <option key={option} value={option}>
                    {statusLabels[option]}
                  </option>
                ))}
              </SelectNative>
            </FilterSheetSection>

            <FilterSheetSection title="Tipo de estructura">
              <SelectNative
                value={draftFilters.structureTypeId}
                onChange={(event) =>
                  setDraftFilters((current) => ({
                    ...current,
                    structureTypeId: event.target.value,
                  }))
                }
              >
                <option value="">Todos los tipos de estructura</option>
                {structureTypesQuery.data?.map((type) => (
                  <option key={type.id} value={type.id}>
                    {type.name}
                  </option>
                ))}
              </SelectNative>
            </FilterSheetSection>

            <FilterSheetSection title="Zona">
              <SelectNative
                value={draftFilters.zoneId}
                onChange={(event) =>
                  setDraftFilters((current) => ({
                    ...current,
                    zoneId: event.target.value,
                  }))
                }
              >
                <option value="">Todas las zonas</option>
                {zonesQuery.data?.map((zone) => (
                  <option key={zone.id} value={zone.id}>
                    {zone.province.name} - {zone.name}
                  </option>
                ))}
              </SelectNative>
            </FilterSheetSection>
          </FilterSheetPanel>
        </Sheet>

        <Button asChild className="w-full shrink-0 sm:w-auto">
          <Link href="/admin/inventory/assets/new">Nuevo Activo</Link>
        </Button>
      </div>

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
