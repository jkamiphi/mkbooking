"use client";

import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { SelectNative } from "@/components/ui/select-native";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const statusOptions = ["ACTIVE", "INACTIVE", "MAINTENANCE", "RETIRED"] as const;
const statusLabels: Record<(typeof statusOptions)[number], string> = {
  ACTIVE: "ACTIVO",
  INACTIVE: "INACTIVO",
  MAINTENANCE: "MANTENIMIENTO",
  RETIRED: "RETIRADO",
};

export function AssetsContent() {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<string>("");
  const [structureTypeId, setStructureTypeId] = useState("");
  const [zoneId, setZoneId] = useState("");

  const structureTypesQuery = trpc.inventory.structureTypes.list.useQuery();
  const zonesQuery = trpc.inventory.zones.list.useQuery();

  const assetsQuery = trpc.inventory.assets.list.useQuery({
    search: search.trim() || undefined,
    status: status ? (status as (typeof statusOptions)[number]) : undefined,
    structureTypeId: structureTypeId || undefined,
    zoneId: zoneId || undefined,
    take: 100,
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 w-full">
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Buscar por código o dirección"
          />
          <SelectNative
            value={status}
            onChange={(event) => setStatus(event.target.value)}
          >
            <option value="">Todos los estados</option>
            {statusOptions.map((option) => (
              <option key={option} value={option}>
                {statusLabels[option]}
              </option>
            ))}
          </SelectNative>
          <SelectNative
            value={structureTypeId}
            onChange={(event) => setStructureTypeId(event.target.value)}
          >
            <option value="">Todos los tipos de estructura</option>
            {structureTypesQuery.data?.map((type) => (
              <option key={type.id} value={type.id}>
                {type.name}
              </option>
            ))}
          </SelectNative>
          <SelectNative
            value={zoneId}
            onChange={(event) => setZoneId(event.target.value)}
          >
            <option value="">Todas las zonas</option>
            {zonesQuery.data?.map((zone) => (
              <option key={zone.id} value={zone.id}>
                {zone.province.name} - {zone.name}
              </option>
            ))}
          </SelectNative>
        </div>
        <Button asChild>
          <Link href="/admin/inventory/assets/new">Nuevo Activo</Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Lista de activos</CardTitle>
        </CardHeader>
        <CardContent>
        {assetsQuery.isLoading ? (
          <div className="text-sm text-muted-foreground">
            Cargando activos...
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Código</TableHead>
                <TableHead>Estructura</TableHead>
                <TableHead>Zona</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Digital</TableHead>
                <TableHead>Iluminado</TableHead>
                <TableHead>Caras</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
                {assetsQuery.data?.assets.map((asset) => (
                  <TableRow
                    key={asset.id}
                  >
                    <TableCell className="font-medium">
                      {asset.code}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {asset.structureType.name}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {asset.zone.province.name} - {asset.zone.name}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {statusLabels[asset.status as (typeof statusOptions)[number]] ?? asset.status}
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
                  </TableRow>
                ))}
                {!assetsQuery.data?.assets.length && (
                  <TableRow>
                    <TableCell
                      colSpan={7}
                      className="py-4 text-center text-muted-foreground"
                    >
                      No se encontraron activos.
                    </TableCell>
                  </TableRow>
                )}
            </TableBody>
          </Table>
        )}
        </CardContent>
      </Card>
    </div>
  );
}
