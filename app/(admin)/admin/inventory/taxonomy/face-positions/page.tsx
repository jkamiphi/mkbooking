"use client";

import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc/client";
import { AdminPageHeader, AdminPageShell } from "@/components/admin/page-shell";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export default function FacePositionsPage() {
  const [name, setName] = useState("");
  const utils = trpc.useUtils();
  const positionsQuery = trpc.inventory.facePositions.list.useQuery();
  const createPosition = trpc.inventory.facePositions.create.useMutation({
    onSuccess: () => {
      utils.inventory.facePositions.list.invalidate();
      setName("");
    },
  });

  return (
    <AdminPageShell>
      <AdminPageHeader
        title="Posiciones de cara"
        description="Gestionar posiciones de cara (A/B, Norte/Sur, etc.)."
      />
      <Card>
        <CardContent className="space-y-4 pt-6">
        <form
          className="flex flex-col md:flex-row gap-3"
          onSubmit={(event) => {
            event.preventDefault();
            if (!name.trim()) return;
            createPosition.mutate({ name: name.trim() });
          }}
        >
          <Input
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Nombre de posición"
            className="flex-1"
          />
          <Button type="submit" disabled={!name.trim() || createPosition.isPending}>
            {createPosition.isPending ? "Guardando..." : "Agregar Posición"}
          </Button>
        </form>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nombre</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
          {positionsQuery.data?.map((position) => (
            <TableRow key={position.id}>
              <TableCell>{position.name}</TableCell>
            </TableRow>
          ))}
          {!positionsQuery.data?.length && (
            <TableRow>
              <TableCell className="text-muted-foreground">
                Aún no hay posiciones.
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
