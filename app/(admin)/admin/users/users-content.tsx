"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { trpc } from "@/lib/trpc/client";
import { UserListTable } from "./_components/user-list-table";
import { UserFilters } from "./_components/user-filters";
import { UserStats } from "./_components/user-stats";
import { CreateUserModal } from "./_components/create-user-modal";
import type { SystemRole } from "@prisma/client";

export function UsersContent() {
  const searchParams = useSearchParams();

  // Initialize filters from URL params
  const initialRole = searchParams.get("systemRole") as SystemRole | null;
  const initialActive = searchParams.get("isActive");

  const [filters, setFilters] = useState<{
    systemRole?: SystemRole;
    isActive?: boolean;
    search?: string;
  }>({
    systemRole: initialRole || undefined,
    isActive: initialActive === "true" ? true : initialActive === "false" ? false : undefined,
  });
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
    setFilters(newFilters);
    setPage(0); // Reset to first page when filters change
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
