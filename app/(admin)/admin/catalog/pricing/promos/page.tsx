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

const promoTypes = ["PERCENT", "FIXED"] as const;

export default function PromosPage() {
  const [name, setName] = useState("");
  const [type, setType] = useState<(typeof promoTypes)[number]>("PERCENT");
  const [value, setValue] = useState("");
  const utils = trpc.useUtils();
  const promosQuery = trpc.catalog.promos.list.useQuery();
  const createPromo = trpc.catalog.promos.create.useMutation({
    onSuccess: () => {
      utils.catalog.promos.list.invalidate();
      setName("");
      setValue("");
    },
  });

  return (
    <AdminPageShell>
      <AdminPageHeader
        title="Promociones"
        description="Solo una promoción puede estar activa a la vez."
      />
      <Card>
        <CardContent className="space-y-4 pt-6">
        <form
          className="grid grid-cols-1 md:grid-cols-4 gap-3"
          onSubmit={(event) => {
            event.preventDefault();
            if (!name.trim() || !value.trim()) return;
            createPromo.mutate({
              name: name.trim(),
              type,
              value: Number(value),
              isActive: true,
            });
          }}
        >
          <Input
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Nombre de la promoción"
          />
          <SelectNative
            value={type}
            onChange={(event) =>
              setType(event.target.value as (typeof promoTypes)[number])
            }
          >
            {promoTypes.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </SelectNative>
          <Input
            type="number"
            step="0.01"
            value={value}
            onChange={(event) => setValue(event.target.value)}
            placeholder="Valor"
          />
          <Button
            type="submit"
            disabled={!name.trim() || !value.trim() || createPromo.isPending}
          >
            {createPromo.isPending ? "Guardando..." : "Crear Promoción"}
          </Button>
        </form>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nombre</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Valor</TableHead>
              <TableHead>Activo</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
              {promosQuery.data?.map((promo) => (
                <TableRow
                  key={promo.id}
                >
                  <TableCell>{promo.name}</TableCell>
                  <TableCell className="text-muted-foreground">{promo.type}</TableCell>
                  <TableCell className="text-muted-foreground">{String(promo.value)}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {promo.isActive ? "Sí" : "No"}
                  </TableCell>
                </TableRow>
              ))}
              {!promosQuery.data?.length && (
                <TableRow>
                  <TableCell className="py-4 text-center text-muted-foreground" colSpan={4}>
                    Aún no hay promociones.
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
