"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { trpc } from "@/lib/trpc/client";
import { UserListTable } from "./_components/user-list-table";
import { UserFilters } from "./_components/user-filters";
import { UserStats } from "./_components/user-stats";
import { SystemRole } from "@prisma/client";

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

  const { data: users, isLoading: usersLoading } = trpc.admin.listUsers.useQuery(
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

      <UserFilters filters={filters} onFiltersChange={handleFiltersChange} />

      <UserListTable
        users={users?.profiles ?? []}
        total={users?.total ?? 0}
        isLoading={usersLoading}
        page={page}
        pageSize={pageSize}
        onPageChange={setPage}
      />
    </div>
  );
}
