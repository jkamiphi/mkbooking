"use client";

import { useMemo, useState } from "react";
import type { inferRouterOutputs } from "@trpc/server";
import { toast } from "sonner";

import { trpc } from "@/lib/trpc/client";
import type { AppRouter } from "@/lib/trpc/routers";
import { AdminPageHeader, AdminPageShell } from "@/components/admin/page-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type RouterOutputs = inferRouterOutputs<AppRouter>;
type CampaignService = RouterOutputs["catalog"]["services"]["adminList"][number];

interface ServiceFormState {
  code: string;
  name: string;
  description: string;
  basePrice: string;
  currency: string;
  sortOrder: string;
}

interface EditServiceFormState extends ServiceFormState {
  id: string;
}

const EMPTY_SERVICES: CampaignService[] = [];
const DEFAULT_CREATE_FORM: ServiceFormState = {
  code: "",
  name: "",
  description: "",
  basePrice: "0",
  currency: "USD",
  sortOrder: "0",
};

function formatCurrency(value: string | number, currency = "USD") {
  return new Intl.NumberFormat("es-PA", {
    style: "currency",
    currency,
  }).format(Number(value));
}

function normalizeCode(value: string) {
  return value.trim().toUpperCase().replace(/\s+/g, "_");
}

function toPayload(form: ServiceFormState) {
  const code = normalizeCode(form.code);
  const name = form.name.trim();
  const basePrice = Number(form.basePrice);
  const sortOrder = Number(form.sortOrder);

  if (!code || !name || !Number.isFinite(basePrice) || basePrice < 0) {
    return null;
  }

  return {
    code,
    name,
    description: form.description.trim() || undefined,
    basePrice,
    currency: form.currency.trim().toUpperCase() || "USD",
    sortOrder: Number.isFinite(sortOrder) ? Math.max(0, Math.floor(sortOrder)) : 0,
  };
}

export default function CatalogServicesPage() {
  const utils = trpc.useUtils();

  const [search, setSearch] = useState("");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState<ServiceFormState>(DEFAULT_CREATE_FORM);
  const [editForm, setEditForm] = useState<EditServiceFormState | null>(null);

  const servicesQuery = trpc.catalog.services.adminList.useQuery(undefined, {
    refetchOnWindowFocus: false,
  });

  const createService = trpc.catalog.services.adminCreate.useMutation({
    onSuccess: () => {
      void utils.catalog.services.adminList.invalidate();
      void utils.catalog.services.publicList.invalidate();
      setCreateForm(DEFAULT_CREATE_FORM);
      setIsCreateOpen(false);
      toast.success("Servicio creado correctamente.");
    },
    onError: (error) => {
      toast.error("No se pudo crear el servicio", { description: error.message });
    },
  });

  const updateService = trpc.catalog.services.adminUpdate.useMutation({
    onSuccess: () => {
      void utils.catalog.services.adminList.invalidate();
      void utils.catalog.services.publicList.invalidate();
      setEditForm(null);
      toast.success("Servicio actualizado correctamente.");
    },
    onError: (error) => {
      toast.error("No se pudo actualizar el servicio", { description: error.message });
    },
  });

  const toggleActive = trpc.catalog.services.adminToggleActive.useMutation({
    onSuccess: () => {
      void utils.catalog.services.adminList.invalidate();
      void utils.catalog.services.publicList.invalidate();
      toast.success("Estado del servicio actualizado.");
    },
    onError: (error) => {
      toast.error("No se pudo cambiar el estado", { description: error.message });
    },
  });

  const services = servicesQuery.data ?? EMPTY_SERVICES;

  const filteredServices = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return services;

    return services.filter((service) => {
      return (
        service.code.toLowerCase().includes(term) ||
        service.name.toLowerCase().includes(term) ||
        service.description?.toLowerCase().includes(term)
      );
    });
  }, [services, search]);

  const activeCount = services.filter((service) => service.isActive).length;

  function handleCreateSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const payload = toPayload(createForm);
    if (!payload) {
      toast.error("Completa código, nombre y precio válido.");
      return;
    }

    createService.mutate({ ...payload, isActive: true });
  }

  function startEditing(service: CampaignService) {
    setEditForm({
      id: service.id,
      code: service.code,
      name: service.name,
      description: service.description || "",
      basePrice: String(service.basePrice),
      currency: service.currency || "USD",
      sortOrder: String(service.sortOrder),
    });
  }

  function handleEditSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editForm) return;

    const payload = toPayload(editForm);
    if (!payload) {
      toast.error("Completa código, nombre y precio válido.");
      return;
    }

    updateService.mutate({
      id: editForm.id,
      ...payload,
      description: payload.description || null,
    });
  }

  const isSaving = createService.isPending || updateService.isPending || toggleActive.isPending;

  return (
    <AdminPageShell>
      <AdminPageHeader
        title="Servicios de campaña"
        description="Gestiona servicios facturables adicionales para solicitudes y órdenes."
        actions={
          <Button
            className="bg-[#0359A8] hover:bg-[#024a8f]"
            onClick={() => setIsCreateOpen(true)}
          >
            Crear servicio
          </Button>
        }
      />

      <section className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="pt-5">
            <p className="text-sm text-muted-foreground">Servicios totales</p>
            <p className="text-2xl font-semibold text-foreground">{services.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <p className="text-sm text-muted-foreground">Servicios activos</p>
            <p className="text-2xl font-semibold text-emerald-700">{activeCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <p className="text-sm text-muted-foreground">Servicios inactivos</p>
            <p className="text-2xl font-semibold text-amber-700">
              {services.length - activeCount}
            </p>
          </CardContent>
        </Card>
      </section>

      <Card>
        <CardContent className="space-y-4 pt-6">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Buscar por código, nombre o descripción"
              className="md:max-w-sm"
            />
            <p className="text-sm text-muted-foreground">
              {filteredServices.length} servicio(s) encontrado(s)
            </p>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Código</TableHead>
                <TableHead>Nombre</TableHead>
                <TableHead>Precio base</TableHead>
                <TableHead>Orden</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {servicesQuery.isLoading && (
                <TableRow>
                  <TableCell colSpan={6} className="py-6 text-center text-muted-foreground">
                    Cargando servicios...
                  </TableCell>
                </TableRow>
              )}

              {!servicesQuery.isLoading && filteredServices.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="py-6 text-center text-muted-foreground">
                    No hay servicios que coincidan con la búsqueda.
                  </TableCell>
                </TableRow>
              )}

              {!servicesQuery.isLoading &&
                filteredServices.map((service) => (
                  <TableRow key={service.id}>
                    <TableCell>
                      <span className="font-mono text-xs text-foreground">{service.code}</span>
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium text-foreground">{service.name}</p>
                        {service.description ? (
                          <p className="mt-0.5 text-xs text-muted-foreground">
                            {service.description}
                          </p>
                        ) : null}
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatCurrency(Number(service.basePrice), service.currency)}
                    </TableCell>
                    <TableCell className="text-muted-foreground">{service.sortOrder}</TableCell>
                    <TableCell>
                      <Badge variant={service.isActive ? "success" : "secondary"}>
                        {service.isActive ? "Activo" : "Inactivo"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => startEditing(service)}
                          disabled={isSaving}
                        >
                          Editar
                        </Button>
                        <Button
                          size="sm"
                          variant={service.isActive ? "secondary" : "default"}
                          onClick={() =>
                            toggleActive.mutate({
                              id: service.id,
                              isActive: !service.isActive,
                            })
                          }
                          disabled={isSaving}
                        >
                          {service.isActive ? "Desactivar" : "Activar"}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Crear servicio facturable</DialogTitle>
            <DialogDescription>
              Este servicio aparecerá en el formulario público de solicitudes cuando esté activo.
            </DialogDescription>
          </DialogHeader>

          <form className="space-y-4" onSubmit={handleCreateSubmit}>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="create-service-code">Código</Label>
                <Input
                  id="create-service-code"
                  value={createForm.code}
                  onChange={(event) =>
                    setCreateForm((prev) => ({ ...prev, code: event.target.value }))
                  }
                  placeholder="PRODUCCION_URGENTE"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="create-service-name">Nombre</Label>
                <Input
                  id="create-service-name"
                  value={createForm.name}
                  onChange={(event) =>
                    setCreateForm((prev) => ({ ...prev, name: event.target.value }))
                  }
                  placeholder="Producción urgente"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="create-service-base-price">Precio base</Label>
                <Input
                  id="create-service-base-price"
                  type="number"
                  min={0}
                  step="0.01"
                  value={createForm.basePrice}
                  onChange={(event) =>
                    setCreateForm((prev) => ({ ...prev, basePrice: event.target.value }))
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="create-service-currency">Moneda</Label>
                <Input
                  id="create-service-currency"
                  value={createForm.currency}
                  onChange={(event) =>
                    setCreateForm((prev) => ({ ...prev, currency: event.target.value }))
                  }
                  placeholder="USD"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="create-service-order">Orden</Label>
                <Input
                  id="create-service-order"
                  type="number"
                  min={0}
                  step="1"
                  value={createForm.sortOrder}
                  onChange={(event) =>
                    setCreateForm((prev) => ({ ...prev, sortOrder: event.target.value }))
                  }
                />
              </div>
              <div className="space-y-1.5 md:col-span-2">
                <Label htmlFor="create-service-description">Descripción</Label>
                <Textarea
                  id="create-service-description"
                  value={createForm.description}
                  onChange={(event) =>
                    setCreateForm((prev) => ({ ...prev, description: event.target.value }))
                  }
                  className="min-h-24"
                  placeholder="Detalle opcional del servicio"
                />
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsCreateOpen(false)}
                disabled={createService.isPending}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={createService.isPending}>
                {createService.isPending ? "Guardando..." : "Crear servicio"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(editForm)} onOpenChange={(open) => !open && setEditForm(null)}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Editar servicio</DialogTitle>
            <DialogDescription>
              Ajusta datos y precios del servicio en el catálogo facturable.
            </DialogDescription>
          </DialogHeader>

          <form className="space-y-4" onSubmit={handleEditSubmit}>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="edit-service-code">Código</Label>
                <Input
                  id="edit-service-code"
                  value={editForm?.code ?? ""}
                  onChange={(event) =>
                    setEditForm((prev) =>
                      prev ? { ...prev, code: event.target.value } : prev
                    )
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="edit-service-name">Nombre</Label>
                <Input
                  id="edit-service-name"
                  value={editForm?.name ?? ""}
                  onChange={(event) =>
                    setEditForm((prev) =>
                      prev ? { ...prev, name: event.target.value } : prev
                    )
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="edit-service-base-price">Precio base</Label>
                <Input
                  id="edit-service-base-price"
                  type="number"
                  min={0}
                  step="0.01"
                  value={editForm?.basePrice ?? "0"}
                  onChange={(event) =>
                    setEditForm((prev) =>
                      prev ? { ...prev, basePrice: event.target.value } : prev
                    )
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="edit-service-currency">Moneda</Label>
                <Input
                  id="edit-service-currency"
                  value={editForm?.currency ?? "USD"}
                  onChange={(event) =>
                    setEditForm((prev) =>
                      prev ? { ...prev, currency: event.target.value } : prev
                    )
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="edit-service-order">Orden</Label>
                <Input
                  id="edit-service-order"
                  type="number"
                  min={0}
                  step="1"
                  value={editForm?.sortOrder ?? "0"}
                  onChange={(event) =>
                    setEditForm((prev) =>
                      prev ? { ...prev, sortOrder: event.target.value } : prev
                    )
                  }
                />
              </div>
              <div className="space-y-1.5 md:col-span-2">
                <Label htmlFor="edit-service-description">Descripción</Label>
                <Textarea
                  id="edit-service-description"
                  value={editForm?.description ?? ""}
                  onChange={(event) =>
                    setEditForm((prev) =>
                      prev ? { ...prev, description: event.target.value } : prev
                    )
                  }
                  className="min-h-24"
                />
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setEditForm(null)}
                disabled={updateService.isPending}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={updateService.isPending}>
                {updateService.isPending ? "Guardando..." : "Guardar cambios"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </AdminPageShell>
  );
}
