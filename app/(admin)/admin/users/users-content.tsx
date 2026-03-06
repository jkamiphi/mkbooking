"use client";

import { useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { trpc } from "@/lib/trpc/client";
import { parseFilterState, serializeFilterState } from "@/lib/navigation/filter-state";
import { UserListTable } from "./_components/user-list-table";
import { UserFilters } from "./_components/user-filters";
import { UserStats } from "./_components/user-stats";
import { CreateUserModal } from "./_components/create-user-modal";
import type { SystemRole } from "@prisma/client";

export function UsersContent() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const parsedFilters = parseFilterState(
    searchParams,
    ["systemRole", "isActive", "search"] as const,
  );
  const filters: {
    systemRole?: SystemRole;
    isActive?: boolean;
    search?: string;
  } = {
    systemRole: (parsedFilters.systemRole as SystemRole | undefined) || undefined,
    isActive:
      parsedFilters.isActive === "true"
        ? true
        : parsedFilters.isActive === "false"
          ? false
          : undefined,
    search: parsedFilters.search || undefined,
  };
  const [page, setPage] = useState(0);
  const pageSize = 20;

  const { data: stats, isLoading: statsLoading } = trpc.admin.stats.useQuery();

  const usersQuery = trpc.admin.listUsers.useQuery(
    {
      ...filters,
      skip: page * pageSize,
      take: pageSize,
    }
  );

  function handleFiltersChange(newFilters: typeof filters) {
    setPage(0);
    const params = serializeFilterState({
      systemRole: newFilters.systemRole,
      isActive:
        newFilters.isActive === undefined ? undefined : String(newFilters.isActive),
      search: newFilters.search,
    });

    const nextUrl = params.toString() ? `${pathname}?${params.toString()}` : pathname;
    router.push(nextUrl);
  }

  return (
    <div className="space-y-6">
      <UserStats stats={stats} isLoading={statsLoading} />

      <UserFilters
        filters={filters}
        onFiltersChange={handleFiltersChange}
        actions={<CreateUserModal onCreated={() => setPage(0)} />}
      />

      <UserListTable
        users={usersQuery.data?.profiles ?? []}
        total={usersQuery.data?.total ?? 0}
        isLoading={usersQuery.isLoading}
        isFetching={usersQuery.isFetching}
        error={usersQuery.error?.message}
        onRetry={() => void usersQuery.refetch()}
        page={page}
        pageSize={pageSize}
        onPageChange={setPage}
      />
    </div>
  );
}
