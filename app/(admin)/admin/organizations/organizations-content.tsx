"use client";

import { useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { AlertTriangle, RotateCcw } from "lucide-react";
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
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { trpc } from "@/lib/trpc/client";
import { OrganizationFormDialog } from "./_components/organization-form-dialog";
import { AgencyBrandRelationshipPanel } from "../_components/agency-brand-relationship-panel";

const organizationTypeOptions = [
  { value: "ALL", label: "Todos los tipos" },
  { value: "DIRECT_CLIENT", label: "Cliente directo" },
  { value: "AGENCY", label: "Agencia" },
] as const;

const legalEntityTypeOptions = [
  { value: "ALL", label: "Todas las entidades" },
  { value: "NATURAL_PERSON", label: "Persona natural" },
  { value: "LEGAL_ENTITY", label: "Persona jurídica" },
] as const;

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

type OrganizationTypeFilter = (typeof organizationTypeOptions)[number]["value"];
type LegalEntityTypeFilter = (typeof legalEntityTypeOptions)[number]["value"];

const managedTypeLabel: Record<string, string> = {
  DIRECT_CLIENT: "Cliente directo",
  AGENCY: "Agencia",
};

const legalEntityLabel: Record<string, string> = {
  NATURAL_PERSON: "Natural",
  LEGAL_ENTITY: "Jurídica",
};

const pageSize = 15;

export function OrganizationsContent() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const parsedFilters = parseFilterState(
    searchParams,
    ["search", "organizationType", "legalEntityType", "status", "verified"] as const,
  );
  const appliedFilters = {
    search: parsedFilters.search || "",
    organizationType:
      (parsedFilters.organizationType as OrganizationTypeFilter | undefined) || "ALL",
    legalEntityType:
      (parsedFilters.legalEntityType as LegalEntityTypeFilter | undefined) || "ALL",
    status: (parsedFilters.status as "ALL" | "ACTIVE" | "INACTIVE" | undefined) || "ALL",
    verified:
      (parsedFilters.verified as "ALL" | "VERIFIED" | "NOT_VERIFIED" | undefined) || "ALL",
  };
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);
  const [draftFilters, setDraftFilters] = useState(appliedFilters);
  const [page, setPage] = useState(0);

  const listQuery = trpc.admin.listManagedOrganizations.useQuery({
    search: appliedFilters.search.trim() || undefined,
    organizationType:
      appliedFilters.organizationType === "ALL" ? undefined : appliedFilters.organizationType,
    legalEntityType:
      appliedFilters.legalEntityType === "ALL" ? undefined : appliedFilters.legalEntityType,
    isActive:
      appliedFilters.status === "ALL" ? undefined : appliedFilters.status === "ACTIVE",
    isVerified:
      appliedFilters.verified === "ALL"
        ? undefined
        : appliedFilters.verified === "VERIFIED"
          ? true
          : false,
    skip: page * pageSize,
    take: pageSize,
  });

  const rows = listQuery.data?.managedOrganizations ?? [];
  const total = listQuery.data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const isLoading = listQuery.isLoading;
  const queryError = listQuery.error;

  const rangeLabel = useMemo(() => {
    if (total === 0) return "0 resultados";
    const start = page * pageSize + 1;
    const end = Math.min((page + 1) * pageSize, total);
    return `Mostrando ${start}-${end} de ${total}`;
  }, [page, total]);

  function navigateWithFilters(nextFilters: typeof appliedFilters) {
    const params = serializeFilterState({
      search: nextFilters.search.trim() || undefined,
      organizationType:
        nextFilters.organizationType === "ALL" ? undefined : nextFilters.organizationType,
      legalEntityType:
        nextFilters.legalEntityType === "ALL" ? undefined : nextFilters.legalEntityType,
      status: nextFilters.status === "ALL" ? undefined : nextFilters.status,
      verified: nextFilters.verified === "ALL" ? undefined : nextFilters.verified,
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
      organizationType: "ALL" as OrganizationTypeFilter,
      legalEntityType: "ALL" as LegalEntityTypeFilter,
      status: "ALL" as const,
      verified: "ALL" as const,
    };
    setDraftFilters(clearedFilters);
    setPage(0);
    router.push(pathname);
    setIsFiltersOpen(false);
  }

  const activeCount = countActiveFilters({
    search: appliedFilters.search || undefined,
    organizationType:
      appliedFilters.organizationType === "ALL" ? undefined : appliedFilters.organizationType,
    legalEntityType:
      appliedFilters.legalEntityType === "ALL" ? undefined : appliedFilters.legalEntityType,
    status: appliedFilters.status === "ALL" ? undefined : appliedFilters.status,
    verified: appliedFilters.verified === "ALL" ? undefined : appliedFilters.verified,
  });

  const summaryChips = toSummaryChips(appliedFilters, [
    {
      key: "search",
      isActive: (state) => state.search.trim().length > 0,
      getLabel: (state) => `Buscar: ${state.search}`,
    },
    {
      key: "organizationType",
      isActive: (state) => state.organizationType !== "ALL",
      getLabel: (state) =>
        `Tipo: ${organizationTypeOptions.find((option) => option.value === state.organizationType)?.label ?? state.organizationType}`,
    },
    {
      key: "legalEntityType",
      isActive: (state) => state.legalEntityType !== "ALL",
      getLabel: (state) =>
        `Entidad: ${legalEntityTypeOptions.find((option) => option.value === state.legalEntityType)?.label ?? state.legalEntityType}`,
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

  const showAgencyRelationshipPanel = appliedFilters.organizationType === "AGENCY";

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
            title="Filtrar organizaciones"
            description="Gestiona clientes directos y agencias por datos comerciales y estado."
            onApply={applyFilters}
            onClear={clearFilters}
          >
            <FilterSheetSection title="Búsqueda" description="Nombre, razón social, RUC o cédula.">
              <input
                value={draftFilters.search}
                onChange={(event) =>
                  setDraftFilters((current) => ({
                    ...current,
                    search: event.target.value,
                  }))
                }
                placeholder="Nombre, razón social, RUC o cédula"
                className="h-10 w-full rounded-md border border-neutral-200 px-3 text-sm outline-none transition focus:border-[#0359A8]"
              />
            </FilterSheetSection>

            <FilterSheetSection title="Tipo">
              <SelectNative
                value={draftFilters.organizationType}
                onChange={(event) =>
                  setDraftFilters((current) => ({
                    ...current,
                    organizationType: event.target.value as OrganizationTypeFilter,
                  }))
                }
              >
                {organizationTypeOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </SelectNative>
            </FilterSheetSection>

            <FilterSheetSection title="Entidad legal">
              <SelectNative
                value={draftFilters.legalEntityType}
                onChange={(event) =>
                  setDraftFilters((current) => ({
                    ...current,
                    legalEntityType: event.target.value as LegalEntityTypeFilter,
                  }))
                }
              >
                {legalEntityTypeOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </SelectNative>
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
          </FilterSheetPanel>
        </Sheet>

        <div className="w-full sm:w-auto">
          <OrganizationFormDialog mode="create" />
        </div>
      </div>

      {showAgencyRelationshipPanel ? <AgencyBrandRelationshipPanel /> : null}

      <Card className="overflow-hidden">
        <CardHeader className="flex flex-row items-center justify-between gap-3">
          <CardTitle>Lista de organizaciones comerciales</CardTitle>
          <p className="text-sm text-muted-foreground">{rangeLabel}</p>
        </CardHeader>
        <CardContent className="space-y-4 p-0 px-6 pb-6">
          {queryError ? (
            <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-300">
              <div className="flex items-start gap-2">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                <div className="space-y-2">
                  <p>No se pudo cargar el listado de organizaciones.</p>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => void listQuery.refetch()}
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
                <TableHead className="px-6">Organización</TableHead>
                <TableHead className="px-6">Tipo</TableHead>
                <TableHead className="px-6">Entidad legal</TableHead>
                <TableHead className="px-6">Contacto</TableHead>
                <TableHead className="px-6">Estado</TableHead>
                <TableHead className="px-6">Creada</TableHead>
                <TableHead className="px-6 text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading
                ? [...Array(6)].map((_, index) => (
                    <TableRow key={`skeleton-${index}`}>
                      <TableCell className="px-6" colSpan={7}>
                        <Skeleton className="h-6 w-full" />
                      </TableCell>
                    </TableRow>
                  ))
                : null}

              {!isLoading && rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="py-8 text-center text-muted-foreground">
                    No se encontraron organizaciones con los criterios actuales.
                  </TableCell>
                </TableRow>
              ) : null}

              {!isLoading
                ? rows.map((organization) => (
                    <TableRow key={organization.id}>
                      <TableCell className="px-6">
                        <div className="space-y-0.5">
                          <p className="font-medium text-foreground">{organization.name}</p>
                          {organization.legalName ? (
                            <p className="text-xs text-muted-foreground">{organization.legalName}</p>
                          ) : null}
                        </div>
                      </TableCell>
                      <TableCell className="px-6 text-muted-foreground">
                        {managedTypeLabel[organization.managedType] ?? organization.managedType}
                      </TableCell>
                      <TableCell className="px-6 text-muted-foreground">
                        {legalEntityLabel[organization.legalEntityType] ??
                          organization.legalEntityType}
                      </TableCell>
                      <TableCell className="px-6">
                        <div className="space-y-0.5 text-sm">
                          <p className="text-muted-foreground">{organization.email ?? "Sin email"}</p>
                          <p className="text-xs text-muted-foreground">
                            {organization.phone ?? "Sin teléfono"}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell className="px-6">
                        <div className="flex gap-1">
                          <Badge variant={organization.isActive ? "success" : "destructive"}>
                            {organization.isActive ? "Activa" : "Inactiva"}
                          </Badge>
                          <Badge variant={organization.isVerified ? "info" : "secondary"}>
                            {organization.isVerified ? "Verificada" : "No verificada"}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell className="px-6 text-muted-foreground">
                        {new Date(organization.createdAt).toLocaleDateString("es-PA")}
                      </TableCell>
                      <TableCell className="px-6 text-right">
                        <OrganizationFormDialog
                          mode="edit"
                          initialData={{
                            id: organization.id,
                            name: organization.name,
                            legalName: organization.legalName,
                            tradeName: organization.tradeName,
                            email: organization.email,
                            phone: organization.phone,
                            website: organization.website,
                            taxId: organization.taxId,
                            cedula: organization.cedula,
                            industry: organization.industry,
                            addressLine1: organization.addressLine1,
                            city: organization.city,
                            province: organization.province,
                            description: organization.description,
                            organizationType:
                              organization.managedType === "AGENCY" ? "AGENCY" : "DIRECT_CLIENT",
                            legalEntityType: organization.legalEntityType,
                          }}
                        />
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
