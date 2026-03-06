"use client";

import { useEffect, useMemo, useState } from "react";
import type { SystemRole } from "@prisma/client";
import {
  countActiveFilters,
  toSummaryChips,
} from "@/lib/navigation/filter-state";
import {
  FilterSheetPanel,
  FilterSheetSection,
  FilterSheetToolbar,
  FilterSheetTriggerButton,
} from "@/components/ui/filter-sheet";
import { SelectNative } from "@/components/ui/select-native";
import { Sheet, SheetTrigger } from "@/components/ui/sheet";

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
  const [isOpen, setIsOpen] = useState(false);
  const [draftFilters, setDraftFilters] = useState(filters);

  useEffect(() => {
    setDraftFilters(filters);
  }, [filters]);

  function handleRoleChange(role: string) {
    const newRole = role === "ALL" ? undefined : (role as SystemRole);
    setDraftFilters((current) => ({ ...current, systemRole: newRole }));
  }

  function handleStatusChange(status: string) {
    let isActive: boolean | undefined;
    if (status === "ACTIVE") isActive = true;
    else if (status === "INACTIVE") isActive = false;
    else isActive = undefined;
    setDraftFilters((current) => ({ ...current, isActive }));
  }

  function applyFilters() {
    onFiltersChange({
      systemRole: draftFilters.systemRole,
      isActive: draftFilters.isActive,
      search: draftFilters.search?.trim() || undefined,
    });
    setIsOpen(false);
  }

  function clearFilters() {
    const clearedFilters = {
      systemRole: undefined,
      isActive: undefined,
      search: undefined,
    };
    setDraftFilters(clearedFilters);
    onFiltersChange(clearedFilters);
    setIsOpen(false);
  }

  const activeCount = countActiveFilters({
    systemRole: filters.systemRole,
    isActive:
      filters.isActive === undefined ? undefined : String(filters.isActive),
    search: filters.search,
  });

  const summaryChips = useMemo(
    () =>
      toSummaryChips(
        filters,
        [
          {
            key: "search",
            isActive: (state) => Boolean(state.search),
            getLabel: (state) => `Buscar: ${state.search}`,
          },
          {
            key: "systemRole",
            isActive: (state) => Boolean(state.systemRole),
            getLabel: (state) => `Rol: ${roleLabel(state.systemRole)}`,
          },
          {
            key: "isActive",
            isActive: (state) => state.isActive !== undefined,
            getLabel: (state) =>
              `Estado: ${state.isActive ? "Activo" : "Inactivo"}`,
          },
        ],
      ).map((chip) => ({
        ...chip,
        onRemove: () => {
          if (chip.key === "search") {
            onFiltersChange({ ...filters, search: undefined });
            return;
          }
          if (chip.key === "systemRole") {
            onFiltersChange({ ...filters, systemRole: undefined });
            return;
          }
          onFiltersChange({ ...filters, isActive: undefined });
        },
      })),
    [filters, onFiltersChange],
  );

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <FilterSheetToolbar
          summaryChips={summaryChips}
          onClearAll={activeCount > 0 ? clearFilters : undefined}
        >
          <SheetTrigger asChild>
            <FilterSheetTriggerButton activeCount={activeCount} />
          </SheetTrigger>
        </FilterSheetToolbar>

        <FilterSheetPanel
          title="Filtrar usuarios"
          description="Busca y segmenta por rol, estado y texto libre."
          onApply={applyFilters}
          onClear={clearFilters}
        >
          <FilterSheetSection title="Búsqueda" description="Nombre o email del usuario.">
            <input
              type="text"
              placeholder="Nombre o email"
              value={draftFilters.search ?? ""}
              onChange={(event) =>
                setDraftFilters((current) => ({
                  ...current,
                  search: event.target.value || undefined,
                }))
              }
              className="h-10 w-full rounded-md border border-neutral-200 px-3 text-sm outline-none transition focus:border-[#0359A8]"
            />
          </FilterSheetSection>

          <FilterSheetSection title="Rol">
            <SelectNative
              value={draftFilters.systemRole ?? "ALL"}
              onChange={(event) => handleRoleChange(event.target.value)}
            >
              <option value="ALL">Todos los roles</option>
              <option value="CUSTOMER">Cliente</option>
              <option value="STAFF">Staff</option>
              <option value="DESIGNER">Diseñador</option>
              <option value="SALES">Ventas</option>
              <option value="OPERATIONS_PRINT">Impresión</option>
              <option value="INSTALLER">Instalador</option>
              <option value="SUPERADMIN">Superadmin</option>
            </SelectNative>
          </FilterSheetSection>

          <FilterSheetSection title="Estado de cuenta">
            <SelectNative
              value={
                draftFilters.isActive === true
                  ? "ACTIVE"
                  : draftFilters.isActive === false
                    ? "INACTIVE"
                    : "ALL"
              }
              onChange={(event) => handleStatusChange(event.target.value)}
            >
              <option value="ALL">Todos los estados</option>
              <option value="ACTIVE">Activo</option>
              <option value="INACTIVE">Inactivo</option>
            </SelectNative>
          </FilterSheetSection>
        </FilterSheetPanel>
      </Sheet>

      {actions ? <div className="w-full sm:w-auto">{actions}</div> : null}
    </div>
  );
}

function roleLabel(role?: SystemRole) {
  if (role === "CUSTOMER") return "Cliente";
  if (role === "STAFF") return "Staff";
  if (role === "DESIGNER") return "Diseñador";
  if (role === "SALES") return "Ventas";
  if (role === "OPERATIONS_PRINT") return "Impresión";
  if (role === "INSTALLER") return "Instalador";
  if (role === "SUPERADMIN") return "Superadmin";
  return "";
}
