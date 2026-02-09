"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc/client";
import { AdminPageHeader, AdminPageShell } from "@/components/admin/page-shell";
import { Card, CardContent } from "@/components/ui/card";
import { SelectNative } from "@/components/ui/select-native";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const statusOptions = ["ACTIVE", "EXPIRED", "RELEASED", "CONVERTED"] as const;

export default function HoldsPage() {
  const [faceId, setFaceId] = useState("");
  const [organizationId, setOrganizationId] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("");

  const utils = trpc.useUtils();
  const facesQuery = trpc.inventory.faces.list.useQuery({ take: 100 });
  const orgsQuery = trpc.organization.list.useQuery({ skip: 0, take: 100 });
  const holdsQuery = trpc.catalog.holds.list.useQuery({
    status: statusFilter
      ? (statusFilter as (typeof statusOptions)[number])
      : undefined,
  });

  const createHold = trpc.catalog.holds.create.useMutation({
    onSuccess: () => {
      utils.catalog.holds.list.invalidate();
      setFaceId("");
      setOrganizationId("");
    },
  });

  const releaseHold = trpc.catalog.holds.release.useMutation({
    onSuccess: () => {
      utils.catalog.holds.list.invalidate();
    },
  });

  return (
    <AdminPageShell>
      <AdminPageHeader
        title="Reservas"
        description="Las reservas bloquean caras por 24 horas."
      />
      <Card>
        <CardContent className="space-y-4 pt-6">
        <form
          className="grid grid-cols-1 md:grid-cols-4 gap-3"
          onSubmit={(event) => {
            event.preventDefault();
            if (!faceId) return;
            createHold.mutate({
              faceId,
              organizationId: organizationId || undefined,
            });
          }}
        >
          <SelectNative
            value={faceId}
            onChange={(event) => setFaceId(event.target.value)}
          >
            <option value="">Seleccionar cara</option>
            {facesQuery.data?.faces.map((face) => (
              <option key={face.id} value={face.id}>
                {face.asset.code} - {face.code}
              </option>
            ))}
          </SelectNative>
          <SelectNative
            value={organizationId}
            onChange={(event) => setOrganizationId(event.target.value)}
          >
            <option value="">Organización (opcional)</option>
            {orgsQuery.data?.organizations.map((org) => (
              <option key={org.id} value={org.id}>
                {org.name}
              </option>
            ))}
          </SelectNative>
          <Button type="submit" disabled={!faceId || createHold.isPending}>
            {createHold.isPending ? "Guardando..." : "Crear Reserva"}
          </Button>
          <SelectNative
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
          >
            <option value="">Todos los estados</option>
            {statusOptions.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </SelectNative>
        </form>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Cara</TableHead>
              <TableHead>Organización</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>Expira</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
              {holdsQuery.data?.map((hold) => (
                <TableRow
                  key={hold.id}
                >
                  <TableCell>
                    {hold.face.face.asset.code} - {hold.face.face.code}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {hold.organization?.name ?? "-"}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {hold.status}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {hold.expiresAt.toLocaleString()}
                  </TableCell>
                  <TableCell className="text-right">
                    {hold.status === "ACTIVE" && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => releaseHold.mutate({ holdId: hold.id })}
                      >
                        Liberar
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
              {!holdsQuery.data?.length && (
                <TableRow>
                  <TableCell className="py-4 text-center text-muted-foreground" colSpan={5}>
                    Aún no hay reservas.
                  </TableCell>
                </TableRow>
              )}
          </TableBody>
        </Table>
        </CardContent>
      </Card>
    </AdminPageShell>
  );
}
