"use client";

import { useMemo, useState } from "react";
import type { OrganizationRelationshipStatus } from "@prisma/client";
import { Link2 } from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { SelectNative } from "@/components/ui/select-native";
import {
  getRelationshipStatusBadgeVariant,
  RELATIONSHIP_STATUS_LABELS,
} from "../../_lib/account-labels";

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

const relationshipStatusOptions: OrganizationRelationshipStatus[] = [
  "PENDING",
  "ACTIVE",
  "INACTIVE",
];

function permissionCheckboxClasses() {
  return "h-4 w-4 rounded border border-neutral-300 text-[#0359A8] focus:ring-[#0359A8]";
}

export function ManageAgencyBrandRelationshipsModal() {
  const utils = trpc.useUtils();
  const [open, setOpen] = useState(false);
  const [linkAgencyId, setLinkAgencyId] = useState("");
  const [linkBrandId, setLinkBrandId] = useState("");
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

  const brandsQuery = trpc.admin.listBrands.useQuery({
    isActive: true,
    skip: 0,
    take: 100,
    orderBy: "name",
    orderDirection: "asc",
  });

  const agencies = agenciesQuery.data?.managedOrganizations ?? [];
  const brands = brandsQuery.data?.brands ?? [];
  const defaultAgencyId = agencies[0]?.id ?? "";
  const effectiveLinkAgencyId = linkAgencyId || defaultAgencyId;
  const effectiveManageAgencyId = manageAgencyId || defaultAgencyId;

  async function invalidateViews() {
    await Promise.all([
      utils.admin.listBrands.invalidate(),
      utils.admin.listManagedOrganizations.invalidate(),
      utils.admin.listAccounts.invalidate(),
      utils.admin.stats.invalidate(),
    ]);
  }

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

  const upsertRelationship = trpc.admin.upsertAgencyClientRelationship.useMutation({
    onSuccess: async () => {
      await invalidateViews();
      setLinkBrandId("");
      toast.success("Relación agencia-marca actualizada.");
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const updateRelationship = trpc.admin.updateAgencyClientRelationshipStatusPermissions.useMutation({
    onSuccess: async () => {
      await invalidateViews();
      toast.success("Relación agencia-marca actualizada.");
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen);
        if (nextOpen) return;
        setLinkAgencyId("");
        setLinkBrandId("");
        setManageAgencyId("");
        setRelationshipDrafts({});
      }}
    >
      <DialogTrigger asChild>
        <Button variant="outline">
          <Link2 className="mr-2 h-4 w-4" />
          Gestionar relaciones
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[85vh] max-w-4xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar relaciones por agencia</DialogTitle>
          <DialogDescription>
            Vincula marcas existentes y ajusta estado/permisos de relaciones por agencia.
          </DialogDescription>
        </DialogHeader>

        {agenciesQuery.isLoading || brandsQuery.isLoading || directClientsQuery.isLoading ? (
          <p className="text-sm text-muted-foreground">Cargando datos de relación...</p>
        ) : null}
        {agenciesQuery.error || brandsQuery.error || directClientsQuery.error ? (
          <p className="text-sm text-red-600">No se pudieron cargar los datos para gestionar relaciones.</p>
        ) : null}

        {!agenciesQuery.isLoading && agencies.length === 0 ? (
          <p className="text-sm text-muted-foreground">No hay agencias activas disponibles.</p>
        ) : null}

        {agencies.length > 0 ? (
          <div className="space-y-6">
            <section className="space-y-3 rounded-md border p-4">
              <h3 className="text-sm font-semibold text-foreground">Vincular marca existente</h3>
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
                    value={linkBrandId}
                    onChange={(event) => setLinkBrandId(event.target.value)}
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

              <Button
                onClick={() =>
                  upsertRelationship.mutate({
                    agencyOrganizationId: effectiveLinkAgencyId,
                    brandId: linkBrandId,
                    status: linkRelationshipStatus,
                    canCreateRequests: linkCanCreateRequests,
                    canCreateOrders: linkCanCreateOrders,
                    canViewBilling: linkCanViewBilling,
                    canManageContacts: linkCanManageContacts,
                  })
                }
                disabled={upsertRelationship.isPending || !effectiveLinkAgencyId || !linkBrandId}
              >
                {upsertRelationship.isPending ? "Guardando..." : "Vincular marca"}
              </Button>
            </section>

            <section className="space-y-3 rounded-md border p-4">
              <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                <h3 className="text-sm font-semibold text-foreground">Relaciones existentes por agencia</h3>
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
              </div>

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
                            {relationshipStatusOptions.map((status) => (
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
            </section>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
