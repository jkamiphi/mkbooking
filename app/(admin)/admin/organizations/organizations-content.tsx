"use client";

import { useEffect, useMemo, useState } from "react";
import { BadgeCheck, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { SelectNative } from "@/components/ui/select-native";
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

const organizationTypeOptions = [
  { value: "ALL", label: "Todos los tipos" },
  { value: "ADVERTISER", label: "Anunciante" },
  { value: "AGENCY", label: "Agencia" },
  { value: "MEDIA_OWNER", label: "Dueño de medios" },
  { value: "PLATFORM_ADMIN", label: "Admin de plataforma" },
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

const organizationTypeLabel: Record<string, string> = {
  ADVERTISER: "Anunciante",
  AGENCY: "Agencia",
  MEDIA_OWNER: "Dueño de medios",
  PLATFORM_ADMIN: "Admin plataforma",
};

const legalEntityLabel: Record<string, string> = {
  NATURAL_PERSON: "Natural",
  LEGAL_ENTITY: "Jurídica",
};

const pageSize = 15;

export function OrganizationsContent() {
  const [searchInput, setSearchInput] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [organizationType, setOrganizationType] =
    useState<OrganizationTypeFilter>("ALL");
  const [legalEntityType, setLegalEntityType] =
    useState<LegalEntityTypeFilter>("ALL");
  const [status, setStatus] = useState<"ALL" | "ACTIVE" | "INACTIVE">("ALL");
  const [verified, setVerified] = useState<
    "ALL" | "VERIFIED" | "NOT_VERIFIED"
  >("ALL");
  const [page, setPage] = useState(0);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedSearch(searchInput.trim());
      setPage(0);
    }, 300);
    return () => window.clearTimeout(timer);
  }, [searchInput]);

  const isSearchMode = debouncedSearch.length >= 2;

  const listQuery = trpc.organization.list.useQuery(
    {
      organizationType:
        organizationType === "ALL" ? undefined : organizationType,
      legalEntityType: legalEntityType === "ALL" ? undefined : legalEntityType,
      isActive: status === "ALL" ? undefined : status === "ACTIVE",
      isVerified:
        verified === "ALL"
          ? undefined
          : verified === "VERIFIED"
            ? true
            : false,
      skip: page * pageSize,
      take: pageSize,
    },
    { enabled: !isSearchMode }
  );

  const searchQuery = trpc.organization.search.useQuery(
    {
      query: debouncedSearch,
      take: 100,
    },
    { enabled: isSearchMode }
  );

  const rows = useMemo(() => {
    if (isSearchMode) {
      return searchQuery.data ?? [];
    }
    return listQuery.data?.organizations ?? [];
  }, [isSearchMode, listQuery.data?.organizations, searchQuery.data]);

  const total = isSearchMode ? rows.length : (listQuery.data?.total ?? 0);
  const totalPages = isSearchMode ? 1 : Math.max(1, Math.ceil(total / pageSize));
  const isLoading = isSearchMode ? searchQuery.isLoading : listQuery.isLoading;

  function clearFilters() {
    setSearchInput("");
    setDebouncedSearch("");
    setOrganizationType("ALL");
    setLegalEntityType("ALL");
    setStatus("ALL");
    setVerified("ALL");
    setPage(0);
  }

  const hasFilters =
    searchInput.length > 0 ||
    organizationType !== "ALL" ||
    legalEntityType !== "ALL" ||
    status !== "ALL" ||
    verified !== "ALL";

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex items-center gap-2 rounded-md border bg-card px-3 py-1.5 text-sm text-muted-foreground">
          <BadgeCheck className="h-4 w-4" />
          {isSearchMode
            ? `${rows.length} resultados de búsqueda`
            : `${total} organizaciones registradas`}
        </div>
        <OrganizationFormDialog mode="create" />
      </div>

      <Card>
        <CardContent className="space-y-4 pt-6">
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-6">
            <div className="relative lg:col-span-2">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
                placeholder="Buscar por nombre, razón social, RUC o cédula"
                className="pl-9"
              />
            </div>

            <SelectNative
              value={organizationType}
              onChange={(event) =>
                setOrganizationType(event.target.value as OrganizationTypeFilter)
              }
            >
              {organizationTypeOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </SelectNative>

            <SelectNative
              value={legalEntityType}
              onChange={(event) =>
                setLegalEntityType(event.target.value as LegalEntityTypeFilter)
              }
            >
              {legalEntityTypeOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </SelectNative>

            <SelectNative
              value={status}
              onChange={(event) =>
                setStatus(event.target.value as "ALL" | "ACTIVE" | "INACTIVE")
              }
            >
              {statusOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </SelectNative>

            <SelectNative
              value={verified}
              onChange={(event) =>
                setVerified(
                  event.target.value as "ALL" | "VERIFIED" | "NOT_VERIFIED"
                )
              }
            >
              {verifiedOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </SelectNative>
          </div>

          {hasFilters ? (
            <div className="flex justify-end">
              <Button variant="outline" size="sm" onClick={clearFilters}>
                <X className="mr-2 h-4 w-4" />
                Limpiar filtros
              </Button>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Card className="overflow-hidden">
        <CardContent className="p-0">
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
                            <p className="text-xs text-muted-foreground">
                              {organization.legalName}
                            </p>
                          ) : null}
                        </div>
                      </TableCell>
                      <TableCell className="px-6 text-muted-foreground">
                        {organizationTypeLabel[organization.organizationType] ??
                          organization.organizationType}
                      </TableCell>
                      <TableCell className="px-6 text-muted-foreground">
                        {legalEntityLabel[organization.legalEntityType] ??
                          organization.legalEntityType}
                      </TableCell>
                      <TableCell className="px-6">
                        <div className="space-y-0.5 text-sm">
                          <p className="text-muted-foreground">
                            {organization.email ?? "Sin email"}
                          </p>
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
                            organizationType: organization.organizationType,
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

      {!isSearchMode && totalPages > 1 ? (
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
              onClick={() =>
                setPage((current) => Math.min(totalPages - 1, current + 1))
              }
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
