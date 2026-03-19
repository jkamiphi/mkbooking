"use client";

import { useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { AlertTriangle, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import type { OrganizationRelationshipStatus } from "@prisma/client";
import { trpc } from "@/lib/trpc/client";
import {
  countActiveFilters,
  parseFilterState,
  serializeFilterState,
  toSummaryChips,
} from "@/lib/navigation/filter-state";
import {
  FilterSheetPanel,
  FilterSheetSection,
  FilterSheetToolbar,
  FilterSheetTriggerButton,
} from "@/components/ui/filter-sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SelectNative } from "@/components/ui/select-native";
import { Sheet, SheetTrigger } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
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
} from "../_lib/account-labels";

const statusOptions = [
  { value: "ALL", label: "Todos los estados" },
  { value: "ACTIVE", label: "Activa" },
  { value: "INACTIVE", label: "Inactiva" },
] as const;

const verifiedOptions = [
  { value: "ALL", label: "Todas" },
  { value: "VERIFIED", label: "Verificada" },
  { value: "NOT_VERIFIED", label: "No verificada" },
] as const;

const relationshipStatusOptions = [
  { value: "ALL", label: "Todas" },
  { value: "PENDING", label: RELATIONSHIP_STATUS_LABELS.PENDING },
  { value: "ACTIVE", label: RELATIONSHIP_STATUS_LABELS.ACTIVE },
  { value: "INACTIVE", label: RELATIONSHIP_STATUS_LABELS.INACTIVE },
] as const;

const relationshipFormStatusOptions: OrganizationRelationshipStatus[] = [
  "PENDING",
  "ACTIVE",
  "INACTIVE",
];

const pageSize = 15;

function permissionCheckboxClasses() {
  return "h-4 w-4 rounded border border-neutral-300 text-[#0359A8] focus:ring-[#0359A8]";
}

type RelationshipStatusFilter = (typeof relationshipStatusOptions)[number]["value"];

export function BrandsContent() {
  const utils = trpc.useUtils();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const parsedFilters = parseFilterState(
    searchParams,
    ["search", "status", "verified", "relationshipStatus"] as const,
  );

  const appliedFilters = {
    search: parsedFilters.search || "",
    status: (parsedFilters.status as "ALL" | "ACTIVE" | "INACTIVE" | undefined) || "ALL",
    verified:
      (parsedFilters.verified as "ALL" | "VERIFIED" | "NOT_VERIFIED" | undefined) || "ALL",
    relationshipStatus:
      (parsedFilters.relationshipStatus as RelationshipStatusFilter | undefined) || "ALL",
  };

  const [isFiltersOpen, setIsFiltersOpen] = useState(false);
  const [draftFilters, setDraftFilters] = useState(appliedFilters);
  const [page, setPage] = useState(0);

  const brandsQuery = trpc.admin.listBrands.useQuery({
    search: appliedFilters.search.trim() || undefined,
    isActive: appliedFilters.status === "ALL" ? undefined : appliedFilters.status === "ACTIVE",
    isVerified:
      appliedFilters.verified === "ALL"
        ? undefined
        : appliedFilters.verified === "VERIFIED"
          ? true
          : false,
    relationshipStatus:
      appliedFilters.relationshipStatus === "ALL"
        ? undefined
        : appliedFilters.relationshipStatus,
    skip: page * pageSize,
    take: pageSize,
  });

  const agenciesQuery = trpc.admin.listManagedOrganizations.useQuery({
    organizationType: "AGENCY",
    isActive: true,
    skip: 0,
    take: 300,
    orderBy: "name",
    orderDirection: "asc",
  });

  const directClientsQuery = trpc.admin.listManagedOrganizations.useQuery({
    organizationType: "DIRECT_CLIENT",
    isActive: true,
    skip: 0,
    take: 300,
    orderBy: "name",
    orderDirection: "asc",
  });

  const allBrandsForLinkQuery = trpc.admin.listBrands.useQuery({
    isActive: true,
    skip: 0,
    take: 300,
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

  const agencies = agenciesQuery.data?.managedOrganizations ?? [];
  const brands = brandsQuery.data?.brands ?? [];
  const total = brandsQuery.data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const defaultAgencyId = agencies[0]?.id ?? "";
  const effectiveNewBrandAgencyId = newBrandAgencyId || defaultAgencyId;
  const effectiveLinkAgencyId = linkAgencyId || defaultAgencyId;

  const advertiserOptions = useMemo(() => {
    const unique = new Map<string, { id: string; name: string; sourceLabel: string }>();

    for (const organization of directClientsQuery.data?.managedOrganizations ?? []) {
      unique.set(organization.id, {
        id: organization.id,
        name: organization.name,
        sourceLabel: "Cliente directo",
      });
    }

    for (const brand of allBrandsForLinkQuery.data?.brands ?? []) {
      unique.set(brand.id, {
        id: brand.id,
        name: brand.name,
        sourceLabel: "Marca",
      });
    }

    return Array.from(unique.values()).sort((a, b) => a.name.localeCompare(b.name, "es"));
  }, [allBrandsForLinkQuery.data?.brands, directClientsQuery.data?.managedOrganizations]);

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

  const rangeLabel = useMemo(() => {
    if (total === 0) return "0 resultados";
    const start = page * pageSize + 1;
    const end = Math.min((page + 1) * pageSize, total);
    return `Mostrando ${start}-${end} de ${total}`;
  }, [page, total]);

  function navigateWithFilters(nextFilters: typeof appliedFilters) {
    const params = serializeFilterState({
      search: nextFilters.search.trim() || undefined,
      status: nextFilters.status === "ALL" ? undefined : nextFilters.status,
      verified: nextFilters.verified === "ALL" ? undefined : nextFilters.verified,
      relationshipStatus:
        nextFilters.relationshipStatus === "ALL"
          ? undefined
          : nextFilters.relationshipStatus,
    });

    const nextUrl = params.toString() ? `${pathname}?${params.toString()}` : pathname;
    router.push(nextUrl);
  }

  function applyFilters() {
    setPage(0);
    navigateWithFilters(draftFilters);
    setIsFiltersOpen(false);
  }

  function clearFilters() {
    const clearedFilters = {
      search: "",
      status: "ALL" as const,
      verified: "ALL" as const,
      relationshipStatus: "ALL" as RelationshipStatusFilter,
    };
    setDraftFilters(clearedFilters);
    setPage(0);
    router.push(pathname);
    setIsFiltersOpen(false);
  }

  const activeCount = countActiveFilters({
    search: appliedFilters.search || undefined,
    status: appliedFilters.status === "ALL" ? undefined : appliedFilters.status,
    verified: appliedFilters.verified === "ALL" ? undefined : appliedFilters.verified,
    relationshipStatus:
      appliedFilters.relationshipStatus === "ALL" ? undefined : appliedFilters.relationshipStatus,
  });

  const summaryChips = toSummaryChips(appliedFilters, [
    {
      key: "search",
      isActive: (state) => state.search.trim().length > 0,
      getLabel: (state) => `Buscar: ${state.search}`,
    },
    {
      key: "status",
      isActive: (state) => state.status !== "ALL",
      getLabel: (state) =>
        `Estado: ${statusOptions.find((option) => option.value === state.status)?.label ?? state.status}`,
    },
    {
      key: "verified",
      isActive: (state) => state.verified !== "ALL",
      getLabel: (state) =>
        `Verificación: ${verifiedOptions.find((option) => option.value === state.verified)?.label ?? state.verified}`,
    },
    {
      key: "relationshipStatus",
      isActive: (state) => state.relationshipStatus !== "ALL",
      getLabel: (state) =>
        `Relación: ${relationshipStatusOptions.find((option) => option.value === state.relationshipStatus)?.label ?? state.relationshipStatus}`,
    },
  ]).map((chip) => ({
    ...chip,
    onRemove: () => {
      setPage(0);
      navigateWithFilters({
        ...appliedFilters,
        [chip.key]: chip.key === "search" ? "" : "ALL",
      });
    },
  }));

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <Sheet
          open={isFiltersOpen}
          onOpenChange={(open) => {
            if (open) {
              setDraftFilters(appliedFilters);
              setIsFiltersOpen(true);
              return;
            }
            setIsFiltersOpen(false);
          }}
        >
          <FilterSheetToolbar
            summaryChips={summaryChips}
            onClearAll={activeCount > 0 ? clearFilters : undefined}
          >
            <SheetTrigger asChild>
              <FilterSheetTriggerButton activeCount={activeCount} />
            </SheetTrigger>
          </FilterSheetToolbar>

          <FilterSheetPanel
            title="Filtrar marcas"
            description="Segmenta por estado comercial y situación de vínculo con agencias."
            onApply={applyFilters}
            onClear={clearFilters}
          >
            <FilterSheetSection title="Búsqueda" description="Nombre, razón social o RUC.">
              <input
                value={draftFilters.search}
                onChange={(event) =>
                  setDraftFilters((current) => ({
                    ...current,
                    search: event.target.value,
                  }))
                }
                placeholder="Nombre, razón social o RUC"
                className="h-10 w-full rounded-md border border-neutral-200 px-3 text-sm outline-none transition focus:border-[#0359A8]"
              />
            </FilterSheetSection>

            <FilterSheetSection title="Estado">
              <SelectNative
                value={draftFilters.status}
                onChange={(event) =>
                  setDraftFilters((current) => ({
                    ...current,
                    status: event.target.value as "ALL" | "ACTIVE" | "INACTIVE",
                  }))
                }
              >
                {statusOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </SelectNative>
            </FilterSheetSection>

            <FilterSheetSection title="Verificación">
              <SelectNative
                value={draftFilters.verified}
                onChange={(event) =>
                  setDraftFilters((current) => ({
                    ...current,
                    verified: event.target.value as "ALL" | "VERIFIED" | "NOT_VERIFIED",
                  }))
                }
              >
                {verifiedOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </SelectNative>
            </FilterSheetSection>

            <FilterSheetSection title="Estado de relación">
              <SelectNative
                value={draftFilters.relationshipStatus}
                onChange={(event) =>
                  setDraftFilters((current) => ({
                    ...current,
                    relationshipStatus: event.target.value as RelationshipStatusFilter,
                  }))
                }
              >
                {relationshipStatusOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </SelectNative>
            </FilterSheetSection>
          </FilterSheetPanel>
        </Sheet>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Crear marca y vincularla a agencia</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {agencies.length > 0 ? (
              <>
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
                    <Input
                      value={newBrandName}
                      onChange={(event) => setNewBrandName(event.target.value)}
                    />
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
                    <Input
                      value={newBrandTaxId}
                      onChange={(event) => setNewBrandTaxId(event.target.value)}
                    />
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
                    createBrandAndLink.isPending ||
                    !effectiveNewBrandAgencyId ||
                    !newBrandName.trim()
                  }
                >
                  {createBrandAndLink.isPending ? "Creando..." : "Crear y vincular"}
                </Button>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">
                No hay agencias activas disponibles para vincular marcas.
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Vincular marca existente</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {agencies.length > 0 ? (
              <>
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
                        setLinkRelationshipStatus(
                          event.target.value as OrganizationRelationshipStatus,
                        )
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
                  disabled={
                    upsertRelationship.isPending || !effectiveLinkAgencyId || !linkAdvertiserId
                  }
                >
                  {upsertRelationship.isPending ? "Guardando..." : "Vincular marca"}
                </Button>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">
                No hay agencias activas disponibles para crear relaciones.
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="overflow-hidden">
        <CardHeader className="flex flex-row items-center justify-between gap-3">
          <CardTitle>Listado de marcas</CardTitle>
          <p className="text-sm text-muted-foreground">{rangeLabel}</p>
        </CardHeader>
        <CardContent className="space-y-4 p-0 px-6 pb-6">
          {brandsQuery.error ? (
            <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-300">
              <div className="flex items-start gap-2">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                <div className="space-y-2">
                  <p>No se pudo cargar el listado de marcas.</p>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => void brandsQuery.refetch()}
                    className="border-red-300 text-red-700 hover:bg-red-100 dark:border-red-800 dark:text-red-300 dark:hover:bg-red-900/40"
                  >
                    <RotateCcw className="mr-2 h-4 w-4" />
                    Reintentar
                  </Button>
                </div>
              </div>
            </div>
          ) : null}

          <Table>
            <TableHeader className="bg-muted/40">
              <TableRow>
                <TableHead className="px-6">Marca</TableHead>
                <TableHead className="px-6">Datos comerciales</TableHead>
                <TableHead className="px-6">Agencias vinculadas</TableHead>
                <TableHead className="px-6">Estado</TableHead>
                <TableHead className="px-6">Creada</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {brandsQuery.isLoading
                ? [...Array(6)].map((_, index) => (
                    <TableRow key={`brands-skeleton-${index}`}>
                      <TableCell className="px-6" colSpan={5}>
                        <Skeleton className="h-6 w-full" />
                      </TableCell>
                    </TableRow>
                  ))
                : null}

              {!brandsQuery.isLoading && brands.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">
                    No se encontraron marcas con los criterios actuales.
                  </TableCell>
                </TableRow>
              ) : null}

              {!brandsQuery.isLoading
                ? brands.map((brand) => (
                    <TableRow key={brand.id}>
                      <TableCell className="px-6">
                        <div className="space-y-0.5">
                          <p className="font-medium text-foreground">{brand.name}</p>
                          {brand.legalName ? (
                            <p className="text-xs text-muted-foreground">{brand.legalName}</p>
                          ) : null}
                        </div>
                      </TableCell>

                      <TableCell className="px-6">
                        <div className="space-y-1 text-sm">
                          <p className="text-muted-foreground">
                            Comercial: {brand.tradeName ?? "Sin nombre comercial"}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            RUC: {brand.taxId ?? "Sin RUC"}
                          </p>
                        </div>
                      </TableCell>

                      <TableCell className="px-6">
                        <div className="space-y-2">
                          <div className="flex flex-wrap gap-1">
                            {brand.linkedAgencies.slice(0, 3).map((relationship) => (
                              <Badge
                                key={relationship.id}
                                variant={getRelationshipStatusBadgeVariant(relationship.status)}
                              >
                                {relationship.sourceOrganization.name}: {RELATIONSHIP_STATUS_LABELS[relationship.status]}
                              </Badge>
                            ))}
                            {brand.linkedAgencies.length > 3 ? (
                              <Badge variant="outline">+{brand.linkedAgencies.length - 3} más</Badge>
                            ) : null}
                          </div>
                          <p className="text-xs text-muted-foreground">
                            Activas: {brand.relationshipSummary.active} · Pendientes: {brand.relationshipSummary.pending} · Inactivas: {brand.relationshipSummary.inactive}
                          </p>
                        </div>
                      </TableCell>

                      <TableCell className="px-6">
                        <div className="flex gap-1">
                          <Badge variant={brand.isActive ? "success" : "destructive"}>
                            {brand.isActive ? "Activa" : "Inactiva"}
                          </Badge>
                          <Badge variant={brand.isVerified ? "info" : "secondary"}>
                            {brand.isVerified ? "Verificada" : "No verificada"}
                          </Badge>
                        </div>
                      </TableCell>

                      <TableCell className="px-6 text-muted-foreground">
                        {new Date(brand.createdAt).toLocaleDateString("es-PA")}
                      </TableCell>
                    </TableRow>
                  ))
                : null}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {totalPages > 1 ? (
        <div className="flex items-center justify-between rounded-md border bg-card px-4 py-3">
          <p className="text-sm text-muted-foreground">
            Página {page + 1} de {totalPages} · {total} resultados
          </p>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setPage((current) => Math.max(0, current - 1))}
              disabled={page === 0}
            >
              Anterior
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setPage((current) => Math.min(totalPages - 1, current + 1))}
              disabled={page >= totalPages - 1}
            >
              Siguiente
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
