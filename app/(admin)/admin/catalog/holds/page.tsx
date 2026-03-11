"use client";

import { useMemo, useState } from "react";
import { Pencil, Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc/client";
import { AdminPageHeader, AdminPageShell } from "@/components/admin/page-shell";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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

function padDateSegment(value: number) {
  return String(value).padStart(2, "0");
}

function toDateTimeLocalInputValue(date: Date) {
  const year = date.getFullYear();
  const month = padDateSegment(date.getMonth() + 1);
  const day = padDateSegment(date.getDate());
  const hours = padDateSegment(date.getHours());
  const minutes = padDateSegment(date.getMinutes());
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

function addHoursToDateTimeLocalInputValue(value: string, hoursToAdd: number) {
  const baseDate = value ? new Date(value) : new Date();
  if (Number.isNaN(baseDate.getTime())) {
    return value;
  }

  baseDate.setHours(baseDate.getHours() + hoursToAdd);
  return toDateTimeLocalInputValue(baseDate);
}

export default function HoldsPage() {
  const [statusFilter, setStatusFilter] = useState<string>("");

  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [createFaceId, setCreateFaceId] = useState("");
  const [createOrganizationId, setCreateOrganizationId] = useState("");
  const [createError, setCreateError] = useState<string | null>(null);

  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingHoldId, setEditingHoldId] = useState<string | null>(null);
  const [editExpiresAt, setEditExpiresAt] = useState("");
  const [editOrganizationId, setEditOrganizationId] = useState("");
  const [editError, setEditError] = useState<string | null>(null);
  const [defaultMinimumExpiryValue] = useState(() =>
    toDateTimeLocalInputValue(new Date(new Date().getTime() + 60 * 1000)),
  );

  const utils = trpc.useUtils();
  const facesQuery = trpc.catalog.faces.pricingOptions.useQuery({ take: 100 });
  const orgsQuery = trpc.organization.list.useQuery({ skip: 0, take: 100 });
  const holdsQuery = trpc.catalog.holds.list.useQuery({
    status: statusFilter
      ? (statusFilter as (typeof statusOptions)[number])
      : undefined,
  });

  const activeEditingHold = useMemo(
    () => holdsQuery.data?.find((hold) => hold.id === editingHoldId) ?? null,
    [editingHoldId, holdsQuery.data],
  );

  const createHold = trpc.catalog.holds.create.useMutation({
    onSuccess: () => {
      utils.catalog.holds.list.invalidate();
      toast.success("Reserva creada", {
        description: "La reserva fue creada correctamente.",
      });
      handleCreateDialogOpenChange(false);
    },
    onError: (error) => {
      setCreateError(error.message);
      toast.error("No se pudo crear la reserva", {
        description: error.message,
      });
    },
  });

  const updateHold = trpc.catalog.holds.update.useMutation({
    onSuccess: () => {
      utils.catalog.holds.list.invalidate();
      toast.success("Reserva actualizada", {
        description: "La reserva fue actualizada correctamente.",
      });
      handleEditDialogOpenChange(false);
    },
    onError: (error) => {
      setEditError(error.message);
      toast.error("No se pudo actualizar la reserva", {
        description: error.message,
      });
    },
  });

  const releaseHold = trpc.catalog.holds.release.useMutation({
    onSuccess: () => {
      utils.catalog.holds.list.invalidate();
      toast.success("Reserva liberada", {
        description: "La reserva fue liberada correctamente.",
      });
    },
    onError: (error) => {
      toast.error("No se pudo liberar la reserva", {
        description: error.message,
      });
    },
  });

  function resetCreateFormState() {
    setCreateFaceId("");
    setCreateOrganizationId("");
    setCreateError(null);
  }

  function resetEditFormState() {
    setEditingHoldId(null);
    setEditExpiresAt("");
    setEditOrganizationId("");
    setEditError(null);
  }

  function handleCreateDialogOpenChange(nextOpen: boolean) {
    if (!nextOpen && createHold.isPending) {
      return;
    }

    setIsCreateDialogOpen(nextOpen);
    if (!nextOpen) {
      resetCreateFormState();
    }
  }

  function handleEditDialogOpenChange(nextOpen: boolean) {
    if (!nextOpen && updateHold.isPending) {
      return;
    }

    setIsEditDialogOpen(nextOpen);
    if (!nextOpen) {
      resetEditFormState();
    }
  }

  function openEditDialog(hold: NonNullable<typeof holdsQuery.data>[number]) {
    setEditingHoldId(hold.id);
    setEditExpiresAt(toDateTimeLocalInputValue(hold.expiresAt));
    setEditOrganizationId(hold.organization?.id ?? "");
    setEditError(null);
    setIsEditDialogOpen(true);
  }

  function handleCreateHoldSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!createFaceId) {
      const message = "Selecciona una cara para crear la reserva.";
      setCreateError(message);
      toast.error("Formulario incompleto", {
        description: message,
      });
      return;
    }

    setCreateError(null);
    createHold.mutate({
      faceId: createFaceId,
      organizationId: createOrganizationId || undefined,
    });
  }

  function handleEditHoldSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!editingHoldId || !activeEditingHold) {
      const message = "No se encontro la reserva a editar.";
      setEditError(message);
      toast.error("No se pudo editar", {
        description: message,
      });
      return;
    }

    const nextExpiryDate = new Date(editExpiresAt);
    if (!editExpiresAt || Number.isNaN(nextExpiryDate.getTime())) {
      const message = "Selecciona una fecha y hora valida para extender la reserva.";
      setEditError(message);
      toast.error("Fecha invalida", {
        description: message,
      });
      return;
    }

    if (nextExpiryDate <= activeEditingHold.expiresAt) {
      const message = "La nueva expiracion debe ser posterior a la actual.";
      setEditError(message);
      toast.error("Extension invalida", {
        description: message,
      });
      return;
    }

    setEditError(null);
    updateHold.mutate({
      holdId: editingHoldId,
      expiresAt: nextExpiryDate,
      organizationId: editOrganizationId || null,
    });
  }

  const minimumEditableExpiryValue = activeEditingHold
    ? toDateTimeLocalInputValue(new Date(activeEditingHold.expiresAt.getTime() + 60 * 1000))
    : defaultMinimumExpiryValue;

  return (
    <AdminPageShell>
      <AdminPageHeader
        title="Reservas"
        description="Las reservas bloquean caras por 24 horas."
        actions={(
          <Button
            type="button"
            className="bg-mkmedia-blue text-white hover:bg-mkmedia-blue/90"
            onClick={() => setIsCreateDialogOpen(true)}
          >
            <Plus className="mr-2 h-4 w-4" />
            Nueva reserva
          </Button>
        )}
      />

      <Dialog open={isCreateDialogOpen} onOpenChange={handleCreateDialogOpenChange}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Crear reserva</DialogTitle>
            <DialogDescription>
              Selecciona cara y organización para bloquear inventario durante 24 horas.
            </DialogDescription>
          </DialogHeader>
          <form className="space-y-4" onSubmit={handleCreateHoldSubmit}>
            <div className="grid grid-cols-1 gap-4">
              <div>
                <Label className="mb-1.5 block">Cara</Label>
                <SelectNative
                  value={createFaceId}
                  onChange={(event) => setCreateFaceId(event.target.value)}
                >
                  <option value="">Seleccionar cara</option>
                  {facesQuery.data?.map((face) => (
                    <option key={face.id} value={face.id}>
                      {face.asset.code} - {face.code}
                    </option>
                  ))}
                </SelectNative>
              </div>
              <div>
                <Label className="mb-1.5 block">Organización (opcional)</Label>
                <SelectNative
                  value={createOrganizationId}
                  onChange={(event) => setCreateOrganizationId(event.target.value)}
                >
                  <option value="">Sin organización</option>
                  {orgsQuery.data?.organizations.map((org) => (
                    <option key={org.id} value={org.id}>
                      {org.name}
                    </option>
                  ))}
                </SelectNative>
              </div>
            </div>
            {createError ? (
              <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {createError}
              </p>
            ) : null}
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                disabled={createHold.isPending}
                onClick={() => handleCreateDialogOpenChange(false)}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                className="bg-mkmedia-blue text-white hover:bg-mkmedia-blue/90"
                disabled={!createFaceId || createHold.isPending}
              >
                {createHold.isPending ? "Guardando..." : "Crear reserva"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={isEditDialogOpen} onOpenChange={handleEditDialogOpenChange}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Editar reserva</DialogTitle>
            <DialogDescription>
              Extiende la expiración de una reserva activa o ajusta su organización.
            </DialogDescription>
          </DialogHeader>
          <form className="space-y-4" onSubmit={handleEditHoldSubmit}>
            <div className="grid grid-cols-1 gap-4">
              <div>
                <Label className="mb-1.5 block">Reserva</Label>
                <Input
                  readOnly
                  value={
                    activeEditingHold
                      ? `${activeEditingHold.face.face.asset.code} - ${activeEditingHold.face.face.code}`
                      : ""
                  }
                />
              </div>
              <div>
                <Label className="mb-1.5 block">Nueva expiración</Label>
                <Input
                  type="datetime-local"
                  value={editExpiresAt}
                  min={minimumEditableExpiryValue}
                  onChange={(event) => setEditExpiresAt(event.target.value)}
                />
                <div className="mt-2 flex flex-wrap gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      setEditExpiresAt((currentValue) =>
                        addHoursToDateTimeLocalInputValue(currentValue, 24),
                      )
                    }
                  >
                    +24h
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      setEditExpiresAt((currentValue) =>
                        addHoursToDateTimeLocalInputValue(currentValue, 48),
                      )
                    }
                  >
                    +48h
                  </Button>
                </div>
              </div>
              <div>
                <Label className="mb-1.5 block">Organización</Label>
                <SelectNative
                  value={editOrganizationId}
                  onChange={(event) => setEditOrganizationId(event.target.value)}
                >
                  <option value="">Sin organización</option>
                  {orgsQuery.data?.organizations.map((org) => (
                    <option key={org.id} value={org.id}>
                      {org.name}
                    </option>
                  ))}
                </SelectNative>
              </div>
            </div>
            {editError ? (
              <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {editError}
              </p>
            ) : null}
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                disabled={updateHold.isPending}
                onClick={() => handleEditDialogOpenChange(false)}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                className="bg-mkmedia-blue text-white hover:bg-mkmedia-blue/90"
                disabled={updateHold.isPending || !editingHoldId}
              >
                {updateHold.isPending ? "Guardando..." : "Guardar cambios"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Card>
        <CardContent className="space-y-4 pt-6">
          <div className="flex justify-end">
            <div className="w-full max-w-xs">
              <Label className="mb-1.5 block">Filtrar por estado</Label>
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
            </div>
          </div>

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
                <TableRow key={hold.id}>
                  <TableCell>
                    {hold.face.face.asset.code} - {hold.face.face.code}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {hold.organization?.name ?? "-"}
                  </TableCell>
                  <TableCell className="text-muted-foreground">{hold.status}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {hold.expiresAt.toLocaleString()}
                  </TableCell>
                  <TableCell className="text-right">
                    {hold.status === "ACTIVE" ? (
                      <div className="flex justify-end gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openEditDialog(hold)}
                        >
                          <Pencil className="mr-1.5 h-3.5 w-3.5" />
                          Editar
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={releaseHold.isPending}
                          onClick={() => releaseHold.mutate({ holdId: hold.id })}
                        >
                          Liberar
                        </Button>
                      </div>
                    ) : null}
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
