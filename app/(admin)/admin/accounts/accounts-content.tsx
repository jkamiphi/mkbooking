"use client";

import { useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type {
  OrganizationRelationshipStatus,
  OrganizationType,
  SystemRole,
  UserAccountType,
} from "@prisma/client";
import { trpc } from "@/lib/trpc/client";
import { parseFilterState, serializeFilterState } from "@/lib/navigation/filter-state";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { CreateUserModal } from "../users/_components/create-user-modal";
import { ACCOUNT_TYPE_LABELS } from "./_lib/account-labels";
import { AccountFilters } from "./_components/account-filters";
import { AccountsListTable } from "./_components/accounts-list-table";

interface AccountFiltersState {
  search?: string;
  systemRole?: SystemRole;
  accountType?: UserAccountType;
  isActive?: boolean;
  organizationType?: OrganizationType;
  relationshipStatus?: OrganizationRelationshipStatus;
}

const pageSize = 20;

export function AccountsContent() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const parsedFilters = parseFilterState(
    searchParams,
    [
      "search",
      "systemRole",
      "accountType",
      "isActive",
      "organizationType",
      "relationshipStatus",
    ] as const,
  );

  const filters: AccountFiltersState = {
    search: parsedFilters.search || undefined,
    systemRole: (parsedFilters.systemRole as SystemRole | undefined) || undefined,
    accountType:
      (parsedFilters.accountType as UserAccountType | undefined) || undefined,
    isActive:
      parsedFilters.isActive === "true"
        ? true
        : parsedFilters.isActive === "false"
          ? false
          : undefined,
    organizationType:
      (parsedFilters.organizationType as OrganizationType | undefined) || undefined,
    relationshipStatus:
      (parsedFilters.relationshipStatus as OrganizationRelationshipStatus | undefined) ||
      undefined,
  };

  const [page, setPage] = useState(0);

  const statsQuery = trpc.admin.stats.useQuery();
  const accountsQuery = trpc.admin.listAccounts.useQuery({
    ...filters,
    skip: page * pageSize,
    take: pageSize,
  });

  const activeFilterLabels = useMemo(() => {
    const labels: string[] = [];
    if (filters.accountType) {
      labels.push(ACCOUNT_TYPE_LABELS[filters.accountType]);
    }
    if (filters.relationshipStatus) {
      labels.push(`Relación ${filters.relationshipStatus.toLowerCase()}`);
    }
    if (filters.organizationType) {
      labels.push(`Org ${filters.organizationType.toLowerCase()}`);
    }
    return labels;
  }, [filters.accountType, filters.organizationType, filters.relationshipStatus]);

  function handleFiltersChange(nextFilters: AccountFiltersState) {
    setPage(0);
    const params = serializeFilterState({
      search: nextFilters.search,
      systemRole: nextFilters.systemRole,
      accountType: nextFilters.accountType,
      isActive:
        nextFilters.isActive === undefined ? undefined : String(nextFilters.isActive),
      organizationType: nextFilters.organizationType,
      relationshipStatus: nextFilters.relationshipStatus,
    });

    const nextUrl = params.toString() ? `${pathname}?${params.toString()}` : pathname;
    router.push(nextUrl);
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-4">
            <p className="text-sm text-muted-foreground">Usuarios totales</p>
            <p className="text-2xl font-semibold text-foreground">
              {statsQuery.data?.totalUsers ?? 0}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-sm text-muted-foreground">Activos</p>
            <p className="text-2xl font-semibold text-foreground">
              {statsQuery.data?.activeUsers ?? 0}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-sm text-muted-foreground">Staff operativo</p>
            <p className="text-2xl font-semibold text-foreground">
              {statsQuery.data?.staffUsers ?? 0}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="space-y-2 pt-4">
            <p className="text-sm text-muted-foreground">Filtros activos</p>
            <div className="flex flex-wrap gap-1">
              {activeFilterLabels.length > 0 ? (
                activeFilterLabels.map((label) => (
                  <Badge key={label} variant="info">
                    {label}
                  </Badge>
                ))
              ) : (
                <span className="text-sm text-muted-foreground">Sin filtros específicos</span>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <AccountFilters
        filters={filters}
        onFiltersChange={handleFiltersChange}
        actions={<CreateUserModal onCreated={() => setPage(0)} />}
      />

      <AccountsListTable
        accounts={accountsQuery.data?.accounts ?? []}
        total={accountsQuery.data?.total ?? 0}
        isLoading={accountsQuery.isLoading}
        isFetching={accountsQuery.isFetching}
        error={accountsQuery.error?.message}
        onRetry={() => void accountsQuery.refetch()}
        page={page}
        pageSize={pageSize}
        onPageChange={setPage}
      />
    </div>
  );
}
