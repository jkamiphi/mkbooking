"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { AlertTriangle, RotateCcw } from "lucide-react";
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
import { CreateBrandAndLinkModal } from "./_components/create-brand-and-link-modal";

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

const pageSize = 15;

type RelationshipStatusFilter = (typeof relationshipStatusOptions)[number]["value"];

export function BrandsContent() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const parsedFilters = parseFilterState(
    searchParams,
    ["search", "status", "verified", "relationshipStatus", "page"] as const,
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
  const parsedPage = Number.parseInt(parsedFilters.page || "0", 10);
  const page = Number.isFinite(parsedPage) && parsedPage >= 0 ? parsedPage : 0;

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
  const brands = brandsQuery.data?.brands ?? [];
  const total = brandsQuery.data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const rangeLabel = useMemo(() => {
    if (total === 0) return "0 resultados";
    const start = page * pageSize + 1;
    const end = Math.min((page + 1) * pageSize, total);
    return `Mostrando ${start}-${end} de ${total}`;
  }, [page, total]);

  function navigateWithFilters(nextFilters: typeof appliedFilters, nextPage = page) {
    const params = serializeFilterState({
      search: nextFilters.search.trim() || undefined,
      status: nextFilters.status === "ALL" ? undefined : nextFilters.status,
      verified: nextFilters.verified === "ALL" ? undefined : nextFilters.verified,
      relationshipStatus:
        nextFilters.relationshipStatus === "ALL"
          ? undefined
          : nextFilters.relationshipStatus,
      page: nextPage > 0 ? String(nextPage) : undefined,
    });

    const nextUrl = params.toString() ? `${pathname}?${params.toString()}` : pathname;
    router.push(nextUrl);
  }

  function applyFilters() {
    navigateWithFilters(draftFilters, 0);
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
      navigateWithFilters({
        ...appliedFilters,
        [chip.key]: chip.key === "search" ? "" : "ALL",
      }, 0);
    },
  }));

  const returnTo = searchParams.toString() ? `${pathname}?${searchParams.toString()}` : pathname;

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

        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
          <CreateBrandAndLinkModal />
        </div>
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
                <TableHead className="px-6 text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {brandsQuery.isLoading
                ? [...Array(6)].map((_, index) => (
                    <TableRow key={`brands-skeleton-${index}`}>
                      <TableCell className="px-6" colSpan={6}>
                        <Skeleton className="h-6 w-full" />
                      </TableCell>
                    </TableRow>
                  ))
                : null}

              {!brandsQuery.isLoading && brands.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
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

                      <TableCell className="px-6 text-right">
                        <Button asChild size="sm" variant="outline">
                          <Link
                            href={`/admin/accounts/brands/${brand.id}?returnTo=${encodeURIComponent(returnTo)}`}
                          >
                            Gestionar relaciones
                          </Link>
                        </Button>
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
              onClick={() => navigateWithFilters(appliedFilters, Math.max(0, page - 1))}
              disabled={page === 0}
            >
              Anterior
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => navigateWithFilters(appliedFilters, Math.min(totalPages - 1, page + 1))}
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
