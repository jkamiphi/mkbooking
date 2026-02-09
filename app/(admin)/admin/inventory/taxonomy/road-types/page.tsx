"use client";

import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc/client";
import { AdminPageHeader, AdminPageShell } from "@/components/admin/page-shell";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export default function RoadTypesPage() {
  const [name, setName] = useState("");
  const utils = trpc.useUtils();
  const typesQuery = trpc.inventory.roadTypes.list.useQuery();
  const createType = trpc.inventory.roadTypes.create.useMutation({
    onSuccess: () => {
      utils.inventory.roadTypes.list.invalidate();
      setName("");
    },
  });

  return (
    <AdminPageShell>
      <AdminPageHeader
        title="Tipos de vía"
        description="Gestionar tipos de vía (Ave, Calle, Autopista)."
      />
      <Card>
        <CardContent className="space-y-4 pt-6">
        <form
          className="flex flex-col md:flex-row gap-3"
          onSubmit={(event) => {
            event.preventDefault();
            if (!name.trim()) return;
            createType.mutate({ name: name.trim() });
          }}
        >
          <Input
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Nombre del tipo de vía"
            className="flex-1"
          />
          <Button type="submit" disabled={!name.trim() || createType.isPending}>
            {createType.isPending ? "Guardando..." : "Agregar Tipo"}
          </Button>
        </form>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nombre</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
          {typesQuery.data?.map((type) => (
            <TableRow key={type.id}>
              <TableCell>{type.name}</TableCell>
            </TableRow>
          ))}
          {!typesQuery.data?.length && (
            <TableRow>
              <TableCell className="text-muted-foreground">
                Aún no hay tipos de vía.
              </TableCell>
            </TableRow>
          )}
          </TableBody>
        </Table>
        </CardContent>
      </Card>

      <Button variant="outline" asChild>
        <Link href="/admin/inventory/taxonomy">Volver a taxonomía</Link>
      </Button>
    </AdminPageShell>
  );
}
