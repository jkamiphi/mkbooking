"use client";

import { useState, useEffect } from "react";
import type { SystemRole } from "@prisma/client";
import { Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  actions?: React.ReactNode;
}

export function UserFilters({ filters, onFiltersChange, actions }: UserFiltersProps) {
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
      <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <CardTitle>Filtros de usuarios</CardTitle>
          <CardDescription>
            Busca y segmenta por rol y estado de la cuenta.
          </CardDescription>
        </div>
        {actions ? <div className="w-full sm:w-auto">{actions}</div> : null}
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <div className="space-y-1.5 md:col-span-1">
            <Label htmlFor="users-search">Buscar</Label>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="users-search"
                type="text"
                placeholder="Nombre o email"
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="users-role">Rol</Label>
            <SelectNative
              id="users-role"
              value={filters.systemRole ?? "ALL"}
              onChange={(event) => handleRoleChange(event.target.value)}
            >
              <option value="ALL">Todos los roles</option>
              <option value="CUSTOMER">Cliente</option>
              <option value="STAFF">Staff</option>
              <option value="SALES">Ventas</option>
              <option value="SUPERADMIN">Superadmin</option>
            </SelectNative>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="users-status">Estado</Label>
            <SelectNative
              id="users-status"
              value={
                filters.isActive === true
                  ? "ACTIVE"
                  : filters.isActive === false
                    ? "INACTIVE"
                    : "ALL"
              }
              onChange={(event) => handleStatusChange(event.target.value)}
            >
              <option value="ALL">Todos los estados</option>
              <option value="ACTIVE">Activo</option>
              <option value="INACTIVE">Inactivo</option>
            </SelectNative>
          </div>
        </div>

        {hasFilters ? (
          <div className="flex justify-end border-t pt-4">
            <Button variant="outline" size="sm" onClick={clearFilters}>
              <X className="mr-2 h-4 w-4" />
              Limpiar filtros
            </Button>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
