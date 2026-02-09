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

export function CatalogFacesContent() {
  const [search, setSearch] = useState("");
  const [publishedFilter, setPublishedFilter] = useState("");

  const facesQuery = trpc.catalog.faces.list.useQuery({
    search: search.trim() || undefined,
    isPublished:
      publishedFilter === ""
        ? undefined
        : publishedFilter === "published",
    take: 100,
  });

  const promo = facesQuery.data?.promo;

  return (
    <div className="space-y-6">
      <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardContent className="pt-4">
          <p className="text-sm text-muted-foreground">
            Promoción activa
          </p>
          <p className="text-lg font-semibold text-foreground">
            {promo
              ? `${promo.name} (${promo.type} ${String(promo.value)})`
              : "Sin promoción activa"}
          </p>
          </CardContent>
        </Card>
      </section>

      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 w-full">
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Buscar por cara o código de activo"
          />
          <SelectNative
            value={publishedFilter}
            onChange={(event) => setPublishedFilter(event.target.value)}
          >
            <option value="">Todos</option>
            <option value="published">Publicado</option>
            <option value="draft">Borrador</option>
          </SelectNative>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Caras</CardTitle>
        </CardHeader>
        <CardContent>
        {facesQuery.isLoading ? (
          <div className="text-sm text-muted-foreground">
            Cargando caras del catálogo...
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Activo</TableHead>
                <TableHead>Cara</TableHead>
                <TableHead>Zona</TableHead>
                <TableHead>Publicado</TableHead>
                <TableHead>Precio de Cara</TableHead>
                <TableHead />
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
                      {face.asset.zone.province.name} - {face.asset.zone.name}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {face.catalogFace?.isPublished ? "Sí" : "No"}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {face.effectivePrice
                        ? `${face.effectivePrice.currency} ${face.effectivePrice.priceDaily}`
                        : "-"}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button size="sm" variant="outline" asChild>
                        <Link href={`/admin/catalog/faces/${face.id}`}>
                          Gestionar
                        </Link>
                      </Button>
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
