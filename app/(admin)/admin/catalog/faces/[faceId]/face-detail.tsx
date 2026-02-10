"use client";

import Link from "next/link";
import { useState } from "react";
import type { inferRouterOutputs } from "@trpc/server";
import { AdminPageHeader, AdminPageShell } from "@/components/admin/page-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc/client";
import type { AppRouter } from "@/lib/trpc/routers";

type RouterOutputs = inferRouterOutputs<AppRouter>;

type CatalogFaceQueryData = NonNullable<
  RouterOutputs["catalog"]["faces"]["get"]
>;

export function CatalogFaceDetail({ faceId }: { faceId: string }) {
  const faceQuery = trpc.catalog.faces.get.useQuery({ faceId });

  if (faceQuery.isLoading) {
    return <div className="text-sm text-muted-foreground">Cargando cara...</div>;
  }

  if (!faceQuery.data) {
    return <div className="text-sm text-red-500">Cara no encontrada.</div>;
  }

  return <CatalogFaceDetailContent faceId={faceId} data={faceQuery.data} />;
}

function CatalogFaceDetailContent({
  faceId,
  data,
}: {
  faceId: string;
  data: CatalogFaceQueryData;
}) {
  const utils = trpc.useUtils();
  const [form, setForm] = useState({
    title: data.title ?? "",
    summary: data.summary ?? "",
    highlight: data.highlight ?? "",
    primaryImageUrl: data.primaryImageUrl ?? "",
    isPublished: data.isPublished ?? false,
  });
  const [price, setPrice] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const upsertFace = trpc.catalog.faces.upsert.useMutation({
    onSuccess: () => {
      utils.catalog.faces.get.invalidate({ faceId });
      utils.catalog.faces.list.invalidate();
    },
  });

  const createRule = trpc.catalog.priceRules.create.useMutation({
    onSuccess: () => {
      utils.catalog.faces.get.invalidate({ faceId });
      utils.catalog.faces.list.invalidate();
      utils.catalog.priceRules.list.invalidate({ faceId });
      setPrice("");
      setStartDate("");
      setEndDate("");
    },
  });

  const face = data.face;

  return (
    <AdminPageShell>
      <AdminPageHeader
        title={`${face.asset.code} - Cara ${face.code}`}
        description={`${face.asset.zone.province.name} - ${face.asset.zone.name}`}
      />

      <Card>
        <CardHeader>
          <CardTitle>Detalles del catálogo</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <form
            className="space-y-4"
            onSubmit={(event) => {
              event.preventDefault();
              upsertFace.mutate({
                faceId,
                title: form.title.trim() || undefined,
                summary: form.summary.trim() || undefined,
                highlight: form.highlight.trim() || undefined,
                primaryImageUrl: form.primaryImageUrl.trim() || undefined,
                isPublished: form.isPublished,
              });
            }}
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <Label className="mb-1.5 block">Título</Label>
                <Input
                  value={form.title}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, title: event.target.value }))
                  }
                />
              </div>
              <div className="md:col-span-2">
                <Label className="mb-1.5 block">Resumen</Label>
                <Textarea
                  value={form.summary}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, summary: event.target.value }))
                  }
                  rows={3}
                />
              </div>
              <div className="md:col-span-2">
                <Label className="mb-1.5 block">Destacado</Label>
                <Input
                  value={form.highlight}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, highlight: event.target.value }))
                  }
                />
              </div>
              <div className="md:col-span-2">
                <Label className="mb-1.5 block">URL de Imagen Principal</Label>
                <Input
                  value={form.primaryImageUrl}
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      primaryImageUrl: event.target.value,
                    }))
                  }
                />
              </div>
              <Label className="flex items-center gap-2 text-sm">
                <Checkbox
                  checked={form.isPublished}
                  onCheckedChange={(checked) =>
                    setForm((prev) => ({
                      ...prev,
                      isPublished: Boolean(checked),
                    }))
                  }
                />
                Publicado
              </Label>
            </div>
            <Button type="submit" disabled={upsertFace.isPending}>
              {upsertFace.isPending
                ? "Guardando..."
                : "Guardar Detalles del Catálogo"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Reglas de precio de cara</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <form
            className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end"
            onSubmit={(event) => {
              event.preventDefault();
              if (!price.trim()) return;
              createRule.mutate({
                faceId,
                priceDaily: Number(price),
                startDate: startDate ? new Date(startDate) : undefined,
                endDate: endDate ? new Date(endDate) : undefined,
                isActive: true,
              });
            }}
          >
            <div>
              <Label className="mb-1.5 block">Precio Diario (USD)</Label>
              <Input
                type="number"
                step="0.01"
                value={price}
                onChange={(event) => setPrice(event.target.value)}
              />
            </div>
            <div>
              <Label className="mb-1.5 block">Fecha de Inicio</Label>
              <Input
                type="date"
                value={startDate}
                onChange={(event) => setStartDate(event.target.value)}
              />
            </div>
            <div>
              <Label className="mb-1.5 block">Fecha de Fin</Label>
              <Input
                type="date"
                value={endDate}
                onChange={(event) => setEndDate(event.target.value)}
              />
            </div>
            <Button type="submit" disabled={!price.trim() || createRule.isPending}>
              {createRule.isPending ? "Guardando..." : "Agregar Regla"}
            </Button>
          </form>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Precio</TableHead>
                <TableHead>Inicio</TableHead>
                <TableHead>Fin</TableHead>
                <TableHead>Activo</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.priceRules.map((rule) => (
                <TableRow key={rule.id}>
                  <TableCell>
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
              {!data.priceRules.length && (
                <TableRow>
                  <TableCell className="py-4 text-center text-muted-foreground" colSpan={4}>
                    Aún no hay reglas de precio.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Button variant="outline" asChild>
        <Link href="/admin/catalog/faces">Volver a caras</Link>
      </Button>
    </AdminPageShell>
  );
}
