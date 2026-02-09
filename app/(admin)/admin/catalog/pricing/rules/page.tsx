"use client";

import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc/client";
import { AdminPageHeader, AdminPageShell } from "@/components/admin/page-shell";
import { Card, CardContent } from "@/components/ui/card";
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

export default function PriceRulesPage() {
  const [faceId, setFaceId] = useState("");
  const [structureTypeId, setStructureTypeId] = useState("");
  const [zoneId, setZoneId] = useState("");
  const [organizationId, setOrganizationId] = useState("");
  const [price, setPrice] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const utils = trpc.useUtils();
  const facesQuery = trpc.inventory.faces.list.useQuery({ take: 100 });
  const structureTypesQuery = trpc.inventory.structureTypes.list.useQuery();
  const zonesQuery = trpc.inventory.zones.list.useQuery();
  const orgsQuery = trpc.organization.list.useQuery({ skip: 0, take: 100 });
  const rulesQuery = trpc.catalog.priceRules.list.useQuery();

  const createRule = trpc.catalog.priceRules.create.useMutation({
    onSuccess: () => {
      utils.catalog.priceRules.list.invalidate();
      setPrice("");
      setStartDate("");
      setEndDate("");
    },
  });

  return (
    <AdminPageShell>
      <AdminPageHeader
        title="Reglas de precio"
        description="Definir precios por cara, tipo de estructura, zona y cliente."
      />
      <Card>
        <CardContent className="space-y-4 pt-6">
        <form
          className="grid grid-cols-1 md:grid-cols-4 gap-3"
          onSubmit={(event) => {
            event.preventDefault();
            if (!price.trim()) return;
            createRule.mutate({
              faceId: faceId || undefined,
              structureTypeId: structureTypeId || undefined,
              zoneId: zoneId || undefined,
              organizationId: organizationId || undefined,
              priceDaily: Number(price),
              startDate: startDate ? new Date(startDate) : undefined,
              endDate: endDate ? new Date(endDate) : undefined,
              isActive: true,
            });
          }}
        >
          <SelectNative
            value={faceId}
            onChange={(event) => setFaceId(event.target.value)}
          >
            <option value="">Todas las caras</option>
            {facesQuery.data?.faces.map((face) => (
              <option key={face.id} value={face.id}>
                {face.asset.code} - {face.code}
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
          <SelectNative
            value={organizationId}
            onChange={(event) => setOrganizationId(event.target.value)}
          >
            <option value="">Todos los clientes</option>
            {orgsQuery.data?.organizations.map((org) => (
              <option key={org.id} value={org.id}>
                {org.name}
              </option>
            ))}
          </SelectNative>
          <Input
            type="number"
            step="0.01"
            value={price}
            onChange={(event) => setPrice(event.target.value)}
            placeholder="Precio diario"
          />
          <Input
            type="date"
            value={startDate}
            onChange={(event) => setStartDate(event.target.value)}
          />
          <Input
            type="date"
            value={endDate}
            onChange={(event) => setEndDate(event.target.value)}
          />
          <Button type="submit" disabled={!price.trim() || createRule.isPending}>
            {createRule.isPending ? "Guardando..." : "Agregar Regla"}
          </Button>
        </form>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Alcance</TableHead>
              <TableHead>Precio</TableHead>
              <TableHead>Inicio</TableHead>
              <TableHead>Fin</TableHead>
              <TableHead>Activo</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
              {rulesQuery.data?.map((rule) => (
                <TableRow
                  key={rule.id}
                >
                  <TableCell>
                    {rule.face?.face
                      ? `${rule.face.face.asset.code} - ${rule.face.face.code}`
                      : rule.zone
                      ? `${rule.zone.province.name} - ${rule.zone.name}`
                      : rule.structureType
                      ? rule.structureType.name
                      : "Global"}
                    {rule.organization ? ` · ${rule.organization.name}` : ""}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {rule.currency} {String(rule.priceDaily)}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {rule.startDate.toLocaleDateString()}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {rule.endDate ? rule.endDate.toLocaleDateString() : "-"}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {rule.isActive ? "Sí" : "No"}
                  </TableCell>
                </TableRow>
              ))}
              {!rulesQuery.data?.length && (
                <TableRow>
                  <TableCell className="py-4 text-center text-muted-foreground" colSpan={5}>
                    Aún no hay reglas.
                  </TableCell>
                </TableRow>
              )}
          </TableBody>
        </Table>
        </CardContent>
      </Card>

      <Button variant="outline" asChild>
        <Link href="/admin/catalog/pricing">Volver a precios</Link>
      </Button>
    </AdminPageShell>
  );
}
