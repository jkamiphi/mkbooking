"use client";

import { useMemo, useState } from "react";
import type {
  OrganizationRelationshipStatus,
  OrganizationType,
} from "@prisma/client";
import { ArrowLeft, Pencil } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { trpc } from "@/lib/trpc/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import {
  getRelationshipStatusBadgeVariant,
  RELATIONSHIP_STATUS_LABELS,
} from "../../_lib/account-labels";

interface BrandRelationshipItem {
  id: string;
  status: OrganizationRelationshipStatus;
  canCreateRequests: boolean;
  canCreateOrders: boolean;
  canViewBilling: boolean;
  canManageContacts: boolean;
  sourceOrganization: {
    id: string;
    name: string;
    isActive: boolean;
    organizationType: OrganizationType;
  };
}

interface BrandDetailModel {
  id: string;
  name: string;
  legalName: string | null;
  tradeName: string | null;
  taxId: string | null;
  isActive: boolean;
  isVerified: boolean;
  createdAt: string;
  relationships: BrandRelationshipItem[];
}

interface BrandRelationshipsContentProps {
  brand: BrandDetailModel;
  returnTo: string;
}

const relationshipStatusOptions: OrganizationRelationshipStatus[] = [
  "PENDING",
  "ACTIVE",
  "INACTIVE",
];

function permissionCheckboxClasses() {
  return "h-4 w-4 rounded border border-neutral-300 text-[#0359A8] focus:ring-[#0359A8]";
}

export function BrandRelationshipsContent({
  brand,
  returnTo,
}: BrandRelationshipsContentProps) {
  const router = useRouter();
  const utils = trpc.useUtils();

  const [agencyOrganizationId, setAgencyOrganizationId] = useState("");
  const [isLinkModalOpen, setIsLinkModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [linkRelationshipStatus, setLinkRelationshipStatus] =
    useState<OrganizationRelationshipStatus>("ACTIVE");
  const [linkCanCreateRequests, setLinkCanCreateRequests] = useState(true);
  const [linkCanCreateOrders, setLinkCanCreateOrders] = useState(true);
  const [linkCanViewBilling, setLinkCanViewBilling] = useState(false);
  const [linkCanManageContacts, setLinkCanManageContacts] = useState(false);
  const [editingRelationshipId, setEditingRelationshipId] = useState<string | null>(null);
  const [editRelationshipStatus, setEditRelationshipStatus] =
    useState<OrganizationRelationshipStatus>("ACTIVE");
  const [editCanCreateRequests, setEditCanCreateRequests] = useState(true);
  const [editCanCreateOrders, setEditCanCreateOrders] = useState(true);
  const [editCanViewBilling, setEditCanViewBilling] = useState(false);
  const [editCanManageContacts, setEditCanManageContacts] = useState(false);

  const agenciesQuery = trpc.admin.listManagedOrganizations.useQuery({
    organizationType: "AGENCY",
    isActive: true,
    skip: 0,
    take: 100,
    orderBy: "name",
    orderDirection: "asc",
  });

  const agencies = agenciesQuery.data?.managedOrganizations ?? [];
  const effectiveAgencyOrganizationId = agencyOrganizationId || agencies[0]?.id || "";

  const agencyRelationships = useMemo(() => {
    return brand.relationships
      .filter((relationship) => relationship.sourceOrganization.organizationType === "AGENCY")
      .sort((a, b) =>
        a.sourceOrganization.name.localeCompare(b.sourceOrganization.name, "es"),
      );
  }, [brand.relationships]);
  const editingRelationship = useMemo(
    () =>
      agencyRelationships.find((relationship) => relationship.id === editingRelationshipId) ??
      null,
    [agencyRelationships, editingRelationshipId],
  );

  async function invalidateViews() {
    await Promise.all([
      utils.admin.listBrands.invalidate(),
      utils.admin.listManagedOrganizations.invalidate(),
      utils.admin.listAccounts.invalidate(),
      utils.admin.stats.invalidate(),
    ]);
  }

  const upsertRelationship = trpc.admin.upsertAgencyClientRelationship.useMutation({
    onSuccess: async () => {
      await invalidateViews();
      setIsLinkModalOpen(false);
      setAgencyOrganizationId("");
      setLinkRelationshipStatus("ACTIVE");
      setLinkCanCreateRequests(true);
      setLinkCanCreateOrders(true);
      setLinkCanViewBilling(false);
      setLinkCanManageContacts(false);
      router.refresh();
      toast.success("Relación agencia-marca actualizada.");
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const updateRelationship = trpc.admin.updateAgencyClientRelationshipStatusPermissions.useMutation({
    onSuccess: async () => {
      await invalidateViews();
      setIsEditModalOpen(false);
      setEditingRelationshipId(null);
      router.refresh();
      toast.success("Relación agencia-marca actualizada.");
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  function openEditRelationshipModal(relationship: BrandRelationshipItem) {
    setEditingRelationshipId(relationship.id);
    setEditRelationshipStatus(relationship.status);
    setEditCanCreateRequests(relationship.canCreateRequests);
    setEditCanCreateOrders(relationship.canCreateOrders);
    setEditCanViewBilling(relationship.canViewBilling);
    setEditCanManageContacts(relationship.canManageContacts);
    setIsEditModalOpen(true);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Button variant="outline" onClick={() => router.push(returnTo)}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Volver a marcas
        </Button>
        <Button onClick={() => setIsLinkModalOpen(true)}>Vincular agencia</Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{brand.name}</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <Label className="text-xs text-muted-foreground">Razón social</Label>
            <p className="text-sm text-foreground">{brand.legalName || "-"}</p>
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Nombre comercial</Label>
            <p className="text-sm text-foreground">{brand.tradeName || "-"}</p>
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">RUC</Label>
            <p className="text-sm text-foreground">{brand.taxId || "-"}</p>
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Creada</Label>
            <p className="text-sm text-foreground">
              {new Date(brand.createdAt).toLocaleDateString("es-PA")}
            </p>
          </div>
          <div className="flex gap-1 md:col-span-2">
            <Badge variant={brand.isActive ? "success" : "destructive"}>
              {brand.isActive ? "Activa" : "Inactiva"}
            </Badge>
            <Badge variant={brand.isVerified ? "info" : "secondary"}>
              {brand.isVerified ? "Verificada" : "No verificada"}
            </Badge>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Relaciones existentes de esta marca</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {agencyRelationships.length > 0 ? (
            <Table>
              <TableHeader className="bg-muted/40">
                <TableRow>
                  <TableHead className="px-6">Agencia</TableHead>
                  <TableHead className="px-6">Estado</TableHead>
                  <TableHead className="px-6">Permisos</TableHead>
                  <TableHead className="px-6 text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {agencyRelationships.map((relationship) => {
                  return (
                    <TableRow key={relationship.id}>
                      <TableCell className="px-6">
                        <span className="text-sm font-medium text-foreground">
                          {relationship.sourceOrganization.name}
                        </span>
                      </TableCell>
                      <TableCell className="px-6">
                        <Badge variant={getRelationshipStatusBadgeVariant(relationship.status)}>
                          {RELATIONSHIP_STATUS_LABELS[relationship.status]}
                        </Badge>
                      </TableCell>
                      <TableCell className="px-6">
                        <div className="flex flex-wrap gap-1">
                          <Badge variant={relationship.canCreateRequests ? "success" : "secondary"}>
                            Solicitudes: {relationship.canCreateRequests ? "Sí" : "No"}
                          </Badge>
                          <Badge variant={relationship.canCreateOrders ? "success" : "secondary"}>
                            Órdenes: {relationship.canCreateOrders ? "Sí" : "No"}
                          </Badge>
                          <Badge variant={relationship.canViewBilling ? "success" : "secondary"}>
                            Facturación: {relationship.canViewBilling ? "Sí" : "No"}
                          </Badge>
                          <Badge variant={relationship.canManageContacts ? "success" : "secondary"}>
                            Contactos: {relationship.canManageContacts ? "Sí" : "No"}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell className="px-6 text-right">
                        <Button
                          variant="outline"
                          onClick={() => openEditRelationshipModal(relationship)}
                          disabled={updateRelationship.isPending || upsertRelationship.isPending}
                        >
                          <Pencil className="mr-2 h-4 w-4" />
                          Editar
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          ) : (
            <p className="p-6 text-sm text-muted-foreground">
              Esta marca no tiene relaciones de agencia registradas.
            </p>
          )}
        </CardContent>
      </Card>

      <Dialog
        open={isLinkModalOpen}
        onOpenChange={(nextOpen) => {
          setIsLinkModalOpen(nextOpen);
          if (nextOpen) return;
          setAgencyOrganizationId("");
          setLinkRelationshipStatus("ACTIVE");
          setLinkCanCreateRequests(true);
          setLinkCanCreateOrders(true);
          setLinkCanViewBilling(false);
          setLinkCanManageContacts(false);
        }}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Vincular agencia a esta marca</DialogTitle>
            <DialogDescription>
              Define estado y permisos operativos para la agencia vinculada.
            </DialogDescription>
          </DialogHeader>

          {agenciesQuery.isLoading ? (
            <p className="text-sm text-muted-foreground">Cargando agencias...</p>
          ) : null}
          {agenciesQuery.error ? (
            <p className="text-sm text-red-600">No se pudo cargar agencias activas.</p>
          ) : null}

          {agencies.length > 0 ? (
            <div className="space-y-3">
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <div>
                  <Label className="mb-1.5 block">Agencia</Label>
                  <SelectNative
                    value={effectiveAgencyOrganizationId}
                    onChange={(event) => setAgencyOrganizationId(event.target.value)}
                  >
                    {agencies.map((agency) => (
                      <option key={agency.id} value={agency.id}>
                        {agency.name}
                      </option>
                    ))}
                  </SelectNative>
                </div>

                <div>
                  <Label className="mb-1.5 block">Estado</Label>
                  <SelectNative
                    value={linkRelationshipStatus}
                    onChange={(event) =>
                      setLinkRelationshipStatus(
                        event.target.value as OrganizationRelationshipStatus,
                      )
                    }
                  >
                    {relationshipStatusOptions.map((status) => (
                      <option key={status} value={status}>
                        {RELATIONSHIP_STATUS_LABELS[status]}
                      </option>
                    ))}
                  </SelectNative>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                <label className="flex items-center gap-2 text-sm text-foreground">
                  <input
                    type="checkbox"
                    className={permissionCheckboxClasses()}
                    checked={linkCanCreateRequests}
                    onChange={(event) => setLinkCanCreateRequests(event.target.checked)}
                  />
                  Puede crear solicitudes
                </label>
                <label className="flex items-center gap-2 text-sm text-foreground">
                  <input
                    type="checkbox"
                    className={permissionCheckboxClasses()}
                    checked={linkCanCreateOrders}
                    onChange={(event) => setLinkCanCreateOrders(event.target.checked)}
                  />
                  Puede crear órdenes
                </label>
                <label className="flex items-center gap-2 text-sm text-foreground">
                  <input
                    type="checkbox"
                    className={permissionCheckboxClasses()}
                    checked={linkCanViewBilling}
                    onChange={(event) => setLinkCanViewBilling(event.target.checked)}
                  />
                  Puede ver facturación
                </label>
                <label className="flex items-center gap-2 text-sm text-foreground">
                  <input
                    type="checkbox"
                    className={permissionCheckboxClasses()}
                    checked={linkCanManageContacts}
                    onChange={(event) => setLinkCanManageContacts(event.target.checked)}
                  />
                  Puede gestionar contactos
                </label>
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              No hay agencias activas disponibles para vincular.
            </p>
          )}

          <DialogFooter>
            <Button
              onClick={() =>
                upsertRelationship.mutate({
                  agencyOrganizationId: effectiveAgencyOrganizationId,
                  brandId: brand.id,
                  status: linkRelationshipStatus,
                  canCreateRequests: linkCanCreateRequests,
                  canCreateOrders: linkCanCreateOrders,
                  canViewBilling: linkCanViewBilling,
                  canManageContacts: linkCanManageContacts,
                })
              }
              disabled={upsertRelationship.isPending || !effectiveAgencyOrganizationId}
            >
              {upsertRelationship.isPending ? "Guardando..." : "Vincular agencia"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={isEditModalOpen}
        onOpenChange={(nextOpen) => {
          setIsEditModalOpen(nextOpen);
          if (nextOpen) return;
          setEditingRelationshipId(null);
        }}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Editar relación</DialogTitle>
            <DialogDescription>
              {editingRelationship
                ? `Ajusta estado y permisos para ${editingRelationship.sourceOrganization.name}.`
                : "Ajusta estado y permisos de la relación seleccionada."}
            </DialogDescription>
          </DialogHeader>

          {editingRelationship ? (
            <div className="space-y-3">
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <div>
                  <Label className="mb-1.5 block">Agencia</Label>
                  <p className="rounded-md border px-3 py-2 text-sm text-foreground">
                    {editingRelationship.sourceOrganization.name}
                  </p>
                </div>
                <div>
                  <Label className="mb-1.5 block">Estado</Label>
                  <SelectNative
                    value={editRelationshipStatus}
                    onChange={(event) =>
                      setEditRelationshipStatus(
                        event.target.value as OrganizationRelationshipStatus,
                      )
                    }
                  >
                    {relationshipStatusOptions.map((status) => (
                      <option key={status} value={status}>
                        {RELATIONSHIP_STATUS_LABELS[status]}
                      </option>
                    ))}
                  </SelectNative>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                <label className="flex items-center gap-2 text-sm text-foreground">
                  <input
                    type="checkbox"
                    className={permissionCheckboxClasses()}
                    checked={editCanCreateRequests}
                    onChange={(event) => setEditCanCreateRequests(event.target.checked)}
                  />
                  Puede crear solicitudes
                </label>
                <label className="flex items-center gap-2 text-sm text-foreground">
                  <input
                    type="checkbox"
                    className={permissionCheckboxClasses()}
                    checked={editCanCreateOrders}
                    onChange={(event) => setEditCanCreateOrders(event.target.checked)}
                  />
                  Puede crear órdenes
                </label>
                <label className="flex items-center gap-2 text-sm text-foreground">
                  <input
                    type="checkbox"
                    className={permissionCheckboxClasses()}
                    checked={editCanViewBilling}
                    onChange={(event) => setEditCanViewBilling(event.target.checked)}
                  />
                  Puede ver facturación
                </label>
                <label className="flex items-center gap-2 text-sm text-foreground">
                  <input
                    type="checkbox"
                    className={permissionCheckboxClasses()}
                    checked={editCanManageContacts}
                    onChange={(event) => setEditCanManageContacts(event.target.checked)}
                  />
                  Puede gestionar contactos
                </label>
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              No se pudo cargar la relación seleccionada.
            </p>
          )}

          <DialogFooter>
            <Button
              onClick={() =>
                updateRelationship.mutate({
                  relationshipId: editingRelationshipId ?? "",
                  status: editRelationshipStatus,
                  canCreateRequests: editCanCreateRequests,
                  canCreateOrders: editCanCreateOrders,
                  canViewBilling: editCanViewBilling,
                  canManageContacts: editCanManageContacts,
                })
              }
              disabled={updateRelationship.isPending || !editingRelationshipId}
            >
              {updateRelationship.isPending ? "Guardando..." : "Guardar cambios"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
