"use client";

import { useState, useEffect } from "react";
import { SystemRole } from "@prisma/client";
import { Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface UserFiltersProps {
  filters: {
    systemRole?: SystemRole;
    isActive?: boolean;
    search?: string;
  };
  onFiltersChange: (filters: {
    systemRole?: SystemRole;
    isActive?: boolean;
    search?: string;
  }) => void;
}

export function UserFilters({ filters, onFiltersChange }: UserFiltersProps) {
  const [searchInput, setSearchInput] = useState(filters.search ?? "");

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchInput !== filters.search) {
        onFiltersChange({ ...filters, search: searchInput || undefined });
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput, filters, onFiltersChange]);

  function handleRoleChange(role: string) {
    const newRole = role === "ALL" ? undefined : (role as SystemRole);
    onFiltersChange({ ...filters, systemRole: newRole });
  }

  function handleStatusChange(status: string) {
    let isActive: boolean | undefined;
    if (status === "ACTIVE") isActive = true;
    else if (status === "INACTIVE") isActive = false;
    else isActive = undefined;
    onFiltersChange({ ...filters, isActive });
  }

  function clearFilters() {
    setSearchInput("");
    onFiltersChange({});
  }

  const hasFilters =
    filters.systemRole !== undefined ||
    filters.isActive !== undefined ||
    (filters.search && filters.search.length > 0);

  return (
    <div className="bg-white dark:bg-neutral-900 rounded-lg shadow p-4">
      <div className="flex flex-col md:flex-row gap-4">
        {/* Search */}
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
            <input
              type="text"
              placeholder="Search by name or email..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-neutral-300 dark:border-neutral-700 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-neutral-800 dark:text-white"
            />
          </div>
        </div>

        {/* Role Filter */}
        <div>
          <select
            value={filters.systemRole ?? "ALL"}
            onChange={(e) => handleRoleChange(e.target.value)}
            className="w-full md:w-40 px-3 py-2 border border-neutral-300 dark:border-neutral-700 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-neutral-800 dark:text-white"
          >
            <option value="ALL">All Roles</option>
            <option value="CUSTOMER">Customers</option>
            <option value="STAFF">Staff</option>
            <option value="SUPERADMIN">Superadmin</option>
          </select>
        </div>

        {/* Status Filter */}
        <div>
          <select
            value={
              filters.isActive === true
                ? "ACTIVE"
                : filters.isActive === false
                  ? "INACTIVE"
                  : "ALL"
            }
            onChange={(e) => handleStatusChange(e.target.value)}
            className="w-full md:w-40 px-3 py-2 border border-neutral-300 dark:border-neutral-700 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-neutral-800 dark:text-white"
          >
            <option value="ALL">All Status</option>
            <option value="ACTIVE">Active</option>
            <option value="INACTIVE">Inactive</option>
          </select>
        </div>

        {/* Clear Filters */}
        {hasFilters && (
          <Button variant="outline" size="sm" onClick={clearFilters}>
            <X className="h-4 w-4 mr-1" />
            Clear
          </Button>
        )}
      </div>
    </div>
  );
}
