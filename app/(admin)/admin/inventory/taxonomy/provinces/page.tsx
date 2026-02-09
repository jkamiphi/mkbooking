"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc/client";
import { AdminPageHeader, AdminPageShell } from "@/components/admin/page-shell";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default function ProvincesPage() {
  const [name, setName] = useState("");
  const utils = trpc.useUtils();
  const provincesQuery = trpc.inventory.provinces.list.useQuery();
  const createProvince = trpc.inventory.provinces.create.useMutation({
    onSuccess: () => {
      utils.inventory.provinces.list.invalidate();
      setName("");
    },
  });

  return (
    <AdminPageShell>
      <AdminPageHeader
        title="Provincias"
        description="Gestionar provincias para zonificación del inventario."
      />
      <Card>
        <CardContent className="space-y-4 pt-6">
        <form
          className="flex flex-col md:flex-row gap-3"
          onSubmit={(event) => {
            event.preventDefault();
            if (!name.trim()) return;
            createProvince.mutate({ name: name.trim() });
          }}
        >
          <Input
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Nombre de provincia"
            className="flex-1"
          />
          <Button type="submit" disabled={!name.trim() || createProvince.isPending}>
            {createProvince.isPending ? "Guardando..." : "Agregar Provincia"}
          </Button>
        </form>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Provincia</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
              {provincesQuery.data?.map((province) => (
                <TableRow
                  key={province.id}
                >
                  <TableCell>{province.name}</TableCell>
                </TableRow>
              ))}
              {!provincesQuery.data?.length && (
                <TableRow>
                  <TableCell className="py-4 text-center text-muted-foreground">
                    Aún no hay provincias.
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
