"use client";

import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
const facingLabels: Record<string, string> = {
  TRAFFIC: "TRÁFICO",
  OPPOSITE_TRAFFIC: "TRÁFICO OPUESTO",
};

export function FacesContent() {
  const [assetId, setAssetId] = useState("");
  const [status, setStatus] = useState<string>("");

  const assetsQuery = trpc.inventory.assets.list.useQuery({ take: 100 });
  const facesQuery = trpc.inventory.faces.list.useQuery({
    assetId: assetId || undefined,
    status: status ? (status as (typeof statusOptions)[number]) : undefined,
    take: 100,
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 w-full">
          <SelectNative
            value={assetId}
            onChange={(event) => setAssetId(event.target.value)}
          >
            <option value="">Todos los activos</option>
            {assetsQuery.data?.assets.map((asset) => (
              <option key={asset.id} value={asset.id}>
                {asset.code}
              </option>
            ))}
          </SelectNative>
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
        </div>
        <Button asChild>
          <Link href="/admin/inventory/faces/new">Nueva Cara</Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Lista de caras</CardTitle>
        </CardHeader>
        <CardContent>
        {facesQuery.isLoading ? (
          <div className="text-sm text-muted-foreground">
            Cargando caras...
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Activo</TableHead>
                <TableHead>Cara</TableHead>
                <TableHead>Posición</TableHead>
                <TableHead>Tamaño</TableHead>
                <TableHead>Orientación</TableHead>
                <TableHead>Estado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
                {facesQuery.data?.faces.map((face) => (
                  <TableRow
                    key={face.id}
                  >
                    <TableCell className="font-medium">
                      {face.asset.code}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {face.code}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {face.position?.name ?? "-"}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {String(face.width)} x {String(face.height)}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {facingLabels[face.facing] ?? face.facing}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {statusLabels[face.status as (typeof statusOptions)[number]] ?? face.status}
                    </TableCell>
                  </TableRow>
                ))}
                {!facesQuery.data?.faces.length && (
                  <TableRow>
                    <TableCell
                      colSpan={6}
                      className="py-4 text-center text-muted-foreground"
                    >
                      No se encontraron caras.
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
