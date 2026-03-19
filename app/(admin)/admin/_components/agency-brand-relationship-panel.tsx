"use client";

import { useMemo, useState } from "react";
import type { OrganizationRelationshipStatus } from "@prisma/client";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SelectNative } from "@/components/ui/select-native";
import {
  getRelationshipStatusBadgeVariant,
  RELATIONSHIP_STATUS_LABELS,
} from "../accounts/_lib/account-labels";

const relationshipFormStatusOptions: OrganizationRelationshipStatus[] = [
  "PENDING",
  "ACTIVE",
  "INACTIVE",
];

interface RelationshipDraft {
  status: OrganizationRelationshipStatus;
  canCreateRequests: boolean;
  canCreateOrders: boolean;
  canViewBilling: boolean;
  canManageContacts: boolean;
}

interface AgencyBrandRelationshipRecord {
  id: string;
  brandName: string;
  status: OrganizationRelationshipStatus;
  canCreateRequests: boolean;
  canCreateOrders: boolean;
  canViewBilling: boolean;
  canManageContacts: boolean;
}

function permissionCheckboxClasses() {
  return "h-4 w-4 rounded border border-neutral-300 text-[#0359A8] focus:ring-[#0359A8]";
}

export function AgencyBrandRelationshipPanel() {
  const utils = trpc.useUtils();

  const agenciesQuery = trpc.admin.listManagedOrganizations.useQuery({
    organizationType: "AGENCY",
    isActive: true,
    skip: 0,
    take: 100,
    orderBy: "name",
    orderDirection: "asc",
  });

  const directClientsQuery = trpc.admin.listManagedOrganizations.useQuery({
    organizationType: "DIRECT_CLIENT",
    isActive: true,
    skip: 0,
    take: 100,
    orderBy: "name",
    orderDirection: "asc",
  });

  const brandsForRelationshipQuery = trpc.admin.listBrands.useQuery({
    isActive: true,
    skip: 0,
    take: 100,
    orderBy: "name",
    orderDirection: "asc",
  });

  const [newBrandAgencyId, setNewBrandAgencyId] = useState("");
  const [newBrandName, setNewBrandName] = useState("");
  const [newBrandLegalName, setNewBrandLegalName] = useState("");
  const [newBrandTradeName, setNewBrandTradeName] = useState("");
  const [newBrandTaxId, setNewBrandTaxId] = useState("");

  const [linkAgencyId, setLinkAgencyId] = useState("");
  const [linkAdvertiserId, setLinkAdvertiserId] = useState("");
  const [linkRelationshipStatus, setLinkRelationshipStatus] =
    useState<OrganizationRelationshipStatus>("ACTIVE");
  const [linkCanCreateRequests, setLinkCanCreateRequests] = useState(true);
  const [linkCanCreateOrders, setLinkCanCreateOrders] = useState(true);
  const [linkCanViewBilling, setLinkCanViewBilling] = useState(false);
  const [linkCanManageContacts, setLinkCanManageContacts] = useState(false);

  const [manageAgencyId, setManageAgencyId] = useState("");
  const [relationshipDrafts, setRelationshipDrafts] = useState<
    Record<string, RelationshipDraft>
  >({});

  const agencies = agenciesQuery.data?.managedOrganizations ?? [];
  const brands = brandsForRelationshipQuery.data?.brands ?? [];

  const defaultAgencyId = agencies[0]?.id ?? "";
  const effectiveNewBrandAgencyId = newBrandAgencyId || defaultAgencyId;
  const effectiveLinkAgencyId = linkAgencyId || defaultAgencyId;
  const effectiveManageAgencyId = manageAgencyId || defaultAgencyId;

  const advertiserOptions = useMemo(() => {
    const unique = new Map<string, { id: string; name: string; sourceLabel: string }>();

    for (const organization of directClientsQuery.data?.managedOrganizations ?? []) {
      unique.set(organization.id, {
        id: organization.id,
        name: organization.name,
        sourceLabel: "Cliente directo",
      });
    }

    for (const brand of brands) {
      unique.set(brand.id, {
        id: brand.id,
        name: brand.name,
        sourceLabel: "Marca",
      });
    }

    return Array.from(unique.values()).sort((a, b) => a.name.localeCompare(b.name, "es"));
  }, [brands, directClientsQuery.data?.managedOrganizations]);

  const agencyRelationships = useMemo<AgencyBrandRelationshipRecord[]>(() => {
    if (!effectiveManageAgencyId) {
      return [];
    }

    return brands
      .flatMap((brand) =>
        brand.linkedAgencies
          .filter((relationship) => relationship.sourceOrganization.id === effectiveManageAgencyId)
          .map((relationship) => ({
            id: relationship.id,
            brandName: brand.name,
            status: relationship.status,
            canCreateRequests: relationship.canCreateRequests,
            canCreateOrders: relationship.canCreateOrders,
            canViewBilling: relationship.canViewBilling,
            canManageContacts: relationship.canManageContacts,
          })),
      )
      .sort((a, b) => a.brandName.localeCompare(b.brandName, "es"));
  }, [brands, effectiveManageAgencyId]);

  async function invalidateBrandViews() {
    await Promise.all([
      utils.admin.listBrands.invalidate(),
      utils.admin.listManagedOrganizations.invalidate(),
      utils.admin.listAccounts.invalidate(),
      utils.admin.stats.invalidate(),
    ]);
  }

  const createBrandAndLink = trpc.admin.createBrandAndLinkToAgency.useMutation({
    onSuccess: async () => {
      await invalidateBrandViews();
      setNewBrandName("");
      setNewBrandLegalName("");
      setNewBrandTradeName("");
      setNewBrandTaxId("");
      toast.success("Marca creada y vinculada.");
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const upsertRelationship = trpc.admin.upsertAgencyClientRelationship.useMutation({
    onSuccess: async () => {
      await invalidateBrandViews();
      toast.success("Relación agencia-marca actualizada.");
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const updateRelationship = trpc.admin.updateAgencyClientRelationshipStatusPermissions.useMutation({
    onSuccess: async () => {
      await invalidateBrandViews();
      toast.success("Relación agencia-marca actualizada.");
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  if (agencies.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Relaciones agencia-marca</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            No hay agencias activas disponibles para crear o gestionar relaciones.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Crear marca y vincularla a agencia</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <Label className="mb-1.5 block">Agencia operativa</Label>
            <SelectNative
              value={effectiveNewBrandAgencyId}
              onChange={(event) => setNewBrandAgencyId(event.target.value)}
            >
              {agencies.map((agency) => (
                <option key={agency.id} value={agency.id}>
                  {agency.name}
                </option>
              ))}
            </SelectNative>
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <div>
              <Label className="mb-1.5 block">Nombre de marca *</Label>
              <Input value={newBrandName} onChange={(event) => setNewBrandName(event.target.value)} />
            </div>
            <div>
              <Label className="mb-1.5 block">Razón social</Label>
              <Input
                value={newBrandLegalName}
                onChange={(event) => setNewBrandLegalName(event.target.value)}
              />
            </div>
            <div>
              <Label className="mb-1.5 block">Nombre comercial</Label>
              <Input
                value={newBrandTradeName}
                onChange={(event) => setNewBrandTradeName(event.target.value)}
              />
            </div>
            <div>
              <Label className="mb-1.5 block">RUC / Tax ID</Label>
              <Input value={newBrandTaxId} onChange={(event) => setNewBrandTaxId(event.target.value)} />
            </div>
          </div>

          <Button
            onClick={() =>
              createBrandAndLink.mutate({
                agencyOrganizationId: effectiveNewBrandAgencyId,
                name: newBrandName,
                legalName: newBrandLegalName || undefined,
                tradeName: newBrandTradeName || undefined,
                taxId: newBrandTaxId || undefined,
              })
            }
            disabled={
              createBrandAndLink.isPending || !effectiveNewBrandAgencyId || !newBrandName.trim()
            }
          >
            {createBrandAndLink.isPending ? "Creando..." : "Crear y vincular"}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Vincular marca existente</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <div>
              <Label className="mb-1.5 block">Agencia</Label>
              <SelectNative
                value={effectiveLinkAgencyId}
                onChange={(event) => setLinkAgencyId(event.target.value)}
              >
                <option value="">Selecciona agencia</option>
                {agencies.map((agency) => (
                  <option key={agency.id} value={agency.id}>
                    {agency.name}
                  </option>
                ))}
              </SelectNative>
            </div>

            <div>
              <Label className="mb-1.5 block">Marca / cliente</Label>
              <SelectNative
                value={linkAdvertiserId}
                onChange={(event) => setLinkAdvertiserId(event.target.value)}
              >
                <option value="">Selecciona marca o cliente</option>
                {advertiserOptions.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.name} ({option.sourceLabel})
                  </option>
                ))}
              </SelectNative>
            </div>

            <div>
              <Label className="mb-1.5 block">Estado</Label>
              <SelectNative
                value={linkRelationshipStatus}
                onChange={(event) =>
                  setLinkRelationshipStatus(event.target.value as OrganizationRelationshipStatus)
                }
              >
                {relationshipFormStatusOptions.map((status) => (
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

          <Button
            onClick={() =>
              upsertRelationship.mutate({
                agencyOrganizationId: effectiveLinkAgencyId,
                brandId: linkAdvertiserId,
                status: linkRelationshipStatus,
                canCreateRequests: linkCanCreateRequests,
                canCreateOrders: linkCanCreateOrders,
                canViewBilling: linkCanViewBilling,
                canManageContacts: linkCanManageContacts,
              })
            }
            disabled={upsertRelationship.isPending || !effectiveLinkAgencyId || !linkAdvertiserId}
          >
            {upsertRelationship.isPending ? "Guardando..." : "Vincular marca"}
          </Button>
        </CardContent>
      </Card>

      <Card className="xl:col-span-2">
        <CardHeader className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <CardTitle>Editar relaciones por agencia</CardTitle>
          <div className="w-full md:w-[320px]">
            <SelectNative
              value={effectiveManageAgencyId}
              onChange={(event) => setManageAgencyId(event.target.value)}
            >
              {agencies.map((agency) => (
                <option key={agency.id} value={agency.id}>
                  {agency.name}
                </option>
              ))}
            </SelectNative>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {agencyRelationships.length > 0 ? (
            agencyRelationships.map((relationship) => {
              const draft = relationshipDrafts[relationship.id] ?? {
                status: relationship.status,
                canCreateRequests: relationship.canCreateRequests,
                canCreateOrders: relationship.canCreateOrders,
                canViewBilling: relationship.canViewBilling,
                canManageContacts: relationship.canManageContacts,
              };

              return (
                <div key={relationship.id} className="rounded-md border p-3">
                  <div className="mb-3 flex flex-wrap items-center gap-2">
                    <p className="text-sm font-medium text-foreground">{relationship.brandName}</p>
                    <Badge variant={getRelationshipStatusBadgeVariant(draft.status)}>
                      {RELATIONSHIP_STATUS_LABELS[draft.status]}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                    <div>
                      <Label className="mb-1.5 block">Estado</Label>
                      <SelectNative
                        value={draft.status}
                        onChange={(event) =>
                          setRelationshipDrafts((current) => ({
                            ...current,
                            [relationship.id]: {
                              ...draft,
                              status: event.target.value as OrganizationRelationshipStatus,
                            },
                          }))
                        }
                      >
                        {relationshipFormStatusOptions.map((status) => (
                          <option key={status} value={status}>
                            {RELATIONSHIP_STATUS_LABELS[status]}
                          </option>
                        ))}
                      </SelectNative>
                    </div>
                  </div>

                  <div className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-2">
                    <label className="flex items-center gap-2 text-sm text-foreground">
                      <input
                        type="checkbox"
                        className={permissionCheckboxClasses()}
                        checked={draft.canCreateRequests}
                        onChange={(event) =>
                          setRelationshipDrafts((current) => ({
                            ...current,
                            [relationship.id]: {
                              ...draft,
                              canCreateRequests: event.target.checked,
                            },
                          }))
                        }
                      />
                      Puede crear solicitudes
                    </label>
                    <label className="flex items-center gap-2 text-sm text-foreground">
                      <input
                        type="checkbox"
                        className={permissionCheckboxClasses()}
                        checked={draft.canCreateOrders}
                        onChange={(event) =>
                          setRelationshipDrafts((current) => ({
                            ...current,
                            [relationship.id]: {
                              ...draft,
                              canCreateOrders: event.target.checked,
                            },
                          }))
                        }
                      />
                      Puede crear órdenes
                    </label>
                    <label className="flex items-center gap-2 text-sm text-foreground">
                      <input
                        type="checkbox"
                        className={permissionCheckboxClasses()}
                        checked={draft.canViewBilling}
                        onChange={(event) =>
                          setRelationshipDrafts((current) => ({
                            ...current,
                            [relationship.id]: {
                              ...draft,
                              canViewBilling: event.target.checked,
                            },
                          }))
                        }
                      />
                      Puede ver facturación
                    </label>
                    <label className="flex items-center gap-2 text-sm text-foreground">
                      <input
                        type="checkbox"
                        className={permissionCheckboxClasses()}
                        checked={draft.canManageContacts}
                        onChange={(event) =>
                          setRelationshipDrafts((current) => ({
                            ...current,
                            [relationship.id]: {
                              ...draft,
                              canManageContacts: event.target.checked,
                            },
                          }))
                        }
                      />
                      Puede gestionar contactos
                    </label>
                  </div>

                  <Button
                    className="mt-3"
                    variant="outline"
                    onClick={() =>
                      updateRelationship.mutate({
                        relationshipId: relationship.id,
                        status: draft.status,
                        canCreateRequests: draft.canCreateRequests,
                        canCreateOrders: draft.canCreateOrders,
                        canViewBilling: draft.canViewBilling,
                        canManageContacts: draft.canManageContacts,
                      })
                    }
                    disabled={updateRelationship.isPending}
                  >
                    Guardar relación
                  </Button>
                </div>
              );
            })
          ) : (
            <p className="text-sm text-muted-foreground">
              La agencia seleccionada no tiene relaciones registradas.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
