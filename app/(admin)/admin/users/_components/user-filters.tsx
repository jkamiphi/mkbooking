"use client";

import { useState, useEffect } from "react";
import type { SystemRole } from "@prisma/client";
import { Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { SelectNative } from "@/components/ui/select-native";

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
    <Card>
      <CardContent className="pt-4">
      <div className="flex flex-col md:flex-row gap-4">
        {/* Search */}
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
            <Input
              type="text"
              placeholder="Search by name or email..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* Role Filter */}
        <div>
          <SelectNative
            value={filters.systemRole ?? "ALL"}
            onChange={(e) => handleRoleChange(e.target.value)}
            className="md:w-40"
          >
            <option value="ALL">All Roles</option>
            <option value="CUSTOMER">Customers</option>
            <option value="STAFF">Staff</option>
            <option value="SUPERADMIN">Superadmin</option>
          </SelectNative>
        </div>

        {/* Status Filter */}
        <div>
          <SelectNative
            value={
              filters.isActive === true
                ? "ACTIVE"
                : filters.isActive === false
                  ? "INACTIVE"
                  : "ALL"
            }
            onChange={(e) => handleStatusChange(e.target.value)}
            className="md:w-40"
          >
            <option value="ALL">All Status</option>
            <option value="ACTIVE">Active</option>
            <option value="INACTIVE">Inactive</option>
          </SelectNative>
        </div>

        {/* Clear Filters */}
        {hasFilters && (
          <Button variant="outline" size="sm" onClick={clearFilters}>
            <X className="h-4 w-4 mr-1" />
            Clear
          </Button>
        )}
      </div>
      </CardContent>
    </Card>
  );
}
