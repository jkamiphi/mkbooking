"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ExternalLink, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
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
import { trpc } from "@/lib/trpc/client";

const PAGE_SIZE = 25;
type OccupancyStatus = "OCUPADO" | "DISPONIBLE";

function formatCurrency(value: number | null, currency: string | null) {
  if (value === null) return "-";
  return new Intl.NumberFormat("es-PA", {
    style: "currency",
    currency: currency || "USD",
    maximumFractionDigits: 2,
  }).format(value);
}

function formatDate(value: Date | string | null) {
  if (!value) return "-";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString("es-PA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}

function formatNumber(value: number | null, decimals = 0) {
  if (value === null) return "-";
  return new Intl.NumberFormat("es-PA", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}

export function AssetsControlContent() {
  const [page, setPage] = useState(0);
  const [filters, setFilters] = useState({
    search: "",
    provinceId: "",
    zoneId: "",
    structureTypeId: "",
    occupancyStatus: "",
  });

  const provincesQuery = trpc.inventory.provinces.list.useQuery();
  const zonesQuery = trpc.inventory.zones.list.useQuery();
  const structureTypesQuery = trpc.inventory.structureTypes.list.useQuery();

  const controlQuery = trpc.inventory.assets.controlList.useQuery(
    {
      search: filters.search.trim() || undefined,
      provinceId: filters.provinceId || undefined,
      zoneId: filters.zoneId || undefined,
      structureTypeId: filters.structureTypeId || undefined,
      occupancyStatus: (filters.occupancyStatus || undefined) as
        | OccupancyStatus
        | undefined,
      skip: page * PAGE_SIZE,
      take: PAGE_SIZE,
    },
    {
      placeholderData: (previousData) => previousData,
    }
  );

  const rows = controlQuery.data?.rows ?? [];
  const total = controlQuery.data?.total ?? 0;
  const hasMore = controlQuery.data?.hasMore ?? false;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const rangeLabel = useMemo(() => {
    if (total === 0) return "0 resultados";
    const start = page * PAGE_SIZE + 1;
    const end = Math.min((page + 1) * PAGE_SIZE, total);
    return `Mostrando ${start}-${end} de ${total}`;
  }, [page, total]);

  function resetFilters() {
    setFilters({
      search: "",
      provinceId: "",
      zoneId: "",
      structureTypeId: "",
      occupancyStatus: "",
    });
    setPage(0);
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Filtros de control</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-3 md:grid-cols-3 xl:grid-cols-6">
          <Input
            placeholder="Buscar por código, dirección, municipio..."
            value={filters.search}
            onChange={(event) => {
              setPage(0);
              setFilters((previous) => ({ ...previous, search: event.target.value }));
            }}
            className="xl:col-span-2"
          />
          <SelectNative
            value={filters.provinceId}
            onChange={(event) => {
              setPage(0);
              setFilters((previous) => ({
                ...previous,
                provinceId: event.target.value,
                zoneId: "",
              }));
            }}
          >
            <option value="">Todas las provincias</option>
            {provincesQuery.data?.map((province) => (
              <option key={province.id} value={province.id}>
                {province.name}
              </option>
            ))}
          </SelectNative>
          <SelectNative
            value={filters.zoneId}
            onChange={(event) => {
              setPage(0);
              setFilters((previous) => ({ ...previous, zoneId: event.target.value }));
            }}
          >
            <option value="">Todas las zonas</option>
            {zonesQuery.data
              ?.filter((zone) => !filters.provinceId || zone.provinceId === filters.provinceId)
              .map((zone) => (
                <option key={zone.id} value={zone.id}>
                  {zone.province.name} - {zone.name}
                </option>
              ))}
          </SelectNative>
          <SelectNative
            value={filters.structureTypeId}
            onChange={(event) => {
              setPage(0);
              setFilters((previous) => ({
                ...previous,
                structureTypeId: event.target.value,
              }));
            }}
          >
            <option value="">Todas las estructuras</option>
            {structureTypesQuery.data?.map((structureType) => (
              <option key={structureType.id} value={structureType.id}>
                {structureType.name}
              </option>
            ))}
          </SelectNative>
          <SelectNative
            value={filters.occupancyStatus}
            onChange={(event) => {
              setPage(0);
              setFilters((previous) => ({
                ...previous,
                occupancyStatus: event.target.value,
              }));
            }}
          >
            <option value="">Estado comercial</option>
            <option value="OCUPADO">Ocupado</option>
            <option value="DISPONIBLE">Disponible</option>
          </SelectNative>
          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={resetFilters}>
              Limpiar
            </Button>
            <Button asChild variant="secondary">
              <Link href="/admin/inventory/faces/new">Nueva cara</Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="overflow-hidden">
        <CardHeader className="flex flex-row items-center justify-between gap-3">
          <CardTitle>Vista de control (por cara)</CardTitle>
          <p className="text-sm text-muted-foreground">{rangeLabel}</p>
        </CardHeader>
        <CardContent className="space-y-4">
          {controlQuery.error ? (
            <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-300">
              <div className="space-y-2">
                <p>No se pudo cargar la tabla de control.</p>
                <Button size="sm" variant="outline" onClick={() => void controlQuery.refetch()}>
                  <RotateCcw className="mr-2 h-4 w-4" />
                  Reintentar
                </Button>
              </div>
            </div>
          ) : null}

          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-muted/40">
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Provincia</TableHead>
                  <TableHead>Sector</TableHead>
                  <TableHead>Estructura</TableHead>
                  <TableHead>Terreno</TableHead>
                  <TableHead>Iluminación</TableHead>
                  <TableHead>Material</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Check-In</TableHead>
                  <TableHead>Check-Out</TableHead>
                  <TableHead>Vence (días)</TableHead>
                  <TableHead>Mensualidad</TableHead>
                  <TableHead>Producción</TableHead>
                  <TableHead>Ancho pie</TableHead>
                  <TableHead>Alto pie</TableHead>
                  <TableHead>Aforo vehicular</TableHead>
                  <TableHead>Aforo personas</TableHead>
                  <TableHead>Impuesto</TableHead>
                  <TableHead>Terraje</TableHead>
                  <TableHead>Gasto luz</TableHead>
                  <TableHead>Últ. mantenimiento</TableHead>
                  <TableHead>Dirección</TableHead>
                  <TableHead>Municipio</TableHead>
                  <TableHead>Maps</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {controlQuery.isLoading
                  ? [...Array(8)].map((_, index) => (
                      <TableRow key={`control-skeleton-${index}`}>
                        <TableCell colSpan={25}>
                          <Skeleton className="h-5 w-full" />
                        </TableCell>
                      </TableRow>
                    ))
                  : null}

                {!controlQuery.isLoading && rows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={25} className="py-6 text-center text-muted-foreground">
                      No se encontraron registros para la vista de control.
                    </TableCell>
                  </TableRow>
                ) : null}

                {!controlQuery.isLoading
                  ? rows.map((row) => (
                      <TableRow key={row.id}>
                        <TableCell className="font-medium">{row.rowCode}</TableCell>
                        <TableCell>{row.province}</TableCell>
                        <TableCell>{row.sector}</TableCell>
                        <TableCell>{row.structureType}</TableCell>
                        <TableCell>{row.terrain || "-"}</TableCell>
                        <TableCell>{row.illuminated ? "Sí" : "No"}</TableCell>
                        <TableCell>{row.materialType || "-"}</TableCell>
                        <TableCell>{row.occupancyStatus}</TableCell>
                        <TableCell>{row.clientName || "-"}</TableCell>
                        <TableCell>{formatDate(row.checkIn)}</TableCell>
                        <TableCell>{formatDate(row.checkOut)}</TableCell>
                        <TableCell>{row.dueInDays ?? "-"}</TableCell>
                        <TableCell>
                          {formatCurrency(row.monthlyAmount, row.monthlyCurrency)}
                        </TableCell>
                        <TableCell>{formatCurrency(row.productionCostMonthly, "USD")}</TableCell>
                        <TableCell>{formatNumber(row.widthFeet, 2)}</TableCell>
                        <TableCell>{formatNumber(row.heightFeet, 2)}</TableCell>
                        <TableCell>{formatNumber(row.vehicleTrafficMonthly, 0)}</TableCell>
                        <TableCell>{formatNumber(row.pedestrianTrafficMonthly, 0)}</TableCell>
                        <TableCell>{formatCurrency(row.assetTaxMonthly, "USD")}</TableCell>
                        <TableCell>{formatCurrency(row.landRentMonthly, "USD")}</TableCell>
                        <TableCell>{formatCurrency(row.electricityCostMonthly, "USD")}</TableCell>
                        <TableCell>{formatDate(row.latestMaintenanceDate)}</TableCell>
                        <TableCell>{row.address}</TableCell>
                        <TableCell>{row.municipality || "-"}</TableCell>
                        <TableCell>
                          {row.mapsUrl ? (
                            <a
                              href={row.mapsUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 text-[#0359A8]"
                            >
                              <ExternalLink className="h-4 w-4" />
                              Abrir
                            </a>
                          ) : (
                            "-"
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  : null}
              </TableBody>
            </Table>
          </div>

          {!controlQuery.error && total > 0 ? (
            <div className="flex flex-col gap-3 border-t pt-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-muted-foreground">
                Página {page + 1} de {totalPages}
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((previous) => Math.max(0, previous - 1))}
                  disabled={page === 0 || controlQuery.isFetching}
                >
                  Anterior
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((previous) => previous + 1)}
                  disabled={!hasMore || controlQuery.isFetching}
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
