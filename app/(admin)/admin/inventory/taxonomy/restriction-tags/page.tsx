"use client";

import Link from "next/link";
import { useState } from "react";
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

export default function RestrictionTagsPage() {
  const [code, setCode] = useState("");
  const [label, setLabel] = useState("");
  const utils = trpc.useUtils();
  const tagsQuery = trpc.inventory.restrictionTags.list.useQuery();
  const createTag = trpc.inventory.restrictionTags.create.useMutation({
    onSuccess: () => {
      utils.inventory.restrictionTags.list.invalidate();
      setCode("");
      setLabel("");
    },
  });

  return (
    <AdminPageShell>
      <AdminPageHeader
        title="Etiquetas de restricción"
        description="Gestionar etiquetas de restricción normalizadas."
      />
      <Card>
        <CardContent className="space-y-4 pt-6">
        <form
          className="grid grid-cols-1 md:grid-cols-3 gap-3"
          onSubmit={(event) => {
            event.preventDefault();
            if (!code.trim() || !label.trim()) return;
            createTag.mutate({ code: code.trim(), label: label.trim() });
          }}
        >
          <Input
            value={code}
            onChange={(event) => setCode(event.target.value)}
            placeholder="Código (NO_ALCOHOL)"
          />
          <Input
            value={label}
            onChange={(event) => setLabel(event.target.value)}
            placeholder="Etiqueta"
          />
          <Button
            type="submit"
            disabled={!code.trim() || !label.trim() || createTag.isPending}
          >
            {createTag.isPending ? "Guardando..." : "Agregar Etiqueta"}
          </Button>
        </form>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Código</TableHead>
              <TableHead>Etiqueta</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
              {tagsQuery.data?.map((tag) => (
                <TableRow
                  key={tag.id}
                >
                  <TableCell>{tag.code}</TableCell>
                  <TableCell>{tag.label}</TableCell>
                </TableRow>
              ))}
              {!tagsQuery.data?.length && (
                <TableRow>
                  <TableCell colSpan={2} className="py-4 text-center text-muted-foreground">
                    Aún no hay etiquetas.
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
